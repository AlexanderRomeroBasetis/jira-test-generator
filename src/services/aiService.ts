import * as vscode from 'vscode';
import { spawn } from 'child_process';

export interface TestCase {
  title: string;
  description: string;
  result: string;
}

export class AIService {

  /**
   * Genera test cases usando el proveedor de IA seleccionado
   */
  async generateTestCases(issue: any): Promise<TestCase[]> {
    const config = vscode.workspace.getConfiguration('jiraTestGenerator');
    const aiProvider = config.get<string>('aiProvider', 'copilot');

    switch (aiProvider) {
      case 'Copilot':
        return this.generateWithCopilot(issue);
      case 'Gemini':
        return this.generateWithGemini(issue);
      default:
        throw new Error(`Proveedor de IA no soportado: ${aiProvider}`);
    }
  }

  /**
   * Genera test cases usando GitHub Copilot
   */
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

  /**
   * Genera test cases usando Gemini CLI
   */
  private async generateWithGemini(issue: any): Promise<TestCase[]> {
    try {
      // Primero verificar si Gemini CLI está disponible
      const isGeminiAvailable = await this.testGeminiCLI();
      if (!isGeminiAvailable) {
        throw new Error('Gemini CLI no está instalado o configurado. Por favor instala Gemini CLI y configúralo correctamente.');
      }

      const systemPrompt = this.getSystemPrompt();
      const userPrompt = this.buildIssuePrompt(issue);
      const fullPrompt = `${systemPrompt}\n\n${userPrompt}`;

      const response = await this.callGeminiCLI(fullPrompt);
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
    return new Promise((resolve) => {
      try {
        console.log('[DEBUG] Testing Gemini CLI availability...');

        const geminiProcess = spawn('gemini', ['--version'], {
          stdio: ['pipe', 'pipe', 'pipe'],
          env: { ...process.env } // Ensure environment variables are passed
        });

        let hasOutput = false;
        let stdoutData = '';
        let stderrData = '';

        geminiProcess.stdout.on('data', (data) => {
          hasOutput = true;
          stdoutData += data.toString();
          console.log('[DEBUG] Gemini CLI stdout:', data.toString().trim());
        });

        geminiProcess.stderr.on('data', (data) => {
          hasOutput = true;
          stderrData += data.toString();
          console.log('[DEBUG] Gemini CLI stderr:', data.toString().trim());
        });

        geminiProcess.on('close', (code) => {
          console.log('[DEBUG] Gemini CLI exit code:', code);
          console.log('[DEBUG] Has output:', hasOutput);

          // CLI is available if it exits with code 0 OR produces any output (even error messages)
          const isAvailable = code === 0 || hasOutput;
          console.log('[DEBUG] Gemini CLI available:', isAvailable);
          resolve(isAvailable);
        });

        geminiProcess.on('error', (error) => {
          console.log('[DEBUG] Gemini CLI process error:', error.message);
          resolve(false);
        });

        // Timeout de 10 segundos para la prueba (aumentado)
        setTimeout(() => {
          console.log('[DEBUG] Gemini CLI test timeout reached');
          geminiProcess.kill();
          resolve(false);
        }, 10000);

      } catch (error: any) {
        console.log('[DEBUG] Gemini CLI test catch error:', error.message);
        resolve(false);
      }
    });
  }

  /**
   * Llama al CLI de Gemini usando child_process (sin API Key)
   */
  private async callGeminiCLI(prompt: string): Promise<string> {
    return new Promise((resolve, reject) => {
      // Usar el CLI de Gemini con el flag --prompt
      const geminiProcess = spawn('gemini', ['--prompt', prompt], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let output = '';
      let errorOutput = '';

      geminiProcess.stdout.on('data', (data) => {
        output += data.toString();
      });

      geminiProcess.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      geminiProcess.on('close', (code) => {
        if (code === 0 && output.trim()) {
          resolve(output.trim());
        } else {
          reject(new Error(`Gemini CLI falló con código ${code}: ${errorOutput || 'Sin salida'}`));
        }
      });

      geminiProcess.on('error', (error) => {
        reject(new Error(`Error ejecutando Gemini CLI: ${error.message}`));
      });

      // Timeout de 30 segundos
      setTimeout(() => {
        geminiProcess.kill();
        reject(new Error('Timeout: Gemini CLI tardó demasiado en responder'));
      }, 30000);
    });
  }

  /**
   * Obtiene el prompt del sistema
   */
  private getSystemPrompt(): string {
    return `Eres un experto en QA. Analiza esta issue de Jira y genera exactamente 3 test cases a partir de ella. Considera analizar el código del proyecto ya que tienes acceso a él. Sobretodo sé estricto con el formato.

Formato requerido:
TITULO: [breve y claro]
DESCRIPCION: [detallada, qué testear y por qué]
RESULTADO: [qué se espera]
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

Genera exactamente 3 test cases para esta issue siguiendo el formato especificado.`;
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
    if (testCases.length === 0) {
      return this.parseTestCasesAlternative(response);
    }

    // Limitar a exactamente 3 test cases
    return testCases.slice(0, 3);
  }

  /**
   * Parsea una sección individual de test case
   */
  private parseTestCaseSection(section: string): TestCase | null {
    const lines = section.split('\n').map(line => line.trim());

    let title = '';
    let description = '';
    let result = '';

    for (const line of lines) {
      if (line.startsWith('TITULO:')) {
        title = line.replace('TITULO:', '').trim();
      } else if (line.startsWith('DESCRIPCION:')) {
        description = line.replace('DESCRIPCION:', '').trim();
      } else if (line.startsWith('RESULTADO:')) {
        result = line.replace('RESULTADO:', '').trim();
      }
    }

    if (title && description && result) {
      return { title, description, result };
    }

    return null;
  }

  /**
   * Método alternativo de parseo si el principal falla
   */
  private parseTestCasesAlternative(response: string): TestCase[] {
    const testCases: TestCase[] = [];
    console.log(response);
    // Si el formato no es exacto, intentar generar test cases genéricos
    for (let i = 1; i <= 3; i++) {
      testCases.push({
        title: `Test Case ${i}`,
        description: 'Test case generado automáticamente a partir de la respuesta de AI',
        result: 'Resultado esperado según el análisis de AI'
      });
    }

    return testCases;
  }
}
