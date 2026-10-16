-- Padre: fortalecer idempotencia de recibos financieros
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
   IF v_repetido.creado_por IS DISTINCT FROM v_actor
      OR v_repetido.fecha IS DISTINCT FROM p_fecha
      OR btrim(v_repetido.moneda::text) IS DISTINCT FROM p_moneda
      OR v_repetido.monto_recibido IS DISTINCT FROM p_monto
      OR v_repetido.tipo_tasa IS DISTINCT FROM p_tipo_tasa
      OR v_repetido.tasa_aplicada IS DISTINCT FROM p_tasa
      OR v_repetido.metodo IS DISTINCT FROM btrim(p_metodo)
      OR v_repetido.referencia IS DISTINCT FROM nullif(btrim(p_referencia),'')
      OR v_repetido.nota IS DISTINCT FROM nullif(btrim(p_nota),'')
      OR NOT EXISTS(
       SELECT 1 FROM public.pago_aplicaciones pa
       WHERE pa.pago_id=v_repetido.id AND pa.pedido_id=p_pedido_id
      )
   THEN RAISE EXCEPTION 'Conflicto de identificador: esta operación ya corresponde a otro pago'
     USING ERRCODE='23505';END IF;
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
