window.TogoshopSupabase = (() => {
  const config = window.SUPABASE_CONFIG || window.SUPABASE_LOCAL_CONFIG || null;
  let client = null;

  if (
    config &&
    window.supabase &&
    config.url &&
    config.anonKey &&
    !config.anonKey.includes("REMPLACER")
  ) {
    client = window.supabase.createClient(config.url, config.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    });
  }

  async function getCategories() {
    if (!client) return null;
    const { data, error } = await client
      .from("categorie")
      .select("id_categorie, nom_categorie")
      .order("id_categorie");
    if (error) throw error;
    return data;
  }

  async function getProducts() {
    if (!client) return null;
    const { data, error } = await client
      .from("produit")
      .select("id_produit, nom_produit, description, prix, stock, image, id_categorie")
      .order("id_produit");
    if (error) throw error;
    return data;
  }

  async function signUp(profile, password) {
    if (!client) throw new Error("Supabase local n'est pas configure");
    const { data, error } = await client.auth.signUp({
      email: profile.email,
      password,
      options: {
        data: {
          nom: profile.nom,
          prenom: profile.prenom,
          telephone: profile.telephone
        }
      }
    });
    if (error) throw error;
    return data;
  }

  async function signIn(email, password) {
    if (!client) throw new Error("Supabase local n'est pas configure");
    const { data, error } = await client.auth.signInWithPassword({
      email,
      password
    });
    if (error) throw error;
    return data;
  }

  async function signOut() {
    if (!client) return;
    const { error } = await client.auth.signOut();
    if (error) throw error;
  }

  async function getSession() {
    if (!client) return null;
    const { data, error } = await client.auth.getSession();
    if (error) throw error;
    return data.session;
  }

  async function getProfile() {
    if (!client) return null;
    const session = await getSession();
    if (!session) return null;
    const { data, error } = await client
      .from("client")
      .select("id_client, user_id, nom, prenom, email, telephone")
      .eq("user_id", session.user.id)
      .single();
    if (error) throw error;
    return data;
  }

  async function getCart() {
    if (!client) return null;
    const profile = await getProfile();
    if (!profile) return [];
    const { data, error } = await client
      .from("panier_ligne")
      .select("id_produit, quantite")
      .eq("id_client", profile.id_client);
    if (error) throw error;
    return data || [];
  }

  async function getFavorites() {
    if (!client) return null;
    const profile = await getProfile();
    if (!profile) return [];
    const { data, error } = await client
      .from("favori")
      .select("id_produit")
      .eq("id_client", profile.id_client);
    if (error) throw error;
    return (data || []).map(row => row.id_produit);
  }

  async function setCart(idProduit, quantite) {
    if (!client) throw new Error("Supabase local n'est pas configure");
    const profile = await getProfile();
    if (!profile) throw new Error("Authentification requise");

    if (quantite <= 0) {
      const { error } = await client
        .from("panier_ligne")
        .delete()
        .eq("id_client", profile.id_client)
        .eq("id_produit", idProduit);
      if (error) throw error;
      return;
    }

    const { error } = await client
      .from("panier_ligne")
      .upsert({
        id_client: profile.id_client,
        id_produit: idProduit,
        quantite
      }, {
        onConflict: "id_client,id_produit"
      });
    if (error) throw error;
  }

  async function setFavorite(idProduit, active) {
    if (!client) throw new Error("Supabase local n'est pas configure");
    const profile = await getProfile();
    if (!profile) throw new Error("Authentification requise");
    const query = client.from("favori");
    const result = active
      ? await query.upsert({
          id_client: profile.id_client,
          id_produit: idProduit
        }, { onConflict: "id_client,id_produit" })
      : await query.delete()
          .eq("id_client", profile.id_client)
          .eq("id_produit", idProduit);
    if (result.error) throw result.error;
  }

  async function placeOrder(adresse, ville, modeLivraison, paymentMode, promoCode) {
    if (!client) throw new Error("Supabase local n'est pas configure");
    const { data, error } = await client.rpc("place_order_with_promo", {
      p_adresse: adresse,
      p_ville: ville,
      p_mode_livraison: modeLivraison,
      p_paiement: paymentMode,
      p_code: promoCode || null
    });
    if (error) throw error;
    return data;
  }

  async function previewPromo(code) {
    if (!client) throw new Error("Supabase local n'est pas configure");
    const { data, error } = await client.rpc("preview_promo", { p_code: code });
    if (error) throw error;
    return data;
  }

  async function isAdmin() {
    if (!client) throw new Error("Supabase local n'est pas configure");
    const { data, error } = await client.rpc("is_admin");
    if (error) throw error;
    return data === true;
  }

  async function adminDashboard(days) {
    if (!client) throw new Error("Supabase local n'est pas configure");
    const { data, error } = await client.rpc("admin_dashboard", { p_days: days });
    if (error) throw error;
    return data;
  }

  async function adminListOrders(status, search) {
    if (!client) throw new Error("Supabase local n'est pas configure");
    const { data, error } = await client.rpc("admin_list_orders", {
      p_status: status || null,
      p_search: search || null
    });
    if (error) throw error;
    return data;
  }

  async function adminGetOrder(id) {
    if (!client) throw new Error("Supabase local n'est pas configure");
    const { data, error } = await client.rpc("admin_get_order", { p_id: id });
    if (error) throw error;
    return data;
  }

  async function adminUpdateOrderStatus(id, status) {
    if (!client) throw new Error("Supabase local n'est pas configure");
    const { data, error } = await client.rpc("admin_update_order_status", {
      p_id: id,
      p_status: status
    });
    if (error) throw error;
    return data;
  }

  async function adminUpsertProduct(product) {
    if (!client) throw new Error("Supabase local n'est pas configure");
    const { data, error } = await client.rpc("admin_upsert_product", {
      p_id_produit: product.id,
      p_nom: product.nom,
      p_description: product.description,
      p_prix: product.prix,
      p_stock: product.stock,
      p_image: product.image,
      p_id_categorie: product.categorie
    });
    if (error) throw error;
    return data;
  }

  async function adminDeleteProduct(id) {
    if (!client) throw new Error("Supabase local n'est pas configure");
    const { data, error } = await client.rpc("admin_delete_product", {
      p_id_produit: id
    });
    if (error) throw error;
    return data;
  }

  async function adminImportProducts(rows) {
    if (!client) throw new Error("Supabase local n'est pas configure");
    const { data, error } = await client.rpc("admin_import_products", {
      p_rows: rows
    });
    if (error) throw error;
    return data;
  }

  async function adminListCustomers() {
    if (!client) throw new Error("Supabase local n'est pas configure");
    const { data, error } = await client.rpc("admin_list_customers");
    if (error) throw error;
    return data;
  }

  async function adminListPromos() {
    if (!client) throw new Error("Supabase local n'est pas configure");
    const { data, error } = await client.rpc("admin_list_promos");
    if (error) throw error;
    return data;
  }

  async function adminUpsertPromo(promo) {
    if (!client) throw new Error("Supabase local n'est pas configure");
    const { data, error } = await client.rpc("admin_upsert_promo", {
      p_id_promotion: promo.id,
      p_code: promo.code,
      p_type_remise: promo.type,
      p_valeur: promo.value,
      p_date_debut: promo.start,
      p_date_fin: promo.end,
      p_limite_utilisation: promo.limit,
      p_actif: promo.active
    });
    if (error) throw error;
    return data;
  }

  async function adminDeletePromo(id) {
    if (!client) throw new Error("Supabase local n'est pas configure");
    const { data, error } = await client.rpc("admin_delete_promo", {
      p_id_promotion: id
    });
    if (error) throw error;
    return data;
  }

  async function chooseSellerPlan(plan, paymentMode) {
    if (!client) throw new Error("Supabase local n'est pas configure");
    const { data, error } = await client.rpc("choose_seller_plan", {
      p_plan: plan,
      p_mode_paiement: paymentMode
    });
    if (error) throw error;
    return data;
  }

  async function cancelSellerTrial() {
    if (!client) throw new Error("Supabase local n'est pas configure");
    const { data, error } = await client.rpc("cancel_seller_trial");
    if (error) throw error;
    return data;
  }

  async function previewSellerTrial(plan) {
    if (!client) throw new Error("Supabase local n'est pas configure");
    const { data, error } = await client.rpc("preview_seller_trial", { p_plan: plan });
    if (error) throw error;
    return data;
  }

  async function activateSellerPlan(plan, paymentMode) {
    if (!client) throw new Error("Supabase local n'est pas configure");
    const { data, error } = await client.rpc("activate_seller_plan", {
      p_plan: plan,
      p_mode_paiement: paymentMode
    });
    if (error) throw error;
    return data;
  }

  async function publishProduct(product) {
    if (!client) throw new Error("Supabase local n'est pas configure");
    const { data, error } = await client.rpc("publish_product", {
      p_nom: product.nom,
      p_description: product.description,
      p_prix: product.prix,
      p_stock: product.stock,
      p_id_categorie: product.categorie
    });
    if (error) throw error;
    return data;
  }

  async function removeProduct(idProduit) {
    if (!client) throw new Error("Supabase local n'est pas configure");
    const { error } = await client.rpc("remove_product", {
      p_id_produit: idProduit
    });
    if (error) throw error;
  }

  async function requestPartnership(type, message) {
    if (!client) throw new Error("Supabase local n'est pas configure");
    const { data, error } = await client.rpc("request_partnership", {
      p_type: type,
      p_message: message
    });
    if (error) throw error;
    return data;
  }

  async function getOrders() {
    if (!client) return null;
    const profile = await getProfile();
    if (!profile) return [];

    const { data, error } = await client
      .from("commande")
      .select(`
        id_commande,
        date_commande,
        statut,
        adresse_commande (
          adresse,
          ville,
          mode_livraison,
          frais_livraison
        ),
        paiement_commande (
          fournisseur,
          statut,
          montant
        ),
        ligne_commande (
          id_ligne,
          id_produit,
          quantite,
          prix_unitaire
        )
      `)
      .eq("id_client", profile.id_client)
      .order("date_commande", { ascending: false });
    if (error) throw error;
    return data || [];
  }

  async function getSellerInfo() {
    if (!client) return null;
    const profile = await getProfile();
    if (!profile) return null;
    const { error: refreshError } = await client.rpc("refresh_seller_subscription");
    if (refreshError) throw refreshError;
    const [seller, products, partnerships, account] = await Promise.all([
      client
        .from("profil_vendeur")
        .select("plan, date_debut, date_fin, date_premier_paiement, actif, statut_abonnement, mode_paiement")
        .eq("id_client", profile.id_client)
        .maybeSingle(),
      client
        .from("produit_vendeur")
        .select("id_produit")
        .eq("id_client", profile.id_client),
      client
        .from("demande_partenariat")
        .select("id_partenariat, type, message, statut")
        .eq("id_client", profile.id_client)
        .order("cree_le", { ascending: false }),
      client
        .from("client")
        .select("essai_vendeur_utilise")
        .eq("id_client", profile.id_client)
        .single()
    ]);
    if (seller.error) throw seller.error;
    if (products.error) throw products.error;
    if (partnerships.error) throw partnerships.error;
    if (account.error) throw account.error;
    return {
      plan: seller.data
        ? { ...seller.data, essai_vendeur_utilise: account.data.essai_vendeur_utilise }
        : null,
      trialUsed: account.data.essai_vendeur_utilise,
      productIds: (products.data || []).map(row => row.id_produit),
      partnerships: partnerships.data || []
    };
  }

  return {
    enabled: Boolean(client),
    getCategories,
    getProducts,
    signUp,
    signIn,
    signOut,
    getSession,
    getProfile,
    getCart,
    getFavorites,
    setCart,
    setFavorite,
    placeOrder,
    previewPromo,
    isAdmin,
    adminDashboard,
    adminListOrders,
    adminGetOrder,
    adminUpdateOrderStatus,
    adminUpsertProduct,
    adminDeleteProduct,
    adminImportProducts,
    adminListCustomers,
    adminListPromos,
    adminUpsertPromo,
    adminDeletePromo,
    chooseSellerPlan,
    cancelSellerTrial,
    previewSellerTrial,
    activateSellerPlan,
    publishProduct,
    removeProduct,
    requestPartnership,
    getOrders,
    getSellerInfo
  };
})();
