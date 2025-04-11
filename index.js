const { Telegraf } = require('telegraf');
require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');

// Check that the Telegram token is configured
const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  console.error('TELEGRAM_BOT_TOKEN missing in environment variables');
  process.exit(1);
}

// Initialize the Telegram bot
const bot = new Telegraf(token);

// Bot menu configuration
bot.telegram.setMyCommands([
  { command: 'start', description: 'Start the game' },
  { command: 'help', description: 'Show help' }
]);

// Start command
bot.start((ctx) => {
  ctx.reply('Welcome to TiDash Game! 🎮', {
    reply_markup: {
      inline_keyboard: [
        [{ text: '🎮 Play now', web_app: { url: process.env.WEBAPP_URL || 'http://194.163.152.175' } }]
      ]
    }
  });
});

// Help command
bot.help((ctx) => {
  ctx.reply(
    'Here are the available commands:\n' +
    '/start - Start the bot and play\n' +
    '/help - Show help',
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: '🎮 Play now', web_app: { url: process.env.WEBAPP_URL || 'http://194.163.152.175' } }]
        ]
      }
    }
  );
});

// Text message handler
bot.on('text', (ctx) => {
  if (ctx.message.text.toLowerCase() === 'play') {
    // If the user sends "play", offer to launch the game
    return ctx.reply('Launch the game!', {
      reply_markup: {
        inline_keyboard: [
          [{ text: 'Play now', web_app: { url: process.env.WEBAPP_URL || 'http://194.163.152.175' } }]
        ]
      }
    });
  }
  
  ctx.reply('Use /start to launch the game or /help to see available commands.');
});

// Handler for WebApp opening
bot.command('play', (ctx) => {
  ctx.reply('Launch the game!', {
    reply_markup: {
      inline_keyboard: [
        [{ text: '🎮 Play now', web_app: { url: process.env.WEBAPP_URL || 'http://194.163.152.175' } }]
      ]
    }
  });
});

// Start the bot
bot.launch()
  .then(() => {
    console.log('Bot started successfully!');
  })
  .catch((err) => {
    console.error('Error starting the bot:', err);
  });

// Create a simple Express server
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware pour parser le JSON
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from the public folder
app.use(express.static(path.join(__dirname, 'public')));

// Default route that returns index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Route pour le panneau d'administration
app.get('/admin754774', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin754774', 'index.html'));
});

// Fonction pour récupérer les données utilisateurs depuis les fichiers de localStorage
function getUsersFromLocalStorage() {
  try {
    // Créer un dossier pour stocker les données utilisateurs si nécessaire
    const dataDir = path.join(__dirname, 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir);
    }
    
    const usersFile = path.join(dataDir, 'users.json');
    
    // Si le fichier existe, le lire
    if (fs.existsSync(usersFile)) {
      const usersData = fs.readFileSync(usersFile, 'utf8');
      return JSON.parse(usersData);
    }
    
    // Sinon retourner un tableau vide
    return [];
  } catch (error) {
    console.error('Erreur lors de la lecture des données utilisateurs:', error);
    return [];
  }
}

// Fonction pour sauvegarder les données utilisateurs
function saveUsers(users) {
  try {
    const dataDir = path.join(__dirname, 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir);
    }
    
    const usersFile = path.join(dataDir, 'users.json');
    fs.writeFileSync(usersFile, JSON.stringify(users, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('Erreur lors de la sauvegarde des données utilisateurs:', error);
    return false;
  }
}

// API pour récupérer les données utilisateurs
app.get('/api/users', (req, res) => {
  const users = getUsersFromLocalStorage();
  res.json(users);
});

// API pour supprimer un utilisateur
app.delete('/api/users/:id', (req, res) => {
  const userId = req.params.id;
  const users = getUsersFromLocalStorage();
  
  const updatedUsers = users.filter(user => user.gameId !== userId);
  
  if (users.length === updatedUsers.length) {
    return res.status(404).json({ error: 'Utilisateur non trouvé' });
  }
  
  const success = saveUsers(updatedUsers);
  
  if (success) {
    res.status(200).json({ message: 'Utilisateur supprimé avec succès' });
  } else {
    res.status(500).json({ error: 'Erreur lors de la suppression de l\'utilisateur' });
  }
});

// API pour enregistrer un nouvel utilisateur ou mettre à jour un utilisateur existant
app.post('/api/users', (req, res) => {
  try {
    const userData = req.body;
    
    if (!userData || !userData.gameId || !userData.gameUsername) {
      return res.status(400).json({ error: 'Données utilisateur invalides' });
    }
    
    const users = getUsersFromLocalStorage();
    
    // Vérifier si l'utilisateur existe déjà, d'abord par ID Telegram s'il est disponible
    let existingUserIndex = -1;
    
    if (userData.telegramId && userData.telegramId !== "N/A") {
      // Chercher par ID Telegram
      existingUserIndex = users.findIndex(user => user.telegramId === userData.telegramId);
    }
    
    // Si non trouvé par ID Telegram, chercher par ID de jeu
    if (existingUserIndex === -1) {
      existingUserIndex = users.findIndex(user => user.gameId === userData.gameId);
    }
    
    if (existingUserIndex !== -1) {
      // Mettre à jour l'utilisateur existant
      users[existingUserIndex] = { ...users[existingUserIndex], ...userData };
    } else {
      // Ajouter un nouvel utilisateur
      users.push(userData);
    }
    
    const success = saveUsers(users);
    
    if (success) {
      res.status(200).json({ message: 'Utilisateur enregistré avec succès' });
    } else {
      res.status(500).json({ error: 'Erreur lors de l\'enregistrement de l\'utilisateur' });
    }
  } catch (error) {
    console.error('Erreur lors de l\'enregistrement de l\'utilisateur:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Start the server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server started on port ${PORT}`);
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
