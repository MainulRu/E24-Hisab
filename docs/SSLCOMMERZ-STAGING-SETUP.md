# E24 Hisab — isolated SSLCOMMERZ Sandbox setup

This setup is deliberately separate from production. It creates two distinct Cloudflare Worker names and requires a dedicated Firebase staging project. The existing production Workers, production Firebase project, Firestore data, and live payment credentials must not be used or changed.

## 1. Create a dedicated Firebase staging project

Create a new Firebase project (for example, `e24-hisab-staging`). Do not use the production project `e24-hisab`.

In the staging project:
1. Enable Authentication with the same sign-in provider needed for the test account.
2. Create a dedicated test user and verify its email.
3. Enable Cloud Firestore.
4. Create a test user's `users/{uid}` profile with at least `name` and a valid Bangladesh `mobile` (01[3-9]XXXXXXXX).
5. Create `users/{uid}/data/main` with `smsWalletBalance: 0`, `smsWalletTransactions: []`, and `smsHistory: []`.
6. Create an `adminRoles/{uid}` record only if you intend to test Admin Worker authorization. Use a separate staging admin account.

Use the staging project's Web API key in the two staging Wrangler configs. Replace both occurrences of `REPLACE_WITH_STAGING_FIREBASE_PROJECT_ID` and `REPLACE_WITH_STAGING_FIREBASE_WEB_API_KEY`. Do not put production values here.

## 2. Create a staging service account

Create a service account in the staging Google Cloud project, not production. Grant only the permissions needed for the staging tests:
- Firestore access: `roles/datastore.user`.
- If testing Admin Worker user deletion, additionally grant the Firebase Authentication Admin permission required for deleting staging Auth users.

Create a JSON key securely. Never commit it or paste it into ChatGPT, GitHub files, or chat.

## 3. Set Cloudflare staging secrets

In Cloudflare Dashboard, open **Workers & Pages** and select each staging Worker after it has been deployed once (or use Wrangler secret commands from the repository root).

For `e24-sms-wallet-payment-staging`, add these secrets:
- `FIREBASE_SERVICE_ACCOUNT_JSON` — the complete staging service-account JSON.
- `SSLCOMMERZ_STORE_ID` — the SSLCOMMERZ Sandbox Store ID.
- `SSLCOMMERZ_STORE_PASSWORD` — the SSLCOMMERZ Sandbox Store Password.

For `e24-hisab-admin-staging`, add:
- `FIREBASE_SERVICE_ACCOUNT` — the complete staging service-account JSON.

The two service-account secret names differ because the existing Worker source expects different names. Do not set any `SSLCOMMERZ_LIVE_*` secrets on the staging Worker.

Wrangler alternative (run from repository root; it will prompt for each secret):
```sh
npx wrangler secret put FIREBASE_SERVICE_ACCOUNT_JSON --config workers/sslcommerz-wallet/wrangler.staging.toml
npx wrangler secret put SSLCOMMERZ_STORE_ID --config workers/sslcommerz-wallet/wrangler.staging.toml
npx wrangler secret put SSLCOMMERZ_STORE_PASSWORD --config workers/sslcommerz-wallet/wrangler.staging.toml
npx wrangler secret put FIREBASE_SERVICE_ACCOUNT --config cloudflare/e24-hisab-admin/wrangler.staging.toml
```

## 4. Deploy staging Workers only

After replacing the Firebase placeholders and setting all secrets, deploy only these configs:

```sh
npx wrangler deploy --config workers/sslcommerz-wallet/wrangler.staging.toml
npx wrangler deploy --config cloudflare/e24-hisab-admin/wrangler.staging.toml
```

These commands target the staging Worker names in the staging configs. Do not use the production `wrangler.toml` files for this test.

## 5. Test plan

1. Confirm the Admin Worker `/health` reports all required configuration values as present.
2. Sign in using only the dedicated staging Firebase test account and obtain its Firebase ID token.
3. Call the payment staging Worker `POST /create-session` with that token and a small Sandbox amount (minimum BDT 10).
4. Complete the payment only with SSLCOMMERZ-provided Sandbox test credentials.
5. Confirm the callback/IPN validates the transaction and updates only the staging test user's wallet.
6. Call `GET /status?tran_id=...` with the same test user's token. Verify idempotency by confirming a repeated IPN does not credit twice.
7. Check the staging Firestore payment session and wallet ledger. Never use a real customer's account.

## Safety boundaries

- These files do not deploy Workers and do not create a Firebase project or credentials.
- The staging Firebase project must be created and populated before deployment. The placeholder project ID intentionally prevents accidentally using production.
- Never copy production user records, service-account keys, SSLCOMMERZ live credentials, or production API secrets into staging.
- A successful mocked CI test is not proof of a real SSLCOMMERZ Sandbox transaction.
- The existing production Workers and production Firebase data remain untouched by this setup.
