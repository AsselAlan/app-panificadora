import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xrjoyzcibbfrvbsjjjtl.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhyam95emNpYmJmcnZic2pqanRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMxNzUwMzIsImV4cCI6MjA5ODc1MTAzMn0.AJqrTF6P7bo3XUS2Dmw3tWSeqsDLdttGI_ineXOz6_g';
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const payload = {
    "id": "a089a210-8201-41f7-aca6-f0bc53fc9d39",
    "client_id": "00000000-0000-0000-0000-000000000000",
    "driver_id": "00000000-0000-0000-0000-000000000000",
    "transaction_date": new Date().toISOString(),
    "subtotal_sales": 100,
    "total_returns": 0,
    "applied_debt": 0,
    "final_total": 100,
    "payment_cash": 100,
    "payment_transfer": 0,
    "payment_account": 0,
    "cajones_left": 0,
    "cajones_returned": 0,
    "status": "draft",
    "items": []
  };

  const { data, error } = await supabase.rpc('process_offline_sale', { payload });
  console.log("Data:", data);
  console.log("Error:", error);
}

test();
