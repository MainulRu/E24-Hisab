# E24 Hisab Admin Worker

This is the source for the separate Cloudflare Worker named `e24-hisab-admin`.

## Required Worker variables / secret

- `FIREBASE_API_KEY` — public Firebase web-app config key; declared in `wrangler.toml`.
- `FIREBASE_PROJECT_ID` — Text variable: `e24-hisab`.
- `FIREBASE_SERVICE_ACCOUNT` — encrypted Secret containing the complete service-account JSON.

Never commit the service-account JSON, private key, or any user credentials to GitHub. The Firebase web API key is a public client configuration value; access control is enforced by Firebase Authentication, Firestore Rules, and this Worker.

## API routes

All protected routes require `Authorization: Bearer <Firebase ID token>`.

- `GET /health` — public health check.
- `GET /admin/me` — returns the caller's server-verified role.
- `GET /admin/users` — lists users for Full/Main Admin only; Limited Admin is denied.
- `GET /admin/roles` — Main Admin only.
- `PUT /admin/roles` — Main Admin only; body: `{ "uid": "...", "role": "limited|full|none", "managedUsers": ["..."] }`.
- `GET /admin/recharge` — pending recharge requests in the caller's permitted scope.
- `POST /admin/recharge/action` — Limited Admin can approve only; Full/Main Admin can approve or cancel. Body: `{ "uid": "...", "requestId": "...", "action": "approve|cancel" }`.
- `DELETE /admin/users/:uid` — Main Admin only; permanently deletes the Firebase Auth user and their Firestore profile/ledger.

When an Admin approves a user's first SMS Wallet recharge request, the Worker atomically adds a one-time ৳5 SMS Wallet referral bonus to the referring account (if the account was registered with a valid referral code). The reward is idempotent per referred user.

## Permission model

| Capability | Limited Admin | Full Admin | Main Admin |
|---|---:|---:|---:|
| Read or modify another user's profile/ledger/history | No | Yes | Yes |
| View pending recharge requests | Yes | Yes | Yes |
| Approve pending recharge requests | Yes | Yes | Yes |
| Cancel pending recharge requests | No | Yes | Yes |
| Create/change Admin roles | No | No | Yes |
| Permanently delete users | No | No | Yes |

Limited Admin has no direct Firestore access to another user's profile or ledger. The Admin Worker uses its service account internally to locate pending recharge requests and applies an approval only after validating that the request is still pending. It never returns wallet transaction history or SMS history to Limited Admin.

The Worker and Firestore Rules must be deployed separately from the existing payment and OTP Workers. Do not replace or edit those Workers.


## Deploy this Worker

From the repository root, run:

```powershell
npx wrangler deploy --config cloudflare/e24-hisab-admin/wrangler.toml
```

The Worker name is `e24-hisab-admin`. Keep the existing encrypted `FIREBASE_SERVICE_ACCOUNT` secret in Cloudflare. After deployment, check `https://e24-hisab-admin.ah0788767.workers.dev/health` and confirm it returns `success: true`. Do not deploy or modify the separate OTP or payment Workers.

The Android WebView may send an opaque `null` Origin; the Worker permits that origin only for requests that still pass Firebase ID-token authentication.
