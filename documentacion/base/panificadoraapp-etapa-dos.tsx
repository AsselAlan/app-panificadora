import React, { useState, useMemo, useEffect } from 'react';
import { 
  Wifi, WifiOff, TrendingUp, Users, Package, Settings, Search, 
  Plus, Minus, ShoppingCart, Printer, ArrowLeft, CheckCircle, 
  AlertCircle, MapPin, CreditCard, Banknote, ChevronRight,
  ClipboardList, Home, Truck, LogOut, FileText, CornerDownLeft,
  MessageCircle, Mail, Activity, Clock, Map, ArrowUp, ArrowDown, X,
  ClipboardCheck, Calendar, Star, Receipt, ShoppingBag, Store,
  Wallet, TrendingDown, PieChart
} from 'lucide-react';

const DAYS_OF_WEEK = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

// --- DATOS MOCK INICIALES ---
const initialProducts = [
  { id: 1, name: 'Pan Francés', unit: 'kg', priceA: 1500, priceB: 1300, truckStock: 50, bakeryStock: 200 },
  { id: 2, name: 'Facturas Surtidas', unit: 'docena', priceA: 4000, priceB: 3600, truckStock: 20, bakeryStock: 50 },
  { id: 3, name: 'Pan de Miga', unit: 'bolsa', priceA: 6500, priceB: 6000, truckStock: 10, bakeryStock: 30 },
  { id: 4, name: 'Prepizzas', unit: 'unidad', priceA: 900, priceB: 800, truckStock: 25, bakeryStock: 40 },
  { id: 5, name: 'Bizcochitos', unit: 'kg', priceA: 3000, priceB: 2800, truckStock: 15, bakeryStock: 20 },
  { id: 6, name: 'Factura Individual', unit: 'unidad', priceA: 400, priceB: 350, truckStock: 60, bakeryStock: 150 },
];

const initialClients = [
  { id: 999, name: 'Consumidor Final', phone: '', email: '', debt: 0, category: 'B', address: 'Venta en Local', allowCredit: false, fixedOrder: {} },
  { id: 1, name: 'Despensa Los Amigos', phone: '5491123456781', email: 'contacto@losamigos.com', debt: 15000, category: 'A', address: 'Calle 12 #345', allowCredit: true, fixedOrder: { 1: 15, 2: 5 } },
  { id: 2, name: 'Supermercado Sol', phone: '5491123456782', email: 'super_sol@mail.com', debt: -4500, category: 'B', address: 'Av. Principal 900', allowCredit: true, fixedOrder: { 1: 30 } },
  { id: 3, name: 'Kiosco El Paso', phone: '', email: 'kioscoelpaso@mail.com', debt: 0, category: 'A', address: 'Esquina San Martín', allowCredit: false, fixedOrder: { 4: 10, 5: 2 } },
  { id: 4, name: 'Colegio Nacional', phone: '5491123456784', email: 'compras@colegionacional.edu.ar', debt: 25000, category: 'B', address: 'Calle 4 #110', allowCredit: true, fixedOrder: { 2: 15, 6: 20 } },
  { id: 5, name: 'Maxikiosco Centro', phone: '5491123456785', email: '', debt: 0, category: 'A', address: 'Plaza Principal', allowCredit: true, fixedOrder: {} },
];

const initialDrivers = [
  { id: 1, name: 'Roberto Sánchez', status: 'En Base', isOnline: false, totalSales: 0, cash: 0, transfer: 0, expensesTotal: 0, visitsDone: 0, totalVisits: 0, lastActive: 'Hace 1 min', location: 'Base' },
  { id: 2, name: 'Carlos Ruiz', status: 'Finalizado', isOnline: false, totalSales: 120000, cash: 80000, transfer: 40000, expensesTotal: 0, visitsDone: 30, totalVisits: 30, lastActive: 'Hace 1 hora', location: 'Base' },
];

const initialWeeklyRoutes = {
  'Lunes': { 1: [1, 2, 4], 2: [3, 5] },
  'Martes': { 1: [1, 2], 2: [3] },
  'Miércoles': { 1: [1, 2, 4], 2: [3, 5] },
  'Jueves': { 1: [1, 2], 2: [3] },
  'Viernes': { 1: [1, 2, 4, 5], 2: [3] },
  'Sábado': { 1: [1], 2: [] },
  'Domingo': { 1: [], 2: [] },
};

const initialWeeklyLoads = {
  'Lunes': { 1: { 1: 45, 2: 20, 6: 20 }, 2: { 4: 10, 5: 2 } },
  'Martes': { 1: { 1: 45 }, 2: { 4: 10, 5: 2 } },
  'Miércoles': { 1: {}, 2: {} },
  'Jueves': { 1: {}, 2: {} },
  'Viernes': { 1: {}, 2: {} },
  'Sábado': { 1: {}, 2: {} },
  'Domingo': { 1: {}, 2: {} },
};

// Generamos fechas dinámicas para que el gráfico tenga datos "hoy"
const todayStr = new Date().toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' });

// --- NUEVO: HISTORIAL DE GASTOS SIMULADO ---
const initialExpenses = [
  { id: 1, date: todayStr, category: 'Combustible', amount: 15000, description: 'Carga gasoil camioneta Roberto', origin: 'Roberto Sánchez', method: 'efectivo' },
  { id: 2, date: todayStr, category: 'Insumos y Materia Prima', amount: 45000, description: 'Compra de harina 50kg x2', origin: 'Administración', method: 'transferencia' }
];

const initialSales = [
  {
    id: 982341,
    date: '10/5/2026, 08:15',
    clientId: 1,
    clientName: 'Despensa Los Amigos',
    driverName: 'Carlos Ruiz',
    items: [{ name: 'Pan Francés', qty: 15, price: 1500, total: 22500 }, { name: 'Facturas Surtidas', qty: 5, price: 4000, total: 20000 }],
    returns: [{ name: 'Pan Francés', qty: 2, price: 1500, total: 3000 }],
    subtotalSales: 42500,
    totalReturns: 3000,
    prevDebt: 0,
    includeDebt: false,
    finalTotal: 39500,
    payCash: 39500,
    payTransfer: 0,
    balanceAdded: 0
  }
];

export default function App() {
  const [view, setView] = useState('LOGIN'); 
  
  const [db, setDb] = useState({
    products: initialProducts,
    clients: initialClients,
    drivers: initialDrivers,
    weeklyRoutes: initialWeeklyRoutes,
    weeklyLoads: initialWeeklyLoads,
    sales: initialSales, 
    returns: [],
    expenses: initialExpenses, // Se añade historial de gastos
    todayMetrics: { cash: 0, transfer: 0, cc: 0, totalSales: 0 }
  });

  const todayName = DAYS_OF_WEEK[new Date().getDay()];

  useEffect(() => {
    setDb(prev => {
      const updatedDrivers = prev.drivers.map(d => {
        const assignedClientsCount = (prev.weeklyRoutes[todayName]?.[d.id] || []).length;
        return { ...d, totalVisits: assignedClientsCount > d.totalVisits ? assignedClientsCount : d.totalVisits };
      });
      const hasChanges = updatedDrivers.some((d, i) => d.totalVisits !== prev.drivers[i].totalVisits);
      return hasChanges ? { ...prev, drivers: updatedDrivers } : prev;
    });
  }, [db.weeklyRoutes, todayName]);

  if (view === 'LOGIN') return <LoginScreen setView={setView} />;
  if (view === 'DRIVER') return <DriverApp db={db} setDb={setDb} todayName={todayName} onLogout={() => setView('LOGIN')} />;
  if (view === 'ADMIN') return <AdminApp db={db} setDb={setDb} todayName={todayName} onLogout={() => setView('LOGIN')} />;

  return null;
}

function LoginScreen({ setView }) {
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center">
        <div className="w-20 h-20 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <Truck size={40} />
        </div>
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Panificadora System</h1>
        <p className="text-gray-500 mb-8">Seleccione su perfil de acceso</p>
        
        <div className="space-y-4">
          <button onClick={() => setView('DRIVER')} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 rounded-xl flex items-center justify-center gap-2 transition-colors text-lg">
            <MapPin size={24} /> Módulo Repartidor (Móvil)
          </button>
          <button onClick={() => setView('ADMIN')} className="w-full bg-slate-800 hover:bg-slate-900 text-white font-semibold py-4 rounded-xl flex items-center justify-center gap-2 transition-colors text-lg">
            <Settings size={24} /> Módulo Administrador (Web)
          </button>
        </div>
      </div>
    </div>
  );
}

function DriverApp({ db, setDb, todayName, onLogout }) {
  const [driverView, setDriverView] = useState('HOME'); 
  const [selectedClient, setSelectedClient] = useState(null);
  const [isOffline, setIsOffline] = useState(false);
  const SIMULATED_DRIVER_ID = 1;

  const renderView = () => {
    switch (driverView) {
      case 'HOME':
        return <DriverHome db={db} setDb={setDb} driverId={SIMULATED_DRIVER_ID} todayName={todayName} onNewSale={() => setDriverView('CLIENTS')} isOffline={isOffline} toggleOffline={() => setIsOffline(!isOffline)} />;
      case 'CLIENTS':
        return <DriverClients db={db} driverId={SIMULATED_DRIVER_ID} todayName={todayName} onBack={() => setDriverView('HOME')} onSelectClient={(client) => { setSelectedClient(client); setDriverView('TERMINAL'); }} />;
      case 'TERMINAL':
        return <DriverTerminal client={selectedClient} db={db} setDb={setDb} driverId={SIMULATED_DRIVER_ID} todayName={todayName} onBack={() => setDriverView('CLIENTS')} onComplete={() => setDriverView('HOME')} />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-200 flex justify-center items-center">
      <div className="w-full max-w-md h-[100dvh] bg-gray-50 flex flex-col shadow-2xl overflow-hidden relative sm:h-[850px] sm:rounded-[2rem] sm:border-8 border-gray-900">
        <div className="bg-blue-700 text-white text-xs py-1 px-4 flex justify-between items-center hidden sm:flex">
          <span>08:30 AM</span>
          <div className="flex items-center gap-1">{isOffline ? <WifiOff size={12} /> : <Wifi size={12} />}<span>100%</span></div>
        </div>
        <div className="flex-1 overflow-hidden flex flex-col">{renderView()}</div>
        {driverView === 'HOME' && (
          <div className="bg-white border-t border-gray-200 flex justify-around p-3 pb-safe">
            <button className="flex flex-col items-center text-blue-600"><Home size={24} /><span className="text-xs font-medium mt-1">Inicio</span></button>
            <button onClick={() => setDriverView('CLIENTS')} className="flex flex-col items-center text-gray-400"><MapPin size={24} /><span className="text-xs font-medium mt-1">Ruta</span></button>
            <button onClick={onLogout} className="flex flex-col items-center text-gray-400"><LogOut size={24} /><span className="text-xs font-medium mt-1">Salir</span></button>
          </div>
        )}
      </div>
    </div>
  );
}

function DriverHome({ db, setDb, driverId, todayName, onNewSale, isOffline, toggleOffline }) {
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [showLoadChecklist, setShowLoadChecklist] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  
  // States for new Expense
  const [expAmount, setExpAmount] = useState('');
  const [expCategory, setExpCategory] = useState('Combustible');
  const [expDesc, setExpDesc] = useState('');
  const [expMethod, setExpMethod] = useState('efectivo');

  const driver = db.drivers.find(d => d.id === driverId);
  const routeClientIds = db.weeklyRoutes[todayName]?.[driverId] || [];
  const driverClientsCount = routeClientIds.length;
  const driverLoad = db.weeklyLoads[todayName]?.[driverId] || {};
  
  const handleStartRoute = () => {
    setDb(prev => ({ ...prev, drivers: prev.drivers.map(d => d.id === driverId ? { ...d, status: 'En Recorrido', isOnline: true, lastActive: 'Ahora', location: 'En Calle', totalVisits: driverClientsCount } : d) }));
  };

  const handleEndRoute = () => {
    setDb(prev => ({ ...prev, drivers: prev.drivers.map(d => d.id === driverId ? { ...d, status: 'Finalizado', isOnline: false, lastActive: 'Ahora', location: 'Base' } : d) }));
    setShowEndConfirm(false);
  };

  const handleSaveExpense = (e) => {
    e.preventDefault();
    const val = parseFloat(expAmount);
    if (isNaN(val) || val <= 0) return;

    const newExpense = {
      id: Math.floor(Math.random() * 900000) + 100000,
      date: new Date().toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' }),
      category: expCategory,
      amount: val,
      description: expDesc || 'Gasto en ruta',
      origin: driver.name,
      method: expMethod
    };

    setDb(prev => {
      const updatedDrivers = prev.drivers.map(d => {
        if(d.id === driverId) {
          return {
            ...d,
            expensesTotal: (d.expensesTotal || 0) + val,
            // Descontamos el dinero físico que se gastó de la caja del chofer
            cash: expMethod === 'efectivo' ? d.cash - val : d.cash,
            transfer: expMethod === 'transferencia' ? d.transfer - val : d.transfer
          };
        }
        return d;
      });

      return {
        ...prev,
        expenses: [newExpense, ...prev.expenses],
        drivers: updatedDrivers,
        todayMetrics: {
          ...prev.todayMetrics,
          // También descontamos de la caja global de la panificadora
          cash: expMethod === 'efectivo' ? prev.todayMetrics.cash - val : prev.todayMetrics.cash,
          transfer: expMethod === 'transferencia' ? prev.todayMetrics.transfer - val : prev.todayMetrics.transfer,
        }
      };
    });

    setExpAmount('');
    setExpDesc('');
    setShowExpenseModal(false);
    alert('Gasto registrado y descontado de tu caja.');
  };

  if (driver.status === 'En Base') {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-gray-50 p-8 text-center relative z-10">
        <div className="w-28 h-28 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-6 shadow-inner"><Truck size={56} /></div>
        <h2 className="text-3xl font-bold text-gray-800 mb-2">Bienvenido, {driver.name}</h2>
        <p className="text-gray-500 mb-6 text-lg">Día de trabajo: <strong>{todayName}</strong></p>
        
        <div className="bg-white border border-gray-200 rounded-xl p-4 mb-8 w-full shadow-sm">
          <p className="text-sm text-gray-500 mb-1 font-semibold uppercase">Hoja de Ruta Hoy</p>
          <p className="text-2xl font-bold text-gray-900">{driverClientsCount} <span className="text-lg font-normal text-gray-500">Clientes asignados</span></p>
        </div>

        <button onClick={() => setShowLoadChecklist(true)} className="bg-white text-blue-600 border border-blue-200 hover:bg-blue-50 w-full py-4 rounded-2xl font-bold text-lg shadow-sm active:scale-95 transition-all flex items-center justify-center gap-3 mb-4">
          <ClipboardCheck size={24} /> Ver Pedido a Cargar
        </button>

        <button onClick={handleStartRoute} disabled={driverClientsCount === 0} className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white w-full py-5 rounded-2xl font-bold text-xl shadow-lg active:scale-95 transition-all flex items-center justify-center gap-3">
          <MapPin size={24} /> {driverClientsCount === 0 ? 'Sin Ruta Asignada' : 'Iniciar Ruta'}
        </button>

        {/* Modal Load Checklist */}
        {showLoadChecklist && (
          <div className="absolute inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl scale-in-center max-h-[80vh] flex flex-col">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2"><Package size={24} className="text-blue-600"/> Pedido de Hoy</h3>
                <button onClick={() => setShowLoadChecklist(false)} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full"><X size={20}/></button>
              </div>
              <p className="text-gray-500 mb-4 text-sm">Verifica que tengas esta mercadería cargada en la camioneta para tu ruta del <strong>{todayName}</strong>.</p>
              
              <div className="flex-1 overflow-y-auto space-y-2 mb-6">
                {db.products.map(p => {
                  const qty = driverLoad[p.id] || 0;
                  if (qty === 0) return null;
                  return (
                    <div key={p.id} className="flex justify-between items-center bg-gray-50 p-3 rounded-xl border border-gray-100">
                      <span className="font-semibold text-gray-800">{p.name}</span>
                      <span className="font-bold text-blue-600 bg-blue-100 px-3 py-1 rounded-lg">{qty} {p.unit}</span>
                    </div>
                  );
                })}
                {Object.values(driverLoad).every(qty => qty === 0) && (
                  <div className="text-center text-gray-400 py-6">Tu pedido está vacío. Habla con el administrador.</div>
                )}
              </div>
              <button onClick={() => setShowLoadChecklist(false)} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-xl font-bold shadow-lg active:bg-blue-800 transition-colors">Entendido</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (driver.status === 'Finalizado') {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-gray-50 p-8 text-center relative z-10">
        <div className="w-28 h-28 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6 shadow-inner"><CheckCircle size={56} /></div>
        <h2 className="text-3xl font-bold text-gray-800 mb-2">Ruta Finalizada</h2>
        <p className="text-gray-500 mb-8 text-lg">Toda la información ha sido guardada en el servidor central.</p>
        
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 w-full mb-8 text-left">
          <p className="text-sm text-gray-500 font-bold uppercase mb-3 border-b pb-2">Rendición de Caja Real</p>
          <div className="flex justify-between items-center mb-2"><span className="text-gray-600 text-sm">Ventas Generadas</span><span className="font-bold text-gray-900">${driver.totalSales.toLocaleString()}</span></div>
          {driver.expensesTotal > 0 && (
            <div className="flex justify-between items-center mb-2 pb-2 border-b border-gray-100"><span className="text-red-500 text-sm">Gastos en Ruta</span><span className="font-bold text-red-600">-${driver.expensesTotal.toLocaleString()}</span></div>
          )}
          <div className="pt-2">
            <p className="text-xs text-gray-400 mb-1">A ENTREGAR HOY:</p>
            <div className="flex justify-between items-center mb-1"><span className="text-gray-500 text-sm flex items-center gap-1"><Banknote size={14}/> Efectivo</span><span className="font-bold text-green-600">${driver.cash.toLocaleString()}</span></div>
            <div className="flex justify-between items-center"><span className="text-gray-500 text-sm flex items-center gap-1"><CreditCard size={14}/> Transf.</span><span className="font-bold text-blue-600">${driver.transfer.toLocaleString()}</span></div>
          </div>
        </div>
        <p className="text-xs text-gray-400">Puedes cerrar sesión o apagar el dispositivo.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-50 overflow-y-auto relative">
      <div className="bg-blue-600 text-white p-6 pb-8 rounded-b-3xl shadow-md">
        <div className="flex justify-between items-start mb-6">
          <div><h1 className="text-2xl font-bold">Hola, {driver.name.split(' ')[0]}</h1><p className="text-blue-200">En Ruta - {driver.visitsDone}/{driverClientsCount} Visitas</p></div>
          <button onClick={toggleOffline} className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${isOffline ? 'bg-red-500/20 text-red-100 border border-red-400' : 'bg-green-500/20 text-green-100 border border-green-400'}`}>
            {isOffline ? <WifiOff size={14} /> : <Wifi size={14} />}{isOffline ? 'Offline' : 'Sincronizado'}
          </button>
        </div>
        <div className="bg-white/10 p-4 rounded-2xl border border-white/20 backdrop-blur-sm">
          <div className="flex justify-between items-end">
            <div>
              <p className="text-sm text-blue-100 mb-1">Ventas de hoy ({todayName})</p>
              <p className="text-4xl font-bold">${driver.totalSales.toLocaleString()}</p>
            </div>
            {driver.expensesTotal > 0 && (
              <div className="text-right">
                <p className="text-xs text-red-200">Gastos</p>
                <p className="text-lg font-bold text-red-100">-${driver.expensesTotal.toLocaleString()}</p>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Cajas Físicas */}
      <div className="px-6 -mt-4 mb-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex gap-4">
          <div className="flex-1"><div className="flex items-center gap-2 text-gray-500 mb-1"><Banknote size={16} className="text-green-500" /><span className="text-[10px] font-bold uppercase tracking-wider">Caja Efectivo</span></div><p className="text-xl font-black text-gray-800">${driver.cash.toLocaleString()}</p></div>
          <div className="w-px bg-gray-100"></div>
          <div className="flex-1"><div className="flex items-center gap-2 text-gray-500 mb-1"><CreditCard size={16} className="text-blue-500" /><span className="text-[10px] font-bold uppercase tracking-wider">Caja Transf.</span></div><p className="text-xl font-black text-gray-800">${driver.transfer.toLocaleString()}</p></div>
        </div>
      </div>

      <div className="px-6 flex-1 flex flex-col justify-start gap-4">
        <button onClick={onNewSale} className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-2xl p-5 shadow-lg flex flex-col items-center justify-center gap-3 transition-transform active:scale-95">
          <div className="bg-white/20 p-4 rounded-full"><ShoppingCart size={32} /></div>
          <span className="text-xl font-bold">Continuar Hoja de Ruta</span>
        </button>
        
        <div className="flex gap-4">
          <button onClick={() => setShowExpenseModal(true)} className="flex-1 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-2xl p-4 flex flex-col items-center justify-center gap-2 font-bold active:scale-95 transition-all">
            <TrendingDown size={24} />
            <span className="text-sm">Registrar Gasto</span>
          </button>
          <button className="flex-1 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 rounded-2xl p-4 flex flex-col items-center justify-center gap-2 font-bold active:scale-95 transition-all">
            <ClipboardList size={24} className="text-gray-400" />
            <span className="text-sm">Ver Resumen</span>
          </button>
        </div>

        <button onClick={() => setShowEndConfirm(true)} className="mt-auto mb-4 bg-gray-900 text-white rounded-2xl p-4 font-bold active:bg-gray-800 transition-colors flex justify-center items-center gap-2">
          <LogOut size={20} /> Finalizar Ruta y Guardar
        </button>
      </div>

      {/* Modal Fin Ruta */}
      {showEndConfirm && (
        <div className="absolute inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm text-center shadow-2xl scale-in-center">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4"><AlertCircle size={32} /></div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">¿Terminar Ruta?</h3>
            <p className="text-gray-500 mb-6 text-sm">Al terminar, se cerrará la caja del día y se guardará el historial de todas las facturas y cobros en el servidor central.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowEndConfirm(false)} className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-bold active:bg-gray-200">Cancelar</button>
              <button onClick={handleEndRoute} className="flex-1 bg-red-600 text-white py-3 rounded-xl font-bold shadow-lg shadow-red-600/30 active:bg-red-700">Sí, terminar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Nuevo Gasto (Repartidor) */}
      {showExpenseModal && (
        <div className="absolute inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-sm shadow-2xl slide-in-from-bottom-full sm:slide-in-from-bottom-0 flex flex-col">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-red-50 rounded-t-3xl">
              <div>
                <h3 className="font-bold text-red-900 text-lg flex items-center gap-2"><TrendingDown size={20}/> Registrar Gasto</h3>
                <p className="text-xs text-red-700">El dinero se restará de tu caja diaria.</p>
              </div>
              <button onClick={() => setShowExpenseModal(false)} className="text-red-400 hover:bg-red-100 p-2 rounded-full"><X size={20}/></button>
            </div>
            
            <form onSubmit={handleSaveExpense} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Categoría</label>
                <select value={expCategory} onChange={e => setExpCategory(e.target.value)} className="w-full bg-gray-50 border border-gray-300 text-gray-900 rounded-xl focus:ring-red-500 p-3 font-bold">
                  <option value="Combustible">Combustible</option>
                  <option value="Reparación / Taller">Reparación / Taller</option>
                  <option value="Peaje">Peaje</option>
                  <option value="Varios">Varios (Detallar)</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Monto Gastado</label>
                <div className="relative">
                  <span className="absolute left-3 top-3 font-bold text-gray-500">$</span>
                  <input type="number" step="any" required value={expAmount} onChange={e => setExpAmount(e.target.value)} className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-xl text-xl font-black focus:ring-2 focus:ring-red-500 focus:border-red-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" placeholder="0" />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Descripción breve</label>
                <input type="text" required value={expDesc} onChange={e => setExpDesc(e.target.value)} placeholder="Ej: Gomero rueda trasera" className="w-full py-3 px-4 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-red-500" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">¿De dónde salió el dinero?</label>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setExpMethod('efectivo')} className={`flex-1 py-3 rounded-xl border-2 font-bold text-sm flex items-center justify-center gap-2 transition-colors ${expMethod === 'efectivo' ? 'bg-green-50 border-green-500 text-green-700' : 'border-gray-200 text-gray-500'}`}><Banknote size={16}/> Efectivo</button>
                  <button type="button" onClick={() => setExpMethod('transferencia')} className={`flex-1 py-3 rounded-xl border-2 font-bold text-sm flex items-center justify-center gap-2 transition-colors ${expMethod === 'transferencia' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'border-gray-200 text-gray-500'}`}><CreditCard size={16}/> Transferencia</button>
                </div>
              </div>
              
              <button type="submit" className="w-full mt-4 bg-red-600 hover:bg-red-700 text-white py-4 rounded-xl font-bold shadow-lg active:bg-red-800 transition-colors flex justify-center items-center gap-2">
                <CheckCircle size={20}/> Guardar y Descontar
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function DriverClients({ db, driverId, todayName, onBack, onSelectClient }) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredClients = useMemo(() => {
    const routeIds = db.weeklyRoutes[todayName]?.[driverId] || [];
    return routeIds
      .map(id => db.clients.find(c => c.id === id))
      .filter(Boolean)
      .filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.address.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [db.clients, db.weeklyRoutes, driverId, todayName, searchTerm]);

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="bg-white px-4 py-4 flex items-center gap-3 border-b border-gray-200 sticky top-0 z-10">
        <button onClick={onBack} className="p-2 -ml-2 text-gray-500 active:bg-gray-100 rounded-full"><ArrowLeft size={24} /></button>
        <h2 className="text-xl font-bold text-gray-800 flex-1">Ruta del {todayName}</h2>
      </div>
      <div className="p-4 bg-white border-b border-gray-200">
        <div className="relative">
          <Search className="absolute left-3 top-3 text-gray-400" size={20} />
          <input type="text" placeholder="Buscar en mi ruta..." className="w-full bg-gray-100 border-none rounded-xl py-3 pl-10 pr-4 focus:ring-2 focus:ring-blue-500 text-gray-800" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-24">
        {filteredClients.length === 0 ? (
           <div className="text-center text-gray-500 mt-10">
             <Map size={48} className="mx-auto mb-4 text-gray-300" />
             <p className="font-semibold text-lg">Tu hoja de ruta está vacía</p>
             <p className="text-sm">El administrador aún no te ha asignado clientes para hoy.</p>
           </div>
        ) : (
          filteredClients.map((client, idx) => (
            <div key={client.id} onClick={() => onSelectClient(client)} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-4 active:scale-95 transition-transform cursor-pointer">
              <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-lg flex-shrink-0">{idx + 1}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-gray-800 truncate">{client.name}</h3>
                  {client.allowCredit && <span className="bg-blue-100 text-blue-700 text-[10px] px-2 py-0.5 rounded-full font-bold whitespace-nowrap">Cta. Cte.</span>}
                </div>
                <p className="text-sm text-gray-500 truncate flex items-center gap-1"><MapPin size={12} /> {client.address}</p>
              </div>
              {client.debt > 0 ? (
                <div className="bg-red-50 text-red-700 px-2 py-1 rounded-lg border border-red-100 flex flex-col items-end"><span className="text-[10px] font-bold uppercase">Deuda</span><span className="text-sm font-bold">${client.debt}</span></div>
              ) : client.debt < 0 ? (
                <div className="bg-green-50 text-green-700 px-2 py-1 rounded-lg border border-green-100 flex flex-col items-end"><span className="text-[10px] font-bold uppercase">A Favor</span><span className="text-sm font-bold">${Math.abs(client.debt)}</span></div>
              ) : (<ChevronRight size={20} className="text-gray-400" />)}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function DriverTerminal({ client, db, setDb, driverId, todayName, onBack, onComplete }) {
  const [tab, setTab] = useState(1); 
  const [generatedTicket, setGeneratedTicket] = useState(null);
  const [returns, setReturns] = useState({});
  const [cart, setCart] = useState(client?.fixedOrder ? { ...client.fixedOrder } : {});
  const [includeDebt, setIncludeDebt] = useState(false);
  
  // PAGOS MIXTOS
  const [payCash, setPayCash] = useState('');
  const [payTransfer, setPayTransfer] = useState('');

  const getPrice = (product) => client.category === 'A' ? product.priceA : product.priceB;
  
  const totalReturns = useMemo(() => Object.entries(returns).reduce((acc, [id, qty]) => { const p = db.products.find(p => p.id === parseInt(id)); return acc + (p ? getPrice(p) * qty : 0); }, 0), [returns, db.products, client.category]);
  const subtotalSales = useMemo(() => Object.entries(cart).reduce((acc, [id, qty]) => { const p = db.products.find(p => p.id === parseInt(id)); return acc + (p ? getPrice(p) * qty : 0); }, 0), [cart, db.products, client.category]);
  
  // El Total visual que se le muestra al cliente en la boleta
  const finalTotal = subtotalSales - totalReturns + (includeDebt && client.debt > 0 ? client.debt : 0);

  // Cálculos de Pagos Mixtos
  const cashAmt = parseFloat(payCash) || 0;
  const transferAmt = parseFloat(payTransfer) || 0;
  const totalPaid = cashAmt + transferAmt;
  const remainingToPay = finalTotal - totalPaid;
  const willAddToDebt = (subtotalSales - totalReturns) - totalPaid; // Lo que REALMENTE cambia en la base de datos de deuda hoy

  const handleUpdateQty = (obj, setObj, productId, delta, isKg, maxStock = null) => {
    setObj(prev => {
      const current = prev[productId] || 0;
      let step = isKg ? 0.5 : 1;
      let next = current + (delta * step);
      if (next < 0) next = 0;
      if (maxStock !== null && next > maxStock) next = maxStock;
      const newObj = { ...prev };
      if (next === 0) delete newObj[productId]; else newObj[productId] = next;
      return newObj;
    });
  };

  const setExactQty = (obj, setObj, productId, val, maxStock = null) => {
    let next = parseFloat(val);
    if (isNaN(next) || next < 0) next = 0;
    if (maxStock !== null && next > maxStock) next = maxStock;
    setObj(prev => {
      const newObj = { ...prev };
      if (next === 0) delete newObj[productId]; else newObj[productId] = next;
      return newObj;
    });
  };

  const handleProcessSale = () => {
    // 1. Descuento de Stock
    const updatedTruckLoads = { ...db.weeklyLoads };
    updatedTruckLoads[todayName] = { ...updatedTruckLoads[todayName] };
    updatedTruckLoads[todayName][driverId] = { ...(updatedTruckLoads[todayName][driverId] || {}) };
    
    db.products.forEach(p => {
      if (cart[p.id]) {
        updatedTruckLoads[todayName][driverId][p.id] = Math.max(0, (updatedTruckLoads[todayName][driverId][p.id] || 0) - cart[p.id]);
      }
    });

    // 2. Cálculo matemático exacto de la nueva deuda del cliente (Pagos Mixtos)
    const newDebt = client.debt + willAddToDebt;
    const updatedClients = db.clients.map(c => c.id === client.id ? { ...c, debt: newDebt } : c);
    
    // 3. Actualización de las finanzas del chofer
    const driverObj = db.drivers.find(d => d.id === driverId);
    const updatedDrivers = db.drivers.map(d => {
      if(d.id === driverId) {
        return {
          ...d,
          totalSales: d.totalSales + subtotalSales,
          cash: d.cash + cashAmt,
          transfer: d.transfer + transferAmt,
          visitsDone: d.visitsDone + 1
        };
      }
      return d;
    });
    
    const ticketData = {
      id: Math.floor(Math.random() * 900000) + 100000,
      date: new Date().toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' }),
      clientId: client.id,
      clientName: client.name,
      driverName: driverObj?.name || 'Desconocido',
      items: Object.entries(cart).map(([id, qty]) => { const p = db.products.find(p => p.id === parseInt(id)); return { name: p.name, qty, price: getPrice(p), total: getPrice(p) * qty }; }),
      returns: Object.entries(returns).map(([id, qty]) => { const p = db.products.find(p => p.id === parseInt(id)); return { name: p.name, qty, price: getPrice(p), total: getPrice(p) * qty }; }),
      subtotalSales, totalReturns, prevDebt: client.debt, includeDebt, finalTotal, 
      payCash: cashAmt, payTransfer: transferAmt, balanceAdded: willAddToDebt
    };

    setDb(prev => ({
      ...prev,
      weeklyLoads: updatedTruckLoads,
      clients: updatedClients,
      drivers: updatedDrivers,
      sales: [ticketData, ...prev.sales],
      todayMetrics: {
        ...prev.todayMetrics,
        totalSales: prev.todayMetrics.totalSales + subtotalSales,
        cash: prev.todayMetrics.cash + cashAmt,
        transfer: prev.todayMetrics.transfer + transferAmt,
      }
    }));

    setGeneratedTicket(ticketData);
  };

  const handleShareWhatsApp = () => {
    if (!generatedTicket) return;
    let text = `🍞 *PANIFICADORA SYSTEM*\n🎫 Ticket #${generatedTicket.id}\n👤 Cliente: ${generatedTicket.clientName}\n📅 Fecha: ${generatedTicket.date}\n--------------------------------\n`;
    if (generatedTicket.items.length > 0) { text += `*VENTA:*\n`; generatedTicket.items.forEach(item => text += `${item.qty}x ${item.name} - $${item.total}\n`); }
    if (generatedTicket.returns.length > 0) { text += `*DEVOLUCIONES:*\n`; generatedTicket.returns.forEach(item => text += `-${item.qty}x ${item.name} - -$${item.total}\n`); }
    text += `--------------------------------\n*TOTAL BOLETA: $${generatedTicket.finalTotal}*\n`;
    if (generatedTicket.payCash > 0) text += `💵 Abonó Efectivo: $${generatedTicket.payCash}\n`;
    if (generatedTicket.payTransfer > 0) text += `💳 Abonó Transf.: $${generatedTicket.payTransfer}\n`;
    if (generatedTicket.balanceAdded !== 0) text += `📝 A Cuenta Corriente: $${generatedTicket.balanceAdded}\n`;
    text += `Gracias por su compra!`;
    
    const phoneParam = client.phone ? client.phone : '';
    window.open(`https://wa.me/${phoneParam}?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleShareEmail = () => {
    if (!generatedTicket) return;
    const subject = encodeURIComponent(`Comprobante de Compra #${generatedTicket.id} - Panificadora`);
    const body = encodeURIComponent(`Adjuntamos los detalles de su compra.\n\nTotal Boleta: $${generatedTicket.finalTotal}\nAbonado Efectivo: $${generatedTicket.payCash}\nAbonado Transferencia: $${generatedTicket.payTransfer}\n\nGracias por su compra.`);
    const emailParam = client.email ? client.email : '';
    window.open(`mailto:${emailParam}?subject=${subject}&body=${body}`, '_blank');
  };

  if (generatedTicket) {
    return (
      <div className="flex flex-col h-full bg-gray-200">
        <div className="bg-green-600 text-white p-4 flex items-center justify-center gap-2 shadow-md z-10"><CheckCircle size={24} /><h2 className="font-bold text-lg">Venta Registrada</h2></div>
        <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center">
          <div className="bg-[#fdfbf7] w-full max-w-[320px] p-6 shadow-xl text-sm font-mono text-gray-800 border-t-4 border-dashed border-gray-300 relative">
            <div className="absolute top-[-4px] left-0 right-0 h-1 bg-transparent border-t-4 border-dashed border-gray-200" />
            <div className="text-center mb-4">
              <h1 className="font-bold text-lg mb-1">PANIFICADORA</h1><p className="text-xs text-gray-500">Comprobante de Venta</p><p className="text-xs text-gray-500">Ticket #{generatedTicket.id}</p><p className="text-xs text-gray-500">{generatedTicket.date}</p>
            </div>
            <div className="border-b-2 border-dotted border-gray-400 mb-2 pb-2"><p className="font-bold">CLIENTE:</p><p>{generatedTicket.clientName}</p></div>
            {generatedTicket.items.length > 0 && (
              <div className="mb-2">
                <div className="flex justify-between font-bold text-xs border-b border-gray-300 pb-1 mb-1"><span>CANT x ITEM</span><span>TOTAL</span></div>
                {generatedTicket.items.map((item, idx) => (<div key={idx} className="flex justify-between text-xs mb-1"><span>{item.qty}x {item.name}</span><span>${item.total}</span></div>))}
              </div>
            )}
            {generatedTicket.returns.length > 0 && (
              <div className="mb-2 text-red-700">
                <div className="flex justify-between font-bold text-xs border-b border-gray-300 pb-1 mb-1"><span>DEVOLUCIONES</span><span>TOTAL</span></div>
                {generatedTicket.returns.map((item, idx) => (<div key={idx} className="flex justify-between text-xs mb-1"><span>-{item.qty}x {item.name}</span><span>-${item.total}</span></div>))}
              </div>
            )}
            <div className="border-t-2 border-dotted border-gray-400 mt-2 pt-2 text-xs">
              <div className="flex justify-between mb-1"><span>Subtotal Venta:</span><span>${generatedTicket.subtotalSales}</span></div>
              {generatedTicket.totalReturns > 0 && <div className="flex justify-between mb-1 text-red-700"><span>Total Devoluciones:</span><span>-${generatedTicket.totalReturns}</span></div>}
              {generatedTicket.includeDebt && generatedTicket.prevDebt > 0 && <div className="flex justify-between mb-1"><span>Deuda Previa Pagada:</span><span>${generatedTicket.prevDebt}</span></div>}
            </div>
            <div className="border-t-2 border-gray-800 mt-2 pt-2 mb-4">
              <div className="flex justify-between items-center text-lg font-bold mb-2"><span>TOTAL BOLETA:</span><span>${generatedTicket.finalTotal}</span></div>
              <div className="text-xs text-gray-600 space-y-1">
                {generatedTicket.payCash > 0 && <div className="flex justify-between"><span>Abonó Efectivo:</span><span>${generatedTicket.payCash}</span></div>}
                {generatedTicket.payTransfer > 0 && <div className="flex justify-between"><span>Abonó Transf.:</span><span>${generatedTicket.payTransfer}</span></div>}
                {generatedTicket.balanceAdded !== 0 && <div className={`flex justify-between font-bold ${generatedTicket.balanceAdded > 0 ? 'text-orange-600' : 'text-green-600'}`}><span>{generatedTicket.balanceAdded > 0 ? 'A Cta. Cte.:' : 'Saldo a Favor:'}</span><span>${Math.abs(generatedTicket.balanceAdded)}</span></div>}
              </div>
            </div>
            <div className="text-center text-xs text-gray-500 mt-6"><p>*** GRACIAS POR SU COMPRA ***</p></div>
            <div className="absolute bottom-[-4px] left-0 right-0 h-1 bg-transparent border-b-4 border-dashed border-[#fdfbf7]" />
          </div>
        </div>
        <div className="bg-white p-4 pb-safe space-y-3 shadow-[0_-10px_20px_rgba(0,0,0,0.05)] z-10">
          <button onClick={handleShareWhatsApp} className="w-full bg-[#25D366] text-white font-bold text-lg py-3 rounded-xl flex justify-center items-center gap-2 active:bg-green-600 transition-colors"><MessageCircle size={24} /> Compartir por WhatsApp</button>
          <button onClick={handleShareEmail} className="w-full bg-gray-100 text-gray-700 border border-gray-200 font-bold text-lg py-3 rounded-xl flex justify-center items-center gap-2 active:bg-gray-200 transition-colors"><Mail size={24} /> Enviar por Email</button>
          <button onClick={onComplete} className="w-full mt-2 bg-gray-900 text-white font-bold text-lg py-4 rounded-xl flex justify-center items-center gap-2 active:bg-gray-800 transition-colors">Volver a la Ruta</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="bg-white pt-4 pb-2 px-4 shadow-sm z-20">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={onBack} className="p-2 -ml-2 text-gray-500 rounded-full bg-gray-100"><ArrowLeft size={20} /></button>
          <div className="flex-1 min-w-0"><h2 className="text-lg font-bold text-gray-800 truncate">{client.name}</h2><p className="text-xs text-gray-500">Categoría {client.category}</p></div>
          <div className="text-right"><div className="text-xs text-gray-500 uppercase">Subtotal</div><div className="text-lg font-bold text-blue-600">${subtotalSales}</div></div>
        </div>
        <div className="flex rounded-xl bg-gray-100 p-1 relative">
          <button onClick={() => setTab(1)} className={`flex-1 py-2 text-sm font-semibold rounded-lg z-10 transition-colors ${tab === 1 ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}>1. Venta</button>
          <button onClick={() => setTab(2)} className={`flex-1 py-2 text-sm font-semibold rounded-lg z-10 transition-colors ${tab === 2 ? 'bg-white shadow text-red-600' : 'text-gray-500'}`}>2. Devolución</button>
          <button onClick={() => setTab(3)} className={`flex-1 py-2 text-sm font-semibold rounded-lg z-10 transition-colors ${tab === 3 ? 'bg-white shadow text-green-600' : 'text-gray-500'}`}>3. Cierre</button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 pb-32">
        {tab === 1 && (
          <div className="space-y-3">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-4 flex items-center justify-between"><div className="flex items-center gap-2"><Package className="text-blue-600" size={20} /><h3 className="font-bold text-blue-800 text-sm">Despacho de Productos</h3></div></div>
            {Object.keys(client?.fixedOrder || {}).length > 0 && (
               <div className="text-xs text-blue-600 font-semibold mb-2 bg-blue-100 p-2 rounded-lg text-center flex justify-center items-center gap-2"><Star size={14}/> Cantidades auto-completadas según Pedido Fijo</div>
            )}
            {db.products.map(p => {
              const qty = cart[p.id] || 0;
              const isKg = p.unit === 'kg';
              const truckStockVal = db.weeklyLoads[todayName]?.[driverId]?.[p.id] || 0;
              const isLowStock = truckStockVal < 5;
              return (
                <div key={p.id} className={`bg-white p-4 rounded-2xl border transition-colors ${qty > 0 ? 'border-blue-500 ring-1 ring-blue-500 shadow-md' : 'border-gray-200'}`}>
                  <div className="flex justify-between mb-3">
                    <div><h4 className="font-bold text-gray-800 text-lg leading-tight">{p.name}</h4><div className="flex items-center gap-2 mt-1"><span className="text-sm font-semibold text-blue-600">${getPrice(p)}</span><span className="text-xs text-gray-400">x {p.unit}</span></div></div>
                    <div className="text-right">
                      <div className={`text-xs font-bold px-2 py-1 rounded border ${isLowStock ? 'bg-orange-50 text-orange-600 border-orange-200' : 'bg-gray-100 text-gray-600 border-gray-200'}`}>Stock: {truckStockVal} {p.unit}</div>
                      {qty > 0 && <div className="font-bold text-gray-800 mt-2">${getPrice(p) * qty}</div>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mt-2">
                    <button onClick={() => handleUpdateQty(cart, setCart, p.id, -1, isKg, truckStockVal)} className="w-14 h-14 bg-gray-100 text-gray-600 rounded-2xl flex items-center justify-center active:bg-gray-200 shadow-sm"><Minus size={28} /></button>
                    <input type="number" step={isKg ? "0.1" : "1"} min="0" value={qty || ''} onChange={(e) => setExactQty(cart, setCart, p.id, e.target.value, truckStockVal)} placeholder="0" className="flex-1 h-14 text-center text-2xl font-bold bg-white border-2 border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-500 shadow-inner outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                    <button onClick={() => handleUpdateQty(cart, setCart, p.id, 1, isKg, truckStockVal)} disabled={qty >= truckStockVal} className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm ${qty >= truckStockVal ? 'bg-gray-100 text-gray-300' : 'bg-blue-100 text-blue-600 active:bg-blue-200'}`}><Plus size={28} /></button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {tab === 2 && (
          <div className="space-y-3">
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4 flex items-start gap-3"><CornerDownLeft className="text-red-500 mt-0.5" size={20} /><div><h3 className="font-bold text-red-800 text-sm">Mercadería Devuelta</h3><p className="text-xs text-red-600">Se descontará del total de la boleta actual.</p></div></div>
            {db.products.map(p => {
              const qty = returns[p.id] || 0;
              const isKg = p.unit === 'kg';
              return (
                <div key={p.id} className={`bg-white p-4 rounded-2xl border transition-colors ${qty > 0 ? 'border-red-400 ring-1 ring-red-400' : 'border-gray-200'}`}>
                  <div className="flex justify-between mb-3"><div><h4 className="font-bold text-gray-800">{p.name}</h4><p className="text-xs text-gray-500">${getPrice(p)} x {p.unit}</p></div>{qty > 0 && <div className="font-bold text-red-600">${getPrice(p) * qty}</div>}</div>
                  <div className="flex items-center gap-3">
                    <button onClick={() => handleUpdateQty(returns, setReturns, p.id, -1, isKg)} className="w-12 h-12 bg-red-100 text-red-600 rounded-xl flex items-center justify-center active:bg-red-200"><Minus size={24} /></button>
                    <input type="number" step={isKg ? "0.1" : "1"} min="0" value={qty || ''} onChange={(e) => setExactQty(returns, setReturns, p.id, e.target.value)} placeholder="0" className="flex-1 h-12 text-center text-xl font-bold bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                    <button onClick={() => handleUpdateQty(returns, setReturns, p.id, 1, isKg)} className="w-12 h-12 bg-red-100 text-red-600 rounded-xl flex items-center justify-center active:bg-red-200"><Plus size={24} /></button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {tab === 3 && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
              <h3 className="font-bold text-gray-800 mb-4 border-b pb-2">Resumen de Factura</h3>
              <div className="flex justify-between items-center mb-2"><span className="text-gray-600">Subtotal Venta</span><span className="font-semibold">${subtotalSales}</span></div>
              {totalReturns > 0 && <div className="flex justify-between items-center mb-2 text-red-500"><span>Devoluciones</span><span>- ${totalReturns}</span></div>}
              {client.debt !== 0 && (
                <div className="flex justify-between items-center py-3 border-t border-b border-gray-100 my-3">
                  <div><span className="text-gray-800 font-semibold">{client.debt > 0 ? 'Deuda Previa' : 'Saldo a Favor'}</span><p className="text-xs text-gray-500">{client.debt > 0 ? '¿Incluir en esta boleta?' : 'Se aplicará automáticamente'}</p></div>
                  {client.debt > 0 ? (<div className="flex items-center gap-2"><span className="font-semibold text-orange-600">${client.debt}</span><input type="checkbox" className="w-6 h-6 rounded text-blue-600 focus:ring-blue-500" checked={includeDebt} onChange={(e) => setIncludeDebt(e.target.checked)} /></div>) : (<span className="font-semibold text-green-600">-${Math.abs(client.debt)}</span>)}
                </div>
              )}
              <div className="flex justify-between items-end mt-4 pt-4 border-t-2 border-gray-800"><span className="text-lg font-bold text-gray-800">TOTAL BOLETA</span><span className="text-3xl font-black text-blue-600">${finalTotal}</span></div>
            </div>
            
            <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
              <h3 className="font-bold text-gray-800 mb-3">Medios de Cobro</h3>
              
              <div className="space-y-3">
                {/* Cobro Mixto Efectivo */}
                <div className="flex items-center justify-between bg-gray-50 p-3 rounded-xl border border-gray-200">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-green-100 text-green-600 flex items-center justify-center"><Banknote size={20}/></div>
                    <span className="font-bold text-gray-800">Efectivo</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => { setPayCash(finalTotal > 0 ? finalTotal : 0); setPayTransfer(''); }}
                      className="bg-green-100 text-green-700 px-2 py-1.5 rounded-lg text-[10px] font-bold uppercase hover:bg-green-200 active:scale-95 transition-transform"
                    >
                      Total
                    </button>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 font-bold text-gray-500">$</span>
                      <input type="number" min="0" value={payCash} onChange={e => setPayCash(e.target.value)} className="w-28 py-2 pl-7 pr-3 border border-gray-300 rounded-lg text-right font-bold focus:ring-2 focus:ring-green-500 text-lg outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" placeholder="0" />
                    </div>
                  </div>
                </div>

                {/* Cobro Mixto Transferencia */}
                <div className="flex items-center justify-between bg-gray-50 p-3 rounded-xl border border-gray-200">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center"><CreditCard size={20}/></div>
                    <span className="font-bold text-gray-800">Transf.</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => { setPayTransfer(finalTotal > 0 ? finalTotal : 0); setPayCash(''); }}
                      className="bg-blue-100 text-blue-700 px-2 py-1.5 rounded-lg text-[10px] font-bold uppercase hover:bg-blue-200 active:scale-95 transition-transform"
                    >
                      Total
                    </button>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 font-bold text-gray-500">$</span>
                      <input type="number" min="0" value={payTransfer} onChange={e => setPayTransfer(e.target.value)} className="w-28 py-2 pl-7 pr-3 border border-gray-300 rounded-lg text-right font-bold focus:ring-2 focus:ring-blue-500 text-lg outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" placeholder="0" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Cálculo Restante a Cta Cte */}
              {remainingToPay !== 0 && (
                <div className={`mt-4 p-3 rounded-xl border ${remainingToPay > 0 ? 'bg-orange-50 border-orange-200' : 'bg-green-50 border-green-200'}`}>
                  <div className="flex justify-between items-center">
                    <span className={`text-sm font-bold ${remainingToPay > 0 ? 'text-orange-800' : 'text-green-800'}`}>
                      {remainingToPay > 0 ? 'Resta a Pagar (A Cta. Cte.):' : 'Vuelto / Saldo a Favor:'}
                    </span>
                    <span className={`text-lg font-black ${remainingToPay > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                      ${Math.abs(remainingToPay)}
                    </span>
                  </div>
                  {remainingToPay > 0 && !client.allowCredit && (
                    <p className="text-xs text-red-600 mt-1 font-semibold flex items-center gap-1"><AlertCircle size={12}/> El cliente no tiene crédito habilitado.</p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200 pb-safe shadow-[0_-10px_20px_rgba(0,0,0,0.05)]">
        {tab < 3 ? (<button onClick={() => setTab(tab + 1)} className="w-full bg-gray-900 text-white font-bold text-lg py-4 rounded-2xl active:bg-gray-800 transition-colors">Siguiente Paso</button>) : (<button onClick={handleProcessSale} disabled={(subtotalSales === 0 && totalReturns === 0) || (remainingToPay > 0 && !client.allowCredit)} className="w-full bg-blue-600 text-white font-bold text-lg py-4 rounded-2xl flex justify-center items-center gap-2 active:bg-blue-700 transition-colors disabled:opacity-50"><Printer size={24} /> Generar Factura e Imprimir</button>)}
      </div>
    </div>
  );
}

// ============================================================================
// MÓDULO ADMINISTRADOR (ESCRITORIO / WEB)
// ============================================================================
function AdminApp({ db, setDb, todayName, onLogout }) {
  const [adminView, setAdminView] = useState('DASHBOARD'); 

  const renderContent = () => {
    switch (adminView) {
      case 'DASHBOARD': return <AdminDashboard db={db} />;
      case 'POS': return <AdminPOS db={db} setDb={setDb} />;
      case 'DRIVERS': return <AdminDrivers db={db} setDb={setDb} />;
      case 'CLIENTS': return <AdminClients db={db} setDb={setDb} />;
      case 'EXPENSES': return <AdminExpenses db={db} setDb={setDb} />;
      case 'ROUTES': return <AdminRoutes db={db} setDb={setDb} todayName={todayName} />;
      case 'ORDERS': return <AdminOrders db={db} setDb={setDb} todayName={todayName} />;
      case 'STOCK': return <AdminStock db={db} setDb={setDb} />;
      case 'PRODUCTS': return <AdminProducts db={db} />;
      default: return <AdminDashboard db={db} />;
    }
  };

  return (
    <div className="min-h-screen flex bg-gray-100 font-sans">
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col">
        <div className="h-16 flex items-center px-6 bg-slate-950 font-bold text-white text-xl gap-2 tracking-tight">
          <Truck size={24} className="text-blue-500" /> Panificadora
        </div>
        <nav className="flex-1 py-6 space-y-1 overflow-y-auto">
          {[
            { id: 'DASHBOARD', label: 'Panel General', icon: TrendingUp },
            { id: 'POS', label: 'Ventas en Local', icon: Store },
            { id: 'DRIVERS', label: 'Monitoreo Flota', icon: Activity },
            { id: 'CLIENTS', label: 'Clientes y Cuentas', icon: Users },
            { id: 'EXPENSES', label: 'Gastos y Salidas', icon: Wallet },
            { id: 'ROUTES', label: 'Rutas por Día', icon: Calendar },
            { id: 'ORDERS', label: 'Pedidos y Cargas', icon: ClipboardCheck },
            { id: 'STOCK', label: 'Stock Fábrica', icon: ClipboardList },
            { id: 'PRODUCTS', label: 'Catálogo y Precios', icon: Package },
          ].map(item => (
            <button key={item.id} onClick={() => setAdminView(item.id)} className={`w-full flex items-center gap-3 px-6 py-3 text-sm font-medium transition-colors ${adminView === item.id ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 hover:text-white'}`}>
              <item.icon size={18} /> {item.label}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-white font-bold">A</div>
            <div><div className="text-sm font-bold text-white">Admin Central</div><div className="text-xs text-slate-500">Online</div></div>
          </div>
          <button onClick={onLogout} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-400 hover:bg-slate-800 rounded-lg transition-colors"><LogOut size={16} /> Cerrar Sesión</button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8">
          <h2 className="text-xl font-bold text-gray-800">
            {adminView === 'DASHBOARD' && 'Panel General Financiero'}
            {adminView === 'POS' && 'Punto de Venta (Mostrador)'}
            {adminView === 'DRIVERS' && 'Monitoreo en Vivo de Repartidores'}
            {adminView === 'CLIENTS' && 'Gestión de Clientes y Cuentas Corrientes'}
            {adminView === 'EXPENSES' && 'Control de Gastos Operativos'}
            {adminView === 'ROUTES' && 'Planificación Semanal de Rutas'}
            {adminView === 'ORDERS' && 'Pedidos y Carga de Camionetas'}
            {adminView === 'STOCK' && 'Control de Stock (Post-Envasado)'}
            {adminView === 'PRODUCTS' && 'Catálogo de Productos y Precios'}
          </h2>
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span>Hoy es <strong>{todayName}</strong></span>
          </div>
        </header>
        <div className="flex-1 overflow-auto p-8 bg-gray-50">{renderContent()}</div>
      </main>
    </div>
  );
}

// ---------------------------------------------------------
// NUEVA PANTALLA A.8: GASTOS Y SALIDAS (CON GRÁFICO PIZZA)
// ---------------------------------------------------------
function AdminExpenses({ db, setDb }) {
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Insumos y Materia Prima');
  const [description, setDescription] = useState('');
  const [timeFilter, setTimeFilter] = useState('daily'); // 'daily' | 'monthly'

  const CATEGORIES = [
    'Insumos y Materia Prima',
    'Sueldos y Personal',
    'Combustible',
    'Mantenimiento Vehículos',
    'Gastos Administrativos',
    'Varios'
  ];

  // Colores fijos para el gráfico según la categoría
  const PIE_COLORS = {
    'Insumos y Materia Prima': '#3b82f6', // blue
    'Sueldos y Personal': '#8b5cf6', // indigo
    'Combustible': '#f59e0b', // orange
    'Mantenimiento Vehículos': '#ef4444', // red
    'Gastos Administrativos': '#10b981', // emerald
    'Varios': '#6b7280' // gray
  };

  const handleAddExpense = (e) => {
    e.preventDefault();
    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0 || !description.trim()) return;

    const newExpense = {
      id: Math.floor(Math.random() * 900000) + 100000,
      date: new Date().toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' }),
      category,
      amount: val,
      description,
      origin: 'Administración Central',
      method: '-'
    };

    setDb(prev => ({
      ...prev,
      expenses: [newExpense, ...prev.expenses]
    }));

    setAmount('');
    setDescription('');
    alert('Gasto registrado correctamente.');
  };

  // --- LÓGICA DEL GRÁFICO (PIE CHART) ---
  const now = new Date();
  const currentD = now.getDate();
  const currentM = now.getMonth() + 1; // getMonth es 0-indexado
  const currentY = now.getFullYear();

  // Función robusta para extraer d, m, y de un string "DD/MM/YYYY, HH:MM" o similar
  const parseDateString = (dateStr) => {
      try {
          const [datePart] = dateStr.split(',');
          const parts = datePart.trim().split('/');
          if (parts.length !== 3) return null;
          
          const d = parseInt(parts[0], 10);
          const m = parseInt(parts[1], 10);
          let y = parseInt(parts[2], 10);
          
          // Manejar años de 2 dígitos (ej: 26 -> 2026)
          if (y < 100) y += 2000;
          
          return { d, m, y };
      } catch (e) {
          return null;
      }
  };

  // Filtrar los gastos según el tab seleccionado (Diario o Mensual)
  const filteredStats = useMemo(() => {
    return db.expenses.filter(exp => {
      const parsedDate = parseDateString(exp.date);
      if (!parsedDate) return false;

      const { d, m, y } = parsedDate;

      if (timeFilter === 'daily') {
        return d === currentD && m === currentM && y === currentY;
      } else {
        return m === currentM && y === currentY;
      }
    });
  }, [db.expenses, timeFilter, currentD, currentM, currentY]);

  const totalFiltered = filteredStats.reduce((acc, exp) => acc + exp.amount, 0);

  // Agrupar totales por categoría para el gráfico
  const categoryTotals = useMemo(() => {
    const totals = {};
    filteredStats.forEach(exp => {
      totals[exp.category] = (totals[exp.category] || 0) + exp.amount;
    });
    return Object.entries(totals).sort((a,b) => b[1] - a[1]); // array [category, amount]
  }, [filteredStats]);

  // Generador mágico del gráfico de Pizza (CSS Conic Gradient)
  const conicGradient = useMemo(() => {
    if (totalFiltered === 0) return 'conic-gradient(#f3f4f6 0% 100%)'; // Gris si está vacío
    let stops = [];
    let currentAngle = 0;
    categoryTotals.forEach(([cat, amount]) => {
      const percent = (amount / totalFiltered) * 100;
      const color = PIE_COLORS[cat] || '#000';
      stops.push(`${color} ${currentAngle}% ${currentAngle + percent}%`);
      currentAngle += percent;
    });
    return `conic-gradient(${stops.join(', ')})`;
  }, [categoryTotals, totalFiltered]);

  return (
    <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-6 h-full">
      {/* COLUMNA IZQUIERDA: FORMULARIO DE CARGA */}
      <div className="w-full md:w-[350px] bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden h-fit flex-shrink-0">
        <div className="p-5 border-b border-gray-100 bg-red-50 flex items-center gap-3">
          <div className="w-10 h-10 bg-red-100 text-red-600 rounded-full flex items-center justify-center">
            <TrendingDown size={20} />
          </div>
          <div>
            <h3 className="font-bold text-red-900 text-lg">Registrar Salida</h3>
            <p className="text-xs text-red-700">Ingrese un gasto general de fábrica.</p>
          </div>
        </div>
        <form onSubmit={handleAddExpense} className="p-5 space-y-4">
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Monto a descontar</label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 font-bold text-gray-500">$</span>
              <input 
                type="number" 
                step="any" 
                required 
                value={amount} 
                onChange={e => setAmount(e.target.value)} 
                className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-xl text-lg font-bold focus:ring-2 focus:ring-red-500 focus:border-red-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
                placeholder="0" 
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Categoría del Gasto</label>
            <select 
              value={category} 
              onChange={e => setCategory(e.target.value)} 
              className="w-full bg-white border border-gray-300 text-gray-900 text-sm rounded-xl focus:ring-red-500 focus:border-red-500 p-2.5 font-bold shadow-sm"
            >
              {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Descripción / Detalle</label>
            <input 
              type="text" 
              required 
              value={description} 
              onChange={e => setDescription(e.target.value)} 
              placeholder="Ej: Factura luz, Harina..." 
              className="w-full py-2 px-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500" 
            />
          </div>
          <button type="submit" className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors mt-2">
            <CheckCircle size={18} /> Guardar Gasto
          </button>
        </form>
      </div>

      {/* COLUMNA DERECHA: GRÁFICOS E HISTORIAL */}
      <div className="flex-1 flex flex-col gap-6 min-h-0">
        
        {/* PANEL DE GRÁFICO (PIE CHART) */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
              <PieChart size={20} className="text-blue-600"/> Distribución de Gastos
            </h3>
            <div className="flex bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => setTimeFilter('daily')}
                className={`px-4 py-1.5 rounded-md text-xs font-bold transition-colors ${timeFilter === 'daily' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Hoy
              </button>
              <button
                onClick={() => setTimeFilter('monthly')}
                className={`px-4 py-1.5 rounded-md text-xs font-bold transition-colors ${timeFilter === 'monthly' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Este Mes
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-8">
            {/* Gráfico Donut SVG Simulado */}
            <div 
              className="w-48 h-48 rounded-full flex items-center justify-center shadow-inner relative flex-shrink-0 transition-all duration-500 ease-in-out"
              style={{ background: conicGradient }}
            >
              <div className="w-32 h-32 bg-white rounded-full flex flex-col items-center justify-center shadow-sm absolute">
                <span className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Total</span>
                <span className="font-black text-gray-900 text-xl">${totalFiltered.toLocaleString()}</span>
              </div>
            </div>

            {/* Leyenda del Gráfico */}
            <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-48 overflow-y-auto pr-2">
              {totalFiltered === 0 ? (
                <div className="text-gray-400 text-sm italic py-4 col-span-2 text-center">No hay gastos registrados en este período.</div>
              ) : (
                categoryTotals.map(([cat, amount]) => {
                  const percent = Math.round((amount / totalFiltered) * 100);
                  return (
                    <div key={cat} className="flex items-center gap-3 bg-gray-50 p-2.5 rounded-xl border border-gray-100 hover:border-gray-300 transition-colors">
                      <div className="w-3 h-3 rounded-full flex-shrink-0 shadow-sm" style={{ backgroundColor: PIE_COLORS[cat] || '#000' }}></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-gray-800 truncate" title={cat}>{cat}</p>
                        <p className="text-[10px] text-gray-500">{percent}%</p>
                      </div>
                      <div className="font-bold text-gray-900 text-sm">
                        ${amount.toLocaleString()}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* HISTORIAL DE GASTOS TABLA */}
        <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-200 flex flex-col overflow-hidden min-h-[300px]">
          <div className="p-4 border-b border-gray-100 bg-gray-50">
            <h3 className="font-bold text-gray-900">Historial Operativo (Central y Calle)</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200 text-xs text-gray-500 uppercase">
                  <th className="px-4 py-3 font-medium">Fecha</th>
                  <th className="px-4 py-3 font-medium">Origen / Autor</th>
                  <th className="px-4 py-3 font-medium">Categoría</th>
                  <th className="px-4 py-3 font-medium">Descripción</th>
                  <th className="px-4 py-3 font-medium text-right">Monto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {db.expenses.length === 0 ? (
                  <tr><td colSpan="5" className="text-center text-gray-400 py-10">No hay gastos registrados.</td></tr>
                ) : (
                  db.expenses.map(exp => (
                    <tr key={exp.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{exp.date}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-md text-[11px] font-bold border ${exp.origin.includes('Administración') ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-orange-50 text-orange-700 border-orange-200'}`}>
                          {exp.origin}
                        </span>
                        {exp.method !== '-' && <div className="text-[10px] text-gray-400 mt-1">Pagó con: <span className="uppercase font-semibold">{exp.method}</span></div>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: PIE_COLORS[exp.category] || '#ccc' }}></span>
                          <span className="text-xs font-bold text-gray-700">{exp.category}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-800">{exp.description}</td>
                      <td className="px-4 py-3 text-right font-bold text-red-600">-${exp.amount.toLocaleString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        
      </div>
    </div>
  );
}

function AdminPOS({ db, setDb }) {
  const [clientId, setClientId] = useState(999); 
  const [cart, setCart] = useState({});
  const [payCash, setPayCash] = useState('');
  const [payTransfer, setPayTransfer] = useState('');
  const [generatedTicket, setGeneratedTicket] = useState(null);

  const client = db.clients.find(c => c.id === clientId) || db.clients[0];
  const getPrice = (product) => client.category === 'A' ? product.priceA : product.priceB;

  const subtotalSales = useMemo(() => Object.entries(cart).reduce((acc, [id, qty]) => { const p = db.products.find(p => p.id === parseInt(id)); return acc + (p ? getPrice(p) * qty : 0); }, 0), [cart, db.products, client.category]);
  
  const cashAmt = parseFloat(payCash) || 0;
  const transferAmt = parseFloat(payTransfer) || 0;
  const totalPaid = cashAmt + transferAmt;
  const remainingToPay = subtotalSales - totalPaid;

  const handleUpdateQty = (productId, delta, isKg, maxStock) => {
    setCart(prev => {
      const current = prev[productId] || 0;
      let step = isKg ? 0.5 : 1;
      let next = current + (delta * step);
      if (next < 0) next = 0;
      if (next > maxStock) next = maxStock;
      const newObj = { ...prev };
      if (next === 0) delete newObj[productId]; else newObj[productId] = next;
      return newObj;
    });
  };

  const handleProcessSale = () => {
    if (subtotalSales === 0) return;

    const updatedProducts = db.products.map(p => {
      if (cart[p.id]) return { ...p, bakeryStock: Math.max(0, p.bakeryStock - cart[p.id]) };
      return p;
    });

    const newDebt = client.debt + remainingToPay;
    const updatedClients = db.clients.map(c => c.id === client.id ? { ...c, debt: newDebt } : c);
    
    const ticketData = {
      id: Math.floor(Math.random() * 900000) + 100000,
      date: new Date().toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' }),
      clientId: client.id,
      clientName: client.name,
      driverName: 'Venta en Mostrador',
      items: Object.entries(cart).map(([id, qty]) => { const p = db.products.find(p => p.id === parseInt(id)); return { name: p.name, qty, price: getPrice(p), total: getPrice(p) * qty }; }),
      returns: [],
      subtotalSales, totalReturns: 0, prevDebt: client.debt, includeDebt: false, finalTotal: subtotalSales, 
      payCash: cashAmt, payTransfer: transferAmt, balanceAdded: remainingToPay
    };

    setDb(prev => ({
      ...prev,
      products: updatedProducts,
      clients: updatedClients,
      sales: [ticketData, ...prev.sales],
      todayMetrics: {
        ...prev.todayMetrics,
        totalSales: prev.todayMetrics.totalSales + subtotalSales,
        cash: prev.todayMetrics.cash + cashAmt,
        transfer: prev.todayMetrics.transfer + transferAmt,
      }
    }));

    setGeneratedTicket(ticketData);
  };

  if (generatedTicket) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-gray-50">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200 text-center max-w-sm">
          <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4"><CheckCircle size={40} /></div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Venta Exitosa</h2>
          <p className="text-gray-500 mb-6">El ticket #{generatedTicket.id} fue registrado en el sistema.</p>
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-6 text-left text-sm font-mono text-gray-700">
            <div className="flex justify-between font-bold border-b pb-2 mb-2"><span>Total Boleta</span><span>${generatedTicket.finalTotal}</span></div>
            <div className="flex justify-between"><span>Efectivo:</span><span>${generatedTicket.payCash}</span></div>
            <div className="flex justify-between"><span>Transf:</span><span>${generatedTicket.payTransfer}</span></div>
            {generatedTicket.balanceAdded > 0 && <div className="flex justify-between text-orange-600 font-bold mt-1"><span>A Cta. Cte:</span><span>${generatedTicket.balanceAdded}</span></div>}
          </div>
          <div className="flex gap-3">
            <button onClick={() => { setGeneratedTicket(null); setCart({}); setPayCash(''); setPayTransfer(''); }} className="flex-1 bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700">Nueva Venta</button>
            <button onClick={() => alert("Imprimiendo ticket de mostrador...")} className="flex-1 bg-gray-800 text-white font-bold py-3 rounded-xl hover:bg-gray-900 flex justify-center items-center gap-2"><Printer size={18}/> Imprimir</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full gap-6">
      <div className="flex-1 flex flex-col min-h-0 bg-white rounded-2xl shadow-sm border border-gray-200">
        <div className="p-4 border-b border-gray-200 bg-gray-50 rounded-t-2xl flex items-center gap-4">
          <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center"><Store size={20} /></div>
          <div><h3 className="font-bold text-gray-800">Catálogo de Mostrador</h3><p className="text-xs text-gray-500">Añada productos al carrito</p></div>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {db.products.map(p => {
              const qty = cart[p.id] || 0;
              const isKg = p.unit === 'kg';
              const maxStock = p.bakeryStock;
              return (
                <div key={p.id} className={`border rounded-xl p-4 transition-colors ${qty > 0 ? 'border-blue-400 bg-blue-50/20' : 'border-gray-200 hover:border-blue-300'}`}>
                  <h4 className="font-bold text-gray-800">{p.name}</h4>
                  <p className="text-sm text-blue-600 font-semibold mb-3">${getPrice(p)} <span className="text-xs text-gray-500 font-normal">x {p.unit}</span></p>
                  
                  {maxStock <= 0 ? (
                     <div className="text-xs text-red-500 font-bold bg-red-50 py-2 text-center rounded-lg">Sin Stock</div>
                  ) : (
                    <div className="flex justify-between items-center gap-2">
                      <button onClick={() => handleUpdateQty(p.id, -1, isKg, maxStock)} className="w-10 h-10 bg-gray-100 text-gray-600 rounded-lg flex items-center justify-center active:bg-gray-200"><Minus size={18}/></button>
                      <input type="number" step={isKg ? "0.1" : "1"} min="0" value={qty || ''} onChange={(e) => { let val = parseFloat(e.target.value); if(isNaN(val) || val<0) val=0; if(val>maxStock) val=maxStock; setCart(prev=>({...prev, [p.id]: val===0 ? undefined : val})); }} placeholder="0" className="w-16 h-10 text-center text-lg font-bold bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                      <button onClick={() => handleUpdateQty(p.id, 1, isKg, maxStock)} disabled={qty >= maxStock} className={`w-10 h-10 rounded-lg flex items-center justify-center ${qty >= maxStock ? 'bg-gray-100 text-gray-300' : 'bg-blue-100 text-blue-600 hover:bg-blue-200'}`}><Plus size={18}/></button>
                    </div>
                  )}
                  <p className="text-[10px] text-gray-400 text-center mt-2">Disp: {maxStock} {p.unit}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="w-[400px] flex flex-col bg-white rounded-2xl shadow-sm border border-gray-200">
        <div className="p-4 border-b border-gray-200 bg-gray-50 rounded-t-2xl">
          <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Seleccionar Cliente</label>
          <select value={clientId} onChange={(e) => { setClientId(Number(e.target.value)); setCart({}); }} className="w-full bg-white border border-gray-300 text-gray-900 text-sm rounded-xl focus:ring-blue-500 focus:border-blue-500 p-2.5 font-bold shadow-sm">
            {db.clients.map(c => <option key={c.id} value={c.id}>{c.name} {c.id===999 ? '' : `(Cat. ${c.category})`}</option>)}
          </select>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {Object.keys(cart).length === 0 ? (
            <div className="text-center text-gray-400 py-10 flex flex-col items-center"><ShoppingCart size={40} className="mb-2 opacity-50" /><p className="text-sm">El carrito está vacío</p></div>
          ) : (
            Object.entries(cart).map(([id, qty]) => {
              const p = db.products.find(p => p.id === parseInt(id));
              if (!p) return null;
              return (
                <div key={id} className="flex justify-between items-center bg-gray-50 p-3 rounded-xl border border-gray-100">
                  <div><span className="font-semibold text-gray-800 text-sm">{p.name}</span><div className="text-xs text-gray-500">{qty} x ${getPrice(p)}</div></div>
                  <span className="font-bold text-gray-800">${getPrice(p) * qty}</span>
                </div>
              );
            })
          )}
        </div>

        <div className="p-4 border-t border-gray-200 bg-gray-50 rounded-b-2xl space-y-4">
          <div className="flex justify-between items-end mb-2">
            <span className="font-bold text-gray-500 uppercase text-sm">Total Boleta</span>
            <span className="font-black text-blue-600 text-3xl">${subtotalSales}</span>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between bg-white p-2 rounded-xl border border-gray-200">
              <div className="flex items-center gap-2 px-2"><Banknote size={16} className="text-green-600"/><span className="font-bold text-gray-700 text-sm">Efectivo</span></div>
              <div className="flex items-center gap-2">
                <button onClick={() => { setPayCash(subtotalSales > 0 ? subtotalSales : 0); setPayTransfer(''); }} className="bg-green-100 text-green-700 px-2 py-1 rounded-lg text-[10px] font-bold uppercase hover:bg-green-200 active:scale-95 transition-transform">Total</button>
                <div className="relative"><span className="absolute left-2 top-1.5 font-bold text-gray-500 text-sm">$</span><input type="number" min="0" value={payCash} onChange={e => setPayCash(e.target.value)} className="w-24 py-1.5 pl-5 pr-2 border border-gray-300 rounded-lg text-right font-bold focus:ring-2 focus:ring-green-500 text-sm outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" placeholder="0" /></div>
              </div>
            </div>
            <div className="flex items-center justify-between bg-white p-2 rounded-xl border border-gray-200">
              <div className="flex items-center gap-2 px-2"><CreditCard size={16} className="text-blue-600"/><span className="font-bold text-gray-700 text-sm">Transf.</span></div>
              <div className="flex items-center gap-2">
                <button onClick={() => { setPayTransfer(subtotalSales > 0 ? subtotalSales : 0); setPayCash(''); }} className="bg-blue-100 text-blue-700 px-2 py-1 rounded-lg text-[10px] font-bold uppercase hover:bg-blue-200 active:scale-95 transition-transform">Total</button>
                <div className="relative"><span className="absolute left-2 top-1.5 font-bold text-gray-500 text-sm">$</span><input type="number" min="0" value={payTransfer} onChange={e => setPayTransfer(e.target.value)} className="w-24 py-1.5 pl-5 pr-2 border border-gray-300 rounded-lg text-right font-bold focus:ring-2 focus:ring-blue-500 text-sm outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" placeholder="0" /></div>
              </div>
            </div>
          </div>

          {remainingToPay !== 0 && (
            <div className={`p-3 rounded-xl border ${remainingToPay > 0 ? 'bg-orange-50 border-orange-200' : 'bg-green-50 border-green-200'}`}>
              <div className="flex justify-between items-center">
                <span className={`text-xs font-bold ${remainingToPay > 0 ? 'text-orange-800' : 'text-green-800'}`}>{remainingToPay > 0 ? 'Resta Pagar (Cta. Cte.):' : 'Vuelto:'}</span>
                <span className={`text-lg font-black ${remainingToPay > 0 ? 'text-orange-600' : 'text-green-600'}`}>${Math.abs(remainingToPay)}</span>
              </div>
              {remainingToPay > 0 && !client.allowCredit && <p className="text-[10px] text-red-600 mt-1 font-bold flex items-center gap-1"><AlertCircle size={10}/> Crédito no habilitado.</p>}
            </div>
          )}

          <button onClick={handleProcessSale} disabled={subtotalSales === 0 || (remainingToPay > 0 && !client.allowCredit)} className="w-full bg-blue-600 text-white font-bold text-lg py-4 rounded-xl flex justify-center items-center gap-2 active:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
            <Printer size={20} /> Cobrar e Imprimir
          </button>
        </div>
      </div>
    </div>
  );
}

function AdminDashboard({ db }) {
  // Calculamos los totales sumando la base de datos de Gastos
  const totalExpenses = db.expenses.reduce((acc, g) => acc + g.amount, 0);
  const totalSales = db.todayMetrics.totalSales;
  const netProfit = totalSales - totalExpenses;

  // Calculamos las estadísticas del Local a partir del historial de ventas central
  const localSales = useMemo(() => {
    const posSales = db.sales.filter(s => s.driverName === 'Venta en Mostrador');
    return posSales.reduce((acc, sale) => ({
      totalSales: acc.totalSales + sale.subtotalSales,
      tickets: acc.tickets + 1
    }), { totalSales: 0, tickets: 0, name: 'Ventas en Local', visitsDone: posSales.length });
  }, [db.sales]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* 3 Tarjetas Superiores: Balance Global */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border-l-4 border-blue-500 flex flex-col justify-center relative overflow-hidden">
          <TrendingUp size={60} className="absolute -right-4 -bottom-4 text-blue-50 opacity-50" />
          <h3 className="text-gray-500 text-sm font-bold uppercase mb-1">Ingresos Brutos</h3>
          <p className="text-3xl font-black text-gray-900">${totalSales.toLocaleString()}</p>
        </div>
        
        <div className="bg-white p-6 rounded-2xl shadow-sm border-l-4 border-red-500 flex flex-col justify-center relative overflow-hidden">
          <TrendingDown size={60} className="absolute -right-4 -bottom-4 text-red-50 opacity-50" />
          <h3 className="text-gray-500 text-sm font-bold uppercase mb-1">Gastos / Salidas</h3>
          <p className="text-3xl font-black text-red-600">-${totalExpenses.toLocaleString()}</p>
        </div>

        <div className={`p-6 rounded-2xl shadow-md flex flex-col justify-center relative overflow-hidden ${netProfit >= 0 ? 'bg-gradient-to-br from-green-500 to-emerald-700 text-white' : 'bg-gradient-to-br from-orange-500 to-red-700 text-white'}`}>
          <Wallet size={60} className="absolute -right-2 -bottom-2 text-white opacity-20" />
          <h3 className="text-white/80 text-sm font-bold uppercase mb-1">Ganancia Neta</h3>
          <p className="text-4xl font-black">${netProfit.toLocaleString()}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200"><h3 className="text-gray-500 text-sm font-semibold mb-2">Ventas Totales (Día)</h3><p className="text-3xl font-bold text-gray-900">${db.todayMetrics.totalSales.toLocaleString()}</p></div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200"><h3 className="text-gray-500 text-sm font-semibold mb-2 flex items-center gap-2"><Banknote size={16} className="text-green-500"/> Efectivo (Cajas)</h3><p className="text-3xl font-bold text-gray-900">${db.todayMetrics.cash.toLocaleString()}</p></div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200"><h3 className="text-gray-500 text-sm font-semibold mb-2 flex items-center gap-2"><CreditCard size={16} className="text-blue-500"/> Transf (Cajas)</h3><p className="text-3xl font-bold text-gray-900">${db.todayMetrics.transfer.toLocaleString()}</p></div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 bg-gradient-to-br from-red-50 to-white"><h3 className="text-red-600 text-sm font-semibold mb-2">Devoluciones</h3><p className="text-3xl font-bold text-red-700">12 items</p><p className="text-xs text-red-500 mt-1">- $14,500 en valor</p></div>
      </div>
      
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-800 mb-6">Rendimiento Operativo (Hoy)</h3>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="font-semibold text-gray-700 flex items-center gap-2">
                <Store size={14} className="text-blue-600"/> {localSales.name} <span className="text-gray-400 font-normal">({localSales.visitsDone} tickets emitidos)</span>
              </span>
              <span className="font-bold text-gray-900">${localSales.totalSales.toLocaleString()}</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
              <div className="h-3 rounded-full bg-indigo-500" style={{ width: '100%' }}></div>
            </div>
          </div>
          
          <div className="border-t border-gray-100 my-2 pt-2"></div>

          {db.drivers.map(ruta => {
            const percent = ruta.totalVisits === 0 ? 0 : Math.round((ruta.visitsDone / ruta.totalVisits) * 100);
            return (
            <div key={ruta.name}>
              <div className="flex justify-between text-sm mb-1">
                <span className="font-semibold text-gray-700 flex items-center gap-2">
                  <Truck size={14} className="text-gray-400"/> {ruta.name} <span className="text-gray-400 font-normal">({ruta.visitsDone}/{ruta.totalVisits} visitas)</span>
                </span>
                <span className="font-bold text-gray-900">${ruta.totalSales.toLocaleString()}</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden"><div className={`h-3 rounded-full ${percent === 100 && ruta.totalVisits > 0 ? 'bg-green-500' : 'bg-blue-500'}`} style={{ width: `${percent}%` }}></div></div>
            </div>
          )})}
        </div>
      </div>
    </div>
  );
}

function AdminProducts({ db }) {
  return (
    <div className="max-w-6xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-gray-50"><h3 className="font-bold text-gray-800">Catálogo</h3><button className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2"><Plus size={16} /> Nuevo Producto</button></div>
      <table className="w-full text-left border-collapse">
        <thead><tr className="bg-white border-b border-gray-200 text-sm text-gray-500"><th className="px-6 py-4">Producto</th><th className="px-6 py-4">Unidad</th><th className="px-6 py-4">Precio A</th><th className="px-6 py-4">Precio B</th><th className="px-6 py-4 text-right">Stock</th></tr></thead>
        <tbody className="divide-y divide-gray-100">{db.products.map(p => (<tr key={p.id} className="hover:bg-gray-50"><td className="px-6 py-4 font-bold">{p.name}</td><td className="px-6 py-4"><span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">{p.unit}</span></td><td className="px-6 py-4 font-semibold text-blue-700">${p.priceA}</td><td className="px-6 py-4 font-semibold text-indigo-700">${p.priceB}</td><td className="px-6 py-4 text-right font-bold text-gray-600">{p.bakeryStock}</td></tr>))}</tbody>
      </table>
    </div>
  );
}

function AdminStock({ db, setDb }) {
  const [productionInputs, setProductionInputs] = useState({});
  const handleStockAdd = (e) => { e.preventDefault(); setDb(prev => ({ ...prev, products: prev.products.map(p => ({ ...p, bakeryStock: p.bakeryStock + (parseFloat(productionInputs[p.id]) || 0) })) })); setProductionInputs({}); alert("Producción registrada."); };
  return (
    <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="p-6 border-b border-gray-200 bg-orange-50 flex items-start gap-4"><div className="bg-orange-100 p-3 rounded-xl text-orange-600"><ClipboardList size={24} /></div><div><h3 className="font-bold text-orange-900 text-lg">Carga de Producción</h3><p className="text-sm text-orange-700 mt-1">Ingrese el stock de la mercadería terminada.</p></div></div>
      <form onSubmit={handleStockAdd} className="p-6">
        <div className="space-y-4">{db.products.map(p => (<div key={p.id} className="flex items-center justify-between p-4 border border-gray-100 rounded-xl hover:bg-gray-50"><div className="flex-1"><div className="font-bold text-gray-800">{p.name}</div><div className="text-sm text-gray-500">Stock actual: {p.bakeryStock} {p.unit}</div></div><div className="flex items-center gap-3"><div className="text-sm font-semibold text-gray-500">+ Agregar:</div><div className="relative"><input type="number" step={p.unit === 'kg' ? 'any' : '1'} min="0" value={productionInputs[p.id] || ''} onChange={(e) => setProductionInputs(prev => ({...prev, [p.id]: e.target.value}))} className="w-32 py-2 px-3 border border-gray-300 rounded-lg text-right font-bold focus:ring-2 focus:ring-orange-500 focus:border-orange-500" /><span className="absolute right-12 top-2.5 text-gray-400 text-sm">{p.unit}</span></div></div></div>))}</div>
        <div className="mt-8 pt-6 border-t border-gray-200 flex justify-end"><button type="submit" className="bg-orange-600 hover:bg-orange-700 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 transition-colors"><CheckCircle size={20} /> Actualizar Stock</button></div>
      </form>
    </div>
  );
}

function AdminDrivers({ db, setDb }) {
  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState('');
  const handleAddDriver = (e) => { e.preventDefault(); if (!newName.trim()) return; setDb(prev => ({ ...prev, drivers: [...prev.drivers, { id: db.drivers.length > 0 ? Math.max(...db.drivers.map(d => d.id)) + 1 : 1, name: newName, status: 'En Base', isOnline: false, totalSales: 0, cash: 0, transfer: 0, visitsDone: 0, totalVisits: 0, lastActive: 'Nunca', location: 'Base' }] })); setNewName(''); setShowForm(false); };
  
  const localStats = useMemo(() => {
    const posSales = db.sales.filter(s => s.driverName === 'Venta en Mostrador');
    return posSales.reduce((acc, sale) => ({
      totalSales: acc.totalSales + sale.subtotalSales,
      cash: acc.cash + (sale.paymentMethod === 'efectivo' ? sale.finalTotal : 0),
      transfer: acc.transfer + (sale.paymentMethod === 'transferencia' ? sale.finalTotal : 0),
      tickets: acc.tickets + 1
    }), { totalSales: 0, cash: 0, transfer: 0, tickets: 0 });
  }, [db.sales]);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center"><h3 className="font-bold text-gray-800 text-xl">Gestión de Flota y Mostrador</h3><button onClick={() => setShowForm(!showForm)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors">{showForm ? <Minus size={16} /> : <Plus size={16} />} {showForm ? 'Cancelar' : 'Nuevo Repartidor'}</button></div>
      {showForm && (<form onSubmit={handleAddDriver} className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex items-center gap-4"><input type="text" placeholder="Nombre completo del repartidor..." value={newName} onChange={(e) => setNewName(e.target.value)} className="flex-1 py-2 px-4 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" autoFocus /><button type="submit" className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg text-sm font-bold flex items-center gap-2"><CheckCircle size={16} /> Guardar</button></form>)}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        
        <div className="bg-white rounded-2xl shadow-sm border-2 border-indigo-100 overflow-hidden relative">
          <div className="p-5 border-b border-indigo-50 flex justify-between items-start bg-indigo-50/30">
            <div>
              <h3 className="font-bold text-indigo-900 text-lg flex items-center gap-2"><Store size={18}/> Ventas en Local</h3>
              <div className="flex items-center gap-2 mt-1"><span className="w-2 h-2 rounded-full bg-indigo-500"></span><span className="text-xs font-semibold text-indigo-700">Mostrador Activo</span></div>
            </div>
            <div className="text-right">
              <div className="text-xs text-indigo-600/70 flex items-center gap-1 justify-end"><MapPin size={12}/> Sede Central</div>
            </div>
          </div>
          <div className="p-5 space-y-5">
            <div>
              <div className="flex justify-between text-sm mb-1"><span className="text-gray-600 font-medium">Tickets Emitidos Hoy</span><span className="font-bold text-indigo-600">{localStats.tickets}</span></div>
              <div className="w-full bg-gray-100 rounded-full h-2"><div className="h-2 rounded-full bg-indigo-500" style={{ width: '100%' }}></div></div>
            </div>
            <div className="bg-indigo-50/50 rounded-xl p-4 border border-indigo-100">
              <div className="flex justify-between items-end mb-3"><span className="text-xs text-indigo-800 font-semibold uppercase">Total Generado</span><span className="text-xl font-black text-indigo-900">${localStats.totalSales.toLocaleString()}</span></div>
              <div className="grid grid-cols-2 gap-2 border-t border-indigo-200 pt-3">
                <div><div className="text-[10px] text-indigo-600 uppercase flex items-center gap-1"><Banknote size={10}/> Efectivo</div><div className="font-bold text-indigo-800">${localStats.cash.toLocaleString()}</div></div>
                <div><div className="text-[10px] text-indigo-600 uppercase flex items-center gap-1"><CreditCard size={10}/> Transf.</div><div className="font-bold text-indigo-800">${localStats.transfer.toLocaleString()}</div></div>
              </div>
            </div>
          </div>
        </div>

        {db.drivers.map(driver => {
          const progressPercent = driver.totalVisits === 0 ? 0 : Math.round((driver.visitsDone / driver.totalVisits) * 100);
          return (
            <div key={driver.id} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden relative">
              <div className="p-5 border-b border-gray-100 flex justify-between items-start bg-gray-50"><div><h3 className="font-bold text-gray-900 text-lg">{driver.name}</h3><div className="flex items-center gap-2 mt-1"><span className={`w-2 h-2 rounded-full ${driver.isOnline ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></span><span className="text-xs font-semibold text-gray-600">{driver.status}</span></div></div><div className="text-right"><div className="text-xs text-gray-500 flex items-center gap-1 justify-end"><MapPin size={12}/> {driver.location}</div><div className="text-xs text-gray-400 flex items-center gap-1 justify-end mt-1"><Clock size={12}/> {driver.lastActive}</div></div></div>
              <div className="p-5 space-y-5">
                <div><div className="flex justify-between text-sm mb-1"><span className="text-gray-600 font-medium">Progreso de Ruta (Hoy)</span><span className="font-bold text-blue-600">{driver.visitsDone} / {driver.totalVisits}</span></div><div className="w-full bg-gray-100 rounded-full h-2"><div className={`h-2 rounded-full ${progressPercent === 100 && driver.totalVisits > 0 ? 'bg-green-500' : 'bg-blue-500'}`} style={{ width: `${progressPercent}%` }}></div></div></div>
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                  <div className="flex justify-between items-end mb-3"><span className="text-xs text-gray-500 font-semibold uppercase">Total Generado</span><span className="text-xl font-black text-gray-800">${driver.totalSales.toLocaleString()}</span></div>
                  <div className="grid grid-cols-2 gap-2 border-t border-gray-200 pt-3">
                    <div><div className="text-[10px] text-gray-500 uppercase flex items-center gap-1"><Banknote size={10}/> Efectivo</div><div className="font-bold text-green-700">${driver.cash.toLocaleString()}</div></div>
                    <div><div className="text-[10px] text-gray-500 uppercase flex items-center gap-1"><CreditCard size={10}/> Transf.</div><div className="font-bold text-blue-700">${driver.transfer.toLocaleString()}</div></div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AdminRoutes({ db, setDb, todayName }) {
  const [selectedDay, setSelectedDay] = useState(todayName);
  const [selectedDriverId, setSelectedDriverId] = useState(db.drivers[0]?.id || null);
  const [searchTerm, setSearchTerm] = useState('');

  const selectedDriver = db.drivers.find(d => d.id === selectedDriverId);
  const routeClientIds = db.weeklyRoutes[selectedDay]?.[selectedDriverId] || [];
  
  const routeClients = useMemo(() => {
    return routeClientIds.map(id => db.clients.find(c => c.id === id)).filter(Boolean);
  }, [routeClientIds, db.clients]);

  const availableClients = useMemo(() => {
    return db.clients.filter(c => c.id !== 999 && !routeClientIds.includes(c.id) && c.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [db.clients, routeClientIds, searchTerm]);

  const handleAddClientToRoute = (client) => {
    setDb(prev => {
      const currentRoute = prev.weeklyRoutes[selectedDay]?.[selectedDriverId] || [];
      return { ...prev, weeklyRoutes: { ...prev.weeklyRoutes, [selectedDay]: { ...prev.weeklyRoutes[selectedDay], [selectedDriverId]: [...currentRoute, client.id] } } };
    });
  };

  const handleRemoveFromRoute = (clientId) => {
    setDb(prev => {
      const currentRoute = prev.weeklyRoutes[selectedDay]?.[selectedDriverId] || [];
      return { ...prev, weeklyRoutes: { ...prev.weeklyRoutes, [selectedDay]: { ...prev.weeklyRoutes[selectedDay], [selectedDriverId]: currentRoute.filter(id => id !== clientId) } } };
    });
  };

  const handleMoveOrder = (index, direction) => {
    if (direction === -1 && index === 0) return;
    if (direction === 1 && index === routeClientIds.length - 1) return;
    const newArr = [...routeClientIds];
    const temp = newArr[index];
    newArr[index] = newArr[index + direction];
    newArr[index + direction] = temp;
    setDb(prev => ({ ...prev, weeklyRoutes: { ...prev.weeklyRoutes, [selectedDay]: { ...prev.weeklyRoutes[selectedDay], [selectedDriverId]: newArr } } }));
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 h-full flex flex-col">
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center"><Calendar size={24} /></div>
          <div><h3 className="font-bold text-gray-900 text-lg">Agenda de Rutas</h3><p className="text-sm text-gray-500">Diseñe la ruta para cada día de la semana.</p></div>
        </div>
        <div className="flex items-center gap-4">
          <select value={selectedDay} onChange={(e) => setSelectedDay(e.target.value)} className="bg-white border border-gray-300 text-gray-900 text-sm rounded-xl focus:ring-blue-500 focus:border-blue-500 block p-2.5 font-bold shadow-sm">
            {DAYS_OF_WEEK.map(day => <option key={day} value={day}>{day} {day === todayName ? '(Hoy)' : ''}</option>)}
          </select>
          <select value={selectedDriverId || ''} onChange={(e) => setSelectedDriverId(Number(e.target.value))} className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-xl focus:ring-blue-500 focus:border-blue-500 block p-2.5 font-bold shadow-sm">
            {db.drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1 min-h-[500px]">
        {/* COLUMNA IZQUIERDA: RUTA */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 flex flex-col overflow-hidden">
          <div className="bg-blue-50 border-b border-blue-100 p-4">
            <h4 className="font-bold text-blue-900 text-lg flex items-center justify-between"><span>Ruta del {selectedDay} ({selectedDriver?.name.split(' ')[0]})</span><span className="bg-blue-600 text-white text-xs px-2 py-1 rounded-full">{routeClients.length} Clientes</span></h4>
            <p className="text-xs text-blue-600/80 mt-1">El orden mostrado aquí es como le aparecerá en el móvil.</p>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {routeClients.length === 0 ? (
              <div className="text-center text-gray-400 py-10"><MapPin size={40} className="mx-auto mb-3 opacity-50" /><p>No hay clientes asignados para el {selectedDay}.</p></div>
            ) : (
              routeClients.map((client, index) => (
                <div key={client.id} className="bg-white border border-gray-200 rounded-xl p-3 flex items-center gap-3 shadow-sm hover:border-blue-300 transition-colors">
                  <div className="flex flex-col items-center gap-1 border-r border-gray-100 pr-3">
                    <button onClick={() => handleMoveOrder(index, -1)} disabled={index === 0} className="text-gray-400 hover:text-blue-600 disabled:opacity-30"><ArrowUp size={16} /></button>
                    <span className="font-bold text-gray-700 text-sm">{index + 1}</span>
                    <button onClick={() => handleMoveOrder(index, 1)} disabled={index === routeClients.length - 1} className="text-gray-400 hover:text-blue-600 disabled:opacity-30"><ArrowDown size={16} /></button>
                  </div>
                  <div className="flex-1 min-w-0"><h5 className="font-bold text-gray-800 truncate">{client.name}</h5><p className="text-xs text-gray-500 truncate">{client.address}</p></div>
                  <button onClick={() => handleRemoveFromRoute(client.id)} className="p-2 text-red-400 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"><X size={20} /></button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* COLUMNA DERECHA: DISPONIBLES */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 flex flex-col overflow-hidden">
          <div className="bg-gray-50 border-b border-gray-200 p-4">
            <h4 className="font-bold text-gray-800 text-lg mb-3">Buscar Clientes para Agregar</h4>
            <div className="relative"><Search className="absolute left-3 top-2.5 text-gray-400" size={18} /><input type="text" placeholder="Nombre o dirección..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-gray-400" /></div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {availableClients.map(client => (
              <div key={client.id} className="bg-gray-50 border border-gray-100 rounded-xl p-3 flex justify-between items-center hover:bg-gray-100 transition-colors">
                <div><h5 className="font-semibold text-gray-800 text-sm">{client.name}</h5><p className="text-xs text-gray-500">{client.address}</p></div>
                <button onClick={() => handleAddClientToRoute(client)} className="bg-gray-900 hover:bg-black text-white px-3 py-1.5 rounded-lg text-sm font-semibold flex items-center gap-1 transition-colors"><Plus size={14} /> Agregar</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function AdminOrders({ db, setDb, todayName }) {
  const [selectedDay, setSelectedDay] = useState(todayName);
  const [selectedDriverId, setSelectedDriverId] = useState(db.drivers[0]?.id || null);
  
  const selectedDriver = db.drivers.find(d => d.id === selectedDriverId);
  const routeClientIds = db.weeklyRoutes[selectedDay]?.[selectedDriverId] || [];
  const routeClients = useMemo(() => routeClientIds.map(id => db.clients.find(c => c.id === id)).filter(Boolean), [routeClientIds, db.clients]);
  const driverLoad = db.weeklyLoads[selectedDay]?.[selectedDriverId] || {};

  const handleUpdateLoad = (productId, value) => {
    let qty = parseFloat(value);
    if (isNaN(qty) || qty < 0) qty = 0;
    setDb(prev => ({ ...prev, weeklyLoads: { ...prev.weeklyLoads, [selectedDay]: { ...prev.weeklyLoads[selectedDay], [selectedDriverId]: { ...(prev.weeklyLoads[selectedDay]?.[selectedDriverId] || {}), [productId]: qty } } } }));
  };

  const handleAutoCalculate = () => {
    const newLoad = {};
    routeClients.forEach(client => {
      if (client.fixedOrder) {
        Object.entries(client.fixedOrder).forEach(([pId, qty]) => { newLoad[pId] = (newLoad[pId] || 0) + qty; });
      }
    });
    setDb(prev => ({ ...prev, weeklyLoads: { ...prev.weeklyLoads, [selectedDay]: { ...prev.weeklyLoads[selectedDay], [selectedDriverId]: newLoad } } }));
    alert(`Carga calculada automáticamente para el ${selectedDay} sumando los pedidos fijos de ${routeClients.length} clientes en ruta.`);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 h-full flex flex-col">
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-xl flex items-center justify-center"><ClipboardCheck size={24} /></div>
          <div><h3 className="font-bold text-gray-900 text-lg">Carga de Camionetas</h3><p className="text-sm text-gray-500">Asigne el pedido para cada día de la semana.</p></div>
        </div>
        <div className="flex items-center gap-4">
          <select value={selectedDay} onChange={(e) => setSelectedDay(e.target.value)} className="bg-white border border-gray-300 text-gray-900 text-sm rounded-xl focus:ring-orange-500 focus:border-orange-500 block p-2.5 font-bold shadow-sm">
            {DAYS_OF_WEEK.map(day => <option key={day} value={day}>{day} {day === todayName ? '(Hoy)' : ''}</option>)}
          </select>
          <select value={selectedDriverId || ''} onChange={(e) => setSelectedDriverId(Number(e.target.value))} className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-xl focus:ring-orange-500 focus:border-orange-500 block p-2.5 font-bold shadow-sm">
            {db.drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1 min-h-[500px]">
        {/* COLUMNA IZQUIERDA: CONTEXTO (HOJA DE RUTA) */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 flex flex-col overflow-hidden">
          <div className="bg-slate-50 border-b border-slate-200 p-4">
            <h4 className="font-bold text-slate-800 text-lg flex items-center justify-between"><span className="flex items-center gap-2"><MapPin size={20} className="text-slate-500"/> Clientes a Visitar el {selectedDay}</span></h4>
            <p className="text-xs text-slate-500 mt-1">Estos son los clientes en ruta. Puede auto-sumar sus pedidos fijos.</p>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {routeClients.length === 0 ? (
              <div className="text-center text-gray-400 py-10"><p>No hay ruta configurada.</p></div>
            ) : (
              routeClients.map((client, idx) => (
                <div key={client.id} className="bg-white border border-gray-100 rounded-xl p-3 flex justify-between items-center">
                  <div className="flex gap-3 items-center">
                    <span className="font-bold text-slate-400 text-sm w-4 text-center">{idx + 1}</span>
                    <div>
                      <h5 className="font-semibold text-gray-800 text-sm">{client.name}</h5>
                      <p className="text-[10px] text-orange-600 font-bold">{Object.keys(client.fixedOrder || {}).length > 0 ? 'Tiene Pedido Fijo' : 'Sin Pedido Fijo'}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="p-4 border-t border-gray-100 bg-gray-50">
            <button onClick={handleAutoCalculate} disabled={routeClients.length === 0} className="w-full bg-slate-800 hover:bg-slate-900 disabled:opacity-50 text-white font-bold py-3 rounded-xl flex justify-center items-center gap-2 transition-colors">
              <Star size={18}/> Auto-calcular según Pedidos Fijos
            </button>
          </div>
        </div>

        {/* COLUMNA DERECHA: ASIGNACIÓN DE CARGA / PEDIDO */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 flex flex-col overflow-hidden">
          <div className="bg-orange-50 border-b border-orange-200 p-4 flex justify-between items-center">
            <div><h4 className="font-bold text-orange-900 text-lg flex items-center gap-2"><Package size={20}/> Pedido a Cargar</h4></div>
            <div className="bg-orange-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg">{Object.values(driverLoad).reduce((a,b)=>a+b, 0)} Items Totales</div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {db.products.map(p => {
              const currentLoad = driverLoad[p.id] || 0;
              return (
                <div key={p.id} className={`bg-white border rounded-xl p-3 flex justify-between items-center transition-colors ${currentLoad > 0 ? 'border-orange-300 bg-orange-50/30' : 'border-gray-200'}`}>
                  <div><h5 className="font-bold text-gray-800 text-sm">{p.name}</h5><p className="text-xs text-gray-500">Stock general: {p.bakeryStock} {p.unit}</p></div>
                  <div className="flex items-center gap-2">
                    <input type="number" step={p.unit === 'kg' ? 'any' : '1'} min="0" value={currentLoad || ''} onChange={(e) => handleUpdateLoad(p.id, e.target.value)} placeholder="0" className="w-24 py-1.5 px-3 border border-gray-300 rounded-lg text-right font-bold focus:ring-2 focus:ring-orange-500 focus:border-orange-500" />
                    <span className="text-sm text-gray-500 w-12">{p.unit}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function AdminClients({ db, setDb }) {
  const [editingFixedOrder, setEditingFixedOrder] = useState(null); 
  const [tempFixedOrder, setTempFixedOrder] = useState({});
  const [clientHistoryModal, setClientHistoryModal] = useState(null); 

  const toggleCredit = (clientId) => {
    setDb(prev => ({ ...prev, clients: prev.clients.map(c => c.id === clientId ? { ...c, allowCredit: !c.allowCredit } : c) }));
  };

  const openFixedOrderModal = (client) => {
    setEditingFixedOrder(client.id);
    setTempFixedOrder(client.fixedOrder || {});
  };

  const saveFixedOrder = () => {
    const cleanedOrder = {};
    Object.entries(tempFixedOrder).forEach(([id, qty]) => {
      if (parseFloat(qty) > 0) cleanedOrder[id] = parseFloat(qty);
    });
    setDb(prev => ({ ...prev, clients: prev.clients.map(c => c.id === editingFixedOrder ? { ...c, fixedOrder: cleanedOrder } : c) }));
    setEditingFixedOrder(null);
  };

  const handleShareWhatsApp = (sale) => {
    let text = `🍞 *PANIFICADORA SYSTEM*\n🎫 Copia de Ticket #${sale.id}\n👤 Cliente: ${sale.clientName}\n📅 Fecha original: ${sale.date}\n--------------------------------\n`;
    if (sale.items.length > 0) { text += `*VENTA:*\n`; sale.items.forEach(item => text += `${item.qty}x ${item.name} - $${item.total}\n`); }
    if (sale.returns.length > 0) { text += `*DEVOLUCIONES:*\n`; sale.returns.forEach(item => text += `-${item.qty}x ${item.name} - -$${item.total}\n`); }
    text += `--------------------------------\n*TOTAL ABONADO: $${sale.finalTotal}*\n`;
    if (sale.payCash > 0) text += `💵 Abonó Efectivo: $${sale.payCash}\n`;
    if (sale.payTransfer > 0) text += `💳 Abonó Transf.: $${sale.payTransfer}\n`;
    if (sale.balanceAdded !== 0) text += `📝 A Cuenta Corriente: $${sale.balanceAdded}\n`;
    const phoneParam = clientHistoryModal.phone ? clientHistoryModal.phone : '';
    window.open(`https://wa.me/${phoneParam}?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleShareEmail = (sale) => {
    const subject = encodeURIComponent(`Copia de Comprobante #${sale.id} - Panificadora`);
    const body = encodeURIComponent(`Adjuntamos el detalle de su compra pasada (Ticket #${sale.id}).\n\nTotal: $${sale.finalTotal}\nFecha: ${sale.date}`);
    const emailParam = clientHistoryModal.email ? clientHistoryModal.email : '';
    window.open(`mailto:${emailParam}?subject=${subject}&body=${body}`, '_blank');
  };

  const handlePrint = (sale) => {
    alert(`Conectando con impresora térmica...\nEnviando copia del Ticket #${sale.id} para su impresión.`);
  };

  return (
    <div className="max-w-6xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden relative">
      <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-gray-50">
        <div className="relative w-72"><Search className="absolute left-3 top-2.5 text-gray-400" size={18} /><input type="text" placeholder="Buscar cliente..." className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" /></div>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2"><Plus size={16} /> Nuevo Cliente</button>
      </div>
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-white border-b border-gray-200 text-sm text-gray-500">
            <th className="px-6 py-4 font-medium">Cliente</th>
            <th className="px-6 py-4 font-medium">Contacto</th>
            <th className="px-6 py-4 font-medium">Cat.</th>
            <th className="px-6 py-4 font-medium text-center">Cta. Cte.</th>
            <th className="px-6 py-4 font-medium text-right">Estado de Cuenta</th>
            <th className="px-6 py-4 font-medium text-center">Configuración y Auditoría</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {db.clients.map(c => (
            <tr key={c.id} className="hover:bg-gray-50 transition-colors">
              <td className="px-6 py-4"><div className="font-bold text-gray-800">{c.name}</div><div className="text-xs text-gray-500">{c.address}</div></td>
              <td className="px-6 py-4">
                <div className="text-sm text-gray-700 flex items-center gap-1"><MessageCircle size={12}/> {c.phone || 'Sin tel.'}</div>
                <div className="text-xs text-gray-500 flex items-center gap-1"><Mail size={12}/> {c.email || 'Sin email'}</div>
              </td>
              <td className="px-6 py-4"><span className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs font-bold border border-slate-200">{c.category}</span></td>
              <td className="px-6 py-4 text-center">
                {c.id !== 999 && (
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={c.allowCredit || false} onChange={() => toggleCredit(c.id)} />
                    <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                )}
              </td>
              <td className="px-6 py-4 text-right">
                {c.debt > 0 ? <span className="text-red-600 font-bold bg-red-50 px-3 py-1 rounded-full text-sm border border-red-100">Deuda: ${c.debt}</span> : c.debt < 0 ? <span className="text-green-600 font-bold bg-green-50 px-3 py-1 rounded-full text-sm border border-green-100">A Favor: ${Math.abs(c.debt)}</span> : <span className="text-gray-500 font-semibold text-sm">Al día</span>}
              </td>
              <td className="px-6 py-4">
                <div className="flex justify-center gap-2">
                  <button onClick={() => openFixedOrderModal(c)} className="text-orange-600 hover:bg-orange-100 text-xs font-bold flex items-center justify-center gap-1 bg-orange-50 px-3 py-1.5 rounded-lg border border-orange-200 transition-colors" title="Configurar Pedido Fijo">
                    <Star size={14}/> Pedido
                  </button>
                  <button onClick={() => setClientHistoryModal(c)} className="text-blue-600 hover:bg-blue-100 text-xs font-bold flex items-center justify-center gap-1 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200 transition-colors" title="Ver Historial de Compras y Devoluciones">
                    <Receipt size={14}/> Historial
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {editingFixedOrder && (
        <div className="absolute inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl flex flex-col max-h-[80vh]">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-2xl">
              <div><h3 className="font-bold text-gray-900 text-lg">Pedido Fijo</h3><p className="text-xs text-gray-500">{db.clients.find(c=>c.id===editingFixedOrder)?.name}</p></div>
              <button onClick={() => setEditingFixedOrder(null)} className="text-gray-400 hover:bg-gray-200 p-2 rounded-full"><X size={20}/></button>
            </div>
            <div className="p-5 overflow-y-auto space-y-3">
              <p className="text-xs text-gray-500 mb-2">Define las cantidades predeterminadas. El repartidor las verá pre-cargadas al facturar.</p>
              {db.products.map(p => (
                <div key={p.id} className="flex justify-between items-center border border-gray-100 p-3 rounded-xl bg-white">
                  <span className="font-semibold text-gray-800 text-sm">{p.name}</span>
                  <div className="flex items-center gap-2">
                    <input type="number" step={p.unit === 'kg' ? 'any' : '1'} min="0" value={tempFixedOrder[p.id] || ''} onChange={(e) => setTempFixedOrder({...tempFixedOrder, [p.id]: e.target.value})} placeholder="0" className="w-20 py-1.5 px-3 border border-gray-300 rounded-lg text-right font-bold focus:ring-2 focus:ring-orange-500 focus:border-orange-500" />
                    <span className="text-xs text-gray-400 w-10">{p.unit}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-5 border-t border-gray-100 bg-gray-50 rounded-b-2xl flex gap-3">
              <button onClick={() => setEditingFixedOrder(null)} className="flex-1 bg-white border border-gray-300 text-gray-700 py-2.5 rounded-xl font-bold hover:bg-gray-50">Cancelar</button>
              <button onClick={saveFixedOrder} className="flex-1 bg-orange-600 text-white py-2.5 rounded-xl font-bold shadow-md hover:bg-orange-700 flex items-center justify-center gap-2"><CheckCircle size={18}/> Guardar Pedido</button>
            </div>
          </div>
        </div>
      )}

      {clientHistoryModal && (
        <div className="absolute inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl flex flex-col max-h-[85vh]">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-2xl">
              <div>
                <h3 className="font-bold text-gray-900 text-xl flex items-center gap-2"><FileText size={22} className="text-blue-600"/> Historial de Operaciones</h3>
                <p className="text-sm text-gray-500 font-medium">{clientHistoryModal.name}</p>
              </div>
              <button onClick={() => setClientHistoryModal(null)} className="text-gray-400 hover:bg-gray-200 p-2 rounded-full"><X size={24}/></button>
            </div>
            
            <div className="p-5 bg-slate-50 flex-1 overflow-y-auto space-y-4">
              {db.sales.filter(s => s.clientId === clientHistoryModal.id).length === 0 ? (
                <div className="text-center text-gray-400 py-12">
                  <Receipt size={48} className="mx-auto mb-3 opacity-30" />
                  <p>No hay registro de compras ni devoluciones para este cliente.</p>
                </div>
              ) : (
                db.sales.filter(s => s.clientId === clientHistoryModal.id).map(sale => (
                  <div key={sale.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                    <div className="bg-blue-50/50 p-3 border-b border-gray-100 flex justify-between items-center">
                      <div>
                        <div className="font-bold text-blue-900 text-sm">Ticket #{sale.id}</div>
                        <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5"><Clock size={12}/> {sale.date}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-semibold text-gray-500 flex items-center justify-end gap-1"><Truck size={12}/> Entregó: {sale.driverName}</div>
                      </div>
                    </div>
                    
                    <div className="p-4">
                      {sale.items.length > 0 && (
                        <div className="mb-3">
                          <h5 className="text-xs font-bold text-gray-400 uppercase mb-2 flex items-center gap-1"><ShoppingBag size={12}/> Artículos Comprados</h5>
                          <div className="space-y-1">
                            {sale.items.map((item, idx) => (
                              <div key={idx} className="flex justify-between text-sm text-gray-700">
                                <span>{item.qty}x {item.name}</span>
                                <span className="font-medium">${item.total.toLocaleString()}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {sale.returns.length > 0 && (
                        <div className="mb-3 border-t border-dashed border-gray-200 pt-3">
                          <h5 className="text-xs font-bold text-red-400 uppercase mb-2 flex items-center gap-1"><CornerDownLeft size={12}/> Devoluciones</h5>
                          <div className="space-y-1">
                            {sale.returns.map((item, idx) => (
                              <div key={idx} className="flex justify-between text-sm text-red-600">
                                <span>-{item.qty}x {item.name}</span>
                                <span className="font-medium">-${item.total.toLocaleString()}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      <div className="mt-4 pt-3 border-t-2 border-gray-800 flex justify-between items-end">
                        <span className="font-bold text-gray-800 text-sm">TOTAL ABONADO</span>
                        <span className="font-black text-blue-600 text-xl">${sale.finalTotal.toLocaleString()}</span>
                      </div>

                      <div className="mt-4 flex gap-2 pt-3 border-t border-gray-100">
                        <button onClick={() => handleShareWhatsApp(sale)} className="flex-1 bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366]/20 py-2 rounded-lg text-xs font-bold flex justify-center items-center gap-1 transition-colors">
                          <MessageCircle size={14}/> WhatsApp
                        </button>
                        <button onClick={() => handleShareEmail(sale)} className="flex-1 bg-gray-100 text-gray-600 hover:bg-gray-200 py-2 rounded-lg text-xs font-bold flex justify-center items-center gap-1 transition-colors">
                          <Mail size={14}/> Email
                        </button>
                        <button onClick={() => handlePrint(sale)} className="flex-1 bg-blue-50 text-blue-600 hover:bg-blue-100 py-2 rounded-lg text-xs font-bold flex justify-center items-center gap-1 transition-colors">
                          <Printer size={14}/> Imprimir
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export { AdminApp, DriverApp, LoginScreen };