import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getDatabase, ref, get, set, push, onValue, remove, update } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

// Configuration Firebase (Remplacez par votre configuration)
const firebaseConfig = {
    apiKey: "AIzaSyCNiyVW5DgsvqIR2eAlQ2Ls02DuliFWOOI",
    authDomain: "immo-75593.firebaseapp.com",
    databaseURL: "https://immo-75593-default-rtdb.firebaseio.com",
    projectId: "immo-75593",
    storageBucket: "immo-75593.firebasestorage.app",
    messagingSenderId: "146632846661",
    appId: "1:146632846661:web:d63ca5c24f5b4acdeea22c",
    measurementId: "G-52KYCJZSHE"
  };

// Initialiser Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// État de l'authentification
let isAuthenticated = false;

// Gestion de l'authentification
const authSection = document.getElementById("auth-section");
const loginFormContainer = document.getElementById("login-form-container");
const registerFormContainer = document.getElementById("register-form-container");
const loginForm = document.getElementById("login-form");
const registerForm = document.getElementById("register-form");
const showRegisterLink = document.getElementById("show-register");
const showLoginLink = document.getElementById("show-login");

// Récupérer les données utilisateur de localStorage au chargement de la page
let currentUser = null;

// Vérifier si l'utilisateur est déjà authentifié au chargement de la page
window.addEventListener('load', () => {
  const storedUser = localStorage.getItem('currentUser');
  const storedAuthStatus = localStorage.getItem('isAuthenticated');

  if (storedUser && storedAuthStatus === 'true') {
    currentUser = JSON.parse(storedUser);
    isAuthenticated = true;
    checkUserRoleAndSubscription();
    hideAuthSection();
    initializeDataLoad();
  } else {
    // Afficher la section d'authentification si l'utilisateur n'est pas connecté
    authSection.style.display = "flex";
  }
});

// Basculer entre les formulaires de connexion et d'inscription
showRegisterLink.addEventListener("click", () => {
  loginFormContainer.style.display = "none";
  registerFormContainer.style.display = "block";
});

showLoginLink.addEventListener("click", () => {
  registerFormContainer.style.display = "none";
  loginFormContainer.style.display = "block";
});

// Inscription
registerForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  showLoading();
  const username = document.getElementById("register-username").value;
  const password = document.getElementById("register-password").value;

  try {
    // Hasher le mot de passe (simple exemple, utilisez une méthode plus sécurisée en production)
    const hashedPassword = simpleHash(password);

    // Enregistrer l'utilisateur dans Firebase
    const usersRef = ref(database, 'users');
    const newUserRef = push(usersRef); // Créer une nouvelle référence pour l'utilisateur
    await set(newUserRef, {
      id: newUserRef.key, // Enregistrer l'ID auto-généré
      username: username,
      password: hashedPassword,
      role: 'user', // Attribuer un rôle par défaut
      trialUsed: false // Ajouter le champ trialUsed initialisé à false
    });

    alert("Inscription réussie !");
    registerForm.reset();
    showLoginForm(); // Affiche le formulaire de connexion après l'inscription
  } catch (error) {
    console.error("Erreur lors de l'inscription :", error);
    alert("Erreur lors de l'inscription.");
  } finally {
    hideLoading();
  }
});

// Connexion
loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  showLoading();
  const username = document.getElementById("login-username").value;
  const password = document.getElementById("login-password").value;

  try {
    const usersRef = ref(database, 'users');
    const snapshot = await get(usersRef);
    if (snapshot.exists()) {
      const users = snapshot.val();
      let userFound = false;
      for (const userId in users) {
        const user = users[userId];
        // Comparer le mot de passe haché
        if (user.username === username && user.password === simpleHash(password)) {
          // Stocker les informations de l'utilisateur
          currentUser = {
            id: user.id, // Récupérer l'ID
            username: user.username,
            role: user.role, // Récupérer le rôle
            subscription: user.subscription || {},
            trialUsed: user.trialUsed || false // Récupérer l'état de trialUsed
            // ... autres informations si nécessaires ...
          };
          isAuthenticated = true;
          // Stocker les données utilisateur dans localStorage
          localStorage.setItem('currentUser', JSON.stringify(currentUser));
          localStorage.setItem('isAuthenticated', 'true'); // Stocke l'état de connexion
          checkUserRoleAndSubscription();
          hideAuthSection();
          loadDashboardData();
          initializeDataLoad(); // Initialiser le chargement des données ici
          userFound = true;
          break;
        }
      }
      if (!userFound) {
        alert("Pseudo ou mot de passe incorrect.");
      }
    } else {
      alert("Aucun utilisateur trouvé.");
    }
  } catch (error) {
    console.error("Erreur lors de la connexion :", error);
    alert("Erreur lors de la connexion.");
  } finally {
    hideLoading();
  }
});

// Fonction pour démarrer la période d'essai
async function startTrial() {
    if (currentUser.subscription && currentUser.subscription.status === 'trial') {
      alert("Vous avez déjà une période d'essai en cours.");
      return;
    }

    // Vérifier si l'utilisateur a déjà utilisé la période d'essai
    if (currentUser.trialUsed) {
        alert("Vous avez déjà bénéficié d'une période d'essai gratuite.");
        return;
    }

    const trialEndDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 jours à partir de maintenant
    const trialData = {
        status: 'trial',
        startDate: new Date().toISOString(),
        endDate: trialEndDate.toISOString()
    };

    await update(ref(database, `users/${currentUser.id}`), {
        subscription: trialData,
        trialUsed: true // Marquer la période d'essai comme utilisée
    });

    if (currentUser) {
        currentUser.subscription = trialData;
        currentUser.trialUsed = true; // Mettre à jour la propriété trialUsed
        // Mettre à jour localStorage
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
    }

    checkUserRoleAndSubscription();
    alert("Période d'essai de 7 jours activée !");
    loadDashboardData(); // Rechargez les données pour mettre à jour le statut de l'abonnement
}

// Fonction pour afficher le formulaire de connexion
function showLoginForm() {
  registerFormContainer.style.display = "none";
  loginFormContainer.style.display = "block";
}



// Fonction pour vérifier et mettre à jour le statut de l'abonnement
async function checkAndUpdateSubscriptionStatus() {
    if (currentUser && currentUser.subscription) {
      const today = new Date();
      const subscriptionEndDate = new Date(currentUser.subscription.endDate);
  
      if (today > subscriptionEndDate) {
        // Abonnement expiré
        currentUser.subscription.status = "expired";
        await update(ref(database, `users/${currentUser.id}/subscription`), {
          status: "expired",
        });
  
        // Mettre à jour localStorage
        localStorage.setItem("currentUser", JSON.stringify(currentUser));
  
        // Alerter l'utilisateur
        alert(
          "Votre abonnement a expiré. Veuillez renouveler votre abonnement pour continuer à utiliser les fonctionnalités premium."
        );
  
        checkUserRoleAndSubscription(); // Mettre à jour l'interface utilisateur
      } else {
        // Vérifier si l'abonnement expire bientôt (par exemple, dans 2 jours)
        const daysUntilExpiration = Math.round(
          (subscriptionEndDate - today) / (1000 * 60 * 60 * 24)
        );
        if (daysUntilExpiration <= 2) {
          alert(
            `Votre abonnement expirera dans ${daysUntilExpiration} jour(s). Pensez à le renouveler.`
          );
        }
      }
    }
  }

  function checkUserRoleAndSubscription() {
    if (currentUser) {
      // Vérifier le rôle
      const isAdmin = currentUser.role === "admin";
      const addProprietaireBtn = document.getElementById("add-proprietaire-btn");
      const addMaisonBtn = document.getElementById("add-maison-btn");
      const addLocataireBtn = document.getElementById("add-locataire-btn");
      const addSouscriptionBtn = document.getElementById("add-souscription-btn");
      const addRecouvrementBtn = document.getElementById("add-recouvrement-btn");
  
      if (addProprietaireBtn) {
        addProprietaireBtn.style.display = isAdmin ? "block" : "none";
      }
      if (addMaisonBtn) {
        addMaisonBtn.style.display = isAdmin ? "block" : "none";
      }
      if (addLocataireBtn) {
        addLocataireBtn.style.display = isAdmin ? "block" : "none";
      }
      if (addSouscriptionBtn) {
        addSouscriptionBtn.style.display = isAdmin ? "block" : "none";
      }
  
      if (addRecouvrementBtn) {
        addRecouvrementBtn.style.display = isAdmin ? "block" : "none";
      }
  
      // Vérifier l'abonnement
      const userSubscription = currentUser.subscription;
      const isSubscribed = userSubscription && (userSubscription.status === "active" || userSubscription.status === "trial");
      const subscribeBtn = document.getElementById("subscribe-monthly-btn");
      const subscribeAnnuelBtn = document.getElementById("subscribe-yearly-btn");
      const cancelSubscriptionBtn = document.getElementById("cancel-subscription-btn");
      const trialInfo = document.getElementById("trial-info");
      const startTrialBtn = document.getElementById("start-trial-btn");
  
      if (isSubscribed) {
        // Utilisateur abonné ou en période d'essai
        document.getElementById("abonnement-status-text").textContent = userSubscription.status === "trial" ? "Essai gratuit" : "Abonné";
        subscribeBtn.style.display = "none";
        subscribeAnnuelBtn.style.display = "none";
        cancelSubscriptionBtn.style.display = "block";
        trialInfo.style.display = "none";
        startTrialBtn.style.display = "none"; // Cacher le bouton de démarrage de l'essai
      } else {
        // Utilisateur non abonné
        document.getElementById("abonnement-status-text").textContent = "Non abonné";
        subscribeBtn.style.display = "block";
        subscribeAnnuelBtn.style.display = "block";
        cancelSubscriptionBtn.style.display = "none";
        trialInfo.style.display = "block";
        startTrialBtn.style.display = "block"; // Afficher le bouton de démarrage de l'essai
      }
  
      // Mettre à jour localStorage avec le statut de l'abonnement
      localStorage.setItem("currentUser", JSON.stringify(currentUser));
    }
  }

// Fonction pour hacher le mot de passe (méthode simple pour l'exemple)
function simpleHash(str) {
let hash = 0;
for (let i = 0; i < str.length; i++) {
const char = str.charCodeAt(i);
hash = (hash << 5) - hash + char;
hash |= 0; // Convertir en entier 32bit
}
return hash.toString();
}

// Fonction pour afficher l'interface utilisateur après la connexion
function showMainInterface() {
authSection.style.display = "none";
// Afficher les autres sections de l'application
// ...
}

// Fonction pour masquer la section d'authentification
function hideAuthSection() {
authSection.style.display = "none";
}

// Gestion des onglets
const tabs = document.querySelectorAll(".nav-button");
const contentSections = document.querySelectorAll(".content-section");

// Gestion des onglets
tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      const target = tab.dataset.target;
  
      // Vérifier l'accès avant de changer d'onglet
      checkUserAccess(target);
  
      // Mettre à jour l'état des boutons de navigation
      tabs.forEach(t => t.classList.remove("active"));
      tab.classList.add("active"); // Activer l'onglet cliqué

      // Recharger les données si nécessaire (en fonction de l'onglet)
      if (target === 'proprietaires') {
        loadProprietaires();
      } else if (target === 'maisons') {
        loadMaisons();
      } else if (target === 'locataires') {
        loadLocataires();
      } else if (target === 'souscriptions') {
        loadSouscriptions();
      } else if (target === 'recouvrements') {
        loadRecouvrements();
      } else if (target === 'dashboard'){
        loadDashboardData();
      }
    });
  });

// Fonctions pour afficher/masquer le chargement
function showLoading() {
document.getElementById("loading-overlay").style.display = "flex";
}

function hideLoading() {
document.getElementById("loading-overlay").style.display = "none";
}

// Gestion des formulaires d'ajout
const addProprietaireBtn = document.getElementById("add-proprietaire-btn");
const addMaisonBtn = document.getElementById("add-maison-btn");
const addLocataireBtn = document.getElementById("add-locataire-btn");
const addSouscriptionBtn = document.getElementById("add-souscription-btn");
const addRecouvrementBtn = document.getElementById("add-recouvrement-btn");

const addProprietaireForm = document.getElementById("add-proprietaire-form");
const addMaisonForm = document.getElementById("add-maison-form");
const addLocataireForm = document.getElementById("add-locataire-form");
const addSouscriptionForm = document.getElementById("add-souscription-form");
const addRecouvrementForm = document.getElementById("add-recouvrement-form");

const cancelProprietaireBtn = document.getElementById("cancel-proprietaire-btn");
const cancelMaisonBtn = document.getElementById("cancel-maison-btn");
const cancelLocataireBtn = document.getElementById("cancel-locataire-btn");
const cancelSouscriptionBtn = document.getElementById("cancel-souscription-btn");
const cancelRecouvrementBtn = document.getElementById("cancel-recouvrement-btn");

// Fonctions pour afficher/masquer les formulaires
function showForm(form) {
form.classList.add("active");
}

function hideForm(form) {
form.classList.remove("active");
form.reset();
}

// Événements pour afficher les formulaires
addProprietaireBtn.addEventListener("click", () => showForm(addProprietaireForm));
addMaisonBtn.addEventListener("click", () => showForm(addMaisonForm));
addLocataireBtn.addEventListener("click", () => showForm(addLocataireForm));
addSouscriptionBtn.addEventListener("click", () => showForm(addSouscriptionForm));
addRecouvrementBtn.addEventListener("click", () => showForm(addRecouvrementForm));

// Événements pour masquer les formulaires
cancelProprietaireBtn.addEventListener("click", () => hideForm(addProprietaireForm));
cancelMaisonBtn.addEventListener("click", () => hideForm(addMaisonForm));
cancelLocataireBtn.addEventListener("click", () => hideForm(addLocataireForm));
cancelSouscriptionBtn.addEventListener("click", () => hideForm(addSouscriptionForm));
cancelRecouvrementBtn.addEventListener("click", () => hideForm(addRecouvrementForm));

// Gestion du formulaire d'ajout de propriétaire
addProprietaireForm.addEventListener("submit", (event) => {
event.preventDefault();
showLoading();

const nom = document.getElementById("proprietaire-nom").value;
const prenom = document.getElementById("proprietaire-prenom").value;
const contact = document.getElementById("proprietaire-contact").value;
const email = document.getElementById("proprietaire-email").value;
const adresse = document.getElementById("proprietaire-adresse").value;

addProprietaire(nom, prenom, contact, email, adresse)
.then(() => {
    hideForm(addProprietaireForm);
    loadProprietaires(); // Recharger la liste
})
.catch((error) => {
    console.error("Erreur lors de l'ajout du propriétaire:", error);
    alert("Erreur lors de l'ajout du propriétaire.");
})
.finally(() => {
    hideLoading();
});
});

// Gestion du formulaire d'ajout de maison
addMaisonForm.addEventListener("submit", (event) => {
event.preventDefault();
showLoading();

const proprietaireId = document.getElementById("maison-proprietaire").value;
const type = document.getElementById("maison-type").value;
const pieces = parseInt(document.getElementById("maison-pieces").value);
const ville = document.getElementById("maison-ville").value;
const commune = document.getElementById("maison-commune").value;
const quartier = document.getElementById("maison-quartier").value;
const loyer = parseInt(document.getElementById("maison-loyer").value);

addMaison(proprietaireId, type, pieces, ville, commune, quartier, loyer)
.then(() => {
    hideForm(addMaisonForm);
    loadMaisons(); // Recharger la liste
})
.catch((error) => {
    console.error("Erreur lors de l'ajout de la maison:", error);
    alert("Erreur lors de l'ajout de la maison.");
})
.finally(() => {
    hideLoading();
});
});

// Gestion du formulaire d'ajout de locataire
addLocataireForm.addEventListener("submit", (event) => {
event.preventDefault();
showLoading();

const nom = document.getElementById("locataire-nom").value;
const prenom = document.getElementById("locataire-prenom").value;
const contact = document.getElementById("locataire-contact").value;
const email = document.getElementById("locataire-email").value;

addLocataire(nom, prenom, contact, email)
.then(() => {
    hideForm(addLocataireForm);
    loadLocataires(); // Recharger la liste
})
.catch((error) => {
    console.error("Erreur lors de l'ajout du locataire:", error);
    alert("Erreur lors de l'ajout du locataire.");
})
.finally(() => {
    hideLoading();
});
});

// Gestion du formulaire d'ajout de souscription
addSouscriptionForm.addEventListener("submit", (event) => {
event.preventDefault();
showLoading();

const maisonId = document.getElementById("souscription-maison").value;
const locataireId = document.getElementById("souscription-locataire").value;
const caution = parseInt(document.getElementById("souscription-caution").value);
const avance = parseInt(document.getElementById("souscription-avance").value);
const autres = document.getElementById("souscription-autres").value;
const dateDebut = document.getElementById("souscription-date-debut").value;

addSouscription(maisonId, locataireId, caution, avance, autres, dateDebut)
.then(() => {
    hideForm(addSouscriptionForm);
    loadSouscriptions(); // Recharger la liste
})
.catch((error) => {
    console.error("Erreur lors de l'ajout de la souscription:", error);
    alert("Erreur lors de l'ajout de la souscription.");
})
.finally(() => {
    hideLoading();
});
});

// Gestion du formulaire d'ajout de recouvrement
addRecouvrementForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  showLoading();

  const proprietaireId = document.getElementById("recouvrement-proprietaire").value;
  const maisonId = document.getElementById("recouvrement-maison").value;
  const locataireId = document.getElementById("recouvrement-locataire").value;
  const mois = document.getElementById("recouvrement-mois").value;
  const montant = parseInt(document.getElementById("recouvrement-montant").value);
  const statut = document.getElementById("recouvrement-statut").value;

  try {
    // Récupérer la souscription ID basée sur la maison et le locataire sélectionnés
    const souscriptionId = await findSouscriptionIdByMaisonAndLocataire(maisonId, locataireId);

    if (!souscriptionId) {
      throw new Error("Aucune souscription trouvée pour la maison et le locataire sélectionnés.");
    }

    await addRecouvrement(souscriptionId, mois, montant, statut);
    hideForm(addRecouvrementForm);
    loadRecouvrements(); // Recharger la liste des recouvrements
  } catch (error) {
    console.error("Erreur lors de l'ajout du recouvrement:", error);
    alert(error.message || "Erreur lors de l'ajout du recouvrement.");
  } finally {
    hideLoading();
  }
});

// Fonction pour rechercher l'ID de la souscription par maison et locataire
async function findSouscriptionIdByMaisonAndLocataire(maisonId, locataireId) {
    const souscriptionsRef = ref(database, 'souscriptions');
    const snapshot = await get(souscriptionsRef);
  
    if (snapshot.exists()) {
      const souscriptions = snapshot.val();
      for (const souscriptionId in souscriptions) {
        const souscription = souscriptions[souscriptionId];
        // Vérifier si la souscription appartient à l'utilisateur actuel et correspond à la maison et au locataire
        if (souscription.userId === currentUser.id && souscription.maison === maisonId && souscription.locataire === locataireId) {
          return souscriptionId;
        }
      }
    }
  
    return null; // Aucune souscription correspondante trouvée
  }

// ... (début du fichier script.js)

// Fonction pour récupérer et mettre à jour l'ID de l'utilisateur
async function getUserNextId() {
  if (!currentUser) {
    throw new Error("Aucun utilisateur connecté.");
  }

  const userCounterRef = ref(database, `users/${currentUser.id}/nextId`);
  const snapshot = await get(userCounterRef);
  let nextId;

  if (snapshot.exists()) {
    nextId = snapshot.val() + 1;
  } else {
    nextId = 1;
  }

  await set(userCounterRef, nextId);
  return nextId;
}

// Fonction pour ajouter un propriétaire (modifiée)
async function addProprietaire(nom, prenom, contact, email, adresse) {
  const proprietairesRef = ref(database, 'proprietaires');
  const newProprietaireRef = push(proprietairesRef);
  const itemId = await getUserNextId();
  await set(newProprietaireRef, {
    id: itemId,
    userId: currentUser.id,
    nom: nom,
    prenom: prenom,
    contact: contact,
    email: email || "", // Email vide si non fourni
    adresse: adresse
  });
}

async function addMaison(proprietaireId, type, pieces, ville, commune, quartier, loyer) {
  const maisonsRef = ref(database, 'maisons');
  const newMaisonRef = push(maisonsRef);
  const itemId = await getUserNextId(); // Obtenir l'ID unique pour l'utilisateur
  await set(newMaisonRef, {
    id: itemId,
    userId: currentUser.id,
    proprietaire: proprietaireId,
    type: type,
    pieces: pieces,
    ville: ville,
    commune: commune,
    quartier: quartier,
    loyer: loyer
  });
}

// Fonction pour ajouter un locataire (modifiée)
async function addLocataire(nom, prenom, contact, email) {
  const locatairesRef = ref(database, 'locataires');
  const newLocataireRef = push(locatairesRef);
  const itemId = await getUserNextId();
  await set(newLocataireRef, {
    id: itemId,
    userId: currentUser.id,
    nom: nom,
    prenom: prenom,
    contact: contact,
    email: email || "", // Email vide si non fourni
  });
}

async function addSouscription(maisonId, locataireId, caution, avance, autres, dateDebut) {
  const souscriptionsRef = ref(database, 'souscriptions');
  const newSouscriptionRef = push(souscriptionsRef);
  const itemId = await getUserNextId(); // Obtenir l'ID unique pour l'utilisateur
  const maisonRef = ref(database, `maisons/${maisonId}`);
  const maisonSnapshot = await get(maisonRef);
  const loyer = maisonSnapshot.val().loyer;

  await set(newSouscriptionRef, {
    id: itemId,
    userId: currentUser.id,
    maison: maisonId,
    locataire: locataireId,
    caution: caution,
    avance: avance,
    autres: autres,
    dateDebut: dateDebut,
    loyer: loyer
  });
}

async function addRecouvrement(souscriptionId, mois, montant, statut) {
  const recouvrementsRef = ref(database, 'recouvrements');
  const newRecouvrementRef = push(recouvrementsRef);
  const itemId = await getUserNextId(); // Obtenir l'ID unique pour l'utilisateur
  await set(newRecouvrementRef, {
    id: itemId,
    userId: currentUser.id,
    souscription: souscriptionId,
    mois: mois,
    montant: montant,
    statut: statut
  });
}

// Fonction pour formater les IDs
function formatItemId(itemId) {
    return itemId.toString().padStart(4, '0'); // Ajoute des zéros à gauche pour avoir 4 chiffres
  }
  
  function loadProprietaires() {
    showLoading();
    const proprietairesList = document.querySelector("#proprietaires-list tbody");
    proprietairesList.innerHTML = "";
  
    const proprietairesRef = ref(database, 'proprietaires');
    onValue(proprietairesRef, (snapshot) => {
      const proprietaires = snapshot.val();
      let proprietairesCount = 0;
      for (const proprietaireId in proprietaires) {
        const proprietaire = proprietaires[proprietaireId];
  
        // Vérifier si le propriétaire appartient à l'utilisateur actuel
        if (proprietaire.userId === currentUser.id) {
          proprietairesCount++;
          const row = document.createElement("tr");
          row.innerHTML = `
            <td class="clickable-id" data-type="proprietaires" data-id="${proprietaireId}">PROP-${formatItemId(proprietaire.id)}</td>
            <td>${proprietaire.nom}</td>
            <td>${proprietaire.prenom}</td>
            <td>${proprietaire.contact}</td>
            <td>${proprietaire.email}</td>
            <td>${proprietaire.adresse}</td>
            <td class="actions-cell">
              <button class="edit-btn" data-id="${proprietaireId}">Modifier</button>
              <button class="delete-btn" data-id="${proprietaireId}">Supprimer</button>
            </td>
          `;
          proprietairesList.appendChild(row);
        }
      }
      document.getElementById('dashboard-proprietaires-count').textContent = proprietairesCount;
      hideLoading();
    }, {
      onlyOnce: true
    });
  }
  

  function loadMaisons() {
    showLoading();
    const maisonsList = document.querySelector("#maisons-list tbody");
    maisonsList.innerHTML = "";
  
    const maisonsRef = ref(database, 'maisons');
    onValue(maisonsRef, (snapshot) => {
      const maisons = snapshot.val();
      let maisonsCount = 0;
  
      // Mettre à jour la liste déroulante des propriétaires
      const proprietaireSelect = document.getElementById("maison-proprietaire");
      proprietaireSelect.innerHTML = '<option value="">Sélectionner Propriétaire</option>';
      const proprietairesRef = ref(database, 'proprietaires');
      get(proprietairesRef).then((proprietairesSnapshot) => {
        const proprietaires = proprietairesSnapshot.val();
        for (const proprietaireId in proprietaires) {
          const proprietaire = proprietaires[proprietaireId];
          // Vérifier si le propriétaire appartient à l'utilisateur actuel
          if (proprietaire.userId === currentUser.id) {
            const option = document.createElement("option");
            option.value = proprietaireId;
            option.text = `${proprietaire.nom} ${proprietaire.prenom}`;
            proprietaireSelect.appendChild(option);
          }
        }
      });
  
      for (const maisonId in maisons) {
        const maison = maisons[maisonId];
  
        // Vérifier si la maison appartient à l'utilisateur actuel
        if (maison.userId === currentUser.id) {
          maisonsCount++;
          // Récupérer le nom du propriétaire
          get(ref(database, `proprietaires/${maison.proprietaire}`)).then((proprietaireSnapshot) => {
            const proprietaire = proprietaireSnapshot.val();
            const proprietaireNom = proprietaire ? `${proprietaire.nom} ${proprietaire.prenom}` : 'Propriétaire inconnu';
  
            const row = document.createElement("tr");
            row.innerHTML = `
                <td class="clickable-id" data-type="maisons" data-id="${maisonId}">MAIS-${formatItemId(maison.id)}</td>
                <td>${proprietaireNom}</td>
                <td>${maison.type}</td>
                <td>${maison.pieces}</td>
                <td>${maison.ville}, ${maison.commune}, ${maison.quartier}</td>
                <td>${maison.loyer}</td>
                <td class="actions-cell">
                <button class="edit-btn" data-id="${maisonId}">Modifier</button>
                <button class="delete-btn" data-id="${maisonId}">Supprimer</button>
                </td>
            `;
            maisonsList.appendChild(row);
          });
        }
      }
      document.getElementById('dashboard-maisons-count').textContent = maisonsCount;
      hideLoading();
    }, {
      onlyOnce: true
    });
  }
  

function loadLocataires() {
  showLoading();
  const locatairesList = document.querySelector("#locataires-list tbody");
  locatairesList.innerHTML = "";

  const locatairesRef = ref(database, 'locataires');
  onValue(locatairesRef, (snapshot) => {
    const locataires = snapshot.val();
    let locatairesCount = 0;
    for (const locataireId in locataires) {
      const locataire = locataires[locataireId];

      // Vérifier si le locataire appartient à l'utilisateur actuel
      if (locataire.userId === currentUser.id) {
        locatairesCount++;
        const row = document.createElement("tr");
        row.innerHTML = `
            <td class="clickable-id" data-type="locataires" data-id="${locataireId}">LOC-${formatItemId(locataire.id)}</td>
            <td>${locataire.nom}</td>
            <td>${locataire.prenom}</td>
            <td>${locataire.contact}</td>
            <td>${locataire.email}</td>
            <td class="actions-cell">
                <button class="edit-btn" data-id="${locataireId}">Modifier</button>
                <button class="delete-btn" data-id="${locataireId}">Supprimer</button>
            </td>
        `;
        locatairesList.appendChild(row);
      }
    }
    document.getElementById('dashboard-locataires-count').textContent = locatairesCount;
    hideLoading();
  }, {
    onlyOnce: true
  });
}

function loadSouscriptions() {
  showLoading();
  const souscriptionsList = document.querySelector("#souscriptions-list tbody");
  souscriptionsList.innerHTML = "";

  // Mettre à jour la liste déroulante des maisons
  const maisonSelect = document.getElementById("souscription-maison");
  maisonSelect.innerHTML = '<option value="">Sélectionner Maison</option>';
  const maisonsRef = ref(database, 'maisons');
  get(maisonsRef).then((maisonsSnapshot) => {
    const maisons = maisonsSnapshot.val();
    for (const maisonId in maisons) {
      const maison = maisons[maisonId];
      // Vérifier si la maison appartient à l'utilisateur actuel
      if (maison.userId === currentUser.id) {
        const option = document.createElement("option");
        option.value = maisonId;
        // Utiliser l'ID formaté pour l'affichage dans la liste déroulante
        option.text = `MAIS-${formatItemId(maison.id)} - ${maison.ville}, ${maison.commune}, ${maison.quartier}`;
        maisonSelect.appendChild(option);
      }
    }
  });

  // Mettre à jour la liste déroulante des locataires
  const locataireSelect = document.getElementById("souscription-locataire");
  locataireSelect.innerHTML = '<option value="">Sélectionner Locataire</option>';
  const locatairesRef = ref(database, 'locataires');
  get(locatairesRef).then((locatairesSnapshot) => {
    const locataires = locatairesSnapshot.val();
    for (const locataireId in locataires) {
      const locataire = locataires[locataireId];
      // Vérifier si le locataire appartient à l'utilisateur actuel
      if (locataire.userId === currentUser.id) {
        const option = document.createElement("option");
        option.value = locataireId;
        option.text = `${locataire.nom} ${locataire.prenom}`;
        locataireSelect.appendChild(option);
      }
    }
  });

  const souscriptionsRef = ref(database, 'souscriptions');
  onValue(souscriptionsRef, (snapshot) => {
    const souscriptions = snapshot.val();
    let souscriptionsCount = 0;
    for (const souscriptionId in souscriptions) {
      const souscription = souscriptions[souscriptionId];

      // Vérifier si la souscription appartient à l'utilisateur actuel
      if (souscription.userId === currentUser.id) {
        souscriptionsCount++;
        // Récupérer les informations de la maison et du locataire
        Promise.all([
          get(ref(database, `maisons/${souscription.maison}`)),
          get(ref(database, `locataires/${souscription.locataire}`))
        ]).then(([maisonSnapshot, locataireSnapshot]) => {
          const maison = maisonSnapshot.val();
          const locataire = locataireSnapshot.val();

          const row = document.createElement("tr");
          row.innerHTML = `
            <td class="clickable-id" data-type="maisons" data-id="${souscription.maison}">MAIS-${formatItemId(maison.id)}</td>
            <td class="clickable-id" data-type="locataires" data-id="${souscription.locataire}">LOC-${formatItemId(locataire.id)}</td>
            <td>${souscription.caution}</td>
            <td>${souscription.avance}</td>
            <td>${souscription.autres}</td>
            <td>${souscription.dateDebut}</td>
            <td>${souscription.loyer}</td>
            <td class="actions-cell">
                <button class="edit-btn" data-id="${souscriptionId}">Modifier</button>
                <button class="delete-btn" data-id="${souscriptionId}">Supprimer</button>
            </td>
        `;
        souscriptionsList.appendChild(row);
      });
    }
    document.getElementById('dashboard-souscriptions-count').textContent = souscriptionsCount;
    hideLoading();
  }}, {
    onlyOnce: true
  });
}

function loadRecouvrements() {
    showLoading();
    const recouvrementsList = document.querySelector("#recouvrements-list tbody");
    recouvrementsList.innerHTML = "";
  
    // Mettre à jour les listes déroulantes du formulaire de recouvrement
    const proprietaireSelect = document.getElementById("recouvrement-proprietaire");
    const maisonSelect = document.getElementById("recouvrement-maison");
    const locataireSelect = document.getElementById("recouvrement-locataire");
  
    proprietaireSelect.innerHTML = '<option value="">Sélectionner Propriétaire</option>';
    maisonSelect.innerHTML = '<option value="">Sélectionner Maison</option>';
    locataireSelect.innerHTML = '<option value="">Sélectionner Locataire</option>';
  
    const proprietairesRef = ref(database, 'proprietaires');
    const maisonsRef = ref(database, 'maisons');
    const locatairesRef = ref(database, 'locataires');
  
    get(proprietairesRef).then((proprietairesSnapshot) => {
      const proprietaires = proprietairesSnapshot.val();
      for (const proprietaireId in proprietaires) {
        const proprietaire = proprietaires[proprietaireId];
        if (proprietaire.userId === currentUser.id) {
          const option = document.createElement("option");
          option.value = proprietaireId;
          option.text = `${proprietaire.nom} ${proprietaire.prenom}`;
          proprietaireSelect.appendChild(option);
        }
      }
    });
  
    // Écouter les changements de sélection du propriétaire
    proprietaireSelect.addEventListener('change', () => {
      const selectedProprietaireId = proprietaireSelect.value;
      maisonSelect.innerHTML = '<option value="">Sélectionner Maison</option>'; // Réinitialiser la liste des maisons
      locataireSelect.innerHTML = '<option value="">Sélectionner Locataire</option>'; // Réinitialiser la liste des locataires
  
      if (selectedProprietaireId) {
        get(maisonsRef).then((maisonsSnapshot) => {
          const maisons = maisonsSnapshot.val();
          for (const maisonId in maisons) {
            const maison = maisons[maisonId];
            if (maison.userId === currentUser.id && maison.proprietaire === selectedProprietaireId) {
              const option = document.createElement("option");
              option.value = maisonId;
              option.text = `MAIS-${formatItemId(maison.id)} - ${maison.ville}, ${maison.commune}, ${maison.quartier}`;
              maisonSelect.appendChild(option);
            }
          }
        });
      }
    });
  
 // Écouter les changements de sélection de la maison
maisonSelect.addEventListener('change', () => {
    const selectedMaisonId = maisonSelect.value;
    locataireSelect.innerHTML = '<option value="">Sélectionner Locataire</option>'; // Réinitialiser la liste des locataires
  
    if (selectedMaisonId) {
      // Récupérer les souscriptions pour la maison sélectionnée
      const souscriptionsRef = ref(database, 'souscriptions');
      get(souscriptionsRef).then((souscriptionsSnapshot) => {
        const souscriptions = souscriptionsSnapshot.val();
        const locatairesIds = new Set(); // Utiliser un Set pour éviter les doublons
  
        for (const souscriptionId in souscriptions) {
          const souscription = souscriptions[souscriptionId];
          if (souscription.userId === currentUser.id && souscription.maison === selectedMaisonId) {
            locatairesIds.add(souscription.locataire);
          }
        }
  
        // Récupérer les informations des locataires uniques
        get(locatairesRef).then((locatairesSnapshot) => {
          const locataires = locatairesSnapshot.val();
          locatairesIds.forEach(locataireId => {
            const locataire = locataires[locataireId];
            if (locataire) {
              const option = document.createElement("option");
              option.value = locataireId;
              option.text = `${locataire.nom} ${locataire.prenom}`;
              locataireSelect.appendChild(option);
            }
          });
        });
      });
    }
  });
  
    const recouvrementsRef = ref(database, 'recouvrements');
    onValue(recouvrementsRef, (snapshot) => {
      const recouvrements = snapshot.val();
      for (const recouvrementId in recouvrements) {
        const recouvrement = recouvrements[recouvrementId];
  
        // Vérifier si le recouvrement appartient à l'utilisateur actuel
        if (recouvrement.userId === currentUser.id) {
          get(ref(database, `souscriptions/${recouvrement.souscription}`))
            .then((souscriptionSnapshot) => {
              const souscription = souscriptionSnapshot.val();
  
              // Vérifier si la souscription existe
              if (souscription) {
                const row = document.createElement("tr");
                row.innerHTML = `
                  <td class="clickable-id" data-type="souscriptions" data-id="${recouvrement.souscription}">SOUS-${formatItemId(souscription.id)}</td>
                  <td>${recouvrement.mois}</td>
                  <td>${recouvrement.montant}</td>
                  <td>${recouvrement.statut}</td>
                  <td class="actions-cell">
                    <button class="edit-btn" data-id="${recouvrementId}">Modifier</button>
                    <button class="delete-btn" data-id="${recouvrementId}">Supprimer</button>
                  </td>
                `;
                recouvrementsList.appendChild(row);
              }
            });
        }
      }
      hideLoading();
    }, {
      onlyOnce: true
    });
  }

// Délégation d'événements pour les boutons "Modifier" et "Supprimer"
document.querySelector("#proprietaires-list tbody").addEventListener("click", handleEditDelete);
document.querySelector("#maisons-list tbody").addEventListener("click", handleEditDelete);
document.querySelector("#locataires-list tbody").addEventListener("click", handleEditDelete);
document.querySelector("#souscriptions-list tbody").addEventListener("click", handleEditDelete);
document.querySelector("#recouvrements-list tbody").addEventListener("click", handleEditDelete);

function handleEditDelete(event) {
  const target = event.target;
  if (target.classList.contains("edit-btn")) {
    const itemId = target.dataset.id;
    const itemType = target.closest(".content-section").id;

    // **Exemple pour les propriétaires** (à adapter pour les autres types)
    if (itemType === "proprietaires") {
      const proprietaireRef = ref(database, `proprietaires/${itemId}`);
      get(proprietaireRef).then((snapshot) => {
        const proprietaire = snapshot.val();

        // Remplir un formulaire de modification avec les données actuelles
        const editForm = document.createElement("form");
        editForm.innerHTML = `
          <h3>Modifier le propriétaire</h3>
          <input type="text" id="edit-nom" value="${proprietaire.nom}" required>
          <input type="text" id="edit-prenom" value="${proprietaire.prenom}" required>
          <input type="tel" id="edit-contact" value="${proprietaire.contact}" required>
          <input type="email" id="edit-email" value="${proprietaire.email}" required>
          <input type="text" id="edit-adresse" value="${proprietaire.adresse}" required>
          <button type="submit" class="submit-btn">Enregistrer</button>
          <button type="button" class="cancel-btn">Annuler</button>
        `;

        // Afficher le formulaire (vous pouvez l'ajouter à la place du bouton "Modifier", par exemple)
        target.parentNode.replaceChild(editForm, target);

        // Gérer la soumission du formulaire de modification
        editForm.addEventListener("submit", (event) => {
          event.preventDefault();
          showLoading();

          const updatedProprietaire = {
            nom: document.getElementById("edit-nom").value,
            prenom: document.getElementById("edit-prenom").value,
            contact: document.getElementById("edit-contact").value,
            email: document.getElementById("edit-email").value,
            adresse: document.getElementById("edit-adresse").value,
          };

          // Mettre à jour les données dans Firebase
          update(proprietaireRef, updatedProprietaire)
            .then(() => {
              // Recharger les données après la modification
              loadProprietaires();
              alert("Propriétaire modifié avec succès !");
            })
            .catch((error) => {
              console.error("Erreur lors de la modification du propriétaire:", error);
              alert("Erreur lors de la modification du propriétaire.");
            })
            .finally(() => {
              hideLoading();
            });
        });

        // Gérer l'annulation
        editForm.querySelector(".cancel-btn").addEventListener("click", () => {
          // Rétablir le bouton "Modifier"
          editForm.parentNode.replaceChild(target, editForm);
        });
      });
    }
  } else if (target.classList.contains("delete-btn")) {
    const itemId = target.dataset.id;
    const itemType = target.closest(".content-section").id;
    deleteItem(itemType, itemId);
  }
}

// Fonction pour supprimer un élément
async function deleteItem(itemType, itemId) {
  showLoading();
  try {
    const itemRef = ref(database, `${itemType}/${itemId}`);
    await remove(itemRef);
    // Recharger la liste après la suppression
    if (itemType === 'proprietaires') {
      loadProprietaires();
    } else if (itemType === 'maisons') {
      loadMaisons();
    } else if (itemType === 'locataires') {
      loadLocataires();
    } else if (itemType === 'souscriptions') {
      loadSouscriptions();
    } else if (itemType === 'recouvrements') {
      loadRecouvrements();
    }
  } catch (error) {
    console.error(`Erreur lors de la suppression de ${itemType}:`, error);
    alert(`Erreur lors de la suppression de ${itemType}.`);
  } finally {
    hideLoading();
  }
}

// Gestion des abonnements
const subscribeMonthlyBtn = document.getElementById("subscribe-monthly-btn");
const subscribeYearlyBtn = document.getElementById("subscribe-yearly-btn");
const cancelSubscriptionBtn = document.getElementById("cancel-subscription-btn");
const startTrialBtn = document.getElementById("start-trial-btn");

// Abonnement mensuel
subscribeMonthlyBtn.addEventListener("click", () => {
  handleSubscription("monthly");
});

// Abonnement annuel
subscribeYearlyBtn.addEventListener("click", () => {
  handleSubscription("yearly");
});

// Gestionnaire d'événement pour le bouton d'essai gratuit
startTrialBtn.addEventListener("click", startTrial);

async function handleSubscription(subscriptionType) {
  // Vérifier si l'utilisateur a déjà un abonnement actif
  if (
    currentUser &&
    currentUser.subscription &&
    currentUser.subscription.status === "active"
  ) {
    alert("Vous avez déjà un abonnement actif.");
    return;
  }

  const amount = subscriptionType === "monthly" ? 1000 : 10000; // Correction: 1000 pour mensuel
  const description =
    subscriptionType === "monthly"
      ? "Abonnement mensuel à la plateforme de gestion locative"
      : "Abonnement annuel à la plateforme de gestion locative";

  showLoading();
  FedaPay.init({
    public_key: "pk_live_TfSz212W0xSMKK7oPEogkFmp", // Remplacez par votre clé publique Fedapay
    transaction: {
      amount: amount,
      description: description,
    },
    customer: {
      email: "user@example.com", // Remplacez par l'email de l'utilisateur
    },
    onComplete: async function (transaction) {
      // Utilise transaction.reason pour obtenir la raison
      if (transaction.reason === FedaPay.CHECKOUT_COMPLETED) {
        // Calculer la date d'expiration
        const startDate = new Date();
        const endDate = new Date(
          subscriptionType === "monthly"
            ? startDate.getTime() + 30 * 24 * 60 * 60 * 1000
            : startDate.getTime() + 365 * 24 * 60 * 60 * 1000
        );

        // Enregistrez l'abonnement dans la base de données Firebase
        const subscriptionData = {
          status: "active",
          type: subscriptionType,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        };
        await update(
          ref(database, `users/${currentUser.id}/subscription`),
          subscriptionData
        );

        // Mettre à jour l'état de l'utilisateur courant
        if (currentUser) {
          currentUser.subscription = subscriptionData;
          // Mettre à jour localStorage
          localStorage.setItem("currentUser", JSON.stringify(currentUser));
        }

        checkUserRoleAndSubscription();
        alert(
          `Abonnement ${
            subscriptionType === "monthly" ? "mensuel" : "annuel"
          } réussi!`
        );
        loadDashboardData();
      } else if (transaction.reason === FedaPay.DIALOG_DISMISSED) {
        alert("Paiement annulé.");
      } else {
        console.log("Transaction : ", transaction);
        alert("Erreur lors du paiement. Veuillez réessayer.");
      }
    },
  }).open();
  hideLoading();
}

// Fonction pour charger les données du tableau de bord
async function loadDashboardData() {
  if (!isAuthenticated) return;

  // Charger le nombre de propriétaires
  const proprietairesRef = ref(database, 'proprietaires');
  onValue(proprietairesRef, (snapshot) => {
    const proprietaires = snapshot.val();
    let proprietairesCount = 0;
    for (const proprietaireId in proprietaires) {
      if (proprietaires[proprietaireId].userId === currentUser.id) {
        proprietairesCount++;
      }
    }
    document.getElementById('dashboard-proprietaires-count').textContent = proprietairesCount;
  });

  // Charger le nombre de locataires
  const locatairesRef = ref(database, 'locataires');
  onValue(locatairesRef, (snapshot) => {
    const locataires = snapshot.val();
    let locatairesCount = 0;
    for (const locataireId in locataires) {
      if (locataires[locataireId].userId === currentUser.id) {
        locatairesCount++;
      }
    }
    document.getElementById('dashboard-locataires-count').textContent = locatairesCount;
  });

  // Charger le nombre de maisons
  const maisonsRef = ref(database, 'maisons');
  onValue(maisonsRef, (snapshot) => {
    const maisons = snapshot.val();
    let maisonsCount = 0;
    for (const maisonId in maisons) {
      if (maisons[maisonId].userId === currentUser.id) {
        maisonsCount++;
      }
    }
    document.getElementById('dashboard-maisons-count').textContent = maisonsCount;
  });

  // Charger le nombre de souscriptions
  const souscriptionsRef = ref(database, 'souscriptions');
  onValue(souscriptionsRef, (snapshot) => {
    const souscriptions = snapshot.val();
    let souscriptionsCount = 0;
    for (const souscriptionId in souscriptions) {
      if (souscriptions[souscriptionId].userId === currentUser.id) {
        souscriptionsCount++;
      }
    }
    document.getElementById('dashboard-souscriptions-count').textContent = souscriptionsCount;
  });

  // Charger le nombre d'abonnements actifs
  const usersRef = ref(database, 'users');
  onValue(usersRef, (snapshot) => {
    const users = snapshot.val();
    let activeSubscriptionsCount = 0;
    for (const userId in users) {
      const user = users[userId];
      if (user.subscription && user.subscription.status === 'active') {
        activeSubscriptionsCount++;
      }
    }
    document.getElementById('dashboard-abonnements-count').textContent = activeSubscriptionsCount;
  });
}

cancelSubscriptionBtn.addEventListener("click", async () => {
  if (currentUser && currentUser.subscription) {
    if (confirm("Êtes-vous sûr de vouloir annuler votre abonnement ?")) {
      // Mettre à jour le statut de l'abonnement dans Firebase
      await update(ref(database, `users/${currentUser.id}/subscription`), { status: 'cancelled' });

      // Mettre à jour l'état de l'utilisateur courant
      currentUser.subscription.status = 'cancelled';
      
      // Mettre à jour localStorage
      localStorage.setItem('currentUser', JSON.stringify(currentUser));

      checkUserRoleAndSubscription();

      alert('Abonnement annulé.');
      loadDashboardData(); // Rechargez les données pour mettre à jour le statut de l'abonnement
    }
  } else {
    alert('Vous n\'avez pas d\'abonnement actif à annuler.');
  }
});

// Fonction de déconnexion
function logout() {
  localStorage.removeItem('currentUser');
  localStorage.removeItem('isAuthenticated'); // Supprime l'état de connexion
  isAuthenticated = false;
  currentUser = null;
  // Rediriger vers la page de connexion ou actualiser la page
  window.location.href = 'index.html'; // Redirection vers la page de connexion
}

// Ajout d'un bouton de déconnexion (exemple)
const logoutButton = document.createElement('button');
logoutButton.id = 'logout-btn';
logoutButton.textContent = 'Déconnexion';
document.body.appendChild(logoutButton); // Ajoutez-le à l'endroit approprié dans votre HTML

// Gestionnaire d'événement pour la déconnexion
document.getElementById('logout-btn').addEventListener('click', logout);

function checkUserAccess(targetSectionId = null) {
  if (currentUser && currentUser.subscription && (currentUser.subscription.status === 'active' || currentUser.subscription.status === 'trial')) {
    // Utilisateur autorisé - ne rien faire
    if (targetSectionId) {
      // Afficher la section cible
      contentSections.forEach(s => s.classList.remove("active"));
      document.getElementById(targetSectionId).classList.add("active");
    }
  } else {
    // Utilisateur non autorisé - rediriger vers la section d'abonnement
    alert("Vous devez avoir un abonnement actif ou une période d'essai pour accéder à cette section.");
    contentSections.forEach(s => s.classList.remove("active"));
    document.getElementById("abonnements").classList.add("active"); // Afficher la section d'abonnement

    // Mettre à jour l'état du bouton de navigation "Abonnements"
    tabs.forEach(t => t.classList.remove("active"));
    const abonnementTab = document.querySelector('[data-target="abonnements"]');
    if (abonnementTab) {
      abonnementTab.classList.add("active");
    }
  }
}

// Fonctions pour exporter les tableaux
function exportTableToPDF(tableId, fileName) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const table = document.getElementById(tableId);
    
    doc.autoTable({ html: `#${tableId}` });
    doc.save(`${fileName}.pdf`);
}
  
function exportTableToExcel(tableId, fileName) {
    const table = document.getElementById(tableId);
    const wb = XLSX.utils.table_to_book(table, { sheet: "Sheet 1" });
    XLSX.writeFile(wb, `${fileName}.xlsx`);
}
  
function printTable(tableId) {
    const printWindow = window.open('', '_blank');
    const table = document.getElementById(tableId);
    const tableClone = table.cloneNode(true);
  
    // Retirer la colonne "Actions" pour l'impression
    const rows = tableClone.querySelectorAll('tr');
    rows.forEach(row => {
      const lastCell = row.lastElementChild;
      if (lastCell) {
        row.removeChild(lastCell);
      }
    });
  
    printWindow.document.write('<html><head><title>Impression du tableau</title>');
    printWindow.document.write('<style>table { border-collapse: collapse; width: 100%; } th, td { text-align: left; padding: 8px; border: 1px solid #ddd; }</style>');
    printWindow.document.write('</head><body>');
    printWindow.document.write(tableClone.outerHTML);
    printWindow.document.write('</body></html>');
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
}

// Ajout des gestionnaires d'événements pour l'exportation et l'impression
document.querySelectorAll('.export-pdf-btn').forEach(button => {
    button.addEventListener('click', () => {
        const tableId = button.closest('.content-section').querySelector('.data-table').id;
        const sectionTitle = button.closest('.content-section').querySelector('h2').textContent;
        exportTableToPDF(tableId, `${sectionTitle}`);
    });
});

document.querySelectorAll('.export-excel-btn').forEach(button => {
    button.addEventListener('click', () => {
        const tableId = button.closest('.content-section').querySelector('.data-table').id;
        const sectionTitle = button.closest('.content-section').querySelector('h2').textContent;
        exportTableToExcel(tableId, `${sectionTitle}`);
    });
});

document.querySelectorAll('.print-btn').forEach(button => {
    button.addEventListener('click', () => {
        const tableId = button.closest('.content-section').querySelector('.data-table').id;
        printTable(tableId);
    });
});

// Fonction pour afficher la fenêtre modale avec les détails
function showDetailsModal(details) {
    const modal = document.getElementById("details-modal");
    const detailsContent = document.getElementById("modal-details-content");
    detailsContent.innerHTML = details;
    modal.style.display = "block";
}

// ... (autres fonctions)

// Fonction pour récupérer et afficher les détails en fonction de l'ID et du type
function fetchAndDisplayDetails(itemType, itemId) {
  showLoading();
  const itemRef = ref(database, `${itemType}/${itemId}`);
  get(itemRef).then((snapshot) => {
      if (snapshot.exists()) {
          const item = snapshot.val();
          let detailsHTML = '';

          if (itemType === 'proprietaires') {
              detailsHTML = `
                  <p><strong>ID:</strong> ${formatItemId(item.id)}</p>
                  <p><strong>Nom:</strong> ${item.nom}</p>
                  <p><strong>Prénom:</strong> ${item.prenom}</p>
                  <p><strong>Contact:</strong> ${item.contact}</p>
                  <p><strong>Email:</strong> ${item.email}</p>
                  <p><strong>Adresse:</strong> ${item.adresse}</p>
              `;
          } else if (itemType === 'maisons') {
              get(ref(database, `proprietaires/${item.proprietaire}`)).then((proprietaireSnapshot) => {
                  const proprietaire = proprietaireSnapshot.val();
                  detailsHTML = `
                      <p><strong>ID:</strong> ${formatItemId(item.id)}</p>
                      <p><strong>Propriétaire:</strong> ${proprietaire ? proprietaire.nom + ' ' + proprietaire.prenom : 'Inconnu'} (ID: ${proprietaire? formatItemId(proprietaire.id) : 'Inconnu'})</p>
                      <p><strong>Type:</strong> ${item.type}</p>
                      <p><strong>Pièces:</strong> ${item.pieces}</p>
                      <p><strong>Ville:</strong> ${item.ville}</p>
                      <p><strong>Commune:</strong> ${item.commune}</p>
                      <p><strong>Quartier:</strong> ${item.quartier}</p>
                      <p><strong>Loyer:</strong> ${item.loyer}</p>
                  `;
                  showDetailsModal(detailsHTML);
              });
              return; // Arrêter l'exécution ici pour éviter d'appeler showDetailsModal deux fois
          } else if (itemType === 'locataires') {
              detailsHTML = `
                  <p><strong>ID:</strong> ${formatItemId(item.id)}</p>
                  <p><strong>Nom:</strong> ${item.nom}</p>
                  <p><strong>Prénom:</strong> ${item.prenom}</p>
                  <p><strong>Contact:</strong> ${item.contact}</p>
                  <p><strong>Email:</strong> ${item.email}</p>
              `;
          } else if (itemType === 'souscriptions') {
              Promise.all([
                  get(ref(database, `maisons/${item.maison}`)),
                  get(ref(database, `locataires/${item.locataire}`))
              ]).then(([maisonSnapshot, locataireSnapshot]) => {
                  const maison = maisonSnapshot.val();
                  const locataire = locataireSnapshot.val();
                  detailsHTML = `
                      <p><strong>ID Souscription:</strong> ${formatItemId(item.id)}</p>
                      <p><strong>Maison:</strong> ${maison ? maison.ville + ', ' + maison.commune + ', ' + maison.quartier : 'Inconnue'} (ID: ${maison ? formatItemId(maison.id): 'Inconnue'})</p>
                      <p><strong>Locataire:</strong> ${locataire ? locataire.nom + ' ' + locataire.prenom : 'Inconnu'} (ID: ${locataire ? formatItemId(locataire.id) : 'Inconnu'})</p>
                      <p><strong>Caution:</strong> ${item.caution}</p>
                      <p><strong>Avance:</strong> ${item.avance}</p>
                      <p><strong>Autres:</strong> ${item.autres}</p>
                      <p><strong>Date d'entrée:</strong> ${item.dateDebut}</p>
                      <p><strong>Loyer:</strong> ${item.loyer}</p>
                  `;
                  showDetailsModal(detailsHTML);
              });
              return; // Arrêter l'exécution ici pour éviter d'appeler showDetailsModal deux fois
          } else if (itemType === 'recouvrements') {
              get(ref(database, `souscriptions/${item.souscription}`)).then((souscriptionSnapshot) => {
                  const souscription = souscriptionSnapshot.val();
                  if (souscription) {
                      Promise.all([
                          get(ref(database, `maisons/${souscription.maison}`)),
                          get(ref(database, `locataires/${souscription.locataire}`))
                      ]).then(([maisonSnapshot, locataireSnapshot]) => {
                          const maison = maisonSnapshot.val();
                          const locataire = locataireSnapshot.val();
                          detailsHTML = `
                              <p><strong>ID Recouvrement:</strong> ${formatItemId(item.id)}</p>
                              <p><strong>Souscription:</strong>  (ID: ${formatItemId(souscription.id)})</p>
                              <p><strong>Maison:</strong> ${maison ? maison.ville + ', ' + maison.commune + ', ' + maison.quartier : 'Inconnue'} (ID: ${maison ? formatItemId(maison.id): 'Inconnue'})</p>
                              <p><strong>Locataire:</strong> ${locataire ? locataire.nom + ' ' + locataire.prenom : 'Inconnu'} (ID: ${locataire ? formatItemId(locataire.id) : 'Inconnu'})</p>
                              <p><strong>Mois:</strong> ${item.mois}</p>
                              <p><strong>Montant:</strong> ${item.montant}</p>
                              <p><strong>Statut:</strong> ${item.statut}</p>
                          `;
                          showDetailsModal(detailsHTML);
                      });
                  } else {
                      detailsHTML = `<p>Souscription non trouvée.</p>`;
                      showDetailsModal(detailsHTML);
                  }
              });
              return; // Arrêter l'exécution ici pour éviter d'appeler showDetailsModal deux fois
          }

          showDetailsModal(detailsHTML);
      } else {
          showDetailsModal(`<p>Aucun détail trouvé pour cet ID.</p>`);
      }
  }).catch((error) => {
      console.error("Erreur lors de la récupération des détails:", error);
      showDetailsModal(`<p>Erreur lors de la récupération des détails.</p>`);
  }).finally(() => {
      hideLoading();
  });
}

// ... (autres fonctions)

// Gestionnaire d'événement pour fermer la fenêtre modale
document.querySelector(".close-modal").addEventListener("click", () => {
    document.getElementById("details-modal").style.display = "none";
});

// Délégation d'événements pour les clics sur les IDs
document.body.addEventListener("click", (event) => {
    if (event.target.classList.contains("clickable-id")) {
        const itemId = event.target.dataset.id;
        const itemType = event.target.dataset.type;
        fetchAndDisplayDetails(itemType, itemId);
    }
});

// Initialisation du chargement des données
function initializeDataLoad() {
  if (isAuthenticated) {
    checkUserRoleAndSubscription();
    checkAndUpdateSubscriptionStatus()
    loadDashboardData();
    loadProprietaires();
    loadMaisons();
    loadLocataires();
    loadSouscriptions();
    loadRecouvrements();
  }
}

// Appeler initializeDataLoad au chargement de la page
initializeDataLoad();
