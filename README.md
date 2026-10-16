# Padre — Nuevo sistema de Tuttovinilos

Repositorio de **Padre**, el sistema nuevo e independiente de la Comanda actual.

> **Límite obligatorio:** este repositorio y su Supabase de desarrollo pueden modificarse. El repositorio Comanda y su Supabase productivo son de **solo lectura** durante la construcción de Padre.

## Estructura de GitHub

| Ruta | Responsabilidad |
| --- | --- |
| `docs/index.html` | Menú principal de los 13 módulos |
| `docs/modulos/` | Pantallas por módulo; Clientes, Pedidos, Seguridad y Contabilidad cuentan con código independiente `.js` |
| `docs/operaciones.js` / `.css` | Componentes visuales comunes |
| `docs/auth.js`, `docs/login.*`, `docs/padre-config.js` | Autenticación de Padre y configuración **pública** del cliente |
| `docs/pwa.js`, `docs/sw.js`, `docs/manifest.webmanifest`, `docs/icons/` | Aplicación instalable y caché exclusivamente estática |
| `docs/arquitectura.html`, `arquitectura/` | Mapa técnico y diseño de los pilares |
| `base_datos/` | Documentación de esquemas, migraciones y traslado histórico |
| `tests/` | Pruebas automatizadas de archivos y enlaces web |
| `.github/workflows/` | Comprobación automática de cambios en GitHub |
| `index.html`, `login.html` | Redirecciones compatibles al contenido de `docs/` |

**No mover las rutas públicas existentes:** se preservan para no romper la página ni su instalación en teléfonos.

## Estado de datos — copia histórica del 15/10/2026

| Información | Comanda original | Copia en Padre | Comprobación |
| --- | ---: | ---: | --- |
| Clientes | 454 | 454 | Cantidades e identificadores exactos |
| Pedidos | 1.386 | 1.386 | Cantidades e identificadores exactos |
| Relaciones de contactos con clientes | 10 | 10 | Importadas con referencia al origen |

Cada cliente y pedido importado conserva su **registro original íntegro en `datos_origen_comanda` (JSONB)** dentro del Supabase de Padre, nunca dentro de este GitHub público. Todos los pedidos mantienen su ID de Comanda como `origen_comanda_id`. Cinco pedidos no poseen cliente vinculado en Comanda; se preservan sin atribuirles uno. Los pedidos históricos están en **solo lectura**.

**Importante:** los pagos y abonos reales **no** se importaron al libro financiero de Padre. Los estados e importes históricos son informativos: **no representan saldos ni deudas conciliadas**. Esta copia es una fotografía histórica, **no una sincronización en vivo**.

## Entornos

- **Padre (desarrollo):** Supabase propio `cuzswxryqvbguntjvhsa`. Lugar exclusivo para escribir datos de pruebas y desarrollar.
- **Comanda (producción):** Supabase `ujfdsabypflseijatxba`. Ninguna escritura ni modificación.
- Código: **este repositorio** `tuttovinilos-cloud/Padre`. No enviar cambios al repositorio Comanda.

## Conciliación histórica (revisión documental)

Ya existe una pantalla de revisión separada de Contabilidad, accesible desde `docs/modulos/conciliacion.html`. Ofrece consulta por pedido y clasificación documental con autorización de administrador y auditoría. Esta revisión nunca crea abonos ni cambia saldos de los pedidos importados. **Falta incorporar los comprobantes históricos y conciliarlos**.

## Contabilidad — primera etapa

Padre dispone de un circuito inicial para **abonos y anulaciones de pedidos nuevos**, con permisos diferenciados, tasas BCV/DIVISA indicadas expresamente y auditoría. Se conserva la separación entre compras y cobros. Los **1.386 pedidos históricos** están excluidos de los cálculos de deuda mientras no se concilien sus pagos reales.

Este módulo aún necesita pruebas en navegador y no reemplaza un sistema contable completo. Las migraciones SQL están versionadas en `base_datos/migraciones/`.

## Web y validaciones

GitHub Pages publica actualmente desde **`main /` (raíz del repositorio)**, según el registro del despliegue. La aplicación está en `docs/`; las antiguas rutas directas `/Padre/modulos/*.html` redirigen a `/Padre/docs/modulos/*.html`. Configuración:
https://github.com/tuttovinilos-cloud/Padre/settings/pages

Dirección prevista de Padre:
https://tuttovinilos-cloud.github.io/Padre/

Verificación local: `node tests/verificar-padre.mjs`. GitHub Actions aplica las mismas comprobaciones al actualizar este repositorio.

## Faltantes antes de sustituir Comanda

- Validar el inicio de sesión PIN, políticas de acceso y la operación real desde teléfono y escritorio.
- Conciliar los pedidos históricos con pagos, saldos, bolívares y divisas sin inventar deuda.
- Migrar y probar imágenes/archivos alojados en sistemas externos; por ahora solo se conservan sus referencias originales.
- Completar los demás módulos y pruebas integrales. Los importes históricos no deben convertirse automáticamente a USD.

Más detalles en [Documentación de la web](docs/README.md) y [Datos e importación](base_datos/README.md).
