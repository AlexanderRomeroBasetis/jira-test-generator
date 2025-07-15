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
  private backendUrl: string;

  constructor() {
    this.backendUrl = this.getBackendUrl();
    this.httpClient = axios.create({
      baseURL: this.backendUrl,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      }
    });

    const apiKey = this.getApiKey();
    if (apiKey) {
      this.httpClient.defaults.headers.common['Authorization'] = `Bearer ${apiKey}`;
    }
  }

  private getBackendUrl(): string {
    const config = vscode.workspace.getConfiguration('jiraTestGenerator');
    return config.get<string>('backendUrl') || 'http://localhost:3000';
  }

  private getApiKey(): string | undefined {
    const config = vscode.workspace.getConfiguration('jiraTestGenerator');
    return config.get<string>('apiKey');
  }

  /**
   * Obtiene una issue específica de Jira a través del backend
   * @param issueKey La clave de la issue (ej: PROJ-123)
   * @returns Promise con los datos de la issue
   */
  async getIssue(issueKey: string): Promise<JiraIssue> {
    try {
      const response = await this.httpClient.get(`/api/v1/jira/issues/${issueKey}`);
      return response.data;
    } catch (error: any) {
      if (error.response) {
        // El servidor respondió con un código de error
        throw new Error(`Error del backend: ${error.response.status} - ${error.response.data.message || error.response.statusText}`);
      } else if (error.request) {
        // La petición fue hecha pero no se recibió respuesta
        throw new Error(`No se pudo conectar al backend en ${this.backendUrl}. Verifica que esté ejecutándose.`);
      } else {
        // Error en la configuración de la petición
        throw new Error(`Error en la petición: ${error.message}`);
      }
    }
  }

  /**
   * Busca issues por proyecto
   * @param projectKey La clave del proyecto
   * @returns Promise con lista de issues
   */
  async getIssuesByProject(projectKey: string): Promise<JiraIssue[]> {
    try {
      const response = await this.httpClient.get(`/api/v1/jira/project/${projectKey}/issues`);
      return response.data;
    } catch (error: any) {
      if (error.response) {
        throw new Error(`Error del backend: ${error.response.status} - ${error.response.data.message || error.response.statusText}`);
      } else if (error.request) {
        throw new Error(`No se pudo conectar al backend en ${this.backendUrl}. Verifica que esté ejecutándose.`);
      } else {
        throw new Error(`Error en la petición: ${error.message}`);
      }
    }
  }

  /**
   * Actualiza la configuración del servicio (útil cuando el usuario cambia la configuración)
   */
  updateConfiguration(): void {
    this.backendUrl = this.getBackendUrl();
    this.httpClient.defaults.baseURL = this.backendUrl;
    
    const apiKey = this.getApiKey();
    if (apiKey) {
      this.httpClient.defaults.headers.common['Authorization'] = `Bearer ${apiKey}`;
    } else {
      delete this.httpClient.defaults.headers.common['Authorization'];
    }
  }
}
