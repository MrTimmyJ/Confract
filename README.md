# Confract — AI Knowledge Consolidation Engine

Self-hosted. No external API. No per-request cost. No user accounts.

## Structure

```
confract/
├── server.js       ← Express backend (change port here)
├── engine.js       ← AI engine (HuggingFace transformer)
├── package.json
└── public/         ← everything served to the browser
    ├── index.html  ← landing page
    ├── confract.html ← the app
    ├── style.css   ← shared styles
    └── script.js   ← app JavaScript
```

---

## Run locally

```bash
npm install
node server.js
```

- Landing page: http://localhost:3002
- App:          http://localhost:3002/confract.html
- Health check: http://localhost:3002/api/health

**First run** downloads the AI model once (~25MB). Cached locally after that.

---

## Change the port

Open `server.js`, line 9:
```js
const PORT = process.env.PORT || 3002;  // ← change this number
```
Also update `script.js`, line 2:
```js
? 'http://localhost:3002/api'           // ← match it here
```

---

## Deploy to your Linux VM

```bash
# Copy files to server (or git clone)
scp -r confract/ user@your-server-ip:~/confract

# SSH in and install
ssh user@your-server-ip
cd confract
npm install

# Install PM2 to keep it alive
npm install -g pm2
pm2 start server.js --name confract
pm2 save
pm2 startup    # prints a command — run that command to auto-start on reboot
```

**Optional: nginx on port 80**
```nginx
# /etc/nginx/sites-available/confract
server {
    listen 80;
    server_name your-domain.com;   # or your server IP

    location / {
        proxy_pass http://localhost:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
    }
}
```
```bash
ln -s /etc/nginx/sites-available/confract /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
```

---

## Deploy to Railway (easiest, free tier)

1. Push to GitHub
2. railway.app → New Project → Deploy from GitHub repo
3. Set `PORT` env var to `3002` (or Railway assigns one automatically)
4. Done — live HTTPS URL in ~2 minutes

---

## Running alongside your book recommender

If your book recommender is on port 3001 and Confract is on 3002, both run fine simultaneously:

```bash
pm2 start recommender/app.py --interpreter python3 --name bookrec
pm2 start confract/server.js --name confract
pm2 list   # see both running
```

---

## API

```
POST /api/process    body: { input: "raw text", existingDoc: null | docObject }
POST /api/detect     body: { input: "raw text", docs: [...] }
GET  /api/health
```
