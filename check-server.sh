#!/bin/bash

# Script de diagnostic pour TiDash Game
echo "Diagnostic du serveur TiDash Game..."

# Vérifier si MongoDB est installé
echo "Vérification de MongoDB..."
if command -v mongod &> /dev/null; then
    echo "✅ MongoDB est installé"
    # Vérifier si MongoDB est en cours d'exécution
    if pgrep -x "mongod" > /dev/null; then
        echo "✅ MongoDB est en cours d'exécution"
    else
        echo "❌ MongoDB n'est pas en cours d'exécution"
        echo "   Commande pour démarrer MongoDB: sudo systemctl start mongod"
    fi
else
    echo "❌ MongoDB n'est pas installé"
    echo "   Commande pour installer MongoDB:"
    echo "   sudo apt-get update && sudo apt-get install -y mongodb"
fi

# Vérifier les processus PM2
echo "Vérification des processus PM2..."
if command -v pm2 &> /dev/null; then
    echo "✅ PM2 est installé"
    
    # Vérifier si les processus TiDash sont en cours d'exécution
    if pm2 list | grep -q "tidash"; then
        echo "✅ Processus tidash trouvé"
    else
        echo "❌ Processus tidash non trouvé"
        echo "   Commande pour démarrer: pm2 start index.js --name tidash"
    fi
    
    if pm2 list | grep -q "tidash-backend"; then
        echo "✅ Processus tidash-backend trouvé"
    else
        echo "❌ Processus tidash-backend non trouvé"
        echo "   Commande pour démarrer: cd backend && pm2 start src/index.js --name tidash-backend"
    fi
    
    # Afficher les logs des processus
    echo "Dernières lignes des logs tidash:"
    pm2 logs tidash --lines 10 --nostream 2>/dev/null || echo "Aucun log disponible"
    
    echo "Dernières lignes des logs tidash-backend:"
    pm2 logs tidash-backend --lines 10 --nostream 2>/dev/null || echo "Aucun log disponible"
else
    echo "❌ PM2 n'est pas installé"
    echo "   Commande pour installer PM2: npm install -g pm2"
fi

# Vérifier si le port 80 est utilisé
echo "Vérification du port 80..."
if command -v netstat &> /dev/null; then
    if netstat -tuln | grep -q ":80 "; then
        echo "✅ Port 80 est en cours d'utilisation"
        echo "   Processus utilisant le port 80:"
        sudo lsof -i :80 || echo "Impossible de déterminer le processus"
    else
        echo "❌ Port 80 n'est pas utilisé"
        echo "   Vérifiez que votre serveur est configuré pour écouter sur le port 80"
    fi
else
    echo "❌ netstat n'est pas installé"
    echo "   Commande pour installer netstat: sudo apt-get install -y net-tools"
fi

# Vérifier les permissions des fichiers
echo "Vérification des permissions des fichiers..."
if [ -d "backend/public" ]; then
    echo "✅ Répertoire backend/public existe"
    if [ -r "backend/public" ] && [ -w "backend/public" ]; then
        echo "✅ Permissions correctes sur backend/public"
    else
        echo "❌ Problème de permissions sur backend/public"
        echo "   Commande pour corriger: chmod -R 755 backend/public"
    fi
else
    echo "❌ Répertoire backend/public n'existe pas"
    echo "   Vérifiez que le déploiement a été effectué correctement"
fi

echo "Diagnostic terminé."
echo "Pour résoudre l'erreur 502 Bad Gateway, vérifiez les points suivants:"
echo "1. Assurez-vous que MongoDB est installé et en cours d'exécution"
echo "2. Vérifiez que les processus PM2 sont en cours d'exécution"
echo "3. Vérifiez que le port 80 est disponible et que votre application l'utilise"
echo "4. Redémarrez les processus avec: pm2 restart tidash tidash-backend"
