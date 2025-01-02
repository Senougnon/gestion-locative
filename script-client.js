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

// Load Houses from Firebase
function loadHouses() {
  showLoading();
  const housesRef = ref(database, 'maisons');
  onValue(housesRef, (snapshot) => {
    housesData = snapshot.val();
    // Display the 6 most recently added houses
    displayHouses(getRecentHouses(housesData, 6));
  }, {
    onlyOnce: true
  });
}

function getRecentHouses(houses, count) {
  const sortedHouses = Object.entries(houses).sort((a, b) => {
    // Assuming you have a 'timestamp' field to track creation time
    return a[1].timestamp - b[1].timestamp; // Sort in ascending order (oldest first)
  });

  // Get the last 'count' elements (most recent)
  const recentHouses = sortedHouses.slice(-count).reduce((obj, [key, value]) => {
    obj[key] = value;
    return obj;
  }, {});

  return recentHouses;
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

        const userSnapshot = await get(ref(database, `users/${house.userId}`));
        const user = userSnapshot.val();
        const agence = user.agence;

        const houseDiv = document.createElement("div");
        houseDiv.className = "house-card";

        // Embed YouTube video using iframe
        let mediaElement = '';
        if (house.media) {
          if (house.media.includes("youtube")) {
            const videoId = getYoutubeVideoId(house.media);
            mediaElement = `<iframe width="100%" height="200px" src="https://www.youtube.com/embed/${videoId}" frameborder="0" allowfullscreen></iframe>`;
          } else {
            mediaElement = `<img src="${house.media}" alt="Image de la maison">`;
          }
        }

        houseDiv.innerHTML = `
          <h3>${house.type} à louer</h3>
          ${mediaElement}
          <p class="location"><strong>Localisation:</strong> ${house.ville}, ${house.commune}, ${house.quartier}</p>
          <p class="price"><strong>Loyer:</strong> ${house.loyer} FCFA</p>
          <div class="more-info">Plus d'infos</div>
          <div class="hidden-info">
              <p><strong>Agence:</strong> ${agence ? agence.nom + ' ' + agence.prenom : "Inconnue"}</p>
              <p><strong>Contact Agence:</strong> ${agence ? agence.telephone : "Inconnu"}</p>
              <p><strong>Propriétaire:</strong> ${proprietaire ? proprietaire.nom + " " + proprietaire.prenom : "Inconnu"}</p>
              <p><strong>Nombre de pièces:</strong> ${house.pieces}</p>
          </div>
          <button class="rent-button" data-house-id="${houseId}">LOUER</button>
        `;
        housesContainer.appendChild(houseDiv);

        const moreInfoButton = houseDiv.querySelector(".more-info");
        const hiddenInfo = houseDiv.querySelector(".hidden-info");
        moreInfoButton.addEventListener("click", () => {
          hiddenInfo.style.display = hiddenInfo.style.display === "none" ? "block" : "none";
        });

        const rentButton = houseDiv.querySelector(".rent-button");
        rentButton.addEventListener("click", () => {
          selectedHouse = { id: houseId, ...house, userId: house.userId };
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

// Extract YouTube video ID from URL (helper function for embedding)
function getYoutubeVideoId(url) {
  const match = url.match(/[?&]v=([^?&]+)/);
  return match && match[1];
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
    if ((!type || house.type.toLowerCase().includes(type.toLowerCase())) && house.loyer <= maxPrice) {
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
    public_key: publicKey,
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
loadConstructionTypes();
loadHouses();