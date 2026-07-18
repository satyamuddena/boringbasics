# Hostinger VPS deployment

This app needs a normal server because it stores its SQLite database and uploaded images on disk. Hostinger KVM 1 with Coolify is suitable.

## Before you start

- A Hostinger VPS running Ubuntu 22.04 or 24.04.
- SSH access as `root`.
- A GitHub repository containing this project.
- A domain name (buy one from Hostinger or use one you already own).

## 1. Prepare the VPS

In Hostinger's firewall, allow these inbound ports:

- `22` for SSH
- `80` for the website
- `443` for secure HTTPS traffic
- `8000` temporarily, to open the Coolify dashboard

Connect to the VPS:

```bash
ssh root@YOUR_SERVER_IP
```

Install Coolify:

```bash
curl -fsSL https://cdn.coollabs.io/coolify/install.sh | sudo bash
```

Open `http://YOUR_SERVER_IP:8000` in a browser and create the Coolify admin account.

## 2. Connect the app repository

In Coolify:

1. Choose **This Machine** as the server.
2. Create a GitHub App using **Automated Installation**.
3. Authorize it in GitHub and grant access to this repository.
4. Create a project, then choose **Add Resource → Application**.
5. Select the repository and the `main` branch.
6. Use these settings:

   - Build Pack: **Dockerfile**
   - Base Directory: `/`
   - Port: `3000`
   - Static site: **off**

## 3. Add permanent app storage

Run this on the VPS once:

```bash
mkdir -p /data/boring-basics
chown -R 1000:1000 /data/boring-basics
```

In Coolify → **Persistent Storage** → **Add → Directory Mount**, set:

```text
Source:      /data/boring-basics
Destination: /data
```

This directory contains the live database and uploaded images. Do not delete it.

## 4. Add environment variables

In Coolify → **Environment Variables**, add:

```text
DATA_DIR=/data
ADMIN_EMAIL=your-email@example.com
ADMIN_PASSWORD=use-a-long-unique-password
NEXT_PUBLIC_SITE_URL=https://yourdomain.com
```

Keep the password private. Add SMTP, Razorpay, Calendly, or Twilio variables later only when those integrations are needed.

## 5. Connect the domain

Buy a domain, or open DNS settings at the provider where it is registered. Add:

```text
Type   Name   Value
A      @      YOUR_SERVER_IP
A      www    YOUR_SERVER_IP
```

Remove conflicting `A`, `AAAA`, or `CNAME` records for `@` and `www`. DNS normally takes a few minutes, but may take up to 24 hours.

In Coolify → **General → Domains**, set:

```text
https://yourdomain.com
https://www.yourdomain.com
```

Save and deploy. Coolify creates the HTTPS certificate automatically. Do not use the temporary HTTP `sslip.io` address for admin use: modern browsers reject this app's secure login cookie on HTTP.

## 6. Deploy and verify

1. In Coolify, open **Deployments** and click **Deploy**.
2. Wait for a successful deployment.
3. Visit `https://yourdomain.com`.
4. Sign in at `https://yourdomain.com/admin` with `ADMIN_EMAIL` and `ADMIN_PASSWORD`.

## Backups

Back up `/data/boring-basics` at least weekly. It is the only copy of the SQLite database and uploaded images.
