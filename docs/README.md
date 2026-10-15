# Padre · PWA y módulos

Este directorio `docs/` debe ser la única fuente de GitHub Pages (`main /docs`).

## Menú y seguridad
- `index.html`: menú inicial con 13 accesos.
- `login.html`, `login.js`, `auth.js`: inicio de sesión independiente, con selección de operadores.
- `padre-config.js`: URL y clave **publicable** de Supabase Padre exclusivamente. Nunca usar `service_role`.
- Los operadores ya tienen fichas de desarrollo, pero todavía no se han vinculado usuarios de Auth ni claves nuevas de acceso.

## Clientes
- `modulos/clientes.html`, `modulos/clientes.js`
- Búsqueda, filtro activo/inactivo, paginación, alta, edición y desactivación.
- Ficha del cliente, contactos, historial de cambios y consulta de pedidos relacionados cuando el operador tenga ambos permisos.
- Restricciones de RLS, identificación única y auditoría en la base de datos.

## Pedidos
- `modulos/pedidos.html`, `modulos/pedidos.js`
- Listado por fecha y número, búsqueda por descripción o número, filtro por estado y cliente, paginación y ficha.
- Alta con selección de cliente y responsable, fecha de entrega y múltiples conceptos (cantidad, precio y unidad).
- Cálculo del total en el servidor; cambios de estado y edición de conceptos cuando el operador posea los permisos respectivos.
- Historia auditada, anulación restringida en pedidos con pagos activos.
- Operaciones de escritura a través de RPC públicas `SECURITY INVOKER` que invocan funciones privadas con validación de Auth y permisos.

## Recursos
- `operaciones.js` y `operaciones.css`: componentes y estilos reutilizables de Clientes/Pedidos.
- `sw.js`: cache PWA v5 únicamente para recursos estáticos públicos de Padre, nunca respuestas privadas ni datos del Supabase.
- `arquitectura.html`: mapa técnico original de pilares.
- Las otras once páginas continúan en distintas fases de desarrollo.

## Validaciones realizadas
- Sintaxis de JavaScript comprobada.
- Tablas, políticas y permisos RLS revisados exclusivamente en el Supabase de Padre.
- Prueba transaccional de alta de cliente, creación de pedido con 2 líneas ($40), cambio de estado y auditoría. La transacción se revirtió totalmente.
- Auditoría de seguridad Supabase: sin advertencias después de mover las funciones privilegiadas al esquema privado.
- **Pendiente**: inicio de sesión real con usuario vinculado, pruebas de navegador y móvil, regresión frente a Comanda y validación de operativa completa.

No copiar nunca claves, PIN, cuentas reales ni datos productivos de Comanda.
