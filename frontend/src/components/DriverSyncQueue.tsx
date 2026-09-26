import React from 'react'
import { RefreshCw, Send, CheckCircle, Clock, MessageCircle, ArrowLeft, Trash2, AlertTriangle } from 'lucide-react'
import { useStore, type SyncItem } from '../store/useStore'
import Swal from 'sweetalert2'

interface DriverSyncQueueProps {
  onBack: () => void;
  driverId: string;
  onEditSale?: (clientId: string) => void;
}

export const DriverSyncQueue: React.FC<DriverSyncQueueProps> = ({ onBack, onEditSale }) => {
  const { syncQueue, isSyncing, processSyncQueue, removeSyncItem, isOffline } = useStore()
  
  const handleSync = async () => {
    if (isOffline) {
      Swal.fire('Sin conexión', 'Debes recuperar la señal de internet (4G/WiFi) antes de sincronizar.', 'warning')
      return
    }
    const res = await processSyncQueue()
    if (res.errorCount === 0 && res.successCount > 0) {
      Swal.fire('¡Sincronizado!', `Se subieron con éxito ${res.successCount} comprobantes a la base central.`, 'success')
    } else if (res.successCount > 0 && res.errorCount > 0) {
      Swal.fire('Sincronización Parcial', `Se subieron ${res.successCount} operaciones, pero ${res.errorCount} tuvieron observaciones y permanecen en espera.`, 'warning')
    } else if (res.errorCount > 0 && res.successCount === 0) {
      Swal.fire('Atención', 'No se pudieron subir las operaciones en espera. Revisa el detalle o descarta si ya las cargaste de nuevo.', 'error')
    } else {
      Swal.fire('Al día', 'No hay comprobantes pendientes para subir.', 'info')
    }
  }

  const handleDeleteItem = (itemId: string, description: string) => {
    Swal.fire({
      title: '¿Descartar de espera?',
      text: `¿Eliminar "${description}" de la lista? Úsalo solo si ya cargaste esta venta nuevamente para evitar duplicados.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Sí, descartar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        removeSyncItem(itemId)
        Swal.fire('Descartado', 'El comprobante fue eliminado de la lista de espera.', 'success')
      }
    })
  }

  const buildWhatsAppText = (sale: any) => {
    const total = sale.final_total?.toFixed(2) || '0.00'
    const date = new Date(sale.transaction_date).toLocaleString('es-AR')
    return `*Panificadora FENIX - Comprobante de Venta*\nFecha: ${date}\nTotal: $${total}\n\n*Muchas gracias por su compra!*`
  }

  const handleWhatsApp = (sale: any) => {
    window.open(`https://wa.me/?text=${encodeURIComponent(buildWhatsAppText(sale))}`, '_blank')
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 relative">
      <div className="bg-white shadow-sm p-4 sticky top-0 z-20 flex justify-between items-center rounded-t-3xl sm:rounded-t-none">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 -ml-2 rounded-xl text-brand-muted hover:bg-slate-100 active:scale-95 transition-all">
            <ArrowLeft size={24} />
          </button>
          <div>
            <h2 className="text-xl font-black text-brand-navy">Lista de Espera</h2>
            <p className="text-sm text-brand-muted">Operaciones pendientes ({syncQueue.length})</p>
          </div>
        </div>
        <button 
          onClick={handleSync}
          disabled={isSyncing || syncQueue.length === 0}
          className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold shadow-sm transition-all ${
            isOffline ? 'bg-slate-200 text-slate-500 cursor-not-allowed' : 'bg-brand-primary text-white active:scale-95'
          }`}
        >
          {isSyncing ? <RefreshCw className="animate-spin" size={18} /> : <Send size={18} />}
          {isSyncing ? 'Sincronizando...' : 'Sincronizar'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-24">
        {syncQueue.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-brand-muted opacity-60">
            <CheckCircle size={64} className="mb-4 text-green-400" />
            <h3 className="text-lg font-bold">Todo está al día</h3>
            <p className="text-sm text-center">No hay operaciones pendientes de envío.</p>
          </div>
        ) : (
          syncQueue.map((item: SyncItem, index) => {
            const isSale = item.type === 'sale'
            const isExpense = item.type === 'expense'
            const isEndRoute = item.type === 'end_route'
            const itemDescription = isSale 
              ? (item.payload.client_name || 'Venta a Cliente')
              : isExpense 
                ? `Gasto: ${item.payload.category}` 
                : 'Cierre de Recorrido'

            return (
              <div key={item.id + index} className={`bg-white p-4 rounded-2xl shadow-sm border ${item.error ? 'border-red-200 bg-red-50/20' : 'border-slate-100'} flex flex-col gap-2`}>
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    {item.error ? (
                      <AlertTriangle size={16} className="text-red-500" />
                    ) : (
                      <Clock size={16} className="text-orange-500" />
                    )}
                    <span className={`text-xs font-bold uppercase tracking-wider ${item.error ? 'text-red-500' : 'text-orange-500'}`}>
                      {item.error ? 'Observación al sincronizar' : 'Pendiente de envío'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {isSale && (
                      <span className="text-xs font-bold bg-brand-primary/10 text-brand-primary px-2 py-1 rounded-full">{item.payload.status === 'draft' ? 'BORRADOR' : 'VENTA'}</span>
                    )}
                    {isExpense && (
                      <span className="text-xs font-bold bg-red-100 text-red-600 px-2 py-1 rounded-full">GASTO</span>
                    )}
                    {isEndRoute && (
                      <span className="text-xs font-bold bg-brand-navy/10 text-brand-navy px-2 py-1 rounded-full">FIN RUTA</span>
                    )}
                    <button
                      onClick={() => handleDeleteItem(item.id, itemDescription)}
                      className="p-1 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 active:scale-95 transition-all ml-1"
                      title="Descartar de espera"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {item.error && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-2.5 text-xs text-red-700 flex flex-col gap-1">
                    <span className="font-bold">Aviso del servidor:</span>
                    <p className="font-mono text-[11px] break-words">{item.error}</p>
                    <p className="text-[10px] text-red-500 italic mt-0.5">
                      Si ya cargaste nuevamente esta venta al cliente, puedes descartar este comprobante duplicado tocando el ícono del tacho.
                    </p>
                  </div>
                )}

                <div className="mt-1">
                  {isSale && (
                    <>
                      <h4 className="font-bold text-brand-navy">{item.payload.client_name || 'Cliente Desconocido'}</h4>
                      <p className="text-xl font-black text-brand-primary">${item.payload.final_total?.toFixed(2)}</p>
                      <div className="mt-3 flex gap-2">
                        {item.payload.status === 'draft' && onEditSale && (
                          <button 
                            onClick={() => onEditSale(item.payload.client_id)}
                            className="flex-1 flex items-center justify-center bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 rounded-xl active:scale-95 transition-all text-sm"
                          >
                            Reabrir Ticket
                          </button>
                        )}
                        <button 
                          onClick={() => handleWhatsApp(item.payload)}
                          className="flex-1 flex items-center justify-center gap-2 bg-[#25D366]/10 text-[#25D366] font-bold py-2 rounded-xl active:scale-95 transition-all text-sm"
                        >
                          <MessageCircle size={16} /> WhatsApp
                        </button>
                      </div>
                    </>
                  )}
                  {isExpense && (
                    <>
                      <h4 className="font-bold text-slate-700">Gasto: {item.payload.category}</h4>
                      <p className="text-xl font-black text-red-500">-${item.payload.amount?.toFixed(2)}</p>
                      <p className="text-sm text-brand-muted truncate">{item.payload.description}</p>
                    </>
                  )}
                  {isEndRoute && (
                    <>
                      <h4 className="font-bold text-brand-navy">Cierre de Recorrido</h4>
                      <p className="text-sm text-brand-muted">Devolución de stock y rendición de caja pendientes.</p>
                    </>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
