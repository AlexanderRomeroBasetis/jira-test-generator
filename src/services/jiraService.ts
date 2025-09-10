import axios from 'axios';
import * as vscode from 'vscode';

// Interfaz común para ambos tipos de instancias Jira
export interface JiraIssue {
  id: string;
  key: string;
  summary: string;
  status: {
    name: string;
    statusCategory: string;
  };
  priority: {
    name: string;
  };
  issueType: {
    name: string;
  };
  reporter: {
    displayName: string;
    emailAddress: string;
  };
  created: string;
  updated: string;
  project: {
    key: string;
    name: string;
  };
  description?: string;
  assignee?: {
    displayName: string;
    emailAddress: string;
  };
}

// Interfaz para respuesta de Jira Cloud
interface JiraCloudResponse {
  id: string;
  key: string;
  fields: {
    summary: string;
    status: {
      name: string;
      statusCategory: {
        name: string;
      };
    };
    priority?: {
      name: string;
    };
    issuetype: {
      name: string;
    };
    reporter?: {
      displayName: string;
      emailAddress: string;
    };
    created: string;
    updated: string;
    project: {
      key: string;
      name: string;
    };
    description?: {
      content?: Array<{
        content?: Array<{
          text?: string;
        }>;
      }>;
    };
    assignee?: {
      displayName: string;
      emailAddress: string;
    };
  };
  renderedFields?: {
    description?: string;
  };
}

// Interfaz para respuesta de Jira Server
interface JiraServerResponse {
  id: string;
  key: string;
  fields: {
    summary: string;
    status: {
      name: string;
      statusCategory: {
        name: string;
      };
    };
    priority?: {
      name: string;
    };
    issuetype: {
      name: string;
    };
    reporter?: {
      displayName: string;
      emailAddress: string;
      name?: string;
    };
    assignee?: {
      displayName: string;
      emailAddress: string;
      name?: string;
    };
    created: string;
    updated: string;
    project: {
      key: string;
      name: string;
    };
    description?: string; // En Jira Server, la descripción es directamente un string
  };
}

export class JiraService {
  private httpClient: any;
  private jiraUrl: string;

  constructor() {
    this.jiraUrl = this.getJiraUrl();
    const { email, apiToken, jiraServerType } = this.getCredentials();

    // Configurar API endpoint diferente según el tipo de servidor
    let apiEndpoint = '/rest/api/3'; // Por defecto usar API v3 (Cloud)

    if (jiraServerType === 'Jira Server') {
      apiEndpoint = '/rest/api/2'; // API v2 para Jira Server
    }

    this.httpClient = axios.create({
      baseURL: `${this.jiraUrl}${apiEndpoint}`,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      }
    });

    // Configurar autenticación según el tipo de servidor
    if (jiraServerType === 'Jira Server') {
      if (apiToken) {
        // Para Jira Server usamos Bearer Token
        this.httpClient.defaults.headers.common['Authorization'] = `Bearer ${apiToken}`;
      }
    } else {
      // Jira Cloud siempre usa Basic Auth con email/apiToken
      if (email && apiToken) {
        const cloudAuth = Buffer.from(`${email}:${apiToken}`).toString('base64');
        this.httpClient.defaults.headers.common['Authorization'] = `Basic ${cloudAuth}`;
      }
    }
  }

  private getJiraUrl(): string {
    const config = vscode.workspace.getConfiguration('jiraTestGenerator');
    return config.get<string>('jiraUrl') || '';
  }

  private getCredentials(): { email: string; apiToken: string; jiraServerType: string } {
    const config = vscode.workspace.getConfiguration('jiraTestGenerator');
    return {
      email: config.get<string>('email') || '',
      apiToken: config.get<string>('apiToken') || '',
      jiraServerType: config.get<string>('jiraServerType') || 'Jira Cloud'
    };
  }

  /**
   * Obtiene una issue específica de Jira directamente desde la API
   * @param issueKey La clave de la issue (ej: PROJ-123)
   * @returns Promise con los datos de la issue
   */
  async getIssue(issueKey: string): Promise<JiraIssue> {
    try {
      const { jiraServerType } = this.getCredentials();
      const response = await this.httpClient.get(`/issue/${issueKey}?expand=names,renderedFields`);
      const jiraData = response.data;

      // Usar el método de mapeo adecuado según el tipo de servidor
      if (jiraServerType === 'Jira Server') {
        return this.mapJiraServerIssue(jiraData as JiraServerResponse);
      } else {
        return this.mapJiraCloudIssue(jiraData as JiraCloudResponse);
      }
    } catch (error: any) {
      if (error.response) {
        // El servidor respondió con un código de error
        throw new Error(`Error de Jira API: ${error.response.status} - ${error.response.data?.errorMessages?.[0] || error.response.statusText}`);
      } else if (error.request) {
        // La petición fue hecha pero no se recibió respuesta
        throw new Error(`No se pudo conectar a Jira en ${this.jiraUrl}. Verifica la URL y tu conexión.`);
      } else {
        // Error en la configuración de la petición
        throw new Error(`Error en la petición: ${error.message}`);
      }
    }
  }

  /**
   * Mapea la respuesta de Jira Cloud al formato común de JiraIssue
   */
  private mapJiraCloudIssue(jiraData: JiraCloudResponse): JiraIssue {
    // Lógica mejorada para extraer la descripción
    let descriptionText = '';
    if (jiraData.renderedFields?.description) {
      // Opción 1: Usar la descripción renderizada (HTML) y limpiarla para obtener texto plano.
      descriptionText = jiraData.renderedFields.description
        .replace(/<br\s*\/?>/gi, '\n') // Reemplazar <br> con saltos de línea
        .replace(/<\/p>/gi, '\n')     // Reemplazar </p> con saltos de línea
        .replace(/<[^>]*>/g, '')      // Eliminar todas las demás etiquetas HTML
        .replace(/\n\s*\n/g, '\n')   // Reemplazar múltiples saltos de línea por uno solo
        .trim();
    } else if (jiraData.fields.description) {
      // Opción 2: Si no hay campos renderizados, procesar el Atlassian Document Format (ADF).
      descriptionText = this.extractTextFromADF(jiraData.fields.description).trim();
    }

    return {
      id: jiraData.id,
      key: jiraData.key,
      summary: jiraData.fields.summary,
      status: {
        name: jiraData.fields.status.name,
        statusCategory: jiraData.fields.status.statusCategory.name
      },
      priority: {
        name: jiraData.fields.priority?.name || 'No Priority'
      },
      issueType: {
        name: jiraData.fields.issuetype.name
      },
      reporter: {
        displayName: jiraData.fields.reporter?.displayName || 'Unknown',
        emailAddress: jiraData.fields.reporter?.emailAddress || ''
      },
      created: jiraData.fields.created,
      updated: jiraData.fields.updated,
      project: {
        key: jiraData.fields.project.key,
        name: jiraData.fields.project.name
      },
      description: descriptionText,
      assignee: jiraData.fields.assignee ? {
        displayName: jiraData.fields.assignee.displayName,
        emailAddress: jiraData.fields.assignee.emailAddress || ''
      } : undefined
    };
  }

  /**
   * Mapea la respuesta de Jira Server al formato común de JiraIssue
   */
  private mapJiraServerIssue(jiraData: JiraServerResponse): JiraIssue {
    return {
      id: jiraData.id,
      key: jiraData.key,
      summary: jiraData.fields.summary,
      status: {
        name: jiraData.fields.status.name,
        statusCategory: jiraData.fields.status.statusCategory.name
      },
      priority: {
        name: jiraData.fields.priority?.name || 'No Priority'
      },
      issueType: {
        name: jiraData.fields.issuetype.name
      },
      reporter: {
        displayName: jiraData.fields.reporter?.displayName || 'Unknown',
        emailAddress: jiraData.fields.reporter?.emailAddress || ''
      },
      created: jiraData.fields.created,
      updated: jiraData.fields.updated,
      project: {
        key: jiraData.fields.project.key,
        name: jiraData.fields.project.name
      },
      // En Jira Server, la descripción es directamente un string
      description: jiraData.fields.description || '',
      assignee: jiraData.fields.assignee ? {
        displayName: jiraData.fields.assignee.displayName,
        emailAddress: jiraData.fields.assignee.emailAddress || ''
      } : undefined
    };
  }

  /**
   * Extrae de forma recursiva todo el texto de un nodo de Atlassian Document Format (ADF).
   * @param node El nodo ADF a procesar.
   * @returns El texto plano extraído.
   */
  private extractTextFromADF(node: any): string {
    if (node && node.type === 'text' && typeof node.text === 'string') {
      return node.text + ' '; // Añadir espacio para separar textos
    }

    if (node && Array.isArray(node.content)) {
      return node.content.map((childNode: any) => this.extractTextFromADF(childNode)).join('');
    }

    return '';
  }

  async addComment(issueKey: string, comment: string): Promise<void> {
    try {
      const { jiraServerType } = this.getCredentials();

      if (jiraServerType === 'Jira Server') {
        // Formato para Jira Server (API v2)
        await this.httpClient.post(`/issue/${issueKey}/comment`, {
          body: comment // Jira Server acepta texto plano
        });
      } else {
        // Formato para Jira Cloud (API v3 con Atlassian Document Format)
        await this.httpClient.post(`/issue/${issueKey}/comment`, {
          body: {
            type: "doc",
            version: 1,
            content: [
              {
                type: "paragraph",
                content: [
                  {
                    type: "text",
                    text: comment
                  }
                ]
              }
            ]
          }
        });
      }
    } catch (error: any) {
        throw new Error(`Error al agregar comentario: ${error.message}`);
    }
  }

  /**
   * Busca issues por proyecto usando Jira Search API
   * @param projectKey La clave del proyecto
   * @returns Promise con lista de issues
   */
  async getIssuesByProject(projectKey: string): Promise<JiraIssue[]> {
    try {
      const { jiraServerType } = this.getCredentials();
      const jql = `project = "${projectKey}" ORDER BY created DESC`;
      const response = await this.httpClient.get(`/search?jql=${encodeURIComponent(jql)}&expand=names,renderedFields&maxResults=50`);

      // Transformar la respuesta de Jira al formato esperado
      if (jiraServerType === 'Jira Server') {
        // Mapeo para Jira Server
        return response.data.issues.map((jiraData: JiraServerResponse) => 
          this.mapJiraServerIssue(jiraData)
        );
      } else {
        // Mapeo para Jira Cloud
        return response.data.issues.map((jiraData: JiraCloudResponse) => 
          this.mapJiraCloudIssue(jiraData)
        );
      }
    } catch (error: any) {
      if (error.response) {
        throw new Error(`Error de Jira API: ${error.response.status} - ${error.response.data?.errorMessages?.[0] || error.response.statusText}`);
      } else if (error.request) {
        throw new Error(`No se pudo conectar a Jira en ${this.jiraUrl}. Verifica la URL y tu conexión.`);
      } else {
        throw new Error(`Error en la petición: ${error.message}`);
      }
    }
  }

  /**
   * Actualiza la configuración del servicio (útil cuando el usuario cambia la configuración)
   */
  updateConfiguration(): void {
    this.jiraUrl = this.getJiraUrl();
    const { email, apiToken, jiraServerType } = this.getCredentials();

    // Actualizar URL base según el tipo de servidor
    let apiEndpoint = '/rest/api/3'; // Por defecto API v3 (Cloud)

    if (jiraServerType === 'Jira Server') {
      apiEndpoint = '/rest/api/2'; // API v2 para Jira Server
    }

    this.httpClient.defaults.baseURL = `${this.jiraUrl}${apiEndpoint}`;

    // Eliminar autorización anterior
    delete this.httpClient.defaults.headers.common['Authorization'];

    // Configurar autenticación según el tipo de servidor
    if (jiraServerType === 'Jira Server') {
      if (apiToken) {
        // Usar Bearer token para Jira Server
        this.httpClient.defaults.headers.common['Authorization'] = `Bearer ${apiToken}`;
      }
    } else {
      // Jira Cloud siempre usa Basic Auth con email/apiToken
      if (email && apiToken) {
        const cloudAuth = Buffer.from(`${email}:${apiToken}`).toString('base64');
        this.httpClient.defaults.headers.common['Authorization'] = `Basic ${cloudAuth}`;
      }
    }
  }
}
