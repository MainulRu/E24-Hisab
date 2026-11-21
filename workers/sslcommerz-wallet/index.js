const JSON_HEADERS = { "content-type": "application/json; charset=utf-8" };
const SANDBOX_SESSION_URL = "https://sandbox.sslcommerz.com/gwprocess/v4/api.php";
const SANDBOX_VALIDATE_URL = "https://sandbox.sslcommerz.com/validator/api/validationserverAPI.php";

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), { status, headers: { ...JSON_HEADERS, ...headers } });
}
function b64url(input) {
  const bytes = typeof input === "string" ? new TextEncoder().encode(input) : input;
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}
function pemBytes(pem) {
  const body = pem.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g, "");
  const raw = atob(body);
  return Uint8Array.from(raw, c => c.charCodeAt(0));
}
function firestoreValue(value) {
  if (value === null) return { nullValue: null };
  if (typeof value === "string") return { stringValue: value };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(firestoreValue) } };
  if (typeof value === "object") {
    const fields = {};
    for (const [key, item] of Object.entries(value)) fields[key] = firestoreValue(item);
    return { mapValue: { fields } };
  }
  return { nullValue: null };
}
function fromFirestore(value) {
  if (!value) return null;
  if ("stringValue" in value) return value.stringValue;
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return Number(value.doubleValue);
  if ("booleanValue" in value) return value.booleanValue;
  if ("timestampValue" in value) return value.timestampValue;
  if ("nullValue" in value) return null;
  if ("arrayValue" in value) return (value.arrayValue.values || []).map(fromFirestore);
  if ("mapValue" in value) {
    const out = {};
    for (const [key, item] of Object.entries(value.mapValue.fields || {})) out[key] = fromFirestore(item);
    return out;
  }
  return null;
}
function fieldsToObject(fields = {}) {
  const out = {};
  for (const [key, value] of Object.entries(fields)) out[key] = fromFirestore(value);
  return out;
}
function allowedOrigin(request, env) {
  const origin = request.headers.get("Origin") || "";
  const allowed = (env.ALLOWED_ORIGINS || "https://mainulru.github.io")
    .split(",").map(x => x.trim()).filter(Boolean);
  return allowed.includes(origin) || origin === "null" ? origin : allowed[0];
}
function corsHeaders(request, env) {
  return {
    "access-control-allow-origin": allowedOrigin(request, env),
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-allow-headers": "authorization, content-type",
    "access-control-max-age": "86400",
    "vary": "Origin"
  };
}
async function requireUser(request, env) {
  const auth = request.headers.get("Authorization") || "";
  const match = auth.match(/^Bearer\s+(.+)$/i);
  if (!match) throw new Error("AUTH_REQUIRED");
  const response = await fetch("https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=" + encodeURIComponent(env.FIREBASE_API_KEY), {
    method: "POST", headers: JSON_HEADERS, body: JSON.stringify({ idToken: match[1] })
  });
  if (!response.ok) throw new Error("AUTH_INVALID");
  const data = await response.json();
  const user = data.users && data.users[0];
  if (!user || !user.localId) throw new Error("AUTH_INVALID");
  return { uid: user.localId, email: user.email || "", emailVerified: !!user.emailVerified };
}
let cachedAccessToken = null;
let cachedAccessTokenExpiry = 0;
async function serviceAccessToken(env) {
  if (cachedAccessToken && Date.now() < cachedAccessTokenExpiry - 60000) return cachedAccessToken;
  const account = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT_JSON);
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = b64url(JSON.stringify({
    iss: account.client_email,
    scope: "https://www.googleapis.com/auth/datastore",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600
  }));
  const unsigned = header + "." + claim;
  const key = await crypto.subtle.importKey(
    "pkcs8", pemBytes(account.private_key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]
  );
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(unsigned));
  const assertion = unsigned + "." + b64url(new Uint8Array(signature));
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion
    })
  });
  const data = await response.json();
  if (!response.ok || !data.access_token) throw new Error("FIREBASE_SERVICE_AUTH_FAILED");
  cachedAccessToken = data.access_token;
  cachedAccessTokenExpiry = Date.now() + Number(data.expires_in || 3600) * 1000;
  return cachedAccessToken;
}
function documentsBase(env) {
  return "https://firestore.googleapis.com/v1/projects/" + encodeURIComponent(env.FIREBASE_PROJECT_ID) +
    "/databases/(default)/documents";
}
async function fsFetch(env, path, options = {}) {
  const token = await serviceAccessToken(env);
  const response = await fetch(documentsBase(env) + path, {
    ...options,
    headers: { authorization: "Bearer " + token, ...(options.headers || {}) }
  });
  const text = await response.text();
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch (_) {}
  if (!response.ok) {
    const err = new Error("FIRESTORE_API_ERROR");
    err.detail = data.error && data.error.message || text;
    err.status = response.status;
    throw err;
  }
  return data;
}
async function getDocument(env, path) {
  try { return await fsFetch(env, path); }
  catch (error) { if (error.status === 404) return null; throw error; }
}
async function savePendingSession(env, tranId, data) {
  const path = "/e24PaymentSessions/" + encodeURIComponent(tranId);
  const fields = {};
  for (const [key, value] of Object.entries(data)) fields[key] = firestoreValue(value);
  const token = await serviceAccessToken(env);
  const response = await fetch(documentsBase(env) + path, {
    method: "PATCH",
    headers: { authorization: "Bearer " + token, "content-type": "application/json" },
    body: JSON.stringify({ fields })
  });
  if (!response.ok) throw new Error("PAYMENT_RECORD_SAVE_FAILED");
}
async function createSession(request, env, user) {
  const body = await request.json();
  const amount = Number(body.amount);
  if (!Number.isFinite(amount) || amount < 10 || amount > 10000 || Math.round(amount * 100) !== amount * 100) {
    return json({ error: "INVALID_AMOUNT" }, 400);
  }
  const profileDoc = await getDocument(env, "/users/" + encodeURIComponent(user.uid));
  const profile = fieldsToObject(profileDoc && profileDoc.fields);
  const phone = String(profile.mobile || "").replace(/[\s()+.-]/g, "");
  if (!/^01[3-9]\d{8}$/.test(phone)) return json({ error: "PROFILE_PHONE_REQUIRED" }, 400);

  const tranId = "E24S" + Date.now().toString(36).toUpperCase() + crypto.randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase();
  const base = new URL(request.url).origin;
  const form = new URLSearchParams({
    store_id: env.SSLCOMMERZ_STORE_ID,
    store_passwd: env.SSLCOMMERZ_STORE_PASSWORD,
    total_amount: amount.toFixed(2),
    currency: "BDT",
    tran_id: tranId,
    success_url: base + "/callback/success?tran_id=" + encodeURIComponent(tranId),
    fail_url: base + "/callback/fail?tran_id=" + encodeURIComponent(tranId),
    cancel_url: base + "/callback/cancel?tran_id=" + encodeURIComponent(tranId),
    ipn_url: base + "/ipn",
    product_name: "E24 Hisab SMS Wallet Recharge",
    product_category: "Top up",
    product_profile: "general",
    shipping_method: "NO",
    num_of_item: "1",
    cus_name: String(profile.name || user.email.split("@")[0] || "E24 Hisab User").slice(0, 40),
    cus_email: user.email,
    cus_add1: "Bangladesh",
    cus_city: "Dhaka",
    cus_postcode: "1200",
    cus_country: "Bangladesh",
    cus_phone: phone,
    value_a: user.uid,
    value_b: "SMS_WALLET"
  });
  const gatewayResponse = await fetch(SANDBOX_SESSION_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: form
  });
  const gateway = await gatewayResponse.json();
  if (!gatewayResponse.ok || gateway.status !== "SUCCESS" || !gateway.GatewayPageURL) {
    return json({ error: "GATEWAY_SESSION_FAILED", gateway_status: gateway.status || "ERROR" }, 502);
  }
  await savePendingSession(env, tranId, {
    uid: user.uid, amount, currency: "BDT", tranId, sessionKey: gateway.sessionkey || "",
    status: "PENDING", credited: false, mode: "SANDBOX", createdAt: new Date().toISOString()
  });
  return json({ gatewayPageURL: gateway.GatewayPageURL, tranId });
}
async function commitValidatedPayment(env, session, validation) {
  const uid = session.uid;
  const tranId = session.tranId;
  const mainPath = "/users/" + encodeURIComponent(uid) + "/data/main";
  const paymentPath = "/e24PaymentSessions/" + encodeURIComponent(tranId);
  const mainDoc = await getDocument(env, mainPath);
  const paymentDoc = await getDocument(env, paymentPath);
  if (!mainDoc || !paymentDoc) throw new Error("PAYMENT_RECORD_NOT_FOUND");
  const payment = fieldsToObject(paymentDoc.fields);
  if (payment.credited === true || payment.status === "PAID") return { alreadyCredited: true };
  const main = fieldsToObject(mainDoc.fields);
  const balance = Number(main.smsWalletBalance || 0);
  const amount = Number(session.amount);
  const nextBalance = Number((balance + amount).toFixed(2));
  const now = new Date().toISOString();
  const ledger = {
    id: "SSLCOMMERZ-" + tranId,
    type: "CREDIT",
    title: "SSLCOMMERZ Sandbox Recharge",
    amount,
    balanceAfter: nextBalance,
    date: new Date().toLocaleString("en-GB", { timeZone: "Asia/Dhaka" }),
    mode: "SANDBOX",
    referenceId: tranId
  };
  const mainName = mainDoc.name;
  const paymentName = paymentDoc.name;
  const writes = [
    {
      update: {
        name: mainName,
        fields: {
          smsWalletBalance: firestoreValue(nextBalance),
          smsWalletTransactions: firestoreValue((Array.isArray(main.smsWalletTransactions) ? main.smsWalletTransactions : []).concat([ledger]).slice(-300)),
          updatedAt: { timestampValue: now }
        }
      },
      currentDocument: { updateTime: mainDoc.updateTime }
    },
    {
      update: {
        name: paymentName,
        fields: {
          status: { stringValue: "PAID" },
          credited: { booleanValue: true },
          valId: firestoreValue(validation.val_id || ""),
          bankTranId: firestoreValue(validation.bank_tran_id || ""),
          paidAt: { timestampValue: now },
          riskLevel: firestoreValue(String(validation.risk_level || "0"))
        }
      },
      currentDocument: { updateTime: paymentDoc.updateTime }
    }
  ];
  const token = await serviceAccessToken(env);
  const response = await fetch(documentsBase(env) + ":commit", {
    method: "POST",
    headers: { authorization: "Bearer " + token, "content-type": "application/json" },
    body: JSON.stringify({ writes })
  });
  const result = await response.json();
  if (response.status === 409 || response.status === 400) {
    const msg = result.error && result.error.message || "";
    if (/FAILED_PRECONDITION|update time|transaction/i.test(msg)) return { retry: true };
  }
  if (!response.ok) throw new Error("WALLET_CREDIT_FAILED");
  return { alreadyCredited: false, balance: nextBalance };
}
async function handleIpn(request, env) {
  const form = await request.formData();
  const ipnStatus = String(form.get("status") || "").toUpperCase();
  if (ipnStatus !== "VALID") return json({ status: "IGNORED_NON_VALID_STATUS" });
  const valId = String(form.get("val_id") || "");
  const tranId = String(form.get("tran_id") || "");
  if (!valId || !tranId) return json({ error: "MISSING_PAYMENT_REFERENCE" }, 400);
  const doc = await getDocument(env, "/e24PaymentSessions/" + encodeURIComponent(tranId));
  if (!doc) return json({ error: "UNKNOWN_TRANSACTION" }, 404);
  const session = fieldsToObject(doc.fields);
  if (session.status === "PAID" && session.credited) return json({ status: "ALREADY_CREDITED" });
  const url = new URL(SANDBOX_VALIDATE_URL);
  url.search = new URLSearchParams({
    val_id: valId,
    store_id: env.SSLCOMMERZ_STORE_ID,
    store_passwd: env.SSLCOMMERZ_STORE_PASSWORD,
    format: "json"
  }).toString();
  const response = await fetch(url.toString());
  const validation = await response.json();
  const paidAmount = Number(validation.amount);
  if (!response.ok || !["VALID", "VALIDATED"].includes(String(validation.status || "").toUpperCase()) ||
      String(validation.tran_id) !== tranId || String(validation.currency) !== "BDT" || String(validation.currency_type) !== "BDT" ||
      Math.abs(paidAmount - Number(session.amount)) > 0.001 || String(validation.risk_level || "0") !== "0") {
    return json({ error: "PAYMENT_VALIDATION_FAILED" }, 400);
  }
  const result = await commitValidatedPayment(env, session, validation);
  if (result.retry) {
    const retry = await commitValidatedPayment(env, session, validation);
    if (retry.retry) return json({ error: "PAYMENT_RETRY_REQUIRED" }, 409);
    return json({ status: retry.alreadyCredited ? "ALREADY_CREDITED" : "VALIDATED" });
  }
  return json({ status: result.alreadyCredited ? "ALREADY_CREDITED" : "VALIDATED" });
}
async function paymentStatus(request, env, user) {
  const tranId = new URL(request.url).searchParams.get("tran_id") || "";
  if (!/^E24S[A-Z0-9]+$/.test(tranId)) return json({ error: "INVALID_REFERENCE" }, 400);
  const doc = await getDocument(env, "/e24PaymentSessions/" + encodeURIComponent(tranId));
  if (!doc) return json({ error: "NOT_FOUND" }, 404);
  const data = fieldsToObject(doc.fields);
  if (data.uid !== user.uid) return json({ error: "FORBIDDEN" }, 403);
  return json({ status: data.status, credited: data.credited === true, amount: data.amount, mode: data.mode });
}
function callbackPage(kind) {
  const messages = {
    success: "পেমেন্ট প্রক্রিয়া সম্পন্ন হয়েছে। Wallet আপডেট হতে কয়েক মুহূর্ত লাগতে পারে। E24 Hisab-এ ফিরে Wallet Refresh করুন।",
    fail: "পেমেন্ট সম্পন্ন হয়নি। Wallet থেকে টাকা যোগ করা হয়নি।",
    cancel: "আপনি পেমেন্ট বাতিল করেছেন। Wallet থেকে টাকা যোগ করা হয়নি।"
  };
  return new Response("<!doctype html><html lang='bn'><meta charset='utf-8'><meta name='viewport' content='width=device-width'><title>E24 Hisab Payment</title><body style='font-family:sans-serif;padding:28px;line-height:1.7'><h3>E24 Hisab</h3><p>" + messages[kind] + "</p><button onclick='history.back()'>ফিরে যান</button></body></html>", {
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" }
  });
}
export default {
  async fetch(request, env) {
    const cors = corsHeaders(request, env);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    const url = new URL(request.url);
    try {
      if ((request.method === "GET" || request.method === "POST") && url.pathname === "/callback/success") return callbackPage("success");
      if ((request.method === "GET" || request.method === "POST") && url.pathname === "/callback/fail") return callbackPage("fail");
      if ((request.method === "GET" || request.method === "POST") && url.pathname === "/callback/cancel") return callbackPage("cancel");
      if (request.method === "POST" && url.pathname === "/ipn") {
        const result = await handleIpn(request, env);
        return new Response(await result.text(), { status: result.status, headers: { ...cors, ...JSON_HEADERS } });
      }
      if (request.method === "POST" && url.pathname === "/create-session") {
        const user = await requireUser(request, env);
        const result = await createSession(request, env, user);
        return new Response(await result.text(), { status: result.status, headers: { ...cors, ...JSON_HEADERS } });
      }
      if (request.method === "GET" && url.pathname === "/status") {
        const user = await requireUser(request, env);
        const result = await paymentStatus(request, env, user);
        return new Response(await result.text(), { status: result.status, headers: { ...cors, ...JSON_HEADERS } });
      }
      return json({ error: "NOT_FOUND" }, 404, cors);
    } catch (error) {
      const status = error.message === "AUTH_REQUIRED" ? 401 :
        error.message === "AUTH_INVALID" ? 403 : 500;
      return json({ error: status === 500 ? "SERVER_ERROR" : error.message }, status, cors);
    }
  }
};