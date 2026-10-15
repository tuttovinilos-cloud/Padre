# Padre — Nuevo Comanda · Tuttovinilos

**Propósito:** desarrollar el sucesor modular de Comanda con 13 pilares funcionales, manteniendo la identidad visual original, una aplicación web adaptable y una PWA instalable.

## Repositorios completamente separados
- `tuttovinilos-cloud/Comanda`: sistema actual de producción. **No modificar.**
- `tuttovinilos-cloud/Padre`: nuevo desarrollo. Este repositorio ya no contiene en la rama principal las páginas, scripts ni conexiones heredadas de Comanda.
- El Supabase `comanda-tuttovinilos` es **solo lectura** durante este proyecto. No usarlo para pruebas, migraciones, cambios de estructuras ni altas/bajas de registros.
- **Todavía NO existe un Supabase nuevo de Padre.** Su creación requiere confirmar organización y posibles costos. Hasta entonces la PWA es informativa y usa datos de arquitectura estáticos.

## Mapa de archivos vigentes
- `docs/index.html` — interfaz oficial del Mapa Maestro.
- `docs/manifest.webmanifest`, `docs/sw.js`, `docs/pwa.css`, `docs/pwa.js`, `docs/icons/` — PWA independiente.
- `docs/README.md` — instrucciones de publicación e instalación.
- `arquitectura/README.md` — hoja de ruta y pilares.
- `index.html`, `login.html`, `arquitectura/index.html` — **solo redirecciones estáticas** hacia `docs/`; no tienen acceso a base de datos.

## Publicación
Elegir exclusivamente **main /docs** en GitHub Pages:
https://github.com/tuttovinilos-cloud/Padre/settings/pages

Dirección prevista: https://tuttovinilos-cloud.github.io/Padre/

No se ha confirmado desde aquí la activación del sitio en GitHub Pages.

## Seguridad y avance
- Ninguna página activa de Padre hace consultas ni escrituras a Supabase.
- El código heredado fue retirado de la rama principal. Continúa accesible en el historial de GitHub para recuperación; esto **no equivale a borrar todo el historial público**.
- La autenticación, el envío de notificaciones push y las páginas operativas aún deben implementarse sobre un backend exclusivo para Padre.
- No publicar secretos, datos personales reales ni contraseñas en GitHub.
- Cuando exista el entorno independiente: Seguridad → Clientes → Dinero → Pedidos → demás pilares. Cada etapa debe tener pruebas y control de permisos.
