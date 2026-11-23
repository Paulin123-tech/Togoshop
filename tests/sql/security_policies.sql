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

  if has_table_privilege('anon', 'public.commande', 'INSERT')
     or has_table_privilege('authenticated', 'public.commande', 'INSERT')
     or has_table_privilege('authenticated', 'public.produit', 'UPDATE') then
    raise exception 'Un accès direct non autorisé aux commandes ou produits est accordé';
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
  or has_function_privilege('anon', 'public.choose_seller_plan(text)', 'EXECUTE')
  or has_function_privilege('anon', 'public.request_partnership(text, text)', 'EXECUTE')
  or has_function_privilege('anon', 'public.remove_product(bigint)', 'EXECUTE') then
    raise exception 'Les visiteurs anonymes ne doivent pas exécuter les RPC métier';
  end if;

  if not has_function_privilege(
    'authenticated',
    'public.place_order(text, text, text, text, text)',
    'EXECUTE'
  ) then
    raise exception 'Les utilisateurs authentifiés doivent pouvoir exécuter place_order';
  end if;
end;
$$;

rollback;
