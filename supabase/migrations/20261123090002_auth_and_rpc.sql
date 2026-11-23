create or replace function public.handle_new_client()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.client (
    user_id,
    nom,
    prenom,
    email,
    telephone
  )
  values (
    new.id,
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'nom', '')), ''),
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'prenom', '')), ''),
    new.email,
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'telephone', '')), '')
  )
  on conflict (user_id) do update
  set email = excluded.email,
      nom = coalesce(excluded.nom, public.client.nom),
      prenom = coalesce(excluded.prenom, public.client.prenom),
      telephone = coalesce(excluded.telephone, public.client.telephone);
  return new;
end;
$$;

revoke all on function public.handle_new_client() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert or update of raw_user_meta_data, email on auth.users
for each row execute function public.handle_new_client();

create or replace function public.place_order(
  p_adresse text,
  p_ville text,
  p_mode_livraison text,
  p_paiement text,
  p_code text default null
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_client_id bigint;
  v_commande_id bigint;
  v_sous_total numeric(12, 2) := 0;
  v_remise numeric(12, 2) := 0;
  v_frais numeric(12, 2) := 0;
  v_total numeric(12, 2) := 0;
  v_statut text := 'En préparation';
  v_row record;
  v_cart_count integer;
begin
  if auth.uid() is null then
    raise exception 'Authentification requise';
  end if;

  select cl.id_client
  into v_client_id
  from public.client cl
  where cl.user_id = auth.uid();

  if v_client_id is null then
    raise exception 'Profil client introuvable';
  end if;

  if coalesce(trim(p_adresse), '') = '' then
    raise exception 'Adresse obligatoire';
  end if;

  if coalesce(trim(p_ville), '') = '' then
    raise exception 'Ville obligatoire';
  end if;

  select count(*)
  into v_cart_count
  from public.panier_ligne
  where id_client = v_client_id;

  if v_cart_count = 0 then
    raise exception 'Le panier est vide';
  end if;

  if p_mode_livraison is null or p_mode_livraison not in ('standard', 'express', 'retrait') then
    raise exception 'Mode de livraison invalide';
  end if;

  for v_row in
    select pl.id_produit, pl.quantite, pr.prix, pr.stock, pr.id_categorie
    from public.panier_ligne pl
    join public.produit pr on pr.id_produit = pl.id_produit
    where pl.id_client = v_client_id
    for update of pr
  loop
    if v_row.stock < v_row.quantite then
      raise exception 'Stock insuffisant pour le produit %', v_row.id_produit;
    end if;

    v_sous_total := v_sous_total + v_row.prix * v_row.quantite;

    if v_row.id_categorie in (6, 7, 8) then
      v_statut := 'Réservation à confirmer';
    end if;
  end loop;

  if upper(coalesce(p_code, '')) = 'TOGO10' then
    v_remise := round(v_sous_total * 0.10, 2);
  end if;

  if p_mode_livraison = 'express' then
    v_frais := 3000;
  elsif p_mode_livraison = 'standard' and v_sous_total - v_remise < 100000 then
    v_frais := 1500;
  end if;

  v_total := v_sous_total - v_remise + v_frais;

  insert into public.commande (statut, id_client)
  values (v_statut, v_client_id)
  returning id_commande into v_commande_id;

  insert into public.adresse_commande (
    id_commande,
    adresse,
    ville,
    mode_livraison,
    frais_livraison
  )
  values (
    v_commande_id,
    trim(p_adresse),
    trim(p_ville),
    p_mode_livraison,
    v_frais
  );

  for v_row in
    select pl.id_produit, pl.quantite, pr.prix
    from public.panier_ligne pl
    join public.produit pr on pr.id_produit = pl.id_produit
    where pl.id_client = v_client_id
  loop
    insert into public.ligne_commande (
      id_commande,
      id_produit,
      quantite,
      prix_unitaire
    )
    values (
      v_commande_id,
      v_row.id_produit,
      v_row.quantite,
      v_row.prix
    );

    update public.produit
    set stock = stock - v_row.quantite
    where id_produit = v_row.id_produit;
  end loop;

  insert into public.paiement_commande (
    id_commande,
    fournisseur,
    statut,
    montant
  )
  values (
    v_commande_id,
    coalesce(nullif(trim(p_paiement), ''), 'Paiement à la livraison'),
    'Simulé',
    v_total
  );

  delete from public.panier_ligne
  where id_client = v_client_id;

  return v_commande_id;
end;
$$;

revoke all on function public.place_order(text, text, text, text, text)
  from public, anon, authenticated;
grant execute on function public.place_order(text, text, text, text, text) to authenticated;

create or replace function public.publish_product(
  p_nom text,
  p_description text,
  p_prix numeric,
  p_stock integer,
  p_id_categorie bigint
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_client_id bigint;
  v_plan text;
  v_limit integer;
  v_count integer;
  v_product_id bigint;
begin
  if auth.uid() is null then
    raise exception 'Authentification requise';
  end if;

  select cl.id_client
  into v_client_id
  from public.client cl
  where cl.user_id = auth.uid();

  if v_client_id is null then
    raise exception 'Profil client introuvable';
  end if;

  select pv.plan
  into v_plan
  from public.profil_vendeur pv
  where pv.id_client = v_client_id
    and pv.actif = true
    and (pv.date_fin is null or pv.date_fin >= current_date)
  for update;

  if v_plan is null then
    raise exception 'Abonnement vendeur requis';
  end if;

  v_limit := case v_plan
    when 'starter' then 5
    when 'pro' then 50
    else 2147483647
  end;

  select count(*)
  into v_count
  from public.produit_vendeur pv
  where pv.id_client = v_client_id;

  if v_count >= v_limit then
    raise exception 'Limite de publication atteinte';
  end if;

  if coalesce(trim(p_nom), '') = '' then
    raise exception 'Nom obligatoire';
  end if;

  if p_prix is null or p_prix <= 0 then
    raise exception 'Prix invalide';
  end if;

  if p_stock is null or p_stock < 0 then
    raise exception 'Stock invalide';
  end if;

  insert into public.produit (
    nom_produit,
    description,
    prix,
    stock,
    image,
    id_categorie
  )
  values (
    trim(p_nom),
    coalesce(trim(p_description), ''),
    p_prix,
    p_stock,
    null,
    p_id_categorie
  )
  returning id_produit into v_product_id;

  insert into public.produit_vendeur (id_produit, id_client)
  values (v_product_id, v_client_id);

  update public.produit
  set image = 'images/' || v_product_id || '.jpg'
  where id_produit = v_product_id;

  return v_product_id;
end;
$$;

revoke all on function public.publish_product(text, text, numeric, integer, bigint)
  from public, anon, authenticated;
grant execute on function public.publish_product(text, text, numeric, integer, bigint) to authenticated;

create or replace function public.choose_seller_plan(p_plan text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_client_id bigint;
begin
  if auth.uid() is null then
    raise exception 'Authentification requise';
  end if;

  if p_plan not in ('starter', 'pro', 'entreprise') then
    raise exception 'Plan invalide';
  end if;

  select cl.id_client
  into v_client_id
  from public.client cl
  where cl.user_id = auth.uid();

  if v_client_id is null then
    raise exception 'Profil client introuvable';
  end if;

  insert into public.profil_vendeur (id_client, plan, date_debut, date_fin, actif)
  values (v_client_id, p_plan, current_date, null, true)
  on conflict (id_client) do update
  set plan = excluded.plan,
      date_debut = current_date,
      date_fin = null,
      actif = true;
end;
$$;

revoke all on function public.choose_seller_plan(text) from public, anon, authenticated;
grant execute on function public.choose_seller_plan(text) to authenticated;

create or replace function public.request_partnership(
  p_type text,
  p_message text
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_client_id bigint;
  v_request_id bigint;
begin
  if auth.uid() is null then
    raise exception 'Authentification requise';
  end if;

  select cl.id_client
  into v_client_id
  from public.client cl
  where cl.user_id = auth.uid();

  if v_client_id is null then
    raise exception 'Profil client introuvable';
  end if;

  if not exists (
    select 1
    from public.profil_vendeur pv
    where pv.id_client = v_client_id
      and pv.plan in ('pro', 'entreprise')
      and pv.actif = true
      and (pv.date_fin is null or pv.date_fin >= current_date)
  ) then
    raise exception 'Le plan Pro ou Entreprise est requis';
  end if;

  if coalesce(trim(p_type), '') = '' or coalesce(trim(p_message), '') = '' then
    raise exception 'Type et message obligatoires';
  end if;

  insert into public.demande_partenariat (id_client, type, message)
  values (v_client_id, trim(p_type), trim(p_message))
  returning id_partenariat into v_request_id;

  return v_request_id;
end;
$$;

revoke all on function public.request_partnership(text, text) from public, anon, authenticated;
grant execute on function public.request_partnership(text, text) to authenticated;

create or replace function public.remove_product(p_id_produit bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_client_id bigint;
begin
  if auth.uid() is null then
    raise exception 'Authentification requise';
  end if;

  select cl.id_client
  into v_client_id
  from public.client cl
  where cl.user_id = auth.uid();

  if v_client_id is null or not exists (
    select 1
    from public.produit_vendeur pv
    where pv.id_produit = p_id_produit
      and pv.id_client = v_client_id
  ) then
    raise exception 'Produit introuvable ou non autorisé';
  end if;

  if exists (
    select 1
    from public.ligne_commande lc
    where lc.id_produit = p_id_produit
  ) then
    raise exception 'Un produit ayant des commandes ne peut pas être supprimé';
  end if;

  delete from public.produit
  where id_produit = p_id_produit;
end;
$$;

revoke all on function public.remove_product(bigint) from public, anon, authenticated;
grant execute on function public.remove_product(bigint) to authenticated;
