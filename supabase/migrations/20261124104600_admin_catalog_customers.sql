begin;

create or replace function public.admin_upsert_product(
  p_id_produit bigint,
  p_nom text,
  p_description text,
  p_prix numeric,
  p_stock integer,
  p_image text,
  p_id_categorie bigint
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_product_id bigint;
begin
  if not public.is_admin() then
    raise exception 'Accès administrateur requis';
  end if;

  if nullif(trim(p_nom), '') is null then
    raise exception 'Le nom du produit est obligatoire';
  end if;

  if p_prix is null or p_prix <= 0 then
    raise exception 'Le prix doit être supérieur à 0';
  end if;

  if p_stock is null or p_stock < 0 then
    raise exception 'Le stock doit être positif ou nul';
  end if;

  if p_id_categorie is null or not exists (
    select 1
    from public.categorie c
    where c.id_categorie = p_id_categorie
  ) then
    raise exception 'Catégorie inexistante';
  end if;

  if p_id_produit is null then
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
      nullif(trim(p_image), ''),
      p_id_categorie
    )
    returning id_produit into v_product_id;
  else
    update public.produit
    set nom_produit = trim(p_nom),
        description = coalesce(trim(p_description), ''),
        prix = p_prix,
        stock = p_stock,
        image = nullif(trim(p_image), ''),
        id_categorie = p_id_categorie
    where id_produit = p_id_produit
    returning id_produit into v_product_id;

    if not found then
      raise exception 'Produit introuvable';
    end if;
  end if;

  return v_product_id;
end;
$$;

revoke all on function public.admin_upsert_product(bigint, text, text, numeric, integer, text, bigint)
  from public, anon, authenticated;
grant execute on function public.admin_upsert_product(bigint, text, text, numeric, integer, text, bigint)
  to authenticated;

create or replace function public.admin_delete_product(p_id_produit bigint)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Accès administrateur requis';
  end if;

  if p_id_produit is null or not exists (
    select 1
    from public.produit p
    where p.id_produit = p_id_produit
  ) then
    raise exception 'Produit introuvable';
  end if;

  if exists (
    select 1
    from public.ligne_commande lc
    where lc.id_produit = p_id_produit
  ) then
    raise exception 'Ce produit figure dans une commande. Mettez son stock à 0 pour le retirer du catalogue.';
  end if;

  delete from public.produit
  where id_produit = p_id_produit;

  return true;
end;
$$;

revoke all on function public.admin_delete_product(bigint) from public, anon, authenticated;
grant execute on function public.admin_delete_product(bigint) to authenticated;

create or replace function public.admin_import_products(p_rows jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row jsonb;
  v_row_number integer := 0;
  v_inserted integer := 0;
  v_updated integer := 0;
  v_name text;
  v_description text;
  v_image text;
  v_price_text text;
  v_stock_text text;
  v_category_text text;
  v_product_text text;
  v_price numeric;
  v_stock integer;
  v_category_id bigint;
  v_product_id bigint;
begin
  if not public.is_admin() then
    raise exception 'Accès administrateur requis';
  end if;

  if p_rows is null or jsonb_typeof(p_rows) <> 'array' then
    raise exception 'Les produits à importer doivent être un tableau';
  end if;

  if jsonb_array_length(p_rows) > 500 then
    raise exception 'Un import ne peut pas dépasser 500 lignes';
  end if;

  for v_row in select value from jsonb_array_elements(p_rows)
  loop
    v_row_number := v_row_number + 1;
    if jsonb_typeof(v_row) <> 'object' then
      raise exception 'Ligne % : format de produit invalide', v_row_number;
    end if;

    v_name := nullif(trim(v_row ->> 'nom_produit'), '');
    v_description := coalesce(v_row ->> 'description', '');
    v_image := nullif(trim(v_row ->> 'image'), '');
    v_price_text := trim(coalesce(v_row ->> 'prix', ''));
    v_stock_text := trim(coalesce(v_row ->> 'stock', ''));
    v_category_text := trim(coalesce(v_row ->> 'id_categorie', ''));
    v_product_text := nullif(trim(v_row ->> 'id_produit'), '');

    if v_name is null then
      raise exception 'Ligne % : nom du produit obligatoire', v_row_number;
    end if;
    if length(v_price_text) > 13
       or v_price_text !~ '^[0-9]+([.][0-9]{1,2})?$' then
      raise exception 'Ligne % : prix invalide', v_row_number;
    end if;
    v_price := v_price_text::numeric;
    if v_price <= 0 or v_price > 9999999999.99 then
      raise exception 'Ligne % : le prix doit être supérieur à 0 et inférieur à 10 milliards', v_row_number;
    end if;
    if length(v_stock_text) > 10 or v_stock_text !~ '^[0-9]+$' then
      raise exception 'Ligne % : stock invalide', v_row_number;
    end if;
    if v_stock_text::numeric > 2147483647 then
      raise exception 'Ligne % : stock trop élevé', v_row_number;
    end if;
    v_stock := v_stock_text::integer;

    if length(v_category_text) > 18 or v_category_text !~ '^[0-9]+$' then
      raise exception 'Ligne % : identifiant de catégorie invalide', v_row_number;
    end if;
    v_category_id := v_category_text::bigint;
    if not exists (
      select 1
      from public.categorie c
      where c.id_categorie = v_category_id
    ) then
      raise exception 'Ligne % : catégorie inexistante', v_row_number;
    end if;

    if v_product_text is null then
      insert into public.produit (
        nom_produit,
        description,
        prix,
        stock,
        image,
        id_categorie
      )
      values (
        v_name,
        v_description,
        v_price,
        v_stock,
        v_image,
        v_category_id
      );
      v_inserted := v_inserted + 1;
    else
      if length(v_product_text) > 18 or v_product_text !~ '^[0-9]+$' then
        raise exception 'Ligne % : identifiant de produit invalide', v_row_number;
      end if;
      v_product_id := v_product_text::bigint;

      update public.produit
      set nom_produit = v_name,
          description = v_description,
          prix = v_price,
          stock = v_stock,
          image = v_image,
          id_categorie = v_category_id
      where id_produit = v_product_id;

      if not found then
        raise exception 'Ligne % : produit % introuvable', v_row_number, v_product_id;
      end if;
      v_updated := v_updated + 1;
    end if;
  end loop;

  return jsonb_build_object(
    'inserted', v_inserted,
    'updated', v_updated,
    'total', v_row_number
  );
end;
$$;

revoke all on function public.admin_import_products(jsonb) from public, anon, authenticated;
grant execute on function public.admin_import_products(jsonb) to authenticated;

create or replace function public.admin_list_customers()
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

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id_client', cl.id_client,
        'nom', concat_ws(' ', cl.prenom, cl.nom),
        'email', cl.email,
        'telephone', cl.telephone,
        'nombre_commandes', coalesce(stats.nombre_commandes, 0),
        'total_depense', coalesce(stats.total_depense, 0)
      )
      order by cl.cree_le desc, cl.id_client desc
    ),
    '[]'::jsonb
  )
  into v_result
  from public.client cl
  left join lateral (
    select count(distinct c.id_commande) as nombre_commandes,
           coalesce(
             sum(lc.quantite * lc.prix_unitaire)
               filter (where c.statut <> 'Annulée'),
             0
           ) as total_depense
    from public.commande c
    left join public.ligne_commande lc on lc.id_commande = c.id_commande
    where c.id_client = cl.id_client
  ) stats on true;

  return v_result;
end;
$$;

revoke all on function public.admin_list_customers() from public, anon, authenticated;
grant execute on function public.admin_list_customers() to authenticated;

commit;
notify pgrst, 'reload schema';
