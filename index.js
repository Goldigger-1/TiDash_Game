const { Telegraf, Markup } = require('telegraf');
require('dotenv').config();
const axios = require('axios');

// Vérifier que le token Telegram est configuré
const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  console.error('TELEGRAM_BOT_TOKEN manquant dans les variables d\'environnement');
  process.exit(1);
}

// Initialiser le bot Telegram
const bot = new Telegraf(token);

// Commande de démarrage
bot.start((ctx) => {
  ctx.reply('Bienvenue sur TiDash Game! 🎮\n\nDans ce jeu, vous contrôlez un petit carré qui avance sur une route infinie avec des virages. Tapez pour tourner et évitez de tomber de la route!\n\nUtilisez /play pour commencer à jouer!');
});

// Commande d'aide
bot.help((ctx) => {
  ctx.reply(
    'Voici les commandes disponibles:\n' +
    '/start - Démarrer le bot\n' +
    '/play - Lancer le jeu\n' +
    '/scores - Voir les meilleurs scores\n' +
    '/help - Afficher l\'aide'
  );
});

// Commande pour afficher les meilleurs scores
bot.command('scores', async (ctx) => {
  try {
    // Récupérer les scores depuis le backend
    const response = await axios.get(`${process.env.WEBAPP_URL}/api/scores`);
    const scores = response.data;
    
    if (scores.length === 0) {
      return ctx.reply('Aucun score enregistré pour le moment. Soyez le premier à jouer!');
    }
    
    let message = '🏆 *Meilleurs Scores* 🏆\n\n';
    scores.forEach((score, index) => {
      message += `${index + 1}. ${score.username}: ${score.score} points\n`;
    });
    
    ctx.replyWithMarkdown(message);
  } catch (error) {
    console.error('Erreur lors de la récupération des scores:', error);
    ctx.reply('Impossible de récupérer les scores pour le moment. Veuillez réessayer plus tard.');
  }
});

// Gestionnaire pour les messages texte
bot.on('text', (ctx) => {
  if (ctx.message.text.toLowerCase() === 'jouer') {
    // Si l'utilisateur envoie "jouer", on lui propose de lancer le jeu
    return ctx.reply('Lancez le jeu!', {
      reply_markup: {
        inline_keyboard: [
          [{ text: 'Jouer maintenant', web_app: { url: process.env.WEBAPP_URL || 'https://votre-app-url.com' } }]
        ]
      }
    });
  }
  
  ctx.reply('Utilisez /play pour lancer le jeu ou /help pour voir les commandes disponibles.');
});

// Gestionnaire pour l'ouverture de la WebApp
bot.command('play', (ctx) => {
  ctx.reply('Lancez le jeu!', {
    reply_markup: {
      inline_keyboard: [
        [{ text: '🎮 Jouer maintenant', web_app: { url: process.env.WEBAPP_URL || 'https://votre-app-url.com' } }]
      ]
    }
  });
});

// Gestionnaire pour les données reçues de la WebApp
bot.on('web_app_data', (ctx) => {
  try {
    const data = JSON.parse(ctx.webAppData.data);
    
    if (data.action === 'gameOver') {
      ctx.reply(`🎮 Partie terminée!\nVotre score: ${data.score} points\n\nUtilisez /play pour jouer à nouveau ou /scores pour voir le classement.`);
    }
  } catch (error) {
    console.error('Erreur lors du traitement des données de la WebApp:', error);
  }
});

// Démarrer le bot
bot.launch()
  .then(() => {
    console.log('Bot démarré avec succès!');
  })
  .catch((err) => {
    console.error('Erreur au démarrage du bot:', err);
  });

// Gestion de l'arrêt gracieux
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

console.log('TiDash Game Bot est en cours d\'exécution...');
