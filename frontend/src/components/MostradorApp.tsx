
import { useStore } from '../store/useStore'
import { LogOut, Store } from 'lucide-react'
import { POSLayout } from './mostrador/POSLayout'

export const MostradorApp = () => {
  const { logout } = useStore()

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      {/* Navbar Superior */}
      <nav className="bg-slate-900 text-white p-3 md:p-4 shadow-md flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <Store className="text-orange-500" size={20} />
          <h1 className="text-sm md:text-xl font-bold">Mostrador</h1>
        </div>
        <button
          onClick={() => logout()}
          className="flex items-center gap-2 bg-red-600 hover:bg-red-700 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <LogOut size={16} /> Salir
        </button>
      </nav>

      {/* Contenido principal (POS) */}
      <main className="flex-1 bg-slate-100">
        <POSLayout />
      </main>
    </div>
  )
}
