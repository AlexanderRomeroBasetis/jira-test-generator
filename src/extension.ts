import * as vscode from 'vscode';
import { JiraService, JiraIssue } from './services/jiraService';
import { AIService, TestCase } from './services/aiService';

let jiraService: JiraService;
let aiService: AIService;

export function activate(context: vscode.ExtensionContext) {

	console.log('Congratulations, your extension "jira-test-generator" is now active!');

	// Inicializar servicios
	jiraService = new JiraService();
	aiService = new AIService();

	const disposableHelloWorld = vscode.commands.registerCommand('jira-test-generator.helloWorld', () => {
		vscode.window.showInformationMessage('Hello World from jira-test-generator!');
	});

	const disposableGetJiraIssue = vscode.commands.registerCommand('jira-test-generator.getJiraIssue', async () => {
		try {
			const issueKey = await vscode.window.showInputBox({
				prompt: 'Ingresa la clave de la issue de Jira (ej: PROJ-123)',
				placeHolder: 'PROJ-123'
			});

			if (!issueKey) {
				vscode.window.showWarningMessage('No se ingresó ninguna clave de issue');
				return;
			}

			vscode.window.withProgress({
				location: vscode.ProgressLocation.Notification,
				title: "Obteniendo issue de Jira...",
				cancellable: false
			}, async (progress) => {
				try {
					progress.report({ increment: 0, message: `Buscando ${issueKey}...` });
					
					const issue = await jiraService.getIssue(issueKey);
					
					progress.report({ increment: 100, message: "¡Issue encontrada!" });

					await showIssueDetails(issue);

				} catch (error: any) {
					vscode.window.showErrorMessage(`Error al obtener la issue: ${error.message}`);
				}
			});

		} catch (error: any) {
			vscode.window.showErrorMessage(`Error: ${error.message}`);
		}
	});

	const disposableConfigChange = vscode.workspace.onDidChangeConfiguration(event => {
		if (event.affectsConfiguration('jiraTestGenerator')) {
			jiraService.updateConfiguration();
			vscode.window.showInformationMessage('Configuración de Jira Test Generator actualizada');
		}
	});

	context.subscriptions.push(disposableHelloWorld, disposableGetJiraIssue, disposableConfigChange);
}

/**
 * Muestra los detalles de una issue en un panel de información
 */
async function showIssueDetails(issue: JiraIssue): Promise<void> {
	const panel = vscode.window.createWebviewPanel(
		'jiraIssueDetails',
		`Jira Issue: ${issue.key}`,
		vscode.ViewColumn.One,
		{
			enableScripts: true
		}
	);

	// Mostrar HTML inicial con loading
	panel.webview.html = getIssueWebviewContent(issue, [], true);

	// Generar test cases en background
	try {
		const testCases = await aiService.generateTestCases(issue);
		// Actualizar el panel con los test cases generados
		panel.webview.html = getIssueWebviewContent(issue, testCases, false);
	} catch (error: any) {
		// Mostrar error en los test cases
		panel.webview.html = getIssueWebviewContent(issue, [], false, error.message);
	}
}

/**
 * Genera el contenido HTML para mostrar los detalles de la issue
 */
function getIssueWebviewContent(issue: JiraIssue, testCases: TestCase[] = [], isLoading: boolean = false, error?: string): string {
	return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Jira Issue Details</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            padding: 20px;
            line-height: 1.6;
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
        }
        .header {
            border-bottom: 2px solid #007acc;
            padding-bottom: 15px;
            margin-bottom: 25px;
        }
        .issue-key {
            font-size: 24px;
            font-weight: bold;
            color: #4fc3f7;
            margin: 0;
        }
        .issue-summary {
            font-size: 18px;
            margin: 8px 0;
            color: var(--vscode-foreground);
        }
        .project-info {
            font-size: 14px;
            color: var(--vscode-descriptionForeground);
            margin-top: 5px;
        }
        .field {
            margin: 15px 0;
        }
        .field-label {
            font-weight: bold;
            color: var(--vscode-descriptionForeground);
            display: block;
            margin-bottom: 5px;
            font-size: 14px;
        }
        .field-value {
            background: var(--vscode-input-background);
            padding: 12px;
            border-radius: 4px;
            border-left: 3px solid #007acc;
            border: 1px solid var(--vscode-input-border);
        }
        .description {
            white-space: pre-wrap;
            max-height: 300px;
            overflow-y: auto;
        }
        .status, .priority, .issue-type {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: bold;
            text-transform: uppercase;
            margin-right: 8px;
        }
        .status {
            background: var(--vscode-badge-background);
            color: var(--vscode-badge-foreground);
        }
        .priority {
            background: #ff9800;
            color: white;
        }
        .issue-type {
            background: #4caf50;
            color: white;
        }
        .user-info {
            color: var(--vscode-foreground);
        }
        .user-email {
            color: var(--vscode-descriptionForeground);
            font-size: 12px;
            display: block;
        }
        .badges {
            margin: 10px 0;
        }
        .test-cases-section {
            margin-top: 30px;
            border-top: 2px solid #007acc;
            padding-top: 20px;
        }
        .test-cases-header {
            font-size: 20px;
            font-weight: bold;
            color: #4fc3f7;
            margin-bottom: 15px;
            display: flex;
            align-items: center;
        }
        .test-cases-header .icon {
            margin-right: 8px;
        }
        .test-case {
            background: var(--vscode-input-background);
            border: 1px solid var(--vscode-input-border);
            border-radius: 6px;
            margin: 15px 0;
            padding: 15px;
            border-left: 4px solid #4caf50;
        }
        .test-case-title {
            font-weight: bold;
            font-size: 16px;
            color: var(--vscode-foreground);
            margin-bottom: 8px;
        }
        .test-case-section {
            margin: 10px 0;
        }
        .test-case-label {
            font-weight: bold;
            color: var(--vscode-descriptionForeground);
            font-size: 13px;
            text-transform: uppercase;
            margin-bottom: 3px;
        }
        .test-case-content {
            color: var(--vscode-foreground);
            line-height: 1.4;
        }
        .loading-spinner {
            display: inline-block;
            width: 16px;
            height: 16px;
            border: 2px solid var(--vscode-descriptionForeground);
            border-radius: 50%;
            border-top-color: #4fc3f7;
            animation: spin 1s ease-in-out infinite;
            margin-right: 8px;
        }
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
        .error-message {
            background: var(--vscode-inputValidation-errorBackground);
            border: 1px solid var(--vscode-inputValidation-errorBorder);
            color: var(--vscode-errorForeground);
            padding: 12px;
            border-radius: 4px;
            margin: 10px 0;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1 class="issue-key">${issue.key}</h1>
        <div class="issue-summary">${issue.summary}</div>
        <div class="project-info">Proyecto: ${issue.project.name} (${issue.project.key})</div>
    </div>
    
    <div class="field">
        <span class="field-label">Información básica:</span>
        <div class="field-value">
            <div class="badges">
                <span class="status">${issue.status.name}</span>
                <span class="priority">Prioridad: ${issue.priority.name}</span>
                <span class="issue-type">${issue.issueType.name}</span>
            </div>
        </div>
    </div>
    
    ${issue.description ? `
    <div class="field">
        <span class="field-label">Descripción:</span>
        <div class="field-value description">${issue.description}</div>
    </div>
    ` : ''}
    
    <div class="field">
        <span class="field-label">Reportado por:</span>
        <div class="field-value">
            <div class="user-info">${issue.reporter.displayName}</div>
            <span class="user-email">${issue.reporter.emailAddress}</span>
        </div>
    </div>
    
    ${issue.assignee ? `
    <div class="field">
        <span class="field-label">Asignado a:</span>
        <div class="field-value">
            <div class="user-info">${issue.assignee.displayName}</div>
            <span class="user-email">${issue.assignee.emailAddress}</span>
        </div>
    </div>
    ` : ''}
    
    <div class="field">
        <span class="field-label">Fechas:</span>
        <div class="field-value">
            <div><strong>Creado:</strong> ${new Date(issue.created).toLocaleString('es-ES')}</div>
            <div><strong>Actualizado:</strong> ${new Date(issue.updated).toLocaleString('es-ES')}</div>
        </div>
    </div>

    <!-- Sección de Test Cases -->
    <div class="test-cases-section">
        <div class="test-cases-header">
            <span class="icon">🤖</span>
            Test Cases Generados
            ${isLoading ? '<div class="loading-spinner"></div>' : ''}
        </div>
        
        ${isLoading ? `
            <div class="field-value">
                <div>Generando test cases con AI...</div>
            </div>
        ` : error ? `
            <div class="error-message">
                <strong>Error:</strong> ${error}
            </div>
        ` : testCases.length > 0 ? `
            ${testCases.map((testCase, index) => `
                <div class="test-case">
                    <div class="test-case-title">Test Case ${index + 1}: ${testCase.titulo}</div>
                    
                    <div class="test-case-section">
                        <div class="test-case-label">Descripción:</div>
                        <div class="test-case-content">${testCase.descripcion}</div>
                    </div>
                    
                    <div class="test-case-section">
                        <div class="test-case-label">Resultado Esperado:</div>
                        <div class="test-case-content">${testCase.resultado}</div>
                    </div>
                </div>
            `).join('')}
        ` : `
            <div class="field-value">
                <div>No se pudieron generar test cases para esta issue.</div>
            </div>
        `}
    </div>
</body>
</html>`;
}

export function deactivate() {}
