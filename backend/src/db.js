const mongoose = require('mongoose');
require('dotenv').config();

// Schéma pour les scores
const scoreSchema = new mongoose.Schema({
  username: {
    type: String,
    default: 'Anonymous'
  },
  score: {
    type: Number,
    required: true
  },
  date: {
    type: Date,
    default: Date.now
  }
});

// Modèle pour les scores
const Score = mongoose.model('Score', scoreSchema);

// Connexion à MongoDB
const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/tidash';
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('MongoDB connecté avec succès');
  } catch (error) {
    console.error('Erreur de connexion à MongoDB:', error.message);
    // Ne pas quitter le processus, permettre au serveur de fonctionner même sans DB
    console.log('Le serveur fonctionnera avec stockage en mémoire');
  }
};

module.exports = {
  connectDB,
  Score
};
