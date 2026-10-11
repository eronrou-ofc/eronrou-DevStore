
/* ==========================================
   ERONROU DEV STORE — AUTH + PROFILE
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

const $ = (id) => document.getElementById(id);

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

  setTimeout(() => toast.classList.remove("show"), 3000);
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

  if (page === "dashboard" && currentUser) {
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

    $("auth-submit").textContent =
      authMode === "signup" ? "Create account ↗" : "Sign in ↗";

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
  submit.disabled = true;

  try {
    if (authMode === "signup") {
      showMessage("auth-message", "Creating account...");

      const { data, error } = await supabaseClient.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: SITE_URL
        }
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
    submit.disabled = false;
  }
});

// ==========================================
// SESSION / ACCOUNT UI
// ==========================================



function updateAuthUI(user) {
  currentUser = user;

  const isAdmin =
    user?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();

  $("auth-status").innerHTML = user
    ? "<i></i> CONNECTED"
    : "<i></i> GUEST MODE";

  $("open-auth")?.classList.toggle("hidden", !!user);
  $("sign-out")?.classList.toggle("hidden", !user);

  // Le tableau de bord créateur est réservé à ton compte.
  $("account-gate")?.classList.toggle("hidden", isAdmin);
  $("creator-dashboard")?.classList.toggle("hidden", !isAdmin);

  if ($("account-gate")) {
    const message = $("account-gate").querySelector("p");

    if (message && user && !isAdmin) {
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

  if (isAdmin) {
    loadProfile();
    loadMyProducts();
  } else {
    $("my-product-list")?.replaceChildren();
    if ($("listing-count")) $("listing-count").textContent = "0";
  }
}
// ==========================================
// PROFILE — LOAD
// ==========================================

async function loadProfile() {
  if (!currentUser) return;

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
    avatar.style.backgroundImage = `url("${url.replace(/["\\]/g, "")}")`;
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

  if (!currentUser) {
    showMessage("profile-message", "Please sign in first.", true);
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

  saveButton.disabled = true;
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
    saveButton.disabled = false;
  }
});

// ==========================================
// PRODUCTS — PUBLIC CATALOG
// ==========================================

let products = [];

async function loadProducts() {
  const { data, error } = await supabaseClient
    .from("products")
    .select("id, title, description, price, image_url, category, seller_id")
    .eq("published", true)
    .order("created_at", { ascending: false });

  if (error) {
    $("connection-note").textContent =
      "Could not load products: " + error.message;
    return;
  }

  products = data || [];
  $("connection-note").classList.add("hidden");
  renderProducts();
}

function renderProducts() {
  const grid = $("product-grid");
  const search = ($("search").value || "").toLowerCase();
  const category = $("category-filter").value;

  grid.replaceChildren();

  const filtered = products.filter(product => {
    const matchesSearch =
      `${product.title} ${product.description} ${product.category}`
        .toLowerCase().includes(search);

    return matchesSearch &&
      (category === "all" || product.category === category);
  });

  $("empty-products").classList.toggle("hidden", filtered.length > 0);

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

    const info = document.createElement("div");
    info.className = "product-info";

    const meta = document.createElement("div");
    meta.className = "product-meta";

    const categoryLabel = document.createElement("span");
    categoryLabel.textContent = product.category || "ASSET";

    const price = document.createElement("span");
    price.className = "price";
    price.textContent = Number(product.price) === 0
      ? "FREE"
      : "$" + Number(product.price).toFixed(2);

    const title = document.createElement("h3");
    title.textContent = product.title;

    const description = document.createElement("p");
    description.textContent = product.description;

    meta.append(categoryLabel, price);
    info.append(meta, title, description);
    art.append(tag);
    card.append(art, info);
    grid.append(card);
  });
}

$("search")?.addEventListener("input", renderProducts);
$("category-filter")?.addEventListener("change", renderProducts);

// ==========================================
// MY LISTINGS
// ==========================================

async function loadMyProducts() {
  if (!currentUser) return;

  const list = $("my-product-list");
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

  $("listing-count").textContent = String(data.length);
  list.replaceChildren();

  if (!data.length) {
    list.textContent = "You haven't published any assets yet.";
    return;
  }

  data.forEach(product => {
    const row = document.createElement("div");
    row.className = "my-product-row";

    const name = document.createElement("span");
    name.textContent = product.title;

    const status = document.createElement("span");
    status.className = "muted";
    status.textContent = product.published ? "Published" : "Draft";

    row.append(name, status);
    list.append(row);
  });
}

$("refresh-products")?.addEventListener("click", () => {
  loadMyProducts();
  loadProducts();
});

// ==========================================
// PUBLISH ASSET
// Requires products table columns:
// title, category, price, description, image_url,
// file_path, seller_id, published
// ==========================================

$("product-form")?.addEventListener("submit", async event => {
  event.preventDefault();

  if (!currentUser) {
    openAuth();
    return;
  }

  const form = event.currentTarget;
  const values = new FormData(form);

  const title = String(values.get("title")).trim();
  const category = String(values.get("category"));
  const price = Number(values.get("price"));
  const description = String(values.get("description")).trim();
  const image_url = String(values.get("image_url") || "").trim();
  const download_url = String(values.get("download_url") || "").trim();

  if (!Number.isFinite(price) || price < 0) {
    showMessage("form-message", "Enter a valid price.", true);
    return;
  }

  showMessage("form-message", "Publishing asset...");

  try {
    const { error } = await supabaseClient
      .from("products")
      .insert({
        title,
        category,
        price,
        description,
        image_url: image_url || null,
        file_path: download_url || null,
        seller_id: currentUser.id,
        published: true
      });

    if (error) throw error;

    form.reset();
    showMessage("form-message", "Asset published successfully!");
    await loadMyProducts();
    await loadProducts();
  } catch (error) {
    showMessage("form-message", error.message, true);
  }
});

// ==========================================
// AUTH SESSION
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
}

supabaseClient.auth.onAuthStateChange((_event, session) => {
  updateAuthUI(session?.user || null);
});

initialize();