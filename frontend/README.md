# Software Panificadora v0.1

Sistema integral de gestión para panificadoras que manejan distribución por rutas (repartidores) y venta al mostrador (Punto de Venta). 

Este proyecto está construido con **React + TypeScript + Vite** en el frontend, estilizado con **Tailwind CSS**, y respaldado por **Supabase** (PostgreSQL) en el backend.

## Roles y Accesos

El sistema cuenta con un sistema de autenticación centralizado a través de Supabase Auth, complementado con una tabla `user_roles` que define el comportamiento y las vistas a las que puede acceder cada usuario:

1. **Administrador (`admin`)**
   - Acceso total al panel general (`AdminApp.tsx`).
   - Gestión de Usuarios (Creación, asignación de roles, reseteo de contraseñas obligatorias).
   - Monitoreo de flota, rutas diarias, gestión de clientes, gastos, stock central, y catálogo de productos.
   - Panel adaptativo a dispositivos móviles (Menú hamburguesa responsivo).

2. **Repartidor (`repartidor`)**
   - Acceso exclusivo al panel de conductor (`DriverApp.tsx`).
   - Flujo de ventas y cobranzas offline-first / PWA.
   - Registro de mermas y devoluciones de panadería que descuentan el stock local cargado en su vehículo (`loads`).
   - La primera vez que ingresan (tras ser creados por el admin) deben cambiar su clave por seguridad.

3. **Mostrador (`mostrador`)**
   - Acceso exclusivo al Punto de Venta local (`MostradorApp.tsx`).
   - Interfaz de "Caja" optimizada para ventas ágiles (POS).
   - El stock se descuenta en tiempo real de la central (`bakery_stock` en tabla `products`).
   - La venta se realiza de manera atómica a través de RPC en base de datos (`process_mostrador_sale`).

## Arquitectura de Ventas

Las ventas en la aplicación se dividen en dos ramas lógicas dentro de la misma tabla de `sales`, permitiendo tener métricas consolidadas:

- **Ventas de Ruta (Repartidores):** Tienen asociado un `driver_id` y descuentan stock del inventario móvil (`loads`).
- **Ventas de Mostrador:** Tienen un `driver_id` nulo (ya que no viajan en vehículo), están vinculadas al "Consumidor Final", y descuentan de la central.

## Funcionalidades Clave Implementadas

* **Gestión de Stock Central y Vehicular:** Separación clara entre lo que hay en fábrica y lo que tienen las camionetas.
* **Sistema POS:** Carrito dinámico, catálogo interactivo y cálculos automáticos de vuelto (Modal de Pagos).
* **Responsive Design:** La aplicación es 100% responsiva. La app de Mostrador se apila en columnas en móviles para mejorar la experiencia táctil, y la del Administrador oculta el menú lateral y agrega un Overlay para maximizar el área de trabajo en pantallas chicas.
* **Seguridad y Atomicidad:** Las ventas utilizan Procedimientos Almacenados (RPC) en Postgresql para que el descuento de stock, la generación del ticket y la actualización de deudas de clientes (Cuenta Corriente) sean a prueba de fallos de red.

## Comandos Útiles

```bash
# Iniciar servidor de desarrollo
npm run dev

# Compilar para producción
npm run build
```

## Estado Actual (v0.1)
El frontend de la aplicación se encuentra en desarrollo activo. Las vistas y la integración principal a la base de datos están listas, incluyendo la respuesta visual dinámica, diseño Premium, interacciones adaptativas a celular y flujo completo de ventas de mostrador.
