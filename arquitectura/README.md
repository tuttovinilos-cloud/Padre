# Arquitectura de Comanda Padre · Mapa Maestro

La interfaz oficial está en [`../docs/index.html`](../docs/index.html), con la versión instalable de la aplicación. `arquitectura/index.html` es solo una redirección de compatibilidad.

## Objetivo
Reorganizar Comanda por responsabilidades compartidas (pilares) y construir un nuevo sistema en Padre sin modificar Comanda ni su Supabase productivo.

## Los 13 pilares
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

## Reglas permanentes
- Repositorio `Comanda`: no modificar.
- Supabase `comanda-tuttovinilos`: inspección **solo lectura**.
- Repositorio `Padre`: puede evolucionar como nuevo sistema independiente.
- Futuro Supabase Padre: separado a nivel de proyecto y con datos de prueba.
- Antes de conectar servicios con escritura, verificar autenticación, permisos, políticas, auditoría, reconciliación y aislamiento.
- No copiar datos ni secretos reales al repositorio público.

## Estado
La rama principal de Padre quedó depurada de páginas y scripts antiguos. Los archivos heredados persisten únicamente en la historia Git para recuperación. La PWA es un prototipo de interfaz; no tiene login real, transacciones, datos en vivo ni notificaciones push habilitadas.

## Fases de desarrollo
1. Entorno backend independiente y aislamiento.
2. Pilar Seguridad.
3. Pilar Clientes.
4. Pilar Dinero.
5. Pedidos, Cotizaciones, Materiales, Producción, Compras, Precios.
6. Comunicación, Estadísticas, Configuración, Marketing y gestión comercial.
7. Pruebas integrales y propuesta de migración independiente.
