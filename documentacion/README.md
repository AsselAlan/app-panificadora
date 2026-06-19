# Documentación del Proyecto - Panificadora v0.1

Esta carpeta contiene la documentación técnica y arquitectónica del sistema de Panificadora.

## Estado Actual (v0.1 MVP Completado)

El Producto Mínimo Viable (MVP) v0.1 ha sido desarrollado, testeado y desplegado exitosamente.

### Hitos Logrados:
1. **Despliegue Automatizado en Netlify**: 
   - Conexión configurada con GitHub.
   - Archivo `netlify.toml` añadido para asegurar el enrutamiento correcto de la SPA (React/Vite) y evitar errores 404.
   - PWA instalable configurada y funcional (requiere actualización de íconos base).

2. **Rediseño UI Premium**:
   - Se aplicó un diseño moderno, espacioso y con bordes redondeados (`rounded-2xl`, `rounded-3xl`) tanto en el panel de **Administración** (`AdminApp.tsx`) como en la aplicación del **Repartidor** (`DriverApp.tsx`).
   - Se reemplazaron alertas genéricas por notificaciones pulidas usando SweetAlert2.
   - Se mejoró la jerarquía visual con colores de estado (rojo para deuda, verde para favor).

3. **Gestión de Base de Datos (Supabase)**:
   - Esquema inicial creado y activo en producción (`schema.sql`).
   - Función RPC transaccional `process_offline_sale` funcionando para procesar sincronizaciones offline-first y evitar ventas duplicadas.
   - **Ajuste temporal de RLS (Row Level Security)**: Dado que la v0.1 no cuenta con un sistema de login y roles estricto, se relajaron las políticas en la tabla `expense_categories` y otras tablas operativas para permitir operaciones "Anónimas" (públicas) temporales.

4. **Gestión de Gastos y Categorías de Repartidores**:
   - Implementado el creador dinámico de categorías de gastos en el panel de Administración, dividiendo el flujo en gastos de Administración Central y gastos de Repartidores (choferes).
   - Los choferes en ruta ahora pueden seleccionar de manera dinámica las categorías creadas por la administración al registrar un gasto en calle.
   - Opción para eliminar categorías (tanto centrales como de repartidores) y visualizarlas en lista, respetando los datos históricos mediante almacenamiento de texto en las transacciones.

5. **Gestión de Productos**:
   - Agregada funcionalidad para pausar/reanudar productos (ocultándolos en las camionetas de los repartidores).
   - Implementado el borrado lógico (`is_deleted = true`) para no romper historiales de transacciones.
   - Añadida edición completa de productos (nombre, unidad, precios A y B).
   - Creado un modal de vista rápida que calcula dinámicamente el historial de cantidades vendidas y la recaudación total de cada producto consultando la base de datos.

6. **Optimización del Flujo y Hoja de Ruta en App Móvil**:
   - Simplificación del inicio de recorrido: se eliminó el paso intermedio obligatorio de "Verificar Carga", permitiendo iniciar el recorrido directamente. El stock en la furgoneta (`loads`) se inicializa automáticamente al iniciar.
   - Nueva sección interactiva **"Ver Hoja de Ruta"**: muestra un timeline visual premium con la secuencia exacta de visitas a clientes y paradas de carga en ruta (incluyendo el detalle de la mercadería). Permite iniciar ventas directamente desde las paradas del timeline.
   - **Desplegable de Pedido por Cliente**: Se integró una flecha hacia abajo en cada cliente del timeline para desplegar de manera interactiva la mercadería planificada a entregar (pedido fijo).
   - **Historial de Navegación Inteligente**: Configurado el control de regreso al salir de la Terminal de Ventas; ahora el chofer retorna dinámicamente a "Ver Hoja de Ruta" o "Seleccionar Cliente" según de qué pantalla haya venido.
   - Nueva sección **"Seleccionar Cliente"**: listado completo de clientes asignados a la ruta del día con buscador y saldos para acceso rápido.

7. **Arquitectura de Enrutamiento Dinámico (V1.0)**:
   - Incorporación de `react-router-dom` para gestionar toda la navegación de la aplicación (Login, Choferes y Administración).
   - La navegación es ahora del lado del cliente sin recargas de página, lo que activa el funcionamiento nativo de los botones e historial "Atrás/Adelante" del navegador web o gestos de retroceso en móviles.
   - Parámetros de URL dinámicos en cobros (ej: `/driver/terminal/:clientId`) y subrutas para todas las pestañas de administración.

8. **Pantalla de Resumen de Caja y Tickets del Día (Repartidor)**:
   - Se transformó el antiguo SweetAlert estático de caja en una pantalla de ruta dedicada (`/driver/caja`).
   - Muestra conciliación detallada en tiempo real de Efectivo en Mano y Transferencias (descontando gastos de ruta de forma dinámica).
   - Muestra el listado completo de los "Tickets de Venta" generados durante el día actual por el repartidor, detallando montos, horarios y formas de pago.
   - Permite consultar el detalle interactivo de cualquier comprobante (Boleta Virtual) y provee la capacidad de reenviarlo mediante WhatsApp con texto preformateado.

9. **Flujo de Reapertura de Ruta**:
   - En la vista de ruta finalizada del repartidor, se incorporó el botón **"Reabrir Ruta"** con un modal de confirmación (*¿Está seguro que desea reabrir la ruta?*).
   - Reactiva de manera automática la caja, el stock y el estado operativo del chofer (`"En Ruta"`) para realizar nuevas ventas de emergencia o pedidos de último momento.

10. **Diferenciación y Control de Stock (Pedidos Fijos vs. Mostrador)**:
    - **Panel Admin Central**: La configuración de paradas de carga en la agenda de rutas ahora cuenta con dos columnas desglosadas: **Pedidos Fijos** (autocalculado/sugerido) y **Carga Mostrador** (ingresada por el administrador). Permite definir mercadería reservada frente a la disponible para venta libre.
    - **App de Repartidores**: 
      - Desglose de carga por canal en la carga inicial del timeline.
      - Tarjeta en tiempo real **"Stock a Bordo"** en el inicio del chofer, desglosando el stock físico actual, el stock reservado para pedidos restantes y el disponible libre para mostrador.
      - Alerta visual en la terminal de cobro del chofer si la venta excede el mostrador libre disponible y compromete pedidos reservados posteriores.

11. **Refinamiento de Cobros e Historiales**:
    - **Terminología Clara**: Se actualizó "Pedido Fijo" a "Pedido Cliente" en la App del Chofer para mayor intuición.
    - **Lógica de Cobro Mixto Segura**: Al incluir una "Deuda Previa", los inputs de cobro se resetean a cero, previniendo errores de tipeo del repartidor.
    - **Sincronización de Base de Datos Corregida**: Se ajustó la regla de restricción (`sales_check`) en Supabase para validar matemáticamente de forma correcta ventas que incluyan pago simultáneo de saldos adeudados, desbloqueando el guardado offline.
    - **Recibos Dinámicos**: Los comprobantes de la boleta y mensajes de WhatsApp ahora diferencian correctamente entre "Pago de Deuda" (cuando se salda la deuda parcial o totalmente) y "Saldo a Favor" (cuando el cliente paga de más).
    - **Bugs Visuales Resueltos**: Corregido el mapeo de IDs en el Historial del Administrador, por lo que el "Top Productos del Mes" ahora muestra el nombre real en vez de `undefined`, y el listado de tickets especifica qué chofer realizó la visita.

12. **Módulo de Punto de Venta (Mostrador)**:
    - **Unificación UI/UX**: Se aplicó la misma paleta de colores corporativa (fondo oscuro/superficies contrastadas y acentos en `brand-navy` y `brand-orange`) en el panel de Mostrador y Login.
    - **Asignación de Ventas**: Ahora el operador puede seleccionar al cliente del mostrador mediante un selector desplegable (por defecto "Consumidor Final") para asignar las ventas.
    - **Ingreso Rápido de Cantidad**: Se cambió el selector estático de botones a un input numérico que permite teclear directamente la cantidad a vender, agilizando cobros grandes.
    - **Validación Estricta de Stock**: El sistema ahora bloquea la selección de productos con stock agotado (0 o negativo) y capa las cantidades ingresadas manualmente al límite real de stock existente en la fábrica.
    - **Tickets e Impresión Térmica**: Luego de cobrar, el sistema lanza un "Ticket de Compra" virtual que permite ser impreso rápidamente (`CSS @media print` especial para ocultar interfaz y redimensionar a ticket) o compartido de forma instantánea mediante la API nativa o WhatsApp Web.

### Enlaces Importantes:
- **Producción (PWA)**: https://app-panificadora.netlify.app
- **Repositorio**: https://github.com/AsselAlan/app-panificadora.git

---

## Próximos Pasos (Hoja de Ruta v0.2)

- [ ] **Sistema de Autenticación**: Implementar Supabase Auth real para proteger las rutas y activar las políticas RLS de forma segura, diferenciando Choferes de Administradores. *(Nota: Se ha restablecido la contraseña de todos los usuarios a "password" y se ha forzado el cambio de contraseña obligatorio para preparar este paso).*
- [ ] **Tickets Térmicos PDF**: Implementar la generación de PDF o comandos ESC/POS para impresoras térmicas de 80mm.
- [ ] **Assets PWA**: Diseñar e incluir los logotipos `pwa-192x192.png` y `pwa-512x512.png` en la carpeta `public/` para perfeccionar el manifiesto.
- [ ] **Estadísticas Avanzadas**: Gráficos históricos de rentabilidad en el Dashboard de Administración.