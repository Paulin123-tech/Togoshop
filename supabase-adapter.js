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

  async function placeOrder(adresse, ville, modeLivraison, paiement, code) {
    if (!client) throw new Error("Supabase local n'est pas configure");
    const { data, error } = await client.rpc("place_order", {
      p_adresse: adresse,
      p_ville: ville,
      p_mode_livraison: modeLivraison,
      p_paiement: paiement,
      p_code: code || null
    });
    if (error) throw error;
    return data;
  }

  async function chooseSellerPlan(plan) {
    if (!client) throw new Error("Supabase local n'est pas configure");
    const { error } = await client.rpc("choose_seller_plan", { p_plan: plan });
    if (error) throw error;
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
    const [seller, products, partnerships] = await Promise.all([
      client
        .from("profil_vendeur")
        .select("plan, date_debut, date_fin, actif")
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
        .order("cree_le", { ascending: false })
    ]);
    if (seller.error) throw seller.error;
    if (products.error) throw products.error;
    if (partnerships.error) throw partnerships.error;
    return {
      plan: seller.data,
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
    chooseSellerPlan,
    publishProduct,
    removeProduct,
    requestPartnership,
    getOrders,
    getSellerInfo
  };
})();
