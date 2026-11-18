# E24 Hisab Live Preview যোগ করা

এই project-এ `docs/index.html` একটি মোবাইল-ফ্রেন্ডলি clickable web preview।
এটি APK/SQLite database-এর সঙ্গে সংযুক্ত নয়; browser demo-তে sample data ও সাময়িক interaction আছে।

## GitHub-এ চালু করার ধাপ
1. `E24-Hisab` repository-তে এই ZIP-এর সব ফাইল upload/replace করো (পুরোনো Android project files রেখেই)।
2. GitHub repository → Settings → Pages খোলো।
3. Build and deployment → Source হিসেবে **GitHub Actions** নির্বাচন করো।
4. Actions tab → **Deploy E24 Hisab Live Preview** workflow চালাও (অথবা docs পরিবর্তন commit করলেই চলবে)।
5. Deploy সফল হলে Actions run-এর `github-pages` environment-এ website URL পাওয়া যাবে। সাধারণত URL হবে:
   `https://YOUR-USERNAME.github.io/E24-Hisab/`

## গুরুত্বপূর্ণ
- Live Preview হলো design/demo, APK নয়।
- Preview-তে যোগ করা গ্রাহক/লেনদেন ব্রাউজারের demo state-এ থাকে; APK-এর SQLite database-এ সেভ হয় না।
- bKash/Nagad, SMS, WhatsApp, cloud backup বাস্তবে সংযুক্ত নয়।
- GitHub-এ deploy করতে তোমার repository-তে ফাইল upload/commit করতে হবে; আমি তোমার GitHub account-এ সরাসরি publish করতে পারি না।

## Live Preview সংশোধন
`docs/index.html` এখন আপনার দেওয়া `indexnew.html`-এর একই ফাইল। GitHub Pages deploy হলে Live Preview-তে এই ডিজাইনই দেখা যাবে। `docs/indexnew-reference.html`-এও reference কপি রাখা হয়েছে।
