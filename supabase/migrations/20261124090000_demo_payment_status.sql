create or replace function public.set_demo_payment_status()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_mode text := lower(trim(coalesce(new.fournisseur, '')));
begin
  if v_mode in ('cod', 'paiement à la livraison') then
    new.statut := 'à la livraison';
  elsif v_mode in ('carte', 'tmoney', 'flooz') then
    new.statut := 'payé (simulé)';
  else
    raise exception 'Mode de paiement invalide';
  end if;
  return new;
end;
$$;

revoke all on function public.set_demo_payment_status() from public, anon, authenticated;

drop trigger if exists set_demo_payment_status on public.paiement_commande;

create trigger set_demo_payment_status
before insert on public.paiement_commande
for each row execute function public.set_demo_payment_status();
