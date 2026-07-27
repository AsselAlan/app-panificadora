import fs from 'fs';

const token = "sbp_191cf9439a9590a68e46b75aa304d4c6a8328db0";
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
  const sql = fs.readFileSync('../backend/update_v0.11_global_stock.sql', 'utf-8');
  await executeSql(sql);
}

run();
