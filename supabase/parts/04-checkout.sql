-- SH GAMING STORE — 04-checkout.sql
-- Run the parts IN ORDER (01 then 02 ...). Each is safe to re-run.

-- ============================================================
-- CHECKOUT: atomic wallet purchase + key delivery
-- ============================================================
create or replace function public.checkout_with_wallet(
  p_items jsonb,          -- [{product_id, variant_id, qty}]
  p_note  text default null
)
returns public.orders
language plpgsql security definer set search_path = public
as $$
declare
  v_uid    uuid := auth.uid();
  v_order  public.orders;
  v_item   jsonb;
  v_prod   public.products;
  v_var    public.product_variants;
  v_price  numeric(12,2);
  v_total  numeric(12,2) := 0;
  v_bal    numeric(12,2);
  v_key    public.license_keys;
  i        int;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if jsonb_array_length(coalesce(p_items,'[]'::jsonb)) = 0 then raise exception 'EMPTY_CART'; end if;

  -- Trusted debit path: allow this transaction to write profiles.wallet.
  -- Transaction-local (third arg true), so it clears on commit/rollback.
  perform set_config('app.bypass_profile_guard', 'on', true);

  select wallet into v_bal from public.profiles where id = v_uid for update;
  if v_bal is null then raise exception 'NO_PROFILE'; end if;

  insert into public.orders (user_id, status, total, pay_method, note)
  values (v_uid, 'pending', 0, 'wallet', p_note)
  returning * into v_order;

  for v_item in select * from jsonb_array_elements(p_items) loop
    select * into v_prod from public.products
      where id = (v_item->>'product_id')::uuid and active = true;
    if v_prod.id is null then raise exception 'PRODUCT_UNAVAILABLE'; end if;

    v_price := v_prod.price;
    v_var := null;
    if v_item->>'variant_id' is not null then
      select * into v_var from public.product_variants
        where id = (v_item->>'variant_id')::uuid and product_id = v_prod.id and active = true;
      if v_var.id is null then raise exception 'VARIANT_UNAVAILABLE'; end if;
      v_price := v_var.price;
    end if;

    for i in 1..greatest(1, coalesce((v_item->>'qty')::int, 1)) loop
      -- lock one available key
      select * into v_key from public.license_keys
        where product_id = v_prod.id
          and status = 'available'
          and (v_var.id is null or variant_id is null or variant_id = v_var.id)
        order by created_at
        for update skip locked
        limit 1;
      if v_key.id is null then
        raise exception 'OUT_OF_STOCK: %', v_prod.name;
      end if;

      update public.license_keys
        set status='sold', order_id=v_order.id, sold_to=v_uid, sold_at=now()
        where id = v_key.id;

      insert into public.order_items
        (order_id, product_id, variant_id, product_name, variant_label, unit_price, qty, delivered_key)
      values
        (v_order.id, v_prod.id, v_var.id, v_prod.name, v_var.label, v_price, 1, v_key.key_value);

      v_total := v_total + v_price;
    end loop;
  end loop;

  if v_bal < v_total then raise exception 'INSUFFICIENT_FUNDS'; end if;

  update public.profiles set wallet = wallet - v_total where id = v_uid;
  insert into public.wallet_txns (user_id, amount, kind, ref_id, note)
    values (v_uid, -v_total, 'purchase', v_order.id, 'Order ' || v_order.order_no);

  update public.orders
    set total = v_total, status = 'delivered', delivered_at = now()
    where id = v_order.id
    returning * into v_order;

  return v_order;
end;
$$;

revoke all on function public.checkout_with_wallet(jsonb,text) from public;
grant execute on function public.checkout_with_wallet(jsonb,text) to authenticated;

-- ============================================================
-- ADMIN: approve a top-up (credits wallet atomically)
-- ============================================================
create or replace function public.approve_topup(p_topup_id uuid, p_note text default null)
returns public.topups
language plpgsql security definer set search_path = public
as $$
declare v_t public.topups;
begin
  if not public.is_admin() then raise exception 'FORBIDDEN'; end if;

  -- Trusted credit path: allow this transaction to write profiles.wallet.
  perform set_config('app.bypass_profile_guard', 'on', true);

  select * into v_t from public.topups where id = p_topup_id for update;
  if v_t.id is null then raise exception 'NOT_FOUND'; end if;
  if v_t.status <> 'pending' then raise exception 'ALREADY_REVIEWED'; end if;

  update public.profiles set wallet = wallet + v_t.amount where id = v_t.user_id;
  insert into public.wallet_txns (user_id, amount, kind, ref_id, note)
    values (v_t.user_id, v_t.amount, 'topup', v_t.id, coalesce(p_note,'Top-up approved'));

  update public.topups
    set status='approved', admin_note=p_note, reviewed_at=now()
    where id = p_topup_id returning * into v_t;
  return v_t;
end;
$$;

grant execute on function public.approve_topup(uuid,text) to authenticated;
