# Production Deployment Guide

Deploy AdReX.LK Invoice to **https://invoice.hexalyte.com** on the Hexalyte VPS.

## Prerequisites

- Ubuntu VPS with Docker and Docker Compose plugin
- Existing IMS stack at `/root/hexalyte-main-ims` (nginx reverse proxy)
- DNS `invoice.hexalyte.com` → server IP (`89.167.69.58`)
- Root SSH access

## First-time setup (server)

SSH into the server:

```bash
ssh root@89.167.69.58
```

Run one command:

```bash
curl -fsSL https://raw.githubusercontent.com/AkilaEranda8/AdReX.LK/main/deploy/server-setup.sh | bash
```

Or manually:

```bash
git clone https://github.com/AkilaEranda8/AdReX.LK.git /root/adrex-invoice
cd /root/adrex-invoice
cp deploy/production.env.example .env
# Edit .env — set JWT_SECRET and optional SMTP
bash deploy/server-setup.sh
```

## Update after code changes

On the server:

```bash
cd /root/adrex-invoice
bash deploy/update.sh
```

## Automatic deploy (GitHub Actions)

Add these **repository secrets** in GitHub → Settings → Secrets → Actions:

| Secret | Value |
|--------|-------|
| `SSH_HOST` | `89.167.69.58` |
| `SSH_USER` | `root` |
| `SSH_PRIVATE_KEY` | Your private SSH key (PEM) |
| `SSH_PORT` | `22` (optional) |

Create a **production** environment in GitHub (Settings → Environments) if you want approval gates.

After secrets are set, every push to `main` runs `deploy/update.sh` on the server.

## Useful commands

```bash
# App logs
docker logs -f adrex-invoice-app

# Restart app only
cd /root/adrex-invoice
docker compose -f docker-compose.prod.yml up -d --build

# Wipe all data (careful!)
bash deploy/wipe-data.sh
```

## Default login

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@adrexlk.com | admin123 |

Change the admin password after first login.

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `ims-network` not found | Start IMS stack first: `cd /root/hexalyte-main-ims && docker compose up -d` |
| SSL certificate fails | Ensure port 80 is open and DNS points to this server |
| App not loading | `docker logs adrex-invoice-app` |
| 502 from nginx | Check container: `docker ps \| grep adrex` |
