const { Telegraf } = require('telegraf');
require('dotenv').config();
const express = require('express');
const path = require('path');

// Vérifier que le token Telegram est configuré
const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  console.error('TELEGRAM_BOT_TOKEN manquant dans les variables d\'environnement');
  process.exit(1);
}

// Initialiser le bot Telegram
const bot = new Telegraf(token);

// Configuration du menu du bot
bot.telegram.setMyCommands([
  { command: 'start', description: 'Démarrer le jeu' },
  { command: 'help', description: 'Afficher l\'aide' }
]);

// Commande de démarrage
bot.start((ctx) => {
  ctx.reply('Bienvenue sur TiDash Game! 🎮', {
    reply_markup: {
      inline_keyboard: [
        [{ text: '🎮 Jouer maintenant', web_app: { url: process.env.WEBAPP_URL || 'http://194.163.152.175' } }]
      ]
    }
  });
});

// Commande d'aide
bot.help((ctx) => {
  ctx.reply(
    'Voici les commandes disponibles:\n' +
    '/start - Démarrer le bot et jouer\n' +
    '/help - Afficher l\'aide',
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: '🎮 Jouer maintenant', web_app: { url: process.env.WEBAPP_URL || 'http://194.163.152.175' } }]
        ]
      }
    }
  );
});

// Gestionnaire pour les messages texte
bot.on('text', (ctx) => {
  if (ctx.message.text.toLowerCase() === 'jouer') {
    // Si l'utilisateur envoie "jouer", on lui propose de lancer le jeu
    return ctx.reply('Lancez le jeu!', {
      reply_markup: {
        inline_keyboard: [
          [{ text: 'Jouer maintenant', web_app: { url: process.env.WEBAPP_URL || 'http://194.163.152.175' } }]
        ]
      }
    });
  }
  
  ctx.reply('Utilisez /start pour lancer le jeu ou /help pour voir les commandes disponibles.');
});

// Gestionnaire pour l'ouverture de la WebApp
bot.command('play', (ctx) => {
  ctx.reply('Lancez le jeu!', {
    reply_markup: {
      inline_keyboard: [
        [{ text: '🎮 Jouer maintenant', web_app: { url: process.env.WEBAPP_URL || 'http://194.163.152.175' } }]
      ]
    }
  });
});

// Démarrer le bot
bot.launch()
  .then(() => {
    console.log('Bot démarré avec succès!');
  })
  .catch((err) => {
    console.error('Erreur au démarrage du bot:', err);
  });

// Créer un serveur Express simple
const app = express();
const PORT = process.env.PORT || 80;

// Servir les fichiers statiques du dossier public
app.use(express.static(path.join(__dirname, 'public')));

// Route par défaut qui renvoie index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Démarrer le serveur
app.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
});

// Gestion de l'arrêt gracieux
process.once('SIGINT', () => {
  bot.stop('SIGINT');
  process.exit(0);
});
process.once('SIGTERM', () => {
  bot.stop('SIGTERM');
  process.exit(0);
});

console.log('TiDash Game Bot est en cours d\'exécution...');
