# TiDash Game

Application de jeu Telegram avec interface web.

## Prerequisites

- Node.js v14 or higher
- npm v6 or higher

## Installation

1. Clone the repository:
```bash
git clone https://github.com/Goldigger-1/TiDash_Game.git
cd TiDash_Game
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
Create a `.env` file with the following content:
```
TELEGRAM_BOT_TOKEN=your_telegram_token
WEBAPP_URL=https://your_domain.com
PORT=3000
```

4. Start the application:
```bash
node index.js
```

## Deployment on a server

### Server configuration

1. Install Node.js v14 or higher:
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
```

2. Install PM2 for process management:
```bash
sudo npm install -g pm2
```

3. Configure Nginx as a reverse proxy:
```bash
sudo apt install -y nginx
```

Create a Nginx configuration file:
```bash
sudo nano /etc/nginx/sites-available/tidash
```

Add this configuration:
```nginx
server {
    listen 80;
    server_name your_domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/tidash /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

4. Configure HTTPS with Let's Encrypt:
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your_domain.com
```

5. Start the application with PM2:
```bash
cd ~/tidash
pm2 start index.js --name tidash
pm2 save
sudo pm2 startup
```

## Dependencies

- telegraf: ^4.12.2
- express: ^4.18.2
- dotenv: ^16.0.3
