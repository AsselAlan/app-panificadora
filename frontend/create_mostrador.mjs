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
    DO $$
    DECLARE
      v_user_id uuid;
    BEGIN
      SELECT user_id INTO v_user_id FROM public.user_roles WHERE role = 'mostrador' LIMIT 1;
      
      IF v_user_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM public.drivers WHERE user_id = v_user_id OR is_mostrador = true) THEN
          INSERT INTO public.drivers (user_id, full_name, status, is_online, cash_collected, transfer_collected, is_mostrador)
          VALUES (v_user_id, 'Mostrador', 'En Base', false, 0, 0, true);
        END IF;
      END IF;
    END $$;
  `);
}

run();
