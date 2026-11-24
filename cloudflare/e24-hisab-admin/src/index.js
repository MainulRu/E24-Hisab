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

async function verifyCaller(request, env) {
  const bearer = (request.headers.get("Authorization") || "").match(/^Bearer\s+(.+)$/i);
  if (!bearer) throw new Error("AUTH_REQUIRED");
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
  if (!referrerUid || referred.referralRewardPaid === true) return [];
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
  return [{
    update: { name: docName(referredPath), fields: {
      referralRewardPaid: { booleanValue: true }, referralRewardedAt: { timestampValue: now }
    }},
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
  },{
    update: { name: docName(refMainPath), fields: {
      smsWalletBalance: encodeValue(nextBalance),
      smsWalletTransactions: encodeValue((Array.isArray(refMain.smsWalletTransactions) ? refMain.smsWalletTransactions : []).concat([ledger]).slice(-300)),
      updatedAt: { timestampValue: now }
    }},
    updateMask: { fieldPaths: ["smsWalletBalance", "smsWalletTransactions", "updatedAt"] },
    ...(refMainDoc ? { currentDocument: { updateTime: refMainDoc.updateTime } } : { currentDocument: { exists: false } })
  },{
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
      const body = await request.json();
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
          const ledger = await fs(env, token, "users/" + encodeURIComponent(uid) + "/data/main");
          const data = decodeFields(ledger.data.fields || {});
          const profile = await fs(env, token, "users/" + encodeURIComponent(uid));
          (Array.isArray(data.smsRechargeRequests) ? data.smsRechargeRequests : [])
            .filter(x => String(x.status).toUpperCase() === "PENDING")
            .forEach(x => requests.push({ ...x, uid, email: decodeFields(profile.data.fields || {}).email || "" }));
        } catch (e) { if (e.status !== 404) throw e; }
      }
      requests.sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
      return reply({ success: true, requests }, 200, allowedOrigin);
    }

    if (url.pathname === "/admin/recharge/action" && request.method === "POST") {
      if (!["main", "full", "limited"].includes(admin.role)) throw new Error("RECHARGE_ACCESS_REQUIRED");
      const body = await request.json();
      const uid = String(body.uid || "");
      const requestId = String(body.requestId || "");
      const action = String(body.action || "");
      if (!uid || !requestId || !["approve", "cancel"].includes(action)) throw new Error("INVALID_REQUEST");
      if (admin.role === "limited" && action !== "approve") throw new Error("LIMITED_ADMIN_APPROVE_ONLY");

      const path = "users/" + encodeURIComponent(uid) + "/data/main";
      const doc = await fs(env, token, path);
      const data = decodeFields(doc.data.fields || {});
      const items = Array.isArray(data.smsRechargeRequests) ? data.smsRechargeRequests : [];
      const i = items.findIndex(x => String(x.id) === requestId && String(x.status).toUpperCase() === "PENDING");
      if (i < 0) throw new Error("REQUEST_NOT_PENDING");
      const req = items[i];
      if (action === "approve") {
        const amount = Number(req.amount);
        if (!Number.isFinite(amount) || amount <= 0 || amount > 100000) throw new Error("INVALID_RECHARGE_AMOUNT");
        data.smsWalletBalance = (Number(data.smsWalletBalance) || 0) + amount;
        data.smsWalletTransactions = Array.isArray(data.smsWalletTransactions) ? data.smsWalletTransactions : [];
        const approvedAt = new Date().toLocaleString("bn-BD");
        data.smsWalletTransactions.push({
          id: "RECHARGE-" + requestId, type: "CREDIT",
          mode: req.mode === "MANUAL" ? "MANUAL" : "TEST",
          amount, balanceAfter: data.smsWalletBalance,
          title: "Admin অনুমোদিত Manual Recharge", date: approvedAt,
          referenceId: requestId
        });
        items[i] = { ...req, status: "APPROVED", approvedAt, approvedBy: caller.uid };
      } else {
        const cancelledAt = new Date().toLocaleString("bn-BD");
        items[i] = { ...req, status: "CANCELLED", cancelledAt, cancelledBy: caller.uid };
      }
      data.smsRechargeRequests = items;
      if (action === "approve") {
        const now = new Date().toISOString();
        const docName = "projects/" + env.FIREBASE_PROJECT_ID + "/databases/(default)/documents/" + path;
        const writes = [{
          update: { name: docName, fields: {
            smsWalletBalance: encodeValue(data.smsWalletBalance),
            smsWalletTransactions: encodeValue(data.smsWalletTransactions),
            smsRechargeRequests: encodeValue(data.smsRechargeRequests)
          }},
          updateMask: { fieldPaths: ["smsWalletBalance", "smsWalletTransactions", "smsRechargeRequests"] },
          currentDocument: { updateTime: doc.data.updateTime }
        }];
        writes.push(...await adminReferralRewardWrites(env, token, uid, now));
        await commitAdminWrites(env, token, writes);
      } else {
        await fs(env, token, path, { method: "PATCH", currentDocumentUpdateTime: doc.data.updateTime, body: { fields: encodeFields(data) } });
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
    const allowed = ["AUTH_REQUIRED","INVALID_TOKEN","EMAIL_NOT_VERIFIED","ADMIN_REQUIRED","MAIN_ADMIN_REQUIRED","INVALID_ROLE_INPUT","USER_NOT_ASSIGNED","USER_MANAGEMENT_REQUIRED","INVALID_REQUEST","REQUEST_NOT_PENDING","INVALID_RECHARGE_AMOUNT","CANNOT_DELETE_MAIN_ADMIN","AUTH_USER_DELETE_FAILED"];
    const message = allowed.includes(e.message) ? e.message : "ADMIN_API_ERROR";
    const status = ["AUTH_REQUIRED","INVALID_TOKEN","EMAIL_NOT_VERIFIED"].includes(message) ? 401 :
      ["ADMIN_REQUIRED","MAIN_ADMIN_REQUIRED","USER_MANAGEMENT_REQUIRED","USER_NOT_ASSIGNED"].includes(message) ? 403 : 400;
    return reply({ success: false, error: message }, status, allowedOrigin);
  }
}

export default { fetch(request, env) { return route(request, env); } };
