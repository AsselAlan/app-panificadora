-- ==========================================
-- ACTUALIZACIÓN V0.12 - FIX STOCK DEDUCTION
-- ==========================================

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
    v_old_item RECORD;
    v_existing_status VARCHAR(20);
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

    -- Verificar si ya existe este ticket en la base de datos
    SELECT status INTO v_existing_status FROM public.sales WHERE id = v_sale_id;

    IF v_existing_status IS NOT NULL THEN
        -- Si la venta ya estaba completada, retornar idempotente
        IF v_existing_status = 'completed' AND v_status = 'completed' THEN
            RETURN jsonb_build_object('success', true, 'message', 'Sale already completed', 'sale_id', v_sale_id);
        END IF;

        -- RESTAURAR STOCK DE LOS ITEMS ANTERIORES ANTES DE ELIMINARLOS
        FOR v_old_item IN SELECT * FROM public.sale_items WHERE sale_id = v_sale_id LOOP
            IF v_old_item.operation_type = 'sale' THEN
                UPDATE public.products
                SET bakery_stock = bakery_stock + v_old_item.quantity
                WHERE id = v_old_item.product_id;
            END IF;
            -- Borramos la devolucion si existia
            IF v_old_item.operation_type = 'return' THEN
                DELETE FROM public.stock_losses 
                WHERE product_id = v_old_item.product_id 
                  AND loss_date = v_transaction_date
                  AND driver_id = v_driver_id
                  AND client_id = v_client_id
                  AND loss_type = 'devolucion'
                  AND quantity = v_old_item.quantity;
            END IF;
        END LOOP;

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

        -- SIEMPRE descontar stock, independientemente de si es nuevo o actualizado (ya restauramos el previo)
        IF v_item.operation_type = 'sale' THEN
            -- Descuento directo de stock general para todos (Mostrador y Repartidores)
            UPDATE public.products
            SET bakery_stock = GREATEST(0, bakery_stock - v_item.quantity)
            WHERE id = v_item.product_id;
        ELSIF v_item.operation_type = 'return' THEN
            INSERT INTO public.stock_losses (product_id, quantity, loss_type, client_id, driver_id, loss_date)
            VALUES (v_item.product_id, v_item.quantity, 'devolucion', v_client_id, v_driver_id, v_transaction_date);
        END IF;
    END LOOP;

    -- 5. Impactar en Cuenta Corriente, Cajones y Caja solo si el estado es 'completed'
    IF v_status = 'completed' AND COALESCE(v_existing_status, 'draft') = 'draft' THEN
        UPDATE public.clients
        SET current_balance = current_balance - v_payment_account,
            cajones_prestados = cajones_prestados + v_cajones_left - v_cajones_returned
        WHERE id = v_client_id;

        IF v_transaction_date::DATE = CURRENT_DATE THEN
            UPDATE public.drivers
            SET cash_collected = cash_collected + v_payment_cash,
                transfer_collected = transfer_collected + v_payment_transfer,
                last_active = NOW()
            WHERE id = v_driver_id;
        END IF;
    END IF;

    RETURN jsonb_build_object('success', true, 'message', 'Sale processed successfully', 'sale_id', v_sale_id, 'status', v_status);
EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Error processing offline sale: %', SQLERRM;
END;
$$ LANGUAGE plpgsql;
