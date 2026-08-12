# Deploying to arctestnet.praneethlabs.com

Everything in the repo is ready (`render.yaml`, `pnpm build` / `pnpm start`
verified locally). The steps below need your own accounts/DNS access — I
can't do these for you.

## 1. Create a Render account & deploy

1. Go to [render.com](https://render.com) and sign up (GitHub OAuth is
   easiest — it also means every future `git push` auto-deploys).
2. **New +** → **Blueprint** → connect the `MrPrince096/arc-pay` GitHub repo.
   Render reads `render.yaml` from the repo root automatically and proposes
   a web service named `praneetharc`.
3. Click through to create it. It'll fail to boot at first — that's
   expected, the Circle credentials aren't set yet (next step).

## 2. Set the secret env vars

In the Render dashboard for the new service → **Environment**, add these
three (copy the exact values from your local `.env` — never commit them):

| Key | Value |
|---|---|
| `CIRCLE_API_KEY` | from your local `.env` |
| `CIRCLE_ENTITY_SECRET` | from your local `.env` |
| `AGENT_WALLET_ADDRESS` | `0xbeb7a819c5c88560d639bbb8d3023dbd5d30ee03` |

**Deliberately do NOT set `AGENT_LIVE_CONFIRM`.** Leaving it unset keeps the
public agent-pays demo dry-run-only for every visitor — this was the
explicit choice made when setting this up. Only set it if you specifically
want the public site to actually move funds.

Save — Render redeploys automatically. Once it's up, confirm the Render-
assigned URL (something like `https://praneetharc.onrender.com`) loads and
the dashboard/swap/mint/sign pages all work.

## 3. Add the custom domain in Render

In the service → **Settings** → **Custom Domains** → **Add Custom Domain** →
enter `arctestnet.praneethlabs.com`. Render will show you the exact CNAME
target to use (usually `<your-service>.onrender.com`, but **use whatever
Render's dashboard actually shows you** — the exact subdomain can vary).

## 4. Add the DNS record in Cloudflare

`praneethlabs.com`'s DNS is on Cloudflare. In the Cloudflare dashboard for
that zone → **DNS** → **Add record**:

| Field | Value |
|---|---|
| Type | `CNAME` |
| Name | `arctestnet` |
| Target | exactly what Render showed you in step 3 |
| Proxy status | **DNS only** (grey cloud, not orange) |

Keep the proxy **off** at first — Render needs to issue its own Let's
Encrypt certificate for the custom domain, and Cloudflare's proxy can
interfere with that verification. You can turn proxying back on afterward
once the cert is confirmed issued in Render's dashboard, if you want
Cloudflare's CDN/protection in front of it.

## 5. Verify

Wait a few minutes for DNS propagation and certificate issuance (Render's
dashboard shows the cert status), then open
`https://arctestnet.praneethlabs.com` — it should load PraneethArc directly,
with a valid TLS certificate.
