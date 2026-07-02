import React, { useState, useEffect } from 'react'
import { Users, Search, Banknote, CreditCard, X, MessageCircle, Printer, Activity, AlertCircle } from 'lucide-react'
import { useStore } from '../../store/useStore'
import { supabase } from '../../supabaseClient'
import Swal from 'sweetalert2'
import { DebtHistorySection } from './DebtHistorySection'
import { DebtTicketModal } from './DebtTicketModal'

// ——— Modal: Cobrar Deuda ———
const DebtPaymentModal: React.FC<{ client: any; onClose: () => void; onSuccess: (data: any) => void }> = ({ client, onClose, onSuccess }) => {
  const { drivers, fetchInitialData } = useStore()
  const [amount, setAmount] = useState<number | ''>('')
  const [method, setMethod] = useState<'efectivo' | 'transferencia'>('efectivo')
  const [loading, setLoading] = useState(false)

  const debt = Math.abs(client.current_balance)

  const handlePay = async () => {
    if (!amount || amount <= 0 || amount > debt) {
      Swal.fire('Error', 'Ingrese un monto válido (mayor a 0 y hasta el total de la deuda).', 'error')
      return
    }
    setLoading(true)
    try {
      const mostrador = drivers.find((d: any) => d.is_mostrador)
      if (!mostrador) {
        Swal.fire('Error', 'No se encontró el conductor "Mostrador". Contacte al administrador.', 'error')
        setLoading(false)
        return
      }

      const payload = {
        id: crypto.randomUUID(),
        driver_id: mostrador.id,
        client_id: client.id,
        transaction_date: new Date().toISOString(),
        items: [],
        subtotal_sales: 0,
        total_returns: 0,
        final_total: 0,
        applied_debt: amount,
        payment_cash: method === 'efectivo' ? amount : 0,
        payment_transfer: method === 'transferencia' ? amount : 0,
        payment_account: -amount,
        cajones_left: 0,
        cajones_returned: 0
      }

      const { error } = await supabase.rpc('process_offline_sale', { payload })
      if (error) throw error

      await fetchInitialData()

      onSuccess({
        id: crypto.randomUUID().substring(0, 8).toUpperCase(),
        client_id: client.id,
        client_name: client.business_name,
        date: payload.transaction_date,
        method,
        amount,
        old_balance: client.current_balance,
        new_balance: client.current_balance + (amount as number)
      })
    } catch (err: any) {
      Swal.fire('Error', err.message || 'No se pudo procesar el cobro', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
      <div className="bg-bg-surface border border-brand-muted/20 rounded-3xl w-full max-w-sm flex flex-col shadow-2xl">
        <div className="p-6 border-b border-brand-muted/20 flex justify-between items-start">
          <div>
            <h2 className="text-xl font-black text-brand-deep">Cobrar Deuda</h2>
            <p className="text-brand-muted text-sm mt-1">{client.business_name}</p>
          </div>
          <button onClick={onClose} className="p-2 bg-brand-muted/10 hover:bg-brand-muted/20 rounded-xl text-brand-muted hover:text-brand-deep transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-100 flex justify-between items-center">
            <span className="font-bold text-sm uppercase tracking-wide">Deuda Total</span>
            <span className="text-xl font-black">${debt.toLocaleString()}</span>
          </div>

          {/* Historial de tickets adeudados */}
          <DebtHistorySection clientId={client.id} totalDebt={debt} />

          <div>
            <label className="text-[10px] font-bold text-brand-muted/80 uppercase block mb-1">Monto a Abonar</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-brand-muted">$</span>
              <input
                type="number"
                value={amount}
                onChange={e => setAmount(Number(e.target.value))}
                max={debt}
                placeholder="0.00"
                className="w-full bg-brand-muted/10 border border-brand-muted/30 rounded-xl pl-8 pr-3 py-3 text-brand-deep font-bold outline-none"
              />
            </div>
            <button onClick={() => setAmount(debt)} className="text-[10px] text-brand-navy font-bold mt-1 hover:underline">
              Abonar total
            </button>
          </div>

          <div>
            <label className="text-[10px] font-bold text-brand-muted/80 uppercase block mb-1">Medio de Pago</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setMethod('efectivo')}
                className={`py-3 rounded-xl font-bold text-sm flex justify-center items-center gap-2 border transition-colors ${method === 'efectivo' ? 'bg-brand-navy text-white border-brand-navy' : 'bg-white text-brand-muted border-brand-muted/30'}`}
              >
                <Banknote size={16} /> Efectivo
              </button>
              <button
                onClick={() => setMethod('transferencia')}
                className={`py-3 rounded-xl font-bold text-sm flex justify-center items-center gap-2 border transition-colors ${method === 'transferencia' ? 'bg-brand-navy text-white border-brand-navy' : 'bg-white text-brand-muted border-brand-muted/30'}`}
              >
                <CreditCard size={16} /> Transfer.
              </button>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-brand-muted/20 rounded-b-3xl">
          <button
            onClick={handlePay}
            disabled={loading}
            className="w-full bg-green-500 hover:bg-green-600 text-white font-black py-3.5 rounded-xl transition-colors text-sm flex justify-center items-center gap-2 disabled:opacity-50"
          >
            {loading ? <Activity size={18} className="animate-spin" /> : 'Confirmar Cobro'}
          </button>
        </div>
      </div>
    </div>
  )
}


// ——— Componente principal: Lista de Clientes (Mostrador) ———
export const MostradorClients: React.FC = () => {
  const { clients } = useStore()
  const [search, setSearch] = useState('')
  const [selectedClientForDebt, setSelectedClientForDebt] = useState<any>(null)
  const [debtTicketData, setDebtTicketData] = useState<any>(null)

  const filtered = clients.filter(c => {
    const q = search.toLowerCase()
    return (
      c.business_name?.toLowerCase().includes(q) ||
      c.legal_name?.toLowerCase().includes(q) ||
      c.phone?.toLowerCase().includes(q)
    )
  })

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-black text-brand-deep flex items-center gap-2">
          <Users className="text-orange-500" size={24} /> Clientes
        </h2>
        <p className="text-sm text-brand-muted mt-1">Consulte el saldo y registre pagos de deuda en local</p>
      </div>

      {/* Búsqueda */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted" size={16} />
        <input
          type="text"
          placeholder="Buscar cliente por nombre, razón social o teléfono..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-3 bg-bg-surface border border-brand-muted/20 rounded-2xl text-sm text-brand-deep font-medium outline-none focus:border-brand-navy transition-colors"
        />
      </div>

      {/* Lista */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-brand-muted/60 flex flex-col items-center gap-3">
            <Users size={40} className="opacity-40" />
            <p>No se encontraron clientes</p>
          </div>
        ) : (
          filtered.map(client => {
            const hasDebt = client.current_balance < 0
            const hasFavor = client.current_balance > 0

            return (
              <div
                key={client.id}
                className="bg-bg-surface border border-brand-muted/20 rounded-2xl p-4 flex items-center justify-between gap-4 hover:border-brand-muted/40 transition-colors"
              >
                {/* Info cliente */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-brand-deep text-sm truncate">{client.business_name}</h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-brand-muted/10 text-brand-muted rounded-full">
                      {client.client_type || 'Cliente'}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-brand-navy/10 text-brand-navy rounded-full">
                      Cat. {client.price_category}
                    </span>
                  </div>
                  {client.phone && (
                    <p className="text-xs text-brand-muted mt-0.5">{client.phone}</p>
                  )}
                </div>

                {/* Saldo */}
                <div className="text-right shrink-0">
                  <span className={`text-sm font-black block ${hasDebt ? 'text-red-500' : hasFavor ? 'text-green-500' : 'text-brand-muted'}`}>
                    {hasDebt
                      ? `-$${Math.abs(client.current_balance).toLocaleString()}`
                      : hasFavor
                      ? `+$${client.current_balance.toLocaleString()}`
                      : 'Al día'}
                  </span>
                  <span className={`text-[10px] font-semibold ${hasDebt ? 'text-red-400' : hasFavor ? 'text-green-400' : 'text-brand-muted/60'}`}>
                    {hasDebt ? 'Debe' : hasFavor ? 'A favor' : 'Sin deuda'}
                  </span>
                </div>

                {/* Acción: solo cobrar deuda */}
                {hasDebt && (
                  <button
                    onClick={() => setSelectedClientForDebt(client)}
                    className="shrink-0 flex items-center gap-1.5 bg-green-500 hover:bg-green-600 text-white font-bold text-xs px-3 py-2 rounded-xl transition-colors shadow-sm"
                  >
                    <Banknote size={14} /> Cobrar
                  </button>
                )}
                {!hasDebt && (
                  <div className="shrink-0 w-[88px] flex items-center justify-center">
                    <span className="text-[10px] text-brand-muted/40 flex items-center gap-1">
                      <AlertCircle size={12} /> Sin deuda
                    </span>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Modales */}
      {selectedClientForDebt && (
        <DebtPaymentModal
          client={selectedClientForDebt}
          onClose={() => setSelectedClientForDebt(null)}
          onSuccess={data => {
            setSelectedClientForDebt(null)
            setDebtTicketData(data)
          }}
        />
      )}
      {debtTicketData && (
        <DebtTicketModal
          data={debtTicketData}
          onClose={() => setDebtTicketData(null)}
        />
      )}
    </div>
  )
}
