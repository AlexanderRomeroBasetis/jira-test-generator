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
  async generateTestCases(issue: any): Promise<TestCase[]> {
    const config = vscode.workspace.getConfiguration('jiraTestGenerator');
    const aiProvider = config.get<string>('aiProvider', 'Gemini');

    switch (aiProvider) {
      // case 'Copilot':
      //   return this.generateWithCopilot(issue);
      case 'Gemini':
        return this.generateWithGemini(issue);
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
  private async generateWithGemini(issue: any): Promise<TestCase[]> {
    try {
      const isGeminiReady = await this.testGeminiCLI();
      if (!isGeminiReady) {
        throw new Error('Gemini CLI no está instalado o la API Key no está configurada.');
      }

      const prompt = this.getSystemPrompt() + '\n\n' + this.buildIssuePrompt(issue);
      const response = await this.callGeminiCLI(prompt);
      return this.parseTestCasesFromResponse(response);

    } catch (error: any) {
      console.error('Error generando test cases con Gemini:', error);
      throw new Error(`Error al generar test cases con Gemini: ${error.message}`);
    }
  }

  /**
   * Prueba si Gemini CLI está instalado y configurado
   */
  async testGeminiCLI(): Promise<boolean> {
    const config = vscode.workspace.getConfiguration('jiraTestGenerator');
    const apiKey = config.get<string>('gemini.apiKey');

    if (!apiKey) {
      vscode.window.showErrorMessage('La API Key de Gemini no está configurada. Por favor, configúrala en los ajustes de la extensión.');
      return false;
    }

    return new Promise((resolve) => {
      const gemini = spawn('gemini', ['--version']);
      gemini.on('error', () => {
        vscode.window.showErrorMessage('El CLI de Gemini no está instalado. Por favor, sigue las instrucciones de instalación.');
        resolve(false);
      });
      gemini.on('exit', (code) => {
        if (code !== 0) {
          vscode.window.showErrorMessage('El CLI de Gemini no funciona correctamente.');
        }
        resolve(code === 0);
      });
    });
  }

  /**
   * Llama al CLI de Gemini
   */
  private async callGeminiCLI(prompt: string): Promise<string> {
    const config = vscode.workspace.getConfiguration('jiraTestGenerator');
    const apiKey = config.get<string>('gemini.apiKey');

    if (!apiKey) {
      throw new Error('API Key de Gemini no encontrada.');
    }

    return new Promise((resolve, reject) => {
      // Pasar la API key como una variable de entorno al proceso hijo
      const env = { ...process.env, GOOGLE_API_KEY: apiKey };
      const gemini = spawn('gemini', ['-p', prompt], { env });

      let stdout = '';
      let stderr = '';

      gemini.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      gemini.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      gemini.on('close', (code) => {
        if (code !== 0) {
          console.error(`Gemini CLI exited with code ${code}`);
          console.error(stderr);
          reject(new Error(`Gemini CLI falló con código ${code}.`));
        } else {
          resolve(stdout);
        }
      });

      gemini.on('error', (err) => {
        console.error('Failed to start Gemini CLI process.', err);
        reject(new Error('No se pudo iniciar el proceso de Gemini CLI.'));
      });
    });
  }

  /**
   * Obtiene el prompt del sistema
   */
  private getSystemPrompt(): string {
    return `
          ## Rol
          Actúa como un **experto en aseguramiento de calidad (QA)** con certificación ISTQB y experiencia en validaciones funcionales de interfaz de usuario en entornos web.

          ## Objetivo
          Analiza esta issue de Jira y genera de 1 a 6 test cases a partir de ella.
          Considera analizar el código del proyecto ya que tienes acceso a él. Sobretodo sé estricto con el formato.

          ## Contexto
          - **Categoría:** Web
          - **Tipo de validación:** Funcional (Frontend)
          - **Foco:** UI, interacciones del usuario, validaciones visuales, estados de componentes

          Formato requerido:
          TITULO: [breve y claro]
          DESCRIPCIÓN: [detallada, qué testear y por qué, mínimo 50 palabras]
          RESULTADO: [qué se espera que devuelva el test al ejecutarse]
          ---
          [repetir para cada test case]`;
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

            Genera de 3 a 6 test cases para esta issue siguiendo el formato especificado.`;
  }

  /**
   * Parsea la respuesta del AI y extrae los test cases
   */
  private parseTestCasesFromResponse(response: string): TestCase[] {
    const testCases: TestCase[] = [];

    // Dividir por el separador "---"
    const sections = response.split('---').map(section => section.trim());

    for (const section of sections) {
      if (!section) continue;

      const testCase = this.parseTestCaseSection(section);
      if (testCase) {
        testCases.push(testCase);
      }
    }

    // Si no pudimos parsear correctamente, intentar un método alternativo
    if (testCases.length === 0 && response.length > 0) {
      return this.parseTestCasesAlternative(response);
    }

    return testCases
  }

  /**
   * Parsea una sección individual de test case
   */
  private parseTestCaseSection(section: string): TestCase | null {
    // Limpiar la sección de encabezados markdown y asteriscos alrededor de las etiquetas
    const cleanSection = section
      .replace(/###.*$/gm, '') // Eliminar encabezados ###
      .replace(/\*\*(TITULO:|DESCRIPCI[OÓ]N:|RESULTADO:|TIPO:)\*\*/gi, '$1') // Eliminar ** de las etiquetas
      .trim();

    const lines = cleanSection.split('\n');

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

    for (const line of lines) {
        const trimmedLine = line.trim();
        if (trimmedLine.length === 0) continue;

        const upperLine = trimmedLine.toUpperCase();

        if (upperLine.startsWith('TITULO:')) {
            currentField = 'title';
            content.title.push(trimmedLine.substring('TITULO:'.length).trim());
        } else if (upperLine.startsWith('DESCRIPCIÓN:') || upperLine.startsWith('DESCRIPCION:')) {
            currentField = 'description';
            const label = upperLine.startsWith('DESCRIPCIÓN:') ? 'DESCRIPCIÓN:' : 'DESCRIPCION:';
            content.description.push(trimmedLine.substring(label.length).trim());
        } else if (upperLine.startsWith('RESULTADO:')) {
            currentField = 'result';
            content.result.push(trimmedLine.substring('RESULTADO:'.length).trim());
        } else if (upperLine.startsWith('TIPO:')) {
          currentField = 'type';
          content.type.push(trimmedLine.substring('TIPO:'.length).trim());
        } else if (currentField) {
          // Añadir a campo actual si es un valor multilínea
          content[currentField].push(trimmedLine);
        }
    }

    title = content.title.join('\n').trim();
    type = content.type.join('\n').trim();
    description = content.description.join('\n').trim();
    result = content.result.join('\n').trim();

    if (
        title &&
        (type === 'Web' || type === 'Api' || type === 'Error') &&
        description &&
        result
    ) {
      return { title, type, description, result };
    }

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
