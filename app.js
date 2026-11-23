const ls={get:(k,d)=>{try{const v=localStorage.getItem("tg_"+k);return v?JSON.parse(v):d}catch(e){return d}},set:(k,v)=>{try{localStorage.setItem("tg_"+k,JSON.stringify(v))}catch(e){}}};
const $=id=>document.getElementById(id),esc=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const fmt=n=>Math.round(n).toLocaleString("fr-FR").replace(/[\u202f\u00a0]/g," ")+" FCFA";
let CATS=CATEGORIE.map(c=>[c.id_categorie,c.nom_categorie]);
const adapt=r=>({id:r.id_produit,n:r.nom_produit,d:r.description,p:+r.prix,c:r.id_categorie,s:r.stock,img:r.image,...(DECOR[r.id_produit]||{e:CAT_ICON[r.id_categorie],col:"#9fd6cf",r:0})});
let P=PRODUIT.map(adapt);
const RES=[6,7,8];const MQ=p=>(MARQUES[p.c]||[]).find(b=>p.n.includes(b))||"Autres";const slug=s=>s.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
const PLANS=[["starter","Starter",10000,5,false,["Jusqu’à 5 produits en ligne","Badge vendeur sur vos annonces","Support par e-mail"]],["pro","Pro",25000,50,true,["Jusqu’à 50 produits en ligne","Badge vendeur sur vos annonces","Demandes de partenariat avec d’autres entreprises","Support prioritaire"]],["entreprise","Entreprise",60000,1e9,true,["Produits illimités","Badge vendeur sur vos annonces","Demandes de partenariat avec d’autres entreprises","Interlocuteur dédié"]]];
if(ls.get("ver",0)!==DATA_VERSION){["sell","own","cart","stk","fav","cmds","lignes"].forEach(k=>ls.set(k,["sell","fav","cmds","lignes"].includes(k)?[]:{}));ls.set("ver",DATA_VERSION)}
ls.get("sell",[]).forEach(r=>P.push(adapt(r)));
const stk=ls.get("stk",{});P.forEach(p=>{if(stk[p.id]!=null)p.s=stk[p.id]});
const prod=id=>P.find(p=>p.id==id),cn=id=>CATS.find(c=>c[0]==id)[1];
const S={c:0,q:"",tri:"p",pa:0,pb:1e9,nt:0,sk:false,fo:false,b:"",lim:24,sig:"",v:"home",liv:"std",promo:false,
 cart:ls.get("cart",{}),sell:ls.get("sell",[]),own:ls.get("own",{}),abos:ls.get("abos",{}),parts:ls.get("parts",[]),fav:ls.get("fav",[]),me:ls.get("me",null),clients:ls.get("clients",[]),cmds:ls.get("cmds",[]),lignes:ls.get("lignes",[])};
const save=()=>{if(window.TogoshopSupabase&&TogoshopSupabase.enabled)return;ls.set("sell",S.sell);ls.set("own",S.own);ls.set("abos",S.abos);ls.set("parts",S.parts);ls.set("cart",S.cart);ls.set("fav",S.fav);ls.set("me",S.me);ls.set("clients",S.clients);ls.set("cmds",S.cmds);ls.set("lignes",S.lignes);ls.set("stk",Object.fromEntries(P.map(p=>[p.id,p.s])))};
function toast(m){const t=$("toast");t.textContent=m;t.classList.add("on");clearTimeout(toast.t);toast.t=setTimeout(()=>t.classList.remove("on"),2200)}
const stars=r=>"★".repeat(Math.round(r))+"☆".repeat(5-Math.round(r));
const im=p=>`<img src="${p.img}" alt="${p.n}" loading="lazy" data-e="${p.e}" onerror="this.replaceWith(this.dataset.e)">`;

function card(p){const f=S.fav.includes(p.id),b=p.o?`<span class="bd">-${Math.round(100-p.p*100/p.o)} %</span>`:"";
 return `<article class="card">${b}<button class="fav ${f?"on":""}" onclick="tf(${p.id})" aria-label="Ajouter aux favoris" aria-pressed="${f}">♥</button>
 <div class="pic" onclick="det(${p.id})" style="background:${p.col}33">${im(p)}</div>
 <div class="inf"><span class="cat">${cn(p.c)}${S.own[p.id]?" · Vendeur partenaire":""}</span><h3><button class="lk" onclick="det(${p.id})">${p.n}</button></h3>
 <span class="rt">${p.r?stars(p.r)+" "+p.r.toFixed(1).replace(".",","):"Nouveau"}</span>
 <span class="sk ${p.s<5?"lo":""}">${p.s==0?"Rupture de stock":p.s<5?"Plus que "+p.s+" en stock":"En stock"}</span>
 <div class="by"><span class="pr">${p.o?`<s>${fmt(p.o)}</s>`:""}${fmt(p.p)}</span><button class="ad" ${p.s?"":"disabled"} onclick="add(${p.id})">${RES.includes(p.c)?"Réserver":"Ajouter"}</button></div></div></article>`}
function go(){
 $("nav").innerHTML=`<button class="nv" aria-pressed="${S.v=="home"}" onclick="view('home')">Accueil</button>`+[[0,"Boutique"],...CATS].map(([i,n])=>`<button class="nv" aria-pressed="${S.v=="shop"&&S.c===i}" onclick="S.c=${i};S.b='';view('shop')">${n}</button>`).join("")+`<button class="nv" aria-pressed="${S.v=="seller"}" onclick="view('seller')">Espace vendeur</button>`;
 let l=P.filter(p=>(!S.c||p.c===S.c)&&(!S.b||MQ(p)===S.b)&&(p.n+" "+cn(p.c)).toLowerCase().includes(S.q)&&p.p>=S.pa&&p.p<=S.pb&&p.r>=S.nt&&(!S.sk||p.s>0)&&(!S.fo||S.fav.includes(p.id)));
 if(S.tri=="a")l.sort((a,b)=>a.p-b.p);if(S.tri=="d")l.sort((a,b)=>b.p-a.p);if(S.tri=="n")l.sort((a,b)=>b.r-a.r);
 $("ti").textContent=S.fo?"Mes favoris":(S.c?cn(S.c):"Toute la boutique")+(S.b?" : "+S.b:"");$("nb").textContent=l.length+(l.length>1?" produits":" produit");
 const sig=[S.c,S.b,S.q,S.tri,S.pa,S.pb,S.nt,S.sk,S.fo].join("|");if(sig!==S.sig){S.sig=sig;S.lim=24}
 const bl=S.c?[...(MARQUES[S.c]||[]),"Autres"].filter(b=>P.some(p=>p.c===S.c&&MQ(p)===b)):[];
 $("bch").innerHTML=S.c?[["","Toutes les marques",P.filter(p=>p.c===S.c).length],...bl.map(b=>[b,b,P.filter(p=>p.c===S.c&&MQ(p)===b).length])].map(([v,t,n])=>`<button aria-pressed="${S.b===v}" onclick="S.b='${v}';go()">${t} (${n})</button>`).join(""):"";
 let gh;
 if(!l.length)gh=`<p class="em">Aucun produit ne correspond. Modifiez vos filtres ou réinitialisez-les.</p>`;
 else if(S.c&&!S.b&&S.tri=="p"){const m={};l.forEach(p=>(m[MQ(p)]=m[MQ(p)]||[]).push(p));gh=bl.filter(b=>m[b]).map(b=>`<div class="bh"><h3>${b}</h3><span>${m[b].length} ${m[b].length>1?"modèles":"modèle"}</span></div>`+m[b].map(card).join("")).join("")}
 else gh=l.slice(0,S.lim).map(card).join("")+(l.length>S.lim?`<div class="bh" style="justify-content:center"><button class="ad" onclick="S.lim+=24;go()">Afficher plus (${l.length-S.lim} restants)</button></div>`:"");
 $("grid").innerHTML=gh;
 $("fl").innerHTML=P.filter(p=>p.o).slice(0,4).map(card).join("");
 $("nf").textContent=S.fav.length;$("vd").innerHTML=[6,7,8].flatMap(c=>P.filter(p=>p.c===c).slice(0,c==7?2:1)).map(card).join("");$("bs").innerHTML=[1,3,4,5].map(c=>P.filter(p=>p.c===c).sort((a,b)=>b.r-a.r)[0]).filter(Boolean).map(card).join("");$("cc").innerHTML=CATS.map(([i,n])=>`<button class="cb" onclick="S.c=${i};S.b='';view('shop')"><i>${CAT_ICON[i]}</i><b>${n}</b><span>${P.filter(p=>p.c===i).length} produits</span></button>`).join("");$("uname").textContent=S.me?S.me.prenom:"Connexion";if(S.v=="seller")vend();cart()}
function reset(){Object.assign(S,{c:0,b:"",q:"",tri:"p",pa:0,pb:1e9,nt:0,sk:false,fo:false});$("qi").value="";$("pf").value="0-1000000000";go()}
function tf(id){const i=S.fav.indexOf(id),active=i<0;active?S.fav.push(id):S.fav.splice(i,1);save();go();
 if(window.TogoshopSupabase&&TogoshopSupabase.enabled&&S.me){
  TogoshopSupabase.setFavorite(id,active).catch(error=>toast(error.message||"Favoris Supabase indisponibles"));
 }}
function add(id,q=1){const p=prod(id),n=(S.cart[id]||0)+q;if(n>p.s){toast("Stock maximal atteint");return}S.cart[id]=n;save();cart();toast(p.n+" ajouté au panier");
 if(window.TogoshopSupabase&&TogoshopSupabase.enabled&&S.me){
  TogoshopSupabase.setCart(id,n).catch(error=>toast(error.message||"Panier Supabase indisponible"));
 }}
function cart(){let n=0,t=0;const ids=Object.keys(S.cart);
 $("ls").innerHTML=ids.length?ids.map(id=>{const p=prod(id),q=S.cart[id];n+=q;t+=p.p*q;return `<div class="ln"><div class="t" style="background:${p.col}33">${im(p)}</div><div><p>${p.n}</p><small>${fmt(p.p)}</small></div><div class="q"><button onclick="qt(${id},-1)" aria-label="Retirer un">−</button><span>${q}</span><button onclick="qt(${id},1)" aria-label="Ajouter un">+</button></div></div>`}).join(""):`<p class="em">Votre panier est vide. Ajoutez un produit pour commencer.</p>`;
 $("nc").textContent=n;$("stt").textContent=fmt(t);$("pay").disabled=!ids.length}
function qt(id,d){const n=(S.cart[id]||0)+d;if(n>prod(id).s)return;n<=0?delete S.cart[id]:S.cart[id]=n;save();cart();if($("co"))sum();
 if(window.TogoshopSupabase&&TogoshopSupabase.enabled&&S.me){
  TogoshopSupabase.setCart(id,n<=0?0:n).catch(error=>toast(error.message||"Panier Supabase indisponible"));
 }}
function oc(v){document.body.classList.toggle("open",v);$("dr").setAttribute("aria-hidden",!v)}
const dlg=$("dlg");dlg.addEventListener("click",e=>{if(e.target===dlg)dlg.close()});
function show(h,w){dlg.className=w?"wide":"";dlg.innerHTML=`<div class="dc"><button class="x" onclick="dlg.close()" aria-label="Fermer">✕</button>${h}</div>`;if(!dlg.open)dlg.showModal()}

function feats(p){const n=p.n,o=[];let m;const go=[...n.matchAll(/(\d+)\s?Go/g)].map(x=>x[1]);
 if(p.c===3&&go.length>1){o.push(["Mémoire (RAM)",go[0]+" Go"]);o.push(["Stockage",go[1]+" Go"])}else if(go.length&&p.c!==5)o.push(["Stockage",go[0]+" Go"]);
 if(m=n.match(/(Core (?:Ultra )?[i]?\d+|Ryzen \d|M\d)\b/))o.push(["Processeur",m[1]]);
 if(m=n.match(/(\d[\d,]*)\s?pouces?/))o.push(["Taille d’écran",m[1]+" pouces"]);
 if(m=n.match(/\b(20\d\d),\s?([\d ]+ km)/)){o.push(["Année",m[1]]);o.push(["Kilométrage",m[2]])}
 if(m=n.match(/(essence|diesel|hybride)/i))o.push(["Carburant",m[1][0].toUpperCase()+m[1].slice(1).toLowerCase()]);
 if(m=n.match(/(\d) chambres?/))o.push(["Chambres",m[1]]);
 if(m=n.match(/(\d+(?:,\d)?)\s?kg/))o.push(["Capacité",m[1]+" kg"]);
 if(m=n.match(/(\d+)\s?L\b/))o.push(["Volume",m[1]+" litres"]);
 if(m=n.match(/(\d+(?:,\d)?)\s?CV/))o.push(["Puissance",m[1]+" CV"]);
 if(p.c===6)o.unshift(["État","Neuf"]);if(p.c===7)o.unshift(["État","Occasion"]);if(p.c===8)o.unshift(["Type d’annonce","Vente"]);
 return o}
function det(id){const p=prod(id),mq=MQ(p),res=RES.includes(p.c),f=S.fav.includes(p.id);
 const sim=P.filter(q=>q.id!==p.id&&q.c===p.c).sort((a,b)=>(MQ(b)===mq)-(MQ(a)===mq)||Math.abs(a.p-p.p)-Math.abs(b.p-p.p)).slice(0,4);
 const dispo=p.s?(p.s<5?"Plus que "+p.s+" en stock":p.s+" en stock"):"Rupture de stock";
 const sp=[["Référence","N° "+p.id],["Catégorie",cn(p.c)],[p.c===8?"Ville":"Marque",mq],...feats(p),["Disponibilité",dispo],["Prix",fmt(p.p)]];
 if(p.o)sp.push(["Ancien prix",fmt(p.o)]);if(S.own[p.id])sp.push(["Vendeur","Vendeur partenaire"]);
 show(`<div class="dv2"><div class="gal" onclick="zoom(${p.id})" onkeydown="if(event.key==='Enter')zoom(${p.id})" role="button" tabindex="0" aria-label="Agrandir l’image"><img src="${p.img}" alt="${p.n}" data-e="${p.e}" onerror="this.replaceWith(this.dataset.e)"><span class="zm">Agrandir</span></div>
 <div class="inf2"><span class="cat">${cn(p.c)} · ${mq}</span><h2>${p.n}</h2><span class="rt">${p.r?stars(p.r)+" "+p.r.toFixed(1).replace(".",","):"Nouveau"}</span>
 <p class="pr">${p.o?`<s>${fmt(p.o)}</s>`:""}${fmt(p.p)}</p><p class="sk ${p.s<5?"lo":""}">${dispo}</p>
 <h3>Description</h3><p>${p.d}</p>
 <div class="q" style="margin:14px 0"><button onclick="dq(-1)" aria-label="Moins">−</button><span id="dqv">1</span><button onclick="dq(1)" aria-label="Plus">+</button></div>
 <div class="acts"><button class="btn" ${p.s?"":"disabled"} onclick="add(${p.id},+dqv.textContent);dlg.close()">${res?"Réserver":"Ajouter au panier"}</button><button class="ad" onclick="tf(${p.id});det(${p.id})">${f?"♥ Retirer des favoris":"♡ Ajouter aux favoris"}</button></div>
 <h3>Fiche produit</h3><table class="spec">${sp.map(([a,b])=>`<tr><td>${a}</td><td>${b}</td></tr>`).join("")}</table></div></div>
 <h3 style="margin-top:24px">Produits similaires</h3><div class="simg">${sim.map(q=>`<button class="sm" onclick="det(${q.id})">${im(q)}<b>${q.n}</b><span>${fmt(q.p)}</span></button>`).join("")}</div>`,true)}
function zoom(id){const p=prod(id),o=document.createElement("div");o.className="lb";o.onclick=()=>o.remove();o.innerHTML=`<img src="${p.img}" alt="${p.n}">`;dlg.appendChild(o)}
function dq(d){const v=$("dqv");v.textContent=Math.max(1,+v.textContent+d)}

const hash=async s=>[...new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(s)))].map(b=>b.toString(16).padStart(2,"0")).join("");
function auth(m="in",then){S.then=then;show(`<h2>${m=="in"?"Connexion":"Créer un compte"}</h2><div class="tabs"><button aria-pressed="${m=="in"}" onclick="auth('in',S.then)">Connexion</button><button aria-pressed="${m!="in"}" onclick="auth('up',S.then)">Inscription</button></div>
 <form onsubmit="sub(event,'${m}')" class="gp">${m=="up"?`<input class="f" name="prenom" placeholder="Prénom" required><input class="f" name="nom" placeholder="Nom" required><input class="f" name="telephone" placeholder="Téléphone" required inputmode="tel">`:""}
 <input class="f" type="email" name="email" placeholder="Adresse e-mail" required style="${m=="up"?"":"grid-column:1/-1"}"><input class="f" type="password" name="mdp" placeholder="Mot de passe (6 caractères min.)" minlength="6" required style="grid-column:1/-1">
 <p class="msg" id="am" style="grid-column:1/-1;margin:0"></p><button class="btn" style="grid-column:1/-1;background:var(--ind);color:var(--indk)">${m=="in"?"Se connecter":"Créer mon compte"}</button></form>`)}
async function sub(e,m){e.preventDefault();const f=Object.fromEntries(new FormData(e.target)),h=await hash(f.mdp),em=f.email.toLowerCase();
 if(window.TogoshopSupabase&&TogoshopSupabase.enabled){
  try{
   if(m=="up")await TogoshopSupabase.signUp({nom:f.nom,prenom:f.prenom,email:em,telephone:f.telephone},f.mdp);
   else await TogoshopSupabase.signIn(em,f.mdp);
   const profile=await hydrateSupabaseState(true);
   if(!profile){$("am").textContent="Votre compte est créé mais aucun profil n’est disponible. Vérifiez la configuration locale.";return}
   save();go();dlg.close();toast("Bienvenue "+S.me.prenom);
   for(const id in S.cart)await TogoshopSupabase.setCart(+id,S.cart[id]);
   if(S.then)S.then();
  }catch(error){$("am").textContent=error.message||"Erreur d'authentification";}
  return;
 }
 if(m=="up"){if(S.clients.some(c=>c.email==em)){$("am").textContent="Cette adresse e-mail est déjà utilisée.";return}
  const c={id_client:S.clients.length+1,nom:f.nom,prenom:f.prenom,email:em,telephone:f.telephone,mot_de_passe:h};S.clients.push(c);S.me=c}
 else{const c=S.clients.find(c=>c.email==em&&c.mot_de_passe==h);if(!c){$("am").textContent="E-mail ou mot de passe incorrect.";return}S.me=c}
 save();go();dlg.close();toast("Bienvenue "+S.me.prenom);if(S.then)S.then()}
async function compte(){if(!S.me)return auth("in");
 if(window.TogoshopSupabase&&TogoshopSupabase.enabled){
  try{
   const commandes=await TogoshopSupabase.getOrders();
   show(`<h2>Bonjour ${esc(S.me.prenom)}</h2><p>${esc(S.me.email)}, ${esc(S.me.telephone)}</p><h3>Mes commandes</h3>`+(commandes.length?commandes.map(c=>`<div class="opt" style="display:block"><div class="ro"><b>Commande n° ${c.id_commande}</b><span>${fmt((c.ligne_commande||[]).reduce((t,l)=>t+l.quantite*l.prix_unitaire,0))}</span></div><div class="ro"><span>${new Date(c.date_commande).toLocaleDateString("fr-FR")}</span><span class="sk">${esc(c.statut)}</span></div><small>${(c.ligne_commande||[]).map(l=>l.quantite+" × "+esc(prod(l.id_produit)?.n||"Produit")).join(", ")}</small></div>`).join(""):`<p class="em" style="padding:16px 0">Aucune commande pour l’instant.</p>`)+`<button class="ad" onclick="logout()">Se déconnecter</button>`);
  }catch(error){toast(error.message||"Impossible de charger les commandes")}
  return;
 }
 const mine=S.cmds.filter(c=>c.id_client==S.me.id_client).reverse();
 show(`<h2>Bonjour ${esc(S.me.prenom)}</h2><p>${esc(S.me.email)}, ${esc(S.me.telephone)}</p><h3>Mes commandes</h3>`+(mine.length?mine.map(c=>`<div class="opt" style="display:block"><div class="ro"><b>Commande n° ${c.id_commande}</b><span>${fmt(S.lignes.filter(l=>l.id_commande==c.id_commande).reduce((t,l)=>t+l.quantite*l.prix_unitaire,0))}</span></div><div class="ro"><span>${new Date(c.date_commande.replace(" ","T")).toLocaleDateString("fr-FR")}</span><span class="sk">${c.statut}</span></div>
 <small>${S.lignes.filter(l=>l.id_commande==c.id_commande).map(l=>l.quantite+" × "+prod(l.id_produit).n).join(", ")}</small></div>`).join(""):`<p class="em" style="padding:16px 0">Aucune commande pour l’instant.</p>`)+`<button class="ad" onclick="logout()">Se déconnecter</button>`)}

function calc(){let st=0;for(const id in S.cart)st+=prod(id).p*S.cart[id];const rem=S.promo?Math.round(st*.1):0;
 let fr=!st?0:S.liv=="ret"?0:S.liv=="exp"?3000:(st-rem>=100000?0:1500);return{st,rem,fr,tot:st-rem+fr}}
function sum(){const c=calc();$("sum").innerHTML=`<div class="ro"><span>Sous-total</span><span>${fmt(c.st)}</span></div>${c.rem?`<div class="ro"><span>Remise TOGO10</span><span>-${fmt(c.rem)}</span></div>`:""}<div class="ro"><span>Livraison</span><span>${c.fr?fmt(c.fr):"Offerte"}</span></div><div class="ro tt" style="margin-top:6px"><span>Total</span><span>${fmt(c.tot)}</span></div>`}
function checkout(){if(!S.me)return auth("in",checkout);
 const L=[["std","Standard, 2 à 4 jours","1 500 FCFA"],["exp","Express, 24 heures","3 000 FCFA"],["ret","Retrait en boutique à Lomé","Gratuit"]],M=[["mixx","Mixx by Yas"],["flooz","Flooz (Moov Africa)"],["carte","Carte bancaire"],["cod","Paiement à la livraison"]];
 show(`<h2>Finaliser la commande</h2><form id="co" onsubmit="valider(event)"><h3>Adresse de livraison</h3><div class="gp"><input class="f" name="adresse" placeholder="Quartier et rue" required><select name="ville" aria-label="Ville">${["Lomé","Kpalimé","Atakpamé","Sokodé","Kara","Aného"].map(v=>`<option>${v}</option>`).join("")}</select></div>
 <h3>Mode de livraison</h3>${L.map(([v,n,p],i)=>`<label class="opt"><input type="radio" name="liv" value="${v}" ${i?"":"checked"} onchange="S.liv=this.value;sum()">${n}<b>${p}</b></label>`).join("")}
 <h3>Paiement</h3>${M.map(([v,n],i)=>`<label class="opt"><input type="radio" name="paiement" value="${n}" ${i?"":"checked"}>${n}</label>`).join("")}<small>Paiement simulé pour la démonstration.</small>
 <h3>Code promo</h3><div class="gp"><input class="f" id="pc" placeholder="TOGO10"><button type="button" class="ad" onclick="S.promo=pc.value.trim().toUpperCase()=='TOGO10';toast(S.promo?'Code appliqué':'Code invalide');sum()">Appliquer</button></div>
 <h3>Récapitulatif</h3><div id="sum"></div><button class="pay" style="margin-top:14px">Confirmer la commande</button></form>`);S.liv="std";sum()}
async function valider(e){e.preventDefault();const f=Object.fromEntries(new FormData(e.target)),c=calc();
 if(window.TogoshopSupabase&&TogoshopSupabase.enabled&&S.me){
  try{
   for(const id in S.cart)await TogoshopSupabase.setCart(+id,S.cart[id]);
   const mode={std:"standard",exp:"express",ret:"retrait"}[f.liv]||"standard";
   const id=await TogoshopSupabase.placeOrder(f.adresse,f.ville,mode,f.paiement,S.promo?"TOGO10":"");
   S.cart={};S.promo=false;save();await initSupabaseCatalog();cart();
   show(`<h2>Merci ${esc(S.me.prenom)}, commande confirmée</h2><p>Commande n° <b>${id}</b>, total ${fmt(c.tot)}. Livraison à ${esc(f.adresse+", "+f.ville)}.</p><p><small>Adresse, livraison et paiement ont été enregistrés dans les tables complémentaires locales.</small></p><button class="btn" style="background:var(--ind);color:var(--indk)" onclick="dlg.close()">Continuer mes achats</button>`);
  }catch(error){toast(error.message||"Commande Supabase refusée")}
  return;
 }
 const id=1001+S.cmds.length;
 const cmd={id_commande:id,date_commande:new Date().toISOString().slice(0,19).replace("T"," "),statut:Object.keys(S.cart).some(i=>RES.includes(prod(i).c))?"Réservation à confirmer":"En préparation",id_client:S.me.id_client};
 const lg=Object.keys(S.cart).map((pid,i)=>({id_ligne:S.lignes.length+i+1,id_commande:id,id_produit:+pid,quantite:S.cart[pid],prix_unitaire:prod(pid).p}));
 lg.forEach(l=>prod(l.id_produit).s-=l.quantite);S.cmds.push(cmd);S.lignes.push(...lg);S.cart={};S.promo=false;save();go();
 show(`<h2>Merci ${esc(S.me.prenom)}, commande confirmée</h2><p>Commande n° <b>${id}</b>, total ${fmt(c.tot)}. Livraison à ${esc(f.adresse+", "+f.ville)}.</p><h3>Données prêtes pour le back-end (JSON)</h3><pre>${esc(JSON.stringify({commande:cmd,lignes:lg},null,2))}</pre><p><small>L’adresse, le mode de livraison et le paiement n’existent pas dans le schéma : ils ne sont pas enregistrés.</small></p><button class="btn" style="background:var(--ind);color:var(--indk)" onclick="dlg.close()">Continuer mes achats</button>`)}

function dbv(t="client"){const T={client:S.clients.map(c=>({...c,mot_de_passe:c.mot_de_passe.slice(0,10)+"…"})),categorie:CATS.map(([a,b])=>({id_categorie:a,nom_categorie:b})),
 produit:P.map(p=>({id_produit:p.id,nom_produit:p.n,description:p.d.slice(0,26)+"…",prix:p.p.toFixed(2),stock:p.s,image:p.img,id_categorie:p.c})),commande:S.cmds,ligne_commande:S.lignes},r=T[t];
 show(`<h2>Base de données togoshop</h2><p>Chaque action du site écrit dans ces cinq tables. Les noms de tables et de colonnes sont ceux du schéma de référence.</p><div class="tabs">${Object.keys(T).map(k=>`<button aria-pressed="${k==t}" onclick="dbv('${k}')">${k} (${T[k].length})</button>`).join("")}</div>
 <div class="tw">${r.length?`<table><tr>${Object.keys(r[0]).map(k=>`<th>${k}</th>`).join("")}</tr>${r.slice(-8).map(o=>`<tr>${Object.values(o).map(v=>`<td>${esc(v)}</td>`).join("")}</tr>`).join("")}</table>`:`<p class="em">Aucune ligne pour l’instant. Créez un compte ou passez une commande.</p>`}</div>`)}

function tick(){const n=new Date(),e=new Date(n);e.setHours(23,59,59,999);const s=Math.floor((e-n)/1e3);$("cd").textContent=[s/3600,s/60%60,s%60].map(v=>String(Math.floor(v)).padStart(2,"0")).join(":")}
async function abonner(k){if(!S.me)return auth("in",()=>abonner(k));
 if(window.TogoshopSupabase&&TogoshopSupabase.enabled){
  try{await TogoshopSupabase.chooseSellerPlan(k);S.abos[S.me.id_client]={plan:k,date:new Date().toISOString().slice(0,10)};save();go();toast("Plan "+PLANS.find(x=>x[0]==k)[1]+" activé")}
  catch(error){toast(error.message||"Impossible de choisir ce plan")}
  return;
 }
 S.abos[S.me.id_client]={plan:k,date:new Date().toISOString().slice(0,10)};save();go();toast("Abonnement "+PLANS.find(x=>x[0]==k)[1]+" activé")}
const clean=s=>String(s).replace(/[<>&"]/g,"").trim();
async function addProd(e){e.preventDefault();const f=Object.fromEntries(new FormData(e.target));
 if(window.TogoshopSupabase&&TogoshopSupabase.enabled){
  try{
   await TogoshopSupabase.publishProduct({nom:clean(f.nom),description:clean(f.desc),prix:+f.prix,stock:+f.stock,categorie:+f.cat});
   await initSupabaseCatalog();e.target.reset();vend();toast("Produit publié dans la boutique");
  }catch(error){toast(error.message||"Impossible de publier le produit")}
  return;
 }
 const pl=PLANS.find(x=>x[0]==S.abos[S.me.id_client].plan),n=Object.values(S.own).filter(v=>v==S.me.id_client).length;
 if(n>=pl[3]){toast("Limite de produits de votre plan atteinte");return}
 const id=Math.max(...P.map(p=>p.id))+1,r={id_produit:id,nom_produit:clean(f.nom),description:clean(f.desc),prix:+f.prix,stock:+f.stock,image:"images/"+id+".jpg",id_categorie:+f.cat};
 S.sell.push(r);S.own[id]=S.me.id_client;P.push(adapt(r));save();e.target.reset();go();toast("Produit publié dans la boutique")}
async function delProd(id){if(!S.me||S.own[id]!=S.me.id_client)return;
 if(window.TogoshopSupabase&&TogoshopSupabase.enabled){
  try{await TogoshopSupabase.removeProduct(id);await initSupabaseCatalog();await vend()}
  catch(error){toast(error.message||"Impossible de retirer le produit")}
  return;
 }
 S.sell=S.sell.filter(r=>r.id_produit!=id);delete S.own[id];const i=P.findIndex(p=>p.id==id);if(i>=0)P.splice(i,1);delete S.cart[id];S.fav=S.fav.filter(x=>x!=id);save();go()}
async function partner(e){e.preventDefault();const f=Object.fromEntries(new FormData(e.target));
 if(window.TogoshopSupabase&&TogoshopSupabase.enabled){
  try{await TogoshopSupabase.requestPartnership(clean(f.type),clean(f.msg));e.target.reset();await vend();toast("Demande de partenariat envoyée")}
  catch(error){toast(error.message||"Impossible d'envoyer la demande")}
  return;
 }
 S.parts.push({id_client:S.me.id_client,type:clean(f.type),message:clean(f.msg),statut:"En étude"});save();e.target.reset();go();toast("Demande de partenariat envoyée")}
function vend(){const me=S.me,ab=me&&S.abos[me.id_client],pl=ab&&PLANS.find(x=>x[0]==ab.plan);
 let h=`<div class="hd"><h2>Espace vendeur</h2><span>${me?"Choisissez votre abonnement":"Connectez-vous pour vous abonner"}</span></div><div class="plans">`+PLANS.map(([k,n,pr,lim,pa,ft])=>{const on=ab&&ab.plan==k;return `<div class="plan ${on?"on":""}"><h3>${n}</h3><p class="pr">${fmt(pr)}<small> / mois</small></p><ul>${ft.map(x=>`<li>${x}</li>`).join("")}</ul><button class="${on?"ad":"btn"}" ${on?"disabled":""} onclick="abonner('${k}')">${on?"Votre abonnement":ab?"Changer de plan":"Choisir ce plan"}</button></div>`}).join("")+`</div><p class="note">Paiement simulé pour la démonstration.</p>`;
 if(ab){const mine=P.filter(p=>S.own[p.id]==me.id_client),rq=S.parts.filter(x=>x.id_client==me.id_client);
  h+=`<div class="dash"><h3>Publier un produit (${mine.length} sur ${pl[3]>1e6?"illimité":pl[3]})</h3>
  <form class="gp" onsubmit="addProd(event)"><input class="f" name="nom" placeholder="Nom du produit" maxlength="150" required><select name="cat" aria-label="Catégorie">${CATS.map(([i,n])=>`<option value="${i}">${n}</option>`).join("")}</select>
  <input class="f" name="prix" type="number" min="100" placeholder="Prix en FCFA" required><input class="f" name="stock" type="number" min="1" placeholder="Quantité en stock" required>
  <input class="f" name="desc" placeholder="Description courte" maxlength="200" required style="grid-column:1/-1"><button class="btn" style="grid-column:1/-1;background:var(--ind);color:var(--indk)">Publier dans la boutique</button></form>
  <h3>Mes produits</h3>${mine.length?mine.map(p=>`<div class="opt"><span>${p.e}</span>${p.n}<b>${fmt(p.p)}</b><button class="ad" onclick="delProd(${p.id})">Retirer</button></div>`).join(""):`<p class="note">Aucun produit publié pour l’instant.</p>`}
  <h3>Partenariats</h3>${pl[4]?`<form class="gp" onsubmit="partner(event)"><select name="type" aria-label="Type de partenariat"><option>Fournisseur</option><option>Distributeur</option><option>Livraison et transport</option><option>Financement</option><option>Publicité</option></select><input class="f" name="msg" placeholder="Décrivez votre projet" maxlength="200" required><button class="btn" style="grid-column:1/-1;background:var(--ind);color:var(--indk)">Envoyer la demande</button></form>${rq.map(x=>`<div class="opt">${x.type}<small>${x.message}</small><b>${x.statut}</b></div>`).join("")}`:`<p class="note">Les demandes de partenariat sont réservées aux plans Pro et Entreprise.</p>`}</div>`}
 $("sv").innerHTML=h}
function view(v){S.v=v;$("home").hidden=v!="home";$("shop").hidden=v!="shop";$("seller").hidden=v!="seller";go();if(window.scrollTo)window.scrollTo(0,0)}
async function logout(){
 if(window.TogoshopSupabase&&TogoshopSupabase.enabled){
  await TogoshopSupabase.signOut();
 }
 S.me=null;save();go();dlg.close();toast("Vous êtes déconnecté");
}

async function initSupabaseCatalog(){
 if(!window.TogoshopSupabase||!TogoshopSupabase.enabled)return;
 try{
  const categories=await TogoshopSupabase.getCategories();
  const products=await TogoshopSupabase.getProducts();
  if(categories&&categories.length)CATS=categories.map(c=>[c.id_categorie,c.nom_categorie]);
  if(products&&products.length){
   P=products.map(adapt);
   if(!TogoshopSupabase.enabled){
    const stk=ls.get("stk",{});
    P.forEach(p=>{if(stk[p.id]!=null)p.s=stk[p.id]});
   }
  }
  await hydrateSupabaseState(false);
  go();
 }catch(error){toast(error.message||"Supabase local indisponible")}
}

async function hydrateSupabaseState(mergeLocalCart){
 const profile=await TogoshopSupabase.getProfile();
 if(!profile){S.me=null;return null}
 S.me={id_client:profile.id_client,nom:profile.nom||"",prenom:profile.prenom||"",email:profile.email||"",telephone:profile.telephone||"",mot_de_passe:""};

 const [cart,favorites,seller]=await Promise.all([
  TogoshopSupabase.getCart(),
  TogoshopSupabase.getFavorites(),
  TogoshopSupabase.getSellerInfo()
 ]);
 const remoteCart=Object.fromEntries((cart||[]).map(row=>[row.id_produit,row.quantite]));
 if(mergeLocalCart){
  Object.keys(S.cart).forEach(id=>{
   remoteCart[id]=Math.min(prod(id)?.s||S.cart[id],Math.max(remoteCart[id]||0,S.cart[id]));
  });
 }
 S.cart=remoteCart;
 if(favorites)S.fav=favorites;
 if(seller){
  if(seller.plan&&seller.plan.actif)S.abos[S.me.id_client]={plan:seller.plan.plan,date:seller.plan.date_debut};
  else delete S.abos[S.me.id_client];
  S.own=Object.fromEntries(seller.productIds.map(id=>[id,S.me.id_client]));
  S.parts=seller.partnerships.map(row=>({id_client:S.me.id_client,type:row.type,message:row.message,statut:row.statut}));
 }
 return profile;
}

setInterval(tick,1000);tick();view(location.hash=="#boutique"?"shop":"home");initSupabaseCatalog();
