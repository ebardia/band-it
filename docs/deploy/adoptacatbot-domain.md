# adoptacatbot.com — point DreamHost DNS to Railway (production)

| Field | Value |
|-------|--------|
| **Registrar / DNS** | DreamHost (adoptacatbot.com) |
| **App host** | Railway (same deployment as banditeco.com) |
| **Production branch** | `main` → Railway production services |
| **Staging branch** | `pre-profile-baseline` → Railway staging |

`banditeco.com` already serves the Railway web app (`Server: railway-hikari`). This doc adds **adoptacatbot.com** as a second custom domain on the **same** Railway web service.

---

## Overview

```text
User → adoptacatbot.com (DreamHost DNS)
         → Railway web service (Next.js apps/web)
              → Railway API (apps/api)
```

You need **two places**: Railway (accept the domain) + DreamHost (point DNS).

---

## Step 1 — Railway: add custom domain (web service)

1. Open [railway.app](https://railway.app) → **production** project → **Web** service (the one that serves banditeco.com today).
2. **Settings → Networking → Custom Domain**.
3. Add:
   - `adoptacatbot.com`
   - `www.adoptacatbot.com`
4. Railway shows **DNS records** to create (copy them exactly — do not guess).

Typical pattern:

| Host | Type | Value (from Railway) |
|------|------|----------------------|
| `@` | CNAME or A/AAAA | Railway-provided target |
| `www` | CNAME | `*.up.railway.app` or edge hostname Railway shows |

Wait until Railway shows the domain as **Active** / certificate issued (often 5–30 minutes after DNS propagates).

---

## Step 2 — DreamHost: DNS records

1. [Panel](https://panel.dreamhost.com) → **Manage Domains**.
2. Click **adoptacatbot.com** → **DNS** (or **Manage DNS**).
3. If the domain is **Fully Hosted** on DreamHost web space, switch to **DNS only** (or remove conflicting A records for `@` and `www` that point to DreamHost shared hosting).
4. Add the records Railway gave you in Step 1.
5. Remove stale records that conflict (old A `@` → DreamHost parking IP, etc.).

**Do not** use DreamHost “Mirroring” to banditeco.com if you want TLS and a clean custom domain — use Railway custom domain + DNS instead.

### Verify DNS (from your machine)

```powershell
nslookup adoptacatbot.com
nslookup www.adoptacatbot.com
curl.exe -sI https://adoptacatbot.com
```

Expect `Server: railway-hikari` or `railway-edge` in response headers when live.

---

## Step 3 — Railway: API environment variables

On the **API** service (production), set or update:

| Variable | Value |
|----------|--------|
| `FRONTEND_URL` | `https://adoptacatbot.com` |

Email links, Stripe return URLs, and digests use `FRONTEND_URL`. Redeploy API after changing.

Web service (optional, recommended):

| Variable | Value |
|----------|--------|
| `NEXT_PUBLIC_SITE_URL` | `https://adoptacatbot.com` |

(`NEXT_PUBLIC_API_URL` stays your existing Railway API URL — no change unless you add a custom API subdomain later.)

---

## Step 4 — banditeco.com (optional, later)

After adoptacatbot.com is stable:

- Keep **banditeco.com** on the same Railway service (both domains work), **or**
- Add a redirect at DreamHost/Railway from banditeco.com → adoptacatbot.com.

For the Reddit API submission, either domain can prove the product exists; **adoptacatbot.com** is the canonical name going forward.

---

## Fast fallback (Reddit form deadline only)

If DNS is not propagated yet, you can temporarily set DreamHost **Redirect** (Manage Domains → Redirect):

- **Redirect** `adoptacatbot.com` → `https://banditeco.com`

Replace with proper Railway custom domain (Steps 1–2) as soon as possible so the URL bar shows adoptacatbot.com.

---

## Code defaults

Repo fallbacks use `https://adoptacatbot.com` where production URL was hardcoded as banditeco.com. Production still relies on **`FRONTEND_URL`** in Railway for emails and billing redirects.

---

## Release workflow (after DNS works)

Per `.cursor/rules/coderabbit-review-flow.mdc`:

1. Merge domain/code changes to `pre-profile-baseline`.
2. Open PR `pre-profile-baseline` → `main`.
3. `@coderabbitai full review` → fix → merge → verify production deploy.

---

## Reddit API form

Use in “link to platform”:

```text
https://adoptacatbot.com
```

If DNS is still propagating, note: “Domain registered; DNS pointing to production app (Railway).”
