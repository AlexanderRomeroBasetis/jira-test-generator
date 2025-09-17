# Jira Test Generator - VSCode Extension

Una extensión de VSCode que se conecta directamente a Jira para obtener información de issues y generar test cases automáticamente usando Google Gemini.

## Características

- ✅ **Conexión directa a Jira** - Sin necesidad de backend intermedio
- ✅ **Integración con Google Gemini** - Generación inteligente de test cases
- ✅ **Generación automática de test cases** - 3 casos de prueba por issue
- ✅ **Interfaz visual elegante** - Panel interactivo para mostrar detalles
- ✅ **Envío automático a Jira** - Los test cases se pueden enviar como comentarios
- ✅ **Configuración flexible** - Configuración sencilla de Google Gemini

## Proveedor de IA

### Google Gemini
- **Requisitos**: [Gemini CLI](https://ai.google.dev/docs/gemini_cli_quickstart) instalado en el sistema.
- **Configuración**: Requiere una API Key de Google Gemini configurada en los ajustes de la extensión.
- **Ventajas**: Utiliza el poder del CLI para análisis avanzados y respuestas detalladas.

## Uso

1. **Configurar la extensión** (ver sección de Configuración).
2. Abrir la paleta de comandos (`Cmd+Shift+P` / `Ctrl+Shift+P`).
3. Buscar y ejecutar **"Jira Test Generator: Get Jira Issue"**.
4. Ingresar la clave de la issue (ej: `PROJ-123`).
5. La extensión obtendrá los detalles de la issue y generará 3 casos de prueba.
6. Revisa los casos de prueba en el panel que aparecerá.
7. Puedes enviar los casos de prueba como un comentario a la issue de Jira directamente desde el panel.

## Configuración

### Configuración de Jira (Requerida)

1.  Ir a **VS Code Settings** → **Extensions** → **Jira Test Generator**.
2.  Configura los siguientes campos:
    *   **Jira Url**: La URL de tu instancia de Jira (ej: `https://tuempresa.atlassian.net` o `https://jira.tuempresa.com`).
    *   **Jira Server Type**: Selecciona **"Jira Cloud"** o **"Jira Server"**. Esto determina cómo se usará el token.
    *   **Email**: Tu email de Atlassian. **Es requerido únicamente si usas Jira Cloud**.
    *   **Api Token**: Tu token de seguridad.
        *   **Para Jira Cloud**: Es el [API Token de Atlassian](https://id.atlassian.com/manage-profile/security/api-tokens).
        *   **Para Jira Server**: Es el **Personal Access Token (PAT)** que puedes generar en tu perfil de Jira.

### Configuración de Google Gemini (Requerida)

Para usar Google Gemini como proveedor de IA:

-   **Requisito 1**: Instalar el [CLI de Gemini](https://ai.google.dev/docs/gemini_cli_quickstart) en tu sistema.
-   **Requisito 2**: Configurar tu API Key de Gemini en el campo **"Gemini Api Key"** en los ajustes de la extensión.

##### ¿Cómo obtener la API Key de Gemini?

1.  Ve a [Google AI Studio](https://aistudio.google.com/app/apikey).
2.  Crea un nuevo proyecto o selecciona uno existente.
3.  Haz clic en **"Create API key"**.
4.  Copia la clave generada y pégala en la configuración de la extensión.

## 🔧 Requisitos

-   **VS Code**: `1.102.0` o superior.
-   **Gemini CLI**: [CLI de Gemini](https://ai.google.dev/docs/gemini_cli_quickstart) instalado en el sistema.
-   **API Key de Google AI**: Una clave de API válida de Google AI.
-   Conexión a internet para acceder a Jira y a la API de Gemini.

## 📦 Instalación

### Desde VS Code Marketplace
1. Abrir VS Code
2. Ir a Extensions (`Ctrl+Shift+X` / `Cmd+Shift+X`)
3. Buscar "Jira Test Generator"
4. Hacer clic en "Install"

### Instalación Manual
1. Descargar el archivo `.vsix` desde las releases
2. En VS Code: `Ctrl+Shift+P` → "Extensions: Install from VSIX"
3. Seleccionar el archivo descargado

## Ejemplo de Uso

```
1. Comando: "Get Jira Issue"
2. Input: "PROJ-123"
3. Resultado: Panel con detalles de la issue y 3 test cases generados automáticamente

Test Case 1:
TITULO: Verificar funcionalidad principal
DESCRIPCION: Validar que la funcionalidad descrita en la issue funciona correctamente
RESULTADO: La funcionalidad debe ejecutarse sin errores

Test Case 2:
TITULO: Probar casos límite
DESCRIPCION: Verificar el comportamiento con datos límite o casos extremos
RESULTADO: El sistema debe manejar correctamente los casos límite

Test Case 3:
TITULO: Validar integración
DESCRIPCION: Confirmar que la nueva funcionalidad se integra correctamente
RESULTADO: No debe haber conflictos con funcionalidades existentes
```
---

**¡Disfruta generando test cases automáticamente! 🚀**
