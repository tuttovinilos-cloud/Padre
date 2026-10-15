# Padre · PWA (versión inicial)

Esta carpeta es la única raíz de publicación permitida para la nueva aplicación Padre mediante GitHub Pages (`main` / `docs`). No publicar la raíz del repositorio: contiene páginas históricas conectadas a la base de datos productiva de Comanda.

## Configuración de publicación
1. Abrir `https://github.com/tuttovinilos-cloud/Padre/settings/pages`.
2. Source: **Deploy from a branch**.
3. Branch: **main**. Folder: **/docs**.
4. Guardar y esperar que GitHub Pages publique `https://tuttovinilos-cloud.github.io/Padre/`.

## Alcance implementado
- Vista adaptativa escritorio/móvil y navegación inferior para móvil.
- Manifiesto instalable y PNG de aplicación para Android, iPhone y otros dispositivos compatibles.
- Service worker que guarda **únicamente los recursos estáticos** del mapa visual y permite consultarlo sin conexión después de abrirlo online.
- Diálogo de instalación con instrucciones según plataforma.
- Listener básico para recibir notificaciones push. **No hay backend de envíos ni suscripción push**; las notificaciones reales aún **NO** funcionan.
- La versión actual es **arquitectura visual**, no el sistema de clientes y pagos listo para producción.

## Limitaciones y seguridad
- No se conectó Supabase ni se instalaron credenciales en la PWA.
- No se ha creado un nuevo proyecto Supabase; es un paso separado que requiere organización y confirmación del posible costo.
- La app no consulta, muestra ni modifica registros reales de Comanda.
- La notificación push requiere posteriormente permisos del usuario, un backend propio de Padre y un mecanismo seguro de suscripción autenticada.
- Si se incorporan datos reales, revisar estrictamente la estrategia del service worker para evitar cachear información privada.
- Antes de instalar, comprobar que GitHub Pages publica desde `/docs` y no desde `/(root)`.
