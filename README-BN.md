# E24 Hisab — প্রাথমিক Android প্রজেক্ট

## এই সংস্করণে
- বাংলা Android অ্যাপের প্রাথমিক UI
- গ্রাহক যোগ ও তালিকা
- গ্রাহকের খাতায় জমা/বাকি/খরচ লেনদেন
- ডিভাইসের SQLite ডেটাবেজে অফলাইন সংরক্ষণ
- প্রাথমিক ড্যাশবোর্ড ও রিপোর্ট

## GitHub দিয়ে APK তৈরি
1. GitHub-এ নতুন repository তৈরি করো: `E24-Hisab`
2. এই ZIP-এর ভেতরের সব ফাইল repository-র মূল জায়গায় upload করো।
3. `Actions` ট্যাবে গিয়ে `Build E24 Hisab APK` workflow চালু করো।
4. workflow শেষ হলে run-এর `Artifacts` থেকে `E24-Hisab-debug-apk` ডাউনলোড করো।
5. ZIP খুলে `app-debug.apk` ফোনে ইনস্টল করে পরীক্ষা করো।

## গুরুত্বপূর্ণ
এটি প্রথম কার্যকর প্রোটোটাইপ। সরাসরি bKash/Nagad পেমেন্ট, SMS/WhatsApp automation, ক্লাউড ব্যাকআপ, PDF export এবং PIN lock এখনো যুক্ত হয়নি। বাস্তব অর্থ লেনদেনের আগে পূর্ণ পরীক্ষা ও নিরাপত্তা যাচাই প্রয়োজন।
