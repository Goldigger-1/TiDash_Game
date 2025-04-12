// Constantes pour l'authentification
const ADMIN_ID = '41744877754151';
const ADMIN_PASSWORD = 'monrdes47854kjug!14541!54grde';

// Variables globales
let currentPage = 1;
let usersPerPage = 10;
let totalUsers = 0;
let totalPages = 0;
let searchTerm = '';
let currentSeason = null;
let seasons = [];

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
const activeSeason = document.getElementById('active-season');
const prizeMoney = document.getElementById('prize-money');
const seasonNumber = document.getElementById('season-number');
const seasonEndDate = document.getElementById('season-end-date');
const seasonPrize = document.getElementById('season-prize');
const seasonStatus = document.getElementById('season-status');
const seasonRankingTable = document.getElementById('season-ranking-table');
const seasonsHistoryTable = document.getElementById('seasons-history-table');
const globalRankingTable = document.getElementById('global-ranking-table');
const newSeasonBtn = document.getElementById('new-season-btn');
const editSeasonBtn = document.getElementById('edit-season-btn');
const closeSeasonBtn = document.getElementById('close-season-btn');
const seasonModal = document.getElementById('season-modal');
const seasonModalTitle = document.getElementById('season-modal-title');
const seasonNumberInput = document.getElementById('season-number-input');
const seasonEndDateInput = document.getElementById('season-end-date-input');
const seasonPrizeInput = document.getElementById('season-prize-input');
const cancelSeasonBtn = document.getElementById('cancel-season-btn');
const saveSeasonBtn = document.getElementById('save-season-btn');
const closeSeasonModal = document.getElementById('close-season-modal');
const closeSeasonNumberSpan = document.getElementById('close-season-number');
const cancelCloseSeasonBtn = document.getElementById('cancel-close-season-btn');
const confirmCloseSeasonBtn = document.getElementById('confirm-close-season-btn');
const seasonScoresModal = document.getElementById('season-scores-modal');
const scoresSeasonNumber = document.getElementById('scores-season-number');
const scoresRankingTable = document.getElementById('scores-ranking-table');
const tabButtons = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

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
    fetchSeasons();
    fetchGlobalRanking();
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
    
    // Événements pour les saisons
    newSeasonBtn.addEventListener('click', () => {
        seasonModalTitle.textContent = 'Nouvelle saison';
        seasonModal.style.display = 'flex';
    });
    
    editSeasonBtn.addEventListener('click', () => {
        seasonModalTitle.textContent = 'Éditer la saison';
        seasonModal.style.display = 'flex';
    });
    
    closeSeasonBtn.addEventListener('click', () => {
        closeSeasonModal.style.display = 'flex';
    });
    
    cancelSeasonBtn.addEventListener('click', () => {
        seasonModal.style.display = 'none';
    });
    
    saveSeasonBtn.addEventListener('click', () => {
        // Enregistrer les modifications de la saison
        const seasonNumberValue = seasonNumberInput.value.trim();
        const seasonEndDateValue = seasonEndDateInput.value.trim();
        const seasonPrizeValue = seasonPrizeInput.value.trim();
        
        // Enregistrer les données de la saison
        fetch('/api/seasons', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                seasonNumber: seasonNumberValue,
                seasonEndDate: seasonEndDateValue,
                seasonPrize: seasonPrizeValue
            })
        })
        .then(response => response.json())
        .then(data => {
            console.log(data);
            seasonModal.style.display = 'none';
        })
        .catch(error => {
            console.error('Erreur lors de l\'enregistrement de la saison:', error);
        });
    });
    
    cancelCloseSeasonBtn.addEventListener('click', () => {
        closeSeasonModal.style.display = 'none';
    });
    
    confirmCloseSeasonBtn.addEventListener('click', () => {
        // Fermer la saison
        fetch('/api/seasons/close', {
            method: 'POST'
        })
        .then(response => response.json())
        .then(data => {
            console.log(data);
            closeSeasonModal.style.display = 'none';
        })
        .catch(error => {
            console.error('Erreur lors de la fermeture de la saison:', error);
        });
    });
    
    // Événements pour les onglets
    tabButtons.forEach((button, index) => {
        button.addEventListener('click', () => {
            // Activer l'onglet sélectionné
            tabButtons.forEach(button => button.classList.remove('active'));
            button.classList.add('active');
            
            // Afficher le contenu de l'onglet sélectionné
            tabContents.forEach(content => content.style.display = 'none');
            tabContents[index].style.display = 'block';
        });
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

// Récupérer les saisons depuis l'API
function fetchSeasons() {
    fetch('/api/seasons')
        .then(response => response.json())
        .then(data => {
            seasons = data;
            displaySeasons();
            
            // Récupérer la saison active
            fetchActiveSeason();
        })
        .catch(error => {
            console.error('Erreur lors de la récupération des saisons:', error);
        });
}

// Récupérer la saison active
function fetchActiveSeason() {
    fetch('/api/active-season')
        .then(response => {
            if (response.status === 404) {
                // Aucune saison active
                activeSeason.textContent = 'Aucune';
                prizeMoney.textContent = '$0';
                seasonNumber.textContent = '-';
                seasonEndDate.textContent = '-';
                seasonPrize.textContent = '$0';
                seasonStatus.textContent = 'Aucune saison active';
                
                // Désactiver les boutons d'édition et de clôture
                editSeasonBtn.disabled = true;
                closeSeasonBtn.disabled = true;
                
                // Afficher un message dans le tableau de classement
                seasonRankingTable.innerHTML = '<tr><td colspan="3" style="text-align: center;">Aucune saison active</td></tr>';
                
                return null;
            }
            return response.json();
        })
        .then(data => {
            if (!data) return;
            
            // Mettre à jour les informations de la saison active
            currentSeason = data;
            activeSeason.textContent = `Saison ${data.seasonNumber}`;
            prizeMoney.textContent = `$${data.prizeMoney}`;
            seasonNumber.textContent = data.seasonNumber;
            seasonEndDate.textContent = formatDate(data.endDate);
            seasonPrize.textContent = `$${data.prizeMoney}`;
            seasonStatus.textContent = data.isClosed ? 'Clôturée' : 'Active';
            
            // Activer/désactiver les boutons d'édition et de clôture
            editSeasonBtn.disabled = data.isClosed;
            closeSeasonBtn.disabled = data.isClosed;
            
            // Récupérer le classement de la saison active
            fetchSeasonRanking(data.id);
        })
        .catch(error => {
            console.error('Erreur lors de la récupération de la saison active:', error);
        });
}

// Récupérer le classement d'une saison
function fetchSeasonRanking(seasonId) {
    fetch(`/api/seasons/${seasonId}/ranking`)
        .then(response => response.json())
        .then(data => {
            displaySeasonRanking(data);
        })
        .catch(error => {
            console.error('Erreur lors de la récupération du classement de la saison:', error);
        });
}

// Afficher le classement d'une saison
function displaySeasonRanking(data) {
    // Vider le tableau
    seasonRankingTable.innerHTML = '';
    
    // Si aucun score n'est trouvé
    if (data.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = `<td colspan="3" style="text-align: center;">Aucun score enregistré</td>`;
        seasonRankingTable.appendChild(row);
    } else {
        // Afficher les scores
        data.forEach((score, index) => {
            const row = document.createElement('tr');
            
            row.innerHTML = `
                <td>${index + 1}</td>
                <td>${score.username}</td>
                <td>${score.score}</td>
            `;
            
            seasonRankingTable.appendChild(row);
        });
    }
}

// Afficher les saisons
function displaySeasons() {
    // Vider le tableau
    seasonsHistoryTable.innerHTML = '';
    
    // Si aucune saison n'est trouvée
    if (seasons.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = `<td colspan="5" style="text-align: center;">Aucune saison trouvée</td>`;
        seasonsHistoryTable.appendChild(row);
    } else {
        // Afficher les saisons
        seasons.forEach(season => {
            const row = document.createElement('tr');
            
            // Déterminer le gagnant
            let winnerText = '-';
            if (season.isClosed && season.winnerId) {
                // Ici, vous pourriez faire une requête pour obtenir le nom du gagnant
                // Pour l'instant, on affiche juste l'ID
                winnerText = season.winnerId;
            }
            
            row.innerHTML = `
                <td>Saison ${season.seasonNumber}</td>
                <td>${formatDate(season.endDate)}</td>
                <td>$${season.prizeMoney}</td>
                <td>${winnerText}</td>
                <td>
                    <button class="action-btn view" data-season-id="${season.id}">Voir les scores</button>
                </td>
            `;
            
            // Ajouter un gestionnaire d'événements pour le bouton "Voir les scores"
            row.querySelector('.action-btn.view').addEventListener('click', () => {
                viewSeasonScores(season);
            });
            
            seasonsHistoryTable.appendChild(row);
        });
    }
}

// Voir les scores d'une saison
function viewSeasonScores(season) {
    // Mettre à jour le titre du modal
    scoresSeasonNumber.textContent = season.seasonNumber;
    
    // Afficher le modal
    seasonScoresModal.style.display = 'flex';
    
    // Récupérer les scores de la saison
    fetch(`/api/seasons/${season.id}/ranking`)
        .then(response => response.json())
        .then(data => {
            // Vider le tableau
            scoresRankingTable.innerHTML = '';
            
            // Si aucun score n'est trouvé
            if (data.length === 0) {
                const row = document.createElement('tr');
                row.innerHTML = `<td colspan="3" style="text-align: center;">Aucun score enregistré</td>`;
                scoresRankingTable.appendChild(row);
            } else {
                // Afficher les scores
                data.forEach((score, index) => {
                    const row = document.createElement('tr');
                    
                    row.innerHTML = `
                        <td>${index + 1}</td>
                        <td>${score.username}</td>
                        <td>${score.score}</td>
                    `;
                    
                    scoresRankingTable.appendChild(row);
                });
            }
        })
        .catch(error => {
            console.error('Erreur lors de la récupération des scores de la saison:', error);
        });
}

// Formater une date
function formatDate(dateString) {
    if (!dateString) return '-';
    
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Récupérer le classement global depuis l'API
function fetchGlobalRanking() {
    fetch('/api/global-ranking')
        .then(response => response.json())
        .then(data => {
            displayGlobalRanking(data);
        })
        .catch(error => {
            console.error('Erreur lors de la récupération du classement global:', error);
        });
}

// Afficher le classement global
function displayGlobalRanking(data) {
    // Vider le tableau
    globalRankingTable.innerHTML = '';
    
    // Si aucun utilisateur n'est trouvé
    if (data.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = `<td colspan="3" style="text-align: center;">Aucun utilisateur trouvé</td>`;
        globalRankingTable.appendChild(row);
    } else {
        // Afficher les utilisateurs
        data.forEach(user => {
            const row = document.createElement('tr');
            
            row.innerHTML = `
                <td>${user.gameId}</td>
                <td>${user.gameUsername}</td>
                <td>${user.bestScore}</td>
            `;
            
            globalRankingTable.appendChild(row);
        });
    }
}
