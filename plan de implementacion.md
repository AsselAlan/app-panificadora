# Plan de Implementación - Software de Panificadora (v0.1)

Este documento detalla el plan técnico para convertir los archivos de diseño y requerimientos en una aplicación web interactiva y funcional. El software incluye un panel web de administración, una aplicación móvil para repartidores con soporte offline-first, y una base de datos centralizada en Supabase con Row Level Security (RLS) y transacciones atómicas mediante procedimientos almacenados (RPC).

---

## Estructura del Proyecto

El proyecto se organizará en las siguientes carpetas:
- **`documentacion/`**: Archivos de diseño, requerimientos y especificaciones.
- **`backend/`**: Scripts de base de datos SQL para Supabase, políticas RLS y configuraciones de endpoints.
- **`frontend/`**: Código fuente de la aplicación React PWA (Vite, TailwindCSS, Zustand).

---

## User Review Required

> [!IMPORTANT]
> **Base de Datos y Supabase:** 
> Se requiere crear un proyecto en Supabase para obtener las credenciales de conexión (`SUPABASE_URL` y `SUPABASE_ANON_KEY`). Proporcionaremos las sentencias SQL necesarias para crear las tablas, funciones RLS y el RPC transaccional directamente en el editor SQL de Supabase.
> 
> **Offline-First:** 
> Proponemos utilizar **Zustand** persistido con **localForage** (IndexedDB) para gestionar las mutaciones locales (ventas y gastos en calle) cuando no hay internet, y realizar la sincronización (sync) con Supabase en cuanto se detecte conectividad activa.
>
> **Framework de Desarrollo:**
> Usaremos **Vite + React + TailwindCSS** estructurado en una Arquitectura de Componentes Modular. Esto nos permite generar un MVP robusto y visualmente impactante, cumpliendo con los estilos y micro-animaciones del prototipo actual.

---

## Preguntas Abiertas

> [!NOTE]
> 1. **¿Deseas que usemos TypeScript o JavaScript (JSX)?** El prototipo original está en `.tsx` (TypeScript), lo cual es ideal para mantener la integridad de los datos de la base de datos de Supabase en el frontend.
> 2. **Impresión de Tickets:** El diseño sugiere `react-to-print` para ticketera térmica. ¿Tienen algún modelo de ticketera en mente o implementamos una plantilla estándar en formato PDF/Impresión web (80mm)?
> 3. **Inicio de Sesión:** ¿Deseas que implementemos el login real con usuarios de Supabase Auth desde el día uno, o prefieres una simulación de perfiles en el frontend integrada con el backend de forma sencilla para comenzar?

---

## Propuesta de Cambios por Componente

### 1. Backend (Supabase)

Crearemos un script de migración SQL `schema.sql` con la definición exacta del PDF:
- **`backend/schema.sql`**: Contendrá la definición de tablas, restricciones, índices (incluyendo trigramas de búsqueda difusa), políticas RLS y la función RPC `process_offline_sale`.

### 2. Frontend (React PWA)

Inicializaremos la aplicación de React usando Vite, integrando TailwindCSS, Lucide React, Zustand, SweetAlert2 y el plugin PWA.

- **`frontend/package.json`**: Definición de dependencias necesarias (`@supabase/supabase-js`, `zustand`, `lucide-react`, `sweetalert2`, `localforage`, `@vite-pwa/plugin`).
- **`frontend/vite.config.js`**: Configuración de Vite para habilitar el comportamiento PWA y Service Workers.
- **`frontend/src/supabaseClient.js`**: Cliente de conexión configurado con las variables de entorno.
- **`frontend/src/store/useStore.js`**: Store global de Zustand que maneja el estado de la aplicación, el carrito, el stock temporal y la cola de sincronización offline.

### 3. Documentación

- Moveremos la documentación actual en `base/` a `documentacion/` para mantener el proyecto limpio.

---

## Plan de Verificación

### Pruebas Manuales y Automatizadas
1. **Verificación de Base de Datos:** Ejecutaremos los scripts SQL en Supabase y verificaremos que las tablas se creen con sus respectivas restricciones de CHECK y llaves primarias/foráneas.
2. **Prueba Offline-First:** Simularemos la pérdida de conexión a internet (modo avión en navegador/DevTools), registraremos una venta en la terminal del chofer, validaremos que se guarde en IndexedDB, y luego reactivaremos internet para verificar que la mutación se envíe automáticamente a Supabase mediante la cola de sincronización.
3. **Flujos Financieros:** Validaremos que el registro de un gasto descuente de forma inmediata la caja diaria del chofer y se refleje en el gráfico de torta de la administración central.
4. **Verificación PWA:** Comprobaremos con Lighthouse que la aplicación sea instalable y cargue los recursos en condiciones offline.
