begin;

create table public.admin_accounts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.admin_accounts enable row level security;
revoke all on table public.admin_accounts from public, anon, authenticated;

create table public.admin_order_stock_restocked (
  id_commande bigint primary key
    references public.commande(id_commande) on delete cascade,
  restored_at timestamptz not null default now()
);

alter table public.admin_order_stock_restocked enable row level security;
revoke all on table public.admin_order_stock_restocked from public, anon, authenticated;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null
    and exists (
      select 1
      from public.admin_accounts aa
      where aa.user_id = auth.uid()
    );
$$;

revoke all on function public.is_admin() from public, anon, authenticated;
grant execute on function public.is_admin() to authenticated;

create or replace function public.admin_dashboard(p_days integer default 30)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  if not public.is_admin() then
    raise exception 'Accès administrateur requis';
  end if;

  if p_days is null or p_days < 1 or p_days > 3650 then
    raise exception 'Période invalide';
  end if;

  select jsonb_build_object(
    'periode_jours', p_days,
    'chiffre_affaires', coalesce((
      select sum(lc.quantite * lc.prix_unitaire)
      from public.commande c
      join public.ligne_commande lc on lc.id_commande = c.id_commande
      where c.date_commande >= now() - make_interval(days => p_days)
        and c.date_commande <= now()
        and c.statut <> 'Annulée'
    ), 0),
    'nombre_commandes', (
      select count(*)
      from public.commande c
      where c.date_commande >= now() - make_interval(days => p_days)
        and c.date_commande <= now()
    ),
    'commandes_non_annulees', (
      select count(*)
      from public.commande c
      where c.date_commande >= now() - make_interval(days => p_days)
        and c.date_commande <= now()
        and c.statut <> 'Annulée'
    ),
    'panier_moyen', coalesce((
      select round(
        sum(lc.quantite * lc.prix_unitaire)
        / nullif(count(distinct c.id_commande), 0),
        2
      )
      from public.commande c
      join public.ligne_commande lc on lc.id_commande = c.id_commande
      where c.date_commande >= now() - make_interval(days => p_days)
        and c.date_commande <= now()
        and c.statut <> 'Annulée'
    ), 0),
    'commandes_par_statut', coalesce((
      select jsonb_agg(
        jsonb_build_object('statut', stats.statut, 'nombre', stats.nombre)
        order by stats.statut
      )
      from (
        select c.statut, count(*) as nombre
        from public.commande c
        where c.date_commande >= now() - make_interval(days => p_days)
          and c.date_commande <= now()
        group by c.statut
      ) stats
    ), '[]'::jsonb),
    'meilleures_ventes', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id_produit', best.id_produit,
          'nom_produit', best.nom_produit,
          'quantite', best.quantite,
          'chiffre_affaires', best.chiffre_affaires
        )
        order by best.quantite desc, best.nom_produit
      )
      from (
        select p.id_produit,
               p.nom_produit,
               sum(lc.quantite) as quantite,
               sum(lc.quantite * lc.prix_unitaire) as chiffre_affaires
        from public.commande c
        join public.ligne_commande lc on lc.id_commande = c.id_commande
        join public.produit p on p.id_produit = lc.id_produit
        where c.date_commande >= now() - make_interval(days => p_days)
          and c.date_commande <= now()
          and c.statut <> 'Annulée'
        group by p.id_produit, p.nom_produit
        order by sum(lc.quantite) desc, p.nom_produit
        limit 5
      ) best
    ), '[]'::jsonb),
    'ruptures', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id_produit', p.id_produit,
          'nom_produit', p.nom_produit,
          'stock', p.stock
        )
        order by p.nom_produit
      )
      from public.produit p
      where p.stock = 0
    ), '[]'::jsonb),
    'stock_faible', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id_produit', p.id_produit,
          'nom_produit', p.nom_produit,
          'stock', p.stock
        )
        order by p.stock, p.nom_produit
      )
      from public.produit p
      where p.stock > 0 and p.stock < 5
    ), '[]'::jsonb)
  )
  into v_result;

  return v_result;
end;
$$;

revoke all on function public.admin_dashboard(integer) from public, anon, authenticated;
grant execute on function public.admin_dashboard(integer) to authenticated;

create or replace function public.admin_list_orders(
  p_status text default null,
  p_search text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  if not public.is_admin() then
    raise exception 'Accès administrateur requis';
  end if;

  select jsonb_build_object(
    'statuses', coalesce((
      select jsonb_agg(statuses.statut order by statuses.statut)
      from (
        select distinct c.statut
        from public.commande c
      ) statuses
    ), '[]'::jsonb),
    'orders', coalesce((
      select jsonb_agg(
        orders.order_data
        order by orders.date_commande desc, orders.id_commande desc
      )
      from (
        select c.id_commande,
               c.date_commande,
               jsonb_build_object(
                 'id_commande', c.id_commande,
                 'date_commande', c.date_commande,
                 'client', concat_ws(' ', cl.prenom, cl.nom),
                 'email', cl.email,
                 'total', coalesce((
                   select pc.montant
                   from public.paiement_commande pc
                   where pc.id_commande = c.id_commande
                 ), (
                   select sum(lc.quantite * lc.prix_unitaire)
                   from public.ligne_commande lc
                   where lc.id_commande = c.id_commande
                 ), 0),
                 'mode_paiement', (
                   select pc.fournisseur
                   from public.paiement_commande pc
                   where pc.id_commande = c.id_commande
                 ),
                 'statut', c.statut
               ) as order_data
        from public.commande c
        join public.client cl on cl.id_client = c.id_client
        where (p_status is null or c.statut = p_status)
          and (
            nullif(trim(p_search), '') is null
            or concat_ws(' ', c.id_commande::text, cl.prenom, cl.nom, cl.email)
              ilike '%' || trim(p_search) || '%'
          )
      ) orders
    ), '[]'::jsonb)
  )
  into v_result;

  return v_result;
end;
$$;

revoke all on function public.admin_list_orders(text, text) from public, anon, authenticated;
grant execute on function public.admin_list_orders(text, text) to authenticated;

create or replace function public.admin_get_order(p_id bigint)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  if not public.is_admin() then
    raise exception 'Accès administrateur requis';
  end if;

  select jsonb_build_object(
    'id_commande', c.id_commande,
    'date_commande', c.date_commande,
    'statut', c.statut,
    'client', jsonb_build_object(
      'nom', concat_ws(' ', cl.prenom, cl.nom),
      'email', cl.email,
      'telephone', cl.telephone
    ),
    'adresse', (
      select jsonb_build_object(
        'adresse', ac.adresse,
        'ville', ac.ville,
        'mode_livraison', ac.mode_livraison,
        'frais_livraison', ac.frais_livraison
      )
      from public.adresse_commande ac
      where ac.id_commande = c.id_commande
    ),
    'paiement', (
      select jsonb_build_object(
        'fournisseur', pc.fournisseur,
        'statut', pc.statut,
        'montant', pc.montant,
        'cree_le', pc.cree_le
      )
      from public.paiement_commande pc
      where pc.id_commande = c.id_commande
    ),
    'lignes', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id_produit', p.id_produit,
          'nom_produit', p.nom_produit,
          'quantite', lc.quantite,
          'prix_unitaire', lc.prix_unitaire,
          'total', lc.quantite * lc.prix_unitaire
        )
        order by p.nom_produit
      )
      from public.ligne_commande lc
      join public.produit p on p.id_produit = lc.id_produit
      where lc.id_commande = c.id_commande
    ), '[]'::jsonb),
    'total', coalesce((
      select pc.montant
      from public.paiement_commande pc
      where pc.id_commande = c.id_commande
    ), (
      select sum(lc.quantite * lc.prix_unitaire)
      from public.ligne_commande lc
      where lc.id_commande = c.id_commande
    ), 0)
  )
  into v_result
  from public.commande c
  join public.client cl on cl.id_client = c.id_client
  where c.id_commande = p_id;

  if v_result is null then
    raise exception 'Commande introuvable';
  end if;

  return v_result;
end;
$$;

revoke all on function public.admin_get_order(bigint) from public, anon, authenticated;
grant execute on function public.admin_get_order(bigint) to authenticated;

create or replace function public.admin_update_order_status(
  p_id bigint,
  p_status text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_previous_status text;
  v_restocked boolean := false;
  v_inserted integer := 0;
begin
  if not public.is_admin() then
    raise exception 'Accès administrateur requis';
  end if;

  if p_id is null or p_status is null or trim(p_status) = '' then
    raise exception 'Commande et statut obligatoires';
  end if;

  if p_status not in (
    'En attente',
    'Payée',
    'En préparation',
    'Expédiée',
    'Livrée',
    'Annulée',
    'Réservation à confirmer'
  ) and not exists (
    select 1
    from public.commande c
    where c.statut = p_status
  ) then
    raise exception 'Statut de commande invalide';
  end if;

  select c.statut
  into v_previous_status
  from public.commande c
  where c.id_commande = p_id
  for update;

  if not found then
    raise exception 'Commande introuvable';
  end if;

  if p_status = 'Annulée' and v_previous_status <> 'Annulée' then
    insert into public.admin_order_stock_restocked (id_commande)
    values (p_id)
    on conflict (id_commande) do nothing;

    get diagnostics v_inserted = row_count;

    if v_inserted = 1 then
      update public.produit p
      set stock = p.stock + restock.quantite
      from (
        select lc.id_produit, sum(lc.quantite)::integer as quantite
        from public.ligne_commande lc
        where lc.id_commande = p_id
        group by lc.id_produit
      ) restock
      where p.id_produit = restock.id_produit;
      v_restocked := true;
    end if;
  end if;

  update public.commande
  set statut = p_status
  where id_commande = p_id;

  return jsonb_build_object(
    'id_commande', p_id,
    'ancien_statut', v_previous_status,
    'statut', p_status,
    'stock_restitue', v_restocked
  );
end;
$$;

revoke all on function public.admin_update_order_status(bigint, text) from public, anon, authenticated;
grant execute on function public.admin_update_order_status(bigint, text) to authenticated;

commit;
notify pgrst, 'reload schema';
