
const SUPABASE_URL = "https://jxbxshzbesqyefcrfxqc.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_z4tTIcqtbM8h9fVFfHm2Mw_NfzWVIYx";


// Adresse de ton site GitHub Pages
const SITE_URL = "https://eronrou-ofc.github.io/eronrou-dev-store/";

// Initialisation
const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

// Éléments HTML
const signupForm = document.getElementById("signup-form");
const loginForm = document.getElementById("login-form");
const logoutButton = document.getElementById("logout-button");

const messageElement = document.getElementById("auth-message");

// Afficher un message
function showMessage(message, isError = false) {
    if (messageElement) {
        messageElement.textContent = message;
        messageElement.style.color = isError
            ? "#ff5555"
            : "#55dd99";
    } else {
        alert(message);
    }
}

// ==========================================
// INSCRIPTION
// ==========================================

if (signupForm) {
    signupForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const email = document
            .getElementById("signup-email")
            .value.trim();

        const password = document
            .getElementById("signup-password")
            .value;

        if (!email || !password) {
            showMessage("Remplis tous les champs.", true);
            return;
        }

        if (password.length < 6) {
            showMessage(
                "Le mot de passe doit contenir au moins 6 caractères.",
                true
            );
            return;
        }

        showMessage("Création du compte...");

        try {
            const { data, error } =
                await supabaseClient.auth.signUp({
                    email: email,
                    password: password,
                    options: {
                        emailRedirectTo: SITE_URL
                    }
                });

            if (error) throw error;

            if (data.user && !data.session) {
                showMessage(
                    "Compte créé ! Consulte tes e-mails pour confirmer ton inscription."
                );
            } else {
                showMessage("Inscription réussie !");
            }

            signupForm.reset();

        } catch (error) {
            showMessage(
                "Erreur d'inscription : " + error.message,
                true
            );
        }
    });
}

// ==========================================
// CONNEXION
// ==========================================

if (loginForm) {
    loginForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const email = document
            .getElementById("login-email")
            .value.trim();

        const password = document
            .getElementById("login-password")
            .value;

        showMessage("Connexion en cours...");

        try {
            const { data, error } =
                await supabaseClient.auth.signInWithPassword({
                    email: email,
                    password: password
                });

            if (error) throw error;

            showMessage("Connexion réussie !");

            // Actualiser l'interface si nécessaire
            updateAuthUI(data.user);

        } catch (error) {
            showMessage(
                "Erreur de connexion : " + error.message,
                true
            );
        }
    });
}

// ==========================================
// DÉCONNEXION
// ==========================================

if (logoutButton) {
    logoutButton.addEventListener("click", async () => {
        const { error } = await supabaseClient.auth.signOut();

        if (error) {
            showMessage(
                "Erreur : " + error.message,
                true
            );
            return;
        }

        showMessage("Tu es déconnecté.");
        updateAuthUI(null);
    });
}

// ==========================================
// ÉTAT DE CONNEXION
// ==========================================

function updateAuthUI(user) {
    const userInfo = document.getElementById("user-info");

    if (userInfo) {
        userInfo.textContent = user
            ? "Connecté : " + user.email
            : "Non connecté";
    }

    if (logoutButton) {
        logoutButton.hidden = !user;
    }
}

// Vérifier la session au chargement
async function initializeAuth() {
    const { data, error } = await supabaseClient.auth.getSession();

    if (error) {
        showMessage(error.message, true);
        return;
    }

    updateAuthUI(data.session?.user ?? null);
}

// Détecter les changements de session
supabaseClient.auth.onAuthStateChange(
    (_event, session) => {
        updateAuthUI(session?.user ?? null);
    }
);

initializeAuth();