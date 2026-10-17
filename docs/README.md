# Aplicación Padre — documentación técnica

Esta carpeta `docs/` contiene la aplicación web. GitHub Pages publica **desde la raíz del repositorio (`main /`)**; por eso la ruta real es `/Padre/docs/`. Las redirecciones en `/modulos/` mantienen los enlaces anteriores.

## Revisión documental de históricos

El submódulo `modulos/conciliacion.html` lista los pedidos importados con búsqueda, filtros, paginación y anotaciones de revisión.

Se añadieron funciones autorizadas para consultar y auditar las revisiones. La revisión documental no cambia estados financieros, montos ni deudas. Con los cuatro CSV proporcionados por el usuario el 17 de octubre de 2026 se cargaron **562 de 562 referencias** en la tabla privada: 371 pagos de pedidos, 184 de clientes, 5 de producción y 2 de contabilidad. **512 son nuevas y 50 se conservaron sin duplicar**. Los CSV contienen 20 registros con estado ANULADO en total. Las referencias no equivalen necesariamente a pagos únicos, por relaciones entre fuentes. No se generaron cobros contables ni se recalcularon saldos. Este control es del corte del CSV, NO una sincronización automática.

Esta etapa no sustituye una conciliación monetaria ni implica que los pedidos estén pagados.

## Contabilidad: primera etapa operativa

El módulo `modulos/dinero.html` carga `modulos/dinero.js` y `finanzas.css`.

- Resumen de pedidos nuevos, cobros y compras; consulta de saldos de pedidos nuevos en USD.
- Registro transaccional de abonos en USD o bolívares, con tasa BCV/DIVISA indicada y comprobación del saldo.
- Anulación auditada con permiso `dinero_anular` y motivo obligatorio; los registros no se borran.
- SQL versionado en `base_datos/migraciones/`, funciones privilegiadas protegidas en Supabase Padre.
- Los 1.386 pedidos históricos no son deudas reconocidas ni admiten cobros hasta conciliar sus pagos originales.
- Aún no se ha probado la interfaz en una sesión de navegador con un operador real. Quedan pendientes cierres, saldos a favor, conciliación de históricos y proyectos.

## PIN temporal y cambio obligatorio (octubre 2026)

- El panel de Seguridad permite **solo a Roberto** configurar `0000` a un empleado activo (o activar los que todavía no tengan PIN), con confirmación explícita en la web. **Roberto conserva su clave personal**.
- El PIN temporal caduca en 24 horas. Los operadores deben ingresar y cambiarlo en `cambiar-pin.html` antes de acceder a los módulos. Los datos operativos quedan protegidos mediante verificaciones en el servidor y políticas restrictivas.
- Cada empleado únicamente puede cambiar **su propio PIN**, introduciendo el anterior y un nuevo PIN distinto. No se permite visualizar los hashes ni las claves de otros. Una vez actualizado, debe iniciar sesión de nuevo.
- La creación de PIN y el cambio personal quedan registrados en la auditoría, sin incluir las claves. El servidor comprueba el rol y la identidad de Roberto para el restablecimiento.
- **Advertencia de seguridad:** usar el mismo PIN provisional para varios empleados facilita la suplantación antes de su cambio. Activar los accesos solo cuando las personas estén listas para cambiarlos inmediatamente; una opción más segura para producción es asignar claves iniciales únicas.
- El inicio de sesión de los demás operadores **no está confirmado aún por pruebas con sesiones reales**; se mantiene el módulo en estado parcial hasta completar esas validaciones.

## Seguridad y jerarquías (primer módulo operativo)

- `modulos/seguridad.html`, `modulos/seguridad.js`, `seguridad.css`: consulta de operadores, búsqueda, roles, matriz de 31 permisos por áreas, estado activo/inactivo y historial de decisiones.
- Solo un **administrador activo** puede guardar perfiles. El servidor verifica el rol de administrador mediante `private.padre_es_administrador()`; no basta con ocultar botones.
- El procedimiento transaccional `public.padre_seguridad_guardar_perfil` delega en `private.padre_guardar_perfil_operador`. Los permisos individuales de cada empleado se mantienen separados en un rol `perfil_<uuid>`, evitando modificar a otros usuarios.
- No está permitido modificar desde este panel al propio administrador ni a otros administradores. `seguridad_gestionar` está reservado para administradores.
- Revocadas las modificaciones directas en `operadores`, `operadores_roles`, `roles`, `roles_permisos` y `permisos` a los clientes autenticados. Las acciones del panel quedan registradas en `seguridad_eventos`.
- **Importante:** este panel **no asigna PIN ni activa cuentas de Supabase Auth**. Los operadores que no tienen acceso vinculado aparecen como tales. El primer módulo de Contabilidad ahora exige `dinero_anular` desde el servidor para anular; las futuras operaciones deberán aplicar la misma seguridad.
- Validar manualmente con Roberto en el navegador y ejecutar pruebas de roles antes de considerar terminada toda el área de Seguridad.

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

La base Padre contiene **454 clientes, 1.386 pedidos y 10 relaciones de contactos** importados desde Comanda. Los conjuntos de identificadores originales coinciden y las fichas originales se guardan como JSONB en la base Padre. **Se guardaron 562 referencias documentales en tabla privada, pero ningún pago histórico se incorporó al libro financiero `public.pagos`**; los históricos son de solo lectura hasta conciliar. Cinco pedidos no tienen cliente vinculado en el origen. Véase `../base_datos/README.md`.

## Control de calidad

Desde la raíz del repositorio ejecutar:

```bash
node tests/verificar-padre.mjs
```

GitHub Actions ejecuta el mismo verificador en cada cambio a `main` y en pull requests. La verificación estática **no sustituye** la prueba real de autenticación, formularios, políticas RLS, dispositivos o finanzas.

## Publicación

La configuración comprobada de GitHub Pages es `main /` (raíz), no `main /docs`. Después del despliegue, puede hacer falta recargar la PWA para actualizar sus recursos estáticos. No publicar información privada en HTML, JS ni JSON.
