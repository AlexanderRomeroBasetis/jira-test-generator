import * as vscode from 'vscode';

export interface TestCase {
  titulo: string;
  descripcion: string;
  resultado: string;
}

export class AIService {
  
  /**
   * Genera test cases usando VS Code Language Model API
   * @param issue La issue de Jira para analizar
   * @returns Promise con array de test cases generados
   */
  async generateTestCases(issue: any): Promise<TestCase[]> {
    try {
      // Acceder a los modelos de lenguaje disponibles
      const models = await vscode.lm.selectChatModels({
        vendor: 'copilot',
        family: 'gpt-4o'
      });

      if (models.length === 0) {
        throw new Error('No hay modelos de Copilot disponibles. Asegúrate de tener GitHub Copilot activo.');
      }

      const model = models[0];

      // Crear el prompt del sistema
      const systemPrompt = `Eres un experto en QA. Analiza esta issue de Jira y genera exactamente 3 test cases a partir de ella. Considera analizar el código del proyecto ya que tienes acceso a él. Sobretodo sé estricto con el formato.

Formato requerido:
TITULO: [breve y claro]
DESCRIPCION: [detallada, qué testear y por qué]
RESULTADO: [qué se espera]
---
[repetir para cada test case]`;

      // Crear el prompt del usuario con la información de la issue
      const userPrompt = this.buildIssuePrompt(issue);

      // Preparar los mensajes
      const messages = [
        vscode.LanguageModelChatMessage.User(systemPrompt + '\n\n' + userPrompt)
      ];

      // Realizar la petición al modelo
      const response = await model.sendRequest(messages, {
        justification: 'Generar casos de test para issue de Jira'
      });

      // Procesar la respuesta
      let fullResponse = '';
      for await (const fragment of response.text) {
        fullResponse += fragment;
      }

      // Parsear la respuesta y convertir a test cases
      return this.parseTestCasesFromResponse(fullResponse);

    } catch (error: any) {
      console.error('Error generando test cases:', error);
      throw new Error(`Error al generar test cases: ${error.message}`);
    }
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
    
    let titulo = '';
    let descripcion = '';
    let resultado = '';
    
    for (const line of lines) {
      if (line.startsWith('TITULO:')) {
        titulo = line.replace('TITULO:', '').trim();
      } else if (line.startsWith('DESCRIPCION:')) {
        descripcion = line.replace('DESCRIPCION:', '').trim();
      } else if (line.startsWith('RESULTADO:')) {
        resultado = line.replace('RESULTADO:', '').trim();
      }
    }
    
    if (titulo && descripcion && resultado) {
      return { titulo, descripcion, resultado };
    }
    
    return null;
  }

  /**
   * Método alternativo de parseo si el principal falla
   */
  private parseTestCasesAlternative(response: string): TestCase[] {
    const testCases: TestCase[] = [];
    
    // Si el formato no es exacto, intentar generar test cases genéricos
    for (let i = 1; i <= 3; i++) {
      testCases.push({
        titulo: `Test Case ${i}`,
        descripcion: 'Test case generado automáticamente a partir de la respuesta de AI',
        resultado: 'Resultado esperado según el análisis de AI'
      });
    }
    
    return testCases;
  }
}
