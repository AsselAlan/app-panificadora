const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhyam95emNpYmJmcnZic2pqanRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMxNzUwMzIsImV4cCI6MjA5ODc1MTAzMn0.AJqrTF6P7bo3XUS2Dmw3tWSeqsDLdttGI_ineXOz6_g";
const baseUrl = "https://xrjoyzcibbfrvbsjjjtl.supabase.co/rest/v1";

async function test() {
  const headers = {
    'apikey': token,
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  const res = await fetch(`${baseUrl}/sales?id=eq.a089a210-8201-41f7-aca6-f0bc53fc9d39`, { headers });
  const data = await res.json();
  console.log("Sales found:", data);
}

test();
