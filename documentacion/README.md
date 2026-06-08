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

### Enlaces Importantes:
- **Producción (PWA)**: https://app-panificadora.netlify.app
- **Repositorio**: https://github.com/AsselAlan/app-panificadora.git

---

## Próximos Pasos (Hoja de Ruta v0.2)

- [ ] **Sistema de Autenticación**: Implementar Supabase Auth real para proteger las rutas y activar las políticas RLS de forma segura, diferenciando Choferes de Administradores.
- [ ] **Tickets Térmicos PDF**: Implementar la generación de PDF o comandos ESC/POS para impresoras térmicas de 80mm.
- [ ] **Assets PWA**: Diseñar e incluir los logotipos `pwa-192x192.png` y `pwa-512x512.png` en la carpeta `public/` para perfeccionar el manifiesto.
- [ ] **Estadísticas Avanzadas**: Gráficos históricos de rentabilidad en el Dashboard de Administración.
