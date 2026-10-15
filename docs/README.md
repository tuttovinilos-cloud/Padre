# Aplicación Padre — documentación técnica

Esta carpeta `docs/` es la **raíz pública de GitHub Pages**; mantener exactamente los enlaces existentes.

## Organización funcional

- **Inicio:** `index.html` presenta el menú de trece módulos.
- **Clientes:** `modulos/clientes.html` y `modulos/clientes.js`. Búsqueda, paginación, creación/edición, contactos, activación, ficha e historial. Los clientes importados conservan su clasificación original de Comanda.
- **Pedidos:** `modulos/pedidos.html` y `modulos/pedidos.js`. Búsqueda, filtros, listado, ficha e historial, alta de nuevos pedidos mediante funciones seguras en el servidor. Para históricos se muestran **número, moneda, precio y estado originales**, marcados como información no conciliada, sin editar.
- **Otras secciones:** `modulos/*.html`, en diversas fases de desarrollo.
- **Componentes comunes:** `operaciones.js`, `operaciones.css`, `page.js`, `page.css`.
- **Autenticación:** `login.html`, `login.js`, `auth.js`, `padre-config.js`. El acceso tiene que comprobarse en navegador con un operador real; no se presupone éxito.
- **PWA:** `pwa.js`, `pwa.css`, `sw.js`, `manifest.webmanifest` e `icons/`. El service worker solo cachea archivos públicos; nunca respuestas privadas ni consultas a Supabase.
- **Arquitectura visual:** `arquitectura.html`.

## Aislamiento

Se conecta únicamente al Supabase **Padre**, proyecto `cuzswxryqvbguntjvhsa`. No enlazar al Supabase de Comanda ni añadir sus credenciales o datos al repositorio.

## Datos

La base Padre contiene **454 clientes, 1.386 pedidos y 10 relaciones de contactos** importados desde Comanda. Los conjuntos de identificadores originales coinciden y las fichas originales se guardan como JSONB en la base Padre. **No se copiaron los pagos**; los históricos son de solo lectura hasta conciliar. Cinco pedidos no tienen cliente vinculado en el origen. Véase `../base_datos/README.md`.

## Control de calidad

Desde la raíz del repositorio ejecutar:

```bash
node tests/verificar-padre.mjs
```

GitHub Actions ejecuta el mismo verificador en cada cambio a `main` y en pull requests. La verificación estática **no sustituye** la prueba real de autenticación, formularios, políticas RLS, dispositivos o finanzas.

## Publicación

Configurar GitHub Pages en `main /docs`. Después del despliegue, puede hacer falta recargar la PWA para actualizar sus recursos estáticos. No publicar información privada en HTML, JS ni JSON.
