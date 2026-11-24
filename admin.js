window.AdminBackOffice = (() => {
  const root = document.getElementById("admin-root");
  const escapeHtml = value => String(value == null ? "" : value).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;"
  }[char]));
  const money = value => Math.round(Number(value) || 0)
    .toLocaleString("fr-FR")
    .replace(/[\u202f\u00a0]/g, " ") + " FCFA";
  const date = value => {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? "Date inconnue" : parsed.toLocaleString("fr-FR");
  };
  const statusOptions = [
    "En attente",
    "Payée",
    "En préparation",
    "Expédiée",
    "Livrée",
    "Annulée",
    "Réservation à confirmer"
  ];
  let selectedOrderId = null;
  let statuses = [];
  let catalogProducts = [];
  let categories = [];
  let importPreview = [];
  let importRows = [];
  let promotions = [];

  function showError(message) {
    const error = document.getElementById("admin-error");
    if (error) error.textContent = message;
  }

  function render() {
    root.innerHTML = `
      <header class="admin-heading">
        <div><p class="admin-eyebrow">Togoshop · Back-office</p><h1>Administration</h1></div>
        <button class="ad" type="button" onclick="view('home')">Quitter l’administration</button>
      </header>
      <p class="admin-security-note">Données de commande et coordonnées clients réservées aux administrateurs.</p>
      <p class="admin-error" id="admin-error" role="status"></p>
      <section class="admin-panel">
        <div class="admin-panel-heading"><h2>Tableau de bord</h2>
          <label>Période
            <select id="admin-period" onchange="AdminBackOffice.loadDashboard()">
              <option value="7">7 derniers jours</option>
              <option value="30" selected>30 derniers jours</option>
              <option value="90">90 derniers jours</option>
              <option value="365">365 derniers jours</option>
            </select>
          </label>
        </div>
        <div id="admin-dashboard" class="admin-loading">Chargement des indicateurs…</div>
      </section>
      <section class="admin-panel">
        <div class="admin-panel-heading"><h2>Commandes</h2>
          <div class="admin-filters">
            <label>Statut
              <select id="admin-status-filter" onchange="AdminBackOffice.loadOrders()">
                <option value="">Tous les statuts</option>
              </select>
            </label>
            <label>Recherche
              <input id="admin-order-search" type="search" placeholder="N° de commande ou client"
                onkeydown="if(event.key==='Enter'){event.preventDefault();AdminBackOffice.loadOrders()}">
            </label>
            <button class="ad" type="button" onclick="AdminBackOffice.loadOrders()">Rechercher</button>
          </div>
        </div>
        <div class="admin-table-wrap" id="admin-orders">Chargement des commandes…</div>
        <div id="admin-order-detail"></div>
      </section>`;
    root.insertAdjacentHTML("beforeend", `
      <section class="admin-panel">
        <div class="admin-panel-heading">
          <h2>Catalogue</h2>
          <div class="admin-actions">
            <button class="ad" type="button" onclick="AdminBackOffice.exportProducts()">Exporter CSV</button>
            <label class="admin-file-label">Importer CSV
              <input type="file" accept=".csv,text/csv" onchange="AdminBackOffice.previewCsv(this)">
            </label>
          </div>
        </div>
        <p class="admin-muted">Colonnes CSV requises : nom_produit, description, prix, stock, id_categorie. id_produit (pour modifier un produit existant) et image sont facultatives. Maximum 500 lignes par import.</p>
        <p id="admin-import-message" class="admin-muted" role="status"></p>
        <div id="admin-import-preview"></div>
        <form id="admin-product-form" class="admin-product-form" onsubmit="return AdminBackOffice.saveProduct(event)">
          <h3 id="admin-product-form-title">Ajouter un produit</h3>
          <input type="hidden" name="id">
          <label>Nom<input name="nom" required maxlength="250"></label>
          <label>Description<textarea name="description" rows="3"></textarea></label>
          <label>Prix (FCFA)<input name="prix" type="number" min="0.01" step="0.01" required></label>
          <label>Stock<input name="stock" type="number" min="0" step="1" required></label>
          <label>Catégorie<select name="categorie" required></select></label>
          <label>Image (URL ou chemin)<input name="image" type="text"></label>
          <div class="admin-actions">
            <button class="admin-primary" type="submit">Enregistrer le produit</button>
            <button class="ad" type="button" onclick="AdminBackOffice.resetProductForm()">Nouveau / annuler</button>
          </div>
        </form>
        <div id="admin-catalog" class="admin-table-wrap admin-loading">Chargement du catalogue…</div>
      </section>
      <section class="admin-panel">
        <div class="admin-panel-heading">
          <h2>Clients (CRM)</h2>
          <button class="ad" type="button" onclick="AdminBackOffice.exportCustomers()">Exporter les clients en CSV</button>
        </div>
        <p class="admin-personal-data" role="note">Les noms, e-mails et téléphones sont des données personnelles réservées à l’administrateur. Protégez tout export.</p>
        <div id="admin-customers" class="admin-table-wrap admin-loading">Chargement des clients…</div>
      </section>
      <section class="admin-panel">
        <div class="admin-panel-heading"><h2>Promotions</h2></div>
        <p class="admin-muted">Les limites sont globales. Un code déjà utilisé ne peut pas être supprimé, mais peut être désactivé. TOGO10 est réservé à la compatibilité avec l’ancienne fonction de commande.</p>
        <form id="admin-promo-form" class="admin-product-form" onsubmit="return AdminBackOffice.savePromo(event)">
          <h3 id="admin-promo-form-title">Créer un code promotionnel</h3>
          <input type="hidden" name="id">
          <label>Code<input name="code" required minlength="3" maxlength="30" pattern="[A-Za-z0-9_-]+" autocomplete="off"></label>
          <label>Type de remise<select name="type">
            <option value="pourcentage">Pourcentage</option>
            <option value="montant_fixe">Montant fixe (FCFA)</option>
          </select></label>
          <label>Valeur<input name="value" type="number" min="0.01" step="0.01" required></label>
          <label>Valide à partir du<input name="start" type="datetime-local" step="0.001" required></label>
          <label>Valide jusqu’au (facultatif)<input name="end" type="datetime-local" step="0.001"></label>
          <label>Limite globale (facultative)<input name="limit" type="number" min="1" step="1" placeholder="Sans limite"></label>
          <label class="admin-checkbox-label"><input name="active" type="checkbox" checked> Code actif</label>
          <div class="admin-actions">
            <button class="admin-primary" type="submit">Enregistrer le code</button>
            <button class="ad" type="button" onclick="AdminBackOffice.resetPromoForm()">Nouveau / annuler</button>
          </div>
        </form>
        <div id="admin-promotions" class="admin-table-wrap admin-loading">Chargement des promotions…</div>
      </section>`);
    resetPromoForm();
    Promise.all([loadDashboard(), loadOrders(), loadCatalog(), loadCustomers(), loadPromos()]).catch(error => {
      showError(error.message || "Impossible de charger le back-office.");
    });
  }

  async function loadDashboard() {
    const target = document.getElementById("admin-dashboard");
    if (!target) return;
    target.textContent = "Chargement des indicateurs…";
    try {
      const days = Number(document.getElementById("admin-period").value);
      const data = await window.TogoshopSupabase.adminDashboard(days);
      target.innerHTML = `
        <div class="admin-metrics">
          <article><span>Chiffre d’affaires</span><strong>${money(data.chiffre_affaires)}</strong></article>
          <article><span>Commandes sur la période</span><strong>${Number(data.nombre_commandes) || 0}</strong></article>
          <article><span>Commandes hors annulations</span><strong>${Number(data.commandes_non_annulees) || 0}</strong></article>
          <article><span>Panier moyen hors annulations</span><strong>${money(data.panier_moyen)}</strong></article>
        </div>
        <div class="admin-tables">
          ${table("Commandes par statut", ["Statut", "Nombre"],
            (data.commandes_par_statut || []).map(row => [row.statut, row.nombre]))}
          ${table("5 meilleures ventes", ["Produit", "Quantité", "Chiffre d’affaires"],
            (data.meilleures_ventes || []).map(row => [row.nom_produit, row.quantite, money(row.chiffre_affaires)]))}
          ${table("Produits en rupture", ["Produit", "Stock"],
            (data.ruptures || []).map(row => [row.nom_produit, row.stock]))}
          ${table("Stock faible (< 5)", ["Produit", "Stock"],
            (data.stock_faible || []).map(row => [row.nom_produit, row.stock]))}
        </div>`;
    } catch (error) {
      target.textContent = "Erreur de chargement des indicateurs.";
      showError(error.message || "Impossible de charger le tableau de bord.");
    }
  }

  function table(title, headings, rows) {
    return `<section class="admin-subpanel"><h3>${escapeHtml(title)}</h3>
      ${rows.length ? `<div class="admin-table-wrap"><table><thead><tr>${headings.map(item => `<th>${escapeHtml(item)}</th>`).join("")}</tr></thead>
      <tbody>${rows.map(row => `<tr>${row.map(cell => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`
      : `<p class="admin-muted">Aucune donnée pour cette période.</p>`}
    </section>`;
  }

  async function loadOrders() {
    const target = document.getElementById("admin-orders");
    if (!target) return;
    target.textContent = "Chargement des commandes…";
    try {
      const status = document.getElementById("admin-status-filter").value;
      const search = document.getElementById("admin-order-search").value.trim();
      const result = await window.TogoshopSupabase.adminListOrders(status, search);
      statuses = result.statuses || [];
      const filter = document.getElementById("admin-status-filter");
      const previousFilter = filter.value;
      filter.innerHTML = `<option value="">Tous les statuts</option>` +
        [...new Set([...statusOptions, ...statuses])].map(item =>
          `<option value="${escapeHtml(item)}">${escapeHtml(item)}</option>`
        ).join("");
      filter.value = statuses.includes(previousFilter) || statusOptions.includes(previousFilter) ? previousFilter : "";
      const orders = result.orders || [];
      target.innerHTML = orders.length ? `<table><thead><tr>
        <th>N°</th><th>Date</th><th>Client</th><th>Total</th><th>Paiement</th><th>Statut</th><th>Détail</th>
        </tr></thead><tbody>${orders.map(order => `<tr>
          <td>${escapeHtml(order.id_commande)}</td><td>${escapeHtml(date(order.date_commande))}</td>
          <td>${escapeHtml(order.client)}<small>${escapeHtml(order.email)}</small></td>
          <td>${money(order.total)}</td><td>${escapeHtml(order.mode_paiement || "Non renseigné")}</td>
          <td>${escapeHtml(order.statut)}</td>
          <td><button class="ad" type="button" onclick="AdminBackOffice.selectOrder('${escapeHtml(order.id_commande)}')">Ouvrir</button></td>
        </tr>`).join("")}</tbody></table>` : `<p class="admin-muted">Aucune commande ne correspond aux filtres.</p>`;
    } catch (error) {
      target.textContent = "Erreur de chargement des commandes.";
      showError(error.message || "Impossible de charger les commandes.");
    }
  }

  async function selectOrder(id) {
    selectedOrderId = id;
    const target = document.getElementById("admin-order-detail");
    target.textContent = "Chargement du détail…";
    try {
      const order = await window.TogoshopSupabase.adminGetOrder(id);
      const address = order.adresse || {};
      const payment = order.paiement || {};
      const options = [...new Set([...statusOptions, ...statuses, order.statut])];
      target.innerHTML = `<section class="admin-subpanel admin-order-detail">
        <div class="admin-panel-heading"><h3>Commande n° ${escapeHtml(order.id_commande)}</h3>
          <button class="ad" type="button" onclick="AdminBackOffice.printDelivery('${escapeHtml(order.id_commande)}')">Imprimer le bon de livraison</button>
        </div>
        <p><strong>Date :</strong> ${escapeHtml(date(order.date_commande))}</p>
        <p><strong>Client :</strong> ${escapeHtml(order.client.nom)} · ${escapeHtml(order.client.email)} · ${escapeHtml(order.client.telephone)}</p>
        <p><strong>Adresse :</strong> ${escapeHtml(address.adresse)}${address.ville ? ", " + escapeHtml(address.ville) : ""}</p>
        <p><strong>Livraison :</strong> ${escapeHtml(address.mode_livraison)} · ${money(address.frais_livraison || 0)}</p>
        <p><strong>Paiement :</strong> ${escapeHtml(payment.fournisseur || "Non renseigné")} · ${escapeHtml(payment.statut || "Non renseigné")}</p>
        ${table("Lignes de commande", ["Produit", "Quantité", "Prix unitaire", "Total"],
          (order.lignes || []).map(line => [line.nom_produit, line.quantite, money(line.prix_unitaire), money(line.total)]))}
        <p class="admin-total"><strong>Total commande</strong><strong>${money(order.total)}</strong></p>
        <form class="admin-status-form" onsubmit="return AdminBackOffice.updateStatus(event)">
          <label>Nouveau statut<select name="status">${options.map(item =>
            `<option value="${escapeHtml(item)}" ${item === order.statut ? "selected" : ""}>${escapeHtml(item)}</option>`
          ).join("")}</select></label>
          <button class="admin-primary" type="submit">Enregistrer le statut</button>
        </form>
      </section>`;
    } catch (error) {
      target.textContent = "Erreur de chargement du détail de la commande.";
      showError(error.message || "Impossible de charger cette commande.");
    }
  }

  async function updateStatus(event) {
    event.preventDefault();
    const status = event.currentTarget.elements.status.value;
    try {
      await window.TogoshopSupabase.adminUpdateOrderStatus(selectedOrderId, status);
      await Promise.all([loadOrders(), loadDashboard()]);
      await selectOrder(selectedOrderId);
      showError("Statut mis à jour.");
    } catch (error) {
      showError(error.message || "Impossible de modifier le statut.");
    }
    return false;
  }

  async function printDelivery(id) {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      showError("Autorisez les fenêtres contextuelles pour imprimer le bon de livraison.");
      return;
    }
    printWindow.opener = null;
    try {
      const order = await window.TogoshopSupabase.adminGetOrder(id);
      const address = order.adresse || {};
      const rows = (order.lignes || []).map(line => `<tr>
        <td>${escapeHtml(line.nom_produit)}</td><td>${escapeHtml(line.quantite)}</td>
      </tr>`).join("");
      const documentHtml = `<!doctype html><html lang="fr"><head><meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Bon de livraison n° ${escapeHtml(order.id_commande)}</title>
        <style>
          @page{size:A4;margin:18mm}*{box-sizing:border-box}
          body{font:14px Arial,sans-serif;color:#20242a;margin:0}
          main{max-width:760px;margin:24px auto;padding:32px;border:1px solid #dfe3e8}
          header{display:flex;justify-content:space-between;border-bottom:2px solid #0f7f74;padding-bottom:18px}
          h1{font-size:24px;color:#0f7f74;margin:0}h2{font-size:16px;margin:24px 0 8px}
          .warning{margin:22px 0;padding:12px;border:1px solid #e6bb55;background:#fff8df;text-align:center;font-weight:700}
          table{width:100%;border-collapse:collapse;margin:18px 0}
          th,td{text-align:left;padding:10px 8px;border-bottom:1px solid #dfe3e8}
          @media print{main{max-width:none;margin:0;padding:0;border:0}tr{break-inside:avoid}}
        </style></head><body><main>
          <header><div><h1>Togoshop</h1><p>Bon de livraison</p></div>
            <div><strong>Commande n° ${escapeHtml(order.id_commande)}</strong><br>${escapeHtml(date(order.date_commande))}</div>
          </header>
          <p class="warning">Document de démonstration</p>
          <h2>Destinataire</h2><p>${escapeHtml(order.client.nom)}<br>
            ${escapeHtml(address.adresse)}${address.ville ? ", " + escapeHtml(address.ville) : ""}<br>
            ${escapeHtml(order.client.telephone)}</p>
          <h2>Articles à livrer</h2><table><thead><tr><th>Produit</th><th>Quantité</th></tr></thead><tbody>${rows}</tbody></table>
          <p><strong>Mode de livraison :</strong> ${escapeHtml(address.mode_livraison)}</p>
        </main></body></html>`;
      printWindow.document.open();
      printWindow.document.write(documentHtml);
      printWindow.document.close();
    } catch (error) {
      printWindow.close();
      showError(error.message || "Impossible de préparer le bon de livraison.");
    }
  }

  async function loadCatalog() {
    const target = document.getElementById("admin-catalog");
    if (!target) return;
    target.textContent = "Chargement du catalogue…";
    try {
      const results = await Promise.all([
        window.TogoshopSupabase.getProducts(),
        window.TogoshopSupabase.getCategories()
      ]);
      catalogProducts = results[0] || [];
      categories = results[1] || [];
      const categorySelect = document.querySelector("#admin-product-form select[name='categorie']");
      categorySelect.innerHTML = categories.map(category =>
        `<option value="${escapeHtml(category.id_categorie)}">${escapeHtml(category.nom_categorie)}</option>`
      ).join("");
      target.innerHTML = catalogProducts.length ? `<table><thead><tr>
        <th>ID</th><th>Produit</th><th>Catégorie</th><th>Prix</th><th>Stock</th><th>Actions</th>
        </tr></thead><tbody>${catalogProducts.map(product => {
          const category = categories.find(item => String(item.id_categorie) === String(product.id_categorie));
          return `<tr>
            <td>${escapeHtml(product.id_produit)}</td>
            <td>${escapeHtml(product.nom_produit)}</td>
            <td>${escapeHtml(category ? category.nom_categorie : product.id_categorie)}</td>
            <td>${money(product.prix)}</td><td>${escapeHtml(product.stock)}</td>
            <td><div class="admin-actions">
              <button class="ad" type="button" onclick="AdminBackOffice.editProduct('${escapeHtml(product.id_produit)}')">Modifier</button>
              <button class="ad admin-danger" type="button" onclick="AdminBackOffice.deleteProduct('${escapeHtml(product.id_produit)}')">Retirer</button>
            </div></td>
          </tr>`;
        }).join("")}</tbody></table>` : `<p class="admin-muted">Aucun produit.</p>`;
      const form = document.getElementById("admin-product-form");
      form.querySelector("button[type='submit']").disabled = categories.length === 0;
      if (!categories.length) showError("Aucune catégorie disponible : impossible de créer ou modifier un produit.");
    } catch (error) {
      target.textContent = "Erreur de chargement du catalogue.";
      showError(error.message || "Impossible de charger le catalogue.");
    }
  }

  async function loadCustomers() {
    const target = document.getElementById("admin-customers");
    if (!target) return;
    target.textContent = "Chargement des clients…";
    try {
      const customers = await window.TogoshopSupabase.adminListCustomers();
      target.innerHTML = customers.length ? `<table><thead><tr>
        <th>Client</th><th>E-mail</th><th>Téléphone</th><th>Commandes</th><th>Total dépensé (hors annulations)</th>
        </tr></thead><tbody>${customers.map(customer => `<tr>
          <td>${escapeHtml(customer.nom || "—")}</td><td>${escapeHtml(customer.email || "—")}</td>
          <td>${escapeHtml(customer.telephone || "—")}</td>
          <td>${Number(customer.nombre_commandes) || 0}</td><td>${money(customer.total_depense)}</td>
        </tr>`).join("")}</tbody></table>` : `<p class="admin-muted">Aucun client.</p>`;
    } catch (error) {
      target.textContent = "Erreur de chargement des clients.";
      showError(error.message || "Impossible de charger la liste des clients.");
    }
  }

  async function loadPromos() {
    const target = document.getElementById("admin-promotions");
    if (!target) return;
    target.textContent = "Chargement des promotions…";
    try {
      promotions = await window.TogoshopSupabase.adminListPromos();
      target.innerHTML = promotions.length ? `<table><thead><tr>
        <th>Code</th><th>Remise</th><th>Validité</th><th>Utilisations</th><th>État</th><th>Actions</th>
        </tr></thead><tbody>${promotions.map(promo => {
          const discount = promo.type_remise === "pourcentage"
            ? `${escapeHtml(promo.valeur)} %`
            : money(promo.valeur);
          const limit = promo.limite_utilisation == null ? "sans limite" : promo.limite_utilisation;
          const actions = promo.code === "TOGO10"
            ? `<span class="admin-muted">Code historique protégé</span>`
            : `<div class="admin-actions">
                <button class="ad" type="button" onclick="AdminBackOffice.editPromo('${escapeHtml(promo.id_promotion)}')">Modifier</button>
                <button class="ad admin-danger" type="button" onclick="AdminBackOffice.deletePromo('${escapeHtml(promo.id_promotion)}')">Supprimer</button>
              </div>`;
          return `<tr>
            <td><strong>${escapeHtml(promo.code)}</strong></td>
            <td>${discount}</td>
            <td>${escapeHtml(date(promo.date_debut))} – ${promo.date_fin ? escapeHtml(date(promo.date_fin)) : "sans fin"}</td>
            <td>${Number(promo.nombre_utilisations) || 0} / ${escapeHtml(limit)}</td>
            <td>${promo.actif ? "Actif" : "Inactif"}</td>
            <td>${actions}</td>
          </tr>`;
        }).join("")}</tbody></table>` : `<p class="admin-muted">Aucun code promotionnel.</p>`;
    } catch (error) {
      target.textContent = "Erreur de chargement des promotions.";
      showError(error.message || "Impossible de charger les promotions.");
    }
  }

  function toLocalDateTime(value) {
    if (!value) return "";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "";
    return new Date(parsed.getTime() - parsed.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 23);
  }

  function resetPromoForm() {
    const form = document.getElementById("admin-promo-form");
    if (!form) return;
    form.reset();
    form.elements.id.value = "";
    form.elements.start.value = toLocalDateTime(new Date());
    form.elements.active.checked = true;
    document.getElementById("admin-promo-form-title").textContent = "Créer un code promotionnel";
  }

  function editPromo(id) {
    const promo = promotions.find(item => String(item.id_promotion) === String(id));
    if (!promo) {
      showError("Code promotionnel introuvable.");
      return;
    }
    const form = document.getElementById("admin-promo-form");
    form.elements.id.value = promo.id_promotion;
    form.elements.code.value = promo.code;
    form.elements.type.value = promo.type_remise;
    form.elements.value.value = promo.valeur;
    form.elements.start.value = toLocalDateTime(promo.date_debut);
    form.elements.end.value = toLocalDateTime(promo.date_fin);
    form.elements.limit.value = promo.limite_utilisation == null ? "" : promo.limite_utilisation;
    form.elements.active.checked = promo.actif;
    document.getElementById("admin-promo-form-title").textContent = `Modifier le code ${promo.code}`;
    form.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  async function savePromo(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const code = form.elements.code.value.trim().toUpperCase();
    const value = Number(form.elements.value.value);
    const start = new Date(form.elements.start.value);
    const endValue = form.elements.end.value;
    const end = endValue ? new Date(endValue) : null;
    const limitText = form.elements.limit.value.trim();
    const limit = limitText ? Number(limitText) : null;
    if (!/^[A-Z0-9_-]{3,30}$/.test(code) || !Number.isFinite(value) || value <= 0 ||
        Number.isNaN(start.getTime()) || (end && (Number.isNaN(end.getTime()) || end <= start)) ||
        (limit !== null && (!Number.isInteger(limit) || limit < 1)) ||
        (form.elements.type.value === "pourcentage" && value > 100)) {
      showError("Vérifiez le code, la remise, la période et la limite d’utilisations.");
      return false;
    }
    try {
      await window.TogoshopSupabase.adminUpsertPromo({
        id: form.elements.id.value ? Number(form.elements.id.value) : null,
        code,
        type: form.elements.type.value,
        value,
        start: start.toISOString(),
        end: end ? end.toISOString() : null,
        limit,
        active: form.elements.active.checked
      });
      resetPromoForm();
      await loadPromos();
      showError("Code promotionnel enregistré.");
    } catch (error) {
      showError(error.message || "Impossible d’enregistrer le code promotionnel.");
    }
    return false;
  }

  async function deletePromo(id) {
    if (!window.confirm("Supprimer ce code promotionnel ? Les codes déjà utilisés doivent être désactivés.")) return;
    try {
      await window.TogoshopSupabase.adminDeletePromo(Number(id));
      await loadPromos();
      showError("Code promotionnel supprimé.");
    } catch (error) {
      showError(error.message || "Impossible de supprimer ce code.");
    }
  }

  function resetProductForm() {
    const form = document.getElementById("admin-product-form");
    if (!form) return;
    form.reset();
    form.elements.id.value = "";
    document.getElementById("admin-product-form-title").textContent = "Ajouter un produit";
  }

  function editProduct(id) {
    const product = catalogProducts.find(item => String(item.id_produit) === String(id));
    if (!product) {
      showError("Produit introuvable dans le catalogue chargé.");
      return;
    }
    const form = document.getElementById("admin-product-form");
    form.elements.id.value = product.id_produit;
    form.elements.nom.value = product.nom_produit || "";
    form.elements.description.value = product.description || "";
    form.elements.prix.value = product.prix;
    form.elements.stock.value = product.stock;
    form.elements.categorie.value = product.id_categorie;
    form.elements.image.value = product.image || "";
    document.getElementById("admin-product-form-title").textContent = `Modifier le produit n° ${product.id_produit}`;
    form.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  async function saveProduct(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const product = {
      id: form.elements.id.value ? Number(form.elements.id.value) : null,
      nom: form.elements.nom.value.trim(),
      description: form.elements.description.value.trim(),
      prix: Number(form.elements.prix.value),
      stock: Number(form.elements.stock.value),
      categorie: Number(form.elements.categorie.value),
      image: form.elements.image.value.trim() || null
    };
    if (!product.nom || !Number.isFinite(product.prix) || product.prix <= 0 ||
        !Number.isInteger(product.stock) || product.stock < 0 ||
        !categories.some(category => Number(category.id_categorie) === product.categorie)) {
      showError("Vérifiez le nom, le prix supérieur à 0, le stock et la catégorie.");
      return false;
    }
    try {
      await window.TogoshopSupabase.adminUpsertProduct(product);
      resetProductForm();
      await loadCatalog();
      showError("Produit enregistré.");
    } catch (error) {
      showError(error.message || "Impossible d’enregistrer le produit.");
    }
    return false;
  }

  async function deleteProduct(id) {
    if (!window.confirm("Retirer ce produit du catalogue ? Cette action est irréversible.")) return;
    try {
      await window.TogoshopSupabase.adminDeleteProduct(Number(id));
      await loadCatalog();
      showError("Produit retiré du catalogue.");
    } catch (error) {
      showError(error.message || "Impossible de retirer le produit.");
    }
  }

  function parseCsv(text) {
    const rows = [];
    let row = [];
    let field = "";
    let quoted = false;
    const source = text.replace(/^\uFEFF/, "");
    for (let index = 0; index < source.length; index += 1) {
      const char = source[index];
      if (quoted) {
        if (char === '"' && source[index + 1] === '"') {
          field += '"';
          index += 1;
        } else if (char === '"') {
          quoted = false;
        } else {
          field += char;
        }
      } else if (char === '"' && field === "") {
        quoted = true;
      } else if (char === ",") {
        row.push(field);
        field = "";
      } else if (char === "\n" || char === "\r") {
        if (char === "\r" && source[index + 1] === "\n") index += 1;
        row.push(field);
        if (row.some(cell => cell.trim() !== "")) rows.push(row);
        row = [];
        field = "";
      } else {
        field += char;
      }
    }
    if (quoted) throw new Error("Le CSV contient un champ entre guillemets non terminé.");
    row.push(field);
    if (row.some(cell => cell.trim() !== "")) rows.push(row);
    return rows;
  }

  async function previewCsv(input) {
    const preview = document.getElementById("admin-import-preview");
    const message = document.getElementById("admin-import-message");
    importPreview = [];
    importRows = [];
    preview.innerHTML = "";
    message.textContent = "";
    const file = input.files && input.files[0];
    if (!file) return;
    try {
      const rows = parseCsv(await file.text());
      if (rows.length < 2) throw new Error("Le CSV doit contenir un en-tête et au moins une ligne.");
      const headers = rows[0].map(header => header.trim().toLowerCase());
      const required = ["nom_produit", "description", "prix", "stock", "id_categorie"];
      const positions = Object.fromEntries(headers.map((header, index) => [header, index]));
      const missing = required.filter(header => !Object.prototype.hasOwnProperty.call(positions, header));
      if (missing.length) throw new Error(`Colonnes manquantes : ${missing.join(", ")}.`);
      if (rows.length - 1 > 500) throw new Error("Un import ne peut pas dépasser 500 lignes.");

      const existingIds = new Set(catalogProducts.map(product => String(product.id_produit)));
      const existingCategories = new Set(categories.map(category => String(category.id_categorie)));
      importPreview = rows.slice(1).map((cells, index) => {
        const value = key => (cells[positions[key]] || "").trim();
        const errors = [];
        const name = value("nom_produit");
        const priceText = value("prix");
        const stockText = value("stock");
        const price = Number(priceText);
        const stock = Number(stockText);
        const categoryId = value("id_categorie");
        const idText = value("id_produit");
        if (!name) errors.push("nom obligatoire");
        if (!/^\d+(?:\.\d{1,2})?$/.test(priceText) || !Number.isFinite(price) || price <= 0 || price > 9999999999.99) errors.push("prix invalide");
        if (!/^\d+$/.test(stockText) || !Number.isInteger(stock) || stock < 0 || stock > 2147483647) errors.push("stock invalide");
        if (!/^\d{1,18}$/.test(categoryId) || !existingCategories.has(String(Number(categoryId)))) errors.push("catégorie inexistante");
        if (idText && (!/^\d+$/.test(idText) || !existingIds.has(idText))) errors.push("id_produit inconnu");
        const product = {
          nom_produit: name,
          description: value("description"),
          prix: price,
          stock,
          id_categorie: Number(categoryId),
          image: Object.prototype.hasOwnProperty.call(positions, "image") ? value("image") || null : null
        };
        if (idText && /^\d+$/.test(idText)) product.id_produit = Number(idText);
        return { line: index + 2, product, errors };
      });
      importRows = importPreview.filter(item => item.errors.length === 0).map(item => item.product);
      renderImportPreview();
    } catch (error) {
      message.textContent = error.message || "Impossible de lire ce fichier CSV.";
    }
  }

  function renderImportPreview() {
    const preview = document.getElementById("admin-import-preview");
    const validCount = importRows.length;
    const errorCount = importPreview.length - validCount;
    const message = document.getElementById("admin-import-message");
    message.textContent = `${validCount} ligne(s) valide(s), ${errorCount} erreur(s). Aucun import possible tant que toutes les lignes ne sont pas valides.`;
    preview.innerHTML = `<div class="admin-table-wrap"><table><thead><tr>
      <th>Ligne</th><th>Produit</th><th>Prix</th><th>Stock</th><th>Catégorie</th><th>Résultat</th>
      </tr></thead><tbody>${importPreview.map(item => `<tr>
        <td>${item.line}</td><td>${escapeHtml(item.product.nom_produit)}</td>
        <td>${escapeHtml(item.product.prix)}</td><td>${escapeHtml(item.product.stock)}</td>
        <td>${escapeHtml(item.product.id_categorie)}</td>
        <td class="${item.errors.length ? "admin-danger-text" : ""}">${escapeHtml(item.errors.join(", ") || "Prête")}</td>
      </tr>`).join("")}</tbody></table></div>
      <button class="admin-primary" type="button" onclick="AdminBackOffice.importCsv()" ${errorCount || !validCount ? "disabled" : ""}>Importer ${validCount} produit(s)</button>`;
  }

  async function importCsv() {
    if (!importRows.length || importPreview.some(item => item.errors.length)) return;
    const message = document.getElementById("admin-import-message");
    try {
      const result = await window.TogoshopSupabase.adminImportProducts(importRows);
      message.textContent = `Import terminé : ${result.inserted} produit(s) créé(s), ${result.updated} modifié(s).`;
      importRows = [];
      importPreview = [];
      document.getElementById("admin-import-preview").innerHTML = "";
      await loadCatalog();
    } catch (error) {
      message.textContent = error.message || "Impossible d’importer les produits.";
    }
  }

  function csvCell(value) {
    let text = String(value == null ? "" : value);
    if (/^[\t\r ]*[=+\-@]/.test(text)) text = "'" + text;
    return `"${text.replace(/"/g, '""')}"`;
  }

  function downloadCsv(filename, headers, rows) {
    const content = "\uFEFF" + [headers, ...rows]
      .map(row => row.map(csvCell).join(","))
      .join("\r\n");
    const url = URL.createObjectURL(new Blob([content], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  function exportProducts() {
    const categoryName = id => {
      const category = categories.find(item => String(item.id_categorie) === String(id));
      return category ? category.nom_categorie : "";
    };
    downloadCsv("togoshop-catalogue.csv",
      ["id_produit", "nom_produit", "description", "prix", "stock", "id_categorie", "categorie", "image"],
      catalogProducts.map(product => [
        product.id_produit,
        product.nom_produit,
        product.description,
        product.prix,
        product.stock,
        product.id_categorie,
        categoryName(product.id_categorie),
        product.image
      ]));
  }

  function exportCustomers() {
    window.alert("Cet export contient des données personnelles réservées à l’administrateur. Protégez le fichier et ne le partagez pas.");
    window.TogoshopSupabase.adminListCustomers().then(customers => {
      downloadCsv("togoshop-clients.csv",
        ["nom", "email", "telephone"],
        customers.map(customer => [customer.nom, customer.email, customer.telephone]));
    }).catch(error => showError(error.message || "Impossible d’exporter les clients."));
  }

  return {
    render,
    loadDashboard,
    loadOrders,
    selectOrder,
    updateStatus,
    printDelivery,
    loadCatalog,
    loadCustomers,
    loadPromos,
    resetProductForm,
    editProduct,
    saveProduct,
    deleteProduct,
    previewCsv,
    importCsv,
    exportProducts,
    exportCustomers,
    resetPromoForm,
    editPromo,
    savePromo,
    deletePromo
  };
})();
