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
| `ALLOWED_ORIGINS` | Variable (ঐচ্ছিক) | অনুমোদিত Origin comma দিয়ে আলাদা; `null` Android file-based WebView-এর জন্য রাখতে হবে |
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

## OTP Worker Origin Allowlist

OTP Worker-এ `ALLOWED_ORIGINS` না দিলে code-এর default allowlist ব্যবহৃত হবে: `https://mainulru.github.io`, `https://main-security-copy.e24-hisab-security-preview.pages.dev`, `http://localhost:5500`, `http://127.0.0.1:5500`, এবং `null`। Android `file:///android_asset/index.html` থেকে request পাঠালে Origin সাধারণত `null` হয়। নিজে `ALLOWED_ORIGINS` Variable সেট করলে comma-separated list-এ প্রয়োজনীয় সব origin এবং Android ব্যবহারের জন্য `null` রাখুন।

## Registration flow-এর বর্তমান অবস্থা

- `app/src/main/assets/index.html` এখন প্রথমে `/register/send-email-otp` endpoint-এ OTP পাঠায়। এই ধাপে Firebase account তৈরি হয় না।
- সঠিক OTP ও Password দিয়ে `/register/verify-email-otp` সফল হওয়ার পরই OTP Worker Firebase account তৈরি করে এবং `emailVerified=true` সেট করে। এরপর Frontend Firebase Login করে user profile ও Referral setup সম্পন্ন করে।
- Android `MainActivity.java` একই `file:///android_asset/index.html` লোড করে; তাই Android app-ও একই OTP-first registration flow ব্যবহার করে। আলাদা Android registration implementation নেই।
- পুরোনো authenticated `/send-email-otp` ও `/verify-email-otp` endpoint login-পরবর্তী legacy verification flow-এর জন্য রাখা হয়েছে।

## Preview পরীক্ষা করার আগে জরুরি সতর্কতা

এই branch-এর HTML-এ Firebase project config এবং `E24_OTP_API`, `E24_PAYMENT_API`, `E24_ADMIN_API` endpoint hardcoded আছে। বর্তমানে সেগুলো production project/Worker URL নির্দেশ করতে পারে। তাই Preview URL দিয়ে নতুন account, referral, recharge বা wallet mutation পরীক্ষা করবেন না—এতে production data পরিবর্তিত হতে পারে। আলাদা staging Firebase project, staging Worker URL এবং staging service-account secret বসিয়ে isolation নিশ্চিত না করা পর্যন্ত শুধু static/code review করুন।

**পরীক্ষার সীমা:** Registration flow-এর code path ও Firestore Rules staticভাবে মিলিয়ে দেখা হয়েছে; production account তৈরি করে end-to-end test চালানো হয়নি। Production endpoint-এ mutation না করার জন্য live test ইচ্ছাকৃতভাবে বাদ রাখা হয়েছে।
