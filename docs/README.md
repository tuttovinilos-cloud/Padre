# Padre · Nueva PWA independiente

Publicar solamente esta carpeta `/docs` como raíz de GitHub Pages.

## Configuración
1. Entrar en https://github.com/tuttovinilos-cloud/Padre/settings/pages
2. Elegir **Deploy from a branch**.
3. Elegir **main**, carpeta **/docs**, y guardar.
4. Esperar el despliegue y abrir https://tuttovinilos-cloud.github.io/Padre/

## Implementado
- Mapa Maestro interactivo de 13 pilares.
- Interfaz adaptable a escritorio y móvil con los colores de Comanda.
- Manifiesto PWA con iconos e instalación en móviles compatibles.
- Service worker restringido a archivos estáticos del mapa, para consulta sin conexión después de una primera visita conectada.
- Botón con instrucciones de instalación.
- Código receptor de push **preparatorio**. Aún no existe servidor de notificaciones, suscripciones ni envíos push.

## Aún pendiente
- Crear un Supabase propio para Padre, previo consentimiento de organización y cualquier costo.
- Diseñar autenticación segura y separación de roles del nuevo backend.
- Implementar funcionalidades reales de cada pilar en Padre, con datos ficticios y pruebas.
- Habilitar notificaciones push únicamente cuando exista backend independiente y autorización de los operadores.

## Reglas
- No consumir ni escribir en el Supabase de Comanda desde Padre.
- No insertar claves secretas ni datos reales en páginas públicas.
- Mantener el cache de la PWA restringido a recursos estáticos, sin guardar respuestas privadas.
- La rama principal de Padre ya fue limpiada de las páginas y scripts antiguos conectados a Comanda.

## Nuevo menú principal y módulos (V2)
- `index.html`: menú con 13 tarjetas que abren páginas de `modulos/`.
- `modulos/pedidos.html`: listado demostrativo de pedidos, con seis registros falsos, búsqueda, estados y vista de detalle.
- `modulos/seguridad.html`, `clientes.html`, `dinero.html` y los otros 10 módulos: páginas iniciales para construir progresivamente.
- `page.css`, `page.js`: estilos y componentes reutilizables.
- `arquitectura.html`: ficha técnica original de los 13 pilares y sus conexiones.
- El service worker V2 añade solamente páginas y recursos **estáticos** al caché para consulta sin conexión, nunca datos reales de clientes ni pedidos.

**No hay conexión con Supabase ni almacenamiento real.** La fase posterior requiere crear una base propia de Padre y reglas de acceso, previa consulta de costos.
