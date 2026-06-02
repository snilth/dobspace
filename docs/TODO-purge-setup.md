# Purge Notifications — Setup Pending

Auto-deletion of dismissed notifications runs weekly via GitHub Actions.
The workflow is ready but requires secrets to be configured before it will work.

## Status: NOT CONFIGURED

### 1. Generate a PURGE_SECRET

Use any random string generator, e.g.:

```bash
openssl rand -hex 32
```

### 2. Add to Railway (production env)

In Railway → your service → Variables:

```
PURGE_SECRET=<your-random-string>
```

### 3. Add to GitHub repo secrets

In GitHub → repo → Settings → Secrets and variables → Actions → New repository secret:

| Name | Value |
|---|---|
| `APP_URL` | `https://dobspace-production.up.railway.app` |
| `PURGE_SECRET` | same value as Railway |

### 4. Verify

After setting secrets, trigger manually:
GitHub → Actions → "Purge dismissed notifications" → Run workflow

Expected response: `{"deleted": N, "cutoff": "..."}` with HTTP 200.

---

**Behavior once configured:**
- Runs every Sunday at 2am UTC
- Hard-deletes notifications where `dismissed = true` AND `dismissedAt` older than 30 days
- Dismissed but recent notifications are kept for 30 days (available in workspace backup export)
