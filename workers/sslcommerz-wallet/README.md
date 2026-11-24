# E24 Hisab — SSLCOMMERZ Sandbox Worker

This is a separate Cloudflare Worker. It must not reuse the existing OTP Worker.

## Required Worker secrets / variables

Set these in Cloudflare Worker → Settings → Variables and Secrets:

**Secrets**
- `SSLCOMMERZ_STORE_ID` — Sandbox Store ID
- `SSLCOMMERZ_STORE_PASSWORD` — Sandbox Store Password
- `FIREBASE_SERVICE_ACCOUNT_JSON` — complete Firebase service-account JSON key (keep private)

**Plain-text variables**
- `FIREBASE_API_KEY` — Firebase web API key from the existing E24 Firebase config
- `FIREBASE_PROJECT_ID` — `e24-hisab`
- `ALLOWED_ORIGINS` — `https://mainulru.github.io,null`

The service account must belong to the E24 Firebase project and have permission to read/write Firestore. Prefer a dedicated service account with only the minimum Firestore permissions.

## Routes

- `POST /create-session` — requires Firebase ID token; creates an SSLCOMMERZ Sandbox hosted checkout.
  JSON body: `{"amount":100}`
- `POST /ipn` — public SSLCOMMERZ IPN listener; validates the payment with the official Sandbox validation API before crediting.
- `GET /status?tran_id=...` — requires the same user's Firebase ID token.
- `GET /referral/validate?code=...` — public validity check; returns only a boolean.
- `POST /referral/setup` — requires Firebase ID token; creates the caller's referral code and optionally locks in a valid referring code.
- `GET /referral/profile` — requires Firebase ID token; returns the caller's code and successful referral/bonus totals.

On the first validated successful SMS Wallet recharge by a referred account, the Worker atomically adds ৳5 to the referrer's SMS Wallet and records one reward per referred UID. The same referred account cannot generate another bonus.
- `GET /callback/success|fail|cancel` — customer return pages.

## Important security notes

- Never put Store ID/Password or the service-account JSON in the web page, Android APK, or Git repository.
- Wallet credit is performed only after server-side validation of transaction ID, exact amount, BDT currency, VALID/VALIDATED status, and risk_level 0.
- The Worker records a unique transaction document and uses Firestore update-time preconditions to prevent duplicate credits.
- This source is not yet deployed. Do not enable the frontend until the Worker is deployed, secrets are configured, and Firestore wallet write rules are hardened.
- Sandbox endpoint only; no live-money payment is performed.
