// Initialisation des variables du jeu
let canvas, ctx;
let player;
let road;
let score = 0;
let gameOver = false;
let gameSpeed = 2;
let initialGameSpeed = 2;
let speedIncrement = 0.05;
let lastTime = 0;
let animationId;

// Classe pour le joueur
class Player {
    constructor(canvas) {
        this.size = 20;
        this.x = canvas.width / 2 - this.size / 2;
        this.y = canvas.height - 100;
        this.direction = 'up'; // up, right, left
    }

    draw(ctx) {
        ctx.fillStyle = '#FF5722';
        ctx.fillRect(this.x, this.y, this.size, this.size);
    }

    update(road) {
        // Déplacement selon la direction
        if (this.direction === 'up') {
            this.y -= gameSpeed;
        } else if (this.direction === 'right') {
            this.x += gameSpeed;
        } else if (this.direction === 'left') {
            this.x -= gameSpeed;
        }

        // Vérification de collision avec les bords de la route
        if (!road.isOnRoad(this.x, this.y, this.size)) {
            endGame();
        }
    }

    turn() {
        // Tourner selon la prochaine direction de la route
        const nextTurn = road.getNextTurn();
        if (nextTurn === 'right' && this.direction === 'up') {
            this.direction = 'right';
            road.turnTaken();
            score++;
            updateScore();
        } else if (nextTurn === 'left' && this.direction === 'up') {
            this.direction = 'left';
            road.turnTaken();
            score++;
            updateScore();
        } else if (nextTurn === 'up' && (this.direction === 'right' || this.direction === 'left')) {
            this.direction = 'up';
            road.turnTaken();
            score++;
            updateScore();
        } else {
            // Mauvais virage, fin de la partie
            endGame();
        }
    }
}

// Classe pour la route
class Road {
    constructor(canvas) {
        this.canvas = canvas;
        this.width = 60;
        this.segments = [];
        this.turns = [];
        this.currentTurnIndex = 0;
        this.generateInitialRoad();
    }

    generateInitialRoad() {
        // Créer une route droite initiale
        const initialSegment = {
            x: this.canvas.width / 2 - this.width / 2,
            y: 0,
            width: this.width,
            height: this.canvas.height + 200
        };
        this.segments.push(initialSegment);

        // Générer les premiers virages
        this.generateTurns(5);
    }

    generateTurns(count) {
        const directions = ['right', 'left', 'up'];
        
        for (let i = 0; i < count; i++) {
            // Éviter deux virages consécutifs dans la même direction
            let newDirection;
            if (this.turns.length > 0) {
                const lastDirection = this.turns[this.turns.length - 1];
                do {
                    newDirection = directions[Math.floor(Math.random() * directions.length)];
                } while (newDirection === lastDirection && newDirection !== 'up');
            } else {
                newDirection = directions[Math.floor(Math.random() * 2)]; // Premier virage: gauche ou droite
            }
            
            this.turns.push(newDirection);
        }
    }

    getNextTurn() {
        if (this.currentTurnIndex < this.turns.length) {
            return this.turns[this.currentTurnIndex];
        }
        return null;
    }

    turnTaken() {
        this.currentTurnIndex++;
        
        // Générer plus de virages si nécessaire
        if (this.turns.length - this.currentTurnIndex < 3) {
            this.generateTurns(3);
        }
        
        // Créer un nouveau segment de route selon la direction
        const lastSegment = this.segments[this.segments.length - 1];
        const turn = this.turns[this.currentTurnIndex - 1];
        
        let newSegment;
        
        if (turn === 'right') {
            newSegment = {
                x: lastSegment.x + lastSegment.width - this.width,
                y: lastSegment.y + lastSegment.height - this.width,
                width: this.canvas.width,
                height: this.width
            };
        } else if (turn === 'left') {
            newSegment = {
                x: 0,
                y: lastSegment.y + lastSegment.height - this.width,
                width: lastSegment.x + this.width,
                height: this.width
            };
        } else if (turn === 'up') {
            // Après un virage à droite
            if (this.segments[this.segments.length - 1].height === this.width) {
                newSegment = {
                    x: lastSegment.x,
                    y: lastSegment.y,
                    width: this.width,
                    height: this.canvas.height
                };
            } 
            // Après un virage à gauche
            else {
                newSegment = {
                    x: lastSegment.x + lastSegment.width - this.width,
                    y: lastSegment.y,
                    width: this.width,
                    height: this.canvas.height
                };
            }
        }
        
        this.segments.push(newSegment);
        
        // Supprimer les anciens segments pour optimiser
        if (this.segments.length > 10) {
            this.segments.shift();
        }
    }

    isOnRoad(playerX, playerY, playerSize) {
        // Vérifier si le joueur est sur la route
        for (const segment of this.segments) {
            if (
                playerX >= segment.x && 
                playerX + playerSize <= segment.x + segment.width &&
                playerY >= segment.y && 
                playerY + playerSize <= segment.y + segment.height
            ) {
                return true;
            }
        }
        return false;
    }

    draw(ctx) {
        ctx.fillStyle = '#333';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        ctx.fillStyle = '#666';
        for (const segment of this.segments) {
            ctx.fillRect(segment.x, segment.y, segment.width, segment.height);
        }
    }
}

// Initialisation du jeu
function initGame() {
    canvas = document.getElementById('game-canvas');
    ctx = canvas.getContext('2d');
    
    // Ajuster la taille du canvas à la fenêtre
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    // Créer le joueur et la route
    player = new Player(canvas);
    road = new Road(canvas);
    
    // Réinitialiser les variables
    score = 0;
    gameOver = false;
    gameSpeed = initialGameSpeed;
    updateScore();
    
    // Cacher l'écran de fin de jeu s'il était visible
    document.getElementById('game-over').style.display = 'none';
    
    // Démarrer la boucle de jeu
    lastTime = 0;
    requestAnimationFrame(gameLoop);
}

// Boucle principale du jeu
function gameLoop(timestamp) {
    // Calculer le delta time
    const deltaTime = timestamp - lastTime;
    lastTime = timestamp;
    
    if (!gameOver) {
        // Effacer le canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Dessiner la route
        road.draw(ctx);
        
        // Mettre à jour et dessiner le joueur
        player.update(road);
        player.draw(ctx);
        
        // Augmenter progressivement la vitesse
        gameSpeed += speedIncrement * deltaTime / 1000;
        
        // Continuer la boucle
        animationId = requestAnimationFrame(gameLoop);
    }
}

// Mettre à jour l'affichage du score
function updateScore() {
    document.getElementById('score-display').textContent = `Score: ${score}`;
}

// Fin de la partie
function endGame() {
    gameOver = true;
    cancelAnimationFrame(animationId);
    
    // Afficher l'écran de fin de jeu
    document.getElementById('final-score').textContent = `Score: ${score}`;
    document.getElementById('game-over').style.display = 'block';
    
    // Envoyer le score au serveur
    sendScore(score);
    
    // Afficher le bouton principal Telegram si disponible
    if (window.Telegram && window.Telegram.WebApp) {
        window.Telegram.WebApp.MainButton.setText('Partager mon score');
        window.Telegram.WebApp.MainButton.show();
    }
}

// Envoyer le score au serveur
function sendScore(score) {
    // Récupérer le nom d'utilisateur de Telegram si disponible
    let username = 'Anonymous';
    if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe && window.Telegram.WebApp.initDataUnsafe.user) {
        username = window.Telegram.WebApp.initDataUnsafe.user.username || 
                  (window.Telegram.WebApp.initDataUnsafe.user.first_name + 
                   (window.Telegram.WebApp.initDataUnsafe.user.last_name ? ' ' + window.Telegram.WebApp.initDataUnsafe.user.last_name : ''));
    }
    
    fetch('/api/scores', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ score, username }),
    })
    .then(response => response.json())
    .then(data => {
        if (data.rank <= 10) {
            // Afficher un message si le joueur est dans le top 10
            const rankMessage = document.createElement('div');
            rankMessage.textContent = `Félicitations! Vous êtes #${data.rank} dans le classement!`;
            rankMessage.style.color = '#FFD700';
            rankMessage.style.marginTop = '10px';
            document.getElementById('game-over').appendChild(rankMessage);
        }
        
        // Récupérer et afficher les meilleurs scores
        getHighScores();
    })
    .catch(error => {
        console.error('Erreur lors de l\'envoi du score:', error);
    });
}

// Récupérer les meilleurs scores
function getHighScores() {
    fetch('/api/scores')
    .then(response => response.json())
    .then(scores => {
        // Créer ou mettre à jour la liste des meilleurs scores
        let highScoresList = document.getElementById('high-scores-list');
        if (!highScoresList) {
            const highScoresContainer = document.createElement('div');
            highScoresContainer.id = 'high-scores-container';
            highScoresContainer.style.marginTop = '20px';
            
            const highScoresTitle = document.createElement('h3');
            highScoresTitle.textContent = 'Meilleurs Scores';
            highScoresContainer.appendChild(highScoresTitle);
            
            highScoresList = document.createElement('ol');
            highScoresList.id = 'high-scores-list';
            highScoresContainer.appendChild(highScoresList);
            
            document.getElementById('game-over').appendChild(highScoresContainer);
        } else {
            highScoresList.innerHTML = '';
        }
        
        // Ajouter chaque score à la liste
        scores.forEach(scoreData => {
            const listItem = document.createElement('li');
            listItem.textContent = `${scoreData.username}: ${scoreData.score}`;
            highScoresList.appendChild(listItem);
        });
    })
    .catch(error => {
        console.error('Erreur lors de la récupération des scores:', error);
    });
}

// Gestionnaire d'événements pour les interactions
function setupEventListeners() {
    // Tap pour tourner
    document.addEventListener('click', function() {
        if (!gameOver) {
            player.turn();
        }
    });
    
    // Touche espace pour tourner (pour les tests sur ordinateur)
    document.addEventListener('keydown', function(event) {
        if (event.code === 'Space' && !gameOver) {
            player.turn();
        }
    });
    
    // Bouton de redémarrage
    document.getElementById('restart-button').addEventListener('click', function() {
        initGame();
    });
    
    // Redimensionnement de la fenêtre
    window.addEventListener('resize', function() {
        if (!gameOver) {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        }
    });
    
    // Intégration avec Telegram WebApp si disponible
    if (window.Telegram && window.Telegram.WebApp) {
        window.Telegram.WebApp.ready();
        window.Telegram.WebApp.expand();
        
        // Configurer le bouton principal
        window.Telegram.WebApp.MainButton.setParams({
            text: 'Partager mon score',
            color: '#31b545',
            text_color: '#ffffff',
            is_active: true,
            is_visible: false
        });
        
        // Envoyer le score au bot Telegram quand le bouton principal est cliqué
        window.Telegram.WebApp.MainButton.onClick(function() {
            if (gameOver) {
                window.Telegram.WebApp.sendData(JSON.stringify({
                    action: 'gameOver',
                    score: score
                }));
                window.Telegram.WebApp.close();
            }
        });
    }
}

// Initialiser le jeu quand la page est chargée
window.onload = function() {
    setupEventListeners();
    initGame();
    
    // Intégration avec Telegram WebApp si disponible
    if (window.Telegram && window.Telegram.WebApp) {
        window.Telegram.WebApp.ready();
        window.Telegram.WebApp.expand();
        
        // Envoyer le score au bot Telegram à la fin d'une partie
        window.Telegram.WebApp.onEvent('mainButtonClicked', function() {
            if (gameOver) {
                window.Telegram.WebApp.sendData(JSON.stringify({
                    action: 'gameOver',
                    score: score
                }));
            }
        });
    }
};
