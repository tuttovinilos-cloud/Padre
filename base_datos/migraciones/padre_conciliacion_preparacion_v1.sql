-- Padre únicamente: cola de revisión documental de pedidos históricos.
-- No inserta pagos ni cambia importes, deudas o el flag importe_conciliado.
CREATE TABLE public.conciliacion_revisiones (
 pedido_id uuid PRIMARY KEY REFERENCES public.pedidos(id) ON DELETE RESTRICT,
 estado text NOT NULL DEFAULT 'en_revision'
  CHECK(estado IN ('en_revision','requiere_soporte','documentacion_recibida')),
 observaciones text,
 actualizado_por uuid NOT NULL REFERENCES public.operadores(id) ON DELETE RESTRICT,
 actualizado_en timestamptz NOT NULL DEFAULT now(),
 creado_en timestamptz NOT NULL DEFAULT now(),
 CHECK(observaciones IS NULL OR length(observaciones) <= 1000)
);
CREATE TABLE public.conciliacion_eventos (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 pedido_id uuid NOT NULL REFERENCES public.pedidos(id) ON DELETE RESTRICT,
 operador_id uuid NOT NULL REFERENCES public.operadores(id) ON DELETE RESTRICT,
 estado_anterior text,
 estado_nuevo text NOT NULL,
 observaciones text,
 creado_en timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX conciliacion_eventos_pedido_fecha ON public.conciliacion_eventos(pedido_id,creado_en DESC);
ALTER TABLE public.conciliacion_revisiones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conciliacion_eventos ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.conciliacion_revisiones,public.conciliacion_eventos FROM anon,authenticated;
GRANT SELECT ON public.conciliacion_revisiones,public.conciliacion_eventos TO authenticated;
CREATE POLICY padre_conciliacion_revisiones_leer ON public.conciliacion_revisiones
FOR SELECT TO authenticated USING ((SELECT private.tiene_permiso('dinero_leer')));
CREATE POLICY padre_conciliacion_eventos_leer ON public.conciliacion_eventos
FOR SELECT TO authenticated USING ((SELECT private.tiene_permiso('dinero_leer')));

CREATE FUNCTION private.padre_conciliacion_resumen()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=''
AS $$
DECLARE r jsonb;
BEGIN
 IF auth.uid() IS NULL OR NOT private.tiene_permiso('dinero_leer') THEN
  RAISE EXCEPTION 'No autorizado para conciliación' USING ERRCODE='42501';
 END IF;
 SELECT jsonb_build_object(
  'total_historicos',count(*),
  'sin_revisar',count(*) FILTER(WHERE c.pedido_id IS NULL),
  'en_revision',count(*) FILTER(WHERE c.estado='en_revision'),
  'requiere_soporte',count(*) FILTER(WHERE c.estado='requiere_soporte'),
  'documentacion_recibida',count(*) FILTER(WHERE c.estado='documentacion_recibida'),
  'sin_cliente',count(*) FILTER(WHERE p.cliente_id IS NULL),
  'no_conciliados',count(*) FILTER(WHERE p.importe_conciliado=false)
 ) INTO r
 FROM public.pedidos p LEFT JOIN public.conciliacion_revisiones c ON c.pedido_id=p.id
 WHERE p.origen_comanda_id IS NOT NULL;
 RETURN r;
END $$;
REVOKE ALL ON FUNCTION private.padre_conciliacion_resumen() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION private.padre_conciliacion_resumen() TO authenticated;
CREATE FUNCTION public.padre_conciliacion_resumen()
RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path=''
AS $$ SELECT private.padre_conciliacion_resumen(); $$;
REVOKE ALL ON FUNCTION public.padre_conciliacion_resumen() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.padre_conciliacion_resumen() TO authenticated;

CREATE FUNCTION private.padre_conciliacion_listar(
 p_pagina integer DEFAULT 0,
 p_estado text DEFAULT 'todos',
 p_busqueda text DEFAULT ''
) RETURNS TABLE(
 pedido_id uuid,numero_origen bigint,cliente text,descripcion text,
 moneda_original text,precio_original numeric,
 estado_pago_original text,estado_revision text,observaciones text,
 fecha_pedido date,total_encontrados bigint
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=''
AS $$
BEGIN
 IF auth.uid() IS NULL OR NOT private.tiene_permiso('dinero_leer') THEN
  RAISE EXCEPTION 'No autorizado' USING ERRCODE='42501';END IF;
 IF p_pagina IS NULL OR p_pagina<0 OR p_pagina>10000 OR p_busqueda IS NULL
  OR length(p_busqueda)>100 OR p_estado NOT IN
  ('todos','sin_revisar','en_revision','requiere_soporte','documentacion_recibida') THEN
  RAISE EXCEPTION 'Filtro de conciliación inválido';
 END IF;
 RETURN QUERY
 SELECT p.id,p.origen_comanda_id,
  coalesce(cl.nombre,p.cliente_nombre_origen,'Cliente no vinculado'),
  p.descripcion,p.moneda_origen,p.precio_total_origen,
  p.estatus_pago_origen,coalesce(c.estado,'sin_revisar'),c.observaciones,
  p.fecha,count(*) over()
 FROM public.pedidos p
 LEFT JOIN public.clientes cl ON cl.id=p.cliente_id
 LEFT JOIN public.conciliacion_revisiones c ON c.pedido_id=p.id
 WHERE p.origen_comanda_id IS NOT NULL
 AND (p_estado='todos' OR coalesce(c.estado,'sin_revisar')=p_estado)
 AND (btrim(p_busqueda)=''
    OR p.origen_comanda_id::text=p_busqueda
    OR coalesce(cl.nombre,p.cliente_nombre_origen,'') ILIKE '%'||btrim(p_busqueda)||'%'
    OR p.descripcion ILIKE '%'||btrim(p_busqueda)||'%')
 ORDER BY p.fecha DESC NULLS LAST,p.origen_comanda_id DESC
 LIMIT 30 OFFSET (p_pagina*30);
END $$;
REVOKE ALL ON FUNCTION private.padre_conciliacion_listar(integer,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION private.padre_conciliacion_listar(integer,text,text) TO authenticated;
CREATE FUNCTION public.padre_conciliacion_listar(
 p_pagina integer DEFAULT 0,p_estado text DEFAULT 'todos',p_busqueda text DEFAULT ''
) RETURNS TABLE(
 pedido_id uuid,numero_origen bigint,cliente text,descripcion text,
 moneda_original text,precio_original numeric,
 estado_pago_original text,estado_revision text,observaciones text,
 fecha_pedido date,total_encontrados bigint
)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path=''
AS $$ SELECT * FROM private.padre_conciliacion_listar(p_pagina,p_estado,p_busqueda); $$;
REVOKE ALL ON FUNCTION public.padre_conciliacion_listar(integer,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.padre_conciliacion_listar(integer,text,text) TO authenticated;

CREATE FUNCTION private.padre_conciliacion_guardar_revision(
 p_pedido_id uuid,p_estado text,p_observaciones text
) RETURNS boolean LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=''
AS $$
DECLARE actor uuid; previous text;
BEGIN
 IF auth.uid() IS NULL OR NOT private.padre_es_administrador() THEN
  RAISE EXCEPTION 'Solo el administrador puede guardar revisiones' USING ERRCODE='42501';
 END IF;
 SELECT id INTO actor FROM public.operadores WHERE activo AND auth_user_id=auth.uid();
 IF actor IS NULL THEN RAISE EXCEPTION 'Operador no activo' USING ERRCODE='42501';END IF;
 IF p_estado NOT IN ('en_revision','requiere_soporte','documentacion_recibida')
 OR length(coalesce(p_observaciones,''))>1000 THEN RAISE EXCEPTION 'Datos de revisión inválidos';END IF;
 IF NOT EXISTS(SELECT 1 FROM public.pedidos
 WHERE id=p_pedido_id AND origen_comanda_id IS NOT NULL
  AND importe_conciliado IS FALSE) THEN
  RAISE EXCEPTION 'Solo pueden revisarse pedidos históricos sin conciliar';
 END IF;
 SELECT estado INTO previous FROM public.conciliacion_revisiones
 WHERE pedido_id=p_pedido_id FOR UPDATE;
 INSERT INTO public.conciliacion_revisiones
 (pedido_id,estado,observaciones,actualizado_por)
 VALUES(p_pedido_id,p_estado,nullif(btrim(p_observaciones),''),actor)
 ON CONFLICT(pedido_id) DO UPDATE SET estado=excluded.estado,
 observaciones=excluded.observaciones,actualizado_por=excluded.actualizado_por,
 actualizado_en=now();
 INSERT INTO public.conciliacion_eventos
 (pedido_id,operador_id,estado_anterior,estado_nuevo,observaciones)
 VALUES(p_pedido_id,actor,coalesce(previous,'sin_revisar'),p_estado,
 nullif(btrim(p_observaciones),''));
 RETURN true;
END $$;
REVOKE ALL ON FUNCTION private.padre_conciliacion_guardar_revision(uuid,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION private.padre_conciliacion_guardar_revision(uuid,text,text) TO authenticated;
CREATE FUNCTION public.padre_conciliacion_guardar_revision(
 p_pedido_id uuid,p_estado text,p_observaciones text
) RETURNS boolean LANGUAGE sql VOLATILE SECURITY INVOKER SET search_path=''
AS $$ SELECT private.padre_conciliacion_guardar_revision(p_pedido_id,p_estado,p_observaciones); $$;
REVOKE ALL ON FUNCTION public.padre_conciliacion_guardar_revision(uuid,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.padre_conciliacion_guardar_revision(uuid,text,text) TO authenticated;

COMMENT ON TABLE public.conciliacion_revisiones IS
 'Estados documentales de revisión histórica. NO afectan saldo ni habilitan cobro/conciliación financiera.';
COMMENT ON FUNCTION public.padre_conciliacion_guardar_revision(uuid,text,text) IS
 'Administración documental sin cambios al dinero ni a importe_conciliado.';
