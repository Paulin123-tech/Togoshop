# Togoshop : marketplace (front-end)

## Publier sur GitHub et deployer sur Vercel

1. Creez un depot vide sur https://github.com/new (sans README ni `.gitignore`).
2. Dans un terminal ouvert a la racine du projet, executez :
   ```powershell
   git init
   git add .
   git commit -m "Initial Togoshop site"
   git branch -M main
   git remote add origin https://github.com/VOTRE-NOM/VOTRE-DEPOT.git
   git push -u origin main
   ```
   Remplacez l'adresse par celle de votre depot GitHub. `supabase.local.js` est exclu de Git ; la configuration publique de production est dans `supabase.config.js`.
3. Connectez-vous sur https://vercel.com/, choisissez **Add New → Project**, puis **Import** le depot GitHub.
4. Choisissez le preset **Other**, laissez la commande de build vide et utilisez `.` comme dossier de sortie. `vercel.json` configure déjà la racine du projet. Le site est statique et ne nécessite pas de build.

Vercel fournit une adresse HTTPS et redéploie automatiquement le site à chaque push sur `main`. Pour un domaine personnel, ajoutez-le dans les paramètres **Domains** du projet Vercel.

## Connecter Supabase en ligne

Le schéma, les règles de sécurité RLS et les données de démonstration sont déjà dans `supabase/`.

1. Créez un projet sur https://supabase.com/dashboard.
2. À la racine du projet, connectez le CLI à ce projet puis appliquez les migrations :
   ```powershell
   npx.cmd supabase login
   npx.cmd supabase link --project-ref VOTRE_PROJECT_REF
   npx.cmd supabase db push
   ```
   Le `project ref` se trouve dans l’URL ou les paramètres du projet Supabase.
3. Dans **SQL Editor** du tableau de bord Supabase, exécutez une fois `supabase/seed.sql` pour charger le catalogue de démonstration.
4. `supabase.config.js` fournit au navigateur l’URL du projet et la clé publique `anon`/`publishable`. Cette clé est destinée à être publique ; ne mettez jamais une clé `service_role`/`secret` dans le dépôt.
5. Aucun réglage de variables d’environnement ni redéploiement de build n’est nécessaire pour cette configuration statique.
6. Dans Supabase **Authentication → URL Configuration**, définissez l’URL du site sur le domaine Vercel et ajoutez aussi `http://127.0.0.1:5500/**` aux URL de redirection pour les tests locaux.

Le catalogue est lu depuis Supabase dès que le projet est joignable. Les comptes, commandes, paniers et favoris nécessitent une session authentifiée.

## Lancer le site
Ouvrir ce dossier dans VS Code, puis clic droit sur `index.html` > "Open with Live Server" (ou double-clic sur le fichier).

## Structure
- `index.html` : structure de la page (page d'accueil et boutique, qui s'affichent tour à tour)
- `style.css` : styles (mode clair et sombre)
- `data.js` : données de démonstration, au format EXACT du schéma (CATEGORIE, PRODUIT)
- `app.js` : logique du site (catalogue, panier, comptes, commande, vue base de données)
- `images/` : à créer, voir la liste plus bas
- `assets/` : image de fond de l'accueil (iPhone 18 Pro), à garder avec les autres fichiers

## Schéma respecté
- client : id_client, nom, prenom, email, telephone, mot_de_passe
- categorie : id_categorie, nom_categorie
- produit : id_produit, nom_produit, description, prix, stock, image, id_categorie
- commande : id_commande, date_commande, statut, id_client
- ligne_commande : id_ligne, id_commande, id_produit, quantite, prix_unitaire

## Ce qui n'est pas dans le schéma
- L'adresse, le mode de livraison et le paiement sont demandés dans le formulaire mais ne sont pas enregistrés.
- Le total d'une commande n'est pas une colonne : il se calcule avec la somme de quantite x prix_unitaire des lignes.
- Les notes, anciens prix (ventes flash) et emojis viennent de DECOR dans `data.js` : décor du front uniquement.

## Brancher le back-end
1. Dans `data.js`, remplacer CATEGORIE et PRODUIT par le résultat de fetch (mêmes colonnes en JSON).
2. Dans `app.js`, la fonction `valider()` construit l'objet { commande, lignes } à envoyer en POST.
3. L'inscription, la connexion et le stock sont aujourd'hui gérés dans le navigateur (localStorage) : à déplacer côté serveur, avec hachage du mot de passe côté serveur.

## Marques et modèles
- La marque n'est PAS une colonne du schéma : elle fait partie de nom_produit (ex. "Apple iPhone 15 128 Go"). Le front la retrouve grâce à la liste MARQUES de `data.js` (pour les maisons, la "marque" est la ville).
- Dans la boutique, choisir une catégorie affiche les produits classés par marque, avec des boutons pour filtrer une marque.
- Pour une vraie colonne marque, il faudrait demander à votre groupe d'ajouter produit.marque (schéma imposé).

## Prix et données
- Les prix sont INDICATIFS (démonstration, en FCFA). Vérifiez-les avant toute vraie vente.
- Les gammes de téléphones suivent les modèles sortis à ce jour (jusqu'aux iPhone 18 Pro et 18 Pro Max, Galaxy S26). L'iPhone 18 standard n'est pas encore sorti.
- Les notes (étoiles), les voitures d'occasion et les maisons sont fictives.
- Quand DATA_VERSION change dans `data.js`, le navigateur remet à zéro le panier, les favoris, les commandes et les produits de vendeurs enregistrés localement.

## Espace vendeur
Avec Supabase et les migrations appliquées, le plan et son statut sont enregistrés dans `profil_vendeur`, l'utilisation de l'essai dans `client`, les produits associés au vendeur dans `produit_vendeur` et les demandes dans `demande_partenariat`. Le moyen de paiement de démonstration est demandé avant le démarrage de l'essai; la date de fin des 30 jours est calculée par la base. L'essai peut être annulé depuis l'espace vendeur, tout en conservant l'accès jusqu'à sa date de fin.

Le paiement d'abonnement est une simulation : aucune somme n'est prélevée. N'utilisez que les coordonnées de test affichées dans le formulaire. Sans Supabase, les fonctions vendeur restent simulées localement dans le navigateur.

## Voitures et maisons
Ce sont des lignes de la table produit rangées dans les catégories "Voitures neuves", "Voitures d'occasion" et "Maisons à vendre". Le bouton "Réserver" passe par le panier, et la commande reçoit le statut "Réservation à confirmer". Les annonces sont fictives.

## Images : nom = numéro du produit
Le chemin complet de chaque image est images/<numéro>.jpg, exactement comme dans la colonne produit.image de data.js. Le dossier doit s'appeler images, en minuscules (sur un hébergeur, IMAGES et images sont deux dossiers différents). Chaque image porte simplement le numéro du produit suivi de .jpg (1.jpg, 2.jpg, ... 266.jpg).
- Pas besoin de tout fournir : si une image manque, l'emoji du produit s'affiche.
- Si tes images sont en .png ou .webp : dans VS Code, Ctrl+H, remplacer ".jpg" par ".png" dans data.js.
- Les produits ajoutés par un vendeur reçoivent le numéro suivant (267.jpg, ...).

### Smartphones : numéros 1 à 55 et 247 et 255 et 257 à 259

**Apple** (1 à 13 et 247)
- images/1.jpg : iPhone 11 64 Go
- images/2.jpg : iPhone 12 64 Go
- images/3.jpg : iPhone 13 128 Go
- images/4.jpg : iPhone 14 128 Go
- images/5.jpg : iPhone 15 128 Go
- images/6.jpg : iPhone 15 Pro 256 Go
- images/7.jpg : iPhone 16 128 Go
- images/8.jpg : iPhone 16 Pro 256 Go
- images/9.jpg : iPhone 17 256 Go
- images/10.jpg : iPhone 17 Pro 256 Go
- images/11.jpg : iPhone 17 Pro Max 256 Go
- images/12.jpg : iPhone 18 Pro 256 Go
- images/13.jpg : iPhone 18 Pro Max 256 Go
- images/247.jpg : iPhone Air 256 Go

**Samsung** (14 à 24 et 258)
- images/14.jpg : Galaxy A06 64 Go
- images/15.jpg : Galaxy A16 128 Go
- images/16.jpg : Galaxy A26 5G 128 Go
- images/17.jpg : Galaxy A36 5G 128 Go
- images/18.jpg : Galaxy A56 5G 256 Go
- images/19.jpg : Galaxy S25 256 Go
- images/20.jpg : Galaxy S26 256 Go
- images/21.jpg : Galaxy S26+ 256 Go
- images/22.jpg : Galaxy S26 Ultra 256 Go
- images/23.jpg : Galaxy Z Flip7 256 Go
- images/24.jpg : Galaxy Z Fold7 256 Go
- images/258.jpg : Galaxy S25 Ultra 256 Go

**Xiaomi** (25 à 31 et 257)
- images/25.jpg : Redmi 14C 128 Go
- images/26.jpg : Redmi Note 14 128 Go
- images/27.jpg : Redmi Note 14 Pro 5G 256 Go
- images/28.jpg : Redmi Note 14 Pro+ 5G 256 Go
- images/29.jpg : 15T 256 Go
- images/30.jpg : 15T Pro 512 Go
- images/31.jpg : 15 256 Go
- images/257.jpg : Redmi Note 15 Pro 5G 256 Go

**Tecno** (32 à 35)
- images/32.jpg : Spark 30 128 Go
- images/33.jpg : Spark 40 Pro 256 Go
- images/34.jpg : Pova 7 5G 256 Go
- images/35.jpg : Camon 40 Pro 256 Go

**Infinix** (36 à 41 et 259)
- images/36.jpg : Smart 9 64 Go
- images/37.jpg : Hot 50 128 Go
- images/38.jpg : Hot 60i 128 Go
- images/39.jpg : Note 50 Pro 256 Go
- images/40.jpg : Zero 40 5G 256 Go
- images/41.jpg : GT 30 Pro 256 Go
- images/259.jpg : GT 50 Pro 512 Go

**itel** (42 à 43)
- images/42.jpg : A70 128 Go
- images/43.jpg : P55 128 Go

**Oppo** (44 à 46)
- images/44.jpg : A3 128 Go
- images/45.jpg : A5 Pro 256 Go
- images/46.jpg : Reno 13 5G 256 Go

**Huawei** (47 à 48 et 255)
- images/47.jpg : nova Y72 128 Go
- images/48.jpg : nova 13 256 Go
- images/255.jpg : nova 13 Pro 512 Go

**Realme** (49 à 50)
- images/49.jpg : C75 128 Go
- images/50.jpg : 14 Pro 5G 256 Go

**Google** (51 à 53)
- images/51.jpg : Pixel 9a 128 Go
- images/52.jpg : Pixel 10 256 Go
- images/53.jpg : Pixel 10 Pro 256 Go

**Honor** (54 à 55)
- images/54.jpg : X7c 128 Go
- images/55.jpg : 400 256 Go

### Tablettes : numéros 56 à 69

**Apple** (56 à 59)
- images/56.jpg : iPad 11 pouces A16 128 Go
- images/57.jpg : iPad mini 128 Go
- images/58.jpg : iPad Air 11 pouces M3 128 Go
- images/59.jpg : iPad Pro 11 pouces M5 256 Go

**Samsung** (60 à 63)
- images/60.jpg : Galaxy Tab A9 64 Go
- images/61.jpg : Galaxy Tab A9+ 128 Go
- images/62.jpg : Galaxy Tab S10 FE 128 Go
- images/63.jpg : Galaxy Tab S10 Ultra 256 Go

**Xiaomi** (64 à 65)
- images/64.jpg : Redmi Pad SE 128 Go
- images/65.jpg : Pad 7 256 Go

**Lenovo** (66 à 67)
- images/66.jpg : Tab M10 64 Go
- images/67.jpg : Tab P12 128 Go

**Huawei** (68)
- images/68.jpg : MatePad 11,5 128 Go

**Honor** (69)
- images/69.jpg : Pad X9 128 Go

### Ordinateurs et bureau : numéros 70 à 100 et 254 et 264 à 266

**HP** (70 à 76)
- images/70.jpg : 15 Core i3 8 Go 256 Go SSD
- images/71.jpg : Pavilion 15 Core i5 16 Go 512 Go SSD
- images/72.jpg : Victus 15 Core i5 RTX 3050
- images/73.jpg : EliteBook 840 Core i7
- images/74.jpg : DeskJet 2820e (imprimante)
- images/75.jpg : Laser 107w (imprimante)
- images/76.jpg : M24 écran 24 pouces

**Dell** (77 à 81 et 265 à 266)
- images/77.jpg : Inspiron 15 Core i3 8 Go 256 Go SSD
- images/78.jpg : Inspiron 15 Core i5 16 Go 512 Go SSD
- images/79.jpg : Latitude 5440 Core i5
- images/80.jpg : XPS 13 Core Ultra 7
- images/81.jpg : Moniteur 24 pouces Full HD
- images/265.jpg : OptiPlex 7040 PC de bureau complet avec écran
- images/266.jpg : OptiPlex PC de bureau reconditionné avec écran 17 pouces

**Lenovo** (82 à 85 et 264)
- images/82.jpg : IdeaPad Slim 3 Ryzen 5 16 Go 512 Go SSD
- images/83.jpg : IdeaPad 5 Core i5 16 Go 512 Go SSD
- images/84.jpg : ThinkPad E14 Core i5
- images/85.jpg : LOQ 15 RTX 4050
- images/264.jpg : Yoga Pro 9i 16 pouces

**Asus** (86 à 89)
- images/86.jpg : Vivobook 15 Core i3 8 Go 256 Go SSD
- images/87.jpg : Vivobook 16 Core i7 16 Go 512 Go SSD
- images/88.jpg : TUF Gaming F15 RTX 4050
- images/89.jpg : Zenbook 14 OLED Core Ultra 7

**Acer** (90 à 93)
- images/90.jpg : Aspire 3 Core i3 8 Go 256 Go SSD
- images/91.jpg : Aspire 5 Core i5 16 Go 512 Go SSD
- images/92.jpg : Nitro V 15 RTX 4050
- images/93.jpg : Swift Go 14 Core Ultra 5

**Apple** (94 à 96)
- images/94.jpg : MacBook Air 13 pouces M4 256 Go
- images/95.jpg : MacBook Air 15 pouces M4 256 Go
- images/96.jpg : MacBook Pro 14 pouces M5 512 Go

**Samsung** (97 et 254)
- images/97.jpg : Moniteur 24 pouces Full HD
- images/254.jpg : Ordinateur tout-en-un 24 pouces tactile

**LG** (98)
- images/98.jpg : Moniteur 27 pouces Full HD IPS

**Epson** (99)
- images/99.jpg : EcoTank L3250 (imprimante)

**Canon** (100)
- images/100.jpg : PIXMA G3430 (imprimante)

### Audio, TV et gaming : numéros 101 à 131

**Samsung** (101 à 104)
- images/101.jpg : TV Crystal UHD 43 pouces 4K
- images/102.jpg : TV Crystal UHD 55 pouces 4K
- images/103.jpg : TV QLED 65 pouces 4K
- images/104.jpg : Galaxy Buds 3 écouteurs

**LG** (105 à 107)
- images/105.jpg : TV UHD 43 pouces 4K
- images/106.jpg : TV UHD 55 pouces 4K
- images/107.jpg : TV OLED evo 55 pouces 4K

**Hisense** (108 à 110)
- images/108.jpg : TV 43 pouces 4K
- images/109.jpg : TV 55 pouces 4K
- images/110.jpg : TV ULED 65 pouces 4K

**TCL** (111 à 112)
- images/111.jpg : TV 50 pouces 4K
- images/112.jpg : TV QLED 55 pouces 4K

**Sony** (113 à 117)
- images/113.jpg : TV Bravia 55 pouces 4K
- images/114.jpg : WH-1000XM6 casque à réduction de bruit
- images/115.jpg : PlayStation 5 Slim 1 To
- images/116.jpg : PlayStation 5 Pro 2 To
- images/117.jpg : Manette DualSense

**Nasco** (118 à 119)
- images/118.jpg : TV 32 pouces HD
- images/119.jpg : TV 43 pouces Full HD

**Apple** (120 à 121)
- images/120.jpg : AirPods 4
- images/121.jpg : AirPods Pro 3

**JBL** (122 à 124)
- images/122.jpg : Tune 520BT casque
- images/123.jpg : Flip 6 enceinte portable
- images/124.jpg : Charge 5 enceinte portable

**Xiaomi** (125)
- images/125.jpg : Redmi Buds 6 écouteurs

**Anker** (126)
- images/126.jpg : Soundcore Q20i casque

**Microsoft** (127 à 129)
- images/127.jpg : Xbox Series S 512 Go
- images/128.jpg : Xbox Series X 1 To
- images/129.jpg : Manette sans fil Xbox

**Nintendo** (130 à 131)
- images/130.jpg : Switch 2
- images/131.jpg : Switch OLED

### Électroménager : numéros 132 à 161 et 249 à 250 et 253 et 260 à 263

**Samsung** (132 à 136)
- images/132.jpg : Réfrigérateur 2 portes 380 L
- images/133.jpg : Réfrigérateur Side-by-Side 600 L
- images/134.jpg : Machine à laver 8 kg chargement frontal
- images/135.jpg : Climatiseur split 1 CV
- images/136.jpg : Micro-ondes 23 L

**LG** (137 à 140 et 263)
- images/137.jpg : Réfrigérateur 2 portes 340 L
- images/138.jpg : Machine à laver 8 kg chargement frontal
- images/139.jpg : Climatiseur split 1,5 CV Dual Inverter
- images/140.jpg : Micro-ondes 20 L
- images/263.jpg : Réfrigérateur InstaView 4 portes 708 L

**Hisense** (141 à 146)
- images/141.jpg : Réfrigérateur 2 portes 200 L
- images/142.jpg : Réfrigérateur 2 portes 300 L
- images/143.jpg : Congélateur coffre 200 L
- images/144.jpg : Machine à laver 7 kg chargement par le haut
- images/145.jpg : Climatiseur split 1,5 CV
- images/146.jpg : Cuisinière 4 feux avec four

**Midea** (147 à 150)
- images/147.jpg : Réfrigérateur 1 porte 90 L
- images/148.jpg : Machine à laver 6 kg semi-automatique
- images/149.jpg : Climatiseur split 2 CV
- images/150.jpg : Mixeur blender 1,5 L

**Haier** (151 à 153)
- images/151.jpg : Réfrigérateur 2 portes 250 L
- images/152.jpg : Machine à laver 10 kg
- images/153.jpg : Climatiseur split 1 CV

**Nasco** (154 à 159 et 261)
- images/154.jpg : Réfrigérateur 2 portes 170 L
- images/155.jpg : Congélateur coffre 300 L
- images/156.jpg : Machine à laver 7 kg semi-automatique
- images/157.jpg : Climatiseur split 1,5 CV
- images/158.jpg : Cuisinière 5 feux avec four
- images/159.jpg : Ventilateur sur pied
- images/261.jpg : Machine à laver 11 kg chargement frontal inverter

**Bruhm** (160 à 161)
- images/160.jpg : Cuisinière 4 feux
- images/161.jpg : Ventilateur sur pied

**Garlyn** (249)
- images/249.jpg : Fer à repasser vapeur 2500 W

**Gerati** (250)
- images/250.jpg : Machine à laver 10,5 kg chargement frontal inverter

**Lasko** (253)
- images/253.jpg : Ventilateur sur pied 16 pouces avec télécommande

**Kesser** (260)
- images/260.jpg : Climatiseur split réversible 9000 BTU WiFi

**Beko** (262)
- images/262.jpg : Cuisinière 4 feux gaz avec four

### Voitures neuves : numéros 162 à 191 et 251 à 252 et 256

**Toyota** (162 à 167 et 252)
- images/162.jpg : Yaris 1,5 essence
- images/163.jpg : Corolla 1,8 essence
- images/164.jpg : RAV4 2,0 essence
- images/165.jpg : Hilux double cabine 4x4 diesel
- images/166.jpg : Fortuner 2,8 diesel 4x4
- images/167.jpg : Land Cruiser Prado 2,8 diesel
- images/252.jpg : Venza 2,5 hybride

**Hyundai** (168 à 172)
- images/168.jpg : i10 1,2 essence
- images/169.jpg : Accent 1,4 essence
- images/170.jpg : Creta 1,5 essence
- images/171.jpg : Tucson 2,0 essence
- images/172.jpg : Santa Fe 2,2 diesel

**Kia** (173 à 176)
- images/173.jpg : Picanto 1,2 essence
- images/174.jpg : Rio 1,4 essence
- images/175.jpg : Sportage 2,0 essence
- images/176.jpg : Sorento 2,2 diesel

**Suzuki** (177 à 179)
- images/177.jpg : Swift 1,2 essence
- images/178.jpg : Vitara 1,5 essence
- images/179.jpg : Jimny 1,5 4x4

**Nissan** (180 à 182)
- images/180.jpg : Sentra 1,6 essence
- images/181.jpg : Qashqai 1,3 essence
- images/182.jpg : Navara double cabine diesel 4x4

**Peugeot** (183 à 184 et 256)
- images/183.jpg : 208 1,2 essence
- images/184.jpg : 2008 1,2 essence
- images/256.jpg : 3008 1,6 essence

**Renault** (185 à 186)
- images/185.jpg : Clio 1,0 essence
- images/186.jpg : Duster 1,6 essence

**Ford** (187 et 251)
- images/187.jpg : Ranger double cabine diesel 4x4
- images/251.jpg : Territory 1,5 essence

**Mitsubishi** (188 à 189)
- images/188.jpg : L200 double cabine diesel 4x4
- images/189.jpg : Pajero Sport 2,4 diesel

**Honda** (190 à 191)
- images/190.jpg : Civic 1,5 essence
- images/191.jpg : CR-V 1,5 essence

### Voitures d’occasion : numéros 192 à 213

**Toyota** (192 à 198)
- images/192.jpg : Corolla 2010, 160 000 km
- images/193.jpg : Corolla 2014, 120 000 km
- images/194.jpg : Camry 2012, 140 000 km
- images/195.jpg : Yaris 2013, 110 000 km
- images/196.jpg : RAV4 2010, 170 000 km
- images/197.jpg : RAV4 2015, 105 000 km
- images/198.jpg : Hilux 2012 double cabine, 180 000 km

**Hyundai** (199 à 201)
- images/199.jpg : Accent 2012, 130 000 km
- images/200.jpg : Elantra 2014, 115 000 km
- images/201.jpg : Tucson 2012, 150 000 km

**Kia** (202 à 203)
- images/202.jpg : Rio 2013, 120 000 km
- images/203.jpg : Sportage 2014, 110 000 km

**Nissan** (204 à 205)
- images/204.jpg : Sentra 2012, 140 000 km
- images/205.jpg : Qashqai 2013, 125 000 km

**Honda** (206 à 207)
- images/206.jpg : Civic 2010, 160 000 km
- images/207.jpg : CR-V 2012, 135 000 km

**Peugeot** (208)
- images/208.jpg : 307 2008, 170 000 km

**Ford** (209)
- images/209.jpg : Focus 2012, 130 000 km

**Volkswagen** (210)
- images/210.jpg : Golf 5 2008, 180 000 km

**Mercedes-Benz** (211)
- images/211.jpg : Classe C 200 2008, 175 000 km

**Mitsubishi** (212)
- images/212.jpg : L200 2011, 190 000 km

**Suzuki** (213)
- images/213.jpg : Grand Vitara 2011, 150 000 km

### Maisons à vendre : numéros 214 à 229

**Lomé** (214 à 219)
- images/214.jpg : Studio meublé
- images/215.jpg : Appartement 2 chambres
- images/216.jpg : Appartement 3 chambres
- images/217.jpg : Maison 3 chambres avec cour
- images/218.jpg : Villa 4 chambres avec cour
- images/219.jpg : Villa de standing 5 chambres avec piscine

**Kpalimé** (220 à 221)
- images/220.jpg : Maison 3 chambres avec cour
- images/221.jpg : Villa 4 chambres avec jardin

**Kara** (222 à 223)
- images/222.jpg : Maison 3 chambres avec cour
- images/223.jpg : Villa 4 chambres

**Sokodé** (224)
- images/224.jpg : Maison 3 chambres

**Atakpamé** (225)
- images/225.jpg : Maison 2 chambres

**Aného** (226 à 227)
- images/226.jpg : Maison 3 chambres
- images/227.jpg : Villa 4 chambres vue sur mer

**Dapaong** (228)
- images/228.jpg : Maison 3 chambres

**Tsévié** (229)
- images/229.jpg : Maison 3 chambres avec cour

### Accessoires et énergie : numéros 230 à 246 et 248

**Anker** (230 à 231)
- images/230.jpg : Batterie externe 20 000 mAh
- images/231.jpg : Chargeur 65 W GaN

**Samsung** (232 à 234)
- images/232.jpg : Chargeur rapide 45 W
- images/233.jpg : Galaxy Watch8
- images/234.jpg : Galaxy Watch Ultra

**Apple** (235 à 237)
- images/235.jpg : Watch SE 3
- images/236.jpg : Watch Series 11
- images/237.jpg : Chargeur MagSafe

**Xiaomi** (238 à 239)
- images/238.jpg : Smart Band 9
- images/239.jpg : Redmi Watch 5

**Huawei** (240 à 241)
- images/240.jpg : Watch Fit 4
- images/241.jpg : Watch GT 5

**Baseus** (242 à 243)
- images/242.jpg : Câble USB-C 100 W
- images/243.jpg : Chargeur 65 W 3 ports

**TP-Link** (244 à 245)
- images/244.jpg : Routeur Wi-Fi 6 AX1800
- images/245.jpg : Archer AX55 Wi-Fi 6

**EcoFlow** (246)
- images/246.jpg : River 2 station d’énergie portable

**Tenda** (248)
- images/248.jpg : F3 Routeur Wi-Fi 300 Mbps

