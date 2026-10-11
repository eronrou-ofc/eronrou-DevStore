
/* ==========================================
   ERONROU DEV STORE — AUTH + STRIPE + DOWNLOADS
   ========================================== */

const SUPABASE_URL = "https://jxbxshzbesqyefcrfxqc.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_z4tTIcqtbM8h9fVFfHm2Mw_NfzWVIYx";
const SITE_URL = "https://eronrou-ofc.github.io/eronrou-DevStore/";
const ADMIN_EMAIL = "eronrou@gmail.com";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);

let currentUser = null;
let authMode = "signin";
let products = [];
let purchasedProductIds = new Set();

const $ = (id) => document.getElementById(id);

function isAdmin() {
  return currentUser?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();
}

function showMessage(id, message, isError = false) {
  const element = $(id);
  if (!element) return;

  element.textContent = message;
  element.style.color = isError ? "#ff5555" : "#a8f0c6";
}

function showToast(message) {
  const toast = $("toast");
  if (!toast) return;

  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 3500);
}

function formatPrice(price) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR"
  }).format(Number(price));
}

// ==========================================
// NAVIGATION
// ==========================================

function showPage(page) {
  $("store-page")?.classList.toggle("hidden", page !== "store");
  $("dashboard-page")?.classList.toggle("hidden", page !== "dashboard");

  document.querySelectorAll(".nav-link").forEach(button => {
    button.classList.toggle("active", button.dataset.page === page);
  });

  if (page === "dashboard" && isAdmin()) {
    loadProfile();
    loadMyProducts();
  }
}

document.querySelectorAll("[data-page]").forEach(button => {
  button.addEventListener("click", () => showPage(button.dataset.page));
});

$("browse-assets")?.addEventListener("click", () => {
  $("catalog")?.scrollIntoView({ behavior: "smooth" });
});

// ==========================================
// AUTH MODAL
// ==========================================

function openAuth() {
  $("auth-modal")?.classList.remove("hidden");
}

function closeAuth() {
  $("auth-modal")?.classList.add("hidden");
}

$("open-auth")?.addEventListener("click", openAuth);
$("gate-open-auth")?.addEventListener("click", openAuth);
$("auth-backdrop")?.addEventListener("click", closeAuth);
$("close-auth")?.addEventListener("click", closeAuth);

$("auth-modal")?.addEventListener("click", event => {
  if (event.target === $("auth-modal")) closeAuth();
});

document.querySelectorAll("[data-auth-mode]").forEach(button => {
  button.addEventListener("click", () => {
    authMode = button.dataset.authMode;

    document.querySelectorAll("[data-auth-mode]").forEach(tab => {
      tab.classList.toggle("active", tab === button);
    });

    if ($("auth-submit")) {
      $("auth-submit").textContent =
        authMode === "signup" ? "Create account ↗" : "Sign in ↗";
    }

    const password = $("auth-form")?.elements.namedItem("password");
    if (password) {
      password.autocomplete =
        authMode === "signup" ? "new-password" : "current-password";
    }

    showMessage("auth-message", "");
  });
});

// ==========================================
// SIGN UP / SIGN IN
// ==========================================

$("auth-form")?.addEventListener("submit", async event => {
  event.preventDefault();

  const form = event.currentTarget;
  const email = form.elements.namedItem("email").value.trim();
  const password = form.elements.namedItem("password").value;
  const submit = $("auth-submit");

  if (submit) submit.disabled = true;

  try {
    if (authMode === "signup") {
      showMessage("auth-message", "Creating account...");

      const { data, error } = await supabaseClient.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: SITE_URL }
      });

      if (error) throw error;

      if (data.user && !data.session) {
        showMessage(
          "auth-message",
          "Account created! Check your email to confirm your account."
        );
      } else {
        showMessage("auth-message", "Account created successfully.");
        closeAuth();
      }
    } else {
      showMessage("auth-message", "Signing in...");

      const { error } = await supabaseClient.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      closeAuth();
      showToast("Welcome back!");
    }
  } catch (error) {
    showMessage("auth-message", error.message, true);
  } finally {
    if (submit) submit.disabled = false;
  }
});

// ==========================================
// PURCHASE HISTORY
// ==========================================

async function loadPurchases() {
  purchasedProductIds = new Set();

  if (!currentUser) return;

  const { data, error } = await supabaseClient
    .from("purchases")
    .select("product_id")
    .eq("user_id", currentUser.id)
    .eq("payment_status", "paid");

  if (error) {
    console.error("Unable to load purchases:", error.message);
    return;
  }

  purchasedProductIds = new Set(
    (data || []).map(item => String(item.product_id))
  );
}

// ==========================================
// SESSION / ACCOUNT UI
// ==========================================

function updateAuthUI(user) {
  currentUser = user;

  const admin = isAdmin();

  if ($("auth-status")) {
    $("auth-status").innerHTML = user
      ? "<i></i> CONNECTED"
      : "<i></i> GUEST MODE";
  }

  $("open-auth")?.classList.toggle("hidden", !!user);
  $("sign-out")?.classList.toggle("hidden", !user);

  // Only the owner can publish assets.
  $("account-gate")?.classList.toggle("hidden", admin);
  $("creator-dashboard")?.classList.toggle("hidden", !admin);

  if ($("account-gate")) {
    const message = $("account-gate").querySelector("p");

    if (message && user && !admin) {
      message.textContent =
        "Cette boutique est gérée par son propriétaire. " +
        "Seul le compte administrateur peut publier des assets.";
    }
  }

  if ($("profile-email")) {
    $("profile-email").textContent = user?.email || "Creator";
  }

  if ($("profile-id")) {
    $("profile-id").textContent = user ? "ID: " + user.id : "";
  }

  if (admin) {
    loadProfile();
    loadMyProducts();
  } else {
    $("my-product-list")?.replaceChildren();

    if ($("listing-count")) {
      $("listing-count").textContent = "0";
    }
  }
}

$("sign-out")?.addEventListener("click", async () => {
  const { error } = await supabaseClient.auth.signOut();

  if (error) {
    showToast(error.message);
    return;
  }

  showToast("Signed out.");
});

// ==========================================
// PROFILE — LOAD
// ==========================================

async function loadProfile() {
  if (!currentUser || !isAdmin()) return;

  const { data, error } = await supabaseClient
    .from("profiles")
    .select("username, avatar_url, created_at")
    .eq("id", currentUser.id)
    .maybeSingle();

  if (error) {
    showMessage("profile-message", error.message, true);
    return;
  }

  if (data) {
    $("profile-username").value = data.username || "";
    $("profile-avatar-url").value = data.avatar_url || "";
    renderAvatar(data.avatar_url, data.username);
  } else {
    const defaultName = currentUser.email?.split("@")[0] || "Creator";
    $("profile-username").value = defaultName;
    $("profile-avatar-url").value = "";
    renderAvatar("", defaultName);
  }
}

function renderAvatar(url, username) {
  const avatar = $("avatar");
  if (!avatar) return;

  avatar.style.backgroundImage = "";
  avatar.textContent =
    (username || currentUser?.email || "E").charAt(0).toUpperCase();

  if (url) {
    avatar.style.backgroundImage =
      `url("${url.replace(/["\\]/g, "")}")`;
    avatar.style.backgroundSize = "cover";
    avatar.style.backgroundPosition = "center";
    avatar.textContent = "";
  }
}

// ==========================================
// PROFILE — SAVE
// ==========================================

$("profile-form")?.addEventListener("submit", async event => {
  event.preventDefault();

  if (!currentUser || !isAdmin()) {
    showMessage("profile-message", "Admin access required.", true);
    return;
  }

  const username = $("profile-username").value.trim();
  const avatar_url = $("profile-avatar-url").value.trim();

  if (username.length < 3 || username.length > 30) {
    showMessage(
      "profile-message",
      "Username must contain 3 to 30 characters.",
      true
    );
    return;
  }

  if (avatar_url) {
    try {
      const parsed = new URL(avatar_url);

      if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
        throw new Error("Invalid URL");
      }
    } catch {
      showMessage("profile-message", "Enter a valid avatar URL.", true);
      return;
    }
  }

  const saveButton = event.currentTarget.querySelector(
    'button[type="submit"]'
  );

  if (saveButton) saveButton.disabled = true;
  showMessage("profile-message", "Saving profile...");

  try {
    const { data: existing, error: readError } = await supabaseClient
      .from("profiles")
      .select("id")
      .eq("id", currentUser.id)
      .maybeSingle();

    if (readError) throw readError;

    let result;

    if (existing) {
      result = await supabaseClient
        .from("profiles")
        .update({ username, avatar_url: avatar_url || null })
        .eq("id", currentUser.id);
    } else {
      result = await supabaseClient
        .from("profiles")
        .insert({
          id: currentUser.id,
          username,
          avatar_url: avatar_url || null
        });
    }

    if (result.error) throw result.error;

    renderAvatar(avatar_url, username);
    showMessage("profile-message", "Profile saved successfully!");
    showToast("Profile updated.");
  } catch (error) {
    showMessage("profile-message", error.message, true);
  } finally {
    if (saveButton) saveButton.disabled = false;
  }
});

// ==========================================
// PRODUCTS — PUBLIC CATALOG
// ==========================================

async function loadProducts() {
  const { data, error } = await supabaseClient
    .from("products")
    .select("id, title, description, price, image_url, category, seller_id")
    .eq("published", true)
    .order("created_at", { ascending: false });

  if (error) {
    if ($("connection-note")) {
      $("connection-note").textContent =
        "Could not load products: " + error.message;
    }
    return;
  }

  products = data || [];

  await loadPurchases();

  $("connection-note")?.classList.add("hidden");
  renderProducts();
}

function renderProducts() {
  const grid = $("product-grid");
  if (!grid) return;

  const search = ($("search")?.value || "").toLowerCase();
  const category = $("category-filter")?.value || "all";

  grid.replaceChildren();

  const filtered = products.filter(product => {
    const text =
      `${product.title} ${product.description || ""} ${product.category || ""}`
        .toLowerCase();

    return text.includes(search) &&
      (category === "all" || product.category === category);
  });

  $("empty-products")?.classList.toggle("hidden", filtered.length > 0);

  filtered.forEach(product => {
    const card = document.createElement("article");
    card.className = "product-card";

    const art = document.createElement("div");
    art.className = "product-art art-one";

    if (product.image_url) {
      art.style.backgroundImage = `url("${product.image_url}")`;
      art.style.backgroundSize = "cover";
      art.style.backgroundPosition = "center";
    }

    const tag = document.createElement("span");
    tag.className = "art-tag";
    tag.textContent = product.category || "ASSET";
    art.append(tag);

    const info = document.createElement("div");
    info.className = "product-info";

    const meta = document.createElement("div");
    meta.className = "product-meta";

    const categoryLabel = document.createElement("span");
    categoryLabel.textContent = product.category || "ASSET";

    const price = document.createElement("span");
    price.className = "price";
    price.textContent = formatPrice(product.price);

    meta.append(categoryLabel, price);

    const title = document.createElement("h3");
    title.textContent = product.title;

    const description = document.createElement("p");
    description.textContent = product.description || "";

    const action = document.createElement("button");
    action.type = "button";
    action.className = "buy-button";

    const owned = purchasedProductIds.has(String(product.id));

    if (owned) {
      action.textContent = "Télécharger ↓";
      action.addEventListener("click", () => downloadAsset(product.id));
    } else {
      action.textContent = "Acheter — " + formatPrice(product.price);
      action.addEventListener("click", () => buyAsset(product.id));
    }

    info.append(meta, title, description, action);
    card.append(art, info);
    grid.append(card);
  });
}

$("search")?.addEventListener("input", renderProducts);
$("category-filter")?.addEventListener("change", renderProducts);

// ==========================================
// STRIPE CHECKOUT
// ==========================================

async function buyAsset(productId) {
  if (!currentUser) {
    showToast("Connecte-toi avant d'acheter.");
    openAuth();
    return;
  }

  const product = products.find(
    item => String(item.id) === String(productId)
  );

  if (!product) {
    showToast("Asset introuvable.");
    return;
  }

  if (!Number.isFinite(Number(product.price)) || Number(product.price) <= 0) {
    showToast("Cet asset n'a pas de prix valide.");
    return;
  }

  showToast("Préparation du paiement...");

  try {
    const { data, error } = await supabaseClient.functions.invoke(
      "create-checkout-session",
      { body: { product_id: String(productId) } }
    );

    if (error) throw error;
    if (!data?.url) {
      throw new Error(data?.error || "Lien de paiement indisponible.");
    }

    window.location.assign(data.url);
  } catch (error) {
    console.error("Checkout error:", error);
    showToast(error.message || "Impossible de démarrer le paiement.");
  }
}

// ==========================================
// SECURE DOWNLOAD
// ==========================================

async function downloadAsset(productId) {
  if (!currentUser) {
    showToast("Connecte-toi pour télécharger.");
    openAuth();
    return;
  }

  if (!purchasedProductIds.has(String(productId))) {
    showToast("Achat non confirmé. Actualise tes achats.");
    await loadProducts();
    return;
  }

  showToast("Vérification de ton achat...");

  try {
    const { data, error } = await supabaseClient.functions.invoke(
      "download-asset",
      { body: { product_id: String(productId) } }
    );

    if (error) throw error;
    if (!data?.url) {
      throw new Error(data?.error || "Lien de téléchargement indisponible.");
    }

    window.location.assign(data.url);
  } catch (error) {
    console.error("Download error:", error);
    console.error(
  "Réponse download-asset :",
  await error.context?.text?.()
);
    console.error("Détails du téléchargement :", await error.context?.text?.());
    showToast(error.message || "Téléchargement impossible.");
  }
}

// ==========================================
// MY LISTINGS — ADMIN ONLY
// ==========================================

async function loadMyProducts() {
  if (!currentUser || !isAdmin()) return;

  const list = $("my-product-list");
  if (!list) return;

  list.textContent = "Loading your listings...";

  const { data, error } = await supabaseClient
    .from("products")
    .select("id, title, price, published")
    .eq("seller_id", currentUser.id)
    .order("created_at", { ascending: false });

  if (error) {
    list.textContent = "Could not load listings: " + error.message;
    return;
  }

  const items = data || [];

  if ($("listing-count")) {
    $("listing-count").textContent = String(items.length);
  }

  list.replaceChildren();

  if (!items.length) {
    list.textContent = "You haven't published any assets yet.";
    return;
  }

  items.forEach(product => {
    const row = document.createElement("div");
    row.className = "my-product-row";

    const name = document.createElement("span");
    name.textContent = product.title + " — " + formatPrice(product.price);

    const status = document.createElement("span");
    status.className = "muted";
    status.textContent = product.published ? "Published" : "Draft";

    row.append(name, status);
    list.append(row);
  });
}

$("refresh-products")?.addEventListener("click", async () => {
  await loadMyProducts();
  await loadProducts();
});

// ==========================================
// PUBLISH ASSET — ADMIN ONLY
// download_url field must contain a Storage path
// ==========================================

$("product-form")?.addEventListener("submit", async event => {
  event.preventDefault();

  if (!currentUser || !isAdmin()) {
    showMessage(
      "form-message",
      "Seul eronrou@gmail.com peut publier des assets.",
      true
    );
    return;
  }

  const form = event.currentTarget;
  const values = new FormData(form);

  const title = String(values.get("title") || "").trim();
  const category = String(values.get("category") || "").trim();
  const price = Number(values.get("price"));
  const description = String(values.get("description") || "").trim();
  const image_url = String(values.get("image_url") || "").trim();
  const file = values.get("product-file");

  if (!title || !category || !description) {
    showMessage(
      "form-message",
      "Complète tous les champs obligatoires.",
      true
    );
    return;
  }

  if (!Number.isFinite(price) || price <= 0) {
    showMessage(
      "form-message",
      "Le prix doit être supérieur à 0 €.",
      true
    );
    return;
  }

  if (!(file instanceof File) || file.size === 0) {
    showMessage(
      "form-message",
      "Sélectionne un fichier à vendre.",
      true
    );
    return;
  }

  if (image_url) {
    try {
      const parsed = new URL(image_url);
      if (!["https:", "http:"].includes(parsed.protocol)) {
        throw new Error("URL invalide");
      }
    } catch {
      showMessage(
        "form-message",
        "URL de l'image invalide.",
        true
      );
      return;
    }
  }

  const submit = form.querySelector('button[type="submit"]');
  if (submit) submit.disabled = true;

  let uploadedPath = null;

  try {
    showMessage("form-message", "Envoi du fichier en cours...");

    const safeName = file.name.replace(/[^\w.\-() ]/g, "_");
    const uniqueName = crypto.randomUUID() + "-" + safeName;
    uploadedPath = `${currentUser.id}/${uniqueName}`;

    const { error: uploadError } = await supabaseClient.storage
      .from("paid-assets")
      .upload(uploadedPath, file, {
        upsert: false,
        contentType: file.type || "application/octet-stream"
      });

    if (uploadError) throw uploadError;

    showMessage("form-message", "Fichier envoyé. Publication en cours...");

    const { error: insertError } = await supabaseClient
      .from("products")
      .insert({
        title,
        category,
        price,
        description,
        image_url: image_url || null,
        file_path: uploadedPath,
        seller_id: currentUser.id,
        published: true
      });

    if (insertError) throw insertError;

    form.reset();

    showMessage("form-message", "Asset publié avec succès !");
    await loadMyProducts();
    await loadProducts();
    showToast("Asset publié.");
  } catch (error) {
    console.error("Erreur publication :", error);

    if (uploadedPath) {
      const { error: cleanupError } = await supabaseClient.storage
        .from("paid-assets")
        .remove([uploadedPath]);

      if (cleanupError) {
        console.error("Nettoyage du fichier impossible :", cleanupError);
      }
    }

    showMessage(
      "form-message",
      error.message || "Impossible de publier cet asset.",
      true
    );
  } finally {
    if (submit) submit.disabled = false;
  }
});

// ==========================================
// PAYMENT RETURN
// ==========================================

async function initialize() {
  const { data, error } = await supabaseClient.auth.getSession();

  if (error) {
    console.error(error);
    showToast(error.message);
    return;
  }

  updateAuthUI(data.session?.user || null);
  await loadProducts();

  const params = new URLSearchParams(window.location.search);

  if (params.get("payment") === "success") {
    showToast("Paiement terminé. Vérification de ton achat...");

    // The Stripe webhook may take a moment to record the purchase.
    setTimeout(async () => {
      await loadProducts();
      showToast(
        "Achats actualisés. Si le paiement vient d'être effectué, réessaie dans quelques secondes."
      );
    }, 3000);

    window.history.replaceState({}, document.title, SITE_URL);
  } else if (params.get("payment") === "cancelled") {
    showToast("Paiement annulé.");
    window.history.replaceState({}, document.title, SITE_URL);
  }
}

supabaseClient.auth.onAuthStateChange((_event, session) => {
  updateAuthUI(session?.user || null);

  // Defer network requests until after the auth callback completes.
  setTimeout(() => {
    loadProducts();
  }, 0);
});

initialize();