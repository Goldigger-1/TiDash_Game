const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Stockage temporaire des scores (dans une application réelle, utilisez une base de données)
const highScores = [];

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Basic health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Telegram Mini App initialization endpoint
app.post('/api/init-data', (req, res) => {
  // Here you'll validate the Telegram WebApp init data
  // For now, we'll just acknowledge the request
  res.json({ success: true });
});

// Endpoint pour enregistrer un score
app.post('/api/scores', (req, res) => {
  const { score, username = 'Anonymous' } = req.body;
  
  if (typeof score !== 'number' || score < 0) {
    return res.status(400).json({ error: 'Score invalide' });
  }
  
  const newScore = {
    username,
    score,
    date: new Date().toISOString()
  };
  
  highScores.push(newScore);
  highScores.sort((a, b) => b.score - a.score); // Trier par score décroissant
  
  // Garder seulement les 10 meilleurs scores
  if (highScores.length > 10) {
    highScores.length = 10;
  }
  
  res.status(201).json({ success: true, rank: highScores.findIndex(s => s === newScore) + 1 });
});

// Endpoint pour récupérer les meilleurs scores
app.get('/api/scores', (req, res) => {
  res.json(highScores);
});

// Servir l'application frontend pour toutes les autres routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on port ${port}`);
});