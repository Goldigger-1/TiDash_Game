const express = require('express');
const { Telegraf } = require('telegraf');
const path = require('path');
const fs = require('fs');
const { Sequelize, DataTypes, Op } = require('sequelize');
require('dotenv').config();

// Chemin de la base de données persistante
const DB_PATH = '/var/lib/tidash_database.sqlite';

// Vérifier si le fichier de base de données existe, sinon le créer
if (!fs.existsSync(DB_PATH)) {
  try {
    fs.writeFileSync(DB_PATH, '', { flag: 'wx' });
    console.log(`📁 Database file created at ${DB_PATH}`);
  } catch (err) {
    console.error(`Erreur lors de la création du fichier de base de données: ${err.message}`);
  }
}

// Initialiser la base de données SQLite
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: DB_PATH,
  logging: false // Désactiver les logs SQL pour la production
});

// Définition des modèles
const User = sequelize.define('User', {
  gameId: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    primaryKey: true
  },
  gameUsername: {
    type: DataTypes.STRING,
    allowNull: false
  },
  telegramId: {
    type: DataTypes.STRING,
    allowNull: true
  },
  telegramUsername: {
    type: DataTypes.STRING,
    allowNull: true
  },
  paypalEmail: {
    type: DataTypes.STRING,
    allowNull: true
  },
  bestScore: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  registrationDate: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  lastLogin: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
});

// Définir le modèle Season sans aucune référence à User
const Season = sequelize.define('Season', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  seasonNumber: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  endDate: {
    type: DataTypes.DATE,
    allowNull: false
  },
  prizeMoney: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  isClosed: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  winnerId: {
    type: DataTypes.STRING,
    allowNull: true
  }
});

// Définir le modèle SeasonScore
const SeasonScore = sequelize.define('SeasonScore', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  userId: {
    type: DataTypes.STRING,
    allowNull: false
  },
  seasonId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  score: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  }
});

// Synchroniser les modèles avec la base de données
(async () => {
  try {
    // Synchroniser les modèles sans supprimer les tables existantes
    // Utiliser { alter: true } pour mettre à jour la structure si nécessaire, mais sans supprimer les données
    await sequelize.sync({ alter: true });
    console.log('🔄 Database synchronized successfully');
  } catch (err) {
    console.error('Erreur lors de la synchronisation de la base de données:', err);
  }
})();

// Initialiser la base de données
(async () => {
  try {
    // Vérifier si la table users existe et contient des données
    try {
      const count = await User.count();
      console.log(`📊 ${count} users found in the database`);
      
      // Si la table est vide, migrer les données existantes si nécessaire
      if (count === 0) {
        console.log('La table users est vide, tentative de migration des données...');
        await migrateExistingData();
      }
    } catch (error) {
      console.error('Erreur lors de la vérification des données:', error);
    }
  } catch (error) {
    console.error('Erreur lors de l\'initialisation de la base de données:', error);
  }
})();

// Fonction pour migrer les données existantes du fichier JSON vers la base de données
async function migrateExistingData() {
  try {
    const dataDir = path.join(__dirname, 'data');
    const usersFile = path.join(dataDir, 'users.json');
    
    if (fs.existsSync(usersFile)) {
      const usersData = fs.readFileSync(usersFile, 'utf8');
      const users = JSON.parse(usersData);
      
      console.log(`Migration de ${users.length} utilisateurs vers la base de données...`);
      
      for (const user of users) {
        // Vérifier si l'utilisateur existe déjà
        const [existingUser] = await User.findOrCreate({
          where: {
            [Op.or]: [
              { gameId: user.gameId },
              { telegramId: user.telegramId !== "N/A" ? user.telegramId : null }
            ]
          },
          defaults: {
            gameId: user.gameId,
            gameUsername: user.gameUsername,
            telegramId: user.telegramId !== "N/A" ? user.telegramId : null,
            telegramUsername: user.telegramUsername !== "N/A" ? user.telegramUsername : null,
            paypalEmail: user.paypalEmail || "",
            bestScore: parseInt(user.bestScore) || 0,
            registrationDate: user.registrationDate || new Date().toISOString().split('T')[0],
            lastLogin: user.lastLogin || new Date().toISOString().split('T')[0]
          }
        });
      }
      
      console.log('Migration terminée avec succès');
      
      // Créer une sauvegarde du fichier JSON
      fs.copyFileSync(usersFile, path.join(dataDir, 'users_backup.json'));
    } else {
      console.log('Aucun fichier de données utilisateurs trouvé pour la migration');
    }
  } catch (error) {
    console.error('Erreur lors de la migration des données:', error);
  }
}

const app = express();
const port = process.env.PORT || 3000;
const botToken = process.env.BOT_TOKEN;
const webAppUrl = process.env.WEBAPP_URL;

// Middleware pour parser le JSON
app.use(express.json());

// Servir les fichiers statiques
app.use(express.static(path.join(__dirname, 'public')));

// Initialiser le bot Telegram
const bot = new Telegraf(botToken);

// Commande /start
bot.start((ctx) => {
  ctx.reply('Bienvenue sur TiDash Game!', {
    reply_markup: {
      inline_keyboard: [
        [{ text: 'Jouer', web_app: { url: webAppUrl } }]
      ]
    }
  });
});

// Lancer le bot
bot.launch().then(() => {
  console.log('Bot Telegram démarré');
}).catch((err) => {
  console.error('Erreur lors du démarrage du bot:', err);
});

// Route pour récupérer une saison spécifique
app.get('/api/seasons/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const season = await Season.findByPk(id);
    if (!season) {
      return res.status(404).json({ error: 'Saison non trouvée' });
    }
    res.json(season);
  } catch (error) {
    console.error('Erreur lors de la récupération de la saison:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération de la saison' });
  }
});

// Route pour le panneau d'administration
app.get('/admin754774', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin754774', 'index.html'));
});

// API pour récupérer tous les utilisateurs (avec pagination et recherche)
app.get('/api/users', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';
    
    // Construire la condition de recherche
    const whereCondition = search
      ? {
          [Op.or]: [
            { gameId: { [Op.like]: `%${search}%` } },
            { gameUsername: { [Op.like]: `%${search}%` } },
            { telegramId: { [Op.like]: `%${search}%` } },
            { telegramUsername: { [Op.like]: `%${search}%` } },
            { paypalEmail: { [Op.like]: `%${search}%` } }
          ]
        }
      : {};
    
    // Récupérer les utilisateurs avec pagination
    const { count, rows } = await User.findAndCountAll({
      where: whereCondition,
      order: [['bestScore', 'DESC']],
      limit,
      offset
    });
    
    res.json({
      total: count,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      users: rows
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des utilisateurs:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des utilisateurs' });
  }
});

// Route pour récupérer un utilisateur spécifique
app.get('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(`Tentative de récupération de l'utilisateur avec ID: ${id}`);
    
    // Récupérer l'utilisateur par gameId (qui est la clé primaire)
    const user = await User.findOne({ where: { gameId: id } });
    
    if (!user) {
      console.log(`Utilisateur avec ID ${id} non trouvé`);
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }
    
    console.log(`Utilisateur trouvé: ${user.gameUsername} (${user.gameId})`);
    
    res.json(user);
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'utilisateur:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération de l\'utilisateur', details: error.message });
  }
});

// Route pour supprimer un utilisateur
app.delete('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(`🗑️ Attempting to delete user with ID: ${id}`);
    
    // Désactiver temporairement les contraintes de clé étrangère
    await sequelize.query('PRAGMA foreign_keys = OFF;');
    
    try {
      // Supprimer directement l'utilisateur avec une requête SQL brute
      await sequelize.query('DELETE FROM "Users" WHERE "gameId" = ?', {
        replacements: [id]
      });
      
      // Supprimer les scores de saison associés
      await sequelize.query('DELETE FROM "SeasonScores" WHERE "userId" = ?', {
        replacements: [id]
      });
      
      // Mettre à jour les références dans Seasons
      await sequelize.query('UPDATE "Seasons" SET "winnerId" = NULL WHERE "winnerId" = ?', {
        replacements: [id]
      });
      
      // Mettre à jour les références dans Seasons_backup si elle existe
      try {
        await sequelize.query('UPDATE "Seasons_backup" SET "winnerId" = NULL WHERE "winnerId" = ?', {
          replacements: [id]
        });
      } catch (backupError) {
        // Ignorer les erreurs si la table n'existe pas
        console.log(`ℹ️ Note: ${backupError.message}`);
      }
      
      console.log(`✅ User ${id} deleted successfully`);
      
      // Réactiver les contraintes de clé étrangère
      await sequelize.query('PRAGMA foreign_keys = ON;');
      
      res.status(200).json({ message: 'User deleted successfully' });
    } catch (innerError) {
      // Réactiver les contraintes de clé étrangère même en cas d'erreur
      await sequelize.query('PRAGMA foreign_keys = ON;');
      throw innerError;
    }
  } catch (error) {
    console.error('❌ Error deleting user:', error);
    res.status(500).json({ 
      error: 'Error deleting user', 
      details: error.message,
      stack: error.stack
    });
  }
});

// API pour enregistrer un nouvel utilisateur ou mettre à jour un utilisateur existant
app.post('/api/users', async (req, res) => {
  try {
    const userData = req.body;
    console.log('📝 User data received:', userData);

    // CRITICAL FIX: Get the active season first
    const activeSeason = await Season.findOne({ where: { isActive: true } });
    
    // Extract data from request
    const currentScore = userData.bestScore ? parseInt(userData.bestScore) : 0;
    const currentSeasonScore = userData.seasonScore ? parseInt(userData.seasonScore) : 0;
    const lastKnownSeasonId = userData.lastKnownSeasonId || null;

    console.log(`🔍 Processing user ${userData.gameId} - Global score: ${currentScore}, Season score: ${currentSeasonScore}, Last known season: ${lastKnownSeasonId}`);

    // Vérifier si l'utilisateur existe déjà
    let user = null;
    if (userData.gameId) {
      user = await User.findOne({ where: { gameId: userData.gameId } });
    } else if (userData.telegramId) {
      user = await User.findOne({ where: { telegramId: userData.telegramId } });
    }

    // Start a transaction to ensure data consistency
    const transaction = await sequelize.transaction();
    
    try {
      if (user) {
        // Mettre à jour l'utilisateur existant
        const updateData = {};
        
        // Mettre à jour les champs si fournis
        if (userData.gameUsername) updateData.gameUsername = userData.gameUsername;
        if (userData.telegramId) updateData.telegramId = userData.telegramId;
        if (userData.telegramUsername) updateData.telegramUsername = userData.telegramUsername;
        if (userData.paypalEmail) updateData.paypalEmail = userData.paypalEmail;
        
        // Mettre à jour le meilleur score global si le nouveau score est plus élevé
        if (currentScore > user.bestScore) {
          updateData.bestScore = currentScore;
          console.log(`📈 Global score updated for ${user.gameId}: ${currentScore}`);
        }
        
        // Mettre à jour la date de dernière connexion
        updateData.lastLogin = new Date();
        
        await user.update(updateData, { transaction });
        
        // RADICAL SOLUTION: Handle season scores completely separately from user data
        if (activeSeason) {
          // First, check if this is a new season for the user
          const isNewSeason = !lastKnownSeasonId || lastKnownSeasonId !== activeSeason.id.toString();
          console.log(`🔄 Season check - Active: ${activeSeason.id}, Last known: ${lastKnownSeasonId}, Is new: ${isNewSeason}`);
          
          // Get the user's current season score from the database
          let seasonScoreRecord = await SeasonScore.findOne({
            where: { 
              userId: user.gameId, 
              seasonId: activeSeason.id 
            },
            transaction
          });
          
          if (!seasonScoreRecord) {
            // If no record exists, create one with score 0
            seasonScoreRecord = await SeasonScore.create({
              userId: user.gameId,
              seasonId: activeSeason.id,
              score: 0  // Always start with 0
            }, { transaction });
            console.log(`✨ New season score initialized to 0 for ${user.gameId}`);
          }
          
          // Now handle the score update based on whether it's a new season
          if (isNewSeason) {
            // For a new season, we FORCE the score to the current value from client
            // This ensures we're not carrying over scores from previous seasons
            await seasonScoreRecord.update({ score: currentSeasonScore }, { transaction });
            console.log(`🔄 Season score reset for ${user.gameId} due to new season: ${currentSeasonScore}`);
          } else if (currentSeasonScore > seasonScoreRecord.score) {
            // Only update if the new score is better
            await seasonScoreRecord.update({ score: currentSeasonScore }, { transaction });
            console.log(`📈 Season score updated for ${user.gameId}: ${currentSeasonScore}`);
          } else {
            console.log(`ℹ️ No season score update needed: current ${currentSeasonScore} <= existing ${seasonScoreRecord.score}`);
          }
          
          // Return the current season score to the client for validation
          const updatedScore = await SeasonScore.findOne({
            where: { 
              userId: user.gameId, 
              seasonId: activeSeason.id 
            },
            transaction
          });
          
          // Commit the transaction
          await transaction.commit();
          
          // Return user data with the current season score
          res.status(200).json({ 
            message: 'User updated successfully', 
            user,
            seasonData: {
              seasonId: activeSeason.id,
              seasonNumber: activeSeason.seasonNumber,
              currentScore: updatedScore ? updatedScore.score : 0
            }
          });
        } else {
          // No active season
          await transaction.commit();
          res.status(200).json({ message: 'User updated successfully', user });
        }
      } else {
        // Créer un nouvel utilisateur
        if (!userData.gameId || !userData.gameUsername) {
          await transaction.rollback();
          return res.status(400).json({ error: 'gameId and gameUsername are required to create a new user' });
        }
        
        const newUser = await User.create({
          gameId: userData.gameId,
          gameUsername: userData.gameUsername,
          telegramId: userData.telegramId || null,
          telegramUsername: userData.telegramUsername || null,
          paypalEmail: userData.paypalEmail || null,
          bestScore: currentScore,
          registrationDate: userData.registrationDate || new Date(),
          lastLogin: new Date()
        }, { transaction });
        
        console.log(`✨ New user created: ${newUser.gameId}`);
        
        // Si une saison active existe, créer un score de saison pour le nouvel utilisateur
        if (activeSeason) {
          await SeasonScore.create({
            userId: newUser.gameId,
            seasonId: activeSeason.id,
            score: currentSeasonScore
          }, { transaction });
          console.log(`✨ Season score created for new user ${newUser.gameId}: ${currentSeasonScore}`);
          
          // Commit the transaction
          await transaction.commit();
          
          // Return user data with the current season score
          res.status(201).json({ 
            message: 'New user created successfully', 
            user: newUser,
            seasonData: {
              seasonId: activeSeason.id,
              seasonNumber: activeSeason.seasonNumber,
              currentScore: currentSeasonScore
            }
          });
        } else {
          // No active season
          await transaction.commit();
          res.status(201).json({ message: 'New user created successfully', user: newUser });
        }
      }
    } catch (error) {
      // Rollback the transaction in case of error
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error('❌ Error saving user:', error);
    res.status(500).json({ error: 'Error saving user', details: error.message });
  }
});

// API pour récupérer les saisons
app.get('/api/seasons', async (req, res) => {
  try {
    const seasons = await Season.findAll({
      order: [['seasonNumber', 'DESC']]
    });
    
    console.log('Saisons récupérées:', seasons.map(s => s.toJSON()));
    res.json(seasons);
  } catch (error) {
    console.error('Erreur lors de la récupération des saisons:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des saisons' });
  }
});

// API pour créer une nouvelle saison
app.post('/api/seasons', async (req, res) => {
  const { seasonNumber, endDate, prizeMoney } = req.body;
  
  console.log('Création de saison - Données reçues:', req.body);
  
  try {
    // Validation des données
    if (!seasonNumber || !endDate || prizeMoney === undefined) {
      console.error('Données de saison invalides:', req.body);
      return res.status(400).json({ error: 'Tous les champs sont requis (seasonNumber, endDate, prizeMoney)' });
    }
    
    // Utiliser une transaction pour s'assurer que toutes les opérations sont atomiques
    const transaction = await sequelize.transaction();
    
    try {
      // 1. Désactiver toutes les saisons actives
      await Season.update({ isActive: false }, { 
        where: { isActive: true },
        transaction
      });
      
      // 2. Créer une nouvelle saison
      const newSeason = await Season.create({
        seasonNumber: parseInt(seasonNumber),
        endDate: new Date(endDate),
        prizeMoney: parseFloat(prizeMoney),
        isActive: true,
        isClosed: false,
        winnerId: null
      }, { transaction });
      
      // 3. IMPORTANT: Supprimer TOUS les scores de saison existants pour la nouvelle saison
      // Cela garantit qu'il n'y a pas de scores résiduels d'une saison précédente
      await sequelize.query('DELETE FROM "SeasonScores" WHERE "seasonId" = ?', {
        replacements: [newSeason.id],
        transaction
      });
      
      // 4. Récupérer tous les utilisateurs
      const users = await User.findAll({
        attributes: ['gameId'],
        transaction
      });
      
      // 5. Créer des scores de saison initialisés à 0 pour tous les utilisateurs existants
      if (users.length > 0) {
        const seasonScores = users.map(user => ({
          userId: user.gameId,
          seasonId: newSeason.id,
          score: 0
        }));
        
        await SeasonScore.bulkCreate(seasonScores, { transaction });
        console.log(`✅ ${seasonScores.length} season scores initialized to 0 for new season ${newSeason.seasonNumber} 🏆`);
      }
      
      // Valider la transaction
      await transaction.commit();
      
      console.log('🎮 New season created:', newSeason.toJSON());
      res.status(201).json(newSeason);
    } catch (innerError) {
      // Annuler la transaction en cas d'erreur
      await transaction.rollback();
      throw innerError;
    }
  } catch (error) {
    console.error('Erreur lors de la création de la saison:', error);
    res.status(500).json({ error: 'Erreur lors de la création de la saison', details: error.message });
  }
});

// API pour mettre à jour une saison
app.put('/api/seasons/:id', async (req, res) => {
  const { id } = req.params;
  const { seasonNumber, endDate, prizeMoney } = req.body;
  
  console.log('Mise à jour de saison - Données reçues:', req.body);
  
  try {
    // Validation des données
    if (!seasonNumber || !endDate || prizeMoney === undefined) {
      console.error('Données de saison invalides:', req.body);
      return res.status(400).json({ error: 'Tous les champs sont requis (seasonNumber, endDate, prizeMoney)' });
    }
    
    const season = await Season.findByPk(id);
    if (!season) {
      return res.status(404).json({ error: 'Saison non trouvée' });
    }
    
    await season.update({
      seasonNumber: parseInt(seasonNumber),
      endDate: new Date(endDate),
      prizeMoney: parseFloat(prizeMoney)
    });
    
    console.log('Saison mise à jour:', season.toJSON());
    res.json(season);
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la saison:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour de la saison', details: error.message });
  }
});

// API pour clôturer une saison
app.post('/api/seasons/:id/close', async (req, res) => {
  const { id } = req.params;
  
  try {
    const season = await Season.findByPk(id);
    if (!season) {
      return res.status(404).json({ error: 'Saison non trouvée' });
    }
    
    if (season.isClosed) {
      return res.status(400).json({ error: 'Cette saison est déjà clôturée' });
    }
    
    // Récupérer le gagnant de la saison (meilleur score)
    const topScore = await SeasonScore.findOne({
      where: { seasonId: id },
      order: [['score', 'DESC']]
    });
    
    let winnerId = null;
    let winner = null;
    let winnerSeasonScore = null;
    
    if (topScore) {
      winnerId = topScore.userId;
      winner = await User.findByPk(winnerId);
      winnerSeasonScore = topScore.score; // Stocker le score de saison du gagnant
    }
    
    // Mettre à jour la saison
    await season.update({
      isClosed: true,
      isActive: false,
      winnerId
    });
    
    console.log('Saison clôturée avec succès:', season.toJSON());
    
    res.json({ 
      message: 'Saison clôturée avec succès',
      season,
      winner,
      winnerSeasonScore // Inclure le score de saison du gagnant dans la réponse
    });
  } catch (error) {
    console.error('Erreur lors de la clôture de la saison:', error);
    res.status(500).json({ error: 'Erreur lors de la clôture de la saison' });
  }
});

// Route pour récupérer le classement d'une saison
app.get('/api/seasons/:id/ranking', async (req, res) => {
  const { id } = req.params;
  const limit = req.query.limit ? parseInt(req.query.limit) : 100;
  
  try {
    const seasonScores = await SeasonScore.findAll({
      where: { seasonId: id },
      order: [['score', 'DESC']],
      limit
    });
    
    // Récupérer les informations utilisateur pour chaque score
    const ranking = [];
    for (const score of seasonScores) {
      const user = await User.findByPk(score.userId);
      if (user) {
        ranking.push({
          userId: score.userId,
          username: user.gameUsername,
          score: score.score // Utiliser le score spécifique à la saison, pas le score global
        });
      }
    }
    
    res.json(ranking);
  } catch (error) {
    console.error('Erreur lors de la récupération du classement de la saison:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération du classement de la saison' });
  }
});

// Route pour récupérer le classement global
app.get('/api/global-ranking', async (req, res) => {
  const limit = req.query.limit ? parseInt(req.query.limit) : 100;
  
  try {
    const users = await User.findAll({
      order: [['bestScore', 'DESC']],
      limit
    });
    
    const ranking = users.map(user => ({
      userId: user.gameId,
      username: user.gameUsername,
      score: user.bestScore
    }));
    
    res.json(ranking);
  } catch (error) {
    console.error('Erreur lors de la récupération du classement global:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération du classement global' });
  }
});

// Route pour récupérer la saison active
app.get('/api/active-season', async (req, res) => {
  try {
    const activeSeason = await Season.findOne({
      where: { isActive: true }
    });
    
    if (!activeSeason) {
      return res.status(404).json({ error: 'Aucune saison active' });
    }
    
    res.json(activeSeason);
  } catch (error) {
    console.error('Erreur lors de la récupération de la saison active:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération de la saison active' });
  }
});

// Route alternative pour récupérer la saison active (pour compatibilité)
app.get('/api/seasons/active', async (req, res) => {
  try {
    const activeSeason = await Season.findOne({
      where: { isActive: true }
    });
    
    if (!activeSeason) {
      return res.status(404).json({ error: 'No active season found' });
    }
    
    console.log('🏆 Active season requested:', activeSeason.toJSON());
    res.json(activeSeason);
  } catch (error) {
    console.error('❌ Error retrieving active season:', error);
    res.status(500).json({ error: 'Error retrieving active season' });
  }
});

// API pour supprimer une saison
app.delete('/api/seasons/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    // Vérifier si la saison existe
    const season = await Season.findByPk(id);
    if (!season) {
      return res.status(404).json({ error: 'Season not found' });
    }
    
    // Désactiver temporairement les contraintes de clé étrangère
    await sequelize.query('PRAGMA foreign_keys = OFF;');
    
    try {
      // Supprimer les scores de saison associés
      await sequelize.query('DELETE FROM "SeasonScores" WHERE "seasonId" = ?', {
        replacements: [id]
      });
      
      // Supprimer la saison
      await sequelize.query('DELETE FROM "Seasons" WHERE "id" = ?', {
        replacements: [id]
      });
      
      // Réactiver les contraintes de clé étrangère
      await sequelize.query('PRAGMA foreign_keys = ON;');
      
      console.log(`🗑️ Season ${id} deleted successfully`);
      res.status(200).json({ message: 'Season deleted successfully' });
    } catch (innerError) {
      // Réactiver les contraintes de clé étrangère même en cas d'erreur
      await sequelize.query('PRAGMA foreign_keys = ON;');
      throw innerError;
    }
  } catch (error) {
    console.error('❌ Error deleting season:', error);
    res.status(500).json({ 
      error: 'Error deleting season', 
      details: error.message,
      stack: error.stack
    });
  }
});

// Route pour récupérer le score de saison d'un utilisateur spécifique
app.get('/api/seasons/:seasonId/scores/:userId', async (req, res) => {
  try {
    const { seasonId, userId } = req.params;
    
    // Vérifier si la saison existe
    const season = await Season.findByPk(seasonId);
    if (!season) {
      return res.status(404).json({ error: 'Season not found' });
    }
    
    // Récupérer le score de saison de l'utilisateur
    const seasonScore = await SeasonScore.findOne({
      where: { 
        seasonId: seasonId,
        userId: userId
      }
    });
    
    if (!seasonScore) {
      // Si aucun score n'est trouvé, renvoyer 0
      return res.json({ score: 0 });
    }
    
    console.log(`📊 Retrieved season score for user ${userId} in season ${seasonId}: ${seasonScore.score}`);
    res.json({ score: seasonScore.score });
  } catch (error) {
    console.error('❌ Error retrieving season score:', error);
    res.status(500).json({ 
      error: 'Error retrieving season score', 
      details: error.message
    });
  }
});

// CRITICAL FIX: New API endpoint to explicitly reset a user's season score
app.post('/api/seasons/:seasonId/scores/:userId/reset', async (req, res) => {
  try {
    const { seasonId, userId } = req.params;
    
    // Verify the season exists
    const season = await Season.findByPk(seasonId);
    if (!season) {
      return res.status(404).json({ error: 'Season not found' });
    }
    
    // Start a transaction
    const transaction = await sequelize.transaction();
    
    try {
      // Find or create the season score record
      let [seasonScore, created] = await SeasonScore.findOrCreate({
        where: { seasonId, userId },
        defaults: { score: 0 },
        transaction
      });
      
      if (!created) {
        // If the record already exists, reset the score to 0
        await seasonScore.update({ score: 0 }, { transaction });
      }
      
      // Commit the transaction
      await transaction.commit();
      
      console.log(`🔄 Season score explicitly reset to 0 for user ${userId} in season ${seasonId}`);
      
      // Return success
      res.status(200).json({ 
        message: 'Season score reset successfully',
        userId,
        seasonId,
        score: 0
      });
    } catch (error) {
      // Rollback the transaction in case of error
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error('❌ Error resetting season score:', error);
    res.status(500).json({ error: 'Error resetting season score', details: error.message });
  }
});

// Démarrer le serveur
app.listen(port, '0.0.0.0', () => {
  console.log(`Serveur démarré sur le port ${port}`);
});

// Graceful shutdown handling
process.once('SIGINT', () => {
  bot.stop('SIGINT');
  process.exit(0);
});
process.once('SIGTERM', () => {
  bot.stop('SIGTERM');
  process.exit(0);
});

console.log('TiDash Game Bot is running...');
