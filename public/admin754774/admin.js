// Constantes pour l'authentification
const ADMIN_ID = '41744877754151';
const ADMIN_PASSWORD = 'monrdes47854kjug!14541!54grde';

// Variables globales
let currentPage = 1;
let usersPerPage = 10;
let totalUsers = 0;
let totalPages = 0;
let searchTerm = '';

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
            fetchUsers();
        }
    });
    
    nextPageBtn.addEventListener('click', () => {
        if (currentPage < totalPages) {
            currentPage++;
            fetchUsers();
        }
    });
    
    // Événements pour les boutons d'action (délégation d'événements)
    usersTableBody.addEventListener('click', (e) => {
        const target = e.target;
        
        // Bouton "Voir"
        if (target.classList.contains('view-btn')) {
            const userId = target.getAttribute('data-id');
            showUserDetails(userId);
        }
        
        // Bouton "Supprimer"
        if (target.classList.contains('delete-btn')) {
            const userId = target.getAttribute('data-id');
            if (confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ?')) {
                deleteUser(userId);
            }
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
    // Afficher un indicateur de chargement
    usersTableBody.innerHTML = '<tr><td colspan="7" style="text-align: center;">Chargement des données...</td></tr>';
    
    // Construire l'URL avec les paramètres de pagination et de recherche
    const url = `/api/users?page=${currentPage}&limit=${usersPerPage}${searchTerm ? `&search=${encodeURIComponent(searchTerm)}` : ''}`;
    
    fetch(url)
        .then(response => response.json())
        .then(data => {
            // Mettre à jour les variables globales
            totalUsers = data.total;
            totalPages = data.totalPages;
            
            // Afficher les utilisateurs
            displayUsers(data.users);
            
            // Mettre à jour les informations de pagination
            updatePagination();
            
            // Mettre à jour les statistiques
            updateStats(data.users);
        })
        .catch(error => {
            console.error('Erreur lors de la récupération des utilisateurs:', error);
            usersTableBody.innerHTML = '<tr><td colspan="7" style="text-align: center;">Erreur lors du chargement des données</td></tr>';
        });
}

// Gérer la recherche
function handleSearch() {
    searchTerm = searchInput.value.toLowerCase();
    currentPage = 1; // Réinitialiser à la première page lors d'une recherche
    fetchUsers();
}

// Afficher les utilisateurs
function displayUsers(users) {
    // Vider le tableau
    usersTableBody.innerHTML = '';
    
    // Si aucun utilisateur n'est trouvé
    if (users.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = `<td colspan="7" style="text-align: center;">Aucun utilisateur trouvé</td>`;
        usersTableBody.appendChild(row);
    } else {
        // Afficher les utilisateurs
        users.forEach(user => {
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
        });
    }
}

// Mettre à jour les informations de pagination
function updatePagination() {
    // Mettre à jour le texte de pagination
    pageInfo.textContent = `Page ${currentPage} sur ${totalPages || 1}`;
    
    // Activer/désactiver les boutons de pagination
    prevPageBtn.disabled = currentPage <= 1;
    nextPageBtn.disabled = currentPage >= totalPages;
}

// Mettre à jour les statistiques
function updateStats(users) {
    // Afficher le nombre total d'utilisateurs
    totalUsersElement.textContent = totalUsers;
    
    // Trouver le score le plus élevé
    let highestScore = 0;
    
    if (users && users.length > 0) {
        highestScore = users.reduce((max, user) => {
            const score = parseInt(user.bestScore) || 0;
            return score > max ? score : max;
        }, 0);
    }
    
    highestScoreElement.textContent = highestScore;
}

// Afficher les détails d'un utilisateur
function showUserDetails(userId) {
    // Construire l'URL avec les paramètres de pagination et de recherche
    const url = `/api/users?search=${encodeURIComponent(userId)}`;
    
    fetch(url)
        .then(response => response.json())
        .then(data => {
            if (data.users && data.users.length > 0) {
                const user = data.users[0];
                
                // Remplir la modal avec les détails de l'utilisateur
                document.getElementById('modal-user-id').textContent = user.gameId || 'N/A';
                document.getElementById('modal-username').textContent = user.gameUsername || 'N/A';
                document.getElementById('modal-telegram-id').textContent = user.telegramId || 'N/A';
                document.getElementById('modal-telegram-username').textContent = user.telegramUsername || 'N/A';
                document.getElementById('modal-paypal').textContent = user.paypalEmail || 'N/A';
                document.getElementById('modal-best-score').textContent = user.bestScore || '0';
                document.getElementById('modal-registration-date').textContent = user.registrationDate || 'N/A';
                document.getElementById('modal-last-login').textContent = user.lastLogin || 'N/A';
                
                // Afficher la modal
                userModal.style.display = 'flex';
            } else {
                alert('Utilisateur non trouvé');
            }
        })
        .catch(error => {
            console.error('Erreur lors de la récupération des détails de l\'utilisateur:', error);
            alert('Erreur lors de la récupération des détails de l\'utilisateur');
        });
}

// Supprimer un utilisateur
function deleteUser(userId) {
    fetch(`/api/users/${userId}`, {
        method: 'DELETE'
    })
        .then(response => {
            if (response.ok) {
                // Recharger les données après la suppression
                fetchUsers();
                alert('Utilisateur supprimé avec succès');
            } else {
                alert('Erreur lors de la suppression de l\'utilisateur');
            }
        })
        .catch(error => {
            console.error('Erreur lors de la suppression de l\'utilisateur:', error);
            alert('Erreur lors de la suppression de l\'utilisateur');
        });
}
