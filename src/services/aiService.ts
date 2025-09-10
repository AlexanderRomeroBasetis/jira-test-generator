import * as vscode from 'vscode';
import { spawn } from 'child_process';

export interface TestCase {
  title: string;
  type: 'Web' | 'Api' | 'Error';
  description: string;
  result: string;
}

export class AIService {

  /**
   * Genera test cases usando el proveedor de IA seleccionado
   */
  async generateTestCases(issue: any, testType?: string): Promise<TestCase[]> {
    const config = vscode.workspace.getConfiguration('jiraTestGenerator');
    const aiProvider = config.get<string>('aiProvider', 'Gemini');

    switch (aiProvider) {
      // case 'Copilot':
      //   return this.generateWithCopilot(issue);
      case 'Gemini':
        return this.generateWithGemini(issue, testType);
      default:
        throw new Error(`Proveedor de IA no soportado: ${aiProvider}`);
    }
  }

  /**
   * Genera test cases usando GitHub Copilot
   * COMENTADO: Funcionalidad deshabilitada, solo Gemini disponible
   * Mantener para futura integración
   */
  /*
  private async generateWithCopilot(issue: any): Promise<TestCase[]> {
    try {
      const models = await vscode.lm.selectChatModels({
        vendor: 'copilot',
        family: 'gpt-4o'
      });

      if (models.length === 0) {
        throw new Error('No hay modelos de Copilot disponibles. Asegúrate de tener GitHub Copilot activo.');
      }

      const model = models[0];
      const systemPrompt = this.getSystemPrompt();
      const userPrompt = this.buildIssuePrompt(issue);

      const messages = [
        vscode.LanguageModelChatMessage.User(systemPrompt + '\n\n' + userPrompt)
      ];

      const response = await model.sendRequest(messages, {
        justification: 'Generar casos de test para issue de Jira'
      });

      let fullResponse = '';
      for await (const fragment of response.text) {
        fullResponse += fragment;
      }

      return this.parseTestCasesFromResponse(fullResponse);

    } catch (error: any) {
      console.error('Error generando test cases con Copilot:', error);
      throw new Error(`Error al generar test cases con Copilot: ${error.message}`);
    }
  }
  */

  /**
   * Genera test cases usando Gemini CLI
   */
  private async generateWithGemini(issue: any, testType?: string): Promise<TestCase[]> {
    try {
      console.log('[DEBUG-FLOW] Iniciando generateWithGemini');
      vscode.window.showInformationMessage('Iniciando generación de test cases...');

      console.log('[DEBUG-FLOW] Verificando si Gemini CLI está listo');
      const isGeminiReady = await this.testGeminiCLI();
      if (!isGeminiReady) {
        console.log('[DEBUG-FLOW] Gemini CLI no está listo');
        vscode.window.showErrorMessage('Gemini CLI no está instalado o la API Key no está configurada.');
        throw new Error('Gemini CLI no está instalado o la API Key no está configurada.');
      }

      console.log('[DEBUG-FLOW] Construyendo prompt para tipo: ' + (testType || 'General'));
      const prompt = this.getSystemPrompt(testType) + '\n\n' + this.buildIssuePrompt(issue);
      console.log('[DEBUG-FLOW] Longitud del prompt: ' + prompt.length + ' caracteres');

      console.log('[DEBUG-FLOW] Llamando a Gemini CLI');
      const response = await this.callGeminiCLI(prompt);
      console.log('[DEBUG-FLOW] Respuesta recibida de Gemini, longitud: ' + response.length);

      console.log('[DEBUG-FLOW] Parseando respuesta para obtener test cases');
      const testCases = this.parseTestCasesFromResponse(response, testType);
      console.log('[DEBUG-FLOW] Proceso completado. Test cases generados: ' + testCases.length);

      if (testCases.length === 0) {
        vscode.window.showWarningMessage('No se pudieron generar casos de prueba a partir de la respuesta de Gemini.');
      } else {
        vscode.window.showInformationMessage(`Se generaron ${testCases.length} casos de prueba.`);
      }

      return testCases;

    } catch (error: any) {
      console.error('[DEBUG-FLOW] Error generando test cases con Gemini:', error);
      vscode.window.showErrorMessage(`Error en generación: ${error.message}`);
      throw new Error(`Error al generar test cases con Gemini: ${error.message}`);
    }
  }

  /**
   * Prueba si Gemini CLI está instalado y configurado
   */
  async testGeminiCLI(): Promise<boolean> {
    console.log('[DEBUG-CLI] Verificando configuración de Gemini CLI');
    const config = vscode.workspace.getConfiguration('jiraTestGenerator');
    const apiKey = config.get<string>('gemini.apiKey');

    if (!apiKey) {
      console.log('[DEBUG-CLI] Error: No se encontró API Key de Gemini');
      vscode.window.showErrorMessage('Error: La API Key de Gemini no está configurada en los ajustes de la extensión.');
      return false;
    }

    console.log('[DEBUG-CLI] API Key encontrada, verificando CLI');
    vscode.window.showInformationMessage('Verificando instalación de Gemini CLI...');

    return new Promise((resolve) => {
      console.log('[DEBUG-CLI] Ejecutando: gemini --version');
      const gemini = spawn('gemini', ['--version'], { shell: true });

      let stdout = '';
      let stderr = '';

      gemini.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      gemini.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      gemini.on('error', (err) => {
        console.error('[DEBUG-CLI] Error al ejecutar spawn("gemini"):', err);
        vscode.window.showErrorMessage('Error: No se pudo encontrar el comando "gemini". Asegúrate de que Gemini CLI esté instalado y de que la ruta esté en el PATH del sistema. Puede que necesites reiniciar VS Code o el PC.');
        resolve(false);
      });

      gemini.on('exit', (code) => {
        if (code !== 0) {
          console.log(`[DEBUG-CLI] El comando falló con código ${code}`);
          console.log(`[DEBUG-CLI] stderr: ${stderr}`);
          vscode.window.showErrorMessage(`Error: El comando 'gemini --version' falló con el código de salida ${code}.`);
          resolve(false);
        } else {
          console.log(`[DEBUG-CLI] Gemini CLI verificado correctamente: ${stdout.trim()}`);
          vscode.window.showInformationMessage(`Gemini CLI verificado: ${stdout.trim()}`);
          resolve(true);
        }
      });
    });
  }

  /**
   * Llama al CLI de Gemini
   */
  private async callGeminiCLI(prompt: string): Promise<string> {
    const config = vscode.workspace.getConfiguration('jiraTestGenerator');
    const apiKey = config.get<string>('gemini.apiKey');
    const model = config.get<string>('gemini.model', 'gemini-pro');

    // Log de inicio para diagnóstico
    console.log('[DEBUG-GEMINI] Iniciando llamada a Gemini CLI');
    vscode.window.showInformationMessage('Iniciando solicitud a Gemini...');

    if (!apiKey) {
      console.log('[DEBUG-GEMINI] Error: API Key no encontrada');
      vscode.window.showErrorMessage('Error: API Key de Gemini no encontrada.');
      throw new Error('API Key de Gemini no encontrada.');
    }

    console.log('[DEBUG-GEMINI] Configuración: modelo=' + model);

    return new Promise((resolve, reject) => {
      // Pasar la API key como una variable de entorno al proceso hijo
      const env = { ...process.env, GEMINI_API_KEY: apiKey };

      console.log('[DEBUG-GEMINI] Ejecutando comando con spawn: gemini -m ' + model);
      vscode.window.showInformationMessage('Ejecutando comando Gemini...');

      // Obtener el directorio del workspace actual para limitar el escaneo
      const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
      console.log('[DEBUG-GEMINI] Directorio de trabajo:', workspaceFolder || 'No disponible');

      // Crear proceso de Gemini CLI sin pasar el prompt como argumento
      const gemini = spawn('gemini', ['-m', model], { 
        env, 
        shell: true, 
        cwd: workspaceFolder // Limitar el escaneo al directorio del proyecto
      });

      // Escribir el prompt en stdin y cerrar
      console.log('[DEBUG-GEMINI] Enviando prompt a stdin');
      gemini.stdin.write(prompt);
      gemini.stdin.end();

      let stdout = '';
      let stderr = '';

      // Establecer un timeout de seguridad (5 minutos)
      const timeout = setTimeout(() => {
        console.log('[DEBUG-GEMINI] TIMEOUT: La operación excedió el tiempo límite de 5 minutos');
        vscode.window.showErrorMessage('Timeout: La solicitud a Gemini está tardando demasiado. Verificar instalación de Gemini CLI.');
        gemini.kill();
        reject(new Error('Timeout: La operación excedió el tiempo límite.'));
      }, 300000); // 5 minutos

      gemini.stdout.on('data', (data) => {
        const chunk = data.toString();
        stdout += chunk;
        console.log(`[DEBUG-GEMINI] Recibiendo datos (${chunk.length} bytes)`);
      });

      gemini.stderr.on('data', (data) => {
        const chunk = data.toString();
        stderr += chunk;
        console.log(`[DEBUG-GEMINI] ERROR: ${chunk}`);
      });

      gemini.on('close', (code) => {
        clearTimeout(timeout);
        console.log(`[DEBUG-GEMINI] Proceso terminado con código: ${code}`);
        vscode.window.showInformationMessage(`Proceso Gemini completado (código: ${code})`);
        
        const cleanedStdout = stdout.replace(/^Loaded cached credentials\.\s*$/gm, '').trim();
        const hasErrorInStderr = /error/i.test(stderr);

        // Condición para fallo:
        // 1. El código de salida no es 0.
        // 2. El código es 0, PERO la salida está vacía Y stderr contiene "error".
        //    Esto maneja el caso donde el CLI falla pero aun así retorna un código de éxito.
        if (code !== 0 || (cleanedStdout.length === 0 && hasErrorInStderr)) {
          console.error(`[DEBUG-GEMINI] Fallo de Gemini CLI. Código: ${code}, Stdout vacío: ${cleanedStdout.length === 0}, Stderr tiene error: ${hasErrorInStderr}`);
          console.error(`[DEBUG-GEMINI] Stderr completo: ${stderr}`);
          const errorMessage = `Error de Gemini CLI (código ${code}): ${stderr.substring(0, 200)}...`;
          vscode.window.showErrorMessage(errorMessage);
          reject(new Error(`Gemini CLI falló o no produjo ninguna salida. Revisa los logs para más detalles.`));
        } else {
          console.log(`[DEBUG-GEMINI] Respuesta recibida (${cleanedStdout.length} caracteres)`);
          
          if (stderr.trim().length > 0) {
            // Registrar mensajes no fatales de stderr como advertencias.
            console.log(`[DEBUG-GEMINI] Advertencias de stderr: ${stderr}`);
          }
          
          resolve(cleanedStdout);
        }
      });

      gemini.on('error', (err) => {
        clearTimeout(timeout);
        console.error('[DEBUG-GEMINI] Error al iniciar proceso Gemini CLI:', err);
        vscode.window.showErrorMessage(`Error al iniciar Gemini CLI: ${err.message}`);
        reject(new Error('No se pudo iniciar el proceso de Gemini CLI.'));
      });
    });
  }

  /**
   * Obtiene el prompt del sistema
   */
  private getSystemPrompt(testType?: string): string {
    const basePrompt = `
          ## Rol
          Actúa como un **experto en aseguramiento de calidad (QA)** con certificación ISTQB y experiencia en validaciones funcionales.

          ## Objetivo
          Sobretodo sé estricto con el formato.
          
          # Prompt para Análisis de Issues de Jira

          Tu misión es analizar la siguiente issue de Jira y generar un conjunto de **casos de prueba (test cases) atómicos y bien definidos**.
          La cantidad de casos de prueba debe ser proporcional a la complejidad de la issue:
          
          - **Issues sencillas:** Genera de 1 a 2 casos de prueba.
          - **Issues de complejidad media:** Genera de 3 a 4 casos de prueba.
          - **Issues complejas:** Genera de 5 a 6 casos de prueba.
          
          Cada caso de prueba debe enfocarse en un escenario único (camino feliz, caso borde, entrada inválida, etc.).
          
          Tienes acceso al código fuente del proyecto, así que úsalo para identificar puntos críticos que requieran validación.
          
          Es crucial que seas extremadamente estricto con el formato.`

    let contextSection = '';

    if (testType === 'Web') {
      contextSection = `
          ## Contexto de los Casos de Prueba
          La issue describe un cambio en una interfaz web. Por lo tanto, los casos de prueba deben enfocarse en la validación del frontend.
          Genera pruebas que cubran:
          - La UI y las interacciones del usuario.
          - Validaciones visuales y de estado en los componentes.
          - La navegación, los formularios y el responsive design.`;
    } else if (testType === 'Api') {
      contextSection = `
          ## Contexto de los Casos de Prueba
          La issue describe un cambio en una API. Por lo tanto, los casos de prueba deben enfocarse en la validación del backend.
          Genera pruebas que cubran:
          - El endpoint y los métodos HTTP correctos.
          - Códigos de respuesta esperados (200, 404, 500, etc.).
          - Validación de los datos de entrada y salida.
          - Escenarios de autenticación y autorización.
          - Manejo de errores.`;
    }

    const formatSection = `
          Formato requerido:
          TITULO: [breve y claro]
          TIPO: [Web, Api, o Error]
          DESCRIPCIÓN: [detallada, qué testear y por qué, mínimo 50 palabras]
          RESULTADO: [qué se espera que devuelva el test al ejecutarse]
          ---
          [repetir para cada test case]`;

    return basePrompt + contextSection + formatSection;
  }

  /**
   * Construye el prompt con la información de la issue
   */
  private buildIssuePrompt(issue: any): string {
    return `Issue de Jira:
            Key: ${issue.key}
            Título: ${issue.summary}
            Tipo: ${issue.issueType.name}
            Estado: ${issue.status.name}
            Prioridad: ${issue.priority.name}
            Proyecto: ${issue.project.name} (${issue.project.key})
            ${issue.description ? `Descripción: ${issue.description}` : ''}

            Genera de 1 a 6 test cases para esta issue siguiendo el formato especificado.`;
  }

  /**
   * Parsea la respuesta del AI y extrae los test cases
   */
  private parseTestCasesFromResponse(response: string, testType?: string): TestCase[] {
    const testCases: TestCase[] = [];

    console.log('[DEBUG] AI Response length:', response.length);
    console.log('[DEBUG] AI Response first 500 chars:', response.substring(0, 500));
    console.log('[DEBUG] testType parameter:', testType);

    // Dividir por el separador "---"
    const sections = response.split('---').map(section => section.trim());
    console.log('[DEBUG] Number of sections found:', sections.length);

    for (let i = 0; i < sections.length; i++) {
      const section = sections[i];
      if (!section) {
        console.log(`[DEBUG] Section ${i} is empty, skipping`);
        continue;
      }

      console.log(`[DEBUG] Processing section ${i}, length: ${section.length}`);
      const testCase = this.parseTestCaseSection(section, testType);
      if (testCase) {
        console.log(`[DEBUG] Section ${i} parsed successfully: ${testCase.title}`);
        testCases.push(testCase);
      } else {
        console.log(`[DEBUG] Section ${i} failed to parse`);
      }
    }

    // Si no pudimos parsear correctamente, intentar un método alternativo
    if (testCases.length === 0 && response.length > 0) {
      console.log('[DEBUG] Parsing failed completely, using alternative method');
      console.log('[DEBUG] Response that failed to parse:', response);
      return this.parseTestCasesAlternative(response);
    }

    console.log('[DEBUG] Successfully parsed test cases:', testCases.length);
    return testCases
  }

  /**
   * Parsea una sección individual de test case
   */
  private parseTestCaseSection(section: string, testType?: string): TestCase | null {
    console.log('[DEBUG] parseTestCaseSection - Input section length:', section.length);
    console.log('[DEBUG] parseTestCaseSection - Input section first 200 chars:', section.substring(0, 200));
    console.log('[DEBUG] parseTestCaseSection - testType:', testType);

    // Limpiar la sección de encabezados markdown y asteriscos alrededor de las etiquetas
    const cleanSection = section
      .replace(/###.*$/gm, '') // Eliminar encabezados ###
      .replace(/\*\*(TITULO:|DESCRIPCI[OÓ]N:|RESULTADO:|TIPO:)\*\*/gi, '$1') // Eliminar ** de las etiquetas
      .trim();

    console.log('[DEBUG] parseTestCaseSection - Clean section length:', cleanSection.length);

    const lines = cleanSection.split('\n');
    console.log('[DEBUG] parseTestCaseSection - Number of lines:', lines.length);

    let title = '';
    let type = '';
    let description = '';
    let result = '';

    let currentField: 'title' | 'type' | 'description' | 'result' | null = null;
    const content: { title: string[], type: string[], description: string[], result: string[] } = {
      title: [],
      type: [],
      description: [],
      result: []
    };

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmedLine = line.trim();
        if (trimmedLine.length === 0) continue;

        const upperLine = trimmedLine.toUpperCase();

        if (upperLine.startsWith('TITULO:')) {
            currentField = 'title';
            const titleValue = trimmedLine.substring('TITULO:'.length).trim();
            content.title.push(titleValue);
            console.log('[DEBUG] Found TITULO:', titleValue);
        } else if (upperLine.startsWith('DESCRIPCIÓN:') || upperLine.startsWith('DESCRIPCION:')) {
            currentField = 'description';
            const label = upperLine.startsWith('DESCRIPCIÓN:') ? 'DESCRIPCIÓN:' : 'DESCRIPCION:';
            const descValue = trimmedLine.substring(label.length).trim();
            content.description.push(descValue);
            console.log('[DEBUG] Found DESCRIPCIÓN:', descValue.substring(0, 50) + '...');
        } else if (upperLine.startsWith('RESULTADO:')) {
            currentField = 'result';
            const resultValue = trimmedLine.substring('RESULTADO:'.length).trim();
            content.result.push(resultValue);
            console.log('[DEBUG] Found RESULTADO:', resultValue.substring(0, 50) + '...');
        } else if (upperLine.startsWith('TIPO:')) {
          currentField = 'type';
          const typeValue = trimmedLine.substring('TIPO:'.length).trim();
          content.type.push(typeValue);
          console.log('[DEBUG] Found TIPO:', typeValue);
        } else if (currentField) {
          // Añadir a campo actual si es un valor multilínea
          content[currentField].push(trimmedLine);
          console.log(`[DEBUG] Adding to ${currentField}:`, trimmedLine.substring(0, 50) + '...');
        }
    }

    title = content.title.join('\n').trim();
    type = content.type.join('\n').trim();
    description = content.description.join('\n').trim();
    result = content.result.join('\n').trim();

    console.log('[DEBUG] Before fallback - Title length:', title.length, 'Type:', type, 'Description length:', description.length, 'Result length:', result.length);

    // Si el tipo no es válido, usar el testType como fallback
    if (!type || (type !== 'Web' && type !== 'Api' && type !== 'Error')) {
      console.log('[DEBUG] Type is invalid or empty, applying fallback. Original type:', type);
      if (testType === 'Web' || testType === 'Api') {
        type = testType;
        console.log('[DEBUG] Applied testType fallback:', type);
      } else {
        type = 'Error'; // Fallback por defecto
        console.log('[DEBUG] Applied default fallback: Error');
      }
    }

    console.log('[DEBUG] Final parsed values - Title:', !!title, 'Type:', type, 'Description:', !!description, 'Result:', !!result);

    if (title && description && result && (type === 'Web' || type === 'Api' || type === 'Error')) {
      console.log('[DEBUG] Section validation passed, returning test case');
      return { title, type: type as 'Web' | 'Api' | 'Error', description, result };
    }

    console.log('[DEBUG] Section validation failed');
    console.log('[DEBUG] Title present:', !!title, title ? `(${title.length} chars)` : '');
    console.log('[DEBUG] Description present:', !!description, description ? `(${description.length} chars)` : '');
    console.log('[DEBUG] Result present:', !!result, result ? `(${result.length} chars)` : '');
    console.log('[DEBUG] Type valid:', type === 'Web' || type === 'Api' || type === 'Error', `(${type})`);
    return null;
  }

  /**
   * Método alternativo de parseo si el principal falla
   */
  private parseTestCasesAlternative(response: string): TestCase[] {
    const testCases: TestCase[] = [];
    console.error("Respuesta de la IA que no se pudo parsear:", response);
    // Si el formato no es exacto, intentar generar test cases genéricos
    for (let i = 1; i <= 3; i++) {
      testCases.push({
        title: `Test Case ${i}`,
        type: 'Error',
        description: 'Test case generado automáticamente a partir de la respuesta de AI',
        result: 'Resultado esperado según el análisis de AI'
      });
    }

    return testCases;
  }
}