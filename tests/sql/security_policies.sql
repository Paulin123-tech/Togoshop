begin;

-- Vérifier les invariants du schéma avant les tests RLS.
do $$
begin
  if (select count(*) from public.categorie) <> 9 then
    raise exception 'Le seed doit contenir exactement 9 catégories';
  end if;

  if (select count(*) from public.produit) <> 266 then
    raise exception 'Le seed doit contenir exactement 266 produits';
  end if;
end;
$$;

-- Vérifier les contraintes de stock et de quantité.
do $$
begin
  if exists (
    select 1
    from public.produit
    where stock < 0 or prix < 0
  ) then
    raise exception 'Prix ou stock invalide dans le catalogue';
  end if;

  if exists (
    select 1
    from public.ligne_commande
    where quantite <= 0 or prix_unitaire < 0
  ) then
    raise exception 'Ligne de commande invalide';
  end if;
end;
$$;

-- Vérifier que les tables privées ne permettent pas de contourner les RPC.
do $$
begin
  if exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind = 'r'
      and c.relname in (
        'categorie', 'produit', 'client', 'commande', 'ligne_commande',
        'adresse_commande', 'paiement_commande', 'panier_ligne', 'favori',
        'profil_vendeur', 'produit_vendeur', 'demande_partenariat'
      )
      and not c.relrowsecurity
  ) then
    raise exception 'Toutes les tables publiques doivent activer RLS';
  end if;

  if exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname in (
        'admin_accounts', 'admin_order_stock_restocked',
        'promo_codes', 'promo_code_uses'
      )
      and not c.relrowsecurity
  ) then
    raise exception 'Les tables internes admin doivent activer RLS';
  end if;

  if exists (
    select 1
    from pg_policies p
    where p.schemaname = 'public'
      and p.tablename in (
        'admin_accounts', 'admin_order_stock_restocked',
        'promo_codes', 'promo_code_uses'
      )
      and p.roles && array['anon', 'authenticated', 'public']::name[]
  ) then
    raise exception 'Aucune policy ne doit exposer les tables internes admin';
  end if;

  if has_table_privilege('anon', 'public.commande', 'INSERT')
     or has_table_privilege('authenticated', 'public.commande', 'INSERT')
     or has_table_privilege('authenticated', 'public.produit', 'UPDATE')
     or has_table_privilege('anon', 'public.admin_accounts', 'SELECT')
     or has_table_privilege('anon', 'public.admin_accounts', 'INSERT')
     or has_table_privilege('anon', 'public.admin_accounts', 'UPDATE')
     or has_table_privilege('anon', 'public.admin_accounts', 'DELETE')
     or has_table_privilege('authenticated', 'public.admin_accounts', 'SELECT')
     or has_table_privilege('authenticated', 'public.admin_accounts', 'INSERT')
     or has_table_privilege('authenticated', 'public.admin_accounts', 'UPDATE')
     or has_table_privilege('authenticated', 'public.admin_accounts', 'DELETE')
     or has_table_privilege('anon', 'public.admin_order_stock_restocked', 'SELECT')
     or has_table_privilege('anon', 'public.admin_order_stock_restocked', 'INSERT')
     or has_table_privilege('anon', 'public.admin_order_stock_restocked', 'UPDATE')
     or has_table_privilege('anon', 'public.admin_order_stock_restocked', 'DELETE')
     or has_table_privilege('authenticated', 'public.admin_order_stock_restocked', 'SELECT')
     or has_table_privilege('authenticated', 'public.admin_order_stock_restocked', 'INSERT')
     or has_table_privilege('authenticated', 'public.admin_order_stock_restocked', 'UPDATE')
     or has_table_privilege('authenticated', 'public.admin_order_stock_restocked', 'DELETE')
     or has_table_privilege('anon', 'public.promo_codes', 'SELECT')
     or has_table_privilege('anon', 'public.promo_codes', 'INSERT')
     or has_table_privilege('anon', 'public.promo_codes', 'UPDATE')
     or has_table_privilege('anon', 'public.promo_codes', 'DELETE')
     or has_table_privilege('authenticated', 'public.promo_codes', 'SELECT')
     or has_table_privilege('authenticated', 'public.promo_codes', 'INSERT')
     or has_table_privilege('authenticated', 'public.promo_codes', 'UPDATE')
     or has_table_privilege('authenticated', 'public.promo_codes', 'DELETE')
     or has_table_privilege('anon', 'public.promo_code_uses', 'SELECT')
     or has_table_privilege('anon', 'public.promo_code_uses', 'INSERT')
     or has_table_privilege('anon', 'public.promo_code_uses', 'UPDATE')
     or has_table_privilege('anon', 'public.promo_code_uses', 'DELETE')
     or has_table_privilege('authenticated', 'public.promo_code_uses', 'SELECT')
     or has_table_privilege('authenticated', 'public.promo_code_uses', 'INSERT')
     or has_table_privilege('authenticated', 'public.promo_code_uses', 'UPDATE')
     or has_table_privilege('authenticated', 'public.promo_code_uses', 'DELETE') then
    raise exception 'Un accès direct non autorisé aux commandes, produits ou tables admin est accordé';
  end if;

  if has_function_privilege(
    'anon',
    'public.place_order(text, text, text, text, text)',
    'EXECUTE'
  )
  or has_function_privilege(
    'anon',
    'public.publish_product(text, text, numeric, integer, bigint)',
    'EXECUTE'
  )
  or has_function_privilege('anon', 'public.choose_seller_plan(text, text)', 'EXECUTE')
  or has_function_privilege('anon', 'public.preview_seller_trial(text)', 'EXECUTE')
  or has_function_privilege('anon', 'public.activate_seller_plan(text, text)', 'EXECUTE')
  or has_function_privilege('anon', 'public.cancel_seller_trial()', 'EXECUTE')
  or has_function_privilege('anon', 'public.request_partnership(text, text)', 'EXECUTE')
  or has_function_privilege('anon', 'public.remove_product(bigint)', 'EXECUTE')
  or has_function_privilege('anon', 'public.is_admin()', 'EXECUTE')
  or has_function_privilege('anon', 'public.admin_dashboard(integer)', 'EXECUTE')
  or has_function_privilege('anon', 'public.admin_list_orders(text, text)', 'EXECUTE')
  or has_function_privilege('anon', 'public.admin_get_order(bigint)', 'EXECUTE')
  or has_function_privilege('anon', 'public.admin_update_order_status(bigint, text)', 'EXECUTE')
  or has_function_privilege('anon', 'public.admin_upsert_product(bigint, text, text, numeric, integer, text, bigint)', 'EXECUTE')
  or has_function_privilege('anon', 'public.admin_delete_product(bigint)', 'EXECUTE')
  or has_function_privilege('anon', 'public.admin_import_products(jsonb)', 'EXECUTE')
  or has_function_privilege('anon', 'public.admin_list_customers()', 'EXECUTE')
  or has_function_privilege('anon', 'public.admin_upsert_promo(bigint, text, text, numeric, timestamp with time zone, timestamp with time zone, integer, boolean)', 'EXECUTE')
  or has_function_privilege('anon', 'public.admin_delete_promo(bigint)', 'EXECUTE')
  or has_function_privilege('anon', 'public.admin_list_promos()', 'EXECUTE')
  or has_function_privilege('anon', 'public.preview_promo(text)', 'EXECUTE')
  or has_function_privilege('anon', 'public.place_order_with_promo(text, text, text, text, text)', 'EXECUTE') then
    raise exception 'Les visiteurs anonymes ne doivent pas exécuter les RPC métier';
  end if;

  if not has_function_privilege(
    'authenticated',
    'public.place_order(text, text, text, text, text)',
    'EXECUTE'
  )
  or not has_function_privilege(
    'authenticated',
    'public.choose_seller_plan(text, text)',
    'EXECUTE'
  )
  or not has_function_privilege(
    'authenticated',
    'public.preview_seller_trial(text)',
    'EXECUTE'
  )
  or not has_function_privilege(
    'authenticated',
    'public.activate_seller_plan(text, text)',
    'EXECUTE'
  )
  or not has_function_privilege(
    'authenticated',
    'public.cancel_seller_trial()',
    'EXECUTE'
  )
  or not has_function_privilege(
    'authenticated',
    'public.is_admin()',
    'EXECUTE'
  )
  or not has_function_privilege(
    'authenticated',
    'public.admin_dashboard(integer)',
    'EXECUTE'
  )
  or not has_function_privilege(
    'authenticated',
    'public.admin_list_orders(text, text)',
    'EXECUTE'
  )
  or not has_function_privilege(
    'authenticated',
    'public.admin_get_order(bigint)',
    'EXECUTE'
  )
  or not has_function_privilege(
    'authenticated',
    'public.admin_update_order_status(bigint, text)',
    'EXECUTE'
  )
  or not has_function_privilege(
    'authenticated',
    'public.admin_upsert_product(bigint, text, text, numeric, integer, text, bigint)',
    'EXECUTE'
  )
  or not has_function_privilege(
    'authenticated',
    'public.admin_delete_product(bigint)',
    'EXECUTE'
  )
  or not has_function_privilege(
    'authenticated',
    'public.admin_import_products(jsonb)',
    'EXECUTE'
  )
  or not has_function_privilege(
    'authenticated',
    'public.admin_list_customers()',
    'EXECUTE'
  )
  or not has_function_privilege(
    'authenticated',
    'public.admin_upsert_promo(bigint, text, text, numeric, timestamp with time zone, timestamp with time zone, integer, boolean)',
    'EXECUTE'
  )
  or not has_function_privilege(
    'authenticated',
    'public.admin_delete_promo(bigint)',
    'EXECUTE'
  )
  or not has_function_privilege(
    'authenticated',
    'public.admin_list_promos()',
    'EXECUTE'
  )
  or not has_function_privilege(
    'authenticated',
    'public.preview_promo(text)',
    'EXECUTE'
  )
  or not has_function_privilege(
    'authenticated',
    'public.place_order_with_promo(text, text, text, text, text)',
    'EXECUTE'
  ) then
    raise exception 'Les utilisateurs authentifiés doivent pouvoir exécuter les RPC métier';
  end if;
end;
$$;

rollback;
