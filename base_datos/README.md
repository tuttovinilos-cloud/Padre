# Base de datos de Padre — documento de referencia

**Proyecto único de escritura:** `cuzswxryqvbguntjvhsa` (`padre-tuttovinilos-dev`).

**Proyecto original Comanda:** `ujfdsabypflseijatxba` — consultar sin modificar.

## Migraciones aplicadas en Supabase Padre
Las migraciones se registraron en el **historial de migraciones de Supabase Padre**, no como copias SQL garantizadas por este repositorio. Antes de agregar futuras migraciones, consultar el historial real del proyecto y versionar el SQL revisado. Las etapas incluyen estructura inicial, roles/RLS, directorio de operadores, RPC de pedidos, auditoría, protección de históricos, y columnas con copia JSONB.

## Importación histórica de Clientes y Pedidos (15 de octubre de 2026)

- **454 clientes de 454.** Identificadores originales preservados.
- **1.386 pedidos de 1.386.** Identificadores originales preservados.
- **10 vínculos de contactos** incorporados con su información histórica.
- Se comprobaron **exactamente los conjuntos de IDs** con un hash de la concatenación de identificadores ordenados, además de los conteos. Para Clientes también coincidió la huella de JSONB completo.
- Los campos completos originales se almacenan en la columna privada `datos_origen_comanda` de las tablas `clientes`, `pedidos` y `clientes_contactos`. No se almacenan clientes ni pedidos en archivos de GitHub.
- **Cinco pedidos** del origen no tienen `cliente_id`. Conservan su nombre y referencia originales, sin crear relaciones falsas.
- **231 pedidos** muestran moneda original `BS`; **1.155** muestran `USD`.
- El estado de pago original indica **1.338 Pagado**, **44 Pendiente** y **4 Abonado**. **Es información histórica, no un saldo válido de Padre.**
- Se detectaron dos identificaciones fiscales repetidas en Clientes; no se fusionaron clientes diferentes.

## Preparación de conciliación histórica

Migraciones `migraciones/padre_conciliacion_preparacion_v1.sql` y `migraciones/padre_conciliacion_fuentes_documentales_v1.sql`, aplicadas únicamente en Padre.

- Revisión por pedido con estados documentales, observaciones e historial auditado.
- Los cambios de revisión solo los guarda un administrador activo.
- Las funciones públicas verifican permisos; las implementaciones están en esquema privado.
- La tabla `private.conciliacion_fuentes` contiene **50 referencias históricas**, todas provenientes de `pedidos_pagos`; se identificaron **8 anuladas** y **38 pedidos vinculados**, sin referencias a pedidos inexistentes. No constituyen ingresos ni saldos.
- Se verificaron, solo por lectura en Comanda, los conteos de cuatro fuentes: `pedidos_pagos` 360 (12 anulados), `clientes_pagos` 179 (8 anulados), `prod_pedidos_pagos` 4, `contabilidad_pagos` 2: **545 registros documentales en total**. Son referencias, no necesariamente movimientos únicos; existe superposición entre fuentes.
- En Padre se registraron estos conteos agregados en `private.conciliacion_fuentes_control` y se amplió `padre_conciliacion_fuentes_resumen` para mostrar la copia incompleta: **495 referencias pendientes de cargar**. No se copió ningún pago original a `public.pagos` ni se concilió ninguna deuda.
- Para completar la importación documental se requiere una vía autorizada: el traslado directo quedó detenido por controles de seguridad. No intentar sortearlos; cualquier exportación/importación posterior debe proteger la información financiera.
- La conciliación monetaria final NO está implementada; todos los pedidos históricos continúan con `importe_conciliado=false`.
- No se copiaron pagos originales al libro financiero `public.pagos`.

## Contabilidad de Padre: funciones de la primera fase

Migraciones aplicadas en Padre y versionadas en `migraciones/padre_contabilidad_v1.sql` y `migraciones/padre_finanzas_reintentos_v1.sql`.

El núcleo registra abonos solamente sobre pedidos **nuevos en USD** de Padre, mediante una transacción que comprueba permisos y saldo, conserva moneda recibida y tasa si el pago fue en bolívares, crea una aplicación al pedido y registra auditoría. La anulación requiere permiso `dinero_anular` y motivo, sin borrar el recibo. Los reintentos idénticos de una operación identificada por UUID no generan pagos adicionales.

Los pedidos importados siguen en **solo lectura, sin conciliación de pagos**, y no se admiten cobros sobre ellos. No existe conversión automática de los importes históricos. Quedan por diseñar saldos a favor, cierre contable, conciliación con movimientos originales, cuentas de proyectos y otros movimientos.

## Reglas financieras estrictas

1. Los pedidos importados son **históricos en solo lectura**.
2. Los campos `precio_total_origen` y `moneda_origen` son referencias originales, no conversiones cambiarias ni pagos nuevos.
3. `total_usd` de un pedido importado **no debe usarse** como importe histórico ni como deuda: vale 0 como marcador técnico hasta una conciliación validada.
4. `importe_conciliado = false` significa que el pedido histórico todavía no se ha reconciliado con los pagos.
5. No se importaron movimientos de `pagos` ni aplicaciones a pedidos.
6. No generar avisos de cobro desde datos históricos pendientes de conciliación.
7. La copia es **puntual**: nuevas altas posteriores en Comanda no llegan automáticamente a Padre.

## Verificación de seguridad

Todas las tablas del esquema público deben tener RLS habilitada; acceso con permisos según pilar. No introducir contraseñas, PIN, tokens de sesión ni claves de servicio en GitHub. La clave *publishable* es de uso público, pero no sustituye a RLS.

Los reportes previos están en `clientes_pedidos_v1.txt`, `estado_y_activacion_padre.txt` y `operadores_iniciales_padre.txt`.
