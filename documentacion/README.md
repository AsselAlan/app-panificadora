# Software de Panificadora (v0.1)

## 1. ¿Qué es y cómo funciona?
Este proyecto es un **Software de Gestión Integral para Panificadoras**, diseñado para modernizar y optimizar la administración central, las ventas de mostrador y la logística de reparto.

**¿Cómo funciona?**
El sistema se divide en varios módulos interconectados, protegidos por un sistema de roles (Administrador, Repartidor, Mostrador):
- **Panel de Administración (Admin):** Permite el monitoreo en tiempo real de la flota, control de inventario de fábrica (ingresos y mermas), gestión de clientes (cuentas corrientes, saldos a favor) y aprobación de rendiciones de caja.
- **Aplicación Móvil para Repartidores:** Una interfaz optimizada para los choferes que operan en la calle. Su característica principal es la arquitectura **Offline-First**, lo que les permite registrar ventas, gastos, devoluciones y **tickets abiertos / borrador** (para clientes con visitas múltiples en el día) incluso sin conexión a internet. Al recuperar la señal, el sistema sincroniza automáticamente los datos con la base central.
- **Punto de Venta (Mostrador):** Un módulo robusto para ventas presenciales que descuenta stock en tiempo real, emite tickets térmicos, gestiona múltiples listas de precios (Mayorista A / Minorista B) y permite registrar **devoluciones** que se acreditan automáticamente como saldo a favor en la Cuenta Corriente del cliente.
- **Cierre de Caja y Stock:** Incluye procesos atómicos de fin de día para que los repartidores devuelvan stock sobrante, reporten mermas y rindan su caja con total trazabilidad.

## 2. Tecnologías Usadas
El proyecto está construido con un stack moderno, priorizando rendimiento, experiencia de usuario y disponibilidad offline:

**Frontend (Aplicación Cliente):**
- **React.js & Vite:** Para una interfaz de usuario reactiva y compilación ultra rápida.
- **TailwindCSS:** Para un diseño moderno, responsivo y con micro-animaciones (UI/UX premium).
- **Zustand & localForage (IndexedDB):** Para la gestión del estado global y persistencia de datos local, esencial para el funcionamiento offline.
- **PWA (Progressive Web App):** Permite instalar la aplicación en dispositivos móviles y trabajar sin red.
- **Lucide React & SweetAlert2:** Para iconografía y alertas interactivas.

**Backend y Base de Datos:**
- **Supabase (PostgreSQL):** Base de datos relacional robusta en la nube.
- **RPCs (Remote Procedure Calls):** Uso de procedimientos almacenados atómicos en SQL (ej. `process_offline_sale`, `process_driver_end_of_day`) para asegurar la consistencia de datos durante la sincronización concurrente.
- **RLS (Row Level Security):** Políticas de seguridad a nivel de fila para proteger el acceso a los datos según el rol del usuario autenticado.
- **Edge Functions:** Para tareas seguras de backend (creación de usuarios administrativos sin exponer claves).
- **Sentry:** Para telemetría avanzada, monitoreo de errores y capturas de pantalla de fallos (Session Replay).

## 3. ¿Cómo se llevó a cabo?
El desarrollo siguió un enfoque iterativo y modular centrado en resolver los problemas críticos del negocio (pérdida de conectividad y descuadres de stock/caja):

1. **Planificación y Base de Datos:** Se diseñó el esquema relacional en PostgreSQL (Supabase) enfocándose en la consistencia atómica mediante RPCs. Esto fue fundamental para permitir que ventas offline múltiples no corrompan el stock al sincronizarse simultáneamente.
2. **Arquitectura Offline-First:** En el frontend, se implementó una cola de sincronización persistente con IndexedDB. Los choferes pueden seguir trabajando y, en segundo plano, un worker vacía la cola de transacciones al detectar internet, asegurando cero pérdida de datos.
3. **Desarrollo de UI/UX Modular:** Se construyó la interfaz separando claramente los flujos de "Admin", "Driver" y "Mostrador". Se aplicó una paleta de colores corporativa (brand-navy, brand-orange) y se implementaron mejoras iterativas basadas en feedback (ej. ingreso numérico rápido, tickets térmicos compartibles vía WhatsApp).
4. **Seguridad y Telemetría:** En etapas avanzadas, se migraron lógicas sensibles al backend (Edge Functions, RLS) y se integró `@sentry/react` para poder auditar proactivamente cualquier fallo que experimenten los usuarios en producción.
5. **Estabilización Continua:** Se corrigieron problemas de cálculo de fechas (desfases por zonas horarias UTC-3), optimizaciones de renders en React (memoización de funciones costosas) y unificación de la gestión de deudas en Cuentas Corrientes.

---

### Enlaces Importantes:
- **Producción (PWA)**: https://panificadora-app.netlify.app
- **Repositorio**: https://github.com/AsselAlan/app-panificadora.git

---

## Próximos Pasos (Hoja de Ruta v0.2)
- [ ] **Sistema de Autenticación**: Implementar Supabase Auth real para proteger las rutas y activar las políticas RLS de forma segura, diferenciando Choferes de Administradores.
- [ ] **Tickets Térmicos PDF**: Implementar la generación de PDF o comandos ESC/POS para impresoras térmicas de 80mm.
- [ ] **Assets PWA**: Diseñar e incluir los logotipos `pwa-192x192.png` y `pwa-512x512.png` en la carpeta `public/` para perfeccionar el manifiesto.
- [ ] **Estadísticas Avanzadas**: Gráficos históricos de rentabilidad en el Dashboard de Administración.