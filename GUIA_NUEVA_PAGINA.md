# Guia para agregar una pagina nueva

1. Copia `templates/nueva-pagina-base.html` y renombra el archivo (ej. `reportes.html`).
2. Agrega la pagina al arreglo `DEFAULT_NAV_ITEMS` en:
   - `js/auth.js`
3. Usa un permiso existente (`puede_*`) o crea uno nuevo en tu tabla de operadores.
4. Prueba login + menu en desktop y movil.

Con esto, menu y permisos quedan sincronizados desde una sola fuente.
