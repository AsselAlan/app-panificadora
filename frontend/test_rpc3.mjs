const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhyam95emNpYmJmcnZic2pqanRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMxNzUwMzIsImV4cCI6MjA5ODc1MTAzMn0.AJqrTF6P7bo3XUS2Dmw3tWSeqsDLdttGI_ineXOz6_g";
const baseUrl = "https://xrjoyzcibbfrvbsjjjtl.supabase.co/rest/v1";

async function test() {
  const headers = {
    'apikey': token,
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  const clientsRes = await fetch(`${baseUrl}/clients?select=id&limit=1`, { headers });
  const clients = await clientsRes.json();
  const clientId = clients[0].id;

  const driversRes = await fetch(`${baseUrl}/drivers?select=id&limit=1`, { headers });
  const drivers = await driversRes.json();
  const driverId = drivers[0].id;

  const payload = {
    "id": crypto.randomUUID(),
    "client_id": clientId,
    "driver_id": driverId,
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

  const res = await fetch(`${baseUrl}/rpc/process_offline_sale`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ payload })
  });
  
  if (res.ok) {
    console.log("Success:", await res.text());
  } else {
    console.error("Error:", res.status, await res.text());
  }
}

test();
