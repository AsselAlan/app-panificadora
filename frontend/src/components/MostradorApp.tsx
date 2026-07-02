import { useState } from 'react'
import { useStore } from '../store/useStore'
import { LogOut, Store, ShoppingCart, Package, Users } from 'lucide-react'
import { POSLayout } from './mostrador/POSLayout'
import { AdminStock } from './AdminApp'
import { MostradorClients } from './mostrador/MostradorClients'

export const MostradorApp = () => {
  const { logout } = useStore()
  const [activeTab, setActiveTab] = useState<'ventas' | 'clientes' | 'stock'>('ventas')

  return (
    <div className="h-screen overflow-hidden bg-bg-app flex flex-col font-sans">
      {/* Navbar Superior */}
      <nav className="bg-brand-navy text-white p-3 md:p-4 shadow-md flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <Store className="text-orange-500" size={20} />
          <h1 className="text-sm md:text-xl font-bold">Mostrador</h1>
        </div>
        
        <div className="flex bg-brand-navy/50 rounded-lg p-1 hidden sm:flex border border-white/10">
          <button
            onClick={() => setActiveTab('ventas')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-bold transition-colors ${activeTab === 'ventas' ? 'bg-brand-orange text-white shadow-sm' : 'text-white/70 hover:text-white hover:bg-white/10'}`}
          >
            <ShoppingCart size={16} /> Punto de Venta
          </button>
          <button
            onClick={() => setActiveTab('clientes')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-bold transition-colors ${activeTab === 'clientes' ? 'bg-brand-orange text-white shadow-sm' : 'text-white/70 hover:text-white hover:bg-white/10'}`}
          >
            <Users size={16} /> Clientes
          </button>
          <button
            onClick={() => setActiveTab('stock')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-bold transition-colors ${activeTab === 'stock' ? 'bg-brand-orange text-white shadow-sm' : 'text-white/70 hover:text-white hover:bg-white/10'}`}
          >
            <Package size={16} /> Carga de Stock
          </button>
        </div>

        <button
          onClick={() => logout()}
          className="flex items-center gap-2 bg-red-600/20 text-red-400 hover:bg-red-600 hover:text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <LogOut size={16} /> Salir
        </button>
      </nav>

      {/* Navegación Móvil */}
      <div className="sm:hidden flex bg-brand-navy p-1 text-white border-b border-white/10">
        <button
          onClick={() => setActiveTab('ventas')}
          className={`flex-1 flex justify-center items-center gap-2 px-2 py-2 rounded-md text-xs font-bold transition-colors ${activeTab === 'ventas' ? 'bg-brand-orange text-white shadow-sm' : 'text-white/70 hover:text-white hover:bg-white/10'}`}
        >
          <ShoppingCart size={15} /> Ventas
        </button>
        <button
          onClick={() => setActiveTab('clientes')}
          className={`flex-1 flex justify-center items-center gap-2 px-2 py-2 rounded-md text-xs font-bold transition-colors ${activeTab === 'clientes' ? 'bg-brand-orange text-white shadow-sm' : 'text-white/70 hover:text-white hover:bg-white/10'}`}
        >
          <Users size={15} /> Clientes
        </button>
        <button
          onClick={() => setActiveTab('stock')}
          className={`flex-1 flex justify-center items-center gap-2 px-2 py-2 rounded-md text-xs font-bold transition-colors ${activeTab === 'stock' ? 'bg-brand-orange text-white shadow-sm' : 'text-white/70 hover:text-white hover:bg-white/10'}`}
        >
          <Package size={15} /> Stock
        </button>
      </div>

      {/* Contenido principal */}
      <main className={`flex-1 h-full overflow-hidden bg-bg-app ${activeTab !== 'ventas' ? 'overflow-y-auto' : ''}`}>
        {activeTab === 'ventas' && <POSLayout />}
        {activeTab === 'clientes' && <MostradorClients />}
        {activeTab === 'stock' && (
          <div className="max-w-4xl mx-auto p-4 md:p-6">
            <AdminStock />
          </div>
        )}
      </main>
    </div>
  )
}
