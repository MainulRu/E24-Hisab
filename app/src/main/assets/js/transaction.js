/* E24 Hisab transaction utilities — shared by Web and Android. */
(function(){
  'use strict';
  const bnDigits=s=>String(s).replace(/[০-৯]/g,d=>'০১২৩৪৫৬৭৮৯'.indexOf(d));
  function reportDate(value) {
    const parts=bnDigits(value||'').split(/[\/.-]/).map(Number);
    if(parts.length!==3||parts.some(n=>!Number.isFinite(n)))return null;
    let [d,m,y]=parts;
    if(y<100)y+=2000;
    const date=new Date(y,m-1,d);
    return date.getFullYear()===y&&date.getMonth()===m-1&&date.getDate()===d?date:null;
  }
  const reportMonthNames=['জানুয়ারি','ফেব্রুয়ারি','মার্চ','এপ্রিল','মে','জুন','জুলাই','আগস্ট','সেপ্টেম্বর','অক্টোবর','নভেম্বর','ডিসেম্বর'];
  window.E24TransactionUtils=Object.freeze({bnDigits,reportDate,reportMonthNames:Object.freeze(reportMonthNames)});
})();