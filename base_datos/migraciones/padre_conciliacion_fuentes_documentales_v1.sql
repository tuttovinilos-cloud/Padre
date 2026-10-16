-- Exclusivamente Supabase PADRE: fuentes documentales, no pagos contables.
CREATE TABLE private.conciliacion_fuentes (
 fuente text NOT NULL CHECK(fuente IN ('pedidos_pagos','clientes_pagos','prod_pedidos_pagos','contabilidad_pagos')),
 origen_id bigint NOT NULL,
 pedido_origen_id bigint,
 cliente_origen_id bigint,
 cliente_pago_origen_id bigint,
 estado_origen text,
 moneda_origen text,
 monto_original numeric,
 monto_usd_referencial numeric,
 fecha_origen date,
 registro_origen jsonb NOT NULL CHECK(jsonb_typeof(registro_origen)='object'),
 capturado_en timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(fuente,origen_id)
);
CREATE INDEX conciliacion_fuentes_pedido ON private.conciliacion_fuentes(pedido_origen_id)
 WHERE pedido_origen_id IS NOT NULL;
CREATE INDEX conciliacion_fuentes_cliente_pago ON private.conciliacion_fuentes(cliente_pago_origen_id)
 WHERE cliente_pago_origen_id IS NOT NULL;
ALTER TABLE private.conciliacion_fuentes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.conciliacion_fuentes FROM PUBLIC,anon,authenticated;
COMMENT ON TABLE private.conciliacion_fuentes IS
 'Snapshot histórico solo de referencia de tablas de cobro en Comanda. No crea pagos, abonos, saldos ni conciliaciones en Padre.';

CREATE FUNCTION private.padre_conciliacion_fuentes_resumen()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=''
AS $$
DECLARE r jsonb;
BEGIN
 IF auth.uid() IS NULL OR NOT private.tiene_permiso('dinero_leer') THEN
  RAISE EXCEPTION 'Acceso denegado' USING ERRCODE='42501';
 END IF;
 SELECT jsonb_build_object(
 'pedidos_pagos', count(*) FILTER(WHERE fuente='pedidos_pagos'),
 'clientes_pagos', count(*) FILTER(WHERE fuente='clientes_pagos'),
 'prod_pedidos_pagos', count(*) FILTER(WHERE fuente='prod_pedidos_pagos'),
 'contabilidad_pagos', count(*) FILTER(WHERE fuente='contabilidad_pagos'),
 'pedidos_pagos_anulados',count(*) FILTER(WHERE fuente='pedidos_pagos' AND upper(coalesce(estado_origen,''))='ANULADO'),
 'pedidos_pagos_con_cliente_pago',count(*) FILTER(WHERE fuente='pedidos_pagos' AND cliente_pago_origen_id IS NOT NULL),
 'clientes_pagos_vinculados',(
   SELECT count(*) FROM private.conciliacion_fuentes cp WHERE cp.fuente='clientes_pagos'
   AND EXISTS(SELECT 1 FROM private.conciliacion_fuentes pp
     WHERE pp.fuente='pedidos_pagos' AND pp.cliente_pago_origen_id=cp.origen_id)
 ),
 'total_fuentes',count(*)
 ) INTO r FROM private.conciliacion_fuentes;
 RETURN r;
END $$;
REVOKE ALL ON FUNCTION private.padre_conciliacion_fuentes_resumen() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION private.padre_conciliacion_fuentes_resumen() TO authenticated;
CREATE FUNCTION public.padre_conciliacion_fuentes_resumen()
RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path=''
AS $$ SELECT private.padre_conciliacion_fuentes_resumen(); $$;
REVOKE ALL ON FUNCTION public.padre_conciliacion_fuentes_resumen() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.padre_conciliacion_fuentes_resumen() TO authenticated;

CREATE FUNCTION private.padre_conciliacion_evidencias(p_pedido_id uuid)
RETURNS TABLE(
 fuente text,registro_origen_id bigint,fecha date,estado_original text,
 moneda text,monto_recibido numeric,
 aplicado_usd numeric,aplicado_bs numeric,cliente_pago_id bigint,metodo text,referencia text
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=''
AS $$
DECLARE origin_id bigint;
BEGIN
 IF auth.uid() IS NULL OR NOT private.tiene_permiso('dinero_leer') THEN
   RAISE EXCEPTION 'Acceso denegado' USING ERRCODE='42501';
 END IF;
 SELECT p.origen_comanda_id INTO origin_id FROM public.pedidos p
 WHERE p.id=p_pedido_id AND p.origen_comanda_id IS NOT NULL;
 IF origin_id IS NULL THEN RAISE EXCEPTION 'Pedido histórico no encontrado';END IF;
 RETURN QUERY SELECT f.fuente,f.origen_id,f.fecha_origen,f.estado_origen,
 f.moneda_origen,f.monto_original,
 (f.registro_origen->>'pago_aplicado_usd')::numeric,
 (f.registro_origen->>'pago_aplicado_bs')::numeric,
 f.cliente_pago_origen_id,
 f.registro_origen->>'metodo_pago',
 f.registro_origen->>'referencia'
 FROM private.conciliacion_fuentes f
 WHERE f.fuente='pedidos_pagos' AND f.pedido_origen_id=origin_id
 ORDER BY f.fecha_origen,f.origen_id LIMIT 100;
END $$;
REVOKE ALL ON FUNCTION private.padre_conciliacion_evidencias(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION private.padre_conciliacion_evidencias(uuid) TO authenticated;
CREATE FUNCTION public.padre_conciliacion_evidencias(p_pedido_id uuid)
RETURNS TABLE(
 fuente text,registro_origen_id bigint,fecha date,estado_original text,
 moneda text,monto_recibido numeric,
 aplicado_usd numeric,aplicado_bs numeric,cliente_pago_id bigint,metodo text,referencia text
) LANGUAGE sql STABLE SECURITY INVOKER SET search_path=''
AS $$ SELECT * FROM private.padre_conciliacion_evidencias(p_pedido_id); $$;
REVOKE ALL ON FUNCTION public.padre_conciliacion_evidencias(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.padre_conciliacion_evidencias(uuid) TO authenticated;
