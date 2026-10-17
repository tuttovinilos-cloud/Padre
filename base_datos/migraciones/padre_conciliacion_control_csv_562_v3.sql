-- Corte documental actualizado con las cuatro exportaciones CSV recibidas el 17-10-2026.
-- USAR SOLO EN SUPABASE PADRE. No transforma referencias en pagos contables.
-- Esta revisión reemplaza los conteos agregados anteriores de 545 filas.
INSERT INTO private.conciliacion_fuentes_control
 (fuente,total_origen,anulados_origen,vinculados_cliente_pago_origen)
VALUES
 ('pedidos_pagos',371,12,262),
 ('clientes_pagos',184,8,0),
 ('prod_pedidos_pagos',5,0,5),
 ('contabilidad_pagos',2,0,0)
ON CONFLICT(fuente) DO UPDATE SET
 total_origen=excluded.total_origen,
 anulados_origen=excluded.anulados_origen,
 vinculados_cliente_pago_origen=excluded.vinculados_cliente_pago_origen,
 verificado_en=now();
-- Este SQL solo ajusta indicadores de completitud documental; no modifica
-- private.conciliacion_fuentes, public.pagos ni public.pedidos.
