import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getDatabase, ref, onValue, get } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

// Firebase Configuration
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
const searchInput = document.getElementById("search-input");
const searchButton = document.getElementById("search-button");
const typeFilter = document.getElementById("type-filter");
const priceFilter = document.getElementById("price-filter");
const applyFiltersButton = document.getElementById("apply-filters-button");
const paymentModal = document.getElementById("payment-modal");
const paymentDetails = document.getElementById("payment-details");
const payButton = document.getElementById("pay-button");
const closeModalButton = document.querySelector(".close-modal");

let selectedHouse = null;
let housesData = {}; // Store fetched houses data

// Load Houses from Firebase
function loadHouses() {
  showLoading();
  const housesRef = ref(database, 'maisons');
  onValue(housesRef, (snapshot) => {
    housesData = snapshot.val();
    displayHouses(housesData);
  }, {
    onlyOnce: true
  });
}

// Display Houses
async function displayHouses(houses) {
  housesContainer.innerHTML = "";
  for (const houseId in houses) {
    const house = houses[houseId];
    if (house) {
      try {
        const proprietaireSnapshot = await get(ref(database, `proprietaires/${house.proprietaire}`));
        const proprietaire = proprietaireSnapshot.val();

        // Récupérer les informations de l'agence
        const userSnapshot = await get(ref(database, `users/${house.userId}`));
        const user = userSnapshot.val();
        const agence = user.agence;

        const houseDiv = document.createElement("div");
        houseDiv.className = "house-card";
        houseDiv.innerHTML = `
          <h3>${house.type} à louer</h3>
          <p><strong>Agence:</strong> ${agence ? agence.nom + ' ' + agence.prenom : "Inconnue"}</p>
          <p><strong>Contact Agence:</strong> ${agence ? agence.telephone : "Inconnu"}</p>
          <p><strong>Propriétaire:</strong> ${proprietaire ? proprietaire.nom + " " + proprietaire.prenom : "Inconnu"}</p>
          <p><strong>Localisation:</strong> ${house.ville}, ${house.commune}, ${house.quartier}</p>
          <p><strong>Nombre de pièces:</strong> ${house.pieces}</p>
          <p><strong>Loyer:</strong> ${house.loyer} FCFA</p>
          <button class="rent-button" data-house-id="${houseId}">LOUER</button>
        `;
        housesContainer.appendChild(houseDiv);

        const rentButton = houseDiv.querySelector(".rent-button");
        rentButton.addEventListener("click", () => {
          selectedHouse = { id: houseId, ...house, userId: house.userId }; // Include userId
          showPaymentModal(house);
        });
      } catch (error) {
        console.error("Error fetching details:", error);
      } finally {
        hideLoading();
      }
    } else {
      console.log("House data is null for ID:", houseId);
      hideLoading();
    }
  }
}

// Search Houses
function searchHouses(query) {
  const filteredHouses = {};
  for (const houseId in housesData) {
    const house = housesData[houseId];
    if (house.ville.toLowerCase().includes(query) ||
        house.commune.toLowerCase().includes(query) ||
        house.quartier.toLowerCase().includes(query)) {
      filteredHouses[houseId] = house;
    }
  }
  displayHouses(filteredHouses);
}

// Filter Houses
function filterHouses() {
  const type = typeFilter.value;
  const maxPrice = parseInt(priceFilter.value) || Infinity;
  const filteredHouses = {};
  for (const houseId in housesData) {
    const house = housesData[houseId];
    if ((!type || house.type === type) && house.loyer <= maxPrice) {
      filteredHouses[houseId] = house;
    }
  }
  displayHouses(filteredHouses);
}

// Show Payment Modal
function showPaymentModal(house) {
    paymentDetails.innerHTML = `
        <p><strong>Maison:</strong> ${house.ville}, ${house.commune}, ${house.quartier}</p>
        <p><strong>Loyer:</strong> ${house.loyer} FCFA</p>
        <!-- Add more details as needed -->
    `;
    paymentModal.style.display = "block";
}

// Close Modal
closeModalButton.addEventListener("click", () => {
    paymentModal.style.display = "none";
});

// Handle Payment
payButton.addEventListener("click", async () => {
  if (!selectedHouse) {
    alert("Veuillez sélectionner une maison à louer.");
    return;
  }

  // Récupérer la clé publique de l'agence
  const userSnapshot = await get(ref(database, `users/${selectedHouse.userId}`));
  const user = userSnapshot.val();
  const agence = user.agence;
  const publicKey = agence ? agence.apiKey : null;

  if (!publicKey) {
    alert("Clé API publique de l'agence non trouvée.");
    return;
  }

  const amount = selectedHouse.loyer;
  const description = `Loyer pour ${selectedHouse.ville}, ${selectedHouse.commune}, ${selectedHouse.quartier}`;

  showLoading();
  FedaPay.init({
    public_key: publicKey, // Utiliser la clé publique de l'agence
    transaction: {
      amount: amount,
      description: description,
    },
    customer: {
      email: "user@example.com", // Replace with the user's email (you need to collect this)
    },
    onComplete: function (transaction) {
      if (transaction.reason === FedaPay.CHECKOUT_COMPLETED) {
        alert("Paiement réussi! Vous allez recevoir un reçu par email.");
        paymentModal.style.display = "none";
        // Here you can save the transaction details to Firebase or your own server
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

// Event Listeners
searchButton.addEventListener("click", () => {
  const query = searchInput.value.toLowerCase();
  searchHouses(query);
});

applyFiltersButton.addEventListener("click", filterHouses);

// Functions to show/hide loading
function showLoading() {
  document.getElementById("loading-overlay").style.display = "flex";
}

function hideLoading() {
  document.getElementById("loading-overlay").style.display = "none";
}

// Initial Load
loadHouses();