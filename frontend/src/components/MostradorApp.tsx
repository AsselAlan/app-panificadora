import { useState } from 'react'
import { useStore } from '../store/useStore'
import { LogOut, Store, ShoppingCart, Package } from 'lucide-react'
import { POSLayout } from './mostrador/POSLayout'
import { AdminStock } from './AdminApp'

export const MostradorApp = () => {
  const { logout } = useStore()
  const [activeTab, setActiveTab] = useState<'ventas' | 'stock'>('ventas')

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      {/* Navbar Superior */}
      <nav className="bg-slate-900 text-white p-3 md:p-4 shadow-md flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <Store className="text-orange-500" size={20} />
          <h1 className="text-sm md:text-xl font-bold">Mostrador</h1>
        </div>
        
        <div className="flex bg-slate-800 rounded-lg p-1 hidden sm:flex">
          <button
            onClick={() => setActiveTab('ventas')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-bold transition-colors ${activeTab === 'ventas' ? 'bg-orange-500 text-white shadow-sm' : 'text-slate-300 hover:text-white hover:bg-slate-700'}`}
          >
            <ShoppingCart size={16} /> Punto de Venta
          </button>
          <button
            onClick={() => setActiveTab('stock')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-bold transition-colors ${activeTab === 'stock' ? 'bg-orange-500 text-white shadow-sm' : 'text-slate-300 hover:text-white hover:bg-slate-700'}`}
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
      <div className="sm:hidden flex bg-slate-800 p-1 text-white border-b border-slate-700">
        <button
          onClick={() => setActiveTab('ventas')}
          className={`flex-1 flex justify-center items-center gap-2 px-4 py-2 rounded-md text-sm font-bold transition-colors ${activeTab === 'ventas' ? 'bg-orange-500 text-white shadow-sm' : 'text-slate-300 hover:text-white hover:bg-slate-700'}`}
        >
          <ShoppingCart size={16} /> Ventas
        </button>
        <button
          onClick={() => setActiveTab('stock')}
          className={`flex-1 flex justify-center items-center gap-2 px-4 py-2 rounded-md text-sm font-bold transition-colors ${activeTab === 'stock' ? 'bg-orange-500 text-white shadow-sm' : 'text-slate-300 hover:text-white hover:bg-slate-700'}`}
        >
          <Package size={16} /> Stock
        </button>
      </div>

      {/* Contenido principal */}
      <main className={`flex-1 bg-slate-100 ${activeTab === 'stock' ? 'p-4 md:p-6' : ''}`}>
        {activeTab === 'ventas' ? (
          <POSLayout />
        ) : (
          <div className="max-w-4xl mx-auto">
            <AdminStock />
          </div>
        )}
      </main>
    </div>
  )
}
