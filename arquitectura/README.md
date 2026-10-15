# Padre · Mapa Maestro de Comanda

## Propósito
Este repositorio se utilizará para diseñar la evolución modular de Comanda. La página inicial del nuevo trabajo es `arquitectura/index.html`.

## Reglas de seguridad del proyecto
- La base de datos actual de Comanda es producción. No se harán escrituras, migraciones, modificaciones de tablas, políticas ni cambios de datos como parte de este diseño.
- `arquitectura/index.html` es independiente: no importa los scripts antiguos de Padre ni utiliza credenciales o conexiones de Supabase.
- Las páginas antiguas de Padre conservan código heredado y algunas usan el proyecto Supabase de Comanda. No utilizarlas para pruebas de escritura.
- La arquitectura futura separará una capa de interfaz, pilares de dominio, servicios seguros y persistencia.
- Toda futura función que modifique datos necesitará un entorno Supabase de desarrollo separado, datos de prueba, autorización en el servidor y una validación explícita antes de conectarse a producción.
- No trasladar contraseñas, identificadores personales, información de clientes ni secretos a archivos públicos de GitHub.

## Pilares iniciales
1. Seguridad
2. Clientes
3. Dinero
4. Pedidos
5. Materiales
6. Cotizaciones
7. Producción
8. Compras
9. Precios
10. Comunicación
11. Estadísticas
12. Configuración
13. Marketing y Gestión Comercial

## Inventario y avance
- **V1:** Mapa visual interactivo autónomo, sin conexión a Supabase.
- **Siguiente:** Precisar dueños de datos, operaciones e interacciones entre pilares.
- **Después:** Crear módulos funcionales en un entorno separado, sin afectar Comanda.

## Aclaración
Los nombres de tablas y páginas del mapa son referencias de inventario tomadas de una revisión de Comanda. No significan que Padre tenga una conexión activa, acceso autorizado ni un backend de desarrollo implementado.