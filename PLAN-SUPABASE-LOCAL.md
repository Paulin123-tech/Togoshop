# Plan d'évolution vers Supabase local

**Version proposée :** 1.0  
**Statut :** Plan technique à valider  
**État actuel :** Application statique connectée à des données locales  
**État cible :** Application persistante, sécurisée et testée avec Supabase local

---

## Synthèse exécutive

Ce plan décrit la migration de la version front-end actuelle vers une application structurée autour de Supabase local.

Les livrables attendus sont :

- un schéma PostgreSQL versionné ;
- des règles d’accès vérifiables ;
- des opérations métier exécutées de façon atomique ;
- une authentification distincte de la logique applicative ;
- des tests unitaires, d’intégration, SQL et bout en bout ;
- une procédure de démarrage reproductible ;
- une séparation explicite entre l’interface, les services métier et l’accès aux données.

Le site devra pouvoir être démarré sur une nouvelle machine avec Docker, Supabase CLI et une seule procédure documentée.

## Principes techniques

- La base de données constitue la source de vérité.
- Le navigateur ne décide jamais du prix, du stock ou du droit à une action sensible.
- Les opérations financières et commerciales sont exécutées atomiquement.
- Les données sont isolées par les policies RLS et vérifiées par des tests.
- Chaque évolution du schéma est traçable dans une migration.
- Les données sensibles ne sont jamais versionnées.
- Les tests automatisés sont requis avant toute validation d’une fonctionnalité.
- La configuration locale reste indépendante de la configuration déployée.

## Critères de réussite

Le projet sera considéré comme livré lorsque :

- une base Supabase locale vide peut être initialisée ;
- les données initiales peuvent être chargées automatiquement ;
- un utilisateur ne peut lire que les données auxquelles il est autorisé ;
- une commande ne peut être validée qu’avec un stock suffisant ;
- aucune commande partielle ne peut être créée ;
- les politiques vendeur sont vérifiées ;
- les tests bout en bout passent sur une base réinitialisée ;
- l’application peut être redémarrée sans perte de cohérence ;
- les procédures d’installation peuvent être suivies sans connaissance préalable du code.

## 1. Objectif

Transformer la version front-end actuelle en une application complète reposant sur **Supabase exécuté localement**.

### Contraintes

- Conserver l'interface actuelle dans son style graphique.
- Conserver les cinq entités imposées :
  - `client`
  - `categorie`
  - `produit`
  - `commande`
  - `ligne_commande`
- Utiliser Supabase local avec Docker.
- Remplacer les données principales simulées par PostgreSQL.
- Remplacer l'authentification basée sur `localStorage` par Supabase Auth.
- Exécuter les opérations métier sensibles côté base.
- Conserver les paiements, abonnements et partenariats comme simulations locales.
- Fournir un projet reproductible avec migrations, données initiales et documentation.
- Ne pas modifier le projet pendant cette phase de planification.

---

## 2. Architecture cible

```text
Navigateur
    |
    | Client Supabase JavaScript
    |
Supabase local
    ├── Auth
    ├── PostgreSQL
    ├── API REST
    ├── Realtime
    ├── Storage
    └── Studio
```

Le navigateur restera responsable de l'affichage et des interactions. Supabase sera responsable des données persistantes, des droits d'accès, de l'authentification et des opérations critiques.

---

## 3. Schéma PostgreSQL

### 3.1 Table `categorie`

```text
categorie
- id_categorie : bigint, clé primaire
- nom_categorie : text
```

La table contiendra les neuf catégories actuelles.

### 3.2 Table `produit`

```text
produit
- id_produit : bigint, clé primaire
- nom_produit : text
- description : text
- prix : numeric(12,2)
- stock : integer
- image : text
- id_categorie : bigint, référence categorie
```

Contraintes recommandées :

- `prix >= 0`
- `stock >= 0`
- `nom_produit` obligatoire
- `id_categorie` obligatoire

### 3.3 Table `client`

```text
client
- id_client : bigint, clé primaire
- user_id : uuid, référence auth.users
- nom : text
- prenom : text
- email : text
- telephone : text
- cree_le : timestamptz
```

La colonne `mot_de_passe` ne doit pas être conservée dans `client`. Les mots de passe seront gérés par Supabase Auth.

### 3.4 Table `commande`

```text
commande
- id_commande : bigint, clé primaire
- date_commande : timestamptz
- statut : text
- id_client : bigint, référence client
```

Statuts possibles :

- `En attente`
- `En préparation`
- `Confirmée`
- `Livrée`
- `Réservation à confirmer`
- `Annulée`

### 3.5 Table `ligne_commande`

```text
ligne_commande
- id_ligne : bigint, clé primaire
- id_commande : bigint, référence commande
- id_produit : bigint, référence produit
- quantite : integer
- prix_unitaire : numeric(12,2)
```

Contraintes recommandées :

- `quantite > 0`
- `prix_unitaire >= 0`
- relation obligatoire vers une commande
- relation obligatoire vers un produit

Le total ne sera jamais enregistré dans une colonne. Il sera calculé avec :

```sql
SUM(quantite * prix_unitaire)
```

---

## 4. Tables complémentaires

Ces tables sont nécessaires aux fonctionnalités supplémentaires sans modifier la structure imposée.

### 4.1 `adresse_commande`

```text
adresse_commande
- id_adresse : bigint
- id_commande : bigint
- adresse : text
- ville : text
- mode_livraison : text
- frais_livraison : numeric
```

### 4.2 `paiement_commande`

```text
paiement_commande
- id_paiement : bigint
- id_commande : bigint
- fournisseur : text
- statut : text
- montant : numeric
- cree_le : timestamptz
```

Cette table représente uniquement une simulation locale. Aucun fournisseur externe ne sera contacté.

### 4.3 `profil_vendeur`

```text
profil_vendeur
- id_profil : bigint
- id_client : bigint
- plan : text
- date_debut : date
- date_fin : date
- actif : boolean
```

Plans proposés :

- `starter`
- `pro`
- `entreprise`

### 4.4 `produit_vendeur`

Cette table permet d'associer un produit à son vendeur sans modifier `produit` :

```text
produit_vendeur
- id_produit : bigint
- id_client : bigint
```

### 4.5 `demande_partenariat`

```text
demande_partenariat
- id_partenariat : bigint
- id_client : bigint
- type : text
- message : text
- statut : text
- cree_le : timestamptz
```

### 4.6 `favori`

```text
favori
- id_favori : bigint
- id_client : bigint
- id_produit : bigint
- cree_le : timestamptz
```

Une contrainte unique doit empêcher deux fois le même produit dans les favoris du même client.

### 4.7 `panier_ligne`

```text
panier_ligne
- id_panier_ligne : bigint
- id_client : bigint
- id_produit : bigint
- quantite : integer
```

Cette option permet de synchroniser le panier sur plusieurs appareils locaux.

---

## 5. Organisation locale

### 5.1 Prérequis

- Docker Desktop
- Supabase CLI
- Navigateur
- Live Server ou serveur Web local
- Serveur Supabase démarré par Supabase CLI

### 5.2 Structure cible

```text
supabase/
  config.toml
  migrations/
  seed.sql
  functions/
  storage/
src/
  lib/supabase.js
  services/
  components/
  pages/
  utils/
public/
  images/
  assets/
.env.local
README.md
PLAN-SUPABASE-LOCAL.md
```

La structure exacte peut évoluer selon le framework retenu.

### 5.3 Commandes locales prévues

```bash
supabase init
supabase start
supabase migration up
supabase db reset
supabase stop
```

Des scripts pourront être ajoutés pour automatiser ces opérations.

---

## 6. Migrations SQL

Créer les migrations dans cet ordre.

1. Création de `categorie`
2. Création de `produit`
3. Création de `client`
4. Création de `commande`
5. Création de `ligne_commande`
6. Création des tables complémentaires
7. Ajout des contraintes et clés étrangères
8. Ajout des index
9. Activation de RLS
10. Ajout des policies
11. Création des fonctions PostgreSQL
12. Ajout des déclencheurs
13. Création des données initiales

Les migrations doivent permettre une reconstruction complète à partir d'une base Supabase vide.

---

## 7. Sécurité avec RLS

RLS devra être activé sur toutes les tables contenant des données personnelles ou des ressources dont l'accès dépend d'une identité.

Le niveau de sécurité sera vérifié selon les contrôles suivants :

- accès invité ;
- accès client authentifié ;
- accès vendeur ;
- accès à une ressource appartenant à un autre utilisateur ;
- accès après expiration de session ;
- accès après déconnexion ;
- exécution d'une fonction SQL sensible.

Les permissions devront être définies selon le principe du moindre privilège.

### 7.1 Consultation publique

Les visiteurs pourront lire :

- les catégories
- les produits
- les informations publiques des vendeurs

### 7.2 Données personnelles

Un utilisateur pourra lire uniquement :

- son propre profil
- ses propres commandes
- ses propres lignes de commande
- ses propres adresses
- ses propres favoris
- son propre panier
- ses propres abonnements
- ses propres demandes de partenariat

### 7.3 Vendeur

Un vendeur pourra :

- publier des produits
- modifier ses propres produits
- supprimer ses propres produits
- consulter ses propres demandes
- envoyer une demande de partenariat

Le propriétaire de l'enregistrement sera vérifié systématiquement.

### 7.4 Opérations interdites au navigateur

Les opérations suivantes ne devront pas être confiées directement au navigateur :

- création d'une commande
- modification du stock
- lecture d'un prix depuis le navigateur
- application d'une remise
- calcul du total définitif
- vérification d'une limite d'abonnement
- modification du statut d'une autre commande
- changement du propriétaire d'un produit

---

## 8. Authentification

### 8.1 Inscription

1. Supabase crée l'utilisateur dans `auth.users`.
2. Un déclencheur crée automatiquement la ligne correspondante dans `client`.
3. Les champs prénom, nom et téléphone sont enregistrés dans `client`.
4. Le profil est associé à `auth.users.id` via `user_id`.

### 8.2 Connexion

1. Supabase Auth vérifie les identifiants.
2. Une session locale est créée.
3. Le navigateur récupère uniquement le profil lié à cette session.
4. Les écrans utilisateur sont affichés selon l'utilisateur connecté.

### 8.3 Déconnexion

1. Supabase invalide ou termine la session locale.
2. Les données personnelles sont retirées de l'interface.
3. Les favoris peuvent être conservés côté serveur.
4. Le panier peut être conservé côté serveur.

### 8.4 Comptes de test

Créer plusieurs comptes locaux :

- un client standard
- un vendeur Starter
- un vendeur Pro
- un vendeur Entreprise
- un administrateur si nécessaire

Les identifiants de test seront documentés localement et non utilisés en production.

---

## 9. Données initiales

Le fichier `seed.sql` devra contenir :

- les neuf catégories
- les 266 produits actuels
- les prix initiaux
- les stocks initiaux
- les chemins d'image
- les villes et marques utilisées pour les filtres
- les décorations front-end, si elles restent dans PostgreSQL
- quelques anciennes commandes de test
- quelques abonnements vendeur
- quelques demandes de partenariat
- quelques favoris
- plusieurs lignes de panier

### Décorations conservées côté front

Il est possible de conserver hors du schéma imposé :

- emoji de secours
- couleur d'arrière-plan
- note fictive
- ancien prix
- icône de catégorie

Si ces informations doivent être centralisées, créer une table séparée ou un fichier JSON local.

---

## 10. Migration du catalogue

### 10.1 Chargement initial

Le navigateur devra charger :

- les catégories avec `SELECT`
- les produits avec `SELECT`
- les informations de favori
- le stock disponible
- les informations des vendeurs

### 10.2 Adaptation des données

Conserver temporairement le mapper actuel afin de transformer chaque ligne PostgreSQL en objet front-end.

Exemple conceptuel :

```text
id_produit -> id
nom_produit -> n
description -> d
prix -> p
stock -> s
image -> img
id_categorie -> c
```

### 10.3 Marque et ville

La marque reste déduite de `nom_produit`.

Pour le long terme, il est préférable de décider si une colonne `marque` doit être ajoutée au schéma. Cette décision doit être validée avant toute modification.

Pour les maisons, les villes sont utilisées comme marques lors du filtrage.

---

## 11. Panier

### Option 1 : panier local

- conserver `localStorage`
- migration rapide
- une seule expérience par navigateur
- peu sécurisé

### Option 2 : panier Supabase

Créer `panier_ligne`.

Avantages :

- panier lié au compte
- synchronisation entre navigateurs locaux
- vérification du stock côté serveur
- relations visibles dans Supabase Studio

L'option deux est recommandée pour la version complète du projet.

### Vérifications nécessaires

- quantité strictement positive
- produit existant
- stock disponible
- utilisateur propriétaire du panier
- suppression après création de commande

---

## 12. Processus de commande

Créer une fonction RPC PostgreSQL appelée par le navigateur.

La fonction recevra :

- l'identifiant du client
- les identifiants de produits
- les quantités
- l'adresse
- la ville
- le mode de livraison
- le mode de paiement simulé
- le code promotionnel éventuel

### Étapes de la fonction

1. Vérifier que le client existe.
2. Vérifier que chaque produit existe.
3. Vérifier que le stock est suffisant.
4. Relire les prix depuis PostgreSQL.
5. Calculer le sous-total.
6. Appliquer `TOGO10` si nécessaire.
7. Calculer les frais de livraison.
8. Créer la commande.
9. Créer les lignes de commande.
10. Décrémenter le stock.
11. Supprimer les lignes du panier.
12. Enregistrer l'adresse.
13. Enregistrer le paiement simulé.
14. Retourner l'identifiant de commande.

Toutes ces opérations doivent être atomiques. Si une opération échoue, aucune modification partielle ne doit être conservée.

### Protection contre la survente

Utiliser un verrouillage ou une mise à jour atomique du stock.

Exemple conceptuel :

```sql
UPDATE produit
SET stock = stock - la_quantite
WHERE id_produit = l_identifiant
  AND stock >= la_quantite;
```

Deux commandes simultanées ne doivent pas vendre plus d'unités que le stock disponible.

---

## 13. Abonnements vendeurs

### Limites

- Starter : 5 produits
- Pro : 50 produits
- Entreprise : produits illimités

### Vérifications

Avant toute publication, vérifier :

- que l'utilisateur est connecté
- que le profil vendeur existe
- que l'abonnement est actif
- que la limite du plan n'est pas dépassée
- que le prix est positif
- que le stock est positif
- que la catégorie existe
- que le vendeur est bien le propriétaire du produit

Les paiements d'abonnement resteront simulés.

---

## 14. Demandes de partenariat

Créer une table `demande_partenariat` avec :

- identifiant du client
- type de partenariat
- message
- statut

Statuts possibles :

- `En étude`
- `Acceptée`
- `Refusée`

Les vendeurs Starter ne pourront pas créer cette demande. Les vendeurs Pro et Entreprise pourront le faire.

---

## 15. Stockage des images

### Option simple

Conserver les fichiers actuels dans `public/images/`.

### Option intégrée

Créer un bucket Supabase Storage nommé `produits`.

Règles proposées :

- lecture publique des images
- écriture réservée aux vendeurs
- nommage basé sur l'identifiant produit
- suppression limitée au propriétaire
- interdiction de remplacer une image appartenant à un autre vendeur

Les 266 images actuelles peuvent être utilisées comme données initiales.

---

## 16. Organisation du code

Séparer les responsabilités actuelles de `app.js`.

Une modification du schéma ne doit pas obliger à modifier directement les composants d'affichage. Les contrats entre les services Supabase, les adaptateurs et l'interface devront être explicitement définis.

### Structure proposée

```text
src/
  config/
    supabase.js
  services/
    categories.js
    produits.js
    auth.js
    panier.js
    commandes.js
    vendeurs.js
    favoris.js
    partenariats.js
  components/
  pages/
  utils/
    format.js
    validation.js
    permissions.js
```

### Modules attendus

| Module | Responsabilité |
| --- | --- |
| `config/supabase` | Initialisation du client et chargement de la configuration |
| `services/auth` | Inscription, connexion, session et profil |
| `services/catalogue` | Catégories, produits, recherche et filtres |
| `services/panier` | Quantités, favoris et stock disponible |
| `services/commandes` | Création, consultation et suivi des commandes |
| `services/vendeurs` | Abonnements, publications et limites |
| `services/partenariats` | Création et consultation des demandes |
| `utils/validation` | Validation locale des formulaires |
| `utils/format` | Formatage des prix, dates et nombres |
| `utils/permissions` | Contrôle d'interface basé sur l'utilisateur |

Les tests devront suivre la même séparation :

```text
tests/
  unit/
  sql/
  integration/
  e2e/
```

### Responsabilités

- `services` : communication avec Supabase
- `components` : éléments d'interface
- `pages` : assemblage des écrans
- `utils` : formatage et validation
- `config` : configuration locale

---

## 17. Interface

Les écrans actuels peuvent être conservés :

- accueil
- boutique
- fiche produit
- panier
- compte
- espace vendeur
- vue des tables
- détails des commandes

Ajouter si nécessaire :

- état de chargement
- état vide
- message d'erreur réseau
- message d'erreur SQL
- session persistante
- statut de commande
- dashboard vendeur
- recharge du catalogue après modification
- visualisation locale des tables

## 18. Stratégie de validation

La stratégie doit couvrir la base de données, les services Supabase, l'authentification et les parcours utilisateur.

### 18.1 Tests SQL

- Lecture limitée aux propres données
- Modification impossible par un autre client
- Suppression impossible par un autre vendeur
- Quantité négative refusée
- Stock insuffisant refusé
- Prix manipulé côté navigateur ignoré
- Survente refusée
- Ligne de commande orpheline impossible
- Suppression d'une commande avec ses données incohérentes impossible
- Limite d'abonnement respectée
- Chaque test doit exécuter les règles avec l'utilisateur Supabase concerné, et non avec le rôle administrateur.

### 18.2 Tests d'intégration

- connexion au client Supabase
- création du profil
- chargement du catalogue
- création du panier
- appel RPC de commande
- gestion des erreurs Supabase
- synchronisation après une modification de données

Les données de test doivent être isolées et réinitialisées avant chaque exécution.

### 18.3 Tests d'authentification

- inscription
- connexion
- déconnexion
- profil automatiquement créé
- email déjà utilisé
- session restaurée
- session expirée
- tentative d'accès à une autre commande

### 18.4 Tests bout en bout

Les tests bout en bout utiliseront Playwright ou une solution équivalente.

Parcours obligatoires :

1. Un visiteur consulte le catalogue.
2. Il recherche et filtre un produit.
3. Il ouvre la fiche détaillée.
4. Il crée un compte.
5. Il ajoute un produit au panier.
6. Il finalise une commande.
7. Il vérifie que le stock a diminué.
8. Il consulte la commande dans son compte.
9. Il ouvre une session vendeur.
10. Il publie un produit selon les limites de son plan.
11. Il tente une action interdite et vérifie le refus.

Les tests doivent démarrer avec une base locale réinitialisée.

### 18.5 Tests fonctionnels

- recherche
- filtres
- tri
- panier
- favoris
- remise
- frais de livraison
- création de commande
- déduction de stock
- consultation des commandes
- publication vendeur
- limite d'abonnement
- demande de partenariat

### 18.6 Tests d'interface

- mobile
- tablette
- ordinateur
- thème clair
- thème sombre
- image absente
- produit sans stock
- liste vide
- aucune connexion locale
- chargement lent

## Exigences non fonctionnelles

### Performance

- les listes principales doivent utiliser une pagination côté serveur ;
- les filtres fréquents doivent disposer d'index adaptés ;
- les fichiers publics doivent être correctement dimensionnés ;
- les appels inutiles au catalogue doivent être évités ;
- les états de chargement doivent être visibles.

### Fiabilité

- les migrations doivent être rejouables ;
- les opérations critiques doivent être transactionnelles ;
- les erreurs doivent être remises à l'utilisateur avec un message exploitable ;
- les opérations échouées ne doivent pas modifier partiellement les données.

### Maintenabilité

- chaque service doit avoir une responsabilité unique ;
- les requêtes SQL complexes doivent être centralisées ;
- les types de données doivent être cohérents ;
- les migrations doivent être séquencées ;
- les choix techniques structurants doivent être documentés.

### Opérations

- démarrage Supabase documenté ;
- données locales réinitialisables ;
- variables d'environnement séparées ;
- sauvegarde locale optionnelle ;
- arrêt propre ;
- procédure de diagnostic ;
- aucun secret dans le dépôt.

---

## 19. Phases d'exécution

Chaque phase doit produire un livrable vérifié. Une phase ne doit pas être considérée comme terminée sans les tests associés.

### Phase 1 : Infrastructure locale

- installer Docker
- initialiser Supabase CLI
- démarrer les services
- configurer les variables locales
- vérifier Supabase Studio
- créer les premiers dossiers du projet

Livrable : Supabase local opérationnel.

### Phase 2 : Schéma PostgreSQL

- créer les cinq tables principales
- créer les tables complémentaires
- ajouter les contraintes
- ajouter les index
- insérer les données initiales
- vérifier les relations dans Studio

Livrable : base locale complète.

### Phase 3 : Authentification

- activer Supabase Auth
- créer les utilisateurs locaux
- créer les profils client
- ajouter le déclencheur de profil
- tester les sessions

Livrable : authentification fonctionnelle.

### Phase 4 : Policies RLS

- activer RLS
- ajouter les policies par rôle
- tester les accès privés
- tester les accès vendeur
- vérifier les opérations publiques

Livrable : règles d'accès sécurisées.

### Phase 5 : Catalogue

- charger les catégories depuis Supabase
- charger les produits depuis Supabase
- ajouter les décorations front-end
- importer les images
- adapter les filtres
- conserver temporairement le mapper actuel

Livrable : boutique alimentée par PostgreSQL.

### Phase 6 : Panier et favoris

- migrer les favoris
- choisir le panier local ou Supabase
- synchroniser les quantités
- vérifier les stocks
- tester la suppression des produits

Livrable : panier persistant.

### Phase 7 : Commandes

- créer la fonction PostgreSQL de commande
- vérifier le stock
- calculer les montants
- décrémenter les stocks
- enregistrer les adresses
- enregistrer les modes de livraison
- enregistrer les paiements simulés

Livrable : création atomique de commandes.

### Phase 8 : Espace vendeur

- créer les abonnements
- vérifier les limites
- ajouter les publications
- associer les produits aux vendeurs
- ajouter les demandes de partenariat
- appliquer les policies vendeur

Livrable : espace vendeur complet.

### Phase 9 : Tests et documentation

- écrire les tests SQL
- écrire les tests d'interface
- corriger les anomalies
- documenter l'installation
- documenter les migrations
- documenter les comptes locaux
- documenter les scénarios métier

Livrable : projet reproductible.

---

## 20. Livrables attendus

- projet Supabase initialisable avec Docker
- migrations PostgreSQL reproductibles
- données initiales sous forme de seed
- authentification locale
- catalogue chargé depuis Supabase
- panier persistant
- favoris persistants
- commandes persistantes
- lignes de commande persistantes
- stock vérifié côté serveur
- espace vendeur
- abonnements simulés
- demandes de partenariat
- Storage local pour les images
- tests SQL
- documentation d'installation
- documentation des scénarios utilisateur

---

## 21. Résultat final

À la fin du projet, l'application permettra :

- de consulter un catalogue stocké dans PostgreSQL
- de rechercher et filtrer des produits
- de consulter des fiches détaillées
- de créer un compte local
- de gérer ses favoris
- de gérer son panier
- de créer une commande
- de vérifier et décrémenter le stock
- de consulter ses commandes
- de publier des produits selon un abonnement
- d'envoyer une demande de partenariat
- de consulter les données dans Supabase Studio
- de réinitialiser complètement la base locale

Le projet devra pouvoir être lancé sur une nouvelle machine avec Docker, Supabase CLI et les commandes documentées.

---

## 22. Critères de validation

Une livraison sera validée uniquement si les conditions suivantes sont satisfaites.

### Base de données

- toutes les migrations s'appliquent sans erreur ;
- toutes les contraintes sont vérifiées ;
- les données initiales sont chargées ;
- les relations sont cohérentes ;
- RLS est actif.

### Backend

- les opérations sensibles sont transactionnelles ;
- les prix sont relus côté serveur ;
- les stocks sont vérifiés côté serveur ;
- les policies correspondent aux rôles réels ;
- aucun secret n'est exposé.

### Frontend

- l'application fonctionne sur une résolution mobile ;
- l'application fonctionne sur une résolution bureau ;
- les états de chargement et d'erreur sont visibles ;
- les formulaires sont validés ;
- les erreurs Supabase sont présentées clairement.

### Qualité

- les tests SQL passent ;
- les tests d'intégration passent ;
- les tests bout en bout passent ;
- les étapes d'installation sont reproductibles ;
- les variables d'environnement sont documentées ;
- aucun fichier temporaire ou secret n'est inclus.
