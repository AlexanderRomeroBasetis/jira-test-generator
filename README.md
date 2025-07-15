# Jira Test Generator - VSCode Extension

Esta extensión de VSCode se conecta a un backend NestJS para obtener información de issues de Jira y generar test cases automáticamente usando AI.

## Características

- ✅ Conecta con backend NestJS que tiene acceso a la API de Jira
- ✅ Obtiene detalles completos de issues de Jira
- ✅ Genera test cases automáticamente usando GitHub Copilot
- ✅ Interfaz visual elegante para mostrar la información
- ✅ Configuración flexible del backend

## Uso

1. Abre Command Palette (`Cmd+Shift+P`)
2. Busca "Get Jira Issue"
3. Ingresa la clave de la issue (ej: `REV-323`)
4. ¡Disfruta viendo los detalles y test cases generados!

## Configuración

- **Backend URL**: La URL donde está ejecutándose tu backend NestJS (por defecto: `http://localhost:3000`)
- **API Key**: Clave de autenticación para el backend (opcional)

## Requisitos

- GitHub Copilot activo
- Backend NestJS ejecutándose
- VSCode 1.102.0 o superior

## Following extension guidelines

Ensure that you've read through the extensions guidelines and follow the best practices for creating your extension.

* [Extension Guidelines](https://code.visualstudio.com/api/references/extension-guidelines)

## Working with Markdown

You can author your README using Visual Studio Code. Here are some useful editor keyboard shortcuts:

* Split the editor (`Cmd+\` on macOS or `Ctrl+\` on Windows and Linux).
* Toggle preview (`Shift+Cmd+V` on macOS or `Shift+Ctrl+V` on Windows and Linux).
* Press `Ctrl+Space` (Windows, Linux, macOS) to see a list of Markdown snippets.

## For more information

* [Visual Studio Code's Markdown Support](http://code.visualstudio.com/docs/languages/markdown)
* [Markdown Syntax Reference](https://help.github.com/articles/markdown-basics/)

**Enjoy!**
