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
  
      // Check if the username already exists
      const usersRef = ref(database, 'users');
      const snapshot = await get(usersRef);
      if (snapshot.exists()) {
        const users = snapshot.val();
        for (const userId in users) {
          const user = users[userId];
          if (user.username === username) {
            alert("Ce nom d'utilisateur existe déjà. Veuillez en choisir un autre.");
            hideLoading();
            return;
          }
        }
      }
  
      // Register the user in Firebase
      const newUserRef = push(usersRef);
      await set(newUserRef, {
        id: newUserRef.key,
        username: username,
        password: hashedPassword,
        role: 'user',
      });
  
      alert("Inscription réussie !");
      registerForm.reset();
      showLoginForm();
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
    const isSubscribed = userSubscription && (userSubscription.status === "active");
    const subscribeBtn = document.getElementById("subscribe-monthly-btn");
    const subscribeAnnuelBtn = document.getElementById("subscribe-yearly-btn");
    const cancelSubscriptionBtn = document.getElementById("cancel-subscription-btn");

    if (isSubscribed) {
      // Subscribed user or in trial period
      document.getElementById("abonnement-status-text").textContent = "Abonné";
      subscribeBtn.style.display = "none";
      subscribeAnnuelBtn.style.display = "none";
      cancelSubscriptionBtn.style.display = "block";
    } else {
      // Unsubscribed user
      document.getElementById("abonnement-status-text").textContent = "Non abonné";
      subscribeBtn.style.display = "block";
      subscribeAnnuelBtn.style.display = "block";
      cancelSubscriptionBtn.style.display = "none";
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

// Gestion du formulaire d'ajout de maison
addMaisonForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    showLoading();

    const proprietaireId = document.getElementById("maison-proprietaire").value;
    const type = document.getElementById("maison-type").value;
    const type_construction = type === "autre" ? document.getElementById("nouveau-type-construction").value : type;
    const numero = document.getElementById("maison-numero").value;
    const pieces = parseInt(document.getElementById("maison-pieces").value);
    const ville = document.getElementById("maison-ville").value;
    const commune = document.getElementById("maison-commune").value;
    const quartier = document.getElementById("maison-quartier").value;
    const loyer = parseInt(document.getElementById("maison-loyer").value);
    const media = document.getElementById("maison-media").value;
    const latitude = document.getElementById("maison-latitude").value;
    const longitude = document.getElementById("maison-longitude").value;

    // Ajouter la maison
    addMaison(proprietaireId, type_construction, numero, pieces, ville, commune, quartier, loyer, media, latitude, longitude)
        .then(() => {
            hideForm(addMaisonForm);
            loadMaisons();
        })
        .catch((error) => {
            console.error("Erreur lors de l'ajout de la maison:", error);
            alert("Erreur lors de l'ajout de la maison.");
        })
        .finally(() => {
            hideLoading();
        });
});

// Fonction pour ajouter un nouveau type de construction à la base de données pour un utilisateur spécifique
async function addNewConstructionTypeForUser(userId, newType) {
    const userTypesRef = ref(database, `users/${userId}/typesConstruction`);
    const newTypeRef = push(userTypesRef);
    await set(newTypeRef, {
      nom: newType
    });
  }
  
  // Mettre à jour la liste des types de construction lors du chargement de la page et pour l'utilisateur connecté
  function loadConstructionTypesForUser(userId) {
    const userTypesRef = ref(database, `users/${userId}/typesConstruction`);
    onValue(userTypesRef, (snapshot) => {
      const types = snapshot.val();
      const typeSelect = document.getElementById("maison-type");
      // Effacer les options existantes sauf la première (et "Autre")
      while (typeSelect.options.length > 2) {
        typeSelect.remove(2);
      }
      for (const typeId in types) {
        const type = types[typeId];
        // Vérifier si l'option existe déjà avant de l'ajouter
        if (!typeSelect.querySelector(`option[value="${type.nom}"]`)) {
          const option = document.createElement("option");
          option.value = type.nom;
          option.text = type.nom;
          typeSelect.add(option);
        }
      }
    }, {
      onlyOnce: true
    });
  }
  
  
  // Gestion de l'affichage du champ pour un nouveau type de construction
  document.getElementById("maison-type").addEventListener("change", (event) => {
    const nouveauTypeInput = document.getElementById("nouveau-type-construction");
    if (event.target.value === "autre") {
      nouveauTypeInput.style.display = "block";
    } else {
      nouveauTypeInput.style.display = "none";
    }
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
    const periode = document.getElementById("recouvrement-periode").value;
    const commentaire = document.getElementById("recouvrement-commentaire").value;

    addRecouvrement(souscriptionId, montant, periode, commentaire)
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

async function addMaison(proprietaireId, type, numero, pieces, ville, commune, quartier, loyer, media, latitude, longitude) {
    const maisonsRef = ref(database, 'maisons');
    const newMaisonRef = push(maisonsRef);
    await set(newMaisonRef, {
        id: newMaisonRef.key,
        userId: currentUser.id,
        proprietaire: proprietaireId,
        type: type,
        numero: numero,
        pieces: pieces,
        ville: ville,
        commune: commune,
        quartier: quartier,
        loyer: loyer,
        media: media || "",
        latitude: latitude || null,
        longitude: longitude || null
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
async function addRecouvrement(souscriptionId, montant, periode, commentaire) {
    const recouvrementsRef = ref(database, 'recouvrements');
    const newRecouvrementRef = push(recouvrementsRef);
    await set(newRecouvrementRef, {
        id: newRecouvrementRef.key,
        userId: currentUser.id,
        souscription: souscriptionId,
        montant: montant,
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
        <button class="edit-btn" data-id="${proprietaire.id}">Modifier</button>
        <button class="delete-btn" data-id="${proprietaire.id}">Supprimer</button>
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
  
      // Assurez-vous que les types de construction sont chargés avant de charger les maisons
      loadConstructionTypesForUser(currentUser.id);
  
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
                <button class="edit-btn" data-id="${maison.id}">Modifier</button>
                <button class="delete-btn" data-id="${maison.id}">Supprimer</button>
                </td>
            `;
            maisonsList.appendChild(row);      });
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
              <button class="edit-btn" data-id="${locataire.id}">Modifier</button>
              <button class="delete-btn" data-id="${locataire.id}">Supprimer</button>
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
  
  const souscriptionsRef =ref(database, 'souscriptions');
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
              <button class="edit-btn" data-id="${souscription.id}">Modifier</button>
              <button class="delete-btn" data-id="${souscription.id}">Supprimer</button>
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
                                      <button class="edit-btn" data-id="${recouvrement.id}">Modifier</button>
                                      <button class="delete-btn" data-id="${recouvrement.id}">Supprimer</button>
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
  
// Function to open the edit modal
function openEditModal(itemId, itemType) {
    const modal = document.getElementById("edit-modal");
    const form = document.getElementById("edit-form");
    form.innerHTML = ''; // Clear previous form fields
  
    // Fetch current data and populate form fields
    const itemRef = ref(database, `${itemType}/${itemId}`);
    get(itemRef).then((snapshot) => {
      if (snapshot.exists()) {
        const itemData = snapshot.val();
        switch (itemType) {
          case 'proprietaires':
            populateProprietaireForm(form, itemData, itemId);
            break;
          case 'maisons':
            populateMaisonForm(form, itemData, itemId);
            break;
          case 'locataires':
            populateLocataireForm(form, itemData, itemId);
            break;
          case 'souscriptions':
            populateSouscriptionForm(form, itemData, itemId);
            break;
          case 'recouvrements':
            populateRecouvrementForm(form, itemData, itemId);
            break;
          // Add cases for other item types as needed
        }
      } else {
        console.log("No data available for editing");
      }
    }).catch((error) => {
      console.error("Error fetching item data:", error);
    });
  
    modal.style.display = "block";
  }

  // Function to populate the form with 'proprietaire' data
function populateProprietaireForm(form, itemData, itemId) {
    form.innerHTML = `
      <h3>Modifier le propriétaire</h3>
      <input type="text" id="edit-nom" value="${itemData.nom}" required>
      <input type="text" id="edit-prenom" value="${itemData.prenom}" required>
      <input type="tel" id="edit-contact" value="${itemData.contact}" required>
      <input type="email" id="edit-email" value="${itemData.email}" required>
      <input type="text" id="edit-adresse" value="${itemData.adresse}" required>
      <button type="submit" class="submit-btn">Enregistrer</button>
      <button type="button" class="cancel-btn" onclick="closeEditModal()">Annuler</button>
    `;
  
    // Handle form submission
    form.onsubmit = (event) => {
      event.preventDefault();
      const updatedData = {
        nom: document.getElementById("edit-nom").value,
        prenom: document.getElementById("edit-prenom").value,
        contact: document.getElementById("edit-contact").value,
        email: document.getElementById("edit-email").value,
        adresse: document.getElementById("edit-adresse").value
      };
      updateItem('proprietaires', itemId, updatedData);
    };
  }
  
  // Function to populate the form with 'maison' data
  function populateMaisonForm(form, itemData, itemId) {
    // Fetch the list of landlords and construction types
    const proprietairesRef = ref(database, 'proprietaires');
    const typesConstructionRef = ref(database, `users/${currentUser.id}/typesConstruction`);
  
    Promise.all([
      get(proprietairesRef),
      get(typesConstructionRef)
    ]).then(([proprietairesSnapshot, typesSnapshot]) => {
      const proprietaires = proprietairesSnapshot.val();
      const typesConstruction = typesSnapshot.val();
  
      // Create landlord select options
      let proprietaireOptions = '';
      for (const proprietaireId in proprietaires) {
        const proprietaire = proprietaires[proprietaireId];
        if (proprietaire.userId === currentUser.id) {
          const selected = proprietaireId === itemData.proprietaire ? 'selected' : '';
          proprietaireOptions += `<option value="${proprietaireId}" ${selected}>${proprietaire.nom} ${proprietaire.prenom}</option>`;
        }
      }
  
      // Create construction type select options
      let typeOptions = '<option value="autre">Autre</option>';
      for (const typeId in typesConstruction) {
        const type = typesConstruction[typeId];
        const selected = type.nom === itemData.type ? 'selected' : '';
        typeOptions += `<option value="${type.nom}" ${selected}>${type.nom}</option>`;
      }
  
      // Populate the form
      form.innerHTML = `
        <h3>Modifier la maison</h3>
        <select id="edit-proprietaire">${proprietaireOptions}</select>
        <select id="edit-type">${typeOptions}</select>
        <input type="text" id="nouveau-type-construction" placeholder="Entrez le nouveau type" style="display: none;">
        <input type="text" id="edit-numero" value="${itemData.numero}" required>
        <input type="number" id="edit-pieces" value="${itemData.pieces}" required>
        <input type="text" id="edit-ville" value="${itemData.ville}" required>
        <input type="text" id="edit-commune" value="${itemData.commune}" required>
        <input type="text" id="edit-quartier" value="${itemData.quartier}" required>
        <input type="number" id="edit-loyer" value="${itemData.loyer}" required>
        <input type="text" id="edit-media" value="${itemData.media || ''}" placeholder="Lien vidéo YouTube ou image (optionnel)">
        <button type="submit" class="submit-btn">Enregistrer</button>
        <button type="button" class="cancel-btn" onclick="closeEditModal()">Annuler</button>
      `;
  
      // Show/hide new construction type input based on selection
      const typeSelect = document.getElementById("edit-type");
      const nouveauTypeInput = document.getElementById("nouveau-type-construction");
      if (typeSelect.value !== "autre") {
        nouveauTypeInput.style.display = "none";
      }
      typeSelect.addEventListener("change", () => {
        nouveauTypeInput.style.display = typeSelect.value === "autre" ? "block" : "none";
      });
  
      // Handle form submission
      form.onsubmit = (event) => {
        event.preventDefault();
        const typeConstruction = typeSelect.value === "autre" ? nouveauTypeInput.value : typeSelect.value;
        const updatedData = {
          proprietaire: document.getElementById("edit-proprietaire").value,
          type: typeConstruction,
          numero: document.getElementById("edit-numero").value,
          pieces: parseInt(document.getElementById("edit-pieces").value),
          ville: document.getElementById("edit-ville").value,
          commune: document.getElementById("edit-commune").value,
          quartier: document.getElementById("edit-quartier").value,
          loyer: parseInt(document.getElementById("edit-loyer").value),
          media: document.getElementById("edit-media").value
        };
        updateItem('maisons', itemId, updatedData);
      };
    });
  }
  
  
  // Function to populate the form with 'locataire' data
  function populateLocataireForm(form, itemData, itemId) {
    form.innerHTML = `
      <h3>Modifier le locataire</h3>
      <input type="text" id="edit-nom" value="${itemData.nom}" required>
      <input type="text" id="edit-prenom" value="${itemData.prenom}" required>
      <input type="tel" id="edit-contact" value="${itemData.contact}" required>
      <input type="email" id="edit-email" value="${itemData.email}" required>
      <button type="submit" class="submit-btn">Enregistrer</button>
      <button type="button" class="cancel-btn" onclick="closeEditModal()">Annuler</button>
    `;
  
    // Handle form submission
    form.onsubmit = (event) => {
      event.preventDefault();
      const updatedData = {
        nom: document.getElementById("edit-nom").value,
        prenom: document.getElementById("edit-prenom").value,
        contact: document.getElementById("edit-contact").value,
        email: document.getElementById("edit-email").value
      };
      updateItem('locataires', itemId, updatedData);
    };
  }
  
  // Function to populate the form with 'souscription' data
  function populateSouscriptionForm(form, itemData, itemId) {
    // Fetch the list of houses and tenants
    const maisonsRef = ref(database, 'maisons');
    const locatairesRef = ref(database, 'locataires');
  
    Promise.all([
      get(maisonsRef),
      get(locatairesRef)
    ]).then(([maisonsSnapshot, locatairesSnapshot]) => {
      const maisons = maisonsSnapshot.val();
      const locataires = locatairesSnapshot.val();
  
      // Create house select options
      let maisonOptions = '';
      for (const maisonId in maisons) {
        const maison = maisons[maisonId];
        if (maison.userId === currentUser.id) {
          const selected = maisonId === itemData.maison ? 'selected' : '';
          maisonOptions += `<option value="${maisonId}" ${selected}>${maison.ville}, ${maison.commune}, ${maison.quartier}</option>`;
        }
      }
  
      // Create tenant select options
      let locataireOptions = '';
      for (const locataireId in locataires) {
        const locataire = locataires[locataireId];
        if (locataire.userId === currentUser.id) {
          const selected = locataireId === itemData.locataire ? 'selected' : '';
          locataireOptions += `<option value="${locataireId}" ${selected}>${locataire.nom} ${locataire.prenom}</option>`;
        }
      }
  
      // Populate the form
      form.innerHTML = `
        <h3>Modifier la souscription</h3>
        <select id="edit-maison">${maisonOptions}</select>
        <select id="edit-locataire">${locataireOptions}</select>
        <input type="number" id="edit-caution" value="${itemData.caution}" required>
        <input type="number" id="edit-avance" value="${itemData.avance}" required>
        <input type="text" id="edit-autres" value="${itemData.autres}" required>
        <input type="date" id="edit-dateDebut" value="${itemData.dateDebut}" required>
        <button type="submit" class="submit-btn">Enregistrer</button>
        <button type="button" class="cancel-btn" onclick="closeEditModal()">Annuler</button>
      `;
  
      // Handle form submission
      form.onsubmit = (event) => {
        event.preventDefault();
        const updatedData = {
          maison: document.getElementById("edit-maison").value,
          locataire: document.getElementById("edit-locataire").value,
          caution: parseInt(document.getElementById("edit-caution").value),
          avance: parseInt(document.getElementById("edit-avance").value),
          autres: document.getElementById("edit-autres").value,
          dateDebut: document.getElementById("edit-dateDebut").value
        };
        updateItem('souscriptions', itemId, updatedData);
      };
    });
  }
  
  // Function to populate the form with 'recouvrement' data
  function populateRecouvrementForm(form, itemData, itemId) {
    // Fetch the list of subscriptions
    const souscriptionsRef = ref(database, 'souscriptions');
  
    get(souscriptionsRef).then((souscriptionsSnapshot) => {
      const souscriptions = souscriptionsSnapshot.val();
  
      // Create subscription select options
      let souscriptionOptions = '';
      for (const souscriptionId in souscriptions) {
        const souscription = souscriptions[souscriptionId];
        if (souscription.userId === currentUser.id) {
          const selected = souscriptionId === itemData.souscription ? 'selected' : '';
          souscriptionOptions += `<option value="${souscriptionId}" ${selected}>ID: ${souscriptionId}</option>`; // Replace with relevant details
        }
      }
  
      // Populate the form
      form.innerHTML = `
        <h3>Modifier le recouvrement</h3>
        <select id="edit-souscription">${souscriptionOptions}</select>
        <input type="number" id="edit-montant" value="${itemData.montant}" required>
        <input type="month" id="edit-periode" value="${itemData.periode}" required>
        <input type="text" id="edit-commentaire" value="${itemData.commentaire}" placeholder="Commentaire (ex: Payé)">
        <button type="submit" class="submit-btn">Enregistrer</button>
        <button type="button" class="cancel-btn" onclick="closeEditModal()">Annuler</button>
      `;
  
      // Handle form submission
      form.onsubmit = (event) => {
        event.preventDefault();
        const updatedData = {
          souscription: document.getElementById("edit-souscription").value,
          montant: parseInt(document.getElementById("edit-montant").value),
          periode: document.getElementById("edit-periode").value,
          commentaire: document.getElementById("edit-commentaire").value
        };
        updateItem('recouvrements', itemId, updatedData);
      };
    });
  }
  
  // Function to close the edit modal
  function closeEditModal() {
    document.getElementById("edit-modal").style.display = "none";
  }
  
  // Attach the closeEditModal function to the window object
  window.closeEditModal = closeEditModal;
  
  // Function to update an item in Firebase
  function updateItem(itemType, itemId, updatedData) {
    showLoading();
    const itemRef = ref(database, `${itemType}/${itemId}`);
    update(itemRef, updatedData)
      .then(() => {
        // Reload the data after editing
        switch (itemType) {
          case 'proprietaires':
            loadProprietaires();
            break;
          case 'maisons':
            loadMaisons();
            break;
          case 'locataires':
            loadLocataires();
            break;
          case 'souscriptions':
            loadSouscriptions();
            break;
          case 'recouvrements':
            loadRecouvrements();
            break;
          // Add cases for other item types as needed
        }
        alert(`${itemType.charAt(0).toUpperCase() + itemType.slice(1, -1)} modifié avec succès !`);
        closeEditModal();
      })
      .catch((error) => {
        console.error(`Erreur lors de la modification de ${itemType}:`, error);
        alert(`Erreur lors de la modification de ${itemType}.`);
      })
      .finally(() => {
        hideLoading();
      });
  }
  
  // Event delegation for "Edit" and "Delete" buttons
  document.querySelector("#proprietaires-list tbody").addEventListener("click", (event) => handleEditDelete(event, 'proprietaires'));
  document.querySelector("#maisons-list tbody").addEventListener("click", (event) => handleEditDelete(event, 'maisons'));
  document.querySelector("#locataires-list tbody").addEventListener("click", (event) => handleEditDelete(event, 'locataires'));
  document.querySelector("#souscriptions-list tbody").addEventListener("click", (event) => handleEditDelete(event, 'souscriptions'));
  document.querySelector("#recouvrements-list tbody").addEventListener("click", (event) => handleEditDelete(event, 'recouvrements'));
  
  function handleEditDelete(event, itemType) {
    const target = event.target;
    if (target.classList.contains("edit-btn")) {
      const itemId = target.dataset.id;
      openEditModal(itemId, itemType);
    } else if (target.classList.contains("delete-btn")) {
      const itemId = target.dataset.id;
      const confirmationText = `Êtes-vous sûr de vouloir supprimer ce ${itemType.slice(0, -1)} ?`;
      if (confirm(confirmationText)) {
        deleteItem(itemType, itemId);
      }
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
  
  // Monthly subscription
  subscribeMonthlyBtn.addEventListener("click", () => {
  handleSubscription("monthly");
  });
  
  // Annual subscription
  subscribeYearlyBtn.addEventListener("click", () => {
  handleSubscription("yearly");
  });
  
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
  
    // Fetch the user's agency data to get the public API key
    const agenceRef = ref(database, `users/${currentUser.id}/agence`);
    const agenceSnapshot = await get(agenceRef);
    if (!agenceSnapshot.exists()) {
      alert("Veuillez configurer les informations de votre agence avant de souscrire à un abonnement.");
      return;
    }
    const agenceData = agenceSnapshot.val();
    const publicKey = agenceData.apiKey;
  
    if (!publicKey) {
      alert("Clé API publique FedaPay manquante. Veuillez configurer les informations de votre agence.");
      return;
    }
  
    const amount = subscriptionType === "monthly" ? 1000 : 10000;
    const description =
      subscriptionType === "monthly"
        ? "Abonnement mensuel à la plateforme de gestion locative"
        : "Abonnement annuel à la plateforme de gestion locative";
  
    showLoading();
  
    // Initialize FedaPay checkout
    FedaPay.init({
      public_key: publicKey,
      transaction: {
        amount: amount,
        description: description,
      },
      customer: {
        email: agenceData.email || "email@default.com", // Use agency email or a default email
      },
      onComplete: async function (transaction) {
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
            `Abonnement ${subscriptionType === "monthly" ? "mensuel" : "annuel"} réussi !`
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
  
  cancelSubscriptionBtn.addEventListener("click", async() => {
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
      // Removed subscription check for "agence"
      if (currentUser && 
          currentUser.subscription && 
          (currentUser.subscription.status === 'active') ||
          targetSectionId === "agence") { // Allow access to "agence" regardless of subscription
        // Authorized user - do nothing
        if (targetSectionId) {
          // Display the target section
          contentSections.forEach(s => s.classList.remove("active"));
          document.getElementById(targetSectionId).classList.add("active");
        }
      } else {
        // Unauthorized user - redirect to the subscription section
        alert("Vous devez avoir un abonnement actif pour accéder à cette section.");
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
      
      // Gestion des informations de l'agence
      const editAgenceBtn = document.getElementById("edit-agence-btn");
      const editAgenceForm = document.getElementById("edit-agence-form");
      const cancelAgenceBtn = document.getElementById("cancel-agence-btn");
      const agenceInfoDiv = document.getElementById("agence-info");
      
      editAgenceBtn.addEventListener("click", () => {
          editAgenceForm.style.display = "block";
          agenceInfoDiv.style.display = "none";
          editAgenceBtn.style.display = "none";
      });
      
      cancelAgenceBtn.addEventListener("click", () => {
          editAgenceForm.style.display = "none";
          agenceInfoDiv.style.display = "block";
          editAgenceBtn.style.display = "block";
      });
      
      editAgenceForm.addEventListener("submit", async (event) => {
          event.preventDefault();
          const agenceNom = document.getElementById("agence-nom").value;
          const agencePrenom = document.getElementById("agence-prenom").value;
          const agenceTelephone = document.getElementById("agence-telephone").value;
          const agenceEmail = document.getElementById("agence-email").value;
          const agenceAdresse = document.getElementById("agence-adresse").value;
          const agenceApiKey = document.getElementById("agence-api-key").value;
      
          if (currentUser) {
              const agenceData = {
                  nom: agenceNom,
                  prenom: agencePrenom,
                  telephone: agenceTelephone,
                  email: agenceEmail,
                  adresse: agenceAdresse,
                  apiKey: agenceApiKey
              };
      
              try {
                  await update(ref(database, `users/${currentUser.id}/agence`), agenceData);
                  alert("Informations de l'agence mises à jour avec succès !");
                  loadAgenceData(); // Recharger les données de l'agence
                  editAgenceForm.style.display = "none";
                  agenceInfoDiv.style.display = "block";
                  editAgenceBtn.style.display = "block";
              } catch (error) {
                  console.error("Erreur lors de la mise à jour des informations de l'agence :", error);
                  alert("Erreur lors de la mise à jour des informations de l'agence.");
              }
          } else {
              alert("Utilisateur non connecté.");
          }
      });
      
      function loadAgenceData() {
          if (currentUser) {
              const agenceRef = ref(database, `users/${currentUser.id}/agence`);
              get(agenceRef).then((snapshot) => {
                  if (snapshot.exists()) {
                      const agenceData = snapshot.val();
                      agenceInfoDiv.innerHTML = `
                          <p><strong>Nom:</strong> ${agenceData.nom}</p>
                          <p><strong>Prénom:</strong> ${agenceData.prenom}</p>
                          <p><strong>Téléphone:</strong> ${agenceData.telephone}</p>
                          <p><strong>Email:</strong> ${agenceData.email}</p>
                          <p><strong>Adresse:</strong> ${agenceData.adresse}</p>
                          <p><strong>Clé API publique FedaPay:</strong> ${agenceData.apiKey}</p>
                      `;
                      // Pré-remplir le formulaire avec les données existantes
                      document.getElementById("agence-nom").value = agenceData.nom || '';
                      document.getElementById("agence-prenom").value = agenceData.prenom || '';
                      document.getElementById("agence-telephone").value = agenceData.telephone || '';
                      document.getElementById("agence-email").value = agenceData.email || '';
                      document.getElementById("agence-adresse").value = agenceData.adresse || '';
                      document.getElementById("agence-api-key").value = agenceData.apiKey || '';
                  } else {
                      agenceInfoDiv.innerHTML = "<p>Aucune information d'agence disponible.</p>";
                  }
              }).catch((error) => {
                  console.error("Erreur lors du chargement des informations de l'agence :", error);
                  agenceInfoDiv.innerHTML = "<p>Erreur lors du chargement des informations de l'agence.</p>";
              });
          }
      }
  
      // Gestion des options GPS pour le formulaire d'ajout de maison
  const manualGpsOption = document.getElementById("manual-gps");
  const autoGpsOption = document.getElementById("auto-gps");
  const manualGpsFields = document.getElementById("manual-gps-fields");
  const autoGpsMapDiv = document.getElementById("auto-gps-map");
  
  manualGpsOption.addEventListener("change", () => {
      manualGpsFields.style.display = "block";
      autoGpsMapDiv.style.display = "none";
  });
  
  autoGpsOption.addEventListener("change", () => {
      manualGpsFields.style.display = "none";
      autoGpsMapDiv.style.display = "block";
      initMap();
  });
  
  let map, marker;
  
  function initMap() {
    if (!map) {
        map = L.map('auto-gps-map');
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
        }).addTo(map);
  
        // Get user's current location
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => { // Success callback
                    const lat = position.coords.latitude;
                    const lng = position.coords.longitude;
  
                    map.setView([lat, lng], 13); // Center map on user's location
  
                    if (!marker) {
                        marker = L.marker([lat, lng], { draggable: true }).addTo(map);
                    } else {
                        marker.setLatLng([lat, lng]);
                    }
                    
                    document.getElementById("maison-latitude").value = lat;
                    document.getElementById("maison-longitude").value = lng;
  
                    marker.on('dragend', function (event) {
                        const position = marker.getLatLng();
                        document.getElementById("maison-latitude").value = position.lat;
                        document.getElementById("maison-longitude").value = position.lng;
                    });
  
                },
                (error) => { // Error callback
                    console.error("Erreur de géolocalisation:", error);
                    alert("Impossible d'obtenir votre position actuelle. Veuillez autoriser la géolocalisation ou entrer les coordonnées manuellement.");
                    map.setView([51.505, -0.09], 13); // Set to a default location
  
                    if (!marker) {
                        marker = L.marker([51.505, -0.09], { draggable: true }).addTo(map);
                    } else {
                        marker.setLatLng([51.505, -0.09]);
                    }
                }
            );
        } else {
            console.error("La géolocalisation n'est pas supportée par votre navigateur.");
            alert("Votre navigateur ne supporte pas la géolocalisation. Veuillez entrer les coordonnées manuellement.");
            map.setView([51.505, -0.09], 13); // Set to a default location
            if (!marker) {
                marker = L.marker([51.505, -0.09], { draggable: true }).addTo(map);
            } else {
                marker.setLatLng([51.505, -0.09]);
            }
        }
         map.on('click', function (event) {
            marker.setLatLng(event.latlng);
            document.getElementById("maison-latitude").value = event.latlng.lat;
            document.getElementById("maison-longitude").value = event.latlng.lng;
        });
    }
  }
  
// Gestion du bouton flottant pour afficher les sections
const fabButton = document.querySelector(".fab-button");
const fabOptions = document.querySelector(".fab-options");
const contentSections = document.querySelectorAll(".content-section");
const navLinks = document.querySelectorAll(".fab-option");

// Animation pour l'icône du menu (FAB)
let isAnimating = false;
let currentIconIndex = 0;
const icons = ["fas fa-tachometer-alt", "fas fa-user-tie", "fas fa-home", "fas fa-users", "fas fa-file-contract", "fas fa-hand-holding-usd", "fas fa-credit-card", "fas fa-building" ]; // Add more icons if needed

fabButton.addEventListener("click", () => {
    fabOptions.classList.toggle("show");
    // Reset to default icon when closing
    if (!fabOptions.classList.contains("show")) {
        currentIconIndex = 0; // Set to the first icon index
        fabButton.querySelector("i").className = icons[currentIconIndex];
    }
});

function animateFABIcon() {
    if (!isAnimating && !fabOptions.classList.contains("show")) { // Only animate when menu is closed
        isAnimating = true;
        fabButton.querySelector("i").className = icons[currentIconIndex];

        currentIconIndex = (currentIconIndex + 1) % icons.length; // Move to the next icon (loop back to the beginning)

        setTimeout(() => {
            isAnimating = false;
        }, 500); // Adjust the animation duration as needed
    }
}

// Start the FAB icon animation loop (e.g., every 2 seconds)
setInterval(animateFABIcon, 2000);
  
  fabButton.addEventListener("click", () => {
    fabOptions.classList.toggle("show");
  });
  
  navLinks.forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      const targetSectionId = link.dataset.section;
      contentSections.forEach((section) => {
        section.classList.remove("active");
      });
  
      const targetSection = document.getElementById(targetSectionId);
      if (targetSection) {
        targetSection.classList.add("active");
        fabOptions.classList.remove("show");
      }
      // Check user access based on the clicked section
      checkUserAccess(targetSectionId);
    });
  });
      
      // Data loading initialization
      function initializeDataLoad() {
      if (isAuthenticated) {
        checkUserRoleAndSubscription();
        setInterval(checkAndUpdateSubscriptionStatus, 60 * 60 * 1000);
        loadDashboardData();
        loadProprietaires();
        loadMaisons();
        loadLocataires();
        loadSouscriptions();
        loadRecouvrements();
        loadAgenceData();
        if (currentUser) {
            loadConstructionTypesForUser(currentUser.id);
          }
      }
      }
      
      // Call initializeDataLoad on page load
      initializeDataLoad();