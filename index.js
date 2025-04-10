const { Telegraf } = require('telegraf');
require('dotenv').config();
const express = require('express');
const path = require('path');

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

// Serve static files from the public folder
app.use(express.static(path.join(__dirname, 'public')));

// Default route that returns index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
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
