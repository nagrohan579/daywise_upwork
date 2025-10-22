# DayWise Deployment Checklist

## Pre-Deployment Requirements

- [ ] GitHub repository with your code
- [ ] DigitalOcean account
- [ ] Vercel account (free)
- [ ] Google Cloud Console project (for OAuth)
- [ ] Stripe account (for payments)
- [ ] SendGrid account (for emails)
- [ ] All API keys and credentials ready

---

## Part 1: DigitalOcean Backend Setup

### 1.1 Create Droplet
- [ ] Create Ubuntu 22.04 droplet ($6/month)
- [ ] Note **Public IP**: `___.___.___.___ `
- [ ] SSH into droplet: `ssh root@YOUR_IP`

### 1.2 Install Dependencies
```bash
# Update system
apt update && apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
apt install -y nodejs

# Install PM2 and Nginx
npm install -g pm2
apt install -y nginx
```

- [ ] Verify Node: `node -v` shows v20.x.x
- [ ] Verify NPM: `npm -v` shows 10.x.x

### 1.3 Clone Repository
```bash
cd /var/www
git clone https://github.com/YOUR_USERNAME/daywise-app.git
cd daywise-app
```

- [ ] Repository cloned successfully

### 1.4 Install Dependencies
```bash
npm install
cd backend
npm install
npm install -g convex
```

- [ ] All dependencies installed

---

## Part 2: Convex Database Setup

### 2.1 Deploy Convex
```bash
cd /var/www/daywise-app
convex deploy --prod
```

- [ ] Convex deployed
- [ ] **CONVEX_URL noted**: `https://__________________.convex.cloud`

---

## Part 3: Backend Configuration

### 3.1 Create .env File
```bash
cd /var/www/daywise-app/backend
nano .env
```

### 3.2 Fill in Environment Variables

```bash
# URLs (update FRONTEND_URL after Vercel deployment)
FRONTEND_URL=https://temporary-placeholder.vercel.app
BASE_URL=http://YOUR_DROPLET_IP
PORT=3000
NODE_ENV=production

# Convex (from Part 2)
CONVEX_URL=https://__________________.convex.cloud

# Security (generate with: openssl rand -base64 32)
SESSION_SECRET=________________________________

# Google OAuth
GOOGLE_CLIENT_ID=________________________________.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=________________________________

# Stripe
STRIPE_SECRET_KEY=sk_live_________________________________
STRIPE_PUBLISHABLE_KEY=pk_live_________________________________
STRIPE_WEBHOOK_SECRET=whsec_________________________________

# SendGrid
SENDGRID_API_KEY=SG.________________________________
SENDGRID_FROM_EMAIL=noreply@yourdomain.com

# Admin
ADMIN_USERNAME=admin
ADMIN_PASSWORD=________________________________
```

- [ ] All environment variables filled
- [ ] Saved with Ctrl+X, Y, Enter

### 3.3 Build and Start Backend
```bash
cd /var/www/daywise-app/backend
npm run build
pm2 start dist/index.js --name daywise-backend
pm2 save
pm2 startup
```

- [ ] Build successful
- [ ] PM2 started
- [ ] Run the command that `pm2 startup` gives you

### 3.4 Test Backend
```bash
curl http://localhost:3000/api/ping
```

- [ ] Returns: `{"message":"pong"}`

### 3.5 Configure Nginx
```bash
nano /etc/nginx/sites-available/daywise
```

Paste this:
```nginx
server {
    listen 80;
    server_name YOUR_DROPLET_IP;
    client_max_body_size 10M;

    location / {
        proxy_pass http://localhost:3000;
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

Enable and start:
```bash
ln -s /etc/nginx/sites-available/daywise /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
```

- [ ] Nginx configured
- [ ] Nginx test passed
- [ ] Nginx restarted

### 3.6 Test from External
From your local machine:
```bash
curl http://YOUR_DROPLET_IP/api/ping
```

- [ ] Returns: `{"message":"pong"}`

---

## Part 4: Google OAuth Setup

### 4.1 Configure Redirect URIs
Go to [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials

Add these **Authorized redirect URIs**:
- [ ] `http://YOUR_DROPLET_IP/api/auth/google/callback`
- [ ] `http://YOUR_DROPLET_IP/api/google-calendar/callback`

---

## Part 5: Vercel Frontend Deployment

### 5.1 Push to GitHub
From your local machine:
```bash
cd /Users/rohannag/Programs/Freelance/Upwork/DayWise\ application/daywise-app
git add .
git commit -m "Production deployment configuration"
git push origin main
```

- [ ] Code pushed to GitHub

### 5.2 Deploy to Vercel
1. Go to [vercel.com](https://vercel.com)
2. Click "New Project"
3. Import your GitHub repository
4. Configure:
   - **Root Directory**: `frontend`
   - **Framework**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

- [ ] Project imported

### 5.3 Add Environment Variables in Vercel

In Vercel → Your Project → Settings → Environment Variables, add:

| Name | Value |
|------|-------|
| `VITE_API_URL` | `http://YOUR_DROPLET_IP` |
| `VITE_CONVEX_URL` | `https://__________________.convex.cloud` |
| `VITE_GOOGLE_CLIENT_ID` | `__________________.apps.googleusercontent.com` |

- [ ] All environment variables added
- [ ] Applied to **Production**, **Preview**, and **Development**

### 5.4 Deploy
- [ ] Click "Deploy"
- [ ] Wait for deployment to complete
- [ ] **Vercel URL noted**: `https://__________________.vercel.app`

---

## Part 6: Final Backend Update

### 6.1 Update FRONTEND_URL
SSH back to droplet:
```bash
ssh root@YOUR_DROPLET_IP
nano /var/www/daywise-app/backend/.env
```

Update this line:
```bash
FRONTEND_URL=https://your-actual-vercel-url.vercel.app
```

- [ ] FRONTEND_URL updated with actual Vercel URL

### 6.2 Restart Backend
```bash
pm2 restart daywise-backend
```

- [ ] Backend restarted

---

## Part 7: Testing

### 7.1 Basic Tests
- [ ] Visit Vercel URL: `https://your-app.vercel.app`
- [ ] Page loads without errors
- [ ] No CORS errors in browser console (F12)

### 7.2 Authentication Tests
- [ ] Can create account with email/password
- [ ] Receive verification email
- [ ] Can verify email
- [ ] Can log in
- [ ] Session persists after refresh

### 7.3 Google OAuth Test
- [ ] "Sign in with Google" button works
- [ ] Redirects to Google login
- [ ] Redirects back successfully
- [ ] User logged in

### 7.4 Feature Tests
- [ ] Can create appointment type
- [ ] Can set availability
- [ ] Can create booking
- [ ] Dashboard loads correctly
- [ ] Settings page works

### 7.5 Payment Test (if applicable)
- [ ] Can access billing page
- [ ] Stripe checkout opens
- [ ] Can complete test payment

---

## Part 8: Post-Deployment

### 8.1 Monitor Logs
```bash
pm2 logs daywise-backend --lines 50
```

- [ ] No critical errors in logs
- [ ] API requests showing up

### 8.2 Setup Monitoring (Optional)
- [ ] Create account on [UptimeRobot](https://uptimerobot.com/)
- [ ] Add monitor for `http://YOUR_DROPLET_IP/api/ping`
- [ ] Add monitor for `https://your-app.vercel.app`

### 8.3 Document Your Setup
Fill this in for future reference:

```
PRODUCTION URLS:
- Frontend: https://__________________.vercel.app
- Backend:  http://__________________
- Convex:   https://__________________.convex.cloud

ADMIN ACCESS:
- URL: https://__________________.vercel.app/admin/login
- Username: ________________
- Password: ________________ (stored securely)

CREDENTIALS USED:
- Google Client ID: __________________.apps.googleusercontent.com
- Stripe Account: __________________ (email)
- SendGrid Account: __________________ (email)
- DigitalOcean Droplet IP: __________________
```

---

## Common Issues & Solutions

### ❌ Frontend can't connect to backend
**Fix:**
```bash
# On droplet:
pm2 logs daywise-backend
# Check for CORS errors
# Verify FRONTEND_URL in .env matches Vercel URL exactly
```

### ❌ Google OAuth fails
**Fix:**
1. Check redirect URIs in Google Console
2. Must include `http://YOUR_IP/api/auth/google/callback`
3. Restart backend: `pm2 restart daywise-backend`

### ❌ Database errors
**Fix:**
```bash
# Verify CONVEX_URL is correct in both:
# 1. backend/.env
# 2. Vercel environment variables
```

### ❌ PM2 process keeps dying
**Fix:**
```bash
pm2 logs daywise-backend --lines 100
# Look for error message
# Usually missing env variable or wrong value
```

### ❌ Nginx not forwarding requests
**Fix:**
```bash
nginx -t  # Test config
systemctl status nginx
systemctl restart nginx
```

---

## Maintenance Commands

### View Backend Logs
```bash
ssh root@YOUR_DROPLET_IP
pm2 logs daywise-backend
```

### Restart Backend
```bash
ssh root@YOUR_DROPLET_IP
pm2 restart daywise-backend
```

### Update Backend Code
```bash
ssh root@YOUR_DROPLET_IP
cd /var/www/daywise-app
git pull origin main
cd backend
npm install
npm run build
pm2 restart daywise-backend
```

### Update Frontend
Just push to GitHub:
```bash
git push origin main
# Vercel auto-deploys
```

### Update Environment Variables
**Backend:**
```bash
ssh root@YOUR_DROPLET_IP
nano /var/www/daywise-app/backend/.env
# Make changes
pm2 restart daywise-backend
```

**Frontend:**
1. Go to Vercel Dashboard
2. Settings → Environment Variables
3. Edit variable
4. Redeploy (or push to GitHub)

---

## Security Checklist

- [ ] Strong `SESSION_SECRET` (32+ random characters)
- [ ] Strong admin password
- [ ] Using live Stripe keys (not test)
- [ ] SSL/HTTPS setup (if using domain)
- [ ] Firewall configured: `ufw allow 22,80,443/tcp`
- [ ] Regular backups scheduled
- [ ] Monitoring setup
- [ ] All default passwords changed

---

## Completion

When all checkboxes are marked:

**🎉 DEPLOYMENT COMPLETE! 🎉**

Your app is now live at:
- **Frontend**: https://your-app.vercel.app
- **Backend**: http://YOUR_DROPLET_IP
- **Admin**: https://your-app.vercel.app/admin/login

Next steps:
1. Test thoroughly
2. Set up domain (optional)
3. Configure SSL (recommended)
4. Share with users!

---

**Need Help?**
- Check `DEPLOYMENT_GUIDE.md` for detailed instructions
- Check `ENVIRONMENT_VARIABLES.md` for variable explanations
- Review backend logs: `pm2 logs daywise-backend`
- Check Vercel deployment logs in dashboard

