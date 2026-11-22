# E24 Hisab Admin Worker

This is the source for the separate Cloudflare Worker named `e24-hisab-admin`.

## Required Worker secrets / variables

- `FIREBASE_API_KEY` — Text variable from the Firebase web app config.
- `FIREBASE_PROJECT_ID` — Text variable: `e24-hisab`.
- `FIREBASE_SERVICE_ACCOUNT` — Secret containing the complete service-account JSON.

Never commit the service-account JSON, private key, Firebase API key, or any user credentials to GitHub.

## Planned API contract

All protected routes require `Authorization: Bearer <Firebase ID token>`.

- `GET /health` — public health check.
- `GET /admin/me` — returns the caller's server-verified role.
- `GET /admin/users` — lists all users for Full/Main Admin, or only assigned users for Limited Admin.
- `GET /admin/roles` — Main Admin only.
- `PUT /admin/roles` — Main Admin only; body: `{ "uid": "...", "role": "limited|full|none", "managedUsers": ["..."] }`.
- `GET /admin/recharge` — pending recharge requests in the caller's permitted scope.
- `POST /admin/recharge/action` — approve/remove a pending request; body: `{ "uid": "...", "requestId": "...", "action": "approve|remove" }`.
- `DELETE /admin/users/:uid` — Main Admin only; permanently deletes the Firebase Auth user and their Firestore profile/ledger.

## Permission model

| Capability | Limited Admin | Full Admin | Main Admin |
|---|---:|---:|---:|
| Manage assigned users' ledgers | Yes | Yes | Yes |
| View all users | No | Yes | Yes |
| Approve/remove recharge requests | Assigned users | Yes | Yes |
| Create/change Admin roles | No | No | Yes |
| Permanently delete users | No | No | Yes |

The Worker must be deployed separately from the existing payment and OTP Workers. Do not replace or edit those Workers.
