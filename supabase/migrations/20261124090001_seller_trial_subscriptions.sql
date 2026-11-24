begin;

alter table public.client
  add column essai_vendeur_utilise boolean not null default false;

alter table public.profil_vendeur
  add column statut_abonnement text,
  add column mode_paiement text;

alter table public.profil_vendeur
  alter column date_debut type timestamptz
    using date_debut::timestamp at time zone 'UTC',
  alter column date_fin type timestamptz
    using date_fin::timestamp at time zone 'UTC';

update public.client cl
set essai_vendeur_utilise = true
where exists (
  select 1
  from public.profil_vendeur pv
  where pv.id_client = cl.id_client
);

update public.profil_vendeur
set statut_abonnement = 'essai',
    date_debut = now(),
    date_fin = now() + interval '30 days',
    actif = true,
    mode_paiement = null;

alter table public.profil_vendeur
  alter column statut_abonnement set not null,
  alter column date_fin set not null,
  add constraint profil_vendeur_statut_abonnement_check
    check (statut_abonnement in ('essai', 'actif', 'expiré')),
  add constraint profil_vendeur_mode_paiement_check
    check (mode_paiement is null or mode_paiement in ('carte', 'tmoney', 'flooz'));

create or replace function public.preview_seller_trial(p_plan text)
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  v_client_id bigint;
  v_trial_used boolean;
begin
  if auth.uid() is null then
    raise exception 'Authentification requise';
  end if;

  if p_plan is null or p_plan not in ('starter', 'pro', 'entreprise') then
    raise exception 'Plan invalide';
  end if;

  select cl.id_client, cl.essai_vendeur_utilise
  into v_client_id, v_trial_used
  from public.client cl
  where cl.user_id = auth.uid();

  if v_client_id is null then
    raise exception 'Profil client introuvable';
  end if;

  if v_trial_used then
    raise exception 'Essai déjà utilisé; un paiement est requis';
  end if;

  return now() + interval '30 days';
end;
$$;

revoke all on function public.preview_seller_trial(text) from public, anon, authenticated;
grant execute on function public.preview_seller_trial(text) to authenticated;

drop function if exists public.choose_seller_plan(text);

create function public.choose_seller_plan(p_plan text)
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  v_client_id bigint;
  v_trial_used boolean;
  v_status text;
  v_date_fin timestamptz;
begin
  if auth.uid() is null then
    raise exception 'Authentification requise';
  end if;

  if p_plan is null or p_plan not in ('starter', 'pro', 'entreprise') then
    raise exception 'Plan invalide';
  end if;

  select cl.id_client, cl.essai_vendeur_utilise
  into v_client_id, v_trial_used
  from public.client cl
  where cl.user_id = auth.uid()
  for update;

  if v_client_id is null then
    raise exception 'Profil client introuvable';
  end if;

  select pv.statut_abonnement, pv.date_fin
  into v_status, v_date_fin
  from public.profil_vendeur pv
  where pv.id_client = v_client_id
  for update;

  if v_trial_used then
    if v_status = 'essai' and v_date_fin > now() then
      update public.profil_vendeur
      set plan = p_plan
      where id_client = v_client_id;
      return v_date_fin;
    end if;
    raise exception 'Essai déjà utilisé; un paiement est requis';
  end if;

  insert into public.profil_vendeur (
    id_client,
    plan,
    date_debut,
    date_fin,
    actif,
    statut_abonnement,
    mode_paiement
  )
  values (
    v_client_id,
    p_plan,
    now(),
    now() + interval '30 days',
    true,
    'essai',
    null
  )
  on conflict (id_client) do update
  set plan = excluded.plan,
      date_debut = excluded.date_debut,
      date_fin = excluded.date_fin,
      actif = true,
      statut_abonnement = 'essai',
      mode_paiement = null
  returning date_fin into v_date_fin;

  update public.client
  set essai_vendeur_utilise = true
  where id_client = v_client_id;

  return v_date_fin;
end;
$$;

revoke all on function public.choose_seller_plan(text) from public, anon, authenticated;
grant execute on function public.choose_seller_plan(text) to authenticated;

create or replace function public.activate_seller_plan(
  p_plan text,
  p_mode_paiement text
)
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  v_client_id bigint;
  v_trial_used boolean;
  v_date_fin timestamptz;
begin
  if auth.uid() is null then
    raise exception 'Authentification requise';
  end if;

  if p_plan is null or p_plan not in ('starter', 'pro', 'entreprise') then
    raise exception 'Plan invalide';
  end if;

  if p_mode_paiement is null or p_mode_paiement not in ('carte', 'tmoney', 'flooz') then
    raise exception 'Mode de paiement invalide';
  end if;

  select cl.id_client, cl.essai_vendeur_utilise
  into v_client_id, v_trial_used
  from public.client cl
  where cl.user_id = auth.uid()
  for update;

  if v_client_id is null then
    raise exception 'Profil client introuvable';
  end if;

  if not v_trial_used then
    raise exception 'Un essai gratuit doit être démarré avant le paiement';
  end if;

  insert into public.profil_vendeur (
    id_client,
    plan,
    date_debut,
    date_fin,
    actif,
    statut_abonnement,
    mode_paiement
  )
  values (
    v_client_id,
    p_plan,
    now(),
    now() + interval '30 days',
    true,
    'actif',
    p_mode_paiement
  )
  on conflict (id_client) do update
  set plan = excluded.plan,
      date_debut = excluded.date_debut,
      date_fin = excluded.date_fin,
      actif = true,
      statut_abonnement = 'actif',
      mode_paiement = excluded.mode_paiement
  returning date_fin into v_date_fin;

  return v_date_fin;
end;
$$;

revoke all on function public.activate_seller_plan(text, text) from public, anon, authenticated;
grant execute on function public.activate_seller_plan(text, text) to authenticated;

create or replace function public.refresh_seller_subscription()
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

  if v_client_id is null then
    raise exception 'Profil client introuvable';
  end if;

  update public.profil_vendeur
  set statut_abonnement = 'expiré',
      actif = false
  where id_client = v_client_id
    and statut_abonnement in ('essai', 'actif')
    and date_fin <= now();
end;
$$;

revoke all on function public.refresh_seller_subscription() from public, anon, authenticated;
grant execute on function public.refresh_seller_subscription() to authenticated;

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
  v_status text;
  v_date_fin timestamptz;
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

  select pv.plan, pv.statut_abonnement, pv.date_fin
  into v_plan, v_status, v_date_fin
  from public.profil_vendeur pv
  where pv.id_client = v_client_id
  for update;

  if v_status in ('essai', 'actif') and v_date_fin <= now() then
    update public.profil_vendeur
    set statut_abonnement = 'expiré',
        actif = false
    where id_client = v_client_id;
    v_status := 'expiré';
  end if;

  if v_plan is null
    or v_status not in ('essai', 'actif')
    or v_date_fin is null
    or v_date_fin <= now()
  then
    raise exception 'Abonnement vendeur expiré ou requis';
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
grant execute on function public.publish_product(text, text, numeric, integer, bigint)
  to authenticated;

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
      and pv.statut_abonnement in ('essai', 'actif')
      and pv.actif = true
      and pv.date_fin > now()
  ) then
    raise exception 'Le plan Pro ou Entreprise actif est requis';
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

commit;
