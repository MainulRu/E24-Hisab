# E24 Hisab Security Package (বাংলা)

এই ফোল্ডারটি `main-security-copy` branch-এর বর্তমান security snapshot।

## ফাইল
- `e24-hisab-admin.js` — Admin Worker
- `e24-sms-wallet-payment.js` — SSLCommerz / SMS Wallet Payment Worker
- `e24-hisab-otp.js` — Email OTP, pre-registration verification, password reset Worker
- `firestore.rules` — Firestore Security Rules
- `VARIABLES-BN.md` — Cloudflare Variables ও Secret সেটআপ

## গুরুত্বপূর্ণ
1. Canonical source file GitHub-এর মূল path-এ আছে: `cloudflare/e24-hisab-admin/src/index.js`, `workers/sslcommerz-wallet/index.js`, `cloudflare/worker.js`, `firestore.rules`।
2. এই package folder-এর JS ফাইলগুলো snapshot copy; পরবর্তী source change হলে snapshot আবার update করতে হবে।
3. কোনো Firebase service-account JSON, private key, Brevo API key, Nishchit API key বা SSLCommerz password এখানে রাখা হয়নি।
4. সব পরিবর্তন শুধু `main-security-copy` branch-এ। `main` branch বা Production Worker deploy করা হয়নি।
5. Registration: আগে Email OTP; সঠিক OTP না দিলে Firebase account তৈরি হয় না। Android app একই `app/src/main/assets/index.html` ব্যবহার করে।
6. Preview frontend-এর Firebase ও Worker URL production project নির্দেশ করতে পারে। আলাদা staging credentials ও endpoint না বসিয়ে Preview-তে signup/recharge/wallet mutation test করবেন না।
