# Jira Test Generator - VSCode Extension

Una extensión de VSCode que se conecta directamente a Jira para obtener información de issues y generar test cases automáticamente usando múltiples proveedores de IA.

## 🚀 Características

- ✅ **Conexión directa a Jira** - Sin necesidad de backend intermedio
- ✅ **Múltiples proveedores de IA** - GitHub Copilot y Google Gemini
- ✅ **Generación automática de test cases** - 3 casos de prueba por issue
- ✅ **Interfaz visual elegante** - Panel interactivo para mostrar detalles
- ✅ **Envío automático a Jira** - Los test cases se pueden enviar como comentarios
- ✅ **Configuración flexible** - Cambio dinámico entre proveedores de IA

## 🎯 Proveedores de IA Disponibles

### GitHub Copilot (Por defecto)
- **Requisitos**: GitHub Copilot activo en VS Code
- **Configuración**: No requiere configuración adicional
- **Ventajas**: Integración nativa con VS Code, sin configuración externa

### Google Gemini
- **Requisitos**: [Gemini CLI](https://ai.google.dev/docs/gemini_cli_quickstart) instalado en el sistema.
- **Configuración**: Requiere una API Key de Google Gemini configurada en los ajustes de la extensión.
- **Ventajas**: Utiliza el poder del CLI para análisis avanzados y respuestas detalladas.

## 📖 Uso

1. **Configurar la extensión** (ver sección de Configuración).
2. Abrir la paleta de comandos (`Cmd+Shift+P` / `Ctrl+Shift+P`).
3. Buscar y ejecutar **"Jira Test Generator: Get Jira Issue"**.
4. Ingresar la clave de la issue (ej: `PROJ-123`).
5. La extensión obtendrá los detalles de la issue y generará 3 casos de prueba.
6. Revisa los casos de prueba en el panel que aparecerá.
7. Puedes enviar los casos de prueba como un comentario a la issue de Jira directamente desde el panel.

## ⚙️ Configuración

### Configuración de Jira (Requerida)

1.  Ir a **VS Code Settings** → **Extensions** → **Jira Test Generator**.
2.  Configurar los siguientes campos:
    *   **Jira Url**: La URL de tu instancia de Jira (ej: `https://tuempresa.atlassian.net`).
    *   **Email**: Tu email de Jira usado para la autenticación.
    *   **Api Token**: Tu token de API de Jira.

#### ¿Cómo obtener el API Token de Jira?

1.  Ve a tu [configuración de cuenta de Atlassian](https://id.atlassian.com/manage-profile/security/api-tokens).
2.  Haz clic en **"Create API token"**.
3.  Copia el token generado y pégalo en la configuración de la extensión.

### Configuración de Proveedores de IA

Desde la misma sección de configuración, puedes elegir tu proveedor de IA preferido.

#### Para usar GitHub Copilot (Opción por defecto)

-   **AI Provider**: Seleccionar `"Copilot"`.
-   **Requisito**: Debes tener una suscripción de GitHub Copilot activa en VS Code.

#### Para usar Google Gemini

-   **AI Provider**: Seleccionar `"Gemini"`.
-   **Requisito 1**: Instalar el [CLI de Gemini](https://ai.google.dev/docs/gemini_cli_quickstart) en tu sistema.
-   **Requisito 2**: Configurar tu API Key de Gemini en el campo **"Gemini Api Key"**.

##### ¿Cómo obtener la API Key de Gemini?

1.  Ve a [Google AI Studio](https://aistudio.google.com/app/apikey).
2.  Crea un nuevo proyecto o selecciona uno existente.
3.  Haz clic en **"Create API key"**.
4.  Copia la clave generada y pégala en la configuración de la extensión.

## 🔧 Requisitos

-   **VS Code**: `1.102.0` o superior.
-   **Para usar Copilot**: Suscripción de GitHub Copilot activa.
-   **Para usar Gemini**: [CLI de Gemini](https://ai.google.dev/docs/gemini_cli_quickstart) instalado y una API Key de Google AI.
-   Conexión a internet para acceder a Jira y a las APIs de IA.

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

## 🔍 Ejemplo de Uso

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

## 🐛 Troubleshooting

### Error: "No hay modelos de Copilot disponibles"
- **Solución**: Asegúrate de tener GitHub Copilot activo y una suscripción válida

### Error: "API Key de Anthropic no configurada"
- **Solución**: Ve a la configuración de la extensión y agrega tu API Key de Anthropic

### Error: "API Key de Google AI no configurada"
- **Solución**: Ve a la configuración de la extensión y agrega tu API Key de Google AI

### Error: "Error de Jira API: 401"
- **Solución**: Verifica que tu email y API Token de Jira sean correctos

### Error: "No se pudo conectar a Jira"
- **Solución**: Verifica que la URL de Jira sea correcta y tengas conexión a internet

## 🔄 Cambio de Proveedores de IA

Los cambios de configuración se aplican automáticamente sin necesidad de reiniciar VS Code:

1. Ve a Settings → Extensions → Jira Test Generator
2. Cambia el "AI Provider" al deseado
3. Agrega la API Key correspondiente si es necesario
4. ¡Listo! El próximo test case usará el nuevo proveedor

## 🤝 Contribuir

1. Fork el repositorio
2. Crear una rama para tu feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit tus cambios (`git commit -am 'Agregar nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Crear un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.

## 🆘 Soporte

Si encuentras algún problema o tienes sugerencias:

1. Revisa la sección de [Troubleshooting](#-troubleshooting)
2. Busca en los [Issues existentes](../../issues)
3. Crea un [nuevo Issue](../../issues/new) si no encuentras solución

---

**¡Disfruta generando test cases automáticamente! 🚀**
