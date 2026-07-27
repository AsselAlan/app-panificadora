const url = 'https://xrjoyzcibbfrvbsjjjtl.supabase.co';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhyam95emNpYmJmcnZic2pqanRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMxNzUwMzIsImV4cCI6MjA5ODc1MTAzMn0.AJqrTF6P7bo3XUS2Dmw3tWSeqsDLdttGI_ineXOz6_g';

async function fix() {
  const headers = {
    'apikey': anonKey,
    'Authorization': `Bearer ${anonKey}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  };

  // Get user_roles
  let res = await fetch(`${url}/rest/v1/user_roles?role=eq.mostrador&select=user_id`, { headers });
  let roles = await res.json();
  if (roles.length === 0) {
    console.log("No mostrador role found.");
    return;
  }
  let userId = roles[0].user_id;

  // Insert driver
  let insertBody = {
    user_id: userId,
    full_name: 'Mostrador',
    status: 'En Base',
    is_online: false,
    cash_collected: 0,
    transfer_collected: 0,
    is_mostrador: true
  };
  
  res = await fetch(`${url}/rest/v1/drivers`, {
    method: 'POST',
    headers,
    body: JSON.stringify(insertBody)
  });
  
  if (!res.ok) {
    console.error("Failed to insert driver:", await res.text());
  } else {
    console.log("Driver Mostrador created!", await res.json());
  }
}
fix();
