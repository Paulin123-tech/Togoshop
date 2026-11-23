# Togoshop — Supabase local

## Prérequis

- Docker Desktop
- Supabase CLI
- Node.js 20 ou supérieur
- Chromium pour les tests Playwright

## Installation

```bash
npm install
npx playwright install chromium
supabase start
```

Après `supabase start`, copier `supabase.local.example.js` vers `supabase.local.js` et y renseigner les valeurs retournées par Supabase CLI :

```js
window.SUPABASE_LOCAL_CONFIG = {
  url: "http://127.0.0.1:54321",
  anonKey: "<anon-key>"
};
```

## Initialisation de la base

```bash
supabase db reset
npm run dev
```

La réinitialisation applique les migrations puis `supabase/seed.sql`.

## Supabase Studio

L'adresse locale est généralement :

```text
http://127.0.0.1:54323
```

## Tests

```bash
npm run test:e2e
npm run test:e2e:ui
```

Le test Playwright Supabase (inscription, commande et isolation RLS) est exécuté si `supabase.local.js` contient une configuration locale valide. Sans configuration, il est ignoré; les autres tests vérifient l'interface et le panier.

Pour exécuter les vérifications SQL RLS avec PowerShell après le démarrage de Supabase :

```powershell
Get-Content tests/sql/security_policies.sql | docker exec -i supabase_db_togoshop psql -U postgres -d postgres -v ON_ERROR_STOP=1
```

## Réinitialiser l'environnement

```bash
supabase db reset
supabase stop
```
