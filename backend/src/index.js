const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();
const { connectDB, Score } = require('./db');

const app = express();
const port = process.env.PORT || 3000;

// Stockage temporaire des scores (utilisé si MongoDB n'est pas disponible)
const highScores = [];

// Connexion à MongoDB
connectDB();

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
app.post('/api/scores', async (req, res) => {
  const { score, username = 'Anonymous' } = req.body;
  
  if (typeof score !== 'number' || score < 0) {
    return res.status(400).json({ error: 'Score invalide' });
  }
  
  try {
    // Essayer d'enregistrer dans MongoDB
    const newScore = new Score({
      username,
      score,
      date: new Date()
    });
    
    await newScore.save();
    
    // Récupérer le classement
    const rank = await Score.countDocuments({ score: { $gt: score } }) + 1;
    
    res.status(201).json({ success: true, rank });
  } catch (error) {
    console.error('Erreur lors de l\'enregistrement du score dans MongoDB:', error);
    
    // Fallback: utiliser le stockage en mémoire
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
    
    res.status(201).json({ 
      success: true, 
      rank: highScores.findIndex(s => s === newScore) + 1,
      note: 'Stocké en mémoire (MongoDB non disponible)'
    });
  }
});

// Endpoint pour récupérer les meilleurs scores
app.get('/api/scores', async (req, res) => {
  try {
    // Essayer de récupérer depuis MongoDB
    const scores = await Score.find()
      .sort({ score: -1 })
      .limit(10)
      .select('username score date');
    
    res.json(scores);
  } catch (error) {
    console.error('Erreur lors de la récupération des scores depuis MongoDB:', error);
    
    // Fallback: utiliser le stockage en mémoire
    res.json(highScores);
  }
});

// Servir l'application frontend pour toutes les autres routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on port ${port}`);
});