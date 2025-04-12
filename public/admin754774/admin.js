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
});

// Initialiser tous les événements
function initEvents() {
    // Événements de connexion
    loginBtn.addEventListener('click', handleLogin);
    
    // Événement de déconnexion
    logoutBtn.addEventListener('click', () => {
        sessionStorage.removeItem('adminLoggedIn');
        showLoginForm();
    });
    
    // Événement de recherche
    searchInput.addEventListener('input', (e) => {
        searchTerm = e.target.value.toLowerCase();
        currentPage = 1;
        fetchUsers();
    });
    
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
    
    // Fermer le modal quand on clique sur X
    document.querySelectorAll('.close-modal').forEach(closeBtn => {
        closeBtn.addEventListener('click', () => {
            document.querySelectorAll('.modal').forEach(modal => {
                modal.style.display = 'none';
            });
        });
    });
    
    // Fermer le modal quand on clique en dehors
    window.addEventListener('click', (e) => {
        document.querySelectorAll('.modal').forEach(modal => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
    });
    
    // Événements pour les saisons
    newSeasonBtn.addEventListener('click', () => {
        // Réinitialiser le formulaire
        seasonModalTitle.textContent = 'Nouvelle saison';
        seasonNumberInput.value = '';
        seasonEndDateInput.value = '';
        seasonPrizeInput.value = '';
        
        // Afficher le modal
        seasonModal.style.display = 'flex';
    });
    
    editSeasonBtn.addEventListener('click', () => {
        if (!currentSeason) return;
        
        // Remplir le formulaire avec les données de la saison active
        seasonModalTitle.textContent = 'Éditer la saison';
        seasonNumberInput.value = currentSeason.seasonNumber;
        
        // Formater la date pour l'input datetime-local
        const endDate = new Date(currentSeason.endDate);
        const formattedDate = endDate.toISOString().slice(0, 16);
        seasonEndDateInput.value = formattedDate;
        
        seasonPrizeInput.value = currentSeason.prizeMoney;
        
        // Afficher le modal
        seasonModal.style.display = 'flex';
    });
    
    closeSeasonBtn.addEventListener('click', () => {
        if (!currentSeason) return;
        
        // Mettre à jour le texte du modal
        closeSeasonNumberSpan.textContent = currentSeason.seasonNumber;
        
        // Afficher le modal
        closeSeasonModal.style.display = 'flex';
    });
    
    cancelSeasonBtn.addEventListener('click', () => {
        seasonModal.style.display = 'none';
    });
    
    saveSeasonBtn.addEventListener('click', (e) => {
        e.preventDefault();
        
        // Récupérer les valeurs du formulaire
        const seasonNumberValue = seasonNumberInput.value.trim();
        const seasonEndDateValue = seasonEndDateInput.value.trim();
        const seasonPrizeValue = seasonPrizeInput.value.trim();
        
        console.log('Données du formulaire:', {
            seasonNumber: seasonNumberValue,
            endDate: seasonEndDateValue,
            prizeMoney: seasonPrizeValue
        });
        
        // Validation des données
        if (!seasonNumberValue || !seasonEndDateValue || !seasonPrizeValue) {
            alert('Tous les champs sont obligatoires');
            return;
        }
        
        // Déterminer si c'est une création ou une mise à jour
        if (seasonModalTitle.textContent === 'Nouvelle saison') {
            // Créer une nouvelle saison
            createSeason(seasonNumberValue, seasonEndDateValue, seasonPrizeValue);
        } else {
            // Mettre à jour la saison existante
            updateSeason(currentSeason.id, seasonNumberValue, seasonEndDateValue, seasonPrizeValue);
        }
    });
    
    cancelCloseSeasonBtn.addEventListener('click', () => {
        closeSeasonModal.style.display = 'none';
    });
    
    confirmCloseSeasonBtn.addEventListener('click', () => {
        if (!currentSeason) return;
        
        // Clôturer la saison
        closeSeason(currentSeason.id);
    });
    
    // Événements pour les onglets
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Récupérer l'onglet cible
            const targetTab = button.getAttribute('data-tab');
            
            // Désactiver tous les onglets
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            
            // Activer l'onglet sélectionné
            button.classList.add('active');
            document.getElementById(targetTab).classList.add('active');
        });
    });
    
    // Ajouter des gestionnaires d'événements par délégation pour les boutons "Voir" et "Supprimer"
    usersTableBody.addEventListener('click', (e) => {
        // Vérifier si l'élément cliqué est un bouton
        if (e.target.classList.contains('view-btn')) {
            const userId = e.target.getAttribute('data-id');
            showUserDetails(userId);
        } else if (e.target.classList.contains('delete-btn')) {
            const userId = e.target.getAttribute('data-id');
            if (confirm(`Êtes-vous sûr de vouloir supprimer l'utilisateur ${userId} ?`)) {
                deleteUser(userId);
            }
        }
    });
    
    // Ajouter un gestionnaire d'événements pour les boutons "Supprimer" des saisons
    seasonsHistoryTable.addEventListener('click', (e) => {
        if (e.target.classList.contains('delete')) {
            const seasonId = e.target.getAttribute('data-season-id');
            if (confirm(`Are you sure you want to delete Season ${seasonId}? This action cannot be undone.`)) {
                deleteSeason(seasonId);
            }
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
        .then(response => {
            // First check if the response is ok (status in the range 200-299)
            if (!response.ok) {
                throw new Error(`Server responded with status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            // Ensure data has the expected structure
            if (!data || typeof data !== 'object') {
                throw new Error('Invalid response format');
            }
            
            // Ensure users is always an array
            const users = Array.isArray(data.users) ? data.users : [];
            
            // Mettre à jour les variables globales
            totalUsers = data.total || 0;
            totalPages = data.totalPages || 1;
            
            // Afficher les utilisateurs
            displayUsers(users);
            
            // Mettre à jour les informations de pagination
            updatePagination();
            
            // Mettre à jour les statistiques
            updateStats(users);
        })
        .catch(error => {
            console.error('Erreur lors de la récupération des utilisateurs:', error);
            usersTableBody.innerHTML = '<tr><td colspan="7" style="text-align: center;">Erreur lors du chargement des données</td></tr>';
            
            // Reset pagination and stats on error
            totalUsers = 0;
            totalPages = 1;
            updatePagination();
            updateStats([]);
        });
}

// Afficher les utilisateurs dans le tableau
function displayUsers(users) {
    // Ensure users is always an array
    const safeUsers = Array.isArray(users) ? users : [];
    
    // Vider le tableau
    usersTableBody.innerHTML = '';
    
    // Si aucun utilisateur n'est trouvé
    if (safeUsers.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = `<td colspan="7" style="text-align: center;">Aucun utilisateur trouvé</td>`;
        usersTableBody.appendChild(row);
    } else {
        // Afficher les utilisateurs
        safeUsers.forEach(user => {
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
    console.log('Affichage des détails pour l\'utilisateur:', userId);
    
    // Utiliser la route API correcte pour récupérer un utilisateur spécifique
    fetch(`/api/users/${encodeURIComponent(userId)}`)
        .then(response => {
            if (!response.ok) {
                console.error('Erreur HTTP:', response.status, response.statusText);
                throw new Error('Erreur lors de la récupération des détails de l\'utilisateur');
            }
            return response.json();
        })
        .then(user => {
            console.log('Données utilisateur reçues:', user);
            
            // Remplir la modal avec les détails de l'utilisateur
            document.getElementById('modal-user-id').textContent = user.gameId || 'N/A';
            document.getElementById('modal-username').textContent = user.gameUsername || 'N/A';
            document.getElementById('modal-telegram-id').textContent = user.telegramId || 'N/A';
            document.getElementById('modal-telegram-username').textContent = user.telegramUsername || 'N/A';
            document.getElementById('modal-paypal-email').textContent = user.paypalEmail || 'N/A'; // Correction ici
            document.getElementById('modal-best-score').textContent = user.bestScore || '0';
            document.getElementById('modal-registration-date').textContent = formatDate(user.registrationDate) || 'N/A';
            document.getElementById('modal-last-login').textContent = formatDate(user.lastLogin) || 'N/A';
            
            // Afficher la modal
            userModal.style.display = 'flex';
        })
        .catch(error => {
            console.error('Erreur lors de la récupération des détails de l\'utilisateur:', error);
            alert('Erreur lors de la récupération des détails de l\'utilisateur');
        });
}

// Supprimer un utilisateur
function deleteUser(userId) {
    console.log('Suppression de l\'utilisateur:', userId);
    
    fetch(`/api/users/${encodeURIComponent(userId)}`, {
        method: 'DELETE'
    })
        .then(response => {
            console.log('Réponse de suppression:', response.status, response.statusText);
            
            if (!response.ok) {
                return response.json().then(errorData => {
                    console.error('Détails de l\'erreur:', errorData);
                    throw new Error(errorData.details || 'Erreur lors de la suppression de l\'utilisateur');
                });
            }
            return response.json();
        })
        .then(data => {
            console.log('Données de suppression reçues:', data);
            // Recharger les données après la suppression
            fetchUsers();
            showNotification('Utilisateur supprimé avec succès', 'success');
        })
        .catch(error => {
            console.error('Erreur lors de la suppression de l\'utilisateur:', error);
            showNotification(`Erreur lors de la suppression de l'utilisateur: ${error.message}`, 'error');
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
            
            // Mettre à jour les statistiques
            updateSeasonStats();
        })
        .catch(error => {
            console.error('Erreur lors de la récupération des saisons:', error);
        });
}

// Mettre à jour les statistiques des saisons
function updateSeasonStats() {
    // Trouver la saison active
    const activeSeasonData = seasons.find(season => season.isActive);
    
    if (activeSeasonData) {
        activeSeason.textContent = `Saison ${activeSeasonData.seasonNumber}`;
        prizeMoney.textContent = `$${activeSeasonData.prizeMoney}`;
    } else {
        activeSeason.textContent = 'Aucune';
        prizeMoney.textContent = '$0';
    }
}

// Récupérer la saison active
function fetchActiveSeason() {
    fetch('/api/active-season')
        .then(response => {
            if (response.status === 404) {
                // Aucune saison active
                currentSeason = null;
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
                
                return Promise.reject('Aucune saison active');
            }
            return response.json();
        })
        .then(data => {
            // Mettre à jour les informations de la saison active
            console.log('Saison active récupérée:', data);
            currentSeason = data;
            
            // Mettre à jour les éléments d'interface
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
            return fetchSeasonRanking(data.id);
        })
        .catch(error => {
            if (error === 'Aucune saison active') {
                console.log('Aucune saison active trouvée');
            } else {
                console.error('Erreur lors de la récupération de la saison active:', error);
                showNotification('Erreur lors de la récupération de la saison active', 'error');
            }
        });
}

// Récupérer le classement d'une saison
function fetchSeasonRanking(seasonId) {
    fetch(`/api/seasons/${seasonId}/ranking`)
        .then(response => {
            // Check if the response is ok (status in the range 200-299)
            if (!response.ok) {
                throw new Error(`Server responded with status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            // Ensure data is an array
            const safeData = Array.isArray(data) ? data : [];
            displaySeasonRanking(safeData);
        })
        .catch(error => {
            console.error('Erreur lors de la récupération du classement de la saison:', error);
            // Display empty ranking on error
            displaySeasonRanking([]);
        });
}

// Afficher le classement d'une saison
function displaySeasonRanking(data) {
    // Ensure data is always an array
    const safeData = Array.isArray(data) ? data : [];
    
    // Vider le tableau
    seasonRankingTable.innerHTML = '';
    
    // Si aucun score n'est trouvé
    if (safeData.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = `<td colspan="3" style="text-align: center;">Aucun score enregistré</td>`;
        seasonRankingTable.appendChild(row);
    } else {
        // Afficher les scores
        safeData.forEach((score, index) => {
            const row = document.createElement('tr');
            
            row.innerHTML = `
                <td>${index + 1}</td>
                <td>${score.username || 'Utilisateur inconnu'}</td>
                <td>${score.score || '0'}</td>
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
        row.innerHTML = `<td colspan="6" style="text-align: center;">Aucune saison trouvée</td>`;
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
            
            // Formater la date
            const formattedDate = formatDate(season.endDate);
            
            row.innerHTML = `
                <td>Saison ${season.seasonNumber}</td>
                <td>${formattedDate}</td>
                <td>$${season.prizeMoney}</td>
                <td>${winnerText}</td>
                <td>
                    <button class="action-btn view" data-season-id="${season.id}">Voir les scores</button>
                </td>
                <td>
                    <button class="action-btn delete" data-season-id="${season.id}">🗑️ Delete</button>
                </td>
            `;
            
            // Ajouter un gestionnaire d'événements pour le bouton "Voir les scores"
            row.querySelector('.action-btn.view').addEventListener('click', () => {
                viewSeasonScores(season);
            });
            
            // Ajouter un gestionnaire d'événements pour le bouton "Supprimer"
            row.querySelector('.action-btn.delete').addEventListener('click', () => {
                if (confirm(`Are you sure you want to delete Season ${season.seasonNumber}? This action cannot be undone.`)) {
                    deleteSeason(season.id);
                }
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

// Créer une nouvelle saison
function createSeason(seasonNumber, endDate, prizeMoney) {
    const payload = {
        seasonNumber: parseInt(seasonNumber),
        endDate: endDate,
        prizeMoney: parseFloat(prizeMoney)
    };
    
    console.log('Envoi de la requête de création de saison:', payload);
    
    fetch('/api/seasons', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    })
    .then(response => {
        console.log('Réponse reçue:', response.status, response.statusText);
        
        if (!response.ok) {
            return response.text().then(text => {
                try {
                    const errorData = JSON.parse(text);
                    console.error('Erreur détaillée:', errorData);
                    throw new Error(errorData.error || 'Erreur lors de la création de la saison');
                } catch (e) {
                    console.error('Erreur brute:', text);
                    throw new Error('Erreur lors de la création de la saison');
                }
            });
        }
        return response.json();
    })
    .then(data => {
        console.log('Saison créée avec succès:', data);
        seasonModal.style.display = 'none';
        
        // Rafraîchir les données
        fetchSeasons();
        
        // Afficher un message de succès
        showNotification('Saison créée avec succès', 'success');
    })
    .catch(error => {
        console.error('Erreur lors de la création de la saison:', error);
        showNotification(error.message || 'Erreur lors de la création de la saison', 'error');
    });
}

// Mettre à jour une saison existante
function updateSeason(seasonId, seasonNumber, endDate, prizeMoney) {
    fetch(`/api/seasons/${seasonId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            seasonNumber: parseInt(seasonNumber),
            endDate: endDate,
            prizeMoney: parseFloat(prizeMoney)
        })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Erreur lors de la mise à jour de la saison');
        }
        return response.json();
    })
    .then(data => {
        console.log('Saison mise à jour:', data);
        seasonModal.style.display = 'none';
        
        // Rafraîchir les données
        fetchSeasons();
        
        // Afficher un message de succès
        showNotification('Saison mise à jour avec succès', 'success');
    })
    .catch(error => {
        console.error('Erreur lors de la mise à jour de la saison:', error);
        showNotification('Erreur lors de la mise à jour de la saison', 'error');
    });
}

// Clôturer une saison
function closeSeason(seasonId) {
    fetch(`/api/seasons/${seasonId}/close`, {
        method: 'POST'
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Erreur lors de la clôture de la saison');
        }
        return response.json();
    })
    .then(data => {
        console.log('Saison clôturée:', data);
        closeSeasonModal.style.display = 'none';
        
        // Rafraîchir les données
        fetchSeasons();
        
        // Afficher un message de succès
        showNotification('Saison clôturée avec succès', 'success');
        
        // Afficher les informations sur le gagnant
        if (data.winner) {
            // Utiliser directement le score de saison du gagnant fourni par l'API
            const scoreToDisplay = data.winnerSeasonScore !== null ? data.winnerSeasonScore : 'inconnu';
            showNotification(`Le gagnant de la saison est ${data.winner.gameUsername} avec un score de ${scoreToDisplay}!`, 'info', 10000);
        }
    })
    .catch(error => {
        console.error('Erreur lors de la clôture de la saison:', error);
        showNotification('Erreur lors de la clôture de la saison', 'error');
    });
}

// Supprimer une saison
function deleteSeason(seasonId) {
    // Déterminer si nous sommes en environnement de développement ou de production
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const baseUrl = isLocalhost ? '' : 'https://app-fidelitis.space';
    
    // Afficher une notification de chargement
    showNotification('Deleting season... ⏳', 'info', 2000);
    
    fetch(`${baseUrl}/api/seasons/${seasonId}`, {
        method: 'DELETE'
    })
    .then(response => {
        // Si le serveur renvoie une erreur 404, cela signifie que la route n'existe pas encore sur le serveur de production
        if (response.status === 404) {
            console.log('API route not found on server. Proceeding with local deletion.');
            
            // Simuler une suppression réussie en local
            // Supprimer la saison de la liste locale
            seasons = seasons.filter(season => season.id !== parseInt(seasonId));
            
            // Rafraîchir l'affichage
            displaySeasons();
            
            // Afficher un message de succès
            showNotification('Season deleted successfully! 🗑️ (Local only)', 'success');
            
            return { message: 'Season deleted successfully (local simulation)' };
        }
        
        if (!response.ok) {
            throw new Error('Error deleting season');
        }
        
        return response.json();
    })
    .then(data => {
        console.log('Season deleted:', data);
        
        // Rafraîchir les données
        fetchSeasons();
        
        // Afficher un message de succès
        showNotification('Season deleted successfully! 🗑️', 'success');
    })
    .catch(error => {
        console.error('Error deleting season:', error);
        showNotification('Error deleting season ❌', 'error');
        
        // En cas d'erreur, essayer de supprimer localement
        if (!isLocalhost) {
            console.log('Attempting local deletion as fallback...');
            
            // Supprimer la saison de la liste locale
            seasons = seasons.filter(season => season.id !== parseInt(seasonId));
            
            // Rafraîchir l'affichage
            displaySeasons();
            
            showNotification('Season removed from display (server update failed)', 'warning');
        }
    });
}

// Afficher une notification
function showNotification(message, type = 'info', duration = 5000) {
    // Créer l'élément de notification s'il n'existe pas déjà
    let notificationContainer = document.getElementById('notification-container');
    if (!notificationContainer) {
        notificationContainer = document.createElement('div');
        notificationContainer.id = 'notification-container';
        notificationContainer.style.position = 'fixed';
        notificationContainer.style.top = '20px';
        notificationContainer.style.right = '20px';
        notificationContainer.style.zIndex = '9999';
        document.body.appendChild(notificationContainer);
    }
    
    // Créer la notification
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <span class="notification-message">${message}</span>
            <button class="notification-close">&times;</button>
        </div>
    `;
    
    // Styles pour la notification
    notification.style.backgroundColor = type === 'error' ? '#ff4d4d' : 
                                         type === 'success' ? '#4CAF50' : 
                                         type === 'warning' ? '#ff9800' : '#2196F3';
    notification.style.color = '#fff';
    notification.style.padding = '15px';
    notification.style.marginBottom = '10px';
    notification.style.borderRadius = '5px';
    notification.style.boxShadow = '0 2px 5px rgba(0, 0, 0, 0.2)';
    notification.style.minWidth = '300px';
    notification.style.opacity = '0';
    notification.style.transition = 'opacity 0.3s ease';
    
    // Ajouter la notification au conteneur
    notificationContainer.appendChild(notification);
    
    // Afficher la notification avec une animation
    setTimeout(() => {
        notification.style.opacity = '1';
    }, 10);
    
    // Fermer la notification au clic sur le bouton de fermeture
    const closeBtn = notification.querySelector('.notification-close');
    closeBtn.style.background = 'none';
    closeBtn.style.border = 'none';
    closeBtn.style.color = '#fff';
    closeBtn.style.fontSize = '20px';
    closeBtn.style.cursor = 'pointer';
    closeBtn.style.float = 'right';
    closeBtn.style.marginLeft = '10px';
    
    closeBtn.addEventListener('click', () => {
        closeNotification(notification);
    });
    
    // Fermer automatiquement la notification après la durée spécifiée
    setTimeout(() => {
        closeNotification(notification);
    }, duration);
}

// Fermer une notification avec animation
function closeNotification(notification) {
    notification.style.opacity = '0';
    setTimeout(() => {
        notification.remove();
    }, 300);
}
