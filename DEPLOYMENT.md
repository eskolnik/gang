# Deployment Guide - Fly.io

This guide walks through deploying The Gang to Fly.io using GitHub Actions for automatic deployments.

## Prerequisites

1. **Fly.io Account**
   - Sign up at https://fly.io
   - Install flyctl CLI: `brew install flyctl` (macOS) or see https://fly.io/docs/hands-on/install-flyctl/
   - Login: `flyctl auth login`

2. **GitHub Repository**
   - Push your code to GitHub
   - Repository should be public or have Fly.io access configured

## Initial Setup

### 1. Create Fly.io App

```bash
# From the project root
flyctl apps create the-gang

# Or use the existing app name from fly.toml
# The app name must be globally unique on Fly.io
```

### 2. Create Persistent Volume for Database

```bash
# Create a 1GB volume in your primary region (change region if needed)
flyctl volumes create the_gang_data --region ewr --size 1
```

### 3. Deploy Manually (First Time)

```bash
# This will build and deploy your app
flyctl deploy

# Monitor the deployment
flyctl logs
```

### 4. Check Deployment

```bash
# Get your app URL
flyctl status

# Open in browser
flyctl open

# Check health
flyctl checks list
```

## GitHub Actions Deployment

### 1. Get Fly.io API Token

```bash
# Generate a deploy token
flyctl tokens create deploy -x 999999h

# Copy the token - you'll need it for GitHub
```

### 2. Add Token to GitHub Secrets

1. Go to your GitHub repository
2. Navigate to Settings → Secrets and variables → Actions
3. Click "New repository secret"
4. Name: `FLY_API_TOKEN`
5. Value: Paste the token from step 1
6. Click "Add secret"

### 3. Create GitHub Actions Workflow

Create `.github/workflows/fly-deploy.yml`:

```yaml
name: Deploy to Fly.io

on:
  push:
    branches:
      - main  # Deploy when pushing to main branch

jobs:
  deploy:
    name: Deploy app
    runs-on: ubuntu-latest
    concurrency:
      group: ${{ github.workflow }}-${{ github.ref }}
      cancel-in-progress: true

    steps:
      - uses: actions/checkout@v4

      - name: Setup Flyctl
        uses: superfly/flyctl-actions/setup-flyctl@master

      - name: Deploy to Fly.io
        run: flyctl deploy --remote-only
        env:
          FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}
```

### 4. Test Automated Deployment

```bash
# Commit and push the workflow file
git add .github/workflows/fly-deploy.yml
git commit -m "Add Fly.io deployment workflow"
git push origin main

# Watch the deployment in GitHub Actions tab
```

## Environment Variables

Set production environment variables:

```bash
# Required (already set in fly.toml)
flyctl secrets set NODE_ENV=production

# Optional: Custom cleanup schedule
flyctl secrets set CLEANUP_CRON="*/5 * * * *"
flyctl secrets set CLEANUP_TIMEZONE="America/New_York"

# View all secrets
flyctl secrets list
```

## Scaling

### Vertical Scaling (More Resources)

```bash
# Scale to larger VM
flyctl scale vm shared-cpu-2x  # 512 MB RAM

# Or even larger
flyctl scale vm dedicated-cpu-1x  # 2 GB RAM, dedicated CPU
```

### Horizontal Scaling (More Instances)

```bash
# Scale to multiple machines (for high availability)
flyctl scale count 2

# Or scale by region
flyctl scale count 2 --region ewr
flyctl scale count 1 --region ord  # Add Chicago region
```

### Increase Volume Size

```bash
# Extend volume to 5GB
flyctl volumes extend <volume-id> --size 5
```

## Monitoring

### View Logs

```bash
# Stream live logs
flyctl logs

# View recent logs
flyctl logs --app the-gang
```

### Monitor Performance

```bash
# Check app status
flyctl status

# View metrics
flyctl dashboard
```

### Health Checks

The app includes a `/health` endpoint that Fly.io monitors:
- Interval: 10 seconds
- Timeout: 2 seconds
- Endpoint: `http://your-app.fly.dev/health`

## Database Backups

### Manual Backup

```bash
# SSH into the machine
flyctl ssh console

# Inside the machine, copy the database
cp /data/game_state.db /tmp/backup.db

# Exit and download locally
exit
flyctl sftp get /tmp/backup.db ./backups/game_state-$(date +%Y%m%d).db
```

### Automated Backups

Consider using:
- Fly.io volumes snapshots (coming soon)
- Litestream for continuous SQLite replication
- Scheduled backup script via cron

## Troubleshooting

### App Won't Start

```bash
# Check logs for errors
flyctl logs

# Check app status
flyctl status

# SSH into machine for debugging
flyctl ssh console
```

### Database Issues

```bash
# Check volume is mounted
flyctl ssh console
ls -la /data

# Check database file permissions
cd /data
ls -la game_state.db
```

### Memory Issues

```bash
# Monitor resource usage
flyctl dashboard

# If OOM, scale up:
flyctl scale vm shared-cpu-2x
```

### Network/WebSocket Issues

```bash
# Verify WebSocket is working
flyctl checks list

# Test health endpoint
curl https://your-app.fly.dev/health
```

## Cost Optimization

- **Shared CPU**: $1.94/month for first machine (256MB)
- **Volume**: $0.15/GB/month
- **Free allowances**:
  - 3 shared-cpu-1x VMs (256MB) with 160GB outbound data transfer
  - First 3GB of volume storage free

**Recommended Setup for MVP:**
- 1 shared-cpu-1x machine (free tier)
- 1GB volume (free tier)
- **Total: $0/month** (within free tier)

## Useful Commands

```bash
# Quick reference
flyctl apps list          # List all apps
flyctl status            # App status
flyctl logs              # View logs
flyctl ssh console       # SSH into machine
flyctl restart           # Restart app
flyctl destroy           # Delete app (careful!)

# Deployment
flyctl deploy            # Deploy changes
flyctl deploy --local-only   # Build locally
flyctl deploy --remote-only  # Build on Fly.io (faster)

# Debugging
flyctl doctor            # Check setup
flyctl ping              # Test connectivity
```

## Next Steps

1. **Custom Domain**: Map a custom domain to your app
2. **SSL**: Automatic via Fly.io
3. **Monitoring**: Set up error tracking (Sentry, etc.)
4. **Backups**: Implement automated database backups
5. **CI/CD**: Expand GitHub Actions for testing before deployment

## Support

- Fly.io Docs: https://fly.io/docs
- Community Forum: https://community.fly.io
- The Gang Issues: https://github.com/yourusername/the_gang/issues
