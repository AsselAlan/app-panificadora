 Análisis General — Panificadora v0.1
Estado General
La app está bien estructurada para ser un MVP. Tiene offline-first funcional, auth con Supabase, rutas protegidas por rol, y una UI premium. Sin embargo, hay varios cuellos de botella, bugs lógicos y parámetros que se pierden que conviene resolver antes de escalar.

🔴 Crítico — Bugs y Pérdidas de Datos
1. El stock en loads (BD) nunca se inicializa correctamente al empezar ruta
Archivo: useStore.ts → startDriverRoute / DriverHome.tsx → handleStart
El inventario de carga se guarda solo en IndexedDB local (useStore.setState({ loads: initialLoads })). Nunca se persiste en la tabla loads de Supabase.
El RPC process_offline_sale intenta hacer UPDATE public.loads ... WHERE date_loaded = fecha, pero si nunca se insertó esa fila, el update de stock en DB no tiene efecto. El stock de la camioneta queda desincronizado con la BD.
Impacto: Si el repartidor recarga la página o cambia de dispositivo, pierde el inventario en ruta.
2. loads se almacenan en IndexedDB pero NO se guardan en Supabase al sincronizar
Archivo: useStore.ts → processSyncQueue
La cola de sincronización solo maneja type: 'sale' y type: 'expense'. Las cargas de furgoneta nunca se sincronizan a la BD.
Los items de tipo 'load' simplemente no existen como tipo en SyncItem.
3. POS de Mostrador (AdminPOS): driver_id ficticio problemático
Archivo: AdminApp.tsx → AdminPOS → handleProcess (líneas ~372–391)
Se inicializa con driver_id: '00000000-0000-0000-0000-000000000000' pero luego se sobreescribe con el primer driver de la lista. Esto atribuye las ventas de mostrador a un repartidor real, mezclando sus cajas.
El filtro de "ventas locales" en el Dashboard busca exactamente '00000000-...', pero la venta termina con ID de un repartidor real → el mostrador no aparece en el dashboard.
4. Gastos: se identifica el repartidor por full_name (texto), no por ID
Archivo: useStore.ts → addExpense, expenses RLS policy en schema.sql
Si dos repartidores tienen nombres similares o hay un typo, los gastos se atribuyen mal.
La RLS en BD también filtra por origin = full_name → fácil de saltear con nombres duplicados.
🟠 Importante — Cuellos de Botella de Rendimiento
5. fetchInitialData carga TODAS las ventas (límite 500) al iniciar
Archivo: useStore.ts → fetchInitialData (línea 243)
ts

supabase.from('sales').select('*').order(...).limit(500)
500 ventas se cargan en cada inicio, en cada polling de 30 segundos del Admin, y cada vez que el repartidor abre la app. Esto incluye ventas de meses anteriores que no se usan.
Impacto: Lento al escalar. Debería filtrarse por fecha actual o las últimas N semanas.
6. Admin hace polling cada 30 segundos con fetchInitialData completo
Archivo: AdminApp.tsx → useEffect (líneas 35-44)
Cada 30s se hacen 8 queries en paralelo a Supabase para refrescar todo. Esto consume el cupo gratuito rápidamente y puede causar lag visual.
Solución: Usar Supabase Realtime (suscripciones) en lugar de polling.
7. getMostradorInfo recalcula recorriendo TODOS los clientes en cada render de producto
Archivo: DriverApp.tsx → DriverTerminal → getMostradorInfo (línea ~1087)
Esta función no está memoizada y se llama por cada producto en el render del tab de venta. Si hay muchos clientes o productos, se hace un find y filter costoso por cada render.
Solución: Memoizar con useMemo o precalcular fuera del map.
8. remainingPedidosFijos en DriverHome se recalcula en cada render
Archivo: DriverApp.tsx → DriverHome (línea ~525)
Aunque usa useMemo, depende de todaySales que a su vez también es useMemo. Ambos recalculan sobre arrays potencialmente grandes.
🟡 Lógica Incorrecta / Parámetros que se Pierden
9. navigationSource se pierde al recargar la página
Archivo: DriverApp.tsx → línea 53
El estado navigationSource controla si el botón "Atrás" en la terminal lleva a la hoja de ruta o al listado de clientes. Es un useState local, así que si la página se recarga (PWA, etc.), siempre vuelve a 'CLIENTS' aunque el usuario haya venido del roadmap.
10. Listener duplicado de online/offline
Archivo: App.tsx (líneas 33-49) + useStore.ts (líneas 514-520) + DriverApp.tsx (líneas 63-72)
El evento online/offline se registra en 3 lugares distintos para el mismo propósito. Puede causar llamadas duplicadas a processSyncQueue o setOffline.
11. completedLoads (cargas intermedias confirmadas) se pierde al navegar
Archivo: DriverApp.tsx → DriverRoadmap → useState<string[]>([]) (línea 1670)
Las cargas intermedias que el repartidor confirma en ruta se guardan en estado local del componente. Si navega a otra pantalla y vuelve al roadmap, todas las cargas aparecen como "no confirmadas" de nuevo.
12. fetchSalesByDate sobrescribe el array global sales
Archivo: useStore.ts → línea 291
ts

set({ sales: data || [] })
Al cargar ventas históricas de un día específico, se reemplaza completamente el array sales del store. Si el repartidor tiene ventas del día actual guardadas offline (en la cola), estas se pierden del estado visible hasta la siguiente sincronización.
13. DriverHome: rendición de caja muestra datos de driver.cash_collected sin descontar gastos
Archivo: DriverApp.tsx → vista "Finalizado" (línea ~690)
En la vista de ruta finalizada, se muestran cash_collected y transfer_collected como totales, pero no se descuentan los gastos registrados. La "Caja Real" que ve el chofer es incorrecta.
El componente DriverCashSummary sí hace el cálculo correcto, pero la pantalla de rendición no.
14. El check de validación de ventas no contempla applied_debt
Archivo: schema.sql → línea 108
sql

check (payment_cash + payment_transfer + payment_account = final_total)
final_total ya incluye applied_debt en algunos casos, pero la constraint solo suma los 3 pagos. En ventas con deuda previa incluida, puede fallar o permitir inconsistencias.
🔵 Seguridad y Arquitectura
15. expense_categories y driver_expense_categories tienen RLS completamente abierto
Archivo: schema.sql → líneas 365-366 y 377-378
sql

create policy "Allow public write expense_categories" on ... for all using (true) with check (true);
Cualquier usuario anónimo (sin auth) puede leer y escribir estas tablas. Esto es un acceso público sin restricción.
16. userSession se persiste en IndexedDB (Zustand persist)
Archivo: useStore.ts → config persist
La sesión de Supabase (tokens JWT) se guarda en IndexedDB junto con el resto del estado. Supabase ya maneja sus tokens internamente; duplicarlos puede generar desincronía si expiran.
17. useStore.getState() dentro de renders y useMemo
Archivos: DriverApp.tsx líneas 109, 491, 1694 — se llama useStore.getState() dentro de useMemo y useEffect
Esto bypasea la reactividad de React/Zustand. Si el estado cambia, el useMemo no se re-ejecuta automáticamente.
✅ Lo que Funciona Bien
Aspecto	Estado
Arquitectura Offline-First con cola de sync	✅ Sólida
RPC transaccional process_offline_sale	✅ Idempotente y seguro
Auth + Roles (admin/repartidor/mostrador)	✅ Funcional
UI/UX móvil del repartidor	✅ Premium
Rutas protegidas por rol	✅ Correcto
ForceChangePassword al primer login	✅ Implementado
Índices en BD (trigram, fecha)	✅ Bien diseñados
📋 Prioridad de Correcciones
#	Problema	Prioridad
1	Loads nunca se persisten en BD	🔴 Crítico
3	POS Mostrador con driver_id incorrecto	🔴 Crítico
12	fetchSalesByDate borra ventas pendientes	🔴 Crítico
13	Rendición final muestra caja bruta sin gastos	🟠 Alto
4	Gastos identifican repartidor por nombre	🟠 Alto
5-6	Carga de 500 ventas + polling agresivo	🟠 Alto
7-8	Funciones costosas sin memo	🟡 Medio
9-11	Estado local perdido al navegar	🟡 Medio
100	Listener duplicado online/offline	🟡 Medio
101	RLS abierta en categorías	🔵 Seguridad
102	Session en IndexedDB	🔵 Seguridad

## 🚀 Actualizaciones Recientes (v0.4)
- **Sistema de Stock y Mermas**: Se implementó una nueva tabla `stock_losses` para registrar mermas de producción y devoluciones.
- **Fin de Día Repartidor**: Al finalizar la ruta, el repartidor ejecuta un proceso atómico (`process_driver_end_of_day`) que devuelve su stock sobrante a la fábrica y pasa las devoluciones a pérdida.
- **Control de Mostrador**: Se reemplazó la simple carga de producción por un panel completo de "Actualización de Stock" que agrupa ingresos y mermas en la tabla `stock_updates`, permitiendo además **revertir** cualquier actualización equivocada.

## Actualizaciones Recientes
- **Gesti�n de Envases (Cajones)**: Se corrigi� la l�gica en base de datos (process_offline_sale) para sumar/restar cajones a cada cliente correctamente, solucionando problemas por valores NULL. Frontend ahora previene NaN al actualizar estado local.
- **Devoluciones de Mercader�a (Mermas)**: Se arregl� el error donde las devoluciones se volv�an a sumar al stock disponible en la camioneta. Ahora se separan y se procesan al finalizar el d�a como p�rdida de stock.
- **Monitoreo de Flota (Admin)**: Se solucion� el error que bloqueaba la pantalla si exist�a un conductor sin fecha de �ltima actividad. Tambi�n se arregl� la detecci�n de diferencias de efectivo (Cierre Parcial vs Rendici�n Aprobada) cuando un conductor realiza m�ltiples entregas en el mismo d�a despu�s de haber cerrado su primera rendici�n.
