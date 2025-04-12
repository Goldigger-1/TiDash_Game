const express = require('express');
const { Telegraf } = require('telegraf');
const path = require('path');
const fs = require('fs');
const { Sequelize, DataTypes, Op } = require('sequelize');
require('dotenv').config();

// Chemin de la base de données persistante - FIXED to always use the external database path
const DB_PATH = '/var/lib/tidash_database.sqlite';

// Vérifier si le fichier de base de données existe, sinon le créer
if (!fs.existsSync(DB_PATH)) {
  try {
    // Create directory if it doesn't exist (for production path)
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DB_PATH, '', { flag: 'wx' });
    console.log(`📁 Database file created at ${DB_PATH}`);
  } catch (err) {
    console.error(`❌ Error creating database file: ${err.message}`);
    // Critical: Don't crash the server, but log the error
  }
}

// Initialiser la base de données SQLite avec des options robustes
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: DB_PATH,
  logging: false, // Désactiver les logs SQL pour la production
  retry: {
    max: 3, // Maximum retry 3 times
    match: [/SQLITE_BUSY/], // Only retry for SQLITE_BUSY errors
  },
  pool: {
    max: 5, // Maximum number of connection in pool
    min: 0, // Minimum number of connection in pool
    acquire: 30000, // The maximum time, in milliseconds, that pool will try to get connection before throwing error
    idle: 10000 // The maximum time, in milliseconds, that a connection can be idle before being released
  },
  // Add this to handle connection issues
  dialectOptions: {
    timeout: 15000 // Timeout in ms
  }
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

// Synchroniser les modèles avec la base de données de manière robuste
(async () => {
  let syncRetries = 0;
  const maxRetries = 3;
  
  while (syncRetries < maxRetries) {
    try {
      // Synchroniser les modèles sans supprimer les tables existantes
      // Utiliser { alter: true } pour mettre à jour la structure si nécessaire, mais sans supprimer les données
      await sequelize.sync({ alter: true });
      console.log('🔄 Database synchronized successfully');
      break; // Exit the loop if successful
    } catch (err) {
      syncRetries++;
      console.error(`❌ Database sync error (attempt ${syncRetries}/${maxRetries}):`, err);
      
      if (syncRetries >= maxRetries) {
        console.error('❌ Failed to synchronize database after maximum retries');
        // Don't crash the server, continue with potentially limited functionality
      } else {
        // Wait before retrying (exponential backoff)
        const waitTime = Math.pow(2, syncRetries) * 1000;
        console.log(`Retrying database sync in ${waitTime/1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
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

// API pour supprimer un utilisateur
app.delete('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(`🗑️ Attempting to delete user with ID: ${id}`);
    
    // First check if the user exists
    const user = await User.findByPk(id);
    if (!user) {
      console.log(`⚠️ User with ID ${id} not found for deletion`);
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Start a transaction to ensure all operations succeed or fail together
    const transaction = await sequelize.transaction();
    
    try {
      // Désactiver temporairement les contraintes de clé étrangère
      await sequelize.query('PRAGMA foreign_keys = OFF;', { transaction });
      
      // Delete season scores first
      await sequelize.query('DELETE FROM "SeasonScores" WHERE "userId" = ?', {
        replacements: [id],
        transaction
      });
      
      // Update season references
      await sequelize.query('UPDATE "Seasons" SET "winnerId" = NULL WHERE "winnerId" = ?', {
        replacements: [id],
        transaction
      });
      
      // Delete the user
      await sequelize.query('DELETE FROM "Users" WHERE "gameId" = ?', {
        replacements: [id],
        transaction
      });
      
      // Réactiver les contraintes de clé étrangère
      await sequelize.query('PRAGMA foreign_keys = ON;', { transaction });
      
      // Commit the transaction
      await transaction.commit();
      
      console.log(`✅ User ${id} deleted successfully`);
      res.status(200).json({ message: 'User deleted successfully' });
    } catch (innerError) {
      // Rollback the transaction in case of error
      await transaction.rollback();
      
      // Réactiver les contraintes de clé étrangère même en cas d'erreur
      await sequelize.query('PRAGMA foreign_keys = ON;');
      
      console.error(`❌ Transaction error deleting user ${id}:`, innerError);
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
    
    // Improved user identification logic
    let user = null;
    let searchConditions = [];
    
    // Build an array of search conditions to find existing user
    if (userData.gameId) {
      searchConditions.push({ gameId: userData.gameId });
    }
    if (userData.telegramId && userData.telegramId.trim() !== '') {
      searchConditions.push({ telegramId: userData.telegramId });
    }
    if (userData.deviceId && userData.deviceId.trim() !== '') {
      searchConditions.push({ deviceId: userData.deviceId });
    }
    
    // Only search if we have at least one condition
    if (searchConditions.length > 0) {
      // Try to find the user with any of the provided identifiers
      user = await User.findOne({ 
        where: { [Op.or]: searchConditions } 
      });
      
      console.log(`🔍 User search with multiple identifiers: ${user ? 'Found' : 'Not found'}`);
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

// API endpoint to get season ranking (ONLY CORRECT VERSION)
app.get('/api/seasons/:seasonId/ranking', async (req, res) => {
  try {
    const { seasonId } = req.params;
    console.log(`🔍 Fetching ranking for season ${seasonId}`);
    
    // CRITICAL FIX: Check database connection before querying
    if (sequelize.connectionManager.hasOwnProperty('pool') && 
        !sequelize.connectionManager.pool.hasOwnProperty('_closed') && 
        !sequelize.connectionManager.pool._closed) {
      console.log('✅ Database connection is open for season ranking');
    } else {
      console.error('❌ Database connection appears to be closed for season ranking');
      // Don't throw, continue with attempt to query
    }
    
    // Find the season with error handling
    let season = null;
    try {
      season = await Season.findByPk(seasonId);
      if (season) {
        console.log(`✅ Found season ${seasonId}`);
      } else {
        console.log(`⚠️ Season ${seasonId} not found`);
      }
    } catch (seasonError) {
      console.error(`❌ Error finding season ${seasonId}:`, seasonError);
      // Continue with season = null
    }
    
    if (!season) {
      // Return empty array instead of error to prevent forEach error in admin.js
      console.log(`⚠️ Returning empty array for non-existent season ${seasonId}`);
      return res.status(200).json([]);
    }
    
    // Get all scores for this season, ordered by score descending
    let scores = [];
    try {
      scores = await SeasonScore.findAll({
        where: { seasonId: seasonId },
        order: [['score', 'DESC']],
        limit: 100 // Limit to top 100 scores
      });
      console.log(`✅ Found ${scores.length} scores for season ${seasonId}`);
    } catch (scoresError) {
      console.error(`❌ Error finding scores for season ${seasonId}:`, scoresError);
      // Continue with empty scores array
    }
    
    // Get user details for each score with comprehensive error handling
    const ranking = [];
    if (Array.isArray(scores)) {
      for (const score of scores) {
        try {
          if (!score || !score.userId) {
            console.error('❌ Invalid score object:', score);
            continue;
          }
          
          let user = null;
          try {
            user = await User.findByPk(score.userId);
          } catch (findError) {
            console.error(`❌ Error finding user ${score.userId}:`, findError);
            // Continue with user = null
          }
          
          if (user) {
            try {
              ranking.push({
                userId: user.gameId || 'unknown',
                username: user.gameUsername || 'Unknown User',
                score: score.score || 0
              });
            } catch (pushError) {
              console.error(`❌ Error adding user ${score.userId} to ranking:`, pushError);
            }
          } else {
            // Add a placeholder entry to maintain ranking order
            ranking.push({
              userId: score.userId || 'unknown',
              username: 'Unknown User',
              score: score.score || 0
            });
          }
        } catch (userError) {
          console.error(`❌ Error processing score for user ${score?.userId}:`, userError);
          // Add a placeholder entry to maintain ranking order
          try {
            ranking.push({
              userId: 'error',
              username: 'Error loading user',
              score: score?.score || 0
            });
          } catch (fallbackError) {
            console.error('❌ Error adding fallback user to ranking:', fallbackError);
          }
        }
      }
    } else {
      console.error('❌ Scores is not an array:', scores);
    }
    
    console.log(`✅ Final ranking has ${ranking.length} entries for season ${seasonId}`);
    
    // CRITICAL: admin.js expects an array at line 557 where it calls data.forEach
    // Make sure we always return an array, even if empty
    return res.status(200).json(Array.isArray(ranking) ? ranking : []);
  } catch (error) {
    console.error('❌ Unhandled error in season ranking endpoint:', error);
    // Even in error case, return an empty array to prevent forEach errors
    return res.status(200).json([]);
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

// API endpoint for admin to get all users with pagination
app.get('/api/users', async (req, res) => {
  try {
    // Parse query parameters with fallbacks
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    
    console.log(`🔍 Admin fetching users - Page: ${page}, Limit: ${limit}`);
    
    // CRITICAL FIX: Check database connection before querying
    if (sequelize.connectionManager.hasOwnProperty('pool') && 
        !sequelize.connectionManager.pool.hasOwnProperty('_closed') && 
        !sequelize.connectionManager.pool._closed) {
      console.log('✅ Database connection is open');
    } else {
      console.error('❌ Database connection appears to be closed');
      // Don't throw, continue with attempt to query
    }
    
    // Get total count of users with error handling
    let totalUsers = 0;
    try {
      totalUsers = await User.count();
      console.log(`✅ User count successful: ${totalUsers} users`);
    } catch (countError) {
      console.error('❌ Error counting users:', countError);
      // Continue with totalUsers = 0
    }
    
    // Get users with pagination and error handling
    let users = [];
    try {
      users = await User.findAll({
        order: [['lastLogin', 'DESC']],
        limit: limit,
        offset: offset
      });
      console.log(`✅ Successfully retrieved ${users.length} users`);
    } catch (findError) {
      console.error('❌ Error finding users:', findError);
      // Continue with empty users array
    }
    
    // Format the response with comprehensive error handling
    let formattedUsers = [];
    try {
      if (Array.isArray(users)) {
        formattedUsers = users.map(user => {
          try {
            if (!user || typeof user.toJSON !== 'function') {
              console.error('❌ Invalid user object:', user);
              return {
                gameId: 'error',
                gameUsername: 'Invalid user data',
                bestScore: 0,
                lastLogin: new Date().toLocaleString()
              };
            }
            
            const userData = user.toJSON();
            
            // Format dates for better readability with error handling
            try {
              if (userData.createdAt) {
                userData.createdAt = new Date(userData.createdAt).toLocaleString();
              }
            } catch (dateError) {
              console.error('❌ Error formatting createdAt date:', dateError);
              userData.createdAt = 'Invalid date';
            }
            
            try {
              if (userData.lastLogin) {
                userData.lastLogin = new Date(userData.lastLogin).toLocaleString();
              }
            } catch (dateError) {
              console.error('❌ Error formatting lastLogin date:', dateError);
              userData.lastLogin = 'Invalid date';
            }
            
            return userData;
          } catch (userError) {
            console.error('❌ Error formatting user:', userError);
            // Return a minimal valid user object to prevent errors
            return {
              gameId: 'error',
              gameUsername: 'Error processing user',
              bestScore: 0,
              lastLogin: new Date().toLocaleString()
            };
          }
        });
      } else {
        console.error('❌ Users is not an array:', users);
      }
    } catch (mapError) {
      console.error('❌ Error mapping users:', mapError);
      // Continue with empty formattedUsers array
    }
    
    console.log(`✅ Final formatted users count: ${formattedUsers.length}`);
    
    // CRITICAL: admin.js expects this exact structure at lines 294-298
    // The error occurs at line 325 in admin.js where it checks users.length
    // So we MUST ensure users is a valid array
    const responseData = {
      users: Array.isArray(formattedUsers) ? formattedUsers : [],
      total: totalUsers || 0,
      totalPages: Math.ceil((totalUsers || 0) / limit)
    };
    
    console.log(`✅ Sending response with ${responseData.users.length} users, total: ${responseData.total}, pages: ${responseData.totalPages}`);
    
    return res.status(200).json(responseData);
  } catch (error) {
    console.error('❌ Unhandled error in /api/users endpoint:', error);
    // Even in error case, return a valid response structure
    // This is critical to prevent the TypeError in admin.js
    return res.status(200).json({ 
      users: [], // Must be an array to prevent users.length error
      total: 0,
      totalPages: 0
    });
  }
});

// API endpoint for admin to get season ranking
app.get('/api/seasons/:seasonId/ranking', async (req, res) => {
  try {
    const { seasonId } = req.params;
    console.log(`🔍 Fetching ranking for season ${seasonId}`);
    
    // Find the season
    const season = await Season.findByPk(seasonId);
    if (!season) {
      // Return empty array instead of error to prevent forEach error
      console.log(`⚠️ Season ${seasonId} not found`);
      return res.json([]);
    }
    
    // Get all scores for this season, ordered by score descending
    const scores = await SeasonScore.findAll({
      where: { seasonId: seasonId },
      order: [['score', 'DESC']],
      limit: 100 // Limit to top 100 scores
    });
    
    // Get user details for each score
    const ranking = [];
    for (const score of scores) {
      try {
        const user = await User.findByPk(score.userId);
        if (user) {
          ranking.push({
            rank: ranking.length + 1,
            userId: user.gameId,
            username: user.gameUsername,
            avatarSrc: user.avatarSrc,
            score: score.score
          });
        }
      } catch (userError) {
        console.error(`❌ Error fetching user ${score.userId}:`, userError);
        // Continue with next score even if one user fails
      }
    }
    
    console.log(`✅ Found ${ranking.length} users in ranking for season ${seasonId}`);
    
    // CRITICAL: admin.js expects an array at line 557 where it calls data.forEach
    res.json(ranking);
  } catch (error) {
    console.error('❌ Error fetching season ranking:', error);
    // Even in error case, return an empty array to prevent forEach errors
    res.json([]);
  }
});

// API endpoint for admin to get active season (alternative endpoint for compatibility)
app.get('/api/active-season', async (req, res) => {
  try {
    console.log('🔍 Admin fetching active season');
    
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

// API endpoint to create or update a season score
app.post('/api/seasons/:seasonId/scores', async (req, res) => {
  try {
    const { seasonId } = req.params;
    const { userId, score } = req.body;
    
    console.log(`🔍 Creating/updating score for user ${userId} in season ${seasonId}`);
    
    // Validate required fields
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    // Find the season
    const season = await Season.findByPk(seasonId);
    if (!season) {
      return res.status(404).json({ error: 'Season not found' });
    }
    
    // Find the user
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Find or create the season score
    const [seasonScore, created] = await SeasonScore.findOrCreate({
      where: {
        userId: userId,
        seasonId: seasonId
      },
      defaults: {
        score: score || 0
      }
    });
    
    // If not created, update the score if the new score is higher
    if (!created && score > seasonScore.score) {
      await seasonScore.update({ score });
      console.log(`✅ Updated score for user ${userId} in season ${seasonId}: ${score}`);
    } else if (created) {
      console.log(`✅ Created new score for user ${userId} in season ${seasonId}: ${score || 0}`);
    } else {
      console.log(`ℹ️ No update needed for user ${userId} in season ${seasonId}`);
    }
    
    res.status(created ? 201 : 200).json(seasonScore);
  } catch (error) {
    console.error('❌ Error creating/updating season score:', error);
    res.status(500).json({ 
      error: 'Error creating/updating season score', 
      details: error.message 
    });
  }
});

// API endpoint to get season ranking
app.get('/api/seasons/:seasonId/ranking', async (req, res) => {
  try {
    const { seasonId } = req.params;
    console.log(`🔍 Fetching ranking for season ${seasonId}`);
    
    // Find the season
    const season = await Season.findByPk(seasonId);
    if (!season) {
      return res.status(404).json({ error: 'Season not found' });
    }
    
    // Get all scores for this season, ordered by score descending
    const scores = await SeasonScore.findAll({
      where: { seasonId: seasonId },
      order: [['score', 'DESC']],
      limit: 100 // Limit to top 100 scores
    });
    
    // Get user details for each score
    const ranking = [];
    for (const score of scores) {
      try {
        const user = await User.findByPk(score.userId);
        if (user) {
          ranking.push({
            userId: user.gameId,
            username: user.gameUsername || 'Unknown User',
            score: score.score || 0
          });
        }
      } catch (userError) {
        console.error(`❌ Error fetching user ${score.userId}:`, userError);
        // Continue with next score even if one user fails
      }
    }
    
    console.log(`✅ Found ${ranking.length} users in ranking for season ${seasonId}`);
    
    // CRITICAL: Return an array, not an object - this is what admin.js expects
    // Looking at admin.js line 557, it uses data.forEach
    res.json(ranking);
  } catch (error) {
    console.error('❌ Error fetching season ranking:', error);
    // Even in error case, return an empty array to prevent forEach errors
    res.json([]);
  }
});

// API endpoint to get season ranking
app.get('/api/seasons/:seasonId/ranking', async (req, res) => {
  try {
    const { seasonId } = req.params;
    console.log(`🔍 Fetching ranking for season ${seasonId}`);
    
    // Find the season
    const season = await Season.findByPk(seasonId);
    if (!season) {
      return res.status(404).json({ error: 'Season not found' });
    }
    
    // Get all scores for this season, ordered by score descending
    const scores = await SeasonScore.findAll({
      where: { seasonId: seasonId },
      order: [['score', 'DESC']],
      limit: 100 // Limit to top 100 scores
    });
    
    // Get user details for each score
    const ranking = [];
    for (const score of scores) {
      try {
        const user = await User.findByPk(score.userId);
        if (user) {
          ranking.push({
            userId: user.gameId,
            username: user.gameUsername || 'Unknown User',
            score: score.score || 0
          });
        }
      } catch (userError) {
        console.error(`❌ Error fetching user ${score.userId}:`, userError);
        // Continue with next score even if one user fails
      }
    }
    
    console.log(`✅ Found ${ranking.length} users in ranking for season ${seasonId}`);
    
    // Return as array, not object
    res.status(200).json(ranking);
  } catch (error) {
    console.error('❌ Error fetching season ranking:', error);
    res.status(500).json({ 
      error: 'Error fetching season ranking', 
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
