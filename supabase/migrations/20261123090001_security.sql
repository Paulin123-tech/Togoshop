alter table public.categorie enable row level security;
alter table public.produit enable row level security;
alter table public.client enable row level security;
alter table public.commande enable row level security;
alter table public.ligne_commande enable row level security;
alter table public.adresse_commande enable row level security;
alter table public.paiement_commande enable row level security;
alter table public.panier_ligne enable row level security;
alter table public.favori enable row level security;
alter table public.profil_vendeur enable row level security;
alter table public.produit_vendeur enable row level security;
alter table public.demande_partenariat enable row level security;

revoke all on table
  public.categorie,
  public.produit,
  public.client,
  public.commande,
  public.ligne_commande,
  public.adresse_commande,
  public.paiement_commande,
  public.panier_ligne,
  public.favori,
  public.profil_vendeur,
  public.produit_vendeur,
  public.demande_partenariat
from anon, authenticated;

grant select on public.categorie, public.produit to anon, authenticated;
grant select on public.client to authenticated;
grant update (nom, prenom, telephone) on public.client to authenticated;
grant select on public.commande, public.ligne_commande, public.adresse_commande,
  public.paiement_commande, public.profil_vendeur, public.produit_vendeur,
  public.demande_partenariat to authenticated;
grant select, insert, update, delete on public.panier_ligne, public.favori to authenticated;

create policy "Categories public read"
on public.categorie for select
to anon, authenticated
using (true);

create policy "Products public read"
on public.produit for select
to anon, authenticated
using (true);

create policy "Client reads own profile"
on public.client for select
to authenticated
using (user_id = auth.uid());

create policy "Client updates own profile"
on public.client for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "Client reads own orders"
on public.commande for select
to authenticated
using (
  id_client in (
    select id_client from public.client where user_id = auth.uid()
  )
);

create policy "Client reads own order lines"
on public.ligne_commande for select
to authenticated
using (
  id_commande in (
    select c.id_commande
    from public.commande c
    join public.client cl on cl.id_client = c.id_client
    where cl.user_id = auth.uid()
  )
);

create policy "Client reads own addresses"
on public.adresse_commande for select
to authenticated
using (
  id_commande in (
    select c.id_commande
    from public.commande c
    join public.client cl on cl.id_client = c.id_client
    where cl.user_id = auth.uid()
  )
);

create policy "Client reads own payments"
on public.paiement_commande for select
to authenticated
using (
  id_commande in (
    select c.id_commande
    from public.commande c
    join public.client cl on cl.id_client = c.id_client
    where cl.user_id = auth.uid()
  )
);

create policy "Client manages own cart"
on public.panier_ligne for all
to authenticated
using (
  id_client in (
    select id_client from public.client where user_id = auth.uid()
  )
)
with check (
  id_client in (
    select id_client from public.client where user_id = auth.uid()
  )
);

create policy "Client manages own favorites"
on public.favori for all
to authenticated
using (
  id_client in (
    select id_client from public.client where user_id = auth.uid()
  )
)
with check (
  id_client in (
    select id_client from public.client where user_id = auth.uid()
  )
);

create policy "Client reads own seller profile"
on public.profil_vendeur for select
to authenticated
using (
  id_client in (
    select id_client from public.client where user_id = auth.uid()
  )
);

create policy "Seller reads own product links"
on public.produit_vendeur for select
to authenticated
using (
  id_client in (
    select id_client from public.client where user_id = auth.uid()
  )
);

create policy "Client reads own partnership requests"
on public.demande_partenariat for select
to authenticated
using (
  id_client in (
    select id_client from public.client where user_id = auth.uid()
  )
);
