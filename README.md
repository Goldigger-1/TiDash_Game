# TiDash Game

Un mini-jeu Telegram où vous contrôlez un petit carré qui avance sur une route infinie avec des virages. Tapez pour tourner et évitez de tomber de la route!

## Gameplay
- Vous contrôlez un **petit carré** qui avance sur une **route infinie avec des virages à droite/gauche**
- **Tapez** une fois pour tourner. Rater un virage = fin de la partie
- Le jeu accélère progressivement
- Objectif : aller **le plus loin possible** sans chuter
- À chaque virage réussi → +1 point

## Prérequis
- Node.js (v14 ou supérieur)
- npm
- PM2 (pour la gestion des processus)
- Un bot Telegram (créé via @BotFather)

## Déploiement sur votre VPS

### 1. Configuration des variables d'environnement

Modifiez le fichier `.env` pour y mettre vos informations :

```
# Configuration du bot Telegram
TELEGRAM_BOT_TOKEN=votre_token_telegram

# URL de votre WebApp (remplacez par l'URL de votre VPS)
WEBAPP_URL=https://votre-domaine-ou-ip-vps.com

# Configuration du serveur backend
PORT=3000
```

### 2. Installation et démarrage

Utilisez le script de déploiement fourni :

```bash
chmod +x deploy.sh
./deploy.sh
```

Ou suivez ces étapes manuellement :

1. Installez les dépendances :
   ```bash
   npm install
   cd backend
   npm install
   cd ..
   ```

2. Copiez les fichiers du frontend vers le backend :
   ```bash
   mkdir -p backend/public
   cp -r frontend/public/* backend/public/
   ```

3. Démarrez les services avec PM2 :
   ```bash
   pm2 start index.js --name "tidash"
   cd backend
   pm2 start src/index.js --name "tidash-backend"
   ```

### 3. Vérification du déploiement

- Vérifiez que le bot Telegram répond : `/start`
- Vérifiez que le bouton "Jouer" ouvre le jeu : `/play`
- Vérifiez que les scores sont enregistrés : `/scores`

## Résolution des problèmes

Si le bouton Start n'affiche que "Bienvenue sur TiDash Game" sans les instructions complètes :

1. Vérifiez que vous utilisez la dernière version du code :
   ```bash
   git pull
   ```

2. Vérifiez que les deux services sont en cours d'exécution :
   ```bash
   pm2 status
   ```

3. Vérifiez les logs pour détecter d'éventuelles erreurs :
   ```bash
   pm2 logs tidash
   pm2 logs tidash-backend
   ```

4. Assurez-vous que l'URL WEBAPP_URL dans le fichier .env pointe vers votre serveur VPS et non vers localhost.

5. Redémarrez les services :
   ```bash
   pm2 restart tidash
   pm2 restart tidash-backend
   ```

## Commandes du bot Telegram

- `/start` - Démarrer le bot et afficher les instructions
- `/play` - Lancer le jeu
- `/scores` - Voir les meilleurs scores
- `/help` - Afficher l'aide
