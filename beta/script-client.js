import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getDatabase, ref, onValue, get, set, push, update } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

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

// UI Elements
const housesContainer = document.getElementById("houses-container");
const paymentModal = document.getElementById("payment-modal");
const paymentDetails = document.getElementById("payment-details");
const payButton = document.getElementById("pay-button");
const detailsModal = document.getElementById("details-modal");
const houseDetailsContent = document.getElementById("house-details-content");
const houseMapDiv = document.getElementById("house-map");
const myPurchasesModal = document.getElementById("my-purchases-modal");
const purchasedHousesContainer = document.getElementById("purchased-houses-container");

// Auth elements
const authModal = document.getElementById("auth-modal");
const showLoginFormLink = document.getElementById("show-login");
const showRegisterFormLink = document.getElementById("show-register");
const loginForm = document.getElementById("login-form");
const registerForm = document.getElementById("register-form");

// Search Section Elements
const searchSection = document.querySelector(".search-section");
const searchInput = document.getElementById("search-input");
const typeFilter = document.getElementById("type-filter");
const priceFilter = document.getElementById("price-filter");

// Product Details Page Elements
const productDetailsPage = document.getElementById("product-details-page");
const productDetailsContent = document.getElementById("product-details-content");
const paymentHistoryTable = document.getElementById("payment-history-table").querySelector("tbody");
const makePaymentForm = document.getElementById("make-payment-form");
const paymentAmountInput = document.getElementById("payment-amount");
const paymentDescriptionInput = document.getElementById("payment-description");
const makePaymentButton = document.getElementById("make-payment-button");
const backToPurchasesButton = document.querySelector(".back-to-purchases-button");

// User Management
let currentUser = null;

// Check if the user is already authenticated on page load
window.addEventListener('load', () => {
    const storedUser = localStorage.getItem('currentUser');

    if (storedUser) {
        currentUser = JSON.parse(storedUser);
    }
});

// Login Form
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
                        // ... other information if needed ...
                    };
                    // Store user data in localStorage
                    localStorage.setItem('currentUser', JSON.stringify(currentUser));
                    userFound = true;
                    hideAuthModal();
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
    document.getElementById("register-form-container").style.display = "none";
    document.getElementById("login-form-container").style.display = "block";
}

// Registration Form
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
            role: 'client',
        });

        alert("Inscription réussie !");
        registerForm.reset();
        showLoginForm();
        hideAuthModal();
    } catch (error) {
        console.error("Erreur lors de l'inscription :", error);
        alert("Erreur lors de l'inscription.");
    } finally {
        hideLoading();
    }
});

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

// Function to show the authentication modal
function showAuthModal() {
    authModal.style.display = "block";
}

// Function to hide the authentication modal
function hideAuthModal() {
    authModal.style.display = "none";
}

// Event listeners for switching between login and registration forms
showRegisterFormLink.addEventListener("click", () => {
    document.getElementById("login-form-container").style.display = "none";
    document.getElementById("register-form-container").style.display = "block";
});

showLoginFormLink.addEventListener("click", () => {
    document.getElementById("register-form-container").style.display = "none";
    document.getElementById("login-form-container").style.display = "block";
});

// Close modal when clicking the close button
document.querySelectorAll(".close-modal").forEach(button => {
    button.addEventListener("click", () => {
        hideAuthModal();
        paymentModal.style.display = "none";
        detailsModal.style.display = "none";
        myPurchasesModal.style.display = "none";
        searchSection.style.display = "none";
        if (houseMap) {
            houseMap.remove();
            houseMap = null;
        }
    });
});

let selectedHouse = null;
let housesData = {}; // Store fetched houses data
let paymentStatus = {}; // Initialize paymentStatus at the beginning of your script

// Load Construction Types from Firebase and Populate Filter
function loadConstructionTypes() {
    const housesRef = ref(database, 'maisons'); // Reference to the 'maisons' node

    onValue(housesRef, (snapshot) => {
        const houses = snapshot.val();
        const uniqueTypes = new Set(); // Use a Set to store unique types

        // Iterate through all houses
        for (const houseId in houses) {
            const house = houses[houseId];
            if (house.type) {
                uniqueTypes.add(house.type); // Add the type to the Set (duplicates are automatically ignored)
            }
        }

        // Get the type filter select element
        const typeFilter = document.getElementById("type-filter");

        // Clear existing options in the filter
        typeFilter.innerHTML = '<option value="">Tous</option>';

        // Add unique types to the filter
        for (const type of uniqueTypes) {
            const option = document.createElement("option");
            option.value = type;
            option.text = type;
            typeFilter.add(option);
        }
    }, {
        onlyOnce: true
    });
}

// Load Houses from Firebase (using async/await)
async function loadHouses() {
    showLoading("Chargement des types de construction...");
    try {
        await loadConstructionTypes();
    } catch (error) {
        console.error("Erreur lors du chargement des types de construction:", error);
        hideLoading();
        return;
    }

    updateLoadingMessage("Chargement des maisons...");
    const housesRef = ref(database, 'maisons');

    try {
        const snapshot = await get(housesRef);
        if (snapshot.exists()) {
            housesData = snapshot.val();
            applyFiltersAndDisplayHouses();
        } else {
            console.log("Aucune donnée disponible");
            displayHouses({}); // Affiche une liste vide s'il n'y a pas de données
        }
    } catch (error) {
        console.error("Erreur lors du chargement des maisons:", error);
    } finally {
        hideLoading();
    }
}

// Function to apply filters and display houses
function applyFiltersAndDisplayHouses() {
    const filteredHouses = filterHouses();
    displayHouses(filteredHouses);
}

// Function to get recent houses (assuming you have a 'timestamp' field)
function getRecentHouses(houses, count) {
    const sortedHouses = Object.entries(houses).sort((a, b) => {
        return a[1].timestamp - b[1].timestamp; // Sort in ascending order (oldest first)
    });

    // Get the last 'count' elements (most recent)
    const recentHouses = sortedHouses.slice(-count).reduce((obj, [key, value]) => {
        obj[key] = value;
        return obj;
    }, {});

    return recentHouses;
}

async function displayHouses(houses) {
    housesContainer.innerHTML = "";
    const totalHouses = Object.keys(houses).length;
    const imagePromises = [];

    for (const houseId in houses) {
        const house = houses[houseId];

        // Vérifie si la maison est déjà achetée
        const isPurchased = house.purchasedBy && house.purchasedBy.length > 0;

        // Affiche la maison même si certaines données essentielles sont manquantes
        try {
            const houseDiv = document.createElement("div");
            houseDiv.className = "house-card";

            // Construit le contenu HTML de la carte de la maison
            houseDiv.innerHTML = `
                <h3>${house.type || 'Type inconnu'} à louer</h3>
                <p class="location"><strong>Localisation:</strong> ${house.ville || 'Ville inconnue'}, ${house.commune || 'Commune inconnue'}, ${house.quartier || 'Quartier inconnu'}</p>
                <p class="price"><strong>Loyer:</strong> ${house.loyer ? house.loyer + ' FCFA' : 'Loyer inconnu'}</p>
                <button class="rent-button" data-house-id="${houseId}" ${isPurchased ? 'disabled' : ''}>
                    ${isPurchased ? 'Indisponible' : 'LOUER'}
                </button>
            `;
            housesContainer.appendChild(houseDiv);

            // Gestion du chargement de l'image (si présente et n'est pas une URL YouTube)
            if (house.media && !house.media.includes("youtube")) {
                const img = new Image();
                const imageLoadPromise = new Promise((resolve, reject) => {
                    img.onload = () => {
                        requestAnimationFrame(() => {
                            requestAnimationFrame(() => {
                                resolve();
                            });
                        });
                    };
                    img.onerror = () => {
                        requestAnimationFrame(() => {
                            requestAnimationFrame(() => {
                                reject(new Error(`Erreur de chargement de l'image pour la maison ${houseId}`));
                            });
                        });
                    };
                    img.src = house.media;
                });
                imagePromises.push(imageLoadPromise);
            }

            // Écouteur d'événement pour le bouton "LOUER"
            const rentButton = houseDiv.querySelector(".rent-button");
            rentButton.addEventListener("click", async () => {
                // Récupère les détails supplémentaires uniquement si l'utilisateur clique sur "LOUER"
                try {
                    const proprietaireSnapshot = await get(ref(database, `proprietaires/${house.proprietaire}`));
                    const proprietaire = proprietaireSnapshot.val();

                    const userSnapshot = await get(ref(database, `users/${house.userId}`));
                    const user = userSnapshot.val();
                    const agence = user.agence;

                    selectedHouse = { id: houseId, ...house, userId: house.userId };

                    let additionalDetails = '';
                    if (agence) {
                        additionalDetails += `<p><strong>Agence:</strong> ${agence.nom} ${agence.prenom}</p>`;
                        additionalDetails += `<p><strong>Contact Agence:</strong> ${agence.telephone}</p>`;
                    }
                    if (proprietaire) {
                        additionalDetails += `<p><strong>Propriétaire:</strong> ${proprietaire.nom} ${proprietaire.prenom}</p>`;
                    }
                    additionalDetails += `<p><strong>Nombre de pièces:</strong> ${house.pieces}</p>`;

                    // Ajoute un élément média (vidéo ou image) si disponible
                    if (house.media) {
                        if (house.media.includes("youtube")) {
                            const videoId = getYoutubeVideoId(house.media);
                            additionalDetails += `<iframe width="100%" height="315" src="https://www.youtube.com/embed/${videoId}" frameborder="0" allowfullscreen></iframe>`;
                        } else {
                            additionalDetails += `<img src="${house.media}" alt="Image de la maison" style="width: 100%; height: auto;">`;
                        }
                    }

                    // Affiche la modale appropriée en fonction de l'état de connexion et du statut de paiement
                    if (currentUser) {
                        const housePaid = paymentStatus[houseId];
                        if (housePaid) {
                            showDetailsModal(selectedHouse);
                        } else {
                            showPaymentModal(selectedHouse, additionalDetails);
                        }
                    } else {
                        alert("Veuillez vous connecter pour louer une maison.");
                        showAuthModal();
                    }
                } catch (error) {
                    console.error("Erreur lors du chargement des détails supplémentaires:", error);
                    // Gérer l'affichage d'un message d'erreur ou d'une modale d'erreur ici
                }
            });
        } catch (error) {
            console.error("Erreur lors de la création de la carte de la maison:", error);
        }
    }

    // Attend que toutes les images soient chargées
    try {
        await Promise.all(imagePromises);
    } catch (error) {
        console.error("Erreur lors du chargement des images:", error);
    } finally {
        hideLoading();
    }
}

// Extract YouTube video ID from URL (helper function for embedding)
function getYoutubeVideoId(url) {
    const match = url.match(/[?&]v=([^?&]+)/);
    return match && match[1];
}

// Display Houses in Search Results (No changes in this function)

// Search Houses
function searchHouses(query) {
    const filteredHouses = {};
    for (const houseId in housesData) {
        const house = housesData[houseId];
        if (
            house.ville.toLowerCase().includes(query) ||
            house.commune.toLowerCase().includes(query) ||
            house.quartier.toLowerCase().includes(query)
        ) {
            filteredHouses[houseId] = house;
        }
    }
    return filteredHouses;
}

// Filter Houses
function filterHouses() {
    const type = typeFilter.value;
    const maxPrice = parseInt(priceFilter.value) || Infinity;
    const query = searchInput.value.toLowerCase();

    const filteredHouses = {};
    for (const houseId in housesData) {
        const house = housesData[houseId];
        if (
            (!type || house.type.toLowerCase().includes(type.toLowerCase())) &&
            house.loyer <= maxPrice &&
            (house.ville.toLowerCase().includes(query) ||
                house.commune.toLowerCase().includes(query) ||
                house.quartier.toLowerCase().includes(query))
        ) {
            filteredHouses[houseId] = house;
        }
    }
    return filteredHouses;
}

// Show Payment Modal
function showPaymentModal(house, additionalDetails = '') {
    let totalPrice = house.loyer; // Start with the base rent

    if (house.avance && house.avance > 0) {
        totalPrice = house.loyer * house.avance;
    }

    if (house.frais_supplementaire) {
        totalPrice += parseInt(house.frais_supplementaire); // Assuming frais_supplementaire is a string representing a number
    }

    paymentDetails.innerHTML = `
        <p><strong>Maison:</strong> ${house.ville}, ${house.commune}, ${house.quartier}</p>
        <p><strong>Loyer:</strong> ${house.loyer} FCFA</p>
        ${house.avance > 0 ? `<p><strong>Avance:</strong> ${house.avance} mois</p>` : ''}
        ${house.frais_supplementaire ? `<p><strong>Frais Supplémentaires:</strong> ${house.frais_supplementaire} FCFA</p>` : ''}
        <p><strong>Montant Total à Payer:</strong> ${totalPrice} FCFA</p>
        ${additionalDetails}
    `;
    paymentModal.style.display = "block";
}

// Handle Payment
payButton.addEventListener("click", async () => {
  if (!currentUser) {
    alert("Veuillez vous connecter ou vous inscrire pour effectuer un paiement.");
    showAuthModal();
    return;
  }

  if (!selectedHouse) {
    alert("Veuillez sélectionner une maison à louer.");
    return;
  }

  const userSnapshot = await get(ref(database, `users/${selectedHouse.userId}`));
  if (!userSnapshot.exists()) {
    alert("Agence non trouvée.");
    return;
  }
  const user = userSnapshot.val();
  const agence = user.agence;
  const publicKey = agence ? agence.apiKey : null;

  if (!publicKey) {
    alert("Clé API publique de l'agence non trouvée.");
    return;
  }

  let amount = selectedHouse.loyer;
  if (selectedHouse.avance && selectedHouse.avance > 0) {
      amount = selectedHouse.loyer * selectedHouse.avance;
  }
  if (selectedHouse.frais_supplementaire) {
      amount += parseInt(selectedHouse.frais_supplementaire);
  }

  const description = `Loyer pour ${selectedHouse.ville}, ${selectedHouse.commune}, ${selectedHouse.quartier}`;

  showLoading();
  FedaPay.init({
    public_key: publicKey,
    transaction: {
      amount: amount,
      description: description,
    },
    customer: {
      email: "user@example.com", 
    },
    onComplete: async function(transaction) {
      if (transaction.reason === FedaPay.CHECKOUT_COMPLETED) {
        alert(
          "Paiement réussi! Vous allez recevoir un reçu par email."
        );
        paymentModal.style.display = "none";
        await markHouseAsPurchased(selectedHouse.id, currentUser.id);
        paymentStatus[selectedHouse.id] = true;

         // Ajouter le locataire dans la liste des locataires sur la page de l'agence avec le nom de l'utilisateur
         await addTenant(currentUser.username, selectedHouse.userId);

         // Enregistrer la souscription sur la page de l'agence avec l'ID de l'utilisateur
         await addSubscription(selectedHouse.id, currentUser.id, selectedHouse.userId);

        showDetailsModal(selectedHouse);
      } else if (transaction.reason === FedaPay.DIALOG_DISMISSED) {
        alert("Paiement annulé.");
      } else {
        console.log("Transaction : ", transaction);
        alert("Erreur lors du paiement. Veuillez réessayer.");
      }
    },
  }).open();
  hideLoading();
});

// Mettre à jour la fonction addTenant pour inclure le nom de l'utilisateur et l'ID de l'agence
async function addTenant(username, agenceUserId) {
    const locatairesRef = ref(database, 'locataires');
    const newLocataireRef = push(locatairesRef);
    await set(newLocataireRef, {
        id: newLocataireRef.key,
        userId: agenceUserId,
        nom: username, // Utiliser le nom d'utilisateur
        prenom: "", // Vous pouvez ajouter un champ pour le prénom si nécessaire
        contact: "", 
        email: "" 
    });
}

// Mettre à jour la fonction addSubscription pour inclure l'ID de l'agence
async function addSubscription(maisonId, locataireId, agenceUserId) {
    const souscriptionsRef = ref(database, 'souscriptions');
    const newSouscriptionRef = push(souscriptionsRef);
    const maisonRef = ref(database, `maisons/${maisonId}`);
    const maisonSnapshot = await get(maisonRef);
    const loyer = maisonSnapshot.val().loyer;

    await set(newSouscriptionRef, {
        id: newSouscriptionRef.key,
        userId: agenceUserId, // Lier la souscription à l'ID de l'agence
        maison: maisonId,
        locataire: locataireId,
        caution: 0, 
        avance: 0, 
        autres: "", 
        dateDebut: new Date().toISOString().split('T')[0], 
        loyer: loyer
    });
}

// Mettre à jour la fonction addRecovery pour utiliser l'ID de l'utilisateur et la date actuelle
async function addRecovery(maisonId, locataireId, amount, agenceUserId) {
    const recouvrementsRef = ref(database, 'recouvrements');
    const newRecouvrementRef = push(recouvrementsRef);
    const currentDate = new Date().toISOString().slice(0, 10);

    // Fetch the subscription associated with the house
    const souscriptionsRef = ref(database, 'souscriptions');
    const souscriptionsSnapshot = await get(souscriptionsRef);
    const souscriptions = souscriptionsSnapshot.val();
    let souscriptionId = null;

    for (const subId in souscriptions) {
        if (souscriptions[subId].maison === maisonId && souscriptions[subId].locataire === locataireId) {
            souscriptionId = subId;
            break;
        }
    }

    if (!souscriptionId) {
        console.error("Aucune souscription trouvée pour cette maison et ce locataire.");
        return;
    }

    // Utiliser l'ID de l'utilisateur comme nom du locataire et la date actuelle
    await set(newRecouvrementRef, {
        id: newRecouvrementRef.key,
        userId: agenceUserId,
        souscription: souscriptionId,
        montant: amount,
        periode: currentDate.slice(0, 7), // Mois et année actuels
        date: currentDate,
        commentaire: `Paiement de ${currentUser.username}`
    });
}

async function markHouseAsPurchased(houseId, userId) {
    const houseRef = ref(database, `maisons/${houseId}`);
    const currentData = (await get(houseRef)).val();

    let updatedPurchasedBy;
    if (!currentData.purchasedBy) {
        updatedPurchasedBy = [userId];
    } else {
        updatedPurchasedBy = [...currentData.purchasedBy, userId];
    }

    await set(houseRef, {
        ...currentData,
        purchasedBy: updatedPurchasedBy
    });

    // Reload the houses to reflect the change
    loadHouses();
}

// Functions to show/hide loading
function showLoading(message = "Chargement en cours...") {
    const loadingOverlay = document.getElementById("loading-overlay");
    const loadingMessage = document.createElement("p"); // Crée un élément pour le message
    loadingMessage.id = "loading-message"; // Attribue un ID pour pouvoir le modifier plus tard
    loadingMessage.textContent = message;
    loadingOverlay.innerHTML = ''; // Efface le contenu existant
    loadingOverlay.appendChild(loadingMessage); // Ajoute le message
    loadingOverlay.appendChild(createLoader()); // Ajoute le loader
    loadingOverlay.style.display = "flex";
}

function hideLoading() {
    document.getElementById("loading-overlay").style.display = "none";
}

function createLoader() {
    const loader = document.createElement("div");
    loader.className = "loader";
    return loader;
}

function updateLoadingMessage(newMessage) {
    const loadingMessage = document.getElementById("loading-message");
    if (loadingMessage) {
        loadingMessage.textContent = newMessage;
    }
}

// Function to show the details modal
let houseMap;

function showDetailsModal(house) {
    houseDetailsContent.innerHTML = `
        <p><strong>Type:</strong> ${house.type}</p>
        <p><strong>Localisation:</strong> ${house.ville}, ${house.commune}, ${house.quartier}</p>
        <p><strong>Loyer:</strong> ${house.loyer} FCFA</p>
        <p><strong>Nombre de pièces:</strong> ${house.pieces}</p>
        <!-- Add other details here -->
    `;

    // Check if GPS coordinates are available and display the map
    if (house.latitude && house.longitude) {
        houseMapDiv.style.display = "block";
        if (!houseMap) {
            houseMap = L.map(houseMapDiv).setView([house.latitude, house.longitude], 15);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                maxZoom: 19,
            }).addTo(houseMap);
        } else {
            houseMap.setView([house.latitude, house.longitude], 15);
        }

        // Remove any existing marker before adding a new one
        houseMap.eachLayer(layer => {
            if (layer instanceof L.Marker) {
                houseMap.removeLayer(layer);
            }
        });

        L.marker([house.latitude, house.longitude]).addTo(houseMap);
    } else {
        houseMapDiv.innerHTML = '<p>Coordonnées GPS non disponibles.</p>';
    }

    detailsModal.style.display = "block";
}

// Event listener for closing the details modal
document.querySelector("#details-modal .close-modal").addEventListener("click", () => {
    detailsModal.style.display = "none";
    // Optionally destroy the map instance
    if (houseMap) {
        houseMap.remove();
        houseMap = null;
    }
});

// Function to show product details page
function showProductDetailsPage(house) {
    // Hide the main house list and show the product details page
    document.getElementById("house-list").style.display = "none";
    productDetailsPage.classList.add("active");

    // Populate the product details
    productDetailsContent.innerHTML = `
        <p><strong>Type:</strong> ${house.type}</p>
        <p><strong>Localisation:</strong> ${house.ville}, ${house.commune}, ${house.quartier}</p>
        <p><strong>Loyer:</strong> ${house.loyer} FCFA</p>
        <p><strong>Nombre de pièces:</strong> ${house.pieces}</p>
        <p><strong>Propriétaire:</strong> ${house.proprietaire}</p>
        <!-- Add other details here -->
    `;

    // Add media element (video or image)
    let mediaElement = '';
    if (house.media) {
        if (house.media.includes("youtube")) {
            const videoId = getYoutubeVideoId(house.media);
            mediaElement = `<iframe width="100%" height="315" src="https://www.youtube.com/embed/${videoId}" frameborder="0" allowfullscreen></iframe>`;
        } else {
            mediaElement = `<img src="${house.media}" alt="Image de la maison" style="width: 100%; height: auto;">`;
        }
    }
    productDetailsContent.innerHTML += mediaElement;

    // Add GPS coordinates if available
    if (house.latitude && house.longitude) {
        productDetailsContent.innerHTML += `<p><strong>Coordonnées GPS:</strong> ${house.latitude}, ${house.longitude}</p>`;
    }

    // Load payment history for this product
    loadPaymentHistory(house.id);
}

// Function to load payment history (adapt to your Firebase data structure)
function loadPaymentHistory(houseId) {
    paymentHistoryTable.innerHTML = ""; // Clear the table

    // Fetch payment history from Firebase for the given houseId
    const paymentsRef = ref(database, `payments/${houseId}`); // Assuming you store payments under 'payments' node
    onValue(paymentsRef, (snapshot) => {
        const payments = snapshot.val();
        for (const paymentId in payments) {
            const payment = payments[paymentId];
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${payment.date}</td>
                <td>${payment.amount} FCFA</td>
                <td>${payment.description}</td>
            `;
            paymentHistoryTable.appendChild(row);
        }
    });
}

// Event listener for "Make Payment" button on the product details page
makePaymentButton.addEventListener("click", () => {
    const amount = parseInt(paymentAmountInput.value);
    const description = paymentDescriptionInput.value;

    if (!amount || !description) {
        alert("Veuillez remplir tous les champs.");
        return;
    }

    // Implement the payment logic using FedaPay (similar to handlePayment function)
    handleAdditionalPayment(selectedHouse.id, amount, description); // Pass selectedHouse.id for the house
});

// Event listener for the back button on the product details page
backToPurchasesButton.addEventListener("click", () => {
    // Hide the product details page and show the "Mes achats" section
    productDetailsPage.classList.remove("active");
     document.getElementById("house-list").style.display = "block";
    myPurchasesModal.style.display = "block";
});

// Function to handle additional payments (adapt to your needs)
async function handleAdditionalPayment(houseId, amount, description) {
    if (!currentUser) {
        alert("Veuillez vous connecter pour effectuer un paiement.");
        return;
    }

    // Get the agency's public API key (you might need to adjust the path)
    const userSnapshot = await get(ref(database, `users/${selectedHouse.userId}`));
    if (!userSnapshot.exists()) {
        alert("Agence non trouvée.");
        return;
    }
    const user = userSnapshot.val();
    const agence = user.agence;
    const publicKey = agence ? agence.apiKey : null;

    if (!publicKey) {
        alert("Clé API publique de l'agence non trouvée.");
        return;
    }

    showLoading();

    // Initialize FedaPay checkout
    FedaPay.init({
        public_key: publicKey,
        transaction: {
            amount: amount,
            description: description,
        },
        customer: {
            email: "user@example.com", // Replace with the user's email
        },
        onComplete: async function (transaction) {
            if (transaction.reason === FedaPay.CHECKOUT_COMPLETED) {
                alert("Paiement réussi!");

                // Add the payment to the payment history in Firebase (adapt this to your data structure)
                const paymentData = {
                    date: new Date().toISOString(),
                    amount: amount,
                    description: description,
                };
                const paymentRef = push(ref(database, `payments/${houseId}`)); // Assuming you store payments under a 'payments' node
                await set(paymentRef, paymentData);

                // Enregistrer le recouvrement sur la page de l'agence avec l'ID de l'utilisateur
                await addRecovery(selectedHouse.id, currentUser.id, amount, selectedHouse.userId);

                // Reload the payment history
                loadPaymentHistory(houseId);
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

async function loadPurchasedHouses() {
    if (!currentUser) return;

    purchasedHousesContainer.innerHTML = ""; // Clear the container

    const housesRef = ref(database, 'maisons');
    onValue(housesRef, async (snapshot) => {
        const houses = snapshot.val();
        for (const houseId in houses) {
            const house = houses[houseId];
            // Check if the current user has purchased the house
            if (house.purchasedBy && house.purchasedBy.includes(currentUser.id)) {
                const houseDiv = document.createElement("div");                houseDiv.className = "house-card";

                // Fetch and display house details
                houseDiv.innerHTML = `
                <h3>${house.type}</h3>
                <p class="location"><strong>Localisation:</strong> ${house.ville}, ${house.commune}, ${house.quartier}</p>
                <p class="price"><strong>Loyer:</strong> ${house.loyer} FCFA</p>
                <button class="details-button" data-house-id="${houseId}">Voir les détails</button>
                <!-- Add other buttons or details as needed -->
            `;

// Embed YouTube video or image
if (house.media) {
    if (house.media.includes("youtube") || house.media.includes("youtu.be")) {
        const videoId = getYoutubeVideoId(house.media);
        if (videoId) { // Vérifie si un ID vidéo a été extrait
            houseDiv.innerHTML += `<iframe width="100%" height="200px" src="https://www.youtube.com/embed/${videoId}" frameborder="0" allowfullscreen></iframe>`;
        } else {
            // Gérer le cas où l'URL n'est pas une URL YouTube valide (afficher un message, une image par défaut, etc.)
            houseDiv.innerHTML += `<p>Impossible d'afficher la vidéo YouTube.</p>`;
        }
    } else {
        // Appliquer le style en utilisant la propriété style et en échappant les valeurs potentiellement dangereuses
        houseDiv.innerHTML += `<img src="${encodeURI(house.media)}" alt="Image de la maison" style="width: 100%; height: 200px; object-fit: cover;">`;
    }
}

                // Display GPS coordinates if available
                if (house.latitude && house.longitude) {
                    houseDiv.innerHTML += `<p><strong>Coordonnées GPS:</strong> ${house.latitude}, ${house.longitude}</p>`;
                }

                // Add event listener for "Voir les détails" button
                const detailsButton = houseDiv.querySelector(".details-button");
                detailsButton.addEventListener("click", () => {
                    selectedHouse = { id: houseId, ...house, userId: house.userId };
                    showProductDetailsPage(selectedHouse); // Show the new product details page
                    myPurchasesModal.style.display = "none"; // Hide the "Mes achats" modal
                });

                purchasedHousesContainer.appendChild(houseDiv);
            }
        }
    });
}

// Floating Action Button (FAB) Event Listeners
const fabMain = document.getElementById("fab-main");
const fabOptions = document.getElementById("fab-options");
const fabMyPurchases = document.getElementById("fab-my-purchases");
const fabLoginRegister = document.getElementById("fab-login-register");
const fabSearch = document.getElementById("fab-search");

// Animation pour l'icône du menu (FAB)
let isAnimating = false;
let currentIconIndex = 0;
const icons = ["fas fa-shopping-cart", "fas fa-user", "fas fa-search", "fas fa-plus"]; // Add more icons if needed
fabMain.addEventListener("click", () => {
    fabOptions.classList.toggle("show");
    // Reset to default icon when closing
    if (!fabOptions.classList.contains("show")) {
        currentIconIndex = icons.length - 1; // Set to the plus icon index
        fabMain.querySelector("i").className = icons[currentIconIndex];
    }
});

function animateFABIcon() {
    if (!isAnimating) {
        isAnimating = true;
        fabMain.querySelector("i").className = icons[currentIconIndex];

        currentIconIndex = (currentIconIndex + 1) % (icons.length - 1); // Exclude the last icon (plus icon)

        setTimeout(() => {
            isAnimating = false;
        }, 500); // Adjust the animation duration as needed
    }
}

// Start the FAB icon animation loop (e.g., every 2 seconds)
setInterval(animateFABIcon, 2000);

fabMyPurchases.addEventListener("click", (event) => {
    event.preventDefault();
    if (currentUser) {
        myPurchasesModal.style.display = "block";
        loadPurchasedHouses();
    } else {
        alert("Veuillez vous connecter pour voir vos achats.");
        showAuthModal();
    }
});

fabLoginRegister.addEventListener("click", (event) => {
    event.preventDefault();
    showAuthModal();
});

fabSearch.addEventListener("click", (event) => {
    event.preventDefault();
    // Show the search section instead of a modal
    searchSection.style.display = "block";
});

// Event Listeners for Filters in Search Section
// Remove the old applyFiltersButton event listener

// Add event listeners for real-time filtering
searchInput.addEventListener("input", applyFiltersAndDisplayHouses);
typeFilter.addEventListener("change", applyFiltersAndDisplayHouses);
priceFilter.addEventListener("input", applyFiltersAndDisplayHouses);

// Initial Load
loadHouses();