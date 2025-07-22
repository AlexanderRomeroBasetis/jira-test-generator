import axios from 'axios';
import * as vscode from 'vscode';

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

export class JiraService {
  private httpClient: any;
  private jiraUrl: string;

  constructor() {
    this.jiraUrl = this.getJiraUrl();
    this.httpClient = axios.create({
      baseURL: `${this.jiraUrl}/rest/api/3`,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      }
    });

    const { email, apiToken } = this.getCredentials();
    if (email && apiToken) {
      const auth = Buffer.from(`${email}:${apiToken}`).toString('base64');
      this.httpClient.defaults.headers.common['Authorization'] = `Basic ${auth}`;
    }
  }

  private getJiraUrl(): string {
    const config = vscode.workspace.getConfiguration('jiraTestGenerator');
    return config.get<string>('jiraUrl') || '';
  }

  private getCredentials(): { email: string; apiToken: string } {
    const config = vscode.workspace.getConfiguration('jiraTestGenerator');
    return {
      email: config.get<string>('email') || '',
      apiToken: config.get<string>('apiToken') || ''
    };
  }

  /**
   * Obtiene una issue específica de Jira directamente desde la API
   * @param issueKey La clave de la issue (ej: PROJ-123)
   * @returns Promise con los datos de la issue
   */
  async getIssue(issueKey: string): Promise<JiraIssue> {
    try {
      const response = await this.httpClient.get(`/issue/${issueKey}?expand=names`);

      // Transformar la respuesta de Jira al formato esperado
      const jiraData = response.data;
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
        description: jiraData.fields.description?.content?.[0]?.content?.[0]?.text || jiraData.renderedFields?.description || '',
        assignee: jiraData.fields.assignee ? {
          displayName: jiraData.fields.assignee.displayName,
          emailAddress: jiraData.fields.assignee.emailAddress || ''
        } : undefined
      };
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

  async addComment(issueKey: string, comment: string): Promise<void> {
    try {
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
      const jql = `project = "${projectKey}" ORDER BY created DESC`;
      const response = await this.httpClient.get(`/search?jql=${encodeURIComponent(jql)}&expand=names&maxResults=50`);

      // Transformar la respuesta de Jira al formato esperado
      const issues: JiraIssue[] = response.data.issues.map((jiraData: any) => ({
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
        description: jiraData.fields.description?.content?.[0]?.content?.[0]?.text || jiraData.renderedFields?.description || '',
        assignee: jiraData.fields.assignee ? {
          displayName: jiraData.fields.assignee.displayName,
          emailAddress: jiraData.fields.assignee.emailAddress || ''
        } : undefined
      }));

      return issues;
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
    this.httpClient.defaults.baseURL = `${this.jiraUrl}/rest/api/3`;

    const { email, apiToken } = this.getCredentials();
    if (email && apiToken) {
      const auth = Buffer.from(`${email}:${apiToken}`).toString('base64');
      this.httpClient.defaults.headers.common['Authorization'] = `Basic ${auth}`;
    } else {
      delete this.httpClient.defaults.headers.common['Authorization'];
    }
  }
}
