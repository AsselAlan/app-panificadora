const token = "sbp_1b775ea1d9b5c9101a12e42663bfce81660f7ca1";
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
    console.log(await res.json());
  } else {
    console.error("SQL Error:", await res.text());
  }
}

async function run() {
  await executeSql(`
    SELECT tablename, rowsecurity 
    FROM pg_tables 
    WHERE schemaname = 'public' AND tablename LIKE 'stock_%';
    
    SELECT tablename, policyname 
    FROM pg_policies 
    WHERE schemaname = 'public' AND tablename LIKE 'stock_%';
  `);
}

run();
