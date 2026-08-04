import React, { useState, useEffect } from 'react'
import { Store, ShoppingCart, Plus, Minus, Banknote, CreditCard, Users, X, Printer } from 'lucide-react'
import { supabase } from '../../supabaseClient'
import { useStore } from '../../store/useStore'
import type { Product } from '../../store/useStore'
import Swal from 'sweetalert2'
import { SaleTicketModal } from './SaleTicketModal'

export const POSLayout: React.FC = () => {
  const { products, clients, fetchInitialData } = useStore()
  const [selectedClientId, setSelectedClientId] = useState<string>('')
  const [cart, setCart] = useState<Record<string, number>>({})
  const [activeTab, setActiveTab] = useState<'venta' | 'devolucion'>('venta')
  const [returnsCart, setReturnsCart] = useState<Record<string, number>>({})
  const [payCash, setPayCash] = useState('')
  const [payTransfer, setPayTransfer] = useState('')
  const [vueltoACuenta, setVueltoACuenta] = useState(false)
  const [includeDebt, setIncludeDebt] = useState(false)
  const [showMobileCatalog, setShowMobileCatalog] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<'efectivo' | 'transferencia' | 'ambos' | 'ctacte'>('efectivo')
  const [isProcessing, setIsProcessing] = useState(false)
  const [completedSale, setCompletedSale] = useState<any>(null)

  useEffect(() => {
    fetchInitialData()
  }, [fetchInitialData])

  const activeClient = clients.find(c => c.id === selectedClientId)

  const getPrice = (product: Product) => {
    if (!activeClient) return product.price_a
    return activeClient.price_category === 'B' ? product.price_b : product.price_a
  }

  const subtotalSales = Object.entries(cart).reduce((acc, [id, qty]) => {
    const p = products.find(p => p.id === id)
    return acc + (p ? getPrice(p) * qty : 0)
  }, 0)

  const subtotalReturns = Object.entries(returnsCart).reduce((acc, [id, qty]) => {
    const p = products.find(p => p.id === id)
    return acc + (p ? getPrice(p) * qty : 0)
  }, 0)

  const netTotal = subtotalSales - subtotalReturns

  const expectedTotal =
    netTotal +
    (includeDebt && activeClient && activeClient.current_balance < 0
      ? Math.abs(activeClient.current_balance)
      : 0)

  useEffect(() => {
    if (expectedTotal > 0) {
      if (paymentMethod === 'efectivo') {
        setPayCash(expectedTotal.toString())
        setPayTransfer('')
      } else if (paymentMethod === 'transferencia') {
        setPayTransfer(expectedTotal.toString())
        setPayCash('')
      } else if (paymentMethod === 'ctacte') {
        setPayCash('')
        setPayTransfer('')
      }
    } else {
      setPayCash('')
      setPayTransfer('')
    }
  }, [expectedTotal, paymentMethod])

  useEffect(() => {
    const canUse = activeClient && (activeClient.allow_credit || activeClient.current_balance !== 0)
    if (paymentMethod === 'ctacte' && !canUse) {
      setPaymentMethod('efectivo')
    }
  }, [activeClient, paymentMethod])

  const cashAmt = parseFloat(payCash) || 0
  const transferAmt = parseFloat(payTransfer) || 0
  const totalPaid = cashAmt + transferAmt
  const remainingToPay = subtotalSales - totalPaid

  const handleUpdateQty = (productId: string, delta: number, unitType: string, maxStock: number) => {
    const step = unitType === 'kg' ? 0.5 : 1
    
    if (activeTab === 'venta') {
      const current = cart[productId] || 0
      let next = current + delta * step
      if (next < 0) next = 0
      if (next > maxStock) next = maxStock
      setCart(prev => {
        const n = { ...prev }
        if (next === 0) delete n[productId]
        else n[productId] = next
        return n
      })
    } else {
      const current = returnsCart[productId] || 0
      let next = current + delta * step
      if (next < 0) next = 0
      setReturnsCart(prev => {
        const n = { ...prev }
        if (next === 0) delete n[productId]
        else n[productId] = next
        return n
      })
    }
  }

  const handleProcess = async () => {
    if ((subtotalSales === 0 && subtotalReturns === 0 && totalPaid === 0) || !selectedClientId) return
    setIsProcessing(true)
    try {
      const mostradorDriver = useStore.getState().drivers.find((d: any) => d.is_mostrador)
      if (!mostradorDriver) {
        Swal.fire({
          title: 'Configuración requerida',
          html: 'No se encontró un conductor con el flag <b>"Mostrador"</b>.<br>Contacte al administrador.',
          icon: 'warning',
          confirmButtonColor: '#2563eb'
        })
        return
      }

      let finalCash = 0
      let finalTransfer = 0
      let finalAccount = 0

      if (expectedTotal >= 0) {
        finalCash = cashAmt
        finalTransfer = transferAmt
        const remaining = expectedTotal - totalPaid
        
        if (remaining < 0) {
          if (vueltoACuenta) {
            finalAccount = remaining
          } else {
            finalCash = cashAmt - Math.abs(remaining)
            finalAccount = 0
          }
        } else {
          finalAccount = remaining
        }
      } else {
        finalCash = 0
        finalTransfer = 0
        finalAccount = expectedTotal
      }

      const cleanItems = [
        ...Object.entries(cart).map(([id, qty]) => {
          const p = products.find((prod: Product) => prod.id === id)
          return { product_id: id, operation_type: 'sale', quantity: qty, unit_price: p ? getPrice(p) : 0 }
        }),
        ...Object.entries(returnsCart).map(([id, qty]) => {
          const p = products.find((prod: Product) => prod.id === id)
          return { product_id: id, operation_type: 'return', quantity: qty, unit_price: p ? getPrice(p) : 0 }
        })
      ]

      const payload = {
        id: crypto.randomUUID(),
        client_id: selectedClientId,
        driver_id: mostradorDriver.id,
        transaction_date: new Date().toISOString(),
        subtotal_sales: subtotalSales,
        total_returns: subtotalReturns,
        applied_debt: includeDebt && activeClient && activeClient.current_balance < 0 ? Math.abs(activeClient.current_balance) : 0,
        final_total: netTotal,
        payment_cash: finalCash,
        payment_transfer: finalTransfer,
        payment_account: finalAccount,
        items: cleanItems
      }

      const { error } = await supabase.rpc('process_offline_sale', { payload })
      if (error) throw error

      useStore.getState().fetchInitialData()

      setCompletedSale({
        client_name: activeClient?.business_name || 'Consumidor Final',
        date: payload.transaction_date,
        items: cleanItems.map(item => {
          const p = products.find(p => p.id === item.product_id)
          return {
            name: p?.name || 'Producto',
            quantity: item.quantity,
            unit_price: item.unit_price,
            subtotal: item.quantity * item.unit_price
          }
        }),
        subtotal_sales: subtotalSales,
        payment_cash: finalCash,
        payment_transfer: transferAmt,
        payment_account: finalAccount
      })
    } catch (err: any) {
      Swal.fire('Error', err.message || 'No se pudo procesar la venta.', 'error')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleResetSale = () => {
    setCompletedSale(null)
    setCart({})
    setReturnsCart({})
    setPayCash('')
    setPayTransfer('')
    setSelectedClientId('')
    setIncludeDebt(false)
    setVueltoACuenta(false)
    setPaymentMethod('efectivo')
    setActiveTab('venta')
  }

  return (
    <div className="flex h-full gap-4 w-full relative p-3 md:p-4">
      {completedSale && (
        <SaleTicketModal data={completedSale} onClose={handleResetSale} />
      )}
      
      {showMobileCatalog && (
        <div className="fixed inset-0 bg-slate-900/60 z-40 lg:hidden animate-in fade-in" onClick={() => setShowMobileCatalog(false)} />
      )}

      {/* Catálogo */}
      <div className={`flex-1 flex flex-col bg-bg-surface shadow-sm border border-brand-muted/20 rounded-3xl overflow-hidden ${showMobileCatalog ? 'fixed inset-4 z-50 shadow-2xl flex' : 'hidden lg:flex'}`}>
        <div className="p-4 border-b border-brand-muted/20 bg-bg-app flex flex-col gap-4">
          <div className="flex justify-between items-center gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-brand-navy/10 text-brand-navy rounded-xl flex items-center justify-center">
                <Store size={20} />
              </div>
              <div>
                <h3 className="font-bold text-brand-deep text-sm">Productos de Panadería</h3>
                <p className="text-xs text-brand-muted/80">Agregue items para venta o devolución</p>
              </div>
            </div>
            {showMobileCatalog && (
              <button onClick={() => setShowMobileCatalog(false)} className="w-10 h-10 bg-brand-muted/10 hover:bg-brand-muted/20 text-brand-deep rounded-xl flex items-center justify-center lg:hidden">
                <X size={20} />
              </button>
            )}
          </div>
          <div className="flex bg-brand-muted/10 p-1 rounded-xl">
            <button onClick={() => setActiveTab('venta')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'venta' ? 'bg-white text-brand-navy shadow-sm' : 'text-brand-muted/80 hover:text-brand-deep'}`}>Venta</button>
            <button onClick={() => setActiveTab('devolucion')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'devolucion' ? 'bg-white text-orange-500 shadow-sm' : 'text-brand-muted/80 hover:text-brand-deep'}`}>Devolución</button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 pr-2">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.map((p: Product) => {
              const qty = activeTab === 'venta' ? (cart[p.id] || 0) : (returnsCart[p.id] || 0)
              const maxStock = p.bakery_stock
              return (
                <div key={p.id} className={`border rounded-2xl p-4 transition-all duration-200 ${qty > 0 ? (activeTab === 'venta' ? 'border-brand-navy/30 bg-brand-navy/5' : 'border-orange-500/30 bg-orange-500/5') : 'border-brand-muted/20 bg-bg-surface hover:border-brand-muted/30'}`}>
                  <h4 className="font-bold text-brand-deep text-sm truncate">{p.name}</h4>
                  <p className="text-xs font-semibold text-brand-navy mt-0.5">${getPrice(p)} <span className="text-[10px] text-brand-muted/80 font-normal">x {p.unit_type}</span></p>
                  <div className="flex justify-between items-center gap-2 mt-4">
                    <button onClick={() => handleUpdateQty(p.id, -1, p.unit_type, maxStock)} className="w-8 h-8 bg-brand-muted/10 border border-brand-muted/30 text-brand-deep/80 rounded-lg flex items-center justify-center active:scale-90 transition-transform">
                      <Minus size={14} />
                    </button>
                    <input type="number" value={qty || ''} onChange={e => { 
                      let val = parseFloat(e.target.value) || 0; 
                      if (activeTab === 'venta' && val > maxStock) val = maxStock; 
                      if (activeTab === 'venta') setCart(prev => { const n = { ...prev }; if (val <= 0) delete n[p.id]; else n[p.id] = val; return n });
                      else setReturnsCart(prev => { const n = { ...prev }; if (val <= 0) delete n[p.id]; else n[p.id] = val; return n }) 
                    }} className="w-12 h-8 text-center text-sm font-bold text-brand-deep bg-brand-muted/10 border border-brand-muted/30 rounded-lg outline-none" placeholder="0" />
                    <button onClick={() => handleUpdateQty(p.id, 1, p.unit_type, maxStock)} disabled={activeTab === 'venta' && qty >= maxStock} className="w-8 h-8 bg-brand-muted/10 border border-brand-muted/30 text-brand-deep/80 rounded-lg flex items-center justify-center active:scale-90 transition-transform disabled:opacity-30">
                      <Plus size={14} />
                    </button>
                  </div>
                  {activeTab === 'venta' && (
                    <p className="text-[9px] text-brand-muted/80 text-center mt-2">Disponible: {maxStock} {p.unit_type}</p>
                  )}
                  {activeTab === 'devolucion' && (
                    <p className="text-[9px] text-orange-500 text-center mt-2">Se enviará a sobrantes</p>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Panel de cobro */}
      <div className="w-full lg:w-[360px] flex-none bg-bg-surface shadow-sm border border-brand-muted/20 rounded-3xl flex flex-col shadow-xl">
        <div className="p-5 border-b border-brand-muted/20 bg-bg-app shrink-0">
          <div className="flex justify-between items-center mb-1.5">
            <label className="text-[10px] font-bold text-brand-muted/80 uppercase block">Cliente</label>
            {activeClient && (
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${activeClient.current_balance < 0 ? 'bg-red-500/10 text-red-500' : activeClient.current_balance > 0 ? 'bg-green-500/10 text-green-500' : 'bg-brand-muted/10 text-brand-muted'}`}>
                {activeClient.current_balance < 0 ? `Adeuda $${Math.abs(activeClient.current_balance)}` : activeClient.current_balance > 0 ? `A favor $${activeClient.current_balance}` : 'Al día'}
              </span>
            )}
          </div>
          <select value={selectedClientId} onChange={e => setSelectedClientId(e.target.value)} className="w-full bg-brand-muted/10 border border-brand-muted/30 text-brand-deep rounded-xl p-2.5 font-semibold text-sm outline-none">
            <option value="">-- Seleccionar cliente --</option>
            {clients.map((c: any) => <option key={c.id} value={c.id}>{c.business_name}</option>)}
          </select>
          <button onClick={() => setShowMobileCatalog(true)} className="mt-3 w-full lg:hidden bg-brand-navy/10 hover:bg-brand-navy/20 text-brand-navy border border-brand-navy/20 font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 transition-colors">
            <Store size={16} /> Seleccionar Productos
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {Object.keys(cart).length === 0 && Object.keys(returnsCart).length === 0 ? (
            <div className="text-center text-slate-600 py-10 flex flex-col items-center gap-2">
              <ShoppingCart size={32} className="opacity-40" />
              <span className="text-xs">El carrito está vacío</span>
            </div>
          ) : (
            <>
              {Object.entries(cart).map(([id, qty]) => {
                const p = products.find((prod: Product) => prod.id === id)
                if (!p) return null
                return (
                  <div key={`sale-${id}`} className="flex justify-between items-center bg-bg-app/40 border border-brand-muted/10 p-3 rounded-xl text-xs font-mono">
                    <div>
                      <span className="font-bold text-brand-deep block">{p.name}</span>
                      <span className="text-brand-muted/80">{qty} x ${getPrice(p)}</span>
                    </div>
                    <span className="font-black text-brand-deep">${qty * getPrice(p)}</span>
                  </div>
                )
              })}
              {Object.entries(returnsCart).map(([id, qty]) => {
                const p = products.find((prod: Product) => prod.id === id)
                if (!p) return null
                return (
                  <div key={`return-${id}`} className="flex justify-between items-center bg-orange-500/5 border border-orange-500/20 p-3 rounded-xl text-xs font-mono">
                    <div>
                      <span className="font-bold text-orange-600 block">{p.name} (Devol.)</span>
                      <span className="text-orange-500/80">{qty} x ${getPrice(p)}</span>
                    </div>
                    <span className="font-black text-orange-600">-${qty * getPrice(p)}</span>
                  </div>
                )
              })}
            </>
          )}
        </div>

        <div className="p-5 border-t border-brand-muted/20 bg-bg-app rounded-b-3xl space-y-4">
          <div>
            <div className="flex justify-between items-end mb-1">
              <span className="text-xs font-bold text-brand-muted/80 uppercase tracking-wider">Subtotal Ventas</span>
              <span className="text-xl font-black text-brand-navy">${subtotalSales.toLocaleString()}</span>
            </div>
            {subtotalReturns > 0 && (
              <div className="flex justify-between items-end mb-1">
                <span className="text-xs font-bold text-orange-500 uppercase tracking-wider">Subtotal Devol.</span>
                <span className="text-lg font-black text-orange-500">-${subtotalReturns.toLocaleString()}</span>
              </div>
            )}
            {activeClient && activeClient.current_balance < 0 && (
              <div className="flex justify-between items-center mb-1 text-red-500 mt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={includeDebt} onChange={e => { setIncludeDebt(e.target.checked); if (e.target.checked) setVueltoACuenta(true) }} className="w-3.5 h-3.5 accent-red-500 rounded-sm" />
                  <span className="text-xs font-bold uppercase tracking-wider">Deuda Previa</span>
                </label>
                <span className="text-sm font-black">+ ${Math.abs(activeClient.current_balance)}</span>
              </div>
            )}
            <div className="flex justify-between items-end mt-2 pt-2 border-t border-brand-muted/20">
              <span className="text-xs font-bold text-brand-deep uppercase tracking-wider">Total a Pagar</span>
              <span className={`text-2xl font-black ${expectedTotal < 0 ? 'text-orange-500' : 'text-brand-deep'}`}>
                {expectedTotal < 0 ? `-$${Math.abs(expectedTotal).toLocaleString()}` : `$${expectedTotal.toLocaleString()}`}
              </span>
            </div>
          </div>

          {expectedTotal >= 0 ? (
            <div className="flex bg-brand-muted/10 p-1 rounded-xl mt-3 mb-2">
              <button onClick={() => setPaymentMethod('efectivo')} className={`flex-1 py-1.5 text-[10px] sm:text-[11px] uppercase tracking-wider font-bold rounded-lg transition-all ${paymentMethod === 'efectivo' ? 'bg-white shadow-sm text-green-600' : 'text-brand-muted/80'}`}>Efectivo</button>
              <button onClick={() => setPaymentMethod('transferencia')} className={`flex-1 py-1.5 text-[10px] sm:text-[11px] uppercase tracking-wider font-bold rounded-lg transition-all ${paymentMethod === 'transferencia' ? 'bg-white shadow-sm text-brand-navy' : 'text-brand-muted/80'}`}>Transf.</button>
              <button onClick={() => setPaymentMethod('ambos')} className={`flex-1 py-1.5 text-[10px] sm:text-[11px] uppercase tracking-wider font-bold rounded-lg transition-all ${paymentMethod === 'ambos' ? 'bg-white shadow-sm text-brand-deep' : 'text-brand-muted/80'}`}>Mixto</button>
              {activeClient && (activeClient.allow_credit || activeClient.current_balance !== 0) && (
                <button onClick={() => setPaymentMethod('ctacte')} className={`flex-1 py-1.5 text-[10px] sm:text-[11px] uppercase tracking-wider font-bold rounded-lg transition-all ${paymentMethod === 'ctacte' ? 'bg-white shadow-sm text-orange-500' : 'text-brand-muted/80'}`}>Cta. Cte.</button>
              )}
            </div>
          ) : (
            <div className="bg-orange-500/10 border border-orange-500/20 p-3 rounded-xl mt-3 mb-2 text-center">
              <p className="text-[11px] font-bold text-orange-600 uppercase flex items-center justify-center gap-1.5">
                <Users size={14} /> Devolución a Cuenta Corriente
              </p>
              <p className="text-[11px] font-semibold text-brand-deep mt-1 leading-tight">
                El monto (-${Math.abs(expectedTotal).toLocaleString()}) se acreditará a la Cuenta Corriente del cliente.
              </p>
            </div>
          )}

          <div className="space-y-2.5">
            {expectedTotal >= 0 && (paymentMethod === 'efectivo' || paymentMethod === 'ambos') && (
              <div className="flex items-center justify-between bg-bg-surface shadow-sm border border-brand-muted/20 p-2.5 rounded-xl text-xs">
                <span className="font-bold text-brand-deep/80 flex items-center gap-1.5"><Banknote size={14} className="text-green-500" /> Efectivo</span>
                <input type="number" value={payCash} onChange={e => { setPayCash(e.target.value); if (paymentMethod !== 'ambos') setPaymentMethod('ambos') }} className="w-20 h-7 px-2 bg-brand-muted/5 border border-brand-muted/30 text-brand-deep rounded-lg text-right font-bold text-xs" placeholder="0" />
              </div>
            )}
            {expectedTotal >= 0 && (paymentMethod === 'transferencia' || paymentMethod === 'ambos') && (
              <div className="flex items-center justify-between bg-bg-surface shadow-sm border border-brand-muted/20 p-2.5 rounded-xl text-xs">
                <span className="font-bold text-brand-deep/80 flex items-center gap-1.5"><CreditCard size={14} className="text-brand-navy" /> Transf.</span>
                <input type="number" value={payTransfer} onChange={e => { setPayTransfer(e.target.value); if (paymentMethod !== 'ambos') setPaymentMethod('ambos') }} className="w-20 h-7 px-2 bg-brand-muted/5 border border-brand-muted/30 text-brand-deep rounded-lg text-right font-bold text-xs" placeholder="0" />
              </div>
            )}
            {expectedTotal >= 0 && activeClient && (activeClient.allow_credit || activeClient.current_balance !== 0) && (paymentMethod === 'ctacte' || paymentMethod === 'ambos') && (
              <div className="flex items-center justify-between bg-bg-surface shadow-sm border border-brand-muted/20 p-2.5 rounded-xl text-xs">
                <span className="font-bold text-brand-deep/80 flex items-center gap-1.5"><Users size={14} className="text-orange-500" /> Cta. Cte. (Falta)</span>
                <input type="number" value={Math.max(0, remainingToPay)} readOnly className="w-20 h-7 px-2 bg-brand-muted/5 border border-brand-muted/30 text-brand-deep rounded-lg text-right font-bold text-xs outline-none cursor-default" />
              </div>
            )}
          </div>

          {expectedTotal >= 0 && remainingToPay !== 0 && (
            <div className={`p-3 rounded-xl border text-[11px] font-bold flex justify-between items-center ${remainingToPay > 0 ? 'bg-brand-orange/5 border-orange-500/20 text-orange-400' : 'bg-green-500/5 border-green-500/20 text-green-400'}`}>
              <span>{remainingToPay > 0 ? 'Falta pagar (a Cuenta Corriente):' : (subtotalSales === 0 || vueltoACuenta ? 'Pago de Deuda / Saldo a favor:' : 'Vuelto en Mano:')}</span>
              <span>${Math.abs(remainingToPay).toLocaleString()}</span>
            </div>
          )}

          {expectedTotal >= 0 && remainingToPay < 0 && subtotalSales > 0 && (
            <div className="flex items-center gap-2 px-1">
              <input type="checkbox" id="vueltoACuentaMostrador" checked={vueltoACuenta} onChange={e => setVueltoACuenta(e.target.checked)} className="w-3.5 h-3.5 accent-brand-navy rounded-sm" />
              <label htmlFor="vueltoACuentaMostrador" className="text-xs font-semibold text-brand-deep cursor-pointer">
                {activeClient && activeClient.current_balance < 0 ? 'Aplicar sobrante para pagar deuda' : 'Dejar vuelto a favor en Cuenta'}
              </label>
            </div>
          )}
          {expectedTotal >= 0 && remainingToPay < 0 && subtotalSales === 0 && (
            <div className="text-[10px] font-bold text-green-500 px-1 text-center">Ingreso de dinero para saldo de deuda o a favor</div>
          )}

          <button 
            onClick={handleProcess} 
            disabled={isProcessing || !selectedClientId || (subtotalSales === 0 && subtotalReturns === 0 && totalPaid === 0 && expectedTotal >= 0) || (expectedTotal >= 0 && remainingToPay > 0 && activeClient && !activeClient.allow_credit && (activeClient.current_balance - remainingToPay < 0))}
            className="w-full bg-brand-navy hover:bg-brand-navy text-white font-bold py-3 rounded-xl active:bg-blue-700 transition-colors disabled:opacity-30 flex justify-center items-center gap-2 text-sm"
          >
            <Printer size={16} />
            {isProcessing ? 'Procesando...' : 'Procesar Cobro'}
          </button>
        </div>
      </div>
    </div>
  )
}
