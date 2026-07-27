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
    console.log("SQL Success:", await res.text());
  } else {
    console.error("SQL Error:", await res.text());
  }
}

async function run() {
  await executeSql(`
    -- Borrar todos los usuarios excepto el admin
    DELETE FROM auth.users WHERE email != 'admin@panificadora.com';
    
    -- Borrar todos los datos transaccionales y entidades
    TRUNCATE TABLE public.stock_updates CASCADE;
    TRUNCATE TABLE public.sale_items CASCADE;
    TRUNCATE TABLE public.sales CASCADE;
    TRUNCATE TABLE public.loads CASCADE;
    TRUNCATE TABLE public.weekly_routes CASCADE;
    TRUNCATE TABLE public.expenses CASCADE;
    TRUNCATE TABLE public.driver_settlements CASCADE;
    TRUNCATE TABLE public.drivers CASCADE;
    TRUNCATE TABLE public.clients CASCADE;
    TRUNCATE TABLE public.products CASCADE;
    
    -- Nota: NO truncamos expense_categories ni driver_expense_categories porque son configuraciones maestras base.
  `);
}

run();
