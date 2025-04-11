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
    console.log(`Fichier de base de données créé à ${DB_PATH}`);
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

// Définir le modèle utilisateur
const User = sequelize.define('User', {
  gameId: {
    type: DataTypes.STRING,
    allowNull: false
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
    defaultValue: 0
  },
  registrationDate: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  lastLogin: {
    type: DataTypes.DATEONLY,
    allowNull: false
  }
}, {
  // Spécifier explicitement le nom de la table
  tableName: 'users',
  // Désactiver la conversion automatique des noms de tables en pluriel
  freezeTableName: false
});

// Initialiser la base de données
(async () => {
  try {
    // Synchroniser les modèles avec la base de données sans forcer la recréation des tables
    await sequelize.sync({ force: false });
    console.log('Base de données initialisée avec succès');
    
    // Vérifier si la table users existe et contient des données
    try {
      const count = await User.count();
      console.log(`Nombre d'utilisateurs dans la base de données: ${count}`);
      
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

// Route pour le panneau d'administration
app.get('/admin754774', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin754774', 'index.html'));
});

// API pour récupérer les données utilisateurs avec pagination
app.get('/api/users', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';
    
    let whereClause = {};
    
    if (search) {
      whereClause = {
        [Op.or]: [
          { gameUsername: { [Op.like]: `%${search}%` } },
          { gameId: { [Op.like]: `%${search}%` } },
          { telegramUsername: { [Op.like]: `%${search}%` } },
          { telegramId: { [Op.like]: `%${search}%` } },
          { paypalEmail: { [Op.like]: `%${search}%` } }
        ]
      };
    }
    
    const { count, rows } = await User.findAndCountAll({
      where: whereClause,
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
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// API pour supprimer un utilisateur
app.delete('/api/users/:id', async (req, res) => {
  try {
    const userId = req.params.id;
    
    const result = await User.destroy({
      where: { gameId: userId }
    });
    
    if (result === 0) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }
    
    res.status(200).json({ message: 'Utilisateur supprimé avec succès' });
  } catch (error) {
    console.error('Erreur lors de la suppression de l\'utilisateur:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// API pour enregistrer un nouvel utilisateur ou mettre à jour un utilisateur existant
app.post('/api/users', async (req, res) => {
  try {
    const userData = req.body;
    
    if (!userData || !userData.gameId || !userData.gameUsername) {
      return res.status(400).json({ error: 'Données utilisateur invalides' });
    }
    
    console.log("Données utilisateur reçues:", userData);
    
    // Préparer les données utilisateur
    const userToSave = {
      gameId: userData.gameId,
      gameUsername: userData.gameUsername,
      telegramId: userData.telegramId !== "N/A" ? userData.telegramId : null,
      telegramUsername: userData.telegramUsername !== "N/A" ? userData.telegramUsername : null,
      paypalEmail: userData.paypalEmail || "",
      bestScore: parseInt(userData.bestScore) || 0,
      registrationDate: userData.registrationDate || new Date().toISOString().split('T')[0],
      lastLogin: userData.lastLogin || new Date().toISOString().split('T')[0]
    };
    
    // Vérifier si l'utilisateur existe déjà
    let existingUser = null;
    
    // Si l'ID Telegram est disponible, chercher d'abord par ID Telegram
    if (userData.telegramId && userData.telegramId !== "N/A") {
      console.log("Recherche d'utilisateur par ID Telegram:", userData.telegramId);
      existingUser = await User.findOne({
        where: { telegramId: userData.telegramId }
      });
    }
    
    // Si non trouvé par ID Telegram, chercher par ID de jeu
    if (!existingUser) {
      console.log("Recherche d'utilisateur par ID de jeu:", userData.gameId);
      existingUser = await User.findOne({
        where: { gameId: userData.gameId }
      });
    }
    
    if (existingUser) {
      console.log("Utilisateur existant trouvé, mise à jour:", existingUser.id);
      // Mettre à jour l'utilisateur existant
      await existingUser.update(userToSave);
      res.status(200).json({ message: 'Utilisateur mis à jour avec succès' });
    } else {
      console.log("Nouvel utilisateur, création en cours");
      // Créer un nouvel utilisateur
      const newUser = await User.create(userToSave);
      console.log("Nouvel utilisateur créé:", newUser.id);
      res.status(201).json({ message: 'Utilisateur créé avec succès' });
    }
  } catch (error) {
    console.error('Erreur lors de l\'enregistrement de l\'utilisateur:', error);
    res.status(500).json({ error: 'Erreur serveur' });
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
