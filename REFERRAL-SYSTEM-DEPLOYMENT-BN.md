# E24 Hisab Referral Bonus — Deployment Notes

## নির্ধারিত নিয়ম

- প্রত্যেক অ্যাকাউন্টের জন্য সার্ভার থেকে একটি ইউনিক Referral Code তৈরি হবে (E24 + ১২টি hexadecimal অক্ষর)।
- নতুন অ্যাকাউন্ট তৈরির সময় Referral Code ঐচ্ছিক।
- একটি নতুন অ্যাকাউন্ট সর্বোচ্চ একজনের রেফারেল হিসেবে যুক্ত হতে পারবে; পরে রেফারার পরিবর্তন করা যাবে না।
- নতুন অ্যাকাউন্টের প্রথম সফল SMS Wallet Recharge-এ রেফারকারী একবার ৳৫ SMS Wallet Bonus পাবেন।
- SSLCOMMERZ payment validation সফল হলে অথবা Admin Worker-এ manual recharge approval হলে বোনাস প্রযোজ্য হবে।
- বোনাস সাধারণ Wallet/নগদ ব্যালেন্স নয়; শুধু SMS Wallet-এ জমা হবে।
- e24ReferralRewards/{referredUid} ডকুমেন্ট, referred profile-এর paid flag এবং Firestore atomic commit দিয়ে duplicate bonus ঠেকানো হয়।

## GitHub-এ পরিবর্তিত ফাইল

- docs/index.html — registration Referral Code field এবং referral summary panel
- app/src/main/assets/index.html — Android WebView-এর একই UI
- workers/sslcommerz-wallet/index.js — referral code API এবং SSLCOMMERZ first-recharge reward
- cloudflare/e24-hisab-admin/src/index.js — Admin-approved manual recharge reward

## Cloudflare-এ যা করতে হবে

GitHub source আপডেট হয়েছে; Worker deploy স্বয়ংক্রিয়ভাবে হয়েছে বলে ধরে নেওয়া যাবে না। Cloudflare deploy না করা পর্যন্ত নতুন API route চালু হবে না।

Repository root থেকে:

```powershell
npx wrangler deploy --config workers/sslcommerz-wallet/wrangler.toml
npx wrangler deploy --config cloudflare/e24-hisab-admin/wrangler.toml
```

দুটি Worker-এর বিদ্যমান secrets/variables অপরিবর্তিত রাখতে হবে। নতুন কোনো secret যোগ করা হয়নি। Deploy-এর পর পরীক্ষা করুন:

- Payment Worker-এর GET /referral/validate?code=... public route
- Payment Worker-এর GET /referral/profile authenticated route
- Payment Worker-এর POST /referral/setup authenticated route
- Admin Worker-এর GET /health — success: true

## Firestore Rules

Referral code, referral relationship, reward status ও bonus ledger কেবল trusted Worker service account লিখবে। সাধারণ ব্যবহারকারীর client-side write permission বাড়ানো হয়নি; তাই firestore.rules-এ নতুন permissive rule যোগ করার প্রয়োজন নেই।

## চালুর আগে পরীক্ষা

1. Referrer account-এ Referral Code তৈরি হয়েছে কি না।
2. নতুন account-এ সঠিক code দিলে referredBy সংরক্ষিত হয়েছে কি না।
3. ভুল code দিলে registration থামে কি না (Worker route চালু থাকলে)।
4. নতুন account-এর প্রথম approved recharge-এ referrer SMS Wallet-এ ঠিক ৳৫ যোগ হয় কি না।
5. একই account-এর দ্বিতীয় recharge-এ আর bonus যোগ হয় না কি না।
6. একই payment/IPN পুনরায় এলে duplicate bonus না হয় কি না।
7. Referral ছাড়া signup/recharge আগের মতো কাজ করে কি না।

## গুরুত্বপূর্ণ সীমাবদ্ধতা

এই পরিবর্তন GitHub source-এ করা হয়েছে। Cloudflare Worker deploy, live Firebase data test এবং Android APK build/install আলাদাভাবে করতে হবে। Sandbox/production payment configuration বদলানো হয়নি।
