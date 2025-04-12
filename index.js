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
  },
  deviceId: {
    type: DataTypes.STRING,
    allowNull: true
  },
  musicEnabled: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  }
});

// Définir le modèle Season sans aucune référence à User
const Season = sequelize.define('Season', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  seasonNumber: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  startDate: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  endDate: {
    type: DataTypes.DATE,
    allowNull: false
  },
  prizeMoney: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  isClosed: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  winnerId: {
    type: DataTypes.STRING,
    allowNull: true
  }
});

const SeasonScore = sequelize.define('SeasonScore', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
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

// Create initial season if none exists
async function createInitialSeason() {
  try {
    const seasonCount = await Season.count();
    if (seasonCount === 0) {
      console.log('🏆 Creating initial season...');
      
      // Set end date to 30 days from now
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 30);
      
      const initialSeason = await Season.create({
        seasonNumber: 1,
        endDate: endDate,
        prizeMoney: 100.00,
        isActive: true,
        isClosed: false
      });
      
      console.log(`✅ Initial season created: Season ${initialSeason.seasonNumber}`);
    }
  } catch (error) {
    console.error('❌ Error creating initial season:', error);
  }
}

// Call this after database sync
createInitialSeason();

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

// New route to get user by Telegram ID
app.get('/api/users/telegram/:telegramId', async (req, res) => {
  try {
    const { telegramId } = req.params;
    
    console.log(`🔍 Attempting to find user with Telegram ID: ${telegramId}`);
    
    // Find user by Telegram ID
    const user = await User.findOne({ 
      where: { telegramId: telegramId }
    });
    
    if (!user) {
      console.log(`👤 User with Telegram ID ${telegramId} not found`);
      return res.status(404).json({ error: 'User not found' });
    }
    
    console.log(`✅ User with Telegram ID ${telegramId} found`);
    res.status(200).json(user);
  } catch (error) {
    console.error('❌ Error retrieving user by Telegram ID:', error);
    res.status(500).json({ 
      error: 'Error retrieving user by Telegram ID', 
      details: error.message 
    });
  }
});

// New route to get user by device ID
app.get('/api/users/device/:deviceId', async (req, res) => {
  try {
    const { deviceId } = req.params;
    
    console.log(`🔍 Attempting to find user with Device ID: ${deviceId}`);
    
    // Find user by device ID (stored in a new column)
    const user = await User.findOne({ 
      where: { deviceId: deviceId }
    });
    
    if (!user) {
      console.log(`👤 User with Device ID ${deviceId} not found`);
      return res.status(404).json({ error: 'User not found' });
    }
    
    console.log(`✅ User with Device ID ${deviceId} found`);
    res.status(200).json(user);
  } catch (error) {
    console.error('❌ Error retrieving user by Device ID:', error);
    res.status(500).json({ 
      error: 'Error retrieving user by Device ID', 
      details: error.message 
    });
  }
});

// API endpoint to get user by device ID
app.get('/api/users/device/:deviceId', async (req, res) => {
  try {
    const { deviceId } = req.params;
    console.log(`🔍 Looking up user by device ID: ${deviceId}`);
    
    const user = await User.findOne({
      where: { deviceId: deviceId }
    });
    
    if (!user) {
      console.log(`⚠️ No user found with device ID: ${deviceId}`);
      return res.status(404).json({ error: 'User not found' });
    }
    
    console.log(`✅ User found with device ID ${deviceId}: ${user.gameId}`);
    res.status(200).json(user);
  } catch (error) {
    console.error('❌ Error retrieving user by device ID:', error);
    res.status(500).json({ 
      error: 'Error retrieving user by device ID', 
      details: error.message 
    });
  }
});

// API endpoint to get user by Telegram ID
app.get('/api/users/telegram/:telegramId', async (req, res) => {
  try {
    const { telegramId } = req.params;
    
    console.log(`🔍 Attempting to find user with Telegram ID: ${telegramId}`);
    
    // Find user by Telegram ID
    const user = await User.findOne({ 
      where: { telegramId: telegramId }
    });
    
    if (!user) {
      console.log(`👤 User with Telegram ID ${telegramId} not found`);
      return res.status(404).json({ error: 'User not found' });
    }
    
    console.log(`✅ User with Telegram ID ${telegramId} found`);
    res.status(200).json(user);
  } catch (error) {
    console.error('❌ Error retrieving user by Telegram ID:', error);
    res.status(500).json({ 
      error: 'Error retrieving user by Telegram ID', 
      details: error.message 
    });
  }
});

// Route pour récupérer un utilisateur spécifique
app.get('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(`Tentative de récupération de l'utilisateur avec ID: ${id}`);
    
    // Récupérer l'utilisateur par gameId (qui est la clé primaire)
    const user = await User.findByPk(id);
    
    if (!user) {
      console.log(`Utilisateur avec ID ${id} non trouvé`);
      return res.status(404).json({ error: 'User not found' });
    }
    
    console.log(`Utilisateur avec ID ${id} trouvé`);
    res.status(200).json(user);
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
    
    // Vérifier si l'utilisateur existe déjà
    let user = null;
    if (userData.gameId) {
      user = await User.findByPk(userData.gameId);
    } else if (userData.telegramId) {
      user = await User.findOne({ where: { telegramId: userData.telegramId } });
    } else if (userData.deviceId) {
      user = await User.findOne({ where: { deviceId: userData.deviceId } });
    }

    // Start a transaction to ensure data consistency
    const transaction = await sequelize.transaction();
    
    try {
      if (user) {
        // Mettre à jour l'utilisateur existant
        console.log(`🔄 Updating existing user: ${user.gameId}`);
        
        // Update user data
        await user.update({
          gameUsername: userData.gameUsername || user.gameUsername,
          telegramId: userData.telegramId || user.telegramId,
          telegramUsername: userData.telegramUsername || user.telegramUsername,
          paypalEmail: userData.paypalEmail || user.paypalEmail,
          bestScore: Math.max(parseInt(userData.bestScore) || 0, user.bestScore || 0),
          lastLogin: new Date(),
          avatarSrc: userData.avatarSrc || user.avatarSrc,
          deviceId: userData.deviceId || user.deviceId,
          musicEnabled: userData.musicEnabled !== undefined ? userData.musicEnabled : user.musicEnabled
        }, { transaction });
        
        // If there's an active season, update or create the season score
        if (activeSeason) {
          // Find or create season score for this user
          const [seasonScore, created] = await SeasonScore.findOrCreate({
            where: {
              userId: user.gameId,
              seasonId: activeSeason.id
            },
            defaults: {
              score: parseInt(userData.seasonScore) || 0
            },
            transaction
          });
          
          // If the season score already exists, update it only if the new score is higher
          if (!created) {
            const currentScore = seasonScore.score || 0;
            const newScore = parseInt(userData.seasonScore) || 0;
            
            if (newScore > currentScore) {
              await seasonScore.update({
                score: newScore
              }, { transaction });
              console.log(`📊 Updated season score for user ${user.gameId}: ${currentScore} -> ${newScore}`);
            }
          }
        }
        
        // Commit the transaction
        await transaction.commit();
        
        // Return updated user data
        res.status(200).json({
          message: 'User updated successfully',
          user: user,
          seasonData: activeSeason ? {
            id: activeSeason.id,
            seasonNumber: activeSeason.seasonNumber,
            endDate: activeSeason.endDate,
            currentScore: userData.seasonScore
          } : null
        });
      } else {
        // Créer un nouvel utilisateur
        console.log('➕ Creating new user');
        
        // Create new user
        user = await User.create({
          gameId: userData.gameId,
          gameUsername: userData.gameUsername,
          telegramId: userData.telegramId,
          telegramUsername: userData.telegramUsername,
          paypalEmail: userData.paypalEmail || '',
          bestScore: parseInt(userData.bestScore) || 0,
          registrationDate: new Date(),
          lastLogin: new Date(),
          avatarSrc: userData.avatarSrc,
          deviceId: userData.deviceId,
          musicEnabled: userData.musicEnabled !== undefined ? userData.musicEnabled : false
        }, { transaction });
        
        // If there's an active season, create a season score for this user
        if (activeSeason) {
          await SeasonScore.create({
            userId: user.gameId,
            seasonId: activeSeason.id,
            score: parseInt(userData.seasonScore) || 0
          }, { transaction });
          
          console.log(`📊 Created new season score for user ${user.gameId}: ${parseInt(userData.seasonScore) || 0}`);
        }
        
        // Commit the transaction
        await transaction.commit();
        
        // Return created user data
        res.status(201).json({
          message: 'User created successfully',
          user: user,
          seasonData: activeSeason ? {
            id: activeSeason.id,
            seasonNumber: activeSeason.seasonNumber,
            endDate: activeSeason.endDate,
            currentScore: userData.seasonScore
          } : null
        });
      }
    } catch (error) {
      // Rollback the transaction in case of error
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error('❌ Error creating/updating user:', error);
    res.status(500).json({ 
      error: 'Error creating/updating user', 
      details: error.message,
      stack: error.stack
    });
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
      
      // 6. ADDITIONAL FIX: Clear any potential cached season scores in the database
      // This ensures no old scores from previous seasons with the same ID are kept
      await sequelize.query('DELETE FROM "SeasonScores" WHERE "seasonId" != ? AND "score" > 0', {
        replacements: [newSeason.id],
        transaction
      });
      
      console.log(`🧹 Cleared any potential cached season scores from previous seasons`);
      
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

// New API endpoint to get the active season
app.get('/api/seasons/active', async (req, res) => {
  try {
    console.log('🔍 Fetching active season');
    
    // Find the active season
    const activeSeason = await Season.findOne({ 
      where: { isActive: true }
    });
    
    if (!activeSeason) {
      console.log('⚠️ No active season found');
      return res.status(404).json({ error: 'No active season found' });
    }
    
    console.log(`✅ Active season found: ${activeSeason.id}, Season ${activeSeason.seasonNumber}`);
    res.status(200).json(activeSeason);
  } catch (error) {
    console.error('❌ Error retrieving active season:', error);
    res.status(500).json({ 
      error: 'Error retrieving active season', 
      details: error.message 
    });
  }
});

// New API endpoint to get season scores
app.get('/api/seasons/:seasonId/scores/:userId', async (req, res) => {
  try {
    const { seasonId, userId } = req.params;
    
    console.log(`🔍 Fetching score for user ${userId} in season ${seasonId}`);
    
    // Find the season
    const season = await Season.findByPk(seasonId);
    if (!season) {
      return res.status(404).json({ error: 'Season not found' });
    }
    
    // Find the season score
    const seasonScore = await SeasonScore.findOne({
      where: {
        userId: userId,
        seasonId: seasonId
      }
    });
    
    if (!seasonScore) {
      console.log(`⚠️ No score found for user ${userId} in season ${seasonId}`);
      return res.status(404).json({ error: 'Season score not found' });
    }
    
    console.log(`✅ Score found for user ${userId} in season ${seasonId}: ${seasonScore.score}`);
    res.status(200).json(seasonScore);
  } catch (error) {
    console.error('❌ Error retrieving season score:', error);
    res.status(500).json({ 
      error: 'Error retrieving season score', 
      details: error.message 
    });
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

// API pour récupérer les scores d'un utilisateur
app.get('/api/users/:userId/scores', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Find the user
    const user = await User.findOne({ where: { gameId: userId } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Get the active season
    const activeSeason = await Season.findOne({ where: { isActive: true } });
    
    // Prepare response with global best score
    const response = {
      bestScore: user.bestScore || 0,
      seasonScore: 0 // Always default to 0
    };
    
    // If there's an active season, get the user's season score
    if (activeSeason) {
      // IMPORTANT FIX: Always ensure we have a valid season score record
      let [seasonScore, created] = await SeasonScore.findOrCreate({
        where: { userId: user.gameId, seasonId: activeSeason.id },
        defaults: { score: 0 }
      });
      
      // Extra safeguard: If this is a new season (indicated by creation of record),
      // ensure the score is set to 0
      if (created) {
        console.log(`🔄 Created new season score record for ${userId} in season ${activeSeason.id}`);
      }
      
      response.seasonScore = seasonScore.score;
      
      response.activeSeason = {
        id: activeSeason.id,
        seasonNumber: activeSeason.seasonNumber,
        endDate: activeSeason.endDate
      };
    }
    
    console.log(`📊 Scores fetched for user ${userId}:`, response);
    res.status(200).json(response);
  } catch (error) {
    console.error('❌ Error fetching user scores:', error);
    res.status(500).json({ error: 'Error fetching user scores', details: error.message });
  }
});

// New API endpoint to get user preferences
app.get('/api/users/:userId/preferences', async (req, res) => {
  try {
    const { userId } = req.params;
    
    console.log(`🔍 Fetching preferences for user ${userId}`);
    
    // Find the user
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Return user preferences
    res.status(200).json({
      musicEnabled: user.musicEnabled || false
    });
  } catch (error) {
    console.error('❌ Error fetching user preferences:', error);
    res.status(500).json({ 
      error: 'Error fetching user preferences', 
      details: error.message 
    });
  }
});

// New API endpoint to save user preferences
app.post('/api/users/preferences', async (req, res) => {
  try {
    const { userId, musicEnabled } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    console.log(`🔄 Saving preferences for user ${userId}: musicEnabled=${musicEnabled}`);
    
    // Find the user
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Update user preferences
    await user.update({
      musicEnabled: musicEnabled !== undefined ? musicEnabled : user.musicEnabled
    });
    
    // Return success
    res.status(200).json({
      message: 'Preferences saved successfully',
      preferences: {
        musicEnabled: user.musicEnabled
      }
    });
  } catch (error) {
    console.error('❌ Error saving user preferences:', error);
    res.status(500).json({ 
      error: 'Error saving user preferences', 
      details: error.message 
    });
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
