-- PADRE: primer núcleo financiero transaccional. Nunca ejecutar en Comanda.
ALTER TABLE public.pagos ADD COLUMN IF NOT EXISTS operacion_id uuid;
CREATE UNIQUE INDEX IF NOT EXISTS pagos_operacion_id_unique ON public.pagos(operacion_id) WHERE operacion_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS finanzas_pagos_estado_cliente_fecha ON public.pagos(estado,cliente_id,fecha DESC);
CREATE INDEX IF NOT EXISTS finanzas_aplicaciones_por_pedido ON public.pago_aplicaciones(pedido_id);

CREATE TABLE public.finanzas_eventos (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 pago_id uuid NOT NULL REFERENCES public.pagos(id) ON DELETE RESTRICT,
 actor_id uuid NOT NULL REFERENCES public.operadores(id) ON DELETE RESTRICT,
 accion text NOT NULL CHECK(accion IN ('registrado','anulado')),
 datos jsonb NOT NULL DEFAULT '{}'::jsonb CHECK(jsonb_typeof(datos)='object'),
 creado_en timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX finanzas_eventos_pago_fecha ON public.finanzas_eventos(pago_id,creado_en DESC);
ALTER TABLE public.finanzas_eventos ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.finanzas_eventos FROM anon,authenticated;
GRANT SELECT ON public.finanzas_eventos TO authenticated;
CREATE POLICY padre_finanzas_eventos_leer ON public.finanzas_eventos
 FOR SELECT TO authenticated USING ((SELECT private.tiene_permiso('dinero_leer')));

-- Ningún cliente web puede manipular directamente comprobantes ni aplicaciones.
REVOKE INSERT,UPDATE,DELETE ON public.pagos,public.pago_aplicaciones FROM anon,authenticated;
GRANT SELECT ON public.pagos,public.pago_aplicaciones TO authenticated;

CREATE OR REPLACE FUNCTION private.padre_finanzas_registrar(
 p_pedido_id uuid,p_operacion_id uuid,p_fecha date,p_moneda text,
 p_monto numeric,p_tipo_tasa text,p_tasa numeric,p_metodo text,
 p_referencia text,p_nota text
) RETURNS uuid
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=''
AS $$
DECLARE v_actor uuid; v_pedido public.pedidos%ROWTYPE; v_pagado numeric;
 v_usd numeric; v_pago uuid; v_repetido public.pagos%ROWTYPE;
BEGIN
 IF auth.uid() IS NULL OR NOT private.tiene_permiso('dinero_registrar') THEN
  RAISE EXCEPTION 'No autorizado para registrar pagos' USING ERRCODE='42501';
 END IF;
 SELECT id INTO v_actor FROM public.operadores WHERE auth_user_id=auth.uid() AND activo=true;
 IF v_actor IS NULL THEN RAISE EXCEPTION 'Operador no activo' USING ERRCODE='42501'; END IF;
 IF p_operacion_id IS NULL THEN RAISE EXCEPTION 'Identificador de operación requerido'; END IF;
 SELECT * INTO v_repetido FROM public.pagos WHERE operacion_id=p_operacion_id;
 IF FOUND THEN
   IF v_repetido.creado_por IS DISTINCT FROM v_actor THEN
      RAISE EXCEPTION 'Identificador de operación utilizado por otro operador' USING ERRCODE='42501';
   END IF;
   RETURN v_repetido.id;
 END IF;
 SELECT * INTO v_pedido FROM public.pedidos WHERE id=p_pedido_id FOR UPDATE;
 IF NOT FOUND OR v_pedido.origen_comanda_id IS NOT NULL OR NOT v_pedido.importe_conciliado
    OR v_pedido.estado='anulado' OR v_pedido.cliente_id IS NULL
    OR btrim(v_pedido.moneda_deuda::text)<>'USD' OR v_pedido.total_usd<=0 THEN
  RAISE EXCEPTION 'Solo se permiten cobros de pedidos nuevos de Padre con total USD válido';
 END IF;
 IF p_fecha IS NULL OR p_fecha>current_date+1 OR p_fecha<current_date-365 THEN
  RAISE EXCEPTION 'Fecha de pago fuera del intervalo permitido';
 END IF;
 IF p_monto IS NULL OR p_monto<=0 OR p_monto>99999999 OR round(p_monto,2)<>p_monto THEN
  RAISE EXCEPTION 'Monto inválido: utiliza dos decimales';
 END IF;
 IF p_metodo IS NULL OR length(btrim(p_metodo)) NOT BETWEEN 2 AND 80
    OR length(coalesce(p_referencia,''))>180 OR length(coalesce(p_nota,''))>1000 THEN
  RAISE EXCEPTION 'Método, referencia o nota inválidos';
 END IF;
 IF p_moneda='USD' THEN
   IF p_tipo_tasa IS NOT NULL OR p_tasa IS NOT NULL THEN
      RAISE EXCEPTION 'Un pago en USD no necesita tasa'; END IF;
   v_usd:=p_monto;
 ELSIF p_moneda='VES' THEN
   IF p_tipo_tasa NOT IN ('BCV','DIVISA') OR p_tasa IS NULL OR p_tasa<=0
     OR p_tasa>100000000 OR round(p_tasa,6)<>p_tasa THEN
      RAISE EXCEPTION 'Indica tasa BCV o DIVISA positiva en Bs por 1 USD';END IF;
   v_usd:=round(p_monto/p_tasa,2);
 ELSE
   RAISE EXCEPTION 'Moneda no admitida';
 END IF;
 IF v_usd<=0 THEN RAISE EXCEPTION 'El equivalente en dólares debe ser mayor a cero'; END IF;
 SELECT coalesce(sum(pa.monto_usd),0) INTO v_pagado
 FROM public.pago_aplicaciones pa JOIN public.pagos pg ON pg.id=pa.pago_id
 WHERE pa.pedido_id=v_pedido.id AND pg.estado='registrado';
 IF v_usd>v_pedido.total_usd-v_pagado THEN
   RAISE EXCEPTION 'El abono supera el saldo pendiente de este pedido';
 END IF;
 INSERT INTO public.pagos(cliente_id,fecha,moneda,monto_recibido,monto_usd,
 tipo_tasa,tasa_aplicada,metodo,referencia,nota,estado,creado_por,operacion_id)
 VALUES(v_pedido.cliente_id,p_fecha,p_moneda,p_monto,v_usd,p_tipo_tasa,p_tasa,
 btrim(p_metodo),nullif(btrim(p_referencia),''),nullif(btrim(p_nota),''),
 'registrado',v_actor,p_operacion_id)
 RETURNING id INTO v_pago;
 INSERT INTO public.pago_aplicaciones(pago_id,pedido_id,monto_usd)
 VALUES(v_pago,v_pedido.id,v_usd);
 INSERT INTO public.finanzas_eventos(pago_id,actor_id,accion,datos)
 VALUES(v_pago,v_actor,'registrado',jsonb_build_object(
 'pedido_id',v_pedido.id,'monto_usd',v_usd,'moneda',p_moneda,
 'monto_recibido',p_monto,'tipo_tasa',p_tipo_tasa,'tasa',p_tasa
 ));
 RETURN v_pago;
END $$;
REVOKE ALL ON FUNCTION private.padre_finanzas_registrar(uuid,uuid,date,text,numeric,text,numeric,text,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION private.padre_finanzas_registrar(uuid,uuid,date,text,numeric,text,numeric,text,text,text) TO authenticated;
CREATE OR REPLACE FUNCTION public.padre_finanzas_registrar(
 p_pedido_id uuid,p_operacion_id uuid,p_fecha date,p_moneda text,
 p_monto numeric,p_tipo_tasa text,p_tasa numeric,p_metodo text,
 p_referencia text,p_nota text
) RETURNS uuid LANGUAGE sql VOLATILE SECURITY INVOKER SET search_path=''
AS $$ SELECT private.padre_finanzas_registrar(p_pedido_id,p_operacion_id,p_fecha,p_moneda,
 p_monto,p_tipo_tasa,p_tasa,p_metodo,p_referencia,p_nota); $$;
REVOKE ALL ON FUNCTION public.padre_finanzas_registrar(uuid,uuid,date,text,numeric,text,numeric,text,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.padre_finanzas_registrar(uuid,uuid,date,text,numeric,text,numeric,text,text,text) TO authenticated;

CREATE OR REPLACE FUNCTION private.padre_finanzas_anular(p_pago_id uuid,p_motivo text)
RETURNS boolean LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=''
AS $$
DECLARE v_actor uuid; v_pedido uuid; v_pago public.pagos%ROWTYPE;
 v_historico boolean;
BEGIN
 IF auth.uid() IS NULL OR NOT private.tiene_permiso('dinero_anular') THEN
  RAISE EXCEPTION 'No tienes permiso de anulación' USING ERRCODE='42501';
 END IF;
 SELECT id INTO v_actor FROM public.operadores WHERE auth_user_id=auth.uid() AND activo=true;
 IF v_actor IS NULL THEN RAISE EXCEPTION 'Operador no activo' USING ERRCODE='42501'; END IF;
 IF p_motivo IS NULL OR length(btrim(p_motivo)) NOT BETWEEN 10 AND 600 THEN
  RAISE EXCEPTION 'Indica el motivo de anulación (mínimo 10 caracteres)';
 END IF;
 SELECT pedido_id INTO v_pedido FROM public.pago_aplicaciones
 WHERE pago_id=p_pago_id LIMIT 1;
 IF v_pedido IS NULL THEN RAISE EXCEPTION 'El pago no tiene pedido asociado';END IF;
 SELECT origen_comanda_id IS NOT NULL INTO v_historico
 FROM public.pedidos WHERE id=v_pedido FOR UPDATE;
 IF NOT FOUND OR v_historico THEN RAISE EXCEPTION 'No se puede anular un histórico importado';END IF;
 SELECT * INTO v_pago FROM public.pagos WHERE id=p_pago_id FOR UPDATE;
 IF NOT FOUND OR v_pago.estado<>'registrado' THEN
   RAISE EXCEPTION 'Pago inexistente o anulado previamente';END IF;
 UPDATE public.pagos SET estado='anulado',anulado_en=now(),
 anulado_por=v_actor,motivo_anulacion=btrim(p_motivo) WHERE id=v_pago.id;
 INSERT INTO public.finanzas_eventos(pago_id,actor_id,accion,datos)
 VALUES(v_pago.id,v_actor,'anulado',jsonb_build_object('motivo',btrim(p_motivo),'monto_usd',v_pago.monto_usd));
 RETURN true;
END $$;
REVOKE ALL ON FUNCTION private.padre_finanzas_anular(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION private.padre_finanzas_anular(uuid,text) TO authenticated;
CREATE OR REPLACE FUNCTION public.padre_finanzas_anular(p_pago_id uuid,p_motivo text)
RETURNS boolean LANGUAGE sql VOLATILE SECURITY INVOKER SET search_path=''
AS $$ SELECT private.padre_finanzas_anular(p_pago_id,p_motivo); $$;
REVOKE ALL ON FUNCTION public.padre_finanzas_anular(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.padre_finanzas_anular(uuid,text) TO authenticated;

CREATE OR REPLACE FUNCTION private.padre_finanzas_resumen()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
AS $$
 SELECT CASE WHEN auth.uid() IS NULL OR NOT private.tiene_permiso('dinero_leer') THEN
  NULL::jsonb ELSE
  jsonb_build_object(
   'pedidos_historicos',(SELECT count(*) FROM public.pedidos WHERE origen_comanda_id IS NOT NULL),
   'historicos_sin_conciliar',(SELECT count(*) FROM public.pedidos WHERE origen_comanda_id IS NOT NULL AND NOT importe_conciliado),
   'historicos_sin_cliente',(SELECT count(*) FROM public.pedidos WHERE origen_comanda_id IS NOT NULL AND cliente_id IS NULL),
   'clientes_historicos',(SELECT count(*) FROM public.clientes WHERE origen_comanda_id IS NOT NULL),
   'nuevos_pedidos',(SELECT count(*) FROM public.pedidos WHERE origen_comanda_id IS NULL AND estado<>'anulado'),
   'nuevos_pedidos_usd',(SELECT coalesce(sum(total_usd),0) FROM public.pedidos WHERE origen_comanda_id IS NULL AND estado<>'anulado' AND moneda_deuda='USD'),
   'cobros_usd',(SELECT coalesce(sum(monto_usd),0) FROM public.pagos WHERE estado='registrado'),
   'cobros_registrados',(SELECT count(*) FROM public.pagos WHERE estado='registrado'),
   'cobros_anulados',(SELECT count(*) FROM public.pagos WHERE estado='anulado'),
   'compras_estimadas_usd',(SELECT coalesce(sum(total_usd),0) FROM public.compras WHERE estado<>'anulada'),
   'compras_registradas',(SELECT count(*) FROM public.compras)
  ) END;
$$;
REVOKE ALL ON FUNCTION private.padre_finanzas_resumen() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION private.padre_finanzas_resumen() TO authenticated;
CREATE OR REPLACE FUNCTION public.padre_finanzas_resumen() RETURNS jsonb
LANGUAGE sql STABLE SECURITY INVOKER SET search_path=''
AS $$ SELECT private.padre_finanzas_resumen(); $$;
REVOKE ALL ON FUNCTION public.padre_finanzas_resumen() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.padre_finanzas_resumen() TO authenticated;

CREATE OR REPLACE FUNCTION private.padre_finanzas_pedidos_abiertos()
RETURNS TABLE(id uuid,numero bigint,cliente text,descripcion text,total_usd numeric,
abonado_usd numeric,saldo_usd numeric)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=''
AS $$
BEGIN
 IF auth.uid() IS NULL OR NOT private.tiene_permiso('dinero_leer') THEN
  RAISE EXCEPTION 'No autorizado' USING ERRCODE='42501'; END IF;
 RETURN QUERY
 SELECT q.id,q.numero,c.nombre,q.descripcion,q.total_usd,
 coalesce(sum(pa.monto_usd) FILTER (WHERE pg.estado='registrado'),0) abonado_usd,
 q.total_usd-coalesce(sum(pa.monto_usd) FILTER (WHERE pg.estado='registrado'),0) saldo_usd
 FROM public.pedidos q JOIN public.clientes c ON c.id=q.cliente_id
 LEFT JOIN public.pago_aplicaciones pa ON pa.pedido_id=q.id
 LEFT JOIN public.pagos pg ON pg.id=pa.pago_id
 WHERE q.origen_comanda_id IS NULL AND q.importe_conciliado=true
   AND q.estado<>'anulado' AND q.total_usd>0 AND q.moneda_deuda='USD'
 GROUP BY q.id,q.numero,c.nombre,q.descripcion,q.total_usd
 HAVING q.total_usd>coalesce(sum(pa.monto_usd) FILTER (WHERE pg.estado='registrado'),0)
 ORDER BY q.numero DESC LIMIT 500;
END $$;
REVOKE ALL ON FUNCTION private.padre_finanzas_pedidos_abiertos() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION private.padre_finanzas_pedidos_abiertos() TO authenticated;
CREATE OR REPLACE FUNCTION public.padre_finanzas_pedidos_abiertos()
RETURNS TABLE(id uuid,numero bigint,cliente text,descripcion text,total_usd numeric,
abonado_usd numeric,saldo_usd numeric)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path=''
AS $$ SELECT * FROM private.padre_finanzas_pedidos_abiertos(); $$;
REVOKE ALL ON FUNCTION public.padre_finanzas_pedidos_abiertos() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.padre_finanzas_pedidos_abiertos() TO authenticated;

CREATE OR REPLACE FUNCTION private.padre_finanzas_movimientos()
RETURNS TABLE(id uuid,fecha date,cliente text,pedido_numero bigint,moneda text,
 monto_recibido numeric,monto_usd numeric,tipo_tasa text,tasa_aplicada numeric,
 metodo text,referencia text,estado text,creado_en timestamptz,motivo_anulacion text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=''
AS $$
BEGIN
 IF auth.uid() IS NULL OR NOT private.tiene_permiso('dinero_leer') THEN
  RAISE EXCEPTION 'No autorizado' USING ERRCODE='42501'; END IF;
 RETURN QUERY SELECT p.id,p.fecha,c.nombre,q.numero,btrim(p.moneda::text),
 p.monto_recibido,p.monto_usd,p.tipo_tasa,p.tasa_aplicada,p.metodo,
 p.referencia,p.estado,p.creado_en,p.motivo_anulacion
 FROM public.pagos p JOIN public.clientes c ON c.id=p.cliente_id
 LEFT JOIN public.pago_aplicaciones a ON a.pago_id=p.id
 LEFT JOIN public.pedidos q ON q.id=a.pedido_id
 ORDER BY p.creado_en DESC LIMIT 200;
END $$;
REVOKE ALL ON FUNCTION private.padre_finanzas_movimientos() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION private.padre_finanzas_movimientos() TO authenticated;
CREATE OR REPLACE FUNCTION public.padre_finanzas_movimientos()
RETURNS TABLE(id uuid,fecha date,cliente text,pedido_numero bigint,moneda text,
 monto_recibido numeric,monto_usd numeric,tipo_tasa text,tasa_aplicada numeric,
 metodo text,referencia text,estado text,creado_en timestamptz,motivo_anulacion text)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path=''
AS $$ SELECT * FROM private.padre_finanzas_movimientos(); $$;
REVOKE ALL ON FUNCTION public.padre_finanzas_movimientos() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.padre_finanzas_movimientos() TO authenticated;
