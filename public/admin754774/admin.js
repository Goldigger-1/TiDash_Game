// Constantes pour l'authentification
const ADMIN_ID = '41744877754151';
const ADMIN_PASSWORD = 'monrdes47854kjug!14541!54grde';

// Variables globales
let currentPage = 1;
let usersPerPage = 10;
let allUsers = [];
let filteredUsers = [];

// Éléments DOM
const loginContainer = document.getElementById('login-container');
const adminDashboard = document.getElementById('admin-dashboard');
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');
const adminIdInput = document.getElementById('admin-id');
const adminPasswordInput = document.getElementById('admin-password');
const loginError = document.getElementById('login-error');
const usersTableBody = document.getElementById('users-table-body');
const searchInput = document.getElementById('search-users');
const prevPageBtn = document.getElementById('prev-page');
const nextPageBtn = document.getElementById('next-page');
const pageInfo = document.getElementById('page-info');
const totalUsersElement = document.getElementById('total-users');
const highestScoreElement = document.getElementById('highest-score');
const userModal = document.getElementById('user-modal');
const closeModal = document.querySelector('.close-modal');

// Événements au chargement de la page
document.addEventListener('DOMContentLoaded', () => {
    // Vérifier si l'utilisateur est déjà connecté (via sessionStorage)
    if (sessionStorage.getItem('adminLoggedIn') === 'true') {
        showDashboard();
    }

    // Initialiser les événements
    initEvents();
    
    // Charger les données réelles
    fetchUsers();
});

// Initialiser tous les événements
function initEvents() {
    // Événement de connexion
    loginBtn.addEventListener('click', handleLogin);
    
    // Permettre la connexion avec la touche Entrée
    adminPasswordInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleLogin();
        }
    });
    
    // Événement de déconnexion
    logoutBtn.addEventListener('click', handleLogout);
    
    // Événement de recherche
    searchInput.addEventListener('input', handleSearch);
    
    // Événements de pagination
    prevPageBtn.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            displayUsers();
        }
    });
    
    nextPageBtn.addEventListener('click', () => {
        const totalPages = Math.ceil(filteredUsers.length / usersPerPage);
        if (currentPage < totalPages) {
            currentPage++;
            displayUsers();
        }
    });
    
    // Fermer la modal
    closeModal.addEventListener('click', () => {
        userModal.style.display = 'none';
    });
    
    // Fermer la modal en cliquant en dehors
    window.addEventListener('click', (e) => {
        if (e.target === userModal) {
            userModal.style.display = 'none';
        }
    });
    
    // Événements pour les boutons d'action (délégation d'événements)
    usersTableBody.addEventListener('click', (e) => {
        if (e.target.classList.contains('view-btn')) {
            const userId = e.target.dataset.id;
            showUserDetails(userId);
        } else if (e.target.classList.contains('delete-btn')) {
            const userId = e.target.dataset.id;
            confirmDeleteUser(userId);
        }
    });
}

// Gérer la connexion
function handleLogin() {
    const id = adminIdInput.value.trim();
    const password = adminPasswordInput.value.trim();
    
    if (id === ADMIN_ID && password === ADMIN_PASSWORD) {
        // Stocker l'état de connexion
        sessionStorage.setItem('adminLoggedIn', 'true');
        showDashboard();
        loginError.textContent = '';
    } else {
        loginError.textContent = 'Identifiant ou mot de passe incorrect';
        adminPasswordInput.value = '';
    }
}

// Gérer la déconnexion
function handleLogout() {
    sessionStorage.removeItem('adminLoggedIn');
    adminDashboard.style.display = 'none';
    loginContainer.style.display = 'flex';
    adminIdInput.value = '';
    adminPasswordInput.value = '';
}

// Afficher le tableau de bord
function showDashboard() {
    loginContainer.style.display = 'none';
    adminDashboard.style.display = 'block';
    fetchUsers(); // Récupérer les données à chaque affichage du tableau de bord
}

// Récupérer les données utilisateurs depuis l'API
function fetchUsers() {
    fetch('/api/users')
        .then(response => response.json())
        .then(data => {
            allUsers = data;
            filteredUsers = [...allUsers];
            displayUsers();
            updateStats();
        })
        .catch(error => {
            console.error('Erreur lors de la récupération des utilisateurs:', error);
        });
}

// Gérer la recherche
function handleSearch() {
    const searchTerm = searchInput.value.toLowerCase();
    
    if (searchTerm === '') {
        filteredUsers = [...allUsers];
    } else {
        filteredUsers = allUsers.filter(user => 
            (user.gameId && user.gameId.toLowerCase().includes(searchTerm)) ||
            (user.gameUsername && user.gameUsername.toLowerCase().includes(searchTerm)) ||
            (user.telegramId && user.telegramId.toLowerCase().includes(searchTerm)) ||
            (user.telegramUsername && user.telegramUsername.toLowerCase().includes(searchTerm)) ||
            (user.paypalEmail && user.paypalEmail.toLowerCase().includes(searchTerm))
        );
    }
    
    currentPage = 1;
    displayUsers();
}

// Afficher les utilisateurs
function displayUsers() {
    // Vider le tableau
    usersTableBody.innerHTML = '';
    
    // Calculer les indices de début et de fin pour la pagination
    const startIndex = (currentPage - 1) * usersPerPage;
    const endIndex = Math.min(startIndex + usersPerPage, filteredUsers.length);
    
    // Si aucun utilisateur n'est trouvé
    if (filteredUsers.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = `<td colspan="7" style="text-align: center;">Aucun utilisateur trouvé</td>`;
        usersTableBody.appendChild(row);
    } else {
        // Afficher les utilisateurs pour la page actuelle
        for (let i = startIndex; i < endIndex; i++) {
            const user = filteredUsers[i];
            const row = document.createElement('tr');
            
            row.innerHTML = `
                <td>${user.gameId || 'N/A'}</td>
                <td>${user.gameUsername || 'N/A'}</td>
                <td>${user.telegramId || 'N/A'}</td>
                <td>${user.telegramUsername || 'N/A'}</td>
                <td>${user.paypalEmail || 'N/A'}</td>
                <td>${user.bestScore || '0'}</td>
                <td>
                    <button class="action-btn view-btn" data-id="${user.gameId}">Voir</button>
                    <button class="action-btn delete delete-btn" data-id="${user.gameId}">Supprimer</button>
                </td>
            `;
            
            usersTableBody.appendChild(row);
        }
    }
    
    // Mettre à jour l'information de pagination
    const totalPages = Math.ceil(filteredUsers.length / usersPerPage);
    pageInfo.textContent = `Page ${currentPage} sur ${totalPages || 1}`;
    
    // Activer/désactiver les boutons de pagination
    prevPageBtn.disabled = currentPage === 1;
    nextPageBtn.disabled = currentPage === totalPages || totalPages === 0;
}

// Mettre à jour les statistiques
function updateStats() {
    totalUsersElement.textContent = allUsers.length;
    
    // Trouver le meilleur score
    const highestScore = allUsers.reduce((max, user) => 
        (user.bestScore > max ? user.bestScore : max), 0);
    
    highestScoreElement.textContent = highestScore;
}

// Afficher les détails d'un utilisateur
function showUserDetails(userId) {
    const user = allUsers.find(u => u.gameId === userId);
    
    if (user) {
        // Remplir la modal avec les détails de l'utilisateur
        document.getElementById('modal-game-id').textContent = user.gameId || 'N/A';
        document.getElementById('modal-game-username').textContent = user.gameUsername || 'N/A';
        document.getElementById('modal-telegram-id').textContent = user.telegramId || 'N/A';
        document.getElementById('modal-telegram-username').textContent = user.telegramUsername || 'N/A';
        document.getElementById('modal-paypal-email').textContent = user.paypalEmail || 'N/A';
        document.getElementById('modal-best-score').textContent = user.bestScore || '0';
        document.getElementById('modal-registration-date').textContent = user.registrationDate || 'N/A';
        document.getElementById('modal-last-login').textContent = user.lastLogin || 'N/A';
        
        // Configurer les boutons d'action
        document.getElementById('edit-user-btn').dataset.id = user.gameId;
        document.getElementById('delete-user-btn').dataset.id = user.gameId;
        
        // Afficher la modal
        userModal.style.display = 'flex';
        
        // Ajouter les événements pour les boutons de la modal
        document.getElementById('edit-user-btn').onclick = () => {
            // Fonctionnalité à implémenter
            alert('Fonctionnalité de modification à venir');
        };
        
        document.getElementById('delete-user-btn').onclick = () => {
            userModal.style.display = 'none';
            confirmDeleteUser(user.gameId);
        };
    }
}

// Confirmer la suppression d'un utilisateur
function confirmDeleteUser(userId) {
    if (confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ?')) {
        deleteUser(userId);
    }
}

// Supprimer un utilisateur
function deleteUser(userId) {
    // Appel à l'API pour supprimer l'utilisateur
    fetch(`/api/users/${userId}`, {
        method: 'DELETE',
    })
    .then(response => {
        if (response.ok) {
            // Supprimer l'utilisateur du tableau local
            allUsers = allUsers.filter(user => user.gameId !== userId);
            filteredUsers = filteredUsers.filter(user => user.gameId !== userId);
            
            // Mettre à jour l'affichage
            displayUsers();
            updateStats();
        } else {
            alert('Erreur lors de la suppression de l\'utilisateur');
        }
    })
    .catch(error => {
        console.error('Erreur:', error);
        alert('Erreur lors de la suppression de l\'utilisateur');
    });
}
