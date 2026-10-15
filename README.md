# Padre · Nuevo sistema independiente de Tuttovinilos

## Propósito
Construir desde cero la nueva Comanda Padre, con 13 módulos: Seguridad, Clientes, Dinero, Pedidos, Materiales, Cotizaciones, Producción, Compras, Precios, Comunicación, Estadísticas, Configuración, Marketing y Gestión Comercial.

## Entornos totalmente separados
- **Comanda (producción)**: repositorio `tuttovinilos-cloud/Comanda`, Supabase `ujfdsabypflseijatxba`. Nunca modificar desde el proyecto Padre.
- **Padre (desarrollo)**: este repositorio, Supabase `cuzswxryqvbguntjvhsa`. Único destino de desarrollos y pruebas.
- Nunca copiar contraseñas, PIN, identificadores privados, clientes, pagos o pedidos reales a un repositorio público.

## Aplicación
- `docs/index.html`: menú de 13 módulos.
- `docs/modulos/clientes.html`: directorio, altas, edición, activación/desactivación, contactos, historial y pedidos relacionados.
- `docs/modulos/pedidos.html`: consulta, filtros, registro, conceptos, cálculo de totales en servidor, edición de estados, asignación de responsables e historial.
- `docs/modulos/`: otras once pantallas en distintas fases de implementación.
- `docs/login.html`: pantalla de selección de operadores de Padre.
- `docs/operaciones.js`, `docs/operaciones.css` y `docs/modulos/{clientes,pedidos}.js`: interfaz específica de los dos módulos.
- `docs/arquitectura.html`: mapa técnico de los 13 pilares.

## Publicación de la PWA
GitHub Pages debe apuntar a `main /docs`: https://github.com/tuttovinilos-cloud/Padre/settings/pages
Dirección prevista: https://tuttovinilos-cloud.github.io/Padre/

## Base de datos
Las tablas y migraciones se aplican exclusivamente en Supabase Padre, mediante migraciones documentadas. La lógica privilegiada de los pedidos está en el esquema `private`, fuera de la Data API; los RPC públicos usan `SECURITY INVOKER` y comprueban permisos y cuentas activas. La interfaz nunca utiliza el servicio de Comanda.

## Limitaciones importantes
- Los nueve perfiles de operadores están preparados, pero todavía no hay usuarios con credenciales de Supabase Auth vinculadas. Por tanto, **no se ha verificado un inicio de sesión real ni un flujo completo en navegador**.
- Las operaciones básicas de Clientes y Pedidos han sido probadas mediante una transacción con identidad simulada, seguida de `ROLLBACK`: **no quedó ningún registro de prueba**.
- Falta activar de forma segura el acceso de un operador, probar en navegador/móvil y comparar todos los campos y comportamientos con Comanda antes de considerar ambos módulos listos para producción.
- Dinero, conciliación BCV/DIVISA, archivos, notificaciones push reales y demás integraciones requieren fases específicas.

**No usar Padre como sustituto de Comanda hasta completar esas validaciones.**
