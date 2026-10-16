-- SOLO PADRE. Migración ejecutada en Supabase Padre en octubre de 2026.
-- Control de integridad DOCUMENTAL: nunca modifica cobros ni deudas.
-- Referencias agregadas verificadas mediante consultas de solo lectura al origen;
-- se contabilizan FILAS documentales, no pagos únicos por cliente.
CREATE TABLE IF NOT EXISTS private.conciliacion_fuentes_control (
 fuente text PRIMARY KEY CHECK (fuente IN ('pedidos_pagos','clientes_pagos','prod_pedidos_pagos','contabilidad_pagos')),
 total_origen integer NOT NULL CHECK (total_origen >= 0),
 anulados_origen integer NOT NULL CHECK (anulados_origen >= 0 AND anulados_origen <= total_origen),
 vinculados_cliente_pago_origen integer NOT NULL DEFAULT 0 CHECK(vinculados_cliente_pago_origen >= 0),
 verificado_en timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE private.conciliacion_fuentes_control ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.conciliacion_fuentes_control FROM PUBLIC,anon,authenticated;
COMMENT ON TABLE private.conciliacion_fuentes_control IS
 'Totales agregados verificados en el origen, sin datos personales, sin transacciones ni saldos. No hay sincronización automática.';
INSERT INTO private.conciliacion_fuentes_control(fuente,total_origen,anulados_origen,vinculados_cliente_pago_origen)
VALUES
 ('pedidos_pagos',360,12,251),
 ('clientes_pagos',179,8,0),
 ('prod_pedidos_pagos',4,0,4),
 ('contabilidad_pagos',2,0,0)
ON CONFLICT(fuente) DO UPDATE SET
 total_origen=excluded.total_origen,
 anulados_origen=excluded.anulados_origen,
 vinculados_cliente_pago_origen=excluded.vinculados_cliente_pago_origen,
 verificado_en=now();
CREATE OR REPLACE FUNCTION private.padre_conciliacion_fuentes_resumen()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=''
AS $$
DECLARE r jsonb; esperado integer; copiado integer; detalle jsonb; corte timestamptz;
BEGIN
 IF auth.uid() IS NULL OR NOT private.tiene_permiso('dinero_leer') THEN
  RAISE EXCEPTION 'Acceso denegado' USING ERRCODE='42501';
 END IF;
 SELECT coalesce(sum(total_origen),0),max(verificado_en)
 INTO esperado,corte FROM private.conciliacion_fuentes_control;
 SELECT count(*) INTO copiado FROM private.conciliacion_fuentes;
 SELECT coalesce(jsonb_agg(jsonb_build_object(
   'fuente',res.fuente,'total_origen',res.total_origen,
   'copiados',res.copiados,
   'pendientes',greatest(res.total_origen-res.copiados,0),
   'anulados_origen',res.anulados_origen,
   'anulados_copiados',res.anulados_copiados,
   'vinculados_cliente_pago_origen',res.vinculados_cliente_pago_origen,
   'copia_completa',res.copiados=res.total_origen
  ) ORDER BY res.fuente),'[]'::jsonb) INTO detalle
 FROM (
  SELECT control.fuente,control.total_origen,control.anulados_origen,
   control.vinculados_cliente_pago_origen,
   coalesce(cantidad.copiados,0)::integer AS copiados,
   coalesce(cantidad.anulados_copiados,0)::integer AS anulados_copiados
  FROM private.conciliacion_fuentes_control control
  LEFT JOIN (
   SELECT fuente,count(*) copiados,
    count(*) FILTER(WHERE upper(coalesce(estado_origen,''))='ANULADO') anulados_copiados
   FROM private.conciliacion_fuentes GROUP BY fuente
  ) cantidad USING(fuente)
 ) res;
 SELECT jsonb_build_object(
  'total_fuentes',copiado,'total_origen_referencias',esperado,
  'pendientes_copia',greatest(esperado-copiado,0),
  'copia_completa',esperado>0 AND copiado=esperado
   AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(detalle) j
    WHERE (j->>'copia_completa')::boolean IS FALSE),
  'verificado_en',corte,'detalle_fuentes',detalle,
  'pedidos_pagos',count(*) FILTER(WHERE fuente='pedidos_pagos'),
  'clientes_pagos',count(*) FILTER(WHERE fuente='clientes_pagos'),
  'prod_pedidos_pagos',count(*) FILTER(WHERE fuente='prod_pedidos_pagos'),
  'contabilidad_pagos',count(*) FILTER(WHERE fuente='contabilidad_pagos'),
  'pedidos_pagos_anulados',count(*) FILTER(WHERE fuente='pedidos_pagos' AND upper(coalesce(estado_origen,''))='ANULADO'),
  'pedidos_pagos_con_cliente_pago',count(*) FILTER(WHERE fuente='pedidos_pagos' AND cliente_pago_origen_id IS NOT NULL),
  'clientes_pagos_vinculados',(SELECT count(*) FROM private.conciliacion_fuentes cp
    WHERE cp.fuente='clientes_pagos'
     AND EXISTS(SELECT 1 FROM private.conciliacion_fuentes pp WHERE pp.fuente='pedidos_pagos'
      AND pp.cliente_pago_origen_id=cp.origen_id)),
  'pedidos_distintos_referenciados',(SELECT count(DISTINCT pedido_origen_id)
    FROM private.conciliacion_fuentes WHERE fuente='pedidos_pagos' AND pedido_origen_id IS NOT NULL),
  'pedidos_referenciados_no_encontrados',(SELECT count(*)
    FROM private.conciliacion_fuentes f WHERE f.fuente='pedidos_pagos' AND f.pedido_origen_id IS NOT NULL
    AND NOT EXISTS(SELECT 1 FROM public.pedidos p WHERE p.origen_comanda_id=f.pedido_origen_id)),
  'referencias_sin_fecha',count(*) FILTER(WHERE fecha_origen IS NULL),
  'pagos_financieros_padre',(SELECT count(*) FROM public.pagos),
  'pedidos_historicos_no_conciliados',(SELECT count(*) FROM public.pedidos p
    WHERE p.origen_comanda_id IS NOT NULL AND p.importe_conciliado IS FALSE)
 ) INTO r FROM private.conciliacion_fuentes;
 RETURN r;
END $$;
REVOKE ALL ON FUNCTION private.padre_conciliacion_fuentes_resumen() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION private.padre_conciliacion_fuentes_resumen() TO authenticated;
-- Se mantiene el wrapper ya existente public.padre_conciliacion_fuentes_resumen().
