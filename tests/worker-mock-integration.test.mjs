import { test } from "node:test";
import assert from "node:assert/strict";
import adminWorker from "../cloudflare/e24-hisab-admin/src/index.js";
import paymentWorker from "../workers/sslcommerz-wallet/index.js";

const PROJECT = "demo-e24-hisab";
const MAIN_UID = "exITNpwyRNaWpoMWpW6BgMcMGbf2";
const docs = new Map();
let commits = [];
let revision = 1;

function encode(v) {
  if (v === null) return { nullValue: null };
  if (typeof v === "string") return { stringValue: v };
  if (typeof v === "boolean") return { booleanValue: v };
  if (typeof v === "number") return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(encode) } };
  return { mapValue: { fields: Object.fromEntries(Object.entries(v).map(([k,x]) => [k,encode(x)])) } };
}
function decode(v) {
  if (!v) return null;
  if ("stringValue" in v) return v.stringValue;
  if ("integerValue" in v) return Number(v.integerValue);
  if ("doubleValue" in v) return Number(v.doubleValue);
  if ("booleanValue" in v) return v.booleanValue;
  if ("arrayValue" in v) return (v.arrayValue.values || []).map(decode);
  if ("mapValue" in v) return Object.fromEntries(Object.entries(v.mapValue.fields || {}).map(([k,x]) => [k,decode(x)]));
  return null;
}
function docName(path) {
  return `projects/${PROJECT}/databases/(default)/documents/${path}`;
}
function seed(path, value) {
  docs.set(path, { name: docName(path), fields: Object.fromEntries(Object.entries(value).map(([k,v]) => [k,encode(v)])), updateTime: `rev-${revision++}` });
}
function applyCommit(body) {
  for (const w of body.writes || []) {
    const name = w.update?.name || w.delete;
    const path = name.split("/documents/")[1];
    const current = docs.get(path);
    if (w.currentDocument?.exists === false && current) return false;
    if (w.currentDocument?.updateTime && current?.updateTime !== w.currentDocument.updateTime) return false;
  }
  for (const w of body.writes || []) {
    const name = w.update?.name || w.delete;
    const path = name.split("/documents/")[1];
    if (w.delete) { docs.delete(path); continue; }
    const prior = docs.get(path);
    const fields = { ...(prior?.fields || {}) };
    const mask = w.updateMask?.fieldPaths;
    for (const [k,v] of Object.entries(w.update.fields || {})) if (!mask || mask.includes(k)) fields[k] = v;
    docs.set(path, { name, fields, updateTime: `rev-${revision++}` });
  }
  return true;
}
function firestorePath(url) {
  return decodeURIComponent(url.pathname.split("/documents/")[1] || "").replace(/^\//,"");
}
function installFetch(t, { uid = MAIN_UID, email = "mainul.ru.ac.bd@gmail.com", verified = true, onGateway } = {}) {
  docs.clear(); commits = []; revision = 1;
  t.mock.method(globalThis, "fetch", async (input, init = {}) => {
    const url = new URL(typeof input === "string" ? input : input.url);
    if (url.hostname === "identitytoolkit.googleapis.com") {
      return Response.json({ users: [{ localId: uid, email, emailVerified: verified, disabled: false }] });
    }
    if (url.hostname === "oauth2.googleapis.com") return Response.json({ access_token: "mock-service-token", expires_in: 3600 });
    if (url.hostname === "firestore.googleapis.com") {
      if (url.pathname.endsWith(":commit")) {
        const body = JSON.parse(init.body || "{}"); commits.push(body);
        return applyCommit(body) ? Response.json({ writeResults: body.writes.map(() => ({})) }) :
          Response.json({ error: { status: "FAILED_PRECONDITION", message: "update time mismatch" } }, { status: 409 });
      }
      const path = firestorePath(url);
      if (init.method === "DELETE") { docs.delete(path); return new Response(null, { status: 200 }); }
      if (init.method === "PATCH") {
        const prior = docs.get(path);
        if (url.searchParams.get("currentDocument.exists") === "false" && prior) return Response.json({ error: {} }, { status: 409 });
        const body = JSON.parse(init.body || "{}");
        docs.set(path, { name: docName(path), fields: { ...(prior?.fields || {}), ...(body.fields || {}) }, updateTime: `rev-${revision++}` });
        return Response.json(docs.get(path));
      }
      if (url.searchParams.has("pageSize") || url.searchParams.has("pageToken")) {
        const prefix = path.replace(/\/$/,"") + "/";
        const documents = [...docs.entries()].filter(([p]) => p.startsWith(prefix) && !p.slice(prefix.length).includes("/")).map(([,d]) => d);
        return Response.json({ documents });
      }
      const found = docs.get(path);
      return found ? Response.json(found) : Response.json({ error: { status: "NOT_FOUND" } }, { status: 404 });
    }
    if (url.hostname === "sandbox.sslcommerz.com" && url.pathname.includes("validationserverAPI")) {
      return Response.json(onGateway || {});
    }
    throw new Error("Unexpected outbound request: " + url.href);
  });
}
async function rsaServiceAccount() {
  const pair = await crypto.subtle.generateKey({ name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1,0,1]), hash: "SHA-256" }, true, ["sign","verify"]);
  const der = new Uint8Array(await crypto.subtle.exportKey("pkcs8", pair.privateKey));
  let binary = ""; for (const b of der) binary += String.fromCharCode(b);
  const pem = btoa(binary).match(/.{1,64}/g).join("\n");
  return { client_email: "mock@test.invalid", private_key: "-----BEGIN PRIVATE KEY-----\n" + pem + "\n-----END PRIVATE KEY-----" };
}
function request(path, body, contentType = "application/json") {
  return new Request("https://worker.test" + path, { method: "POST", headers: { "Content-Type": contentType, ...(path.startsWith("/wallet") ? { Authorization: "Bearer mock-user-token" } : {}) }, body });
}

test("Mock Firestore integration: recharge request and global TrxID index commit atomically; duplicate is rejected", async t => {
  installFetch(t);
  const env = { FIREBASE_API_KEY: "test-key", FIREBASE_PROJECT_ID: PROJECT, FIREBASE_SERVICE_ACCOUNT: JSON.stringify(await rsaServiceAccount()) };
  const body = { amount: 100, paymentMethod: "bKash", transactionId: " trx-abc-123 " };
  const first = await adminWorker.fetch(request("/wallet/recharge", JSON.stringify(body)), env);
  assert.equal(first.status, 201);
  const firstData = await first.json();
  assert.equal(firstData.request.transactionId, "TRX-ABC-123");
  assert.equal(commits.length, 1);
  assert.equal(commits[0].writes.length, 2);
  assert.ok(commits[0].writes.every(w => w.currentDocument?.exists === false));
  const second = await adminWorker.fetch(request("/wallet/recharge", JSON.stringify(body)), env);
  assert.equal(second.status, 400);
  assert.equal((await second.json()).error, "DUPLICATE_TRX");
  assert.equal(commits.length, 1);
});

test("Main Admin UID can submit recharge while email is unverified; ordinary users remain blocked", async t => {
  installFetch(t, { uid: MAIN_UID, verified: false });
  const env = {
    FIREBASE_API_KEY: "test-key",
    FIREBASE_PROJECT_ID: PROJECT,
    FIREBASE_SERVICE_ACCOUNT: JSON.stringify(await rsaServiceAccount()),
    MAIN_ADMIN_UID: MAIN_UID
  };
  const body = { amount: 100, paymentMethod: "bKash", transactionId: "MAIN-UNVERIFIED-123" };
  const allowed = await adminWorker.fetch(request("/wallet/recharge", JSON.stringify(body)), env);
  assert.equal(allowed.status, 201);
  assert.equal((await allowed.json()).success, true);

  installFetch(t, { uid: "ordinary-user-123", verified: false });
  const rejected = await adminWorker.fetch(request("/wallet/recharge", JSON.stringify(body)), env);
  assert.equal(rejected.status, 401);
  assert.equal((await rejected.json()).error, "EMAIL_NOT_VERIFIED");
  assert.equal(commits.length, 0);
});

test("Mock Firestore integration: TEST SMS debit is atomic and repeated request ID does not debit twice", async t => {
  installFetch(t);
  seed(`users/${MAIN_UID}/data/main`, { smsWalletBalance: 5, smsHistory: [], smsWalletTransactions: [] });
  const env = { FIREBASE_API_KEY: "test-key", FIREBASE_PROJECT_ID: PROJECT, FIREBASE_SERVICE_ACCOUNT: JSON.stringify(await rsaServiceAccount()) };
  const body = { id: "SMSREQ-123456", phone: "01712345678", message: "test message" };
  const first = await adminWorker.fetch(request("/wallet/test-sms", JSON.stringify(body)), env);
  assert.equal(first.status, 200);
  assert.equal((await first.json()).balance, 4);
  assert.equal(commits.length, 1);
  assert.equal(commits[0].writes.length, 2);
  const second = await adminWorker.fetch(request("/wallet/test-sms", JSON.stringify(body)), env);
  assert.equal(second.status, 200);
  assert.equal((await second.json()).balance, 4);
  const main = decode(docs.get(`users/${MAIN_UID}/data/main`).fields.smsWalletBalance);
  assert.equal(main, 4);
  assert.equal(commits.length, 1);
});

test("Mock Firestore + SSLCOMMERZ Sandbox validation: valid IPN credits once and repeated IPN is idempotent", async t => {
  const tranId = "E24SABCDEF1234567890";
  const uid = "customer-123";
  seed(`users/${uid}/data/main`, { smsWalletBalance: 10, smsWalletTransactions: [] });
  seed(`e24PaymentSessions/${tranId}`, { uid, amount: 50, currency: "BDT", tranId, status: "PENDING", credited: false, mode: "SANDBOX" });
  installFetch(t, { onGateway: { status: "VALID", tran_id: tranId, amount: "50.00", currency: "BDT", currency_type: "BDT", risk_level: "0", val_id: "VAL-123", bank_tran_id: "BANK-123", value_a: uid, value_b: "SMS_WALLET" } });
  // Re-seed after harness reset.
  seed(`users/${uid}/data/main`, { smsWalletBalance: 10, smsWalletTransactions: [] });
  seed(`e24PaymentSessions/${tranId}`, { uid, amount: 50, currency: "BDT", tranId, status: "PENDING", credited: false, mode: "SANDBOX" });
  const env = { FIREBASE_PROJECT_ID: PROJECT, FIREBASE_SERVICE_ACCOUNT_JSON: JSON.stringify(await rsaServiceAccount()), SSLCOMMERZ_MODE: "SANDBOX", SSLCOMMERZ_STORE_ID: "sandbox-id", SSLCOMMERZ_STORE_PASSWORD: "sandbox-pass" };
  const ipn = () => new Request("https://worker.test/ipn", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ status: "VALID", val_id: "VAL-123", tran_id: tranId }).toString() });
  const first = await paymentWorker.fetch(ipn(), env);
  assert.equal(first.status, 200);
  assert.equal((await first.json()).status, "VALIDATED");
  assert.equal(commits.length, 1);
  assert.equal(commits[0].writes.length, 2);
  const balance = decode(docs.get(`users/${uid}/data/main`).fields.smsWalletBalance);
  assert.equal(balance, 60);
  const second = await paymentWorker.fetch(ipn(), env);
  assert.equal(second.status, 200);
  assert.equal((await second.json()).status, "ALREADY_CREDITED");
  assert.equal(decode(docs.get(`users/${uid}/data/main`).fields.smsWalletBalance), 60);
  assert.equal(commits.length, 1);
});

test("Mock SSLCOMMERZ validation rejects a mismatched paid amount without Firestore credit", async t => {
  const tranId = "E24SABCDEF1234567890";
  const uid = "customer-456";
  installFetch(t, { onGateway: { status: "VALID", tran_id: tranId, amount: "49.00", currency: "BDT", currency_type: "BDT", risk_level: "0", val_id: "VAL-456", value_a: uid, value_b: "SMS_WALLET" } });
  seed(`users/${uid}/data/main`, { smsWalletBalance: 10, smsWalletTransactions: [] });
  seed(`e24PaymentSessions/${tranId}`, { uid, amount: 50, currency: "BDT", tranId, status: "PENDING", credited: false, mode: "SANDBOX" });
  const env = { FIREBASE_PROJECT_ID: PROJECT, FIREBASE_SERVICE_ACCOUNT_JSON: JSON.stringify(await rsaServiceAccount()), SSLCOMMERZ_MODE: "SANDBOX", SSLCOMMERZ_STORE_ID: "sandbox-id", SSLCOMMERZ_STORE_PASSWORD: "sandbox-pass" };
  const response = await paymentWorker.fetch(new Request("https://worker.test/ipn", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ status: "VALID", val_id: "VAL-456", tran_id: tranId }).toString() }), env);
  assert.equal(response.status, 400);
  assert.equal((await response.json()).error, "PAYMENT_VALIDATION_FAILED");
  assert.equal(commits.length, 0);
  assert.equal(decode(docs.get(`users/${uid}/data/main`).fields.smsWalletBalance), 10);
});
