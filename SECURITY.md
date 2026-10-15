# Seguridad — Padre

**Padre** es un nuevo desarrollo separado del entorno productivo de **Comanda**.

- **Repositorio Comanda:** no escribir, no eliminar, no desplegar cambios durante el trabajo en Padre.
- **Supabase Comanda:** cualquier consulta permitida debe ser solo lectura. Nunca ejecutar migraciones o escrituras.
- **Supabase Padre:** proyecto de desarrollo separado. No insertar copias de secretos productivos.
- **GitHub Padre:** contiene páginas y código público, NO registros reales de clientes, pedidos, pagos ni claves privadas.
- Las copias históricas residen únicamente en las tablas protegidas de **Supabase Padre**; no deben convertirse en ficheros JSON/CSV dentro del repositorio público.
- El frontend solo puede usar una clave **publishable**, no `service_role` o `sb_secret_`.
- Los accesos por PIN corto exigen límites de intentos, controles adicionales según riesgo y revisión de seguridad antes de producción. Nunca escribir un PIN en código Git.
- Los pedidos importados no son saldos conciliados ni autorizan cobros; no procesar pagos sobre ellos sin revisión financiera.
- Los archivos binarios externos referenciados por pedidos todavía deben verificarse por separado.
- Todas las tablas expuestas deben tener RLS y permisos específicos.

## Validación de modificaciones

`node tests/verificar-padre.mjs` debe aprobar antes de publicar. Las pruebas estáticas no reemplazan pruebas reales de autorización, sesión, operaciones financieras y seguridad del backend.

Para reportar un problema de seguridad, no abrir un issue público con credenciales, datos personales o PIN. Contactar privadamente al responsable del proyecto.
