# OCCM Chapter Management App - Deployment Guide

## Prerequisites

- Hostinger VPS with Ubuntu 22.04+
- Domain name pointed to your VPS IP
- Supabase project configured

## 1. VPS Initial Setup

SSH into your VPS:
```bash
ssh root@your-vps-ip
```

### Install Node.js 20
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
node -v  # Should show v20.x
```

### Install PM2 & Nginx
```bash
sudo npm install -g pm2
sudo apt-get install -y nginx
```

### Create app directory
```bash
sudo mkdir -p /var/www/occm-app
sudo chown -R $USER:$USER /var/www/occm-app
```

## 2. Clone Repository

```bash
cd /var/www/occm-app
git clone https://github.com/YOUR_USERNAME/occm-chapter-app.git .
```

## 3. Environment Configuration

Create the production environment file:
```bash
nano .env.local
```

Add these variables (replace with your actual values):
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

## 4. Build & Start Application

```bash
# Install dependencies
npm ci

# Build the app
npm run build

# Copy static files to standalone
cp -r public .next/standalone/
cp -r .next/static .next/standalone/.next/

# Start with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup  # Follow the instructions to enable auto-start
```

## 5. Nginx Configuration

Create Nginx config:
```bash
sudo nano /etc/nginx/sites-available/occm-app
```

Add this configuration:
```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/occm-app /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## 6. SSL Certificate (Let's Encrypt)

```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

## 7. Supabase Configuration

### Update Auth Settings

1. Go to your Supabase project → Authentication → URL Configuration
2. Set **Site URL** to: `https://your-domain.com`
3. Add to **Redirect URLs**:
   - `https://your-domain.com/auth/callback`
   - `https://your-domain.com/**`

### Configure Email Templates

1. Go to Authentication → Email Templates
2. Update the **Confirm signup** template's redirect URL to use your domain
3. Update the **Magic Link** template similarly

### Enable SMTP (for reliable emails)

1. Go to Project Settings → Authentication
2. Scroll to SMTP Settings
3. Enable custom SMTP and configure:
   - Host: `smtp.gmail.com` (or your provider)
   - Port: `587`
   - Username: Your email
   - Password: App-specific password

## 8. Google OAuth (if enabled)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Update your OAuth client:
   - Add `https://your-domain.com` to Authorized JavaScript origins
   - Add `https://YOUR_SUPABASE_PROJECT.supabase.co/auth/v1/callback` to Authorized redirect URIs

## Deployment Updates

For future updates, simply run:
```bash
cd /var/www/occm-app
./scripts/deploy.sh
```

Or manually:
```bash
git pull origin main
npm ci
npm run build
cp -r public .next/standalone/
cp -r .next/static .next/standalone/.next/
pm2 restart occm-app
```

## Monitoring

```bash
# View logs
pm2 logs occm-app

# Monitor resources
pm2 monit

# Check status
pm2 status
```

## Troubleshooting

### App not starting
```bash
pm2 logs occm-app --lines 50
```

### 502 Bad Gateway
- Check if the app is running: `pm2 status`
- Check Nginx config: `sudo nginx -t`
- Check firewall: `sudo ufw status`

### Emails not sending
- Verify Supabase SMTP settings
- Check spam folder
- Use custom SMTP for production
