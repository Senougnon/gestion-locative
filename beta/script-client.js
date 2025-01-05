import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getDatabase, ref, onValue, get, set, push } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

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

// Load Houses from Firebase
function loadHouses() {
    showLoading();
    const housesRef = ref(database, 'maisons');
    onValue(housesRef, (snapshot) => {
        housesData = snapshot.val();
        // Apply filters and display houses
        applyFiltersAndDisplayHouses();
    }, {
        onlyOnce: true
    });
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

// Display Houses
async function displayHouses(houses) {
  housesContainer.innerHTML = ""; // Clear the container
  for (const houseId in houses) {
      const house = houses[houseId];
      // Check if the house has been purchased
      const isPurchased = house.purchasedBy && house.purchasedBy.length > 0;

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
                  <button class="rent-button" data-house-id="${houseId}" ${isPurchased ? 'disabled' : ''}>
                      ${isPurchased ? 'Indisponible' : 'LOUER'}
                  </button>
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
                  if (currentUser) {
                      // User is logged in
                      const housePaid = paymentStatus[houseId];
                      if (housePaid) {
                          // House has been paid for, show details directly
                          showDetailsModal(selectedHouse);
                      } else {
                          // House not paid for, show payment modal
                          showPaymentModal(selectedHouse);
                      }
                  } else {
                      // User is not logged in, prompt them to log in or register
                      alert("Veuillez vous connecter pour louer une maison.");
                      showAuthModal();
                  }
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
function showPaymentModal(house) {
    paymentDetails.innerHTML = `
        <p><strong>Maison:</strong> ${house.ville}, ${house.commune}, ${house.quartier}</p>
        <p><strong>Loyer:</strong> ${house.loyer} FCFA</p>
    `;
    paymentModal.style.display = "block";
}

// Handle Payment
payButton.addEventListener("click", async () => {
  if (!currentUser) {
    // Vérifie si l'utilisateur est connecté
    alert("Veuillez vous connecter ou vous inscrire pour effectuer un paiement.");
    showAuthModal();
    return;
  }

  // Si l'utilisateur est connecté, le reste du code s'exécute normalement
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
    onComplete: async function(transaction) {
      if (transaction.reason === FedaPay.CHECKOUT_COMPLETED) {
        alert(
          "Paiement réussi! Vous allez recevoir un reçu par email."
        );
        paymentModal.style.display = "none";
        // Marque la maison comme achetée
        await markHouseAsPurchased(selectedHouse.id, currentUser.id);
        paymentStatus[selectedHouse.id] = true;
        // Show the details modal directly after successful payment
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
function showLoading() {
    document.getElementById("loading-overlay").style.display = "flex";
}

function hideLoading() {
    document.getElementById("loading-overlay").style.display = "none";
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
                    if (house.media.includes("youtube")) {
                        const videoId = getYoutubeVideoId(house.media);
                        houseDiv.innerHTML += `<iframe width="100%" height="200px" src="https://www.youtube.com/embed/${videoId}" frameborder="0" allowfullscreen></iframe>`;
                    } else {
                        houseDiv.innerHTML += `<img src="${house.media}" alt="Image de la maison" style="width: 100%; height: 200px; object-fit: cover;">`;
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
loadConstructionTypes();
loadHouses();