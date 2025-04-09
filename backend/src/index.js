const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

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

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});