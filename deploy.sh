#!/bin/bash

# Script de déploiement pour TiDash Game
echo "Déploiement de TiDash Game..."

# Arrêter l'application si elle est en cours d'exécution
echo "Arrêt de l'application existante..."
pm2 stop tidash || true

# Mettre à jour le code depuis GitHub
echo "Mise à jour du code depuis GitHub..."
git pull

# Installer les dépendances
echo "Installation des dépendances..."
npm install

# Installer les dépendances du backend
echo "Installation des dépendances du backend..."
cd backend
npm install
cd ..

# Copier les fichiers du frontend vers le backend/public
echo "Copie des fichiers du frontend vers le backend/public..."
mkdir -p backend/public
cp -r frontend/public/* backend/public/

# Démarrer l'application principale (bot Telegram)
echo "Démarrage du bot Telegram..."
pm2 start index.js --name "tidash" || pm2 restart tidash

# Démarrer le serveur backend
echo "Démarrage du serveur backend..."
cd backend
pm2 start src/index.js --name "tidash-backend" || pm2 restart tidash-backend
cd ..

echo "Déploiement terminé!"
echo "Vérifiez les logs avec: pm2 logs tidash"
echo "Vérifiez les logs du backend avec: pm2 logs tidash-backend"
