import fs from 'fs';

const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhyam95emNpYmJmcnZic2pqanRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMxNzUwMzIsImV4cCI6MjA5ODc1MTAzMn0.AJqrTF6P7bo3XUS2Dmw3tWSeqsDLdttGI_ineXOz6_g";
const projectId = "xrjoyzcibbfrvbsjjjtl";

async function executeSql(query) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${projectId}/database/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query })
  });
  
  if (res.ok) {
    console.log("SQL Success:", await res.text());
  } else {
    console.error("SQL Error:", await res.text());
  }
}

async function run() {
  const sql = `
CREATE OR REPLACE FUNCTION public.process_offline_sale(payload JSONB)
RETURNS JSONB
SECURITY DEFINER
AS $$
DECLARE
    v_sale_id UUID;
    v_client_id UUID;
    v_driver_id UUID;
    v_transaction_date TIMESTAMPTZ;
    v_subtotal_sales NUMERIC(12,2);
    v_total_returns NUMERIC(12,2);
    v_applied_debt NUMERIC(12,2);
    v_final_total NUMERIC(12,2);
    v_payment_cash NUMERIC(12,2);
    v_payment_transfer NUMERIC(12,2);
    v_payment_account NUMERIC(12,2);
    v_cajones_left INTEGER;
    v_cajones_returned INTEGER;
    v_status VARCHAR(20);
    v_item RECORD;
    v_existing_status VARCHAR(20);
    v_is_mostrador BOOLEAN;
BEGIN
    -- 1. Extraer datos principales del JSON
    v_sale_id := (payload->>'id')::UUID;
    v_client_id := (payload->>'client_id')::UUID;
    v_driver_id := (payload->>'driver_id')::UUID;
    v_transaction_date := (payload->>'transaction_date')::TIMESTAMPTZ;
    v_subtotal_sales := (payload->>'subtotal_sales')::NUMERIC;
    v_total_returns := (payload->>'total_returns')::NUMERIC;
    v_applied_debt := (payload->>'applied_debt')::NUMERIC;
    v_final_total := (payload->>'final_total')::NUMERIC;
    v_payment_cash := (payload->>'payment_cash')::NUMERIC;
    v_payment_transfer := (payload->>'payment_transfer')::NUMERIC;
    v_payment_account := (payload->>'payment_account')::NUMERIC;
    v_cajones_left := COALESCE((payload->>'cajones_left')::INTEGER, 0);
    v_cajones_returned := COALESCE((payload->>'cajones_returned')::INTEGER, 0);
    v_status := COALESCE(payload->>'status', 'completed');

    -- Determinar si el conductor es Mostrador
    SELECT is_mostrador INTO v_is_mostrador FROM public.drivers WHERE id = v_driver_id;

    -- Verificar si ya existe este ticket en la base de datos
    SELECT status INTO v_existing_status FROM public.sales WHERE id = v_sale_id;

    IF v_existing_status IS NOT NULL THEN
        -- Si la venta ya estaba completada, retornar idempotente
        IF v_existing_status = 'completed' AND v_status = 'completed' THEN
            RETURN jsonb_build_object('success', true, 'message', 'Sale already completed', 'sale_id', v_sale_id);
        END IF;

        -- Si existía como borrador y ahora pasa a 'completed' o se actualiza borrador:
        -- Limpiar ítems previos para re-insertar del comprobante actualizado
        DELETE FROM public.sale_items WHERE sale_id = v_sale_id;
        
        UPDATE public.sales SET
            subtotal_sales = v_subtotal_sales,
            total_returns = v_total_returns,
            applied_debt = v_applied_debt,
            final_total = v_final_total,
            payment_cash = v_payment_cash,
            payment_transfer = v_payment_transfer,
            payment_account = v_payment_account,
            status = v_status,
            transaction_date = v_transaction_date
        WHERE id = v_sale_id;
    ELSE
        -- Insertar nueva venta
        INSERT INTO public.sales (
            id, client_id, driver_id, transaction_date, 
            subtotal_sales, total_returns, applied_debt, final_total, 
            payment_cash, payment_transfer, payment_account, status
        ) VALUES (
            v_sale_id, v_client_id, v_driver_id, v_transaction_date,
            v_subtotal_sales, v_total_returns, v_applied_debt, v_final_total,
            v_payment_cash, v_payment_transfer, v_payment_account, v_status
        );
    END IF;

    -- 4. Procesar ítems y actualizar stock
    FOR v_item IN 
        SELECT 
            (elem->>'product_id')::UUID AS product_id,
            (elem->>'operation_type')::VARCHAR AS operation_type,
            (elem->>'quantity')::NUMERIC AS quantity,
            (elem->>'unit_price')::NUMERIC AS unit_price
        FROM jsonb_array_elements(payload->'items') AS elem
    LOOP
        INSERT INTO public.sale_items (
            sale_id, product_id, operation_type, quantity, unit_price
        ) VALUES (
            v_sale_id, v_item.product_id, v_item.operation_type, v_item.quantity, v_item.unit_price
        );

        -- Solo descontar stock si es la primera inserción (cuando no existía previamente el borrador)
        IF v_existing_status IS NULL THEN
            IF v_item.operation_type = 'sale' THEN
                UPDATE public.loads
                SET current_quantity = current_quantity - v_item.quantity
                WHERE driver_id = v_driver_id 
                  AND product_id = v_item.product_id
                  AND date::DATE = CURRENT_DATE;
            ELSIF v_item.operation_type = 'return' THEN
                UPDATE public.loads
                SET returns_quantity = returns_quantity + v_item.quantity
                WHERE driver_id = v_driver_id 
                  AND product_id = v_item.product_id
                  AND date::DATE = CURRENT_DATE;
            END IF;
        END IF;
    END LOOP;

    -- 5. Actualizar deuda del cliente (si finaliza el comprobante)
    IF v_status = 'completed' AND v_existing_status IS DISTINCT FROM 'completed' THEN
        IF v_payment_account > 0 THEN
            UPDATE public.clients SET balance = balance + v_payment_account WHERE id = v_client_id;
        END IF;
        IF v_applied_debt > 0 THEN
            UPDATE public.clients SET balance = balance - v_applied_debt WHERE id = v_client_id;
        END IF;
        UPDATE public.drivers
        SET 
            cash_collected = cash_collected + v_payment_cash,
            transfer_collected = transfer_collected + v_payment_transfer
        WHERE id = v_driver_id;
    END IF;

    -- 7. Registrar transacción en current_account si aplica
    IF v_status = 'completed' AND v_existing_status IS DISTINCT FROM 'completed' AND (v_payment_account > 0 OR v_applied_debt > 0 OR v_payment_cash > 0 OR v_payment_transfer > 0) THEN
        INSERT INTO public.current_account (
            client_id, driver_id, transaction_date, 
            description, amount, balance_after
        ) VALUES (
            v_client_id, v_driver_id, v_transaction_date,
            'Venta y/o Cobro (Ticket ' || substr(v_sale_id::text, 1, 8) || ')',
            (v_payment_account * -1) + v_applied_debt,
            (SELECT balance FROM public.clients WHERE id = v_client_id)
        );
    END IF;

    -- 8. Actualizar saldo de cajones del cliente
    IF v_status = 'completed' AND v_existing_status IS DISTINCT FROM 'completed' AND (v_cajones_left > 0 OR v_cajones_returned > 0) THEN
        UPDATE public.clients
        SET cajones_prestados = cajones_prestados + v_cajones_left - v_cajones_returned
        WHERE id = v_client_id;
    END IF;

    RETURN jsonb_build_object('success', true, 'message', 'Sale processed successfully', 'sale_id', v_sale_id);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM, 'state', SQLSTATE, 'detail', SQLSTATE || ' - ' || SQLERRM);
END;
$$ LANGUAGE plpgsql;
  `;
  await executeSql(sql);
}

run();
