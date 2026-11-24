var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// worker.js
var OTP_TTL = 300;
var RESEND_WAIT = 60;
var MAX_ATTEMPTS = 5;
var MOBILE_OTP_ENABLED = false;
function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization"
    }
  });
}
__name(json, "json");
function generateOTP() {
  const array = new Uint32Array(1);
  const limit = Math.floor(4294967296 / 1e6) * 1e6;
  let value;
  do {
    crypto.getRandomValues(array);
    value = array[0];
  } while (value >= limit);
  return String(value % 1e6).padStart(6, "0");
}
__name(generateOTP, "generateOTP");
async function hashOTP(value) {
  const data = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
__name(hashOTP, "hashOTP");
function base64UrlBytes(bytes) {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
__name(base64UrlBytes, "base64UrlBytes");
function base64UrlText(value) {
  return base64UrlBytes(new TextEncoder().encode(value));
}
__name(base64UrlText, "base64UrlText");
function pemToArrayBuffer(pem) {
  const base64 = pem.replace(/-----BEGIN PRIVATE KEY-----/g, "").replace(/-----END PRIVATE KEY-----/g, "").replace(/\s/g, "");
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}
__name(pemToArrayBuffer, "pemToArrayBuffer");
var cachedAdminToken = null;
var cachedAdminTokenExpiresAt = 0;
async function getFirebaseAdminAccessToken(env) {
  const now = Math.floor(Date.now() / 1e3);
  if (cachedAdminToken && cachedAdminTokenExpiresAt > now + 60) {
    return cachedAdminToken;
  }
  let serviceAccount;
  try {
    serviceAccount = JSON.parse(
      env.FIREBASE_SERVICE_ACCOUNT || ""
    );
  } catch {
    throw new Error("Invalid Firebase service account JSON.");
  }
  if (!serviceAccount.client_email || !serviceAccount.private_key || !serviceAccount.project_id) {
    throw new Error("Firebase service account fields missing.");
  }
  const header = base64UrlText(JSON.stringify({
    alg: "RS256",
    typ: "JWT"
  }));
  const claims = base64UrlText(JSON.stringify({
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/identitytoolkit",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600
  }));
  const unsignedJwt = `${header}.${claims}`;
  const privateKey = await crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(serviceAccount.private_key),
    {
      name: "RSASSA-PKCS1-v1_5",
      hash: "SHA-256"
    },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    privateKey,
    new TextEncoder().encode(unsignedJwt)
  );
  const assertion = `${unsignedJwt}.${base64UrlBytes(new Uint8Array(signature))}`;
  const tokenResponse = await fetch(
    "https://oauth2.googleapis.com/token",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion
      })
    }
  );
  const tokenData = await tokenResponse.json().catch(() => ({}));
  if (!tokenResponse.ok || !tokenData.access_token) {
    throw new Error("Firebase Admin access token failed.");
  }
  cachedAdminToken = tokenData.access_token;
  cachedAdminTokenExpiresAt = now + Number(tokenData.expires_in || 3600);
  return cachedAdminToken;
}
__name(getFirebaseAdminAccessToken, "getFirebaseAdminAccessToken");
async function getAuthenticatedFirebaseUser(request, env) {
  const authorization = request.headers.get("Authorization") || "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    return {
      error: json({
        success: false,
        message: "Firebase ID token required."
      }, 401)
    };
  }
  if (!env.FIREBASE_WEB_API_KEY) {
    return {
      error: json({
        success: false,
        message: "Firebase API Key is not configured."
      }, 500)
    };
  }
  const response = await fetch(
    "https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=" + encodeURIComponent(env.FIREBASE_WEB_API_KEY),
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        idToken: match[1]
      })
    }
  );
  const data = await response.json().catch(() => ({}));
  const firebaseUser = data.users?.[0];
  if (!response.ok || !firebaseUser || !firebaseUser.localId || !firebaseUser.email) {
    console.error("Firebase accounts:lookup failed:", {
      status: response.status,
      error: data.error?.message || "Unknown Firebase error"
    });
    return {
      error: json({
        success: false,
        message: "Invalid or expired Firebase session."
      }, 401)
    };
    return {
      error: json({
        success: false,
        message: "Invalid or expired Firebase session."
      }, 401)
    };
  }
  return {
    user: {
      uid: firebaseUser.localId,
      email: String(firebaseUser.email).trim().toLowerCase(),
      emailVerified: firebaseUser.emailVerified === true
    }
  };
}
__name(getAuthenticatedFirebaseUser, "getAuthenticatedFirebaseUser");
async function markFirebaseEmailVerified(env, uid) {
  const accessToken = await getFirebaseAdminAccessToken(env);
  const serviceAccount = JSON.parse(
    env.FIREBASE_SERVICE_ACCOUNT
  );
  const projectId = serviceAccount.project_id;
  const response = await fetch(
    "https://identitytoolkit.googleapis.com/v1/projects/" + encodeURIComponent(projectId) + "/accounts:update",
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        localId: uid,
        emailVerified: true
      })
    }
  );
  if (!response.ok) {
    throw new Error(
      `Firebase account update failed: HTTP ${response.status}`
    );
  }
}
__name(markFirebaseEmailVerified, "markFirebaseEmailVerified");
async function sendBrevoEmailOTP(env, email, otp) {
  if (!env.BREVO_API_KEY || !env.BREVO_SENDER_EMAIL) {
    throw new Error("Brevo configuration missing.");
  }
  const response = await fetch(
    "https://api.brevo.com/v3/smtp/email",
    {
      method: "POST",
      headers: {
        "accept": "application/json",
        "api-key": env.BREVO_API_KEY,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        sender: {
          name: "E24 Hisab",
          email: env.BREVO_SENDER_EMAIL
        },
        to: [{ email }],
        subject: "E24 Hisab - Email Verification Code",
        htmlContent: `
          <div style="
            font-family:Arial,sans-serif;
            max-width:520px;
            margin:auto;
            padding:24px;
            color:#333;
          ">
            <h2 style="color:#087a35">E24 Hisab</h2>

            <p>Your email verification code is:</p>

            <div style="
              font-size:32px;
              font-weight:bold;
              letter-spacing:8px;
              padding:16px 0;
              color:#087a35;
            ">${otp}</div>

            <p>This code expires in 5 minutes.</p>

            <p>Do not share this code with anyone.</p>
          </div>
        `
      })
    }
  );
  if (!response.ok) {
    const errorDetails = await response.text();
    console.error("Brevo API error details:", {
      status: response.status,
      statusText: response.statusText,
      contentType: response.headers.get("content-type"),
      requestId: response.headers.get("x-request-id"),
      details: errorDetails
    });
    throw new Error(
      `Brevo email request failed: HTTP ${response.status}`
    );
  }
}
__name(sendBrevoEmailOTP, "sendBrevoEmailOTP");
async function handleSendEmailOTP(request, env) {
  const auth = await getAuthenticatedFirebaseUser(request, env);
  if (auth.error) return auth.error;
  const user = auth.user;
  if (user.emailVerified) {
    return json({
      success: true,
      verified: true,
      message: "Email is already verified."
    });
  }
  if (!env.E24_HISAB_OTP_DB) {
    return json({
      success: false,
      message: "OTP database is not configured."
    }, 500);
  }
  const now = Math.floor(Date.now() / 1e3);
  const existing = await env.E24_HISAB_OTP_DB.prepare(
    "SELECT last_sent_at FROM verification_otps WHERE uid = ? AND channel = 'email'"
  ).bind(user.uid).first();
  if (existing && now - Number(existing.last_sent_at) < RESEND_WAIT) {
    return json({
      success: false,
      message: "Please wait before requesting another code.",
      retryAfter: RESEND_WAIT - (now - Number(existing.last_sent_at))
    }, 429);
  }
  const otp = generateOTP();
  const otpHash = await hashOTP(
    `${user.uid}:email:${user.email}:${otp}`
  );
  await env.E24_HISAB_OTP_DB.prepare(`
    INSERT INTO verification_otps
    (
      uid,
      channel,
      destination,
      otp_hash,
      created_at,
      expires_at,
      attempts,
      last_sent_at
    )
    VALUES (?, 'email', ?, ?, ?, ?, 0, ?)

    ON CONFLICT(uid, channel)
    DO UPDATE SET
      destination = excluded.destination,
      otp_hash = excluded.otp_hash,
      created_at = excluded.created_at,
      expires_at = excluded.expires_at,
      attempts = 0,
      last_sent_at = excluded.last_sent_at
  `).bind(
    user.uid,
    user.email,
    otpHash,
    now,
    now + OTP_TTL,
    now
  ).run();
  try {
    await sendBrevoEmailOTP(
      env,
      user.email,
      otp
    );
  } catch (error) {
    console.error("Brevo email sending failed:", error.message);
    await env.E24_HISAB_OTP_DB.prepare(
      "DELETE FROM verification_otps WHERE uid = ? AND channel = 'email'"
    ).bind(user.uid).run();
    return json({
      success: false,
      message: "Email could not be sent. Please try again later."
    }, 502);
  }
  return json({
    success: true,
    message: "Verification code sent to your email.",
    expiresIn: OTP_TTL,
    resendAfter: RESEND_WAIT
  });
}
__name(handleSendEmailOTP, "handleSendEmailOTP");
async function handleVerifyEmailOTP(request, env) {
  const auth = await getAuthenticatedFirebaseUser(request, env);
  if (auth.error) return auth.error;
  const user = auth.user;
  if (user.emailVerified) {
    return json({
      success: true,
      verified: true,
      message: "Email is already verified."
    });
  }
  const body = await request.json().catch(() => ({}));
  const otp = String(body.otp || "").trim();
  if (!/^\d{6}$/.test(otp)) {
    return json({
      success: false,
      message: "Enter the 6-digit verification code."
    }, 400);
  }
  if (!env.E24_HISAB_OTP_DB) {
    return json({
      success: false,
      message: "OTP database is not configured."
    }, 500);
  }
  const record = await env.E24_HISAB_OTP_DB.prepare(`
      SELECT
        destination,
        otp_hash,
        created_at,
        expires_at,
        attempts
      FROM verification_otps
      WHERE uid = ? AND channel = 'email'
    `).bind(user.uid).first();
  const now = Math.floor(Date.now() / 1e3);
  if (!record || Number(record.expires_at) <= now || record.destination !== user.email) {
    await env.E24_HISAB_OTP_DB.prepare(
      "DELETE FROM verification_otps WHERE uid = ? AND channel = 'email'"
    ).bind(user.uid).run();
    return json({
      success: false,
      message: "Code is invalid or has expired. Request a new code."
    }, 400);
  }
  if (Number(record.attempts) >= MAX_ATTEMPTS) {
    await env.E24_HISAB_OTP_DB.prepare(
      "DELETE FROM verification_otps WHERE uid = ? AND channel = 'email'"
    ).bind(user.uid).run();
    return json({
      success: false,
      message: "Too many attempts. Request a new code."
    }, 429);
  }
  const suppliedHash = await hashOTP(
    `${user.uid}:email:${user.email}:${otp}`
  );
  if (suppliedHash !== record.otp_hash) {
    const attempts = Number(record.attempts) + 1;
    if (attempts >= MAX_ATTEMPTS) {
      await env.E24_HISAB_OTP_DB.prepare(
        "DELETE FROM verification_otps WHERE uid = ? AND channel = 'email'"
      ).bind(user.uid).run();
      return json({
        success: false,
        message: "Too many incorrect attempts. Request a new code."
      }, 429);
    }
    await env.E24_HISAB_OTP_DB.prepare(`
        UPDATE verification_otps
        SET attempts = ?
        WHERE uid = ? AND channel = 'email'
      `).bind(attempts, user.uid).run();
    return json({
      success: false,
      message: "Incorrect verification code.",
      attemptsRemaining: MAX_ATTEMPTS - attempts
    }, 400);
  }
  try {
    await markFirebaseEmailVerified(
      env,
      user.uid
    );
  } catch (error) {
    console.error(
      "Firebase verification update failed:",
      error.message
    );
    return json({
      success: false,
      message: "Code is correct, but Firebase verification update failed. Please retry."
    }, 502);
  }
  await env.E24_HISAB_OTP_DB.prepare(
    "DELETE FROM verification_otps WHERE uid = ? AND channel = 'email'"
  ).bind(user.uid).run();
  return json({
    success: true,
    verified: true,
    emailVerified: true,
    message: "Email verified successfully."
  });
}
__name(handleVerifyEmailOTP, "handleVerifyEmailOTP");

async function handleRegistrationSendEmailOTP(request, env) {
  if (!env.E24_HISAB_OTP_DB) return json({ success:false, message:"OTP database is not configured." },500);
  const body=await request.json().catch(()=>({}));
  const email=String(body.email||"").trim().toLowerCase();
  if(!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email)) return json({success:false,message:"সঠিক Email Address লিখুন।"},400);
  const db=env.E24_HISAB_OTP_DB;
  await db.prepare(`CREATE TABLE IF NOT EXISTS pending_registration_otps (
    email TEXT PRIMARY KEY, otp_hash TEXT NOT NULL, created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL, attempts INTEGER NOT NULL DEFAULT 0,
    last_sent_at INTEGER NOT NULL
  )`).run();
  const now=Math.floor(Date.now()/1e3);
  const old=await db.prepare("SELECT last_sent_at FROM pending_registration_otps WHERE email=?").bind(email).first();
  if(old && now-Number(old.last_sent_at)<RESEND_WAIT) return json({success:false,message:"একটু অপেক্ষা করে আবার OTP চান।",retryAfter:RESEND_WAIT-(now-Number(old.last_sent_at))},429);
  const otp=generateOTP();
  const otpHash=await hashOTP("e24-registration:"+email+":"+otp);
  await db.prepare(`INSERT INTO pending_registration_otps(email,otp_hash,created_at,expires_at,attempts,last_sent_at)
    VALUES(?,?,?,?,0,?) ON CONFLICT(email) DO UPDATE SET otp_hash=excluded.otp_hash,
    created_at=excluded.created_at,expires_at=excluded.expires_at,attempts=0,last_sent_at=excluded.last_sent_at`)
    .bind(email,otpHash,now,now+OTP_TTL,now).run();
  try { await sendBrevoEmailOTP(env,email,otp); }
  catch(error) {
    console.error("Registration OTP email failed:",error.message);
    await db.prepare("DELETE FROM pending_registration_otps WHERE email=?").bind(email).run();
    return json({success:false,message:"Email-এ OTP পাঠানো যায়নি। পরে আবার চেষ্টা করুন।"},502);
  }
  return json({success:true,message:"Verification code sent.",expiresIn:OTP_TTL,resendAfter:RESEND_WAIT});
}
async function handleRegistrationVerifyEmailOTP(request, env) {
  if (!env.E24_HISAB_OTP_DB) return json({success:false,message:"OTP database is not configured."},500);
  const body=await request.json().catch(()=>({}));
  const email=String(body.email||"").trim().toLowerCase();
  const otp=String(body.otp||"").trim();
  const password=String(body.password||"");
  if(!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email) || !/^\\d{6}$/.test(otp)) return json({success:false,message:"Email ও ৬ সংখ্যার OTP সঠিকভাবে দিন।"},400);
  if(password.length<6 || password.length>128) return json({success:false,message:"Password কমপক্ষে ৬ অক্ষরের হতে হবে।"},400);
  const db=env.E24_HISAB_OTP_DB;
  await db.prepare(`CREATE TABLE IF NOT EXISTS pending_registration_otps (
    email TEXT PRIMARY KEY, otp_hash TEXT NOT NULL, created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL, attempts INTEGER NOT NULL DEFAULT 0,
    last_sent_at INTEGER NOT NULL
  )`).run();
  const rec=await db.prepare("SELECT otp_hash,expires_at,attempts FROM pending_registration_otps WHERE email=?").bind(email).first();
  const now=Math.floor(Date.now()/1e3);
  if(!rec || Number(rec.expires_at)<=now) {
    await db.prepare("DELETE FROM pending_registration_otps WHERE email=?").bind(email).run();
    return json({success:false,message:"OTP ভুল অথবা মেয়াদ শেষ। নতুন OTP নিন।"},400);
  }
  if(Number(rec.attempts)>=MAX_ATTEMPTS) {
    await db.prepare("DELETE FROM pending_registration_otps WHERE email=?").bind(email).run();
    return json({success:false,message:"অনেকবার ভুল OTP দেওয়া হয়েছে। নতুন OTP নিন।"},429);
  }
  const supplied=await hashOTP("e24-registration:"+email+":"+otp);
  if(supplied!==rec.otp_hash) {
    const attempts=Number(rec.attempts)+1;
    if(attempts>=MAX_ATTEMPTS) await db.prepare("DELETE FROM pending_registration_otps WHERE email=?").bind(email).run();
    else await db.prepare("UPDATE pending_registration_otps SET attempts=? WHERE email=?").bind(attempts,email).run();
    return json({success:false,message:"OTP সঠিক নয়।",attemptsRemaining:Math.max(0,MAX_ATTEMPTS-attempts)},400);
  }
  const apiKey=env.FIREBASE_WEB_API_KEY || "AIzaSyAupETzeBR2x7Jz0PG7HbzLihgr4b5taQQ";
  let signup;
  try {
    const response=await fetch("https://identitytoolkit.googleapis.com/v1/accounts:signUp?key="+encodeURIComponent(apiKey),{
      method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({email,password,returnSecureToken:true})
    });
    signup=await response.json().catch(()=>({}));
    if(!response.ok || !signup.localId) {
      const code=String(signup.error?.message||"");
      if(code==="EMAIL_EXISTS") return json({success:false,message:"এই Email দিয়ে আগে থেকেই অ্যাকাউন্ট আছে। Login করুন অথবা Password Reset করুন।"},409);
      console.error("Firebase registration failed:",code||response.status);
      return json({success:false,message:"Firebase অ্যাকাউন্ট তৈরি করা যায়নি। আবার চেষ্টা করুন।"},502);
    }
    await markFirebaseEmailVerified(env,signup.localId);
  } catch(error) {
    console.error("Verified registration failed:",error.message);
    if(signup?.localId) {
      try {
        const token=await getFirebaseAdminAccessToken(env);
        const service=JSON.parse(env.FIREBASE_SERVICE_ACCOUNT);
        await fetch("https://identitytoolkit.googleapis.com/v1/accounts:delete?key="+encodeURIComponent(apiKey),{
          method:"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer "+token},
          body:JSON.stringify({localId:signup.localId})
        });
      } catch(cleanupError) { console.error("Registration rollback failed:",cleanupError.message); }
    }
    return json({success:false,message:"Email verification সম্পন্ন করা যায়নি। OTP আবার যাচাই করে চেষ্টা করুন।"},502);
  }
  await db.prepare("DELETE FROM pending_registration_otps WHERE email=?").bind(email).run();
  return json({success:true,verified:true,email:email,message:"Email verified and account created."});
}

function normalizePhone(phone) {
  let p = String(phone || "").replace(/[\s\-()]/g, "");
  if (p.startsWith("01") && p.length === 11) {
    p = "+88" + p;
  }
  if (p.startsWith("8801") && p.length === 13) {
    p = "+" + p;
  }
  return /^\+8801[3-9]\d{8}$/.test(p) ? p : null;
}
__name(normalizePhone, "normalizePhone");
var OtpStorage = class {
  static {
    __name(this, "OtpStorage");
  }
  constructor(ctx, env) {
    this.ctx = ctx;
    this.env = env;
  }
  async fetch(request) {
    if (!MOBILE_OTP_ENABLED) {
      return json({
        success: false,
        message: "Mobile OTP is currently disabled."
      }, 403);
    }
    const url = new URL(request.url);
    const phone = url.searchParams.get("phone");
    const key = "otp";
    if (!phone) {
      return json({
        success: false,
        message: "Phone required."
      }, 400);
    }
    if (url.pathname === "/send" && request.method === "POST") {
      const previous = await this.ctx.storage.get(key);
      const now = Math.floor(Date.now() / 1e3);
      if (previous && now - previous.createdAt < RESEND_WAIT) {
        return json({
          success: false,
          message: "Please wait before requesting another code."
        }, 429);
      }
      if (!this.env.NISHCHIT_API_KEY) {
        return json({
          success: false,
          message: "SMS provider is not configured."
        }, 500);
      }
      const otp = generateOTP();
      const otpHash = await hashOTP(phone + ":" + otp);
      const isTestMode = this.env.NISHCHIT_API_KEY.startsWith("nk_test_");
      let smsResponse;
      try {
        smsResponse = await fetch(
          "https://api.nishchit.tech/v1/messages",
          {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${this.env.NISHCHIT_API_KEY}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              to: phone,
              body: `E24 Hisab verification code: ${otp}. Valid for 5 minutes.`
            })
          }
        );
      } catch {
        return json({
          success: false,
          message: "SMS service connection failed."
        }, 502);
      }
      if (!smsResponse.ok) {
        return json({
          success: false,
          message: "SMS API request failed."
        }, 502);
      }
      await this.ctx.storage.put(key, {
        hash: otpHash,
        createdAt: now,
        attempts: 0
      });
      await this.ctx.storage.setAlarm(
        Date.now() + OTP_TTL * 1e3
      );
      return json({
        success: true,
        expiresIn: OTP_TTL,
        testMode: isTestMode,
        ...isTestMode ? { testOtp: otp } : {}
      });
    }
    if (url.pathname === "/verify" && request.method === "POST") {
      const body = await request.json().catch(() => ({}));
      const otp = String(body.otp || "");
      if (!/^\d{6}$/.test(otp)) {
        return json({
          success: false,
          message: "Enter the 6-digit OTP."
        }, 400);
      }
      const record = await this.ctx.storage.get(key);
      const now = Math.floor(Date.now() / 1e3);
      if (!record || now - record.createdAt >= OTP_TTL) {
        await this.ctx.storage.delete(key);
        return json({
          success: false,
          message: "OTP is missing or expired."
        }, 400);
      }
      if (record.attempts >= MAX_ATTEMPTS) {
        await this.ctx.storage.delete(key);
        return json({
          success: false,
          message: "Too many attempts. Request a new OTP."
        }, 429);
      }
      const suppliedHash = await hashOTP(phone + ":" + otp);
      if (suppliedHash !== record.hash) {
        record.attempts++;
        await this.ctx.storage.put(key, record);
        return json({
          success: false,
          message: "Incorrect OTP.",
          attemptsRemaining: MAX_ATTEMPTS - record.attempts
        }, 400);
      }
      await this.ctx.storage.delete(key);
      await this.ctx.storage.deleteAlarm();
      return json({
        success: true,
        verified: true
      });
    }
    return json({
      success: false,
      message: "Endpoint not found."
    }, 404);
  }
  async alarm() {
    await this.ctx.storage.delete("otp");
  }
};

// Password reset uses a separate table and endpoints. Existing email-verification OTP remains unchanged.
var PASSWORD_RESET_TOKEN_TTL = 600;
function generateResetToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return base64UrlBytes(bytes);
}
async function getFirebaseUserByEmail(env, email) {
  const accessToken = await getFirebaseAdminAccessToken(env);
  const serviceAccount = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT);
  const projectId = serviceAccount.project_id;
  const response = await fetch(
    "https://identitytoolkit.googleapis.com/v1/projects/" + encodeURIComponent(projectId) + "/accounts:lookup",
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ email: [email] })
    }
  );
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    console.error("Firebase password-reset lookup failed:", response.status, data.error?.message || "Unknown error");
    throw new Error("Firebase account lookup failed.");
  }
  const user = data.users?.find((item) => String(item.email || "").trim().toLowerCase() === email);
  return user && user.localId ? { uid: user.localId, email } : null;
}
async function ensurePasswordResetTable(db) {
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS password_reset_otps (
      email TEXT PRIMARY KEY,
      uid TEXT NOT NULL,
      otp_hash TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      last_sent_at INTEGER NOT NULL,
      reset_token_hash TEXT,
      reset_token_expires_at INTEGER,
      verified_at INTEGER
    )
  `).run();
}
async function sendBrevoPasswordResetOTP(env, email, otp) {
  if (!env.BREVO_API_KEY || !env.BREVO_SENDER_EMAIL) throw new Error("Brevo configuration missing.");
  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "accept": "application/json",
      "api-key": env.BREVO_API_KEY,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      sender: { name: "E24 Hisab", email: env.BREVO_SENDER_EMAIL },
      to: [{ email }],
      subject: "E24 Hisab - Password Reset Code",
      htmlContent: `
        <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:24px;color:#333">
          <h2 style="color:#087a35">E24 Hisab</h2>
          <p>Your password reset verification code is:</p>
          <div style="font-size:32px;font-weight:bold;letter-spacing:8px;padding:16px 0;color:#087a35">${otp}</div>
          <p>This code expires in 5 minutes.</p>
          <p>If you did not request a password reset, you can ignore this email. Do not share this code with anyone.</p>
        </div>`
    })
  });
  if (!response.ok) {
    const details = await response.text();
    console.error("Brevo password-reset email failed:", response.status, details);
    throw new Error(`Brevo password reset email failed: HTTP ${response.status}`);
  }
}
function passwordResetGenericResponse() {
  return json({
    success: true,
    message: "If an account exists for this email, a password reset code has been sent."
  });
}
async function handlePasswordResetSend(request, env) {
  const body = await request.json().catch(() => ({}));
  const email = String(body.email || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    return json({ success: false, message: "Enter a valid email address." }, 400);
  }
  if (!env.E24_HISAB_OTP_DB) {
    return json({ success: false, message: "OTP database is not configured." }, 500);
  }
  await ensurePasswordResetTable(env.E24_HISAB_OTP_DB);
  const user = await getFirebaseUserByEmail(env, email);
  if (!user) return passwordResetGenericResponse();
  const now = Math.floor(Date.now() / 1e3);
  const existing = await env.E24_HISAB_OTP_DB.prepare(
    "SELECT last_sent_at FROM password_reset_otps WHERE email = ?"
  ).bind(email).first();
  if (existing && now - Number(existing.last_sent_at) < RESEND_WAIT) {
    return passwordResetGenericResponse();
  }
  const otp = generateOTP();
  const otpHash = await hashOTP(`${user.uid}:password-reset:${email}:${otp}`);
  await env.E24_HISAB_OTP_DB.prepare(`
    INSERT INTO password_reset_otps
      (email, uid, otp_hash, created_at, expires_at, attempts, last_sent_at, reset_token_hash, reset_token_expires_at, verified_at)
    VALUES (?, ?, ?, ?, ?, 0, ?, NULL, NULL, NULL)
    ON CONFLICT(email) DO UPDATE SET
      uid = excluded.uid,
      otp_hash = excluded.otp_hash,
      created_at = excluded.created_at,
      expires_at = excluded.expires_at,
      attempts = 0,
      last_sent_at = excluded.last_sent_at,
      reset_token_hash = NULL,
      reset_token_expires_at = NULL,
      verified_at = NULL
  `).bind(email, user.uid, otpHash, now, now + OTP_TTL, now).run();
  try {
    await sendBrevoPasswordResetOTP(env, email, otp);
  } catch (error) {
    console.error("Password reset email sending failed:", error.message);
    await env.E24_HISAB_OTP_DB.prepare("DELETE FROM password_reset_otps WHERE email = ?").bind(email).run();
    return json({ success: false, message: "If an account exists for this email, the reset email could not be sent. Please try again later." }, 502);
  }
  return passwordResetGenericResponse();
}
async function handlePasswordResetVerify(request, env) {
  const body = await request.json().catch(() => ({}));
  const email = String(body.email || "").trim().toLowerCase();
  const otp = String(body.otp || "").trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !/^\d{6}$/.test(otp)) {
    return json({ success: false, message: "Enter the email and 6-digit code." }, 400);
  }
  if (!env.E24_HISAB_OTP_DB) return json({ success: false, message: "OTP database is not configured." }, 500);
  await ensurePasswordResetTable(env.E24_HISAB_OTP_DB);
  const record = await env.E24_HISAB_OTP_DB.prepare(`
    SELECT uid, otp_hash, expires_at, attempts FROM password_reset_otps WHERE email = ?
  `).bind(email).first();
  const now = Math.floor(Date.now() / 1e3);
  if (!record || Number(record.expires_at) <= now) {
    await env.E24_HISAB_OTP_DB.prepare("DELETE FROM password_reset_otps WHERE email = ?").bind(email).run();
    return json({ success: false, message: "Code is invalid or has expired. Request a new code." }, 400);
  }
  if (Number(record.attempts) >= MAX_ATTEMPTS) {
    await env.E24_HISAB_OTP_DB.prepare("DELETE FROM password_reset_otps WHERE email = ?").bind(email).run();
    return json({ success: false, message: "Too many attempts. Request a new code." }, 429);
  }
  const suppliedHash = await hashOTP(`${record.uid}:password-reset:${email}:${otp}`);
  if (suppliedHash !== record.otp_hash) {
    const attempts = Number(record.attempts) + 1;
    if (attempts >= MAX_ATTEMPTS) {
      await env.E24_HISAB_OTP_DB.prepare("DELETE FROM password_reset_otps WHERE email = ?").bind(email).run();
      return json({ success: false, message: "Too many incorrect attempts. Request a new code." }, 429);
    }
    await env.E24_HISAB_OTP_DB.prepare("UPDATE password_reset_otps SET attempts = ? WHERE email = ?").bind(attempts, email).run();
    return json({ success: false, message: "Incorrect verification code.", attemptsRemaining: MAX_ATTEMPTS - attempts }, 400);
  }
  const resetToken = generateResetToken();
  const resetTokenHash = await hashOTP(`${record.uid}:password-reset-token:${email}:${resetToken}`);
  await env.E24_HISAB_OTP_DB.prepare(`
    UPDATE password_reset_otps
    SET otp_hash = '', reset_token_hash = ?, reset_token_expires_at = ?, verified_at = ?
    WHERE email = ?
  `).bind(resetTokenHash, now + PASSWORD_RESET_TOKEN_TTL, now, email).run();
  return json({ success: true, verified: true, resetToken, expiresIn: PASSWORD_RESET_TOKEN_TTL });
}
async function handlePasswordResetComplete(request, env) {
  const body = await request.json().catch(() => ({}));
  const email = String(body.email || "").trim().toLowerCase();
  const resetToken = String(body.resetToken || "");
  const newPassword = String(body.newPassword || "");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || resetToken.length < 32 || newPassword.length < 6 || newPassword.length > 128) {
    return json({ success: false, message: "Invalid reset request. Password must be at least 6 characters." }, 400);
  }
  if (!env.E24_HISAB_OTP_DB) return json({ success: false, message: "OTP database is not configured." }, 500);
  await ensurePasswordResetTable(env.E24_HISAB_OTP_DB);
  const record = await env.E24_HISAB_OTP_DB.prepare(`
    SELECT uid, reset_token_hash, reset_token_expires_at FROM password_reset_otps WHERE email = ?
  `).bind(email).first();
  const now = Math.floor(Date.now() / 1e3);
  if (!record || !record.reset_token_hash || Number(record.reset_token_expires_at) <= now) {
    return json({ success: false, message: "Password reset session is invalid or expired. Verify a new code." }, 400);
  }
  const suppliedHash = await hashOTP(`${record.uid}:password-reset-token:${email}:${resetToken}`);
  if (suppliedHash !== record.reset_token_hash) {
    return json({ success: false, message: "Password reset session is invalid or expired. Verify a new code." }, 400);
  }
  const accessToken = await getFirebaseAdminAccessToken(env);
  const serviceAccount = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT);
  const projectId = serviceAccount.project_id;
  const response = await fetch(
    "https://identitytoolkit.googleapis.com/v1/projects/" + encodeURIComponent(projectId) + "/accounts:update",
    {
      method: "POST",
      headers: { "Authorization": `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ localId: record.uid, password: newPassword })
    }
  );
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    console.error("Firebase password update failed:", response.status, result.error?.message || "Unknown error");
    return json({ success: false, message: "Firebase password could not be updated. Please try again." }, 502);
  }
  await env.E24_HISAB_OTP_DB.prepare("DELETE FROM password_reset_otps WHERE email = ? AND uid = ?").bind(email, record.uid).run();
  return json({ success: true, message: "Password updated successfully." });
}

var worker_default = {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization"
        }
      });
    }
    if (request.method === "GET" && url.pathname === "/") {
      return json({
        service: "E24 Hisab OTP API",
        status: "running",
        emailOtpEnabled: true,
        mobileOtpEnabled: MOBILE_OTP_ENABLED
      });
    }
    if (request.method !== "POST") {
      return json({
        success: false,
        message: "Method not allowed."
      }, 405);
    }
    try {
      if (url.pathname === "/register/send-email-otp") {
        return await handleRegistrationSendEmailOTP(request, env);
      }
      if (url.pathname === "/register/verify-email-otp") {
        return await handleRegistrationVerifyEmailOTP(request, env);
      }
      if (url.pathname === "/send-email-otp") {
        return await handleSendEmailOTP(
          request,
          env
        );
      }
      if (url.pathname === "/verify-email-otp") {
        return await handleVerifyEmailOTP(
          request,
          env
        );
      }
      if (url.pathname === "/forgot-password/send-otp") {
        return await handlePasswordResetSend(request, env);
      }
      if (url.pathname === "/forgot-password/verify-otp") {
        return await handlePasswordResetVerify(request, env);
      }
      if (url.pathname === "/forgot-password/reset") {
        return await handlePasswordResetComplete(request, env);
      }
      if (url.pathname === "/send-otp" || url.pathname === "/verify-otp") {
        if (!MOBILE_OTP_ENABLED) {
          return json({
            success: false,
            message: "Mobile OTP is currently disabled.",
            mobileOtpEnabled: false
          }, 403);
        }
        if (!env.OTP_DO || !env.NISHCHIT_API_KEY) {
          return json({
            success: false,
            message: "SMS configuration missing."
          }, 500);
        }
        let body;
        try {
          body = await request.json();
        } catch {
          return json({
            success: false,
            message: "Invalid JSON."
          }, 400);
        }
        const phone = normalizePhone(body.phone);
        if (!phone) {
          return json({
            success: false,
            message: "Enter a valid Bangladesh mobile number."
          }, 400);
        }
        const path = url.pathname === "/send-otp" ? "/send" : "/verify";
        const id = env.OTP_DO.idFromName(phone);
        const stub = env.OTP_DO.get(id);
        return stub.fetch(
          `https://otp.internal${path}?phone=${encodeURIComponent(phone)}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify(body)
          }
        );
      }
      return json({
        success: false,
        message: "Endpoint not found."
      }, 404);
    } catch (error) {
      console.error(
        "E24 OTP Worker error:",
        error.message
      );
      return json({
        success: false,
        message: "Internal server error. Check Worker logs."
      }, 500);
    }
  }
};
export {
  OtpStorage,
  worker_default as default
};
//# sourceMappingURL=worker.js.map