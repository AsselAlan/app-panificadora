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
    create policy "Allow read stock_updates" on public.stock_updates for select to authenticated using (true);
    create policy "Allow insert/update stock_updates" on public.stock_updates for all to authenticated using (true) with check (true);

    create policy "Allow read stock_update_items" on public.stock_update_items for select to authenticated using (true);
    create policy "Allow insert/update stock_update_items" on public.stock_update_items for all to authenticated using (true) with check (true);

    create policy "Allow read stock_losses" on public.stock_losses for select to authenticated using (true);
    create policy "Allow insert/update stock_losses" on public.stock_losses for all to authenticated using (true) with check (true);
    
    -- In case driver_settlements is missing policies too:
    create policy "Allow read driver_settlements" on public.driver_settlements for select to authenticated using (true);
    create policy "Allow insert/update driver_settlements" on public.driver_settlements for all to authenticated using (true) with check (true);
  `);
}

run();
