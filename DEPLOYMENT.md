# Public Deployment & Live Operations Guide — Instagram Agent

> **Complete guide to deploying and using Instagram Agent for public access and real Instagram Graph API publishing.**

---

## 📑 Table of Contents

1. [Architectural Requirements for Public Use](#1-architectural-requirements-for-public-use)
2. [Meta & Instagram Graph API Setup](#2-meta--instagram-graph-api-setup)
3. [Deployment Options](#3-deployment-options)
   - [Option A: Cloud PaaS (Render.com + Vercel) — Recommended](#option-a-cloud-paas-render-backend--vercel-frontend)
   - [Option B: Single Cloud VPS (Docker + Caddy with Automatic SSL)](#option-b-single-cloud-vps-docker-compose--caddy)
   - [Option C: Instant 2-Minute Public Demo (Cloudflare Tunnel / ngrok)](#option-c-instant-2-minute-public-demo-cloudflare-tunnel--ngrok)
4. [Environment Variables Reference](#4-environment-variables-reference)
5. [End-to-End Verification Checklist](#5-end-to-end-verification-checklist)
6. [Troubleshooting & Best Practices](#6-troubleshooting--best-practices)

---

## 1. Architectural Requirements for Public Use

When operating in public live mode, the Instagram Agent communicates with:
1. **OpenAI API**: For GPT-4o caption, hashtag, and CTA generation.
2. **Meta Instagram Graph API**: For uploading media containers and publishing posts.
3. **Instagram's Media Ingestion Servers**: **CRITICAL** — Meta's servers download your uploaded images and videos from your backend via a public HTTPS URL (`PUBLIC_BASE_URL`). 
   - ⚠️ **Instagram's servers cannot reach `localhost` or internal LAN IPs.**
   - Therefore, your backend MUST have a public HTTPS domain.

```
┌──────────────────────────────────────┐
│       User's Browser (Public)        │
└──────────────────┬───────────────────┘
                   │ HTTPS
                   ▼
┌──────────────────────────────────────┐
│  React Frontend (Vercel / CDN / Web) │
└──────────────────┬───────────────────┘
                   │ REST API (HTTPS)
                   ▼
┌──────────────────────────────────────┐        Meta Downloads Image/Video
│        FastAPI Backend API           │◄─────────────────────────────────────┐
│    (Render / Railway / VPS / Tunnel) │                                      │
└───────┬──────────────┬───────────────┘                                      │
        │              │                                                      │
        ▼              ▼                                                      │
 ┌────────────┐ ┌──────────────────────────────────────────────┐              │
 │ OpenAI API │ │ Meta Graph API (graph.facebook.com)          │              │
 │  (GPT-4o)  │ │ 1. POST /media (image_url=PUBLIC_BASE_URL/…) │──────────────┘
 └────────────┘ │ 2. POST /media_publish (creation_id=...)     │
                └──────────────────────────────────────────────┘
```

---

## 2. Meta & Instagram Graph API Setup

To publish to Instagram via API, you must configure a Meta Developer App.

### Step 2.1: Convert Instagram Account to Professional
1. Open Instagram on your mobile device.
2. Go to **Settings & Privacy** → **Account type and tools** → **Switch to professional account**.
3. Select **Business** or **Creator**.
4. Connect it to a **Facebook Page** (create a free Facebook Page if you don't have one).

### Step 2.2: Create a Meta Developer App
1. Go to [developers.facebook.com](https://developers.facebook.com) and log in with your Facebook account.
2. Click **My Apps** → **Create App**.
3. Select **Other** → Click Next.
4. Select **Business** as the App Type → Give it a name (e.g. `Instagram Agent`) → Click **Create App**.
5. In the App Dashboard, find **Instagram Graph API** and click **Set Up**.

### Step 2.3: Generate Access Token
1. In the top navigation, go to **Tools** → **Graph API Explorer**.
2. Under **Meta App**, select your app.
3. Under **User or Page**, select your Facebook Page.
4. Under **Permissions**, add:
   - `instagram_basic`
   - `instagram_content_publish`
   - `pages_show_list`
   - `pages_read_engagement`
5. Click **Generate Access Token** and approve permissions.

### Step 2.4: Find Your Instagram Business Account ID
In Graph API Explorer, submit a `GET` request:
```
me/accounts?fields=instagram_business_account{id,name,username}
```
In the response JSON, copy the `id` under `instagram_business_account`. This is your `INSTAGRAM_BUSINESS_ACCOUNT_ID`.

### Step 2.5: Convert to 60-Day Long-Lived Token
Short-lived tokens expire in ~1 hour. Exchange it for a 60-day token:
1. Open Access Token Tool: `https://developers.facebook.com/tools/accesstoken/`
2. Click **Debug** next to your token.
3. Click **Extend Access Token** at the bottom.
4. Copy the resulting long-lived token into `INSTAGRAM_ACCESS_TOKEN`.
*(For permanent tokens, create a **System User** in Meta Business Manager and generate a token with no expiry).*

---

## 3. Deployment Options

### Option A: Cloud PaaS (Render Backend + Vercel Frontend)

This is the easiest, lowest-cost modern architecture. It provides automatic HTTPS, global CDN, and zero server maintenance.

#### 1. Backend on Render.com
1. Push this repository to GitHub.
2. Sign in to [Render.com](https://render.com).
3. Click **New +** → **Blueprint** → Select your GitHub repository.
4. Render will automatically read [`render.yaml`](file:///c:/Users/akash/OneDrive/Desktop/instagram%20agent/render.yaml).
5. In the environment variables configuration, fill in:
   - `OPENAI_API_KEY`: Your OpenAI key (`sk-proj-...`)
   - `INSTAGRAM_ACCESS_TOKEN`: Your Meta Graph API token
   - `INSTAGRAM_BUSINESS_ACCOUNT_ID`: Your Instagram Business Account ID
   - `PUBLIC_BASE_URL`: Leave blank initially. Once Render provisions your backend URL (e.g. `https://instagram-agent-api.onrender.com`), set `PUBLIC_BASE_URL` to this URL and trigger a re-deploy.
6. Click **Apply**.

#### 2. Frontend on Vercel
1. Sign in to [Vercel.com](https://vercel.com).
2. Click **Add New** → **Project** → Select your GitHub repository.
3. Configure the project:
   - **Root Directory**: `frontend`
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. In **Environment Variables**, add:
   - `VITE_API_URL`: `https://instagram-agent-api.onrender.com` (Your Render backend URL)
5. Click **Deploy**.
6. In your Render backend settings, set `ALLOWED_ORIGINS` to your Vercel URL (e.g. `https://instagram-agent.vercel.app`).

---

### Option B: Single Cloud VPS (Docker Compose + Caddy)

Deploy everything onto a single Ubuntu/Debian VPS (e.g., DigitalOcean $6/mo Droplet, Hetzner, AWS EC2, Linode).

#### 1. Server Prerequisites
On your VPS, install Docker and Git:
```bash
sudo apt update && sudo apt install -y git docker.io docker-compose-plugin
sudo systemctl enable --now docker
```

#### 2. Point Your Domain DNS
Create an `A` record in your DNS provider:
- `agent.yourdomain.com` → Point to your VPS Public IPv4 address.

#### 3. Clone and Configure
```bash
git clone <your-repo-url> /opt/instagram-agent
cd /opt/instagram-agent

# Configure environment variables
cp backend/.env.example backend/.env
nano backend/.env
```
Fill in:
```env
PUBLIC_BASE_URL=https://agent.yourdomain.com
OPENAI_API_KEY=sk-proj-...
INSTAGRAM_ACCESS_TOKEN=EAAB...
INSTAGRAM_BUSINESS_ACCOUNT_ID=178414...
ALLOWED_ORIGINS=https://agent.yourdomain.com
```

#### 4. Launch with Automated SSL
```bash
# Run using the production compose file
PUBLIC_DOMAIN=agent.yourdomain.com docker compose -f docker-compose.prod.yml up -d --build
```
Caddy will automatically request and install a free Let's Encrypt SSL certificate!
Visit `https://agent.yourdomain.com` in your browser.

---

### Option C: Instant 2-Minute Public Demo (Cloudflare Tunnel / ngrok)

If you want to test live publishing with Instagram right now from your existing machine without signing up for cloud hosting:

#### Using Cloudflare Tunnel (Free & No account required)
1. Download `cloudflared` for Windows (or install via `winget install Cloudflare.cloudflared`).
2. Start the Instagram Agent backend locally on port 8000:
   ```powershell
   .\run_api.bat
   ```
3. Open a separate terminal and create a quick tunnel:
   ```bash
   cloudflared tunnel --url http://localhost:8000
   ```
4. Cloudflare will output a public HTTPS URL (e.g., `https://random-words.trycloudflare.com`).
5. Update your `backend/.env`:
   ```env
   PUBLIC_BASE_URL=https://random-words.trycloudflare.com
   ```
6. Start the frontend:
   ```powershell
   launchers\run_frontend.bat
   ```
Instagram's servers can now reach your local uploads via the Cloudflare tunnel URL!

---

## 4. Environment Variables Reference

| Variable | Description | Required | Example |
|---|---|---|---|
| `PUBLIC_BASE_URL` | Public HTTPS domain where backend is reachable. Meta uses this to download images/videos. | **Yes (for Instagram)** | `https://api.yourdomain.com` |
| `OPENAI_API_KEY` | OpenAI API Key for GPT-4o caption & hashtag generation. | **Yes (for AI)** | `sk-proj-...` |
| `OPENAI_MODEL` | Model to use. Default is `gpt-4o`. | No | `gpt-4o` |
| `INSTAGRAM_ACCESS_TOKEN` | Meta Graph API User/System Token with `instagram_content_publish`. | **Yes (for publishing)** | `EAAB...` |
| `INSTAGRAM_BUSINESS_ACCOUNT_ID` | Numeric Instagram Business Account ID. | **Yes (for publishing)** | `17841400000000000` |
| `DATABASE_URL` | Async SQLAlchemy DB string (SQLite or PostgreSQL). | **Yes** | `sqlite+aiosqlite:////app/data/instagram_agent.db` or `postgresql+asyncpg://user:pass@host/db` |
| `ALLOWED_ORIGINS` | Comma-separated list of allowed frontend origins for CORS. | **Yes** | `https://instagram-agent.vercel.app,http://localhost:5173` |
| `UPLOAD_DIR` | Directory where uploaded images/videos are stored. | **Yes** | `./uploads` or `/app/uploads` |
| `SCHEDULER_TIMEZONE` | Timezone for APScheduler automated posts. | No | `UTC` or `America/New_York` |

---

## 5. End-to-End Verification Checklist

Run these quick checks after deploying:

1. **Health Check**:
   - Visit `https://<your-backend-domain>/api/health`
   - Expected: `{"status": "ok", "app": "Instagram Agent", "scheduler": "running"}`
2. **API Configuration Status**:
   - Visit `https://<your-backend-domain>/api/config`
   - Expected: `openai_configured: true`, `instagram_configured: true`
3. **Instagram Connection Test**:
   - On the frontend dashboard, navigate to **Connections** (`/connections`).
   - Click **Test Connection** next to Instagram.
   - Expected: Status changes to green `Connected` and displays your Instagram username.
4. **Media Upload & Public Accessibility Test**:
   - In **Content Studio**, drag & drop an image.
   - Ensure the image preview appears.
   - Right-click the preview image → **Open image in new tab**. Ensure the URL starts with your public HTTPS `PUBLIC_BASE_URL` and loads successfully.
5. **Publish Now Test**:
   - Enter a topic (e.g., `Sunset vibes`), click **Generate Caption**.
   - Click **Publish Now** and confirm.
   - Check the **Activity** tab (`/activity`) to see the confirmed publication and Meta media ID. Check your live Instagram profile to see the new post!

---

## 6. Troubleshooting & Best Practices

- **Error: "Instagram Graph API requires a publicly accessible HTTPS media URL"**:
  - Your `PUBLIC_BASE_URL` is either missing, contains `localhost`, or is using `http://` instead of `https://`. Update `PUBLIC_BASE_URL` to your live domain.
- **Error: "OAuthException: (#100) The image file could not be downloaded"**:
  - Meta attempted to reach `PUBLIC_BASE_URL/api/media/file/<filename>` and received an error (404, 502, or timeout). Verify that visiting that media URL in your browser downloads the image directly.
- **Error: "OAuthException: (#10) Application does not have permission"**:
  - The access token is missing `instagram_content_publish` permission, or the Instagram account is not connected to the Facebook Page selected during token generation.
- **Token Expiration**:
  - Short-lived tokens expire after 1 hour. Follow Step 2.5 to generate a 60-day token or create a System User token.
