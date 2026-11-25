# E24 Hisab — Cloudflare Variables (বাংলা)

এই নির্দেশিকা কেবল `main-security-copy` / Security Preview-এর জন্য। Production Worker-এ পরিবর্তন করার নির্দেশ নয়। কোনো Secret-এর আসল value GitHub-এ লিখবেন না।

## ১. Admin Worker
Worker: `e24-hisab-admin`

| Name | Type | ব্যবহার |
|---|---|---|
| `FIREBASE_API_KEY` | Variable | Firebase Web API key |
| `FIREBASE_PROJECT_ID` | Variable | সংশ্লিষ্ট Firebase project ID |
| `FIREBASE_SERVICE_ACCOUNT` | Secret | Firebase Admin service-account JSON সম্পূর্ণ text |
| `MAIN_ADMIN_UID` | Variable | Main Admin-এর Firebase UID |
| `MAIN_ADMIN_EMAIL` | Variable | Main Admin-এর verified email |
| `ALLOWED_ORIGINS` | Variable | অনুমোদিত origin-গুলো comma দিয়ে আলাদা |

## ২. SSLCommerz Wallet Worker
Worker: `e24-sms-wallet-payment`

| Name | Type | ব্যবহার |
|---|---|---|
| `FIREBASE_API_KEY` | Variable | Firebase Web API key |
| `FIREBASE_PROJECT_ID` | Variable | সংশ্লিষ্ট Firebase project ID |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Secret | Firebase Admin service-account JSON সম্পূর্ণ text |
| `ALLOWED_ORIGINS` | Variable | অনুমোদিত origin-গুলো comma দিয়ে আলাদা |
| `SSLCOMMERZ_MODE` | Variable | `SANDBOX` অথবা `LIVE` |
| `SSLCOMMERZ_STORE_ID` | Secret/Variable | Sandbox Store ID |
| `SSLCOMMERZ_STORE_PASSWORD` | Secret | Sandbox Store Password |
| `SSLCOMMERZ_LIVE_STORE_ID` | Secret/Variable | Live Store ID (Live চালু করলে) |
| `SSLCOMMERZ_LIVE_STORE_PASSWORD` | Secret | Live Store Password (Live চালু করলে) |

Security branch-এর Worker source `FIREBASE_SERVICE_ACCOUNT_JSON` পড়ে। তাই এই Worker-এ `FIREBASE_SERVICE_ACCOUNT` নামে Secret দিলে সেটি একই জিনিস হিসেবে ধরা হবে না।

## ৩. OTP / Registration Worker
Worker: `floral-mouse-c0eae24-hisab-otp`

| Name | Type | ব্যবহার |
|---|---|---|
| `FIREBASE_WEB_API_KEY` | Variable | Firebase Identity Toolkit API key; hardcoded fallback সরানো হয়েছে |
| `FIREBASE_SERVICE_ACCOUNT` | Secret | Firebase Admin service-account JSON সম্পূর্ণ text |
| `BREVO_API_KEY` | Secret | Brevo API key |
| `BREVO_SENDER_EMAIL` | Variable | Brevo-তে verified sender email |
| `NISHCHIT_API_KEY` | Secret | Mobile OTP provider key (mobile OTP চালু করলে) |
| `E24_HISAB_OTP_DB` | D1 binding | OTP database binding |
| `OTP_DO` | Durable Object binding | OTP Durable Object binding |

## Service-account JSON Secret দেওয়ার নিয়ম

1. Firebase Console থেকে সঠিক project-এর service-account JSON নিন।
2. JSON ফাইলের সম্পূর্ণ content Cloudflare Secret-এর value হিসেবে paste করুন—ফাইলের নাম নয়।
3. JSON-এ `client_email`, `private_key` এবং `project_id` থাকতে হবে।
4. একই project-এর service account সংশ্লিষ্ট Worker-এ দিন। Staging Worker-এ staging project-এর credential ব্যবহার করুন।
5. JSON, private key, API secret বা Store Password GitHub repository, ZIP documentation বা public chat-এ রাখবেন না।

## Origin বিষয়ে গুরুত্বপূর্ণ

Security Worker-গুলো `ALLOWED_ORIGINS` ব্যবহার করে। Screenshot-এ Payment Worker-এর জন্য `http://localhost:5500,http://127.0.0.1:5500` দেখা গেছে। এটি কেবল ওই local test origin-গুলো অনুমোদন করে। Browser app অন্য origin থেকে চললে সেই exact origin আলাদাভাবে যোগ করতে হবে। `*` ব্যবহার করবেন না। Android WebView-এর Origin আলাদা হতে পারে; পরীক্ষা না করে অনুমান করে allowlist-এ যোগ করবেন না।

## Deploy-এর আগে যাচাই

- Admin, Payment এবং OTP Worker-এ আলাদা আলাদা করে প্রয়োজনীয় variable/secret আছে কি না দেখুন।
- Admin Worker-এর `/health` endpoint-এ configuration ready কি না যাচাই করুন।
- Payment Worker-এ প্রথমে `SANDBOX` mode ও Sandbox credential দিয়ে পরীক্ষা করুন।
- OTP Worker-এ D1 binding `E24_HISAB_OTP_DB` এবং DO binding `OTP_DO` ঠিক আছে কি না যাচাই করুন।
- এই নথি দেখে Production-এ কোনো Secret বা Variable পরিবর্তন করবেন না; আগে Preview-তে যাচাই করুন।

**বর্তমান সীমাবদ্ধতা:** Frontend registration flow এখনো pre-registration OTP endpoint-এর সঙ্গে সম্পূর্ণভাবে যুক্ত করা হয়নি। তাই এই Worker hardening একাই “OTP verify না হলে Firebase account তৈরি হবে না” শর্ত পূরণ করে না। Registration UI ও Android WebView flow integration এবং end-to-end test শেষ না হওয়া পর্যন্ত এটিকে সম্পূর্ণ নিরাপদ registration বলে গণ্য করবেন না।
