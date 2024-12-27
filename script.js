import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getDatabase, ref, get, set, push, onValue, remove, update } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

// Firebase Configuration (Replace with your config)
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

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// Authentication State
let isAuthenticated = false;

// Authentication Management
const authSection = document.getElementById("auth-section");
const loginFormContainer = document.getElementById("login-form-container");
const registerFormContainer = document.getElementById("register-form-container");
const loginForm = document.getElementById("login-form");
const registerForm = document.getElementById("register-form");
const showRegisterLink = document.getElementById("show-register");
const showLoginLink = document.getElementById("show-login");

// Retrieve user data from localStorage on page load
let currentUser = null;

// Check if the user is already authenticated on page load
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
  // Display the authentication section if the user is not logged in
  authSection.style.display = "flex";
}
});

// Switch between login and registration forms
showRegisterLink.addEventListener("click", () => {
loginFormContainer.style.display = "none";
registerFormContainer.style.display = "block";
});

showLoginLink.addEventListener("click", () => {
registerFormContainer.style.display = "none";
loginFormContainer.style.display = "block";
});

// Registration
registerForm.addEventListener("submit", async (event) => {
event.preventDefault();
showLoading();
const username = document.getElementById("register-username").value;
const password = document.getElementById("register-password").value;

try {
  // Hash the password (simple example, use a more secure method in production)
  const hashedPassword = simpleHash(password);

  // Register the user in Firebase
  const usersRef = ref(database, 'users');
  const newUserRef = push(usersRef); // Create a new reference for the user
  await set(newUserRef, {
    id: newUserRef.key, // Save the auto-generated ID
    username: username,
    password: hashedPassword,
    role: 'user', // Assign a default role
    trialUsed: false // Add the trialUsed field initialized to false
  });

  alert("Inscription réussie !");
  registerForm.reset();
  showLoginForm(); // Display the login form after registration
} catch (error) {
  console.error("Erreur lors de l'inscription :", error);
  alert("Erreur lors de l'inscription.");
} finally {
  hideLoading();
}
});

// Login
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
      // Compare the hashed password
      if (user.username === username && user.password === simpleHash(password)) {
        // Store user information
        currentUser = {
          id: user.id, // Retrieve the ID
          username: user.username,
          role: user.role, // Retrieve the role
          subscription: user.subscription || {},
          trialUsed: user.trialUsed || false // Retrieve the trialUsed status
          // ... other information if needed ...
        };
        isAuthenticated = true;
        // Store user data in localStorage
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        localStorage.setItem('isAuthenticated', 'true'); // Store the connection status
        checkUserRoleAndSubscription();
        hideAuthSection();
        loadDashboardData();
        initializeDataLoad(); // Initialize data loading here
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

// Function to start the trial period
async function startTrial() {
  if (currentUser.subscription && currentUser.subscription.status === 'trial') {
    alert("Vous avez déjà une période d'essai en cours.");
    return;
  }

  // Check if the user has already used the trial period
  if (currentUser.trialUsed) {
      alert("Vous avez déjà bénéficié d'une période d'essai gratuite.");
      return;
  }

  const trialEndDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
  const trialData = {
      status: 'trial',
      startDate: new Date().toISOString(),
      endDate: trialEndDate.toISOString()
  };

  await update(ref(database, `users/${currentUser.id}`), {
      subscription: trialData,
      trialUsed: true // Mark the trial period as used
  });

  if (currentUser) {
      currentUser.subscription = trialData;
      currentUser.trialUsed = true; // Update the trialUsed property
      // Update localStorage
      localStorage.setItem('currentUser', JSON.stringify(currentUser));
  }

  checkUserRoleAndSubscription();
  alert("Période d'essai de 7 jours activée !");
  loadDashboardData(); // Reload data to update subscription status
}

// Function to display the login form
function showLoginForm() {
registerFormContainer.style.display = "none";
loginFormContainer.style.display = "block";
}



// Function to check and update subscription status
async function checkAndUpdateSubscriptionStatus() {
  if (currentUser && currentUser.subscription) {
    const today = new Date();
    const subscriptionEndDate = new Date(currentUser.subscription.endDate);

    if (today > subscriptionEndDate) {
      // Subscription expired
      currentUser.subscription.status = "expired";
      await update(ref(database, `users/${currentUser.id}/subscription`), {
        status: "expired",
      });

      // Update localStorage
      localStorage.setItem("currentUser", JSON.stringify(currentUser));

      // Alert the user
      alert(
        "Votre abonnement a expiré. Veuillez renouveler votre abonnement pour continuer à utiliser les fonctionnalités premium."
      );

      checkUserRoleAndSubscription(); // Update user interface
    } else {
      // Check if the subscription is about to expire (e.g., within 2 days)
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
    // Check the role
    const isAdmin = currentUser.role === "admin";
    const addProprietaireBtn = document.getElementById("add-proprietaire-btn");
    const addMaisonBtn = document.getElementById("add-maison-btn");
    const addLocataireBtn = document.getElementById("add-locataire-btn");
    const addSouscriptionBtn = document.getElementById("add-souscription-btn");
    const addRecouvrementBtn = document.getElementById("add-recouvrement-btn")
    
    

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
    

    // Check the subscription
    const userSubscription = currentUser.subscription;
    const isSubscribed = userSubscription && (userSubscription.status === "active" || userSubscription.status === "trial");
    const subscribeBtn = document.getElementById("subscribe-monthly-btn");
    const subscribeAnnuelBtn = document.getElementById("subscribe-yearly-btn");
    const cancelSubscriptionBtn = document.getElementById("cancel-subscription-btn");
    const trialInfo = document.getElementById("trial-info");
    const startTrialBtn = document.getElementById("start-trial-btn");

    if (isSubscribed) {
      // Subscribed user or in trial period
      document.getElementById("abonnement-status-text").textContent = userSubscription.status === "trial" ? "Essai gratuit" : "Abonné";
      subscribeBtn.style.display = "none";
      subscribeAnnuelBtn.style.display = "none";
      cancelSubscriptionBtn.style.display = "block";
      trialInfo.style.display = "none";
      startTrialBtn.style.display = "none"; // Hide the start trial button
    } else {
      // Unsubscribed user
      document.getElementById("abonnement-status-text").textContent = "Non abonné";
      subscribeBtn.style.display = "block";
      subscribeAnnuelBtn.style.display = "block";
      cancelSubscriptionBtn.style.display = "none";
      trialInfo.style.display = "block";
      startTrialBtn.style.display = "block"; // Show the start trial button
    }

    // Update localStorage with the subscription status
    localStorage.setItem("currentUser", JSON.stringify(currentUser));
  }
}

// Function to hash the password (simple method for the example)
function simpleHash(str) {
let hash = 0;
for (let i = 0; i < str.length; i++) {
  const char = str.charCodeAt(i);
  hash = (hash << 5) - hash + char;
  hash |= 0; // Convert to 32bit integer
}
return hash.toString();
}

// Function to display the user interface after login
function showMainInterface() {
authSection.style.display = "none";
// Display other sections of the application
// ...
}

// Function to hide the authentication section
function hideAuthSection() {
authSection.style.display = "none";
}

// Tab Management
const tabs = document.querySelectorAll(".nav-button");
const contentSections = document.querySelectorAll(".content-section");

// Tab Management
tabs.forEach(tab => {
  tab.addEventListener("click", () => {
    const target = tab.dataset.target;

    // Check access before switching tabs
    checkUserAccess(target);

    // Update the state of navigation buttons
    tabs.forEach(t => t.classList.remove("active"));
    tab.classList.add("active"); // Activate the clicked tab

    // Reload data if necessary (depending on the tab)
    if (target === 'proprietaires') {
      loadProprietaires();
    } else if (target === 'maisons') {
      loadMaisons();
    } else if (target === 'locataires') {
      loadLocataires();
    } else if (target === 'souscriptions') {
      loadSouscriptions();
    }  else if (target === 'dashboard'){
      loadDashboardData();
    } else if (target === 'recouvrements') {
        loadRecouvrements();
      }
  });
});

// Functions to show/hide loading
function showLoading() {
document.getElementById("loading-overlay").style.display = "flex";
}

function hideLoading() {
document.getElementById("loading-overlay").style.display = "none";
}

// Form Management
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

// Functions to show/hide forms
function showForm(form) {
form.classList.add("active");
}

function hideForm(form) {
form.classList.remove("active");
form.reset();
}

// Events to display forms
addProprietaireBtn.addEventListener("click", () => showForm(addProprietaireForm));
addMaisonBtn.addEventListener("click", () => showForm(addMaisonForm));
addLocataireBtn.addEventListener("click", () => showForm(addLocataireForm));
addSouscriptionBtn.addEventListener("click", () => showForm(addSouscriptionForm));
addRecouvrementBtn.addEventListener("click", () => showForm(addRecouvrementForm));

// Events to hide forms
cancelProprietaireBtn.addEventListener("click", () => hideForm(addProprietaireForm));
cancelMaisonBtn.addEventListener("click", () => hideForm(addMaisonForm));
cancelLocataireBtn.addEventListener("click", () => hideForm(addLocataireForm));
cancelSouscriptionBtn.addEventListener("click", () => hideForm(addSouscriptionForm));
cancelRecouvrementBtn.addEventListener("click", () => hideForm(addRecouvrementForm));

// Form submission handling
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
      loadProprietaires(); // Reload the list
  })
  .catch((error) => {
      console.error("Erreur lors de l'ajout du propriétaire:", error);
      alert("Erreur lors de l'ajout du propriétaire.");
  })
  .finally(() => {
      hideLoading();
  });
});

addMaisonForm.addEventListener("submit", (event) => {
event.preventDefault();
showLoading();

const proprietaireId = document.getElementById("maison-proprietaire").value;
const type = document.getElementById("maison-type").value;
const numero = document.getElementById("maison-numero").value;
const pieces = parseInt(document.getElementById("maison-pieces").value);
const ville = document.getElementById("maison-ville").value;
const commune = document.getElementById("maison-commune").value;
const quartier = document.getElementById("maison-quartier").value;
const loyer = parseInt(document.getElementById("maison-loyer").value);

addMaison(proprietaireId, type, numero, pieces, ville, commune, quartier, loyer)
  .then(() => {
      hideForm(addMaisonForm);
      loadMaisons(); // Reload the list
  })
  .catch((error) => {
    console.error("Erreur lors de l'ajout de la maison:", error);
    alert("Erreur lors de l'ajout de la maison.");
})
.finally(() => {
    hideLoading();
});
});

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
    loadLocataires(); // Reload the list
})
.catch((error) => {
    console.error("Erreur lors de l'ajout du locataire:", error);
    alert("Erreur lors de l'ajout du locataire.");
})
.finally(() => {
    hideLoading();
});
});

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
    loadSouscriptions(); // Reload the list
})
.catch((error) => {
    console.error("Erreur lors de l'ajout de la souscription:", error);
    alert("Erreur lors de l'ajout de la souscription.");
})
.finally(() => {
    hideLoading();
});
});

// Gestion de la soumission du formulaire de recouvrement
addRecouvrementForm.addEventListener("submit", (event) => {
    event.preventDefault();
    showLoading();

    const souscriptionId = document.getElementById("recouvrement-souscription").value;
    const montant = parseInt(document.getElementById("recouvrement-montant").value);
    const date = document.getElementById("recouvrement-date").value;
    const periode = document.getElementById("recouvrement-periode").value;
    const commentaire = document.getElementById("recouvrement-commentaire").value;

    addRecouvrement(souscriptionId, montant, date, periode, commentaire)
        .then(() => {
            hideForm(addRecouvrementForm);
            loadRecouvrements(); // Recharger la liste des recouvrements
        })
        .catch((error) => {
            console.error("Erreur lors de l'ajout du recouvrement:", error);
            alert("Erreur lors de l'ajout du recouvrement.");
        })
        .finally(() => {
            hideLoading();
        });
});

// Function to add a landlord
async function addProprietaire(nom, prenom, contact, email, adresse) {
const proprietairesRef = ref(database, 'proprietaires');
const newProprietaireRef = push(proprietairesRef);
await set(newProprietaireRef, {
  id: newProprietaireRef.key, // Use Firebase-generated key
  userId: currentUser.id,
  nom: nom,
  prenom: prenom,
  contact: contact,
  email: email || "", // Empty email if not provided
  adresse: adresse
});
}

async function addMaison(proprietaireId, type, numero, pieces, ville, commune, quartier, loyer) {
const maisonsRef = ref(database, 'maisons');
const newMaisonRef = push(maisonsRef);
await set(newMaisonRef, {
  id: newMaisonRef.key, // Use Firebase-generated key
  userId: currentUser.id,
  proprietaire: proprietaireId,
  type: type,
  numero: numero,
  pieces: pieces,
  ville: ville,
  commune: commune,
  quartier: quartier,
  loyer: loyer
});
}

// Function to add a tenant
async function addLocataire(nom, prenom, contact, email) {
const locatairesRef = ref(database, 'locataires');
const newLocataireRef = push(locatairesRef);
await set(newLocataireRef, {
  id: newLocataireRef.key, // Use Firebase-generated key
  userId: currentUser.id,
  nom: nom,
  prenom: prenom,
  contact: contact,
  email: email || "", // Empty email if not provided
});
}

async function addSouscription(maisonId, locataireId, caution, avance, autres, dateDebut) {
const souscriptionsRef = ref(database, 'souscriptions');
const newSouscriptionRef = push(souscriptionsRef);
const maisonRef = ref(database, `maisons/${maisonId}`);
const maisonSnapshot = await get(maisonRef);
const loyer = maisonSnapshot.val().loyer;

await set(newSouscriptionRef, {
  id: newSouscriptionRef.key, // Use Firebase-generated key
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

// Fonction pour ajouter un recouvrement
async function addRecouvrement(souscriptionId, montant, date, periode, commentaire) {
    const recouvrementsRef = ref(database, 'recouvrements');
    const newRecouvrementRef = push(recouvrementsRef);
    await set(newRecouvrementRef, {
        id: newRecouvrementRef.key,
        userId: currentUser.id,
        souscription: souscriptionId,
        montant: montant,
        date: date,
        periode: periode,
        commentaire: commentaire || ""
    });
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

    // Check if the landlord belongs to the current user
    if (proprietaire.userId === currentUser.id) {
      proprietairesCount++;
      const row = document.createElement("tr");
      row.innerHTML = `
        
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

  // Update the landlord dropdown list
  const proprietaireSelect = document.getElementById("maison-proprietaire");
  proprietaireSelect.innerHTML = '<option value="">Sélectionner Propriétaire</option>';
  const proprietairesRef = ref(database, 'proprietaires');
  get(proprietairesRef).then((proprietairesSnapshot) => {
    const proprietaires = proprietairesSnapshot.val();
    for (const proprietaireId in proprietaires) {
      const proprietaire = proprietaires[proprietaireId];
      // Check if the landlord belongs to the current user
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

    // Check if the house belongs to the current user
    if (maison.userId === currentUser.id) {
      maisonsCount++;
      // Retrieve the name of the landlord
      get(ref(database, `proprietaires/${maison.proprietaire}`)).then((proprietaireSnapshot) => {
        const proprietaire = proprietaireSnapshot.val();
        const proprietaireNom = proprietaire ? `${proprietaire.nom} ${proprietaire.prenom}` : 'Propriétaire inconnu';

        const row = document.createElement("tr");
        row.innerHTML = `
            
            <td>${proprietaireNom}</td>
            <td>${maison.type}</td>
            <td>${maison.numero}</td>
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

  // Check if the tenant belongs to the current user
  if (locataire.userId === currentUser.id) {
    locatairesCount++;
    const row = document.createElement("tr");
    row.innerHTML = `
        
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

// Update the house dropdown list
const maisonSelect = document.getElementById("souscription-maison");
maisonSelect.innerHTML = '<option value="">Sélectionner Maison</option>';
const maisonsRef = ref(database, 'maisons');
get(maisonsRef).then((maisonsSnapshot) => {
const maisons = maisonsSnapshot.val();
for (const maisonId in maisons) {
  const maison = maisons[maisonId];
  // Check if the house belongs to the current user
  if (maison.userId === currentUser.id) {
    const option = document.createElement("option");
    option.value = maisonId;
    // Use the formatted ID for display in the dropdown list
    option.text = `${maison.ville}, ${maison.commune}, ${maison.quartier}`;
    maisonSelect.appendChild(option);
  }
}
});

// Update the tenant dropdown list
const locataireSelect = document.getElementById("souscription-locataire");
locataireSelect.innerHTML = '<option value="">Sélectionner Locataire</option>';
const locatairesRef = ref(database, 'locataires');
get(locatairesRef).then((locatairesSnapshot) => {
const locataires = locatairesSnapshot.val();
for (const locataireId in locataires) {
  const locataire = locataires[locataireId];
  // Check if the tenant belongs to the current user
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

  // Check if the subscription belongs to the current user
  if (souscription.userId === currentUser.id) {
    souscriptionsCount++;
    // Retrieve house and tenant information
    Promise.all([
      get(ref(database, `maisons/${souscription.maison}`)),
      get(ref(database, `locataires/${souscription.locataire}`))
    ]).then(([maisonSnapshot, locataireSnapshot]) => {
      const maison = maisonSnapshot.val();
      const locataire = locataireSnapshot.val();

      const row = document.createElement("tr");
      row.innerHTML = `
        
        <td>${maison ? maison.ville + ', ' + maison.commune + ', ' + maison.quartier : 'Inconnue'}</td>
        <td>${locataire ? locataire.nom + ' ' + locataire.prenom : 'Inconnu'}</td>
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

// Fonction pour charger les recouvrements
function loadRecouvrements() {
    showLoading();
    const recouvrementsList = document.querySelector("#recouvrements-list tbody");
    recouvrementsList.innerHTML = "";

    // Mettre à jour la liste déroulante des souscriptions
    const souscriptionSelect = document.getElementById("recouvrement-souscription");
    souscriptionSelect.innerHTML = '<option value="">Sélectionner Souscription</option>';
    const souscriptionsRef = ref(database, 'souscriptions');
    get(souscriptionsRef).then((souscriptionsSnapshot) => {
        const souscriptions = souscriptionsSnapshot.val();
        for (const souscriptionId in souscriptions) {
            const souscription = souscriptions[souscriptionId];
            if (souscription.userId === currentUser.id) {
                const option = document.createElement("option");
                option.value = souscriptionId;
                get(ref(database, `maisons/${souscription.maison}`)).then((maisonSnapshot) => {
                    const maison = maisonSnapshot.val();
                    get(ref(database, `locataires/${souscription.locataire}`)).then((locataireSnapshot) => {
                        const locataire = locataireSnapshot.val();
                        option.text = `${locataire.nom} ${locataire.prenom} - ${maison.ville}, ${maison.commune}, ${maison.quartier}`;
                        souscriptionSelect.appendChild(option);
                    });
                });
            }
        }
    });

    const recouvrementsRef = ref(database, 'recouvrements');
    onValue(recouvrementsRef, (snapshot) => {
        const recouvrements = snapshot.val();
        let recouvrementCount = 0;
        let numero = 1;
        for (const recouvrementId in recouvrements) {
            const recouvrement = recouvrements[recouvrementId];
            if (recouvrement.userId === currentUser.id) {
                recouvrementCount++;
                get(ref(database, `souscriptions/${recouvrement.souscription}`)).then((souscriptionSnapshot) => {
                    const souscription = souscriptionSnapshot.val();
                    if (souscription) {
                        Promise.all([
                            get(ref(database, `locataires/${souscription.locataire}`)),
                            get(ref(database, `maisons/${souscription.maison}`))
                        ]).then(([locataireSnapshot, maisonSnapshot]) => {
                            const locataire = locataireSnapshot.val();
                            const maison = maisonSnapshot.val();
                            const row = document.createElement("tr");
                            row.innerHTML = `
                                <td>${numero}</td>
                                <td>${locataire ? locataire.nom + ' ' + locataire.prenom : 'Inconnu'}</td>
                                <td>${maison && maison.numero ? maison.numero : 'N/A'}</td>
                                <td>${souscription.loyer}</td>
                                <td>${recouvrement.periode}</td>
                                <td>${recouvrement.montant}</td>
                                <td>${recouvrement.date}</td>
                                <td>${recouvrement.commentaire}</td>
                                <td class="actions-cell">
                                    <button class="edit-btn" data-id="${recouvrementId}">Modifier</button>
                                    <button class="delete-btn" data-id="${recouvrementId}">Supprimer</button>
                                </td>
                            `;
                            recouvrementsList.appendChild(row);
                            numero++;
                        });
                    }
                });
            }
        }
        document.getElementById('dashboard-recouvrements-count').textContent = recouvrementCount;
        hideLoading();
    }, {
        onlyOnce: true
    });
}



// Event delegation for "Edit" and "Delete" buttons
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

  // **Example for landlords** (adapt for other types)
  if (itemType === "proprietaires") {
    const proprietaireRef = ref(database, `proprietaires/${itemId}`);
    get(proprietaireRef).then((snapshot) => {
      const proprietaire = snapshot.val();

      // Fill an edit form with the current data
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

      // Display the form (you can add it in place of the "Edit" button, for example)
      target.parentNode.replaceChild(editForm, target);

      // Handle the submission of the edit form
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

        // Update the data in Firebase
        update(proprietaireRef, updatedProprietaire)
          .then(() => {
            // Reload the data after editing
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

      // Handle the cancellation
      editForm.querySelector(".cancel-btn").addEventListener("click", () => {
        // Restore the "Edit" button
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

// Function to delete an item
async function deleteItem(itemType, itemId) {
showLoading();
try {
  const itemRef = ref(database, `${itemType}/${itemId}`);
  await remove(itemRef);
  // Reload the list after deletion
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

// Subscription Management
const subscribeMonthlyBtn = document.getElementById("subscribe-monthly-btn");
const subscribeYearlyBtn = document.getElementById("subscribe-yearly-btn");
const cancelSubscriptionBtn = document.getElementById("cancel-subscription-btn");
const startTrialBtn = document.getElementById("start-trial-btn");

// Monthly subscription
subscribeMonthlyBtn.addEventListener("click", () => {
handleSubscription("monthly");
});

// Annual subscription
subscribeYearlyBtn.addEventListener("click", () => {
handleSubscription("yearly");
});

// Event handler for the free trial button
startTrialBtn.addEventListener("click", startTrial);

async function handleSubscription(subscriptionType) {
// Check if the user already has an active subscription
if (
  currentUser &&
  currentUser.subscription &&
  currentUser.subscription.status === "active"
) {
  alert("Vous avez déjà un abonnement actif.");
  return;
}

const amount = subscriptionType === "monthly" ? 1000 : 10000; // Correction: 1000 for monthly
const description =
  subscriptionType === "monthly"
    ? "Abonnement mensuel à la plateforme de gestion locative"
    : "Abonnement annuel à la plateforme de gestion locative";

showLoading();
FedaPay.init({
  public_key: "pk_live_TfSz212W0xSMKK7oPEogkFmp", // Replace with your Fedapay public key
  transaction: {
    amount: amount,
    description: description,
  },
  customer: {
    email: "user@example.com", // Replace with the user's email
  },
  onComplete: async function (transaction) {
    // Use transaction.reason to get the reason
    if (transaction.reason === FedaPay.CHECKOUT_COMPLETED) {
      // Calculate the expiration date
      const startDate = new Date();
      const endDate = new Date(
        subscriptionType === "monthly"
          ? startDate.getTime() + 30 * 24 * 60 * 60 * 1000
          : startDate.getTime() + 365 * 24 * 60 * 60 * 1000
      );

      // Save the subscription in the Firebase database
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

      // Update the current user's status
      if (currentUser) {
        currentUser.subscription = subscriptionData;
        // Update localStorage
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

// Function to load dashboard data
async function loadDashboardData() {
if (!isAuthenticated) return;

// Load the number of landlords
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

// Load the number of tenants
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

// Load the number of houses
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

// Load the number of subscriptions
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

// Load the number of recouvremets
const recouvrementsRef = ref(database, 'recouvrements');
    onValue(recouvrementsRef, (snapshot) => {
        const recouvrements = snapshot.val();
        let recouvrementCount = 0;
        for (const recouvrementId in recouvrements) {
            if (recouvrements[recouvrementId].userId === currentUser.id) {
                recouvrementCount++;
            }
        }
        document.getElementById('dashboard-recouvrements-count').textContent = recouvrementCount;
    });

// Load the number of active subscriptions
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
    // Update the subscription status in Firebase
    await update(ref(database, `users/${currentUser.id}/subscription`), { status: 'cancelled' });

    // Update the current user's status
    currentUser.subscription.status = 'cancelled';
    
    // Update localStorage
    localStorage.setItem('currentUser', JSON.stringify(currentUser));

    checkUserRoleAndSubscription();

    alert('Abonnement annulé.');
    loadDashboardData(); // Reload data to update subscription status
  }
} else {
  alert('Vous n\'avez pas d\'abonnement actif à annuler.');
}
});

// Logout function
function logout() {
localStorage.removeItem('currentUser');
localStorage.removeItem('isAuthenticated'); // Remove connection status
isAuthenticated = false;
currentUser = null;
// Redirect to login page or refresh the page
window.location.href = 'index.html'; // Redirect to login page
}

// Add a logout button (example)
const logoutButton = document.createElement('button');
logoutButton.id = 'logout-btn';
logoutButton.textContent = 'Déconnexion';
document.body.appendChild(logoutButton); // Add it to the appropriate place in your HTML

// Event handler for logout
document.getElementById('logout-btn').addEventListener('click', logout);

function checkUserAccess(targetSectionId = null) {
if (currentUser && currentUser.subscription && (currentUser.subscription.status === 'active' || currentUser.subscription.status === 'trial')) {
  // Authorized user - do nothing
  if (targetSectionId) {
    // Display the target section
    contentSections.forEach(s => s.classList.remove("active"));
    document.getElementById(targetSectionId).classList.add("active");
  }
} else {
  // Unauthorized user - redirect to the subscription section
  alert("Vous devez avoir un abonnement actif ou une période d'essai pour accéder à cette section.");
  contentSections.forEach(s => s.classList.remove("active"));
  document.getElementById("abonnements").classList.add("active"); // Display the subscription section

  // Update the status of the "Subscriptions" navigation button
  tabs.forEach(t => t.classList.remove("active"));
  const abonnementTab = document.querySelector('[data-target="abonnements"]');
  if (abonnementTab) {
    abonnementTab.classList.add("active");
  }
}
}

// Functions to export tables
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

  // Remove the "Actions" column for printing
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

// Add event handlers for export and print
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

// Function to display the modal window with details
function showDetailsModal(details) {
  const modal = document.getElementById("details-modal");
  const detailsContent = document.getElementById("modal-details-content");
  detailsContent.innerHTML = details;
  modal.style.display = "block";
}

// Event handler to close the modal window
document.querySelector(".close-modal").addEventListener("click", () => {
  document.getElementById("details-modal").style.display = "none";
});

// Data loading initialization
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

// Call initializeDataLoad on page load
initializeDataLoad();