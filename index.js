const { Telegraf } = require('telegraf');
require('dotenv').config();

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
  ctx.reply('Bienvenue sur TiDash Game! 🎮');
});

// Commande d'aide
bot.help((ctx) => {
  ctx.reply('Voici les commandes disponibles:\n/start - Démarrer le bot\n/help - Afficher l\'aide');
});

// Gestionnaire pour les messages texte
bot.on('text', (ctx) => {
  ctx.reply(`Vous avez dit: ${ctx.message.text}`);
});

// Gestionnaire pour l'ouverture de la WebApp
bot.command('play', (ctx) => {
  ctx.reply('Lancez le jeu!', {
    reply_markup: {
      inline_keyboard: [
        [{ text: 'Jouer maintenant', web_app: { url: process.env.WEBAPP_URL || 'https://votre-app-url.com' } }]
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

// Gestion de l'arrêt gracieux
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

console.log('TiDash Game Bot est en cours d\'exécution...');
