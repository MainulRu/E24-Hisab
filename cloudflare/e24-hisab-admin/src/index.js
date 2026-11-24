const MAIN_UID = "exITNpwyRNaWpoMWpW6BgMcMGbf2";
const MAIN_EMAIL = "mainul.ru.ac.bd@gmail.com";
const ORIGIN = "https://mainulru.github.io";

const reply = (body, status = 200, origin = ORIGIN) => new Response(JSON.stringify(body), {
  status,
  headers: {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Authorization,Content-Type",
    "Vary": "Origin",
    "Cache-Control": "no-store"
  }
});

function b64url(value) {
  const bytes = typeof value === "string" ? new TextEncoder().encode(value) : value;
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function decodeValue(v) {
  if ("stringValue" in v) return v.stringValue;
  if ("integerValue" in v) return Number(v.integerValue);
  if ("doubleValue" in v) return Number(v.doubleValue);
  if ("booleanValue" in v) return v.booleanValue;
  if ("nullValue" in v) return null;
  if ("timestampValue" in v) return v.timestampValue;
  if ("arrayValue" in v) return (v.arrayValue.values || []).map(decodeValue);
  if ("mapValue" in v) return decodeFields(v.mapValue.fields || {});
  return null;
}
function decodeFields(fields = {}) {
  return Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, decodeValue(v)]));
}
function encodeValue(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === "string") return { stringValue: v };
  if (typeof v === "boolean") return { booleanValue: v };
  if (typeof v === "number") return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(encodeValue) } };
  if (typeof v === "object") return { mapValue: { fields: encodeFields(v) } };
  return { nullValue: null };
}
function encodeFields(data) {
  return Object.fromEntries(Object.entries(data || {}).map(([k, v]) => [k, encodeValue(v)]));
}

async function googleToken(env) {
  const sa = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT);
  const now = Math.floor(Date.now() / 1000);
  const head = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = b64url(JSON.stringify({
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/datastore https://www.googleapis.com/auth/identitytoolkit",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600
  }));
  const unsigned = head + "." + claim;
  const pem = sa.private_key.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g, "");
  const keyData = Uint8Array.from(atob(pem), c => c.charCodeAt(0));
  const key = await crypto.subtle.importKey("pkcs8", keyData, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(unsigned));
  const assertion = unsigned + "." + b64url(new Uint8Array(sig));
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion })
  });
  const data = await res.json();
  if (!res.ok || !data.access_token) throw new Error("SERVICE_ACCOUNT_AUTH_FAILED");
  return data.access_token;
}

async function readJsonBody(request, maxBytes = 16384) {
  const length = Number(request.headers.get("Content-Length") || 0);
  if (length > maxBytes) throw new Error("REQUEST_TOO_LARGE");
  const raw = await request.text();
  if (new TextEncoder().encode(raw).length > maxBytes) throw new Error("REQUEST_TOO_LARGE");
  try { return raw ? JSON.parse(raw) : {}; }
  catch (_) { throw new Error("INVALID_JSON"); }
}
async function verifyCaller(request, env) {
  const bearer = (request.headers.get("Authorization") || "").match(/^Bearer\s+(.+)$/i);
  if (!bearer) throw new Error("AUTH_REQUIRED");
  if (bearer[1].length > 8192) throw new Error("INVALID_TOKEN");
  const res = await fetch("https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=" + encodeURIComponent(env.FIREBASE_API_KEY), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken: bearer[1] })
  });
  const data = await res.json();
  const u = data.users && data.users[0];
  if (!res.ok || !u || u.disabled) throw new Error("INVALID_TOKEN");
  return { uid: u.localId, email: String(u.email || "").toLowerCase(), emailVerified: !!u.emailVerified };
}

async function fs(env, token, path, options = {}) {
  let url = "https://firestore.googleapis.com/v1/projects/" + env.FIREBASE_PROJECT_ID + "/databases/(default)/documents/" + path;
  if (options.currentDocumentUpdateTime) url += "?currentDocument.updateTime=" + encodeURIComponent(options.currentDocumentUpdateTime);
  else if (options.currentDocumentExists === false) url += "?currentDocument.exists=false";
  const res = await fetch(url, {
    method: options.method || "GET",
    headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  const raw = await res.text();
  let data = {};
  try { data = raw ? JSON.parse(raw) : {}; } catch (_) {}
  if (!res.ok && !(options.allow404 && res.status === 404)) {
    const err = new Error(data.error?.status || "FIRESTORE_REQUEST_FAILED");
    err.status = res.status;
    throw err;
  }
  return { data, status: res.status };
}
async function getRole(env, token, uid) {
  try {
    const doc = await fs(env, token, "adminRoles/" + encodeURIComponent(uid));
    return decodeFields(doc.data.fields || {});
  } catch (e) {
    if (e.status === 404) return null;
    throw e;
  }
}
async function getAdmin(env, token, caller) {
  if (caller.uid === MAIN_UID || (caller.email === MAIN_EMAIL && caller.emailVerified)) {
    return { role: "main", managedUsers: [] };
  }
  if (!caller.emailVerified) throw new Error("EMAIL_NOT_VERIFIED");
  const role = await getRole(env, token, caller.uid);
  if (!role || role.active !== true || !["limited", "full"].includes(role.role)) throw new Error("ADMIN_REQUIRED");
  return { role: role.role, managedUsers: Array.isArray(role.managedUsers) ? role.managedUsers : [] };
}
async function listDocs(env, token, path) {
  const all = [];
  let pageToken = "";
  do {
    const suffix = "?pageSize=1000" + (pageToken ? "&pageToken=" + encodeURIComponent(pageToken) : "");
    const r = await fs(env, token, path + suffix);
    all.push(...(r.data.documents || []));
    pageToken = r.data.nextPageToken || "";
  } while (pageToken);
  return all;
}
async function deleteDocumentTree(env, token, documentPath) {
  // Firestore documents can own subcollections; remove descendants first.
  const collections = await fs(env, token, documentPath + ":listCollectionIds", {
    method: "POST", body: { pageSize: 1000 }, allow404: true
  });
  if (collections.status === 404) return;
  for (const collectionId of collections.data.collectionIds || []) {
    const children = await listDocs(env, token, documentPath + "/" + collectionId);
    for (const child of children) {
      const childPath = child.name.split("/documents/")[1];
      await deleteDocumentTree(env, token, childPath);
    }
  }
  await fs(env, token, documentPath, { method: "DELETE", allow404: true });
}

/* E24_REFERRAL_BONUS_V1: grant only once, atomically with manual recharge approval. */
async function adminReferralRewardWrites(env, token, referredUid, now) {
  const referredPath = "users/" + encodeURIComponent(referredUid);
  const referredResult = await fs(env, token, referredPath, { allow404: true });
  if (referredResult.status === 404) return [];
  const referredDoc = referredResult.data;
  const referred = decodeFields(referredDoc.fields || {});
  const referrerUid = String(referred.referredBy || "");
  if (!referrerUid || referrerUid === referredUid || referred.referralRewardPaid === true) return [];
  const rewardPath = "e24ReferralRewards/" + encodeURIComponent(referredUid);
  const existingReward = await fs(env, token, rewardPath, { allow404: true });
  if (existingReward.status !== 404) return [];
  const referrerPath = "users/" + encodeURIComponent(referrerUid);
  const referrerResult = await fs(env, token, referrerPath, { allow404: true });
  if (referrerResult.status === 404) return [];
  const referrerDoc = referrerResult.data;
  const referrer = decodeFields(referrerDoc.fields || {});
  const refMainPath = referrerPath + "/data/main";
  const refMainResult = await fs(env, token, refMainPath, { allow404: true });
  const refMainDoc = refMainResult.status === 404 ? null : refMainResult.data;
  const refMain = decodeFields(refMainDoc?.fields || {});
  const nextBalance = Number((Number(refMain.smsWalletBalance || 0) + 5).toFixed(2));
  const ledger = {
    id: "REFERRAL-" + referredUid, type: "CREDIT", mode: "BONUS",
    title: "Referral Bonus", amount: 5, balanceAfter: nextBalance,
    date: new Date(now).toLocaleString("en-GB", { timeZone: "Asia/Dhaka" }),
    referenceId: referredUid
  };
  const docName = path => "projects/" + env.FIREBASE_PROJECT_ID + "/databases/(default)/documents/" + path;
  const refMainName = docName(refMainPath);
  const refMainFields = {
    smsWalletBalance: encodeValue(nextBalance),
    smsWalletTransactions: encodeValue((Array.isArray(refMain.smsWalletTransactions) ? refMain.smsWalletTransactions : []).concat([ledger]).slice(-300)),
    updatedAt: { timestampValue: now }
  };
  const refMainWrite = refMainDoc
    ? { update: { name: refMainName, fields: refMainFields }, updateMask: { fieldPaths: ["smsWalletBalance", "smsWalletTransactions", "updatedAt"] }, currentDocument: { updateTime: refMainDoc.updateTime } }
    : { update: { name: refMainName, fields: refMainFields }, currentDocument: { exists: false } };
  return [{
    update: { name: docName(referredPath), fields: { referralRewardPaid: { booleanValue: true }, referralRewardedAt: { timestampValue: now } }},
    updateMask: { fieldPaths: ["referralRewardPaid", "referralRewardedAt"] },
    currentDocument: { updateTime: referredDoc.updateTime }
  },{
    update: { name: docName(referrerPath), fields: {
      referralSuccessfulCount: encodeValue(Number(referrer.referralSuccessfulCount || 0) + 1),
      referralBonusTotal: encodeValue(Number((Number(referrer.referralBonusTotal || 0) + 5).toFixed(2))),
      referralUpdatedAt: { timestampValue: now }
    }},
    updateMask: { fieldPaths: ["referralSuccessfulCount", "referralBonusTotal", "referralUpdatedAt"] },
    currentDocument: { updateTime: referrerDoc.updateTime }
  },refMainWrite,{
    update: { name: docName(rewardPath), fields: encodeFields({
      referrerUid, referredUid, amount: 5, wallet: "SMS",
      type: "FIRST_SUCCESSFUL_RECHARGE", createdAt: now
    })},
    currentDocument: { exists: false }
  }];
}
async function commitAdminWrites(env, token, writes) {
  const url = "https://firestore.googleapis.com/v1/projects/" + encodeURIComponent(env.FIREBASE_PROJECT_ID) + "/databases/(default)/documents:commit";
  const response = await fetch(url, {
    method: "POST",
    headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
    body: JSON.stringify({ writes })
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(response.status === 409 || response.status === 400 ? "RECHARGE_COMMIT_CONFLICT" : "RECHARGE_COMMIT_FAILED");
    error.status = response.status;
    throw error;
  }
  return result;
}
async function sha256Hex(value) {
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
  return Array.from(digest).map(x => x.toString(16).padStart(2, "0")).join("");
}
async function createWalletRechargeRequest(env, token, uid, body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("INVALID_REQUEST");
  const amount = Number(body.amount);
  const paymentMethod = String(body.paymentMethod || "");
  const transactionId = String(body.transactionId || "").trim().replace(/\s+/g, "").toUpperCase();
  if (!Number.isFinite(amount) || amount < 10 || amount > 10000 || Math.round(amount * 100) !== amount * 100) throw new Error("INVALID_RECHARGE_AMOUNT");
  if (!["bKash", "Nagad", "Rocket"].includes(paymentMethod)) throw new Error("INVALID_PAYMENT_METHOD");
  if (!/^[A-Z0-9-]{5,64}$/.test(transactionId)) throw new Error("INVALID_TRANSACTION_ID");
  const collectionPath = "users/" + encodeURIComponent(uid) + "/rechargeRequests";
  const existing = await listDocs(env, token, collectionPath);
  if (existing.some(d => String(decodeFields(d.fields || {}).transactionId || "").toUpperCase() === transactionId)) throw new Error("DUPLICATE_TRX");
  if (existing.filter(d => String(decodeFields(d.fields || {}).status).toUpperCase() === "PENDING").length >= 5) throw new Error("TOO_MANY_PENDING_REQUESTS");
  const legacyDoc = await fs(env, token, "users/" + encodeURIComponent(uid) + "/data/main", { allow404: true });
  if (legacyDoc.status !== 404) {
    const legacy = decodeFields(legacyDoc.data.fields || {}).smsRechargeRequests;
    if (Array.isArray(legacy) && legacy.some(x => String(x.transactionId || "").toUpperCase() === transactionId && String(x.status || "").toUpperCase() !== "CANCELLED")) throw new Error("DUPLICATE_TRX");
  }
  const id = "R" + crypto.randomUUID().replace(/-/g, "").slice(0, 20).toLowerCase();
  const now = new Date().toISOString();
  const request = {
    id, uid, amount, status: "PENDING", date: new Date().toLocaleString("bn-BD", { timeZone: "Asia/Dhaka" }),
    createdAt: now, mode: "MANUAL", paymentMethod, receiverNumber: "01737537688", transactionId
  };
  const indexId = await sha256Hex(transactionId);
  const indexPath = "e24RechargeTransactionIndex/" + indexId;
  const indexDoc = await fs(env, token, indexPath, { allow404: true });
  if (indexDoc.status !== 404) throw new Error("DUPLICATE_TRX");
  const docName = p => "projects/" + env.FIREBASE_PROJECT_ID + "/databases/(default)/documents/" + p;
  try {
    await commitAdminWrites(env, token, [
      { update: { name: docName(collectionPath + "/" + id), fields: encodeFields(request) }, currentDocument: { exists: false } },
      { update: { name: docName(indexPath), fields: encodeFields({ uid, requestId: id, transactionIdHash: indexId, createdAt: now }) }, currentDocument: { exists: false } }
    ]);
  } catch (error) {
    if (error.status === 400 || error.status === 409) throw new Error("DUPLICATE_TRX");
    throw error;
  }
  return request;
}
async function debitTestSms(env, token, uid, body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("INVALID_SMS_REQUEST");
  const id = String(body.id || "").trim();
  const phone = String(body.phone || "").replace(/[\\s-]/g, "");
  const message = String(body.message || "").trim();
  if (!/^[A-Za-z0-9_-]{8,80}$/.test(id) || !/^01[3-9]\\d{8}$/.test(phone) || !message || message.length > 500) throw new Error("INVALID_SMS_REQUEST");
  const eventId = await sha256Hex(uid + ":" + id);
  const eventPath = "e24SmsDebitEvents/" + eventId;
  const previous = await fs(env, token, eventPath, { allow404: true });
  const mainPath = "users/" + encodeURIComponent(uid) + "/data/main";
  if (previous.status !== 404) {
    const savedEvent = decodeFields(previous.data.fields || {});
    const currentMain = await fs(env, token, mainPath);
    savedEvent.balance = Number(decodeFields(currentMain.data.fields || {}).smsWalletBalance) || 0;
    return savedEvent;
  }
  const mainDoc = await fs(env, token, mainPath);
  const data = decodeFields(mainDoc.data.fields || {});
  const balance = Number(data.smsWalletBalance || 0);
  if (!Number.isFinite(balance) || balance < 1) throw new Error("LOW_BALANCE");
  const nextBalance = Number((balance - 1).toFixed(2));
  const date = new Date().toLocaleString("bn-BD", { timeZone: "Asia/Dhaka" });
  const smsRecord = { id, phone, message, status: "SUCCESS", date, mode: "TEST", cost: 1 };
  const ledger = { id: "SMS-" + id, type: "DEBIT", title: "Test SMS পাঠানো", amount: 1, balanceAfter: nextBalance, date, mode: "TEST", referenceId: id };
  const history = (Array.isArray(data.smsHistory) ? data.smsHistory : []).concat([smsRecord]).slice(-200);
  const transactions = (Array.isArray(data.smsWalletTransactions) ? data.smsWalletTransactions : []).concat([ledger]).slice(-300);
  const docName = p => "projects/" + env.FIREBASE_PROJECT_ID + "/databases/(default)/documents/" + p;
  const event = { uid, id, phone, message, balance: nextBalance, smsRecord, ledger, createdAt: new Date().toISOString(), mode: "TEST" };
  try {
    await commitAdminWrites(env, token, [
      {
        update: { name: docName(mainPath), fields: {
          smsWalletBalance: encodeValue(nextBalance),
          smsHistory: encodeValue(history),
          smsWalletTransactions: encodeValue(transactions)
        }},
        updateMask: { fieldPaths: ["smsWalletBalance", "smsHistory", "smsWalletTransactions"] },
        currentDocument: { updateTime: mainDoc.data.updateTime }
      },
      { update: { name: docName(eventPath), fields: encodeFields(event) }, currentDocument: { exists: false } }
    ]);
  } catch (error) {
    if (error.status === 400 || error.status === 409) throw new Error("SMS_DEBIT_CONFLICT");
    throw error;
  }
  return event;
}
async function listWalletRechargeRequests(env, token, uid) {
  const docs = await listDocs(env, token, "users/" + encodeURIComponent(uid) + "/rechargeRequests");
  const current = docs.map(doc => decodeFields(doc.fields || {}));
  const legacyDoc = await fs(env, token, "users/" + encodeURIComponent(uid) + "/data/main", { allow404: true });
  const legacy = legacyDoc.status === 404 ? [] : (Array.isArray(decodeFields(legacyDoc.data.fields || {}).smsRechargeRequests) ? decodeFields(legacyDoc.data.fields || {}).smsRechargeRequests : [])
    .filter(item => !current.some(saved => String(saved.id) === String(item.id)))
    .map(item => ({ ...item, uid, legacy: true }));
  return current.concat(legacy).sort((a, b) => String(b.createdAt || b.date || "").localeCompare(String(a.createdAt || a.date || "")));
}
async function route(request, env) {
  const origin = request.headers.get("Origin") || "";
  const allowedOrigin = origin === ORIGIN || origin === "null" || origin === "http://localhost" || origin === "http://127.0.0.1" ? origin : ORIGIN;
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Authorization,Content-Type",
    "Vary": "Origin"
  }});
  const url = new URL(request.url);
  if (url.pathname === "/health" && request.method === "GET") {
    let serviceAccountConfigured = false;
    try {
      const account = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT || "{}");
      serviceAccountConfigured = !!(account.client_email && account.private_key);
    } catch (_) {}
    const configured = {
      firebaseApiKey: !!env.FIREBASE_API_KEY,
      firebaseProjectId: !!env.FIREBASE_PROJECT_ID,
      serviceAccount: serviceAccountConfigured
    };
    const ready = Object.values(configured).every(Boolean);
    return reply({ success: ready, service: "e24-hisab-admin", configured }, ready ? 200 : 503, allowedOrigin);
  }

  try {
    if (!env.FIREBASE_API_KEY || !env.FIREBASE_PROJECT_ID || !env.FIREBASE_SERVICE_ACCOUNT) {
      return reply({ success: false, error: "WORKER_CONFIG_MISSING" }, 500, allowedOrigin);
    }
    const caller = await verifyCaller(request, env);
    const token = await googleToken(env);
    if (url.pathname === "/wallet/recharge" && request.method === "POST") {
      if (!caller.emailVerified) throw new Error("EMAIL_NOT_VERIFIED");
      const body = await readJsonBody(request);
      const created = await createWalletRechargeRequest(env, token, caller.uid, body);
      return reply({ success: true, request: created }, 201, allowedOrigin);
    }
    if (url.pathname === "/wallet/test-sms" && request.method === "POST") {
      if (!caller.emailVerified) throw new Error("EMAIL_NOT_VERIFIED");
      const body = await readJsonBody(request);
      const result = await debitTestSms(env, token, caller.uid, body);
      return reply({ success: true, balance: result.balance, smsRecord: result.smsRecord, ledger: result.ledger }, 200, allowedOrigin);
    }
    if (url.pathname === "/wallet/recharge" && request.method === "GET") {
      const requests = await listWalletRechargeRequests(env, token, caller.uid);
      return reply({ success: true, requests }, 200, allowedOrigin);
    }
    const admin = await getAdmin(env, token, caller);
    const main = admin.role === "main";

    if (url.pathname === "/admin/me" && request.method === "GET") {
      return reply({ success: true, uid: caller.uid, role: admin.role, managedUsers: admin.managedUsers }, 200, allowedOrigin);
    }

    if (url.pathname === "/admin/users" && request.method === "GET") {
      if (admin.role === "limited") throw new Error("USER_MANAGEMENT_REQUIRED");
      let uids;
      if (admin.role === "limited") uids = admin.managedUsers.slice(0, 100);
      else uids = (await listDocs(env, token, "users")).map(d => d.name.split("/").pop());
      const users = [];
      for (const uid of uids) {
        try {
          const d = await fs(env, token, "users/" + encodeURIComponent(uid));
          users.push({ uid, profile: decodeFields(d.data.fields || {}) });
        } catch (e) { if (e.status !== 404) throw e; }
      }
      return reply({ success: true, users }, 200, allowedOrigin);
    }

    if (url.pathname === "/admin/roles" && request.method === "GET") {
      if (!main) throw new Error("MAIN_ADMIN_REQUIRED");
      const docs = await listDocs(env, token, "adminRoles");
      return reply({ success: true, roles: docs.map(d => ({ uid: d.name.split("/").pop(), ...decodeFields(d.fields || {}) })) }, 200, allowedOrigin);
    }

    if (url.pathname === "/admin/roles" && request.method === "PUT") {
      if (!main) throw new Error("MAIN_ADMIN_REQUIRED");
      const body = await readJsonBody(request);
      const uid = String(body.uid || "").trim();
      const role = String(body.role || "");
      const managedUsers = Array.isArray(body.managedUsers) ? [...new Set(body.managedUsers.map(String))].filter(x => x && x !== uid).slice(0, 100) : [];
      if (!uid || uid.length > 128 || uid === MAIN_UID || !["limited", "full", "none"].includes(role)) throw new Error("INVALID_ROLE_INPUT");
      // Only provision roles for existing E24 Hisab profiles.
      await fs(env, token, "users/" + encodeURIComponent(uid));
      for (const managedUid of managedUsers) await fs(env, token, "users/" + encodeURIComponent(managedUid));
      if (role === "none") {
        await fs(env, token, "adminRoles/" + encodeURIComponent(uid), { method: "DELETE", allow404: true });
      } else {
        await fs(env, token, "adminRoles/" + encodeURIComponent(uid), {
          method: "PATCH",
          body: { fields: encodeFields({ role, managedUsers: role === "limited" ? managedUsers : [], active: true, updatedAt: new Date().toISOString(), updatedBy: caller.uid }) }
        });
      }
      // Read back the saved document so the UI can confirm the actual persisted assignment.
      const savedRole = role === "none" ? null : await getRole(env, token, uid);
      if (role !== "none" && (!savedRole || savedRole.role !== role || (role === "limited" && JSON.stringify(savedRole.managedUsers || []) !== JSON.stringify(managedUsers)))) {
        throw new Error("ROLE_SAVE_VERIFICATION_FAILED");
      }
      return reply({ success: true, message: "ROLE_UPDATED", managedUsers: savedRole?.managedUsers || [], managedUsersCount: (savedRole?.managedUsers || []).length }, 200, allowedOrigin);
    }

    if (url.pathname === "/admin/recharge" && request.method === "GET") {
      if (!["main", "full", "limited"].includes(admin.role)) throw new Error("RECHARGE_ACCESS_REQUIRED");
      const uids = (await listDocs(env, token, "users")).map(d => d.name.split("/").pop());
      const requests = [];
      for (const uid of uids) {
        try {
          const docs = await listDocs(env, token, "users/" + encodeURIComponent(uid) + "/rechargeRequests");
          const profile = await fs(env, token, "users/" + encodeURIComponent(uid));
          const profileData = decodeFields(profile.data.fields || {});
          const newItems = docs.map(d => decodeFields(d.fields || {}));
          newItems.filter(x => String(x.status).toUpperCase() === "PENDING")
            .forEach(x => requests.push({ ...x, uid, email: admin.role === "limited" ? "" : (profileData.email || ""), customerName: profileData.name || "", legacy: false }));
          const ledgerResult = await fs(env, token, "users/" + encodeURIComponent(uid) + "/data/main", { allow404: true });
          if (ledgerResult.status !== 404) {
            const legacyItems = decodeFields(ledgerResult.data.fields || {}).smsRechargeRequests;
            (Array.isArray(legacyItems) ? legacyItems : [])
              .filter(x => String(x.status).toUpperCase() === "PENDING" && !newItems.some(n => String(n.id) === String(x.id)))
              .forEach(x => requests.push({ ...x, uid, email: admin.role === "limited" ? "" : (profileData.email || ""), customerName: profileData.name || "", legacy: true }));
          }
        } catch (e) { if (e.status !== 404) throw e; }
      }
      requests.sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
      return reply({ success: true, requests }, 200, allowedOrigin);
    }

    if (url.pathname === "/admin/recharge/action" && request.method === "POST") {
      if (!["main", "full", "limited"].includes(admin.role)) throw new Error("RECHARGE_ACCESS_REQUIRED");
      const body = await readJsonBody(request);
      const uid = String(body.uid || "");
      const requestId = String(body.requestId || "");
      const action = String(body.action || "");
      if (!/^[A-Za-z0-9_-]{1,128}$/.test(uid) || !/^[A-Za-z0-9_-]{5,80}$/.test(requestId) || !["approve", "cancel"].includes(action)) throw new Error("INVALID_REQUEST");
      if (admin.role === "limited" && action !== "approve") throw new Error("LIMITED_ADMIN_APPROVE_ONLY");

      const path = "users/" + encodeURIComponent(uid) + "/data/main";
      const requestPath = path.replace("/data/main", "/rechargeRequests/" + encodeURIComponent(requestId));
      let requestDoc;
      try { requestDoc = await fs(env, token, requestPath); }
      catch (lookupError) {
        if (lookupError.status !== 404) throw lookupError;
        if (action === "approve") throw new Error("LEGACY_REQUEST_REQUIRES_REVIEW");
        if (admin.role === "limited") throw new Error("LIMITED_ADMIN_APPROVE_ONLY");
        const legacyDoc = await fs(env, token, path);
        const legacyData = decodeFields(legacyDoc.data.fields || {});
        const legacyItems = Array.isArray(legacyData.smsRechargeRequests) ? legacyData.smsRechargeRequests : [];
        const legacyIndex = legacyItems.findIndex(x => String(x.id) === requestId && String(x.status).toUpperCase() === "PENDING");
        if (legacyIndex < 0) throw new Error("REQUEST_NOT_PENDING");
        legacyItems[legacyIndex] = { ...legacyItems[legacyIndex], status: "CANCELLED", cancelledAt: new Date().toLocaleString("bn-BD", { timeZone: "Asia/Dhaka" }), cancelledBy: caller.uid };
        await fs(env, token, path, { method: "PATCH", currentDocumentUpdateTime: legacyDoc.data.updateTime, body: { fields: { smsRechargeRequests: encodeValue(legacyItems) } } });
        return reply({ success: true, message: "REQUEST_CANCELLED" }, 200, allowedOrigin);
      }
      const req = decodeFields(requestDoc.data.fields || {});
      if (String(req.uid) !== uid || String(req.id) !== requestId || String(req.status).toUpperCase() !== "PENDING") throw new Error("REQUEST_NOT_PENDING");
      const doc = await fs(env, token, path);
      const data = decodeFields(doc.data.fields || {});
      if (action === "approve") {
        const amount = Number(req.amount);
        if (!Number.isFinite(amount) || amount < 10 || amount > 10000 || Math.round(amount * 100) !== amount * 100) throw new Error("INVALID_RECHARGE_AMOUNT");
        data.smsWalletBalance = Number((Number(data.smsWalletBalance) || 0) + amount).toFixed(2) * 1;
        data.smsWalletTransactions = Array.isArray(data.smsWalletTransactions) ? data.smsWalletTransactions : [];
        const approvedAt = new Date().toLocaleString("bn-BD", { timeZone: "Asia/Dhaka" });
        data.smsWalletTransactions.push({
          id: "RECHARGE-" + requestId, type: "CREDIT", mode: "MANUAL",
          amount, balanceAfter: data.smsWalletBalance,
          title: "Admin অনুমোদিত Manual Recharge", date: approvedAt, referenceId: requestId
        });
        data.smsWalletTransactions = data.smsWalletTransactions.slice(-300);
        const updatedRequest = { ...req, status: "APPROVED", approvedAt, approvedBy: caller.uid };
        const docName = path => "projects/" + env.FIREBASE_PROJECT_ID + "/databases/(default)/documents/" + path;
        const writes = [
          {
            update: { name: docName(path), fields: {
              smsWalletBalance: encodeValue(data.smsWalletBalance),
              smsWalletTransactions: encodeValue(data.smsWalletTransactions)
            }},
            updateMask: { fieldPaths: ["smsWalletBalance", "smsWalletTransactions"] },
            currentDocument: { updateTime: doc.data.updateTime }
          },
          {
            update: { name: docName(requestPath), fields: encodeFields(updatedRequest) },
            updateMask: { fieldPaths: Object.keys(updatedRequest) },
            currentDocument: { updateTime: requestDoc.data.updateTime }
          }
        ];
        writes.push(...await adminReferralRewardWrites(env, token, uid, new Date().toISOString()));
        await commitAdminWrites(env, token, writes);
      } else {
        if (admin.role === "limited") throw new Error("LIMITED_ADMIN_APPROVE_ONLY");
        const cancelledAt = new Date().toLocaleString("bn-BD", { timeZone: "Asia/Dhaka" });
        await fs(env, token, requestPath, {
          method: "PATCH", currentDocumentUpdateTime: requestDoc.data.updateTime,
          body: { fields: encodeFields({ ...req, status: "CANCELLED", cancelledAt, cancelledBy: caller.uid }) }
        });
      }
      return reply({ success: true, message: action === "approve" ? "RECHARGE_APPROVED" : "REQUEST_CANCELLED" }, 200, allowedOrigin);
    }

    const del = url.pathname.match(/^\/admin\/users\/([^/]+)$/);
    if (del && request.method === "DELETE") {
      if (!main) throw new Error("MAIN_ADMIN_REQUIRED");
      const uid = decodeURIComponent(del[1]);
      if (!uid || uid === MAIN_UID || uid === caller.uid) throw new Error("CANNOT_DELETE_MAIN_ADMIN");
      // Delete Firebase Authentication first. If a later Firestore cleanup fails,
      // a retry by Main Admin can continue; USER_NOT_FOUND is treated as already deleted.
      const authDelete = await fetch("https://identitytoolkit.googleapis.com/v1/projects/" + encodeURIComponent(env.FIREBASE_PROJECT_ID) + "/accounts:delete", {
        method: "POST",
        headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
        body: JSON.stringify({ localId: uid })
      });
      if (!authDelete.ok) {
        let authError = {};
        try { authError = await authDelete.json(); } catch (_) {}
        const reason = String(authError.error?.message || "");
        if (!reason.includes("USER_NOT_FOUND")) throw new Error("AUTH_USER_DELETE_FAILED");
      }
      await deleteDocumentTree(env, token, "users/" + encodeURIComponent(uid) + "/data/main");
      await deleteDocumentTree(env, token, "users/" + encodeURIComponent(uid));
      await fs(env, token, "adminRoles/" + encodeURIComponent(uid), { method: "DELETE", allow404: true });
      return reply({ success: true, message: "USER_DELETED" }, 200, allowedOrigin);
    }

    return reply({ success: false, error: "NOT_FOUND" }, 404, allowedOrigin);
  } catch (e) {
    const allowed = ["AUTH_REQUIRED","INVALID_TOKEN","EMAIL_NOT_VERIFIED","ADMIN_REQUIRED","MAIN_ADMIN_REQUIRED","INVALID_ROLE_INPUT","USER_NOT_ASSIGNED","USER_MANAGEMENT_REQUIRED","INVALID_REQUEST","REQUEST_NOT_PENDING","INVALID_RECHARGE_AMOUNT","INVALID_PAYMENT_METHOD","INVALID_TRANSACTION_ID","DUPLICATE_TRX","TOO_MANY_PENDING_REQUESTS","REQUEST_TOO_LARGE","INVALID_JSON","LEGACY_REQUEST_REQUIRES_REVIEW","LIMITED_ADMIN_APPROVE_ONLY","INVALID_SMS_REQUEST","LOW_BALANCE","SMS_DEBIT_CONFLICT","CANNOT_DELETE_MAIN_ADMIN","AUTH_USER_DELETE_FAILED"];
    const message = allowed.includes(e.message) ? e.message : "ADMIN_API_ERROR";
    const status = ["AUTH_REQUIRED","INVALID_TOKEN","EMAIL_NOT_VERIFIED"].includes(message) ? 401 :
      ["ADMIN_REQUIRED","MAIN_ADMIN_REQUIRED","USER_MANAGEMENT_REQUIRED","USER_NOT_ASSIGNED"].includes(message) ? 403 : 400;
    return reply({ success: false, error: message }, status, allowedOrigin);
  }
}

export default { fetch(request, env) { return route(request, env); } };
