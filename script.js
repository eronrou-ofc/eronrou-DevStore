/* Eronrou Dev Store
   1) Replace SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY below.
   2) This starter expects a public "products" table with:
      id, title, description, category, price, image_url, download_url, user_id, created_at
   3) Match these names to your existing table before publishing.
   Never put a service_role/secret key in frontend code.
*/
const SUPABASE_URL = "https://jxbxshzbesqyefcrfxqc.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_z4tTIcqtbM8h9fVFfHm2Mw_NfzWVIYx";

let supabaseClient = null;
let currentUser = null;
let authMode = "signin";
let products = [];
const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const configured = () => SUPABASE_URL.startsWith("https://") && !SUPABASE_URL.includes("YOUR_") && SUPABASE_PUBLISHABLE_KEY && !SUPABASE_PUBLISHABLE_KEY.includes("YOUR_");

function toast(message) {
  const el = $("#toast");
  el.textContent = message;
  el.classList.add("show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.classList.remove("show"), 3200);
}
function showAuth(mode = "signin") {
  setAuthMode(mode);
  $("#auth-modal").classList.remove("hidden");
}
function hideAuth() { $("#auth-modal").classList.add("hidden"); }
function setAuthMode(mode) {
  authMode = mode;
  $$(".auth-tab").forEach(b => b.classList.toggle("active", b.dataset.authMode === mode));
  $("#auth-title").innerHTML = mode === "signin" ? 'Access the <span class="gradient-text">network.</span>' : 'Join the <span class="gradient-text">network.</span>';
  $("#auth-submit").innerHTML = mode === "signin" ? "Sign in ↗" : "Create account ↗";
  $("#auth-message").textContent = "";
}
function navigate(page) {
  $("#store-page").classList.toggle("hidden", page !== "store");
  $("#dashboard-page").classList.toggle("hidden", page !== "dashboard");
  $$(".nav-link").forEach(b => b.classList.toggle("active", b.dataset.page === page));
  if (page === "dashboard") updateDashboard();
  window.scrollTo({top: 0, behavior: "smooth"});
}
function setUser(user) {
  currentUser = user || null;
  $("#open-auth").classList.toggle("hidden", !!currentUser);
  $("#sign-out").classList.toggle("hidden", !currentUser);
  $("#auth-status").innerHTML = currentUser ? '<i></i> CONNECTED' : '<i></i> GUEST MODE';
  $("#auth-status").title = currentUser?.email || "Not signed in";
  updateDashboard();
}
function updateDashboard() {
  const signedIn = !!currentUser;
  $("#account-gate").classList.toggle("hidden", signedIn);
  $("#creator-dashboard").classList.toggle("hidden", !signedIn);
  if (signedIn) {
    $("#profile-email").textContent = currentUser.email || "Creator";
    $("#profile-id").textContent = `ID: ${currentUser.id.slice(0, 8)}…`;
    $("#avatar").textContent = (currentUser.email || "E").charAt(0).toUpperCase();
    renderMyProducts();
  }
}
function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
}
function renderProducts() {
  const grid = $("#product-grid");
  const q = $("#search").value.trim().toLowerCase();
  const cat = $("#category-filter").value;
  const shown = products.filter(p => (cat === "all" || p.category === cat) &&
    `${p.title} ${p.description} ${p.category}`.toLowerCase().includes(q));
  if (!configured() || !supabaseClient) {
    $$(".sample").forEach(card => card.classList.remove("hidden"));
    $("#empty-products").classList.add("hidden");
    return;
  }
  grid.innerHTML = shown.map((p, i) => `
    <article class="product-card">
      <div class="product-art art-${["one","two","three"][i % 3]}">
        <span class="art-tag">${escapeHTML((p.category || "ASSET").toUpperCase())}</span>
        <div class="art-glyph">${["⌘","▦","⌬"][i % 3]}</div>
        <span class="art-bottom">ERONROU DEV STORE</span>
      </div>
      <div class="product-info">
        <div class="product-meta"><span>${escapeHTML(p.category || "ASSET")}</span><span class="price">${Number(p.price) === 0 ? "FREE" : "$" + Number(p.price || 0).toFixed(2)}</span></div>
        <h3>${escapeHTML(p.title)}</h3><p>${escapeHTML(p.description)}</p>
        <div class="card-foot"><span class="creator">by <b>${escapeHTML(p.creator_name || "Creator")}</b></span>
        <button class="mini-btn" data-product-id="${escapeHTML(p.id)}">View asset ↗</button></div>
      </div>
    </article>`).join("");
  $("#empty-products").classList.toggle("hidden", shown.length > 0);
  grid.querySelectorAll("[data-product-id]").forEach(btn => btn.addEventListener("click", () => {
    const product = products.find(p => String(p.id) === btn.dataset.productId);
    if (!product) return;
    const detail = product.download_url ? `\\n\\nDelivery link: ${product.download_url}` : "\\n\\nContact the creator for delivery details.";
    alert(`${product.title}\\n\\n${product.description || ""}\\n\\nPrice: ${Number(product.price) === 0 ? "FREE" : "$" + Number(product.price).toFixed(2)}${detail}`);
  }));
}
function renderMyProducts() {
  const list = $("#my-product-list");
  if (!currentUser) return;
  const mine = products.filter(p => p.user_id === currentUser.id);
  $("#listing-count").textContent = mine.length;
  if (!configured() || !supabaseClient) {
    list.innerHTML = '<p class="muted">Connect Supabase to load your listings.</p>';
    return;
  }
  list.innerHTML = mine.length ? mine.map(p => `<div class="my-product-row"><b>${escapeHTML(p.title)}</b><span>${Number(p.price) === 0 ? "FREE" : "$" + Number(p.price).toFixed(2)} · ${escapeHTML(p.category || "Asset")}</span></div>`).join("") : '<p class="muted">No published assets yet. Add your first one above.</p>';
}
async function loadProducts() {
  if (!supabaseClient) return;
  const { data, error } = await supabaseClient.from("products")
    .select("id,title,description,category,price,image_url,download_url,user_id,created_at")
    .order("created_at", { ascending: false });
  if (error) {
    $("#connection-note").textContent = `Supabase is connected, but products could not be loaded: ${error.message}. Check your table/column names and RLS policies.`;
    $("#connection-note").classList.remove("hidden");
    console.error(error);
    return;
  }
  products = data || [];
  $("#connection-note").classList.add("hidden");
  renderProducts();
  renderMyProducts();
}
async function handleAuth(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const email = String(form.get("email") || "").trim();
  const password = String(form.get("password") || "");
  const msg = $("#auth-message");
  msg.textContent = "Please wait…";
  if (!supabaseClient) {
    msg.textContent = "First add your Supabase project URL and publishable key in script.js.";
    return;
  }
  const result = authMode === "signup"
    ? await supabaseClient.auth.signUp({ email, password })
    : await supabaseClient.auth.signInWithPassword({ email, password });
  if (result.error) {
    msg.textContent = result.error.message;
    return;
  }
  if (authMode === "signup" && !result.data.session) {
    msg.textContent = "Account created. Check your email to confirm your address, then sign in.";
    return;
  }
  msg.textContent = authMode === "signup" ? "Account created successfully." : "Signed in successfully.";
  setUser(result.data.user);
  await loadProducts();
  setTimeout(hideAuth, 700);
  toast("Authentication successful.");
}
async function handleProductSubmit(event) {
  event.preventDefault();
  const msg = $("#form-message");
  if (!currentUser) { showAuth("signin"); return; }
  if (!supabaseClient) { msg.textContent = "Connect Supabase in script.js before publishing."; return; }
  const fd = new FormData(event.currentTarget);
  const row = {
    title: String(fd.get("title")).trim(),
    category: String(fd.get("category")),
    price: Number(fd.get("price")),
    description: String(fd.get("description")).trim(),
    image_url: String(fd.get("image_url") || "").trim() || null,
    download_url: String(fd.get("download_url") || "").trim() || null,
    user_id: currentUser.id
  };
  msg.textContent = "Publishing…";
  const { error } = await supabaseClient.from("products").insert(row);
  if (error) {
    msg.textContent = `Could not publish: ${error.message}. Check your products schema and insert policy.`;
    return;
  }
  event.currentTarget.reset();
  msg.textContent = "Asset published successfully.";
  await loadProducts();
  toast("Asset published.");
}
async function init() {
  // Decorative constellation background
  const canvas = $("#stars"), ctx = canvas.getContext("2d");
  let points = [];
  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = innerWidth * dpr; canvas.height = innerHeight * dpr;
    canvas.style.width = innerWidth + "px"; canvas.style.height = innerHeight + "px";
    ctx.setTransform(dpr,0,0,dpr,0,0);
    points = Array.from({length: Math.min(100, Math.floor(innerWidth * innerHeight / 12000))}, () => ({x:Math.random()*innerWidth,y:Math.random()*innerHeight,r:Math.random()*1.3+.3}));
    draw();
  }
  function draw() {
    ctx.clearRect(0,0,innerWidth,innerHeight);
    points.forEach((p,i) => {
      ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2); ctx.fillStyle="rgba(255,255,255,.7)"; ctx.fill();
      for(let j=i+1;j<points.length;j++){
        const q=points[j], dx=p.x-q.x, dy=p.y-q.y, d=Math.hypot(dx,dy);
        if(d<115){ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y);ctx.strokeStyle=`rgba(255,255,255,${.13*(1-d/115)})`;ctx.lineWidth=.5;ctx.stroke();}
      }
    });
  }
  resize(); window.addEventListener("resize", resize);
  $$(".nav-link,[data-page]").forEach(b => b.addEventListener("click", () => navigate(b.dataset.page || "store")));
  $("#open-auth").addEventListener("click", () => showAuth("signin"));
  $("#gate-sign-in").addEventListener("click", () => showAuth("signin"));
  $("#close-auth").addEventListener("click", hideAuth);
  $("#auth-modal").addEventListener("click", e => { if(e.target === $("#auth-modal")) hideAuth(); });
  $$(".auth-tab").forEach(b => b.addEventListener("click", () => setAuthMode(b.dataset.authMode)));
  $("#auth-form").addEventListener("submit", handleAuth);
  $("#product-form").addEventListener("submit", handleProductSubmit);
  $("#sign-out").addEventListener("click", async () => {
    if (supabaseClient) await supabaseClient.auth.signOut();
    setUser(null); toast("You have signed out.");
  });
  $("#search").addEventListener("input", renderProducts);
  $("#category-filter").addEventListener("change", renderProducts);
  $("#browse-assets").addEventListener("click", () => $("#catalog").scrollIntoView({behavior:"smooth"}));
  $("#refresh-products").addEventListener("click", loadProducts);
  $$("[data-auth-needed]").forEach(b => b.addEventListener("click", () => showAuth("signin")));
  if (configured() && window.supabase) {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
    const { data } = await supabaseClient.auth.getSession();
    setUser(data.session?.user || null);
    supabaseClient.auth.onAuthStateChange((_event, session) => setUser(session?.user || null));
    await loadProducts();
  } else {
    $("#connection-note").classList.remove("hidden");
    renderProducts();
  }
}
document.addEventListener("DOMContentLoaded", init);
