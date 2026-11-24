import { after, test } from "node:test";
import assert from "node:assert/strict";
import adminWorker from "../cloudflare/e24-hisab-admin/src/index.js";
import paymentWorker from "../workers/sslcommerz-wallet/index.js";

const adminEnv = {
  FIREBASE_API_KEY: "test-api-key",
  FIREBASE_PROJECT_ID: "demo-e24-hisab",
  ALLOWED_ORIGINS: "http://localhost:5500,http://127.0.0.1:5500",
  FIREBASE_SERVICE_ACCOUNT: JSON.stringify({
    client_email: "emulator@test-project.iam.gserviceaccount.com",
    private_key: "-----BEGIN PRIVATE KEY-----\\nAA==\\n-----END PRIVATE KEY-----"
  })
};
const paymentEnv = {
  FIREBASE_API_KEY: "test-api-key",
  FIREBASE_PROJECT_ID: "demo-e24-hisab",
  FIREBASE_SERVICE_ACCOUNT: adminEnv.FIREBASE_SERVICE_ACCOUNT,
  SSLCOMMERZ_MODE: "SANDBOX",
  SSLCOMMERZ_SANDBOX_STORE_ID: "sandbox-store",
  SSLCOMMERZ_SANDBOX_STORE_PASSWORD: "sandbox-password"
};

function req(path, { method = "GET", headers = {}, body } = {}) {
  return new Request("https://worker.test" + path, {
    method,
    headers,
    body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body)
  });
}
async function json(response) {
  return response.json();
}

test("Admin Worker rejects protected requests without a bearer token", async () => {
  const response = await adminWorker.fetch(req("/admin/me"), adminEnv);
  assert.equal(response.status, 401);
  assert.equal((await json(response)).error, "AUTH_REQUIRED");
});

test("Admin Worker rejects unauthenticated recharge creation before touching Firestore", async () => {
  const response = await adminWorker.fetch(req("/wallet/recharge", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: { amount: 100, paymentMethod: "bKash", transactionId: "ABCD12345" }
  }), adminEnv);
  assert.equal(response.status, 401);
  assert.equal((await json(response)).error, "AUTH_REQUIRED");
});

test("Admin Worker enforces configured environment before protected operations", async () => {
  const response = await adminWorker.fetch(req("/admin/me"), {});
  assert.equal(response.status, 500);
  assert.equal((await json(response)).error, "WORKER_CONFIG_MISSING");
});

test("Admin Worker handles CORS preflight without authentication", async () => {
  const response = await adminWorker.fetch(req("/wallet/recharge", {
    method: "OPTIONS",
    headers: { Origin: "http://localhost:5500" }
  }), adminEnv);
  assert.equal(response.status, 204);
  assert.ok(response.headers.get("access-control-allow-methods")?.includes("POST"));
});

test("Payment Worker rejects protected status requests without a bearer token", async () => {
  const response = await paymentWorker.fetch(req("/status?tran_id=E24SABC123456789"), paymentEnv);
  assert.equal(response.status, 401);
  assert.equal((await json(response)).error, "AUTH_REQUIRED");
});

test("Payment Worker rejects malformed IPN transaction references without external calls", async () => {
  const response = await paymentWorker.fetch(req("/ipn", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: "status=VALID&val_id=TEST123&tran_id=BAD"
  }), paymentEnv);
  assert.equal(response.status, 400);
  assert.equal((await json(response)).error, "INVALID_PAYMENT_REFERENCE");
});

test("Payment Worker ignores non-VALID IPN statuses without crediting", async () => {
  const response = await paymentWorker.fetch(req("/ipn", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: "status=FAILED&val_id=TEST123&tran_id=E24SABC123456789"
  }), paymentEnv);
  assert.equal(response.status, 200);
  assert.equal((await json(response)).status, "IGNORED_NON_VALID_STATUS");
});

test("Payment Worker rejects unknown routes", async () => {
  const response = await paymentWorker.fetch(req("/not-a-route"), paymentEnv);
  assert.equal(response.status, 404);
  assert.equal((await json(response)).error, "NOT_FOUND");
});
