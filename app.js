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
const PAYMENT_DEMO=Object.freeze({card:"4242424242424242",cvv:"123",mobile:"22800000000",code:"123456"});
const PAYMENT_LABELS={carte:"Carte bancaire",tmoney:"T-Money",flooz:"Flooz",cod:"Paiement à la livraison"};
let paymentFlow={mode:null,active:false,verified:false,attempts:0};
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
function clearPaymentInputs(){document.querySelectorAll("[data-payment-sensitive]").forEach(input=>{input.value=""})}
function setPaymentMessage(message){const node=$("payment-error");if(node)node.textContent=message}
function demoPaymentBanner(){return `<div class="demo-banner" role="note"><strong>Mode démonstration.</strong> Aucun paiement réel, n’entrez pas vos vraies coordonnées.</div>`}
function formatDigits(input,max){input.value=input.value.replace(/\D/g,"").slice(0,max)}
function formatCardNumber(input){input.value=input.value.replace(/\D/g,"").slice(0,16).replace(/(\d{4})(?=\d)/g,"$1 ")}
function formatCardExpiry(input){const digits=input.value.replace(/\D/g,"").slice(0,4);input.value=digits.length>2?digits.slice(0,2)+"/"+digits.slice(2):digits}
function paymentFieldsHtml(mode){
 if(mode==="carte")return `<div class="payment-grid">
  <label>Numéro de carte<input class="f" id="card-number" type="text" inputmode="numeric" maxlength="19" autocomplete="off" placeholder="4242 4242 4242 4242" data-payment-sensitive oninput="formatCardNumber(this)"></label>
  <label>Expiration (MM/AA)<input class="f" id="card-expiry" type="text" inputmode="numeric" maxlength="5" autocomplete="off" placeholder="MM/AA" data-payment-sensitive oninput="formatCardExpiry(this)"></label>
  <label>CVV de test<input class="f" id="card-cvv" type="password" inputmode="numeric" maxlength="3" autocomplete="off" placeholder="123" data-payment-sensitive oninput="formatDigits(this,3)"></label>
  <label>Nom du titulaire<input class="f" id="card-holder" type="text" maxlength="60" autocomplete="off" placeholder="TEST USER" data-payment-sensitive></label>
 </div><small>Carte de test uniquement : 4242 4242 4242 4242. CVV de test : 123.</small><p class="msg" id="payment-error" role="status"></p>`;
 if(mode==="tmoney"||mode==="flooz")return `<label>Numéro ${mode==="tmoney"?"T-Money":"Flooz"} de test<input class="f" id="mobile-number" type="tel" inputmode="tel" maxlength="18" autocomplete="off" placeholder="+228 00 00 00 00" data-payment-sensitive></label>
  <small>Numéro de test accepté uniquement : +228 00 00 00 00.</small><p class="msg" id="payment-error" role="status"></p>`;
 return `<p class="demo-note">Aucune saisie de paiement n’est nécessaire pour le paiement à la livraison.</p><p class="msg" id="payment-error" role="status"></p>`;
}
function renderPaymentFields(mode){$("payment-fields").innerHTML=paymentFieldsHtml(mode)}
function renderPaymentChallenge(mode){$("payment-fields").innerHTML=`<div class="demo-note">Code de validation simulé : <strong>${PAYMENT_DEMO.code}</strong>. Aucun SMS n’est envoyé.</div>
 <label>Code à 6 chiffres<input class="f" id="payment-code" type="password" inputmode="numeric" maxlength="6" autocomplete="off" data-payment-sensitive oninput="formatDigits(this,6)"></label>
 <button class="ad" id="resend-demo-code" type="button" onclick="resendDemoCode()">Renvoyer le code</button>
 <button class="ad" type="button" onclick="cancelPaymentChallenge()">Annuler</button><p class="msg" id="payment-error" role="status"></p>`;
 $("checkout-submit").textContent="Valider le code"}
function paymentModeChanged(mode){
 clearPaymentInputs();paymentFlow={mode,active:false,verified:false,attempts:paymentFlow.attempts};
 renderPaymentFields(mode);$("checkout-submit").textContent="Confirmer la commande";$("checkout-submit").disabled=false
}
function resendDemoCode(){
 if(paymentFlow.attempts>=3){setPaymentMessage("La limite de 3 essais est atteinte. Annulez la validation; aucun paiement ni commande n’a été créé.");return}
 setPaymentMessage("Code de démonstration renvoyé. Les essais déjà utilisés ne sont pas réinitialisés.")
}
function cancelPaymentChallenge(){
 clearPaymentInputs();paymentFlow.active=false;paymentFlow.verified=false;
 renderPaymentFields(paymentFlow.mode);$("checkout-submit").textContent="Confirmer la commande";$("checkout-submit").disabled=false
}
function luhnValid(number){
 let total=0,doubleDigit=false;
 for(let i=number.length-1;i>=0;i--){let digit=+number[i];if(doubleDigit){digit*=2;if(digit>9)digit-=9}total+=digit;doubleDigit=!doubleDigit}
 return total%10===0
}
function validateCardPayment(){
 const number=$("card-number").value.replace(/\D/g,"");
 if(!/^\d{16}$/.test(number))return "Saisissez un numéro de carte de 16 chiffres.";
 if(!luhnValid(number))return "Numéro de carte invalide (contrôle Luhn).";
 if(number!==PAYMENT_DEMO.card)return "Démo uniquement : seule la carte 4242 4242 4242 4242 est acceptée.";
 const expiry=$("card-expiry").value.match(/^(0[1-9]|1[0-2])\/(\d{2})$/);
 if(!expiry)return "Expiration invalide. Utilisez le format MM/AA.";
 const expiryEnd=new Date(2000+Number(expiry[2]),Number(expiry[1]),0,23,59,59,999);
 if(expiryEnd<Date.now())return "La carte de test est expirée.";
 if($("card-cvv").value!==PAYMENT_DEMO.cvv)return "CVV de démonstration attendu : 123.";
 if(!$("card-holder").value.trim())return "Saisissez un nom de titulaire de test.";
 return ""
}
function validateMobilePayment(){
 const number=$("mobile-number").value.replace(/\D/g,"");
 if(number!==PAYMENT_DEMO.mobile)return "Démo uniquement : utilisez le numéro de test +228 00 00 00 00.";
 return ""
}
async function processDemoPayment(mode,onValidated,allowCashDelivery){
 if(mode==="cod"){
  if(!allowCashDelivery){setPaymentMessage("Choisissez une carte ou un paiement mobile pour l’abonnement.");return}
  clearPaymentInputs();await onValidated(mode,"à la livraison");return
 }
 if(!["carte","tmoney","flooz"].includes(mode)){setPaymentMessage("Mode de paiement invalide.");return}
 if(paymentFlow.mode!==mode)paymentModeChanged(mode);
 if(paymentFlow.verified){await onValidated(mode,"payé (simulé)");return}
 if(paymentFlow.active){
  const input=$("payment-code"),code=input?input.value:"";if(input)input.value="";
  paymentFlow.attempts++;
  if(code!==PAYMENT_DEMO.code){
   const remaining=Math.max(0,3-paymentFlow.attempts);
   setPaymentMessage(remaining?`Code incorrect. ${remaining} essai(s) restant(s).`:"3 essais épuisés. Annulez la validation; aucune commande n’a été créée.");
   if(!remaining){if(input)input.disabled=true;const resend=$("resend-demo-code");if(resend)resend.disabled=true;$("checkout-submit").disabled=true}
   return
  }
  paymentFlow.active=false;paymentFlow.verified=true;clearPaymentInputs();$("checkout-submit").textContent="Réessayer";
  await onValidated(mode,"payé (simulé)");return
 }
 if(paymentFlow.attempts>=3){setPaymentMessage("La limite de 3 essais est atteinte. Aucune opération n’a été créée.");return}
 const error=mode==="carte"?validateCardPayment():validateMobilePayment();
 if(error){setPaymentMessage(error);return}
 clearPaymentInputs();paymentFlow.mode=mode;paymentFlow.active=true;paymentFlow.verified=false;renderPaymentChallenge(mode)
}
function checkout(){
 if(!S.me)return auth("in",checkout);
 const L=[["std","Standard, 2 à 4 jours","1 500 FCFA"],["exp","Express, 24 heures","3 000 FCFA"],["ret","Retrait en boutique à Lomé","Gratuit"]];
 const M=[["tmoney","T-Money"],["flooz","Flooz"],["carte","Carte bancaire"],["cod","Paiement à la livraison"]];
 S.liv="std";paymentFlow={mode:"tmoney",active:false,verified:false,attempts:0};
 show(`<h2>Finaliser la commande</h2>${demoPaymentBanner()}
 <form id="co" autocomplete="off" onsubmit="valider(event)"><h3>Adresse de livraison</h3><div class="gp"><input class="f" name="adresse" placeholder="Quartier et rue" required><select name="ville" aria-label="Ville">${["Lomé","Kpalimé","Atakpamé","Sokodé","Kara","Aného"].map(v=>`<option>${v}</option>`).join("")}</select></div>
 <h3>Mode de livraison</h3>${L.map(([v,n,p],i)=>`<label class="opt"><input type="radio" name="liv" value="${v}" ${i?"":"checked"} onchange="S.liv=this.value;sum()">${n}<b>${p}</b></label>`).join("")}
 <h3>Paiement</h3>${M.map(([v,n],i)=>`<label class="opt"><input type="radio" name="paiement" value="${v}" ${i?"":"checked"} onchange="paymentModeChanged(this.value)">${n}</label>`).join("")}
 <div id="payment-fields">${paymentFieldsHtml("tmoney")}</div>
 <h3>Code promo</h3><div class="gp"><input class="f" id="pc" placeholder="TOGO10"><button type="button" class="ad" onclick="S.promo=pc.value.trim().toUpperCase()=='TOGO10';toast(S.promo?'Code appliqué':'Code invalide');sum()">Appliquer</button></div>
 <h3>Récapitulatif</h3><div id="sum"></div><button class="pay" id="checkout-submit" style="margin-top:14px">Confirmer la commande</button></form>`);sum()
}
async function saveCheckoutOrder(order,paymentStatus){
 const c=calc(),paymentLabel=PAYMENT_LABELS[order.paymentMode]||order.paymentMode;
 if(window.TogoshopSupabase&&TogoshopSupabase.enabled&&S.me){
  try{
   for(const id in S.cart)await TogoshopSupabase.setCart(+id,S.cart[id]);
   const mode={std:"standard",exp:"express",ret:"retrait"}[order.livraison]||"standard";
   const id=await TogoshopSupabase.placeOrder(order.adresse,order.ville,mode,order.paymentMode,order.codePromo);
   S.cart={};S.promo=false;save();await initSupabaseCatalog();cart();
   show(`<h2>Merci ${esc(S.me.prenom)}, commande confirmée</h2><p>Commande n° <b>${id}</b>, total ${fmt(c.tot)}. Livraison à ${esc(order.adresse+", "+order.ville)}.</p><p><small>Paiement : ${esc(paymentLabel)} — ${esc(paymentStatus)}. Seuls le mode et le statut sont enregistrés.</small></p><button class="btn" style="background:var(--ind);color:var(--indk)" onclick="dlg.close()">Continuer mes achats</button>`)
  }catch(error){toast(error.message||"Commande Supabase refusée")}
  return
 }
 const id=1001+S.cmds.length;
 const cmd={id_commande:id,date_commande:new Date().toISOString().slice(0,19).replace("T"," "),statut:Object.keys(S.cart).some(i=>RES.includes(prod(i).c))?"Réservation à confirmer":"En préparation",id_client:S.me.id_client,mode_paiement:order.paymentMode,statut_paiement:paymentStatus};
 const lg=Object.keys(S.cart).map((pid,i)=>({id_ligne:S.lignes.length+i+1,id_commande:id,id_produit:+pid,quantite:S.cart[pid],prix_unitaire:prod(pid).p}));
 lg.forEach(l=>prod(l.id_produit).s-=l.quantite);S.cmds.push(cmd);S.lignes.push(...lg);S.cart={};S.promo=false;save();go();
 show(`<h2>Merci ${esc(S.me.prenom)}, commande confirmée</h2><p>Commande n° <b>${id}</b>, total ${fmt(c.tot)}. Livraison à ${esc(order.adresse+", "+order.ville)}.</p><p>Paiement : ${esc(paymentLabel)} — ${esc(paymentStatus)}.</p><h3>Confirmation (JSON)</h3><pre>${esc(JSON.stringify({commande:cmd,lignes:lg},null,2))}</pre><p><small>Aucune donnée de carte, de téléphone ou de validation n’est conservée.</small></p><button class="btn" style="background:var(--ind);color:var(--indk)" onclick="dlg.close()">Continuer mes achats</button>`)
}
async function valider(e){
 e.preventDefault();
 const form=e.currentTarget,mode=form.querySelector('input[name="paiement"]:checked').value;
 const order={adresse:form.elements.namedItem("adresse").value.trim(),ville:form.elements.namedItem("ville").value,livraison:form.elements.namedItem("liv").value,paymentMode:mode,codePromo:S.promo?"TOGO10":""};
 await processDemoPayment(mode,async(paymentMode,paymentStatus)=>{
  order.paymentMode=paymentMode;await saveCheckoutOrder(order,paymentStatus)
 },true)
}
$("dlg").addEventListener("close",()=>{clearPaymentInputs();paymentFlow={mode:null,active:false,verified:false,attempts:0}});

function dbv(t="client"){const T={client:S.clients.map(c=>({...c,mot_de_passe:c.mot_de_passe.slice(0,10)+"…"})),categorie:CATS.map(([a,b])=>({id_categorie:a,nom_categorie:b})),
 produit:P.map(p=>({id_produit:p.id,nom_produit:p.n,description:p.d.slice(0,26)+"…",prix:p.p.toFixed(2),stock:p.s,image:p.img,id_categorie:p.c})),commande:S.cmds,ligne_commande:S.lignes},r=T[t];
 show(`<h2>Base de données togoshop</h2><p>Chaque action du site écrit dans ces cinq tables. Les noms de tables et de colonnes sont ceux du schéma de référence.</p><div class="tabs">${Object.keys(T).map(k=>`<button aria-pressed="${k==t}" onclick="dbv('${k}')">${k} (${T[k].length})</button>`).join("")}</div>
 <div class="tw">${r.length?`<table><tr>${Object.keys(r[0]).map(k=>`<th>${k}</th>`).join("")}</tr>${r.slice(-8).map(o=>`<tr>${Object.values(o).map(v=>`<td>${esc(v)}</td>`).join("")}</tr>`).join("")}</table>`:`<p class="em">Aucune ligne pour l’instant. Créez un compte ou passez une commande.</p>`}</div>`)}

function tick(){const n=new Date(),e=new Date(n);e.setHours(23,59,59,999);const s=Math.floor((e-n)/1e3);$("cd").textContent=[s/3600,s/60%60,s%60].map(v=>String(Math.floor(v)).padStart(2,"0")).join(":")}
function sellerDateLabel(value){const date=new Date(value);return Number.isNaN(date.getTime())?"date indisponible":date.toLocaleDateString("fr-FR")}
function showSellerTrialPayment(k,endDate){
 const plan=PLANS.find(x=>x[0]===k);
 paymentFlow={mode:"tmoney",active:false,verified:false,attempts:0};
 show(`<h2>Essai gratuit ${plan[1]}</h2>${demoPaymentBanner()}<p><strong>0 FCFA aujourd'hui.</strong> Premier paiement de <strong>${fmt(plan[2])}</strong> le <strong>${sellerDateLabel(endDate)}</strong>. Annulable avant cette date.</p><p>Aucun frais pendant les 30 jours d’essai. La date est calculée par Supabase.</p>
 <form id="seller-trial-payment" autocomplete="off" onsubmit="validerEssaiVendeur(event,'${k}')"><h3>Enregistrer un moyen de paiement</h3>
 <label class="opt"><input type="radio" name="paiement" value="tmoney" checked onchange="paymentModeChanged(this.value)">T-Money</label>
 <label class="opt"><input type="radio" name="paiement" value="flooz" onchange="paymentModeChanged(this.value)">Flooz</label>
 <label class="opt"><input type="radio" name="paiement" value="carte" onchange="paymentModeChanged(this.value)">Carte bancaire</label>
 <div id="payment-fields">${paymentFieldsHtml("tmoney")}</div><button class="pay" id="checkout-submit">Continuer</button></form>`)
}
async function validerEssaiVendeur(e,k){
 e.preventDefault();
 const mode=e.currentTarget.querySelector('input[name="paiement"]:checked').value;
 try{
  await processDemoPayment(mode,async(paymentMode)=>{
   const endDate=await TogoshopSupabase.chooseSellerPlan(k,paymentMode);
   await hydrateSupabaseState(false);dlg.close();go();toast("Essai gratuit jusqu’au "+sellerDateLabel(endDate))
  },false)
 }catch(error){toast(error.message||"Impossible d’enregistrer le moyen de paiement")}
}
function showSellerPayment(k){
 const plan=PLANS.find(x=>x[0]===k);
 paymentFlow={mode:"tmoney",active:false,verified:false,attempts:0};
 show(`<h2>Abonnement ${plan[1]}</h2>${demoPaymentBanner()}<p><strong>${fmt(plan[2])}/mois</strong>. Le paiement de démonstration active l’abonnement pour 30 jours; aucun prélèvement récurrent n’est effectué.</p>
 <form id="seller-payment" autocomplete="off" onsubmit="validerAbonnement(event,'${k}')"><h3>Mode de paiement</h3>
 <label class="opt"><input type="radio" name="paiement" value="tmoney" checked onchange="paymentModeChanged(this.value)">T-Money</label>
 <label class="opt"><input type="radio" name="paiement" value="flooz" onchange="paymentModeChanged(this.value)">Flooz</label>
 <label class="opt"><input type="radio" name="paiement" value="carte" onchange="paymentModeChanged(this.value)">Carte bancaire</label>
 <div id="payment-fields">${paymentFieldsHtml("tmoney")}</div><button class="pay" id="checkout-submit">Continuer</button></form>`)
}
async function validerAbonnement(e,k){
 e.preventDefault();
 const mode=e.currentTarget.querySelector('input[name="paiement"]:checked').value;
 try{
  await processDemoPayment(mode,async(paymentMode)=>{
   await TogoshopSupabase.activateSellerPlan(k,paymentMode);
   await hydrateSupabaseState(false);dlg.close();go();toast("Abonnement "+PLANS.find(x=>x[0]===k)[1]+" activé pour 30 jours")
  },false)
 }catch(error){toast(error.message||"Impossible d’activer l’abonnement")}
}
function confirmerAnnulationEssai(){
 const subscription=S.me&&S.abos[S.me.id_client];
 if(!subscription)return;
 show(`<h2>Annuler l’abonnement ?</h2><p>Aucun prélèvement ne sera prévu. Vous pourrez continuer à publier jusqu’au ${sellerDateLabel(subscription.date_fin)}; ensuite l’abonnement expirera.</p><button class="ad" onclick="dlg.close()">Garder mon abonnement</button><button class="pay" onclick="annulerEssaiVendeur()">Confirmer l’annulation</button>`)
}
async function annulerEssaiVendeur(){
 try{
  await TogoshopSupabase.cancelSellerTrial();
  await hydrateSupabaseState(false);dlg.close();go();toast("Abonnement annulé; accès maintenu jusqu’à la fin de l’essai")
 }catch(error){toast(error.message||"Impossible d’annuler l’abonnement")}
}
async function abonner(k){
 if(!S.me)return auth("in",()=>abonner(k));
 if(!window.TogoshopSupabase||!TogoshopSupabase.enabled){toast("Supabase est requis pour calculer l’essai côté serveur.");return}
 try{await hydrateSupabaseState(false)}
 catch(error){toast(error.message||"Impossible d’actualiser l’abonnement");return}
 const subscription=S.abos[S.me.id_client]||{};
 if(subscription.statut_abonnement==="essai"&&subscription.actif){
  if(subscription.plan===k){go();toast("Essai actif jusqu’au "+sellerDateLabel(subscription.date_fin));return}
  if(!subscription.mode_paiement){showSellerTrialPayment(k,subscription.date_fin);return}
  try{
   const endDate=await TogoshopSupabase.chooseSellerPlan(k,subscription.mode_paiement);
   await hydrateSupabaseState(false);go();toast("Plan modifié; essai gratuit jusqu’au "+sellerDateLabel(endDate))
  }catch(error){toast(error.message||"Impossible de changer de plan")}
  return
 }
 if(subscription.statut_abonnement==="actif"&&subscription.actif&&subscription.plan===k){go();toast("Abonnement actif jusqu’au "+sellerDateLabel(subscription.date_fin));return}
 if(!subscription.essai_vendeur_utilise){
 try{const endDate=await TogoshopSupabase.previewSellerTrial(k);showSellerTrialPayment(k,endDate)}
  catch(error){toast(error.message||"Impossible de vérifier l’essai gratuit")}
  return
 }
 showSellerPayment(k)
}
const clean=s=>String(s).replace(/[<>&"]/g,"").trim();
async function addProd(e){e.preventDefault();const f=Object.fromEntries(new FormData(e.target));
 if(window.TogoshopSupabase&&TogoshopSupabase.enabled){
  try{
   await TogoshopSupabase.publishProduct({nom:clean(f.nom),description:clean(f.desc),prix:+f.prix,stock:+f.stock,categorie:+f.cat});
   await initSupabaseCatalog();e.target.reset();vend();toast("Produit publié dans la boutique");
  }catch(error){
   try{await hydrateSupabaseState(false);vend()}
   catch(refreshError){toast(refreshError.message||"Impossible d’actualiser l’abonnement");return}
   toast(error.message||"Impossible de publier le produit")
  }
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
function vend(){
 const me=S.me,ab=me&&S.abos[me.id_client],pl=ab&&ab.plan&&PLANS.find(x=>x[0]==ab.plan);
 const remote=Boolean(window.TogoshopSupabase&&TogoshopSupabase.enabled);
 const active=Boolean(pl&&(!remote||(ab.actif&&["essai","actif","annulé"].includes(ab.statut_abonnement))));
 const paymentMethod=ab&&({carte:"Carte bancaire (coordonnées masquées)",tmoney:"T-Money (numéro masqué)",flooz:"Flooz (numéro masqué)"}[ab.mode_paiement]||"Aucun moyen enregistré");
 const firstPayment=ab&&ab.date_premier_paiement?sellerDateLabel(ab.date_premier_paiement):"non renseignée";
 const trialPayment=ab&&ab.date_premier_paiement?`Premier paiement prévu le ${sellerDateLabel(ab.date_premier_paiement)} (${pl?fmt(pl[2]):""}).`:"Aucun premier paiement n’est planifié sans moyen de paiement enregistré.";
 let h=`<div class="hd"><h2>Espace vendeur</h2><span>${me?"Gérez votre abonnement":"Connectez-vous pour vous abonner"}</span></div><div class="plans">`+
 PLANS.map(([k,n,pr,lim,pa,ft])=>{
  const on=active&&ab.plan===k;
  const label=!me?"Choisir ce plan":!remote?"Supabase requis":on&&ab.statut_abonnement==="annulé"?"Réactiver par paiement":on?"Votre abonnement":ab&&ab.essai_vendeur_utilise?"Payer pour continuer":"Démarrer l’essai gratuit";
  const action=on&&ab.statut_abonnement!=="annulé"?"Vérifier l’abonnement":label;
  return `<div class="plan ${on?"on":""}"><h3>${n}</h3><p class="pr">${fmt(pr)}<small> / mois après 30 jours offerts</small></p><p class="note"><strong>0 FCFA</strong> pendant les 30 premiers jours après l’inscription.</p><ul>${ft.map(x=>`<li>${x}</li>`).join("")}</ul><button class="${on?"ad":"btn"}" ${me&&!remote?"disabled":""} onclick="abonner('${k}')">${action}</button></div>`
 }).join("")+`</div>`;
 if(me&&!remote)h+=`<p class="note">Supabase est requis pour calculer l’essai côté serveur et enregistrer l’abonnement.</p>`;
 else if(pl&&ab.statut_abonnement==="essai")h+=`<p class="note">Statut : essai. ${trialPayment} Moyen enregistré : ${paymentMethod}. Aucun frais pendant l’essai.</p><button class="ad" onclick="confirmerAnnulationEssai()">Annuler mon abonnement</button>`;
 else if(pl&&ab.statut_abonnement==="annulé")h+=`<p class="note">Statut : annulé. Aucun prélèvement prévu; vous pouvez publier jusqu’au ${sellerDateLabel(ab.date_fin)}, puis l’abonnement expirera. Moyen enregistré : ${paymentMethod}. Premier paiement initialement prévu : ${firstPayment}.</p>`;
 else if(pl&&ab.statut_abonnement==="actif")h+=`<p class="note">Statut : actif jusqu’au ${sellerDateLabel(ab.date_fin)}. Date du premier paiement : ${firstPayment}. Moyen enregistré : ${paymentMethod}.</p>`;
 else if(pl&&ab.statut_abonnement==="expiré")h+=`<p class="note">Statut : expiré depuis le ${sellerDateLabel(ab.date_fin)}. Date du premier paiement : ${firstPayment}. Moyen enregistré : ${paymentMethod}. Payez en mode démonstration pour continuer.</p>`;
 else if(ab&&ab.essai_vendeur_utilise)h+=`<p class="note">L’essai gratuit a déjà été utilisé. Un paiement de démonstration est requis.</p>`;
 else if(me)h+=`<p class="note">Un essai gratuit de 30 jours est proposé une seule fois par compte.</p>`;

 if(pl){
  const mine=P.filter(p=>S.own[p.id]==me.id_client),rq=S.parts.filter(x=>x.id_client==me.id_client);
  h+=`<div class="dash"><h3>Publier un produit (${mine.length} sur ${pl[3]>1e6?"illimité":pl[3]})</h3>
  ${active?`<form class="gp" onsubmit="addProd(event)"><input class="f" name="nom" placeholder="Nom du produit" maxlength="150" required><select name="cat" aria-label="Catégorie">${CATS.map(([i,n])=>`<option value="${i}">${n}</option>`).join("")}</select>
  <input class="f" name="prix" type="number" min="100" placeholder="Prix en FCFA" required><input class="f" name="stock" type="number" min="1" placeholder="Quantité en stock" required>
  <input class="f" name="desc" placeholder="Description courte" maxlength="200" required style="grid-column:1/-1"><button class="btn" style="grid-column:1/-1;background:var(--ind);color:var(--indk)">Publier dans la boutique</button></form>`:`<p class="note">La publication est suspendue jusqu’à l’activation d’un abonnement.</p>`}
  <h3>Mes produits</h3>${mine.length?mine.map(p=>`<div class="opt"><span>${p.e}</span>${p.n}<b>${fmt(p.p)}</b><button class="ad" onclick="delProd(${p.id})">Retirer</button></div>`).join(""):`<p class="note">Aucun produit publié pour l’instant.</p>`}
  <h3>Partenariats</h3>${pl[4]&&active?`<form class="gp" onsubmit="partner(event)"><select name="type" aria-label="Type de partenariat"><option>Fournisseur</option><option>Distributeur</option><option>Livraison et transport</option><option>Financement</option><option>Publicité</option></select><input class="f" name="msg" placeholder="Décrivez votre projet" maxlength="200" required><button class="btn" style="grid-column:1/-1;background:var(--ind);color:var(--indk)">Envoyer la demande</button></form>${rq.map(x=>`<div class="opt">${x.type}<small>${x.message}</small><b>${x.statut}</b></div>`).join("")}`:`<p class="note">${pl[4]?"Les demandes de partenariat nécessitent un abonnement actif.":"Les demandes de partenariat sont réservées aux plans Pro et Entreprise."}</p>`}</div>`
 }
 $("sv").innerHTML=h
}
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
  S.abos[S.me.id_client]=seller.plan
   ? {...seller.plan,essai_vendeur_utilise:seller.trialUsed}
   : {essai_vendeur_utilise:seller.trialUsed};
  S.own=Object.fromEntries(seller.productIds.map(id=>[id,S.me.id_client]));
  S.parts=seller.partnerships.map(row=>({id_client:S.me.id_client,type:row.type,message:row.message,statut:row.statut}));
 }
 return profile;
}

setInterval(tick,1000);tick();view(location.hash=="#boutique"?"shop":"home");initSupabaseCatalog();
