
    let e24ToastTimer;
    function showToast(message, type='info') {
      const toast = document.getElementById('toast');
      if (!toast) return;
      clearTimeout(e24ToastTimer);
      toast.textContent = message;
      toast.classList.remove('toast-success','toast-error');
      if (type === 'success') toast.classList.add('toast-success');
      else if (type === 'error') toast.classList.add('toast-error');
      toast.classList.add('show');
      e24ToastTimer = setTimeout(() => toast.classList.remove('show'), 2800);
    }

    function showAppConfirm(message, title='নিশ্চিত করুন') {
      return new Promise(resolve => {
        const backdrop=document.getElementById('app-confirm-backdrop');
        const messageBox=document.getElementById('app-confirm-message');
        const titleBox=document.getElementById('app-confirm-title');
        const cancel=document.getElementById('app-confirm-cancel');
        const ok=document.getElementById('app-confirm-ok');
        if(!backdrop||!messageBox||!titleBox){resolve(false);return;}
        messageBox.textContent=message;
        titleBox.textContent=title;
        backdrop.classList.add('show');
        backdrop.setAttribute('aria-hidden','false');
        const finish=value=>{
          backdrop.classList.remove('show');
          backdrop.setAttribute('aria-hidden','true');
          cancel.removeEventListener('click',onCancel);
          ok.removeEventListener('click',onOk);
          backdrop.removeEventListener('click',onBackdrop);
          document.removeEventListener('keydown',onKey);
          resolve(value);
        };
        const onCancel=()=>finish(false),onOk=()=>finish(true);
        const onBackdrop=e=>{if(e.target===backdrop)finish(false);};
        const onKey=e=>{if(e.key==='Escape')finish(false);};
        cancel.addEventListener('click',onCancel);
        ok.addEventListener('click',onOk);
        backdrop.addEventListener('click',onBackdrop);
        document.addEventListener('keydown',onKey);
        setTimeout(()=>cancel.focus(),30);
      });
    }

    function e24ApplyHomeHeaderName(){
      const bar=document.getElementById('dynamic-app-bar');
      if(!bar)return;
      const title=bar.querySelector('#bar-title')||bar.querySelector('.app-title');
      if(title && (title.textContent.trim()==='E24 Hisab' || title.id==='bar-title' || document.getElementById('page-1')?.classList.contains('active-page'))){
        title.textContent=(window.e24OrgName||'').trim()||'E24 Hisab';
      }
    }
    function e24SaveActivePage(uid){
      const owner=uid||window.e24ActivePageUid;
      if(!owner)return;
      const active=document.querySelector('.app-page.active-page');
      const match=active&&/^page-([1-9]|1[0-2])$/.exec(active.id);
      if(match){try{sessionStorage.setItem('e24-session-page-'+String(owner),match[1]);}catch(_){}}
    }
    window.addEventListener('pagehide',()=>e24SaveActivePage());
    document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')e24SaveActivePage();});
    function e24PageStorageKey(uid){return 'e24-last-page-'+String(uid||'');}
    function e24RestoreLastPage(uid){
      let pageKey='1';
      try{const saved=sessionStorage.getItem('e24-session-page-'+String(uid||''));if(/^(?:[1-9]|1[0-2])$/.test(saved||''))pageKey=saved;}catch(_){pageKey='1';}
      if(pageKey==='3'&&!db.selectedCustomerId)pageKey='2';
      if(pageKey==='9'&&!Array.isArray(db.suppliers))db.suppliers=[];
      // Always restore the supplier management list after refresh, not the last opened supplier detail.
      if(pageKey==='9')db.selectedSupplierId='';
      switchPage(pageKey);
    }
    window.e24HandleHeaderBack=()=>{const page=document.getElementById('page-14');if(page&&page.classList.contains('active-page')){if(typeof window.e24CloseCustomerModal==='function')window.e24CloseCustomerModal();return;}switchPage('1');};

    function switchPage(pageKey) {
      const screenBody = document.querySelector('.screen-body');
      const customerEntryPage = document.getElementById('page-14');
      if (screenBody && customerEntryPage && customerEntryPage.parentElement !== screenBody) {
        screenBody.appendChild(customerEntryPage);
      }
      if (screenBody) screenBody.classList.toggle('e24-customer-entry-active', String(pageKey) === '14');
      document.body.classList.toggle('e24-long-page', ['9','10'].includes(String(pageKey)));
      if(window.e24ActivePageUid){try{sessionStorage.setItem('e24-session-page-'+String(window.e24ActivePageUid),String(pageKey));}catch(_){}}
      // Hide all pages & remove active navs
      for (let i = 1; i <= 14; i++) {
        const p = document.getElementById('page-' + i);
        const n = document.getElementById('nav-' + i);
        if (p) p.classList.remove('active-page');
        if (n) n.classList.remove('active');
      }
      const moreNav = document.getElementById('nav-more');
      if (moreNav) moreNav.classList.remove('active');

      // Show selected page & activate its compact navigation item
      const targetPage = document.getElementById('page-' + pageKey);
      const targetNav = document.getElementById('nav-' + pageKey);
      if (targetPage) targetPage.classList.add('active-page');
      if (targetNav && ['1','2','4'].includes(String(pageKey))) targetNav.classList.add('active');
      else if (moreNav) moreNav.classList.add('active');
      // Update Header Title
      const dynamicBar = document.getElementById('dynamic-app-bar');
      dynamicBar.style.display = '';
      const titles = {
        '1': 'E24 Hisab',
        '2': 'গ্রাহকের তালিকা',
        '3': (window.currentLedgerTitle || 'গ্রাহকের হিসাব'),
        '4': 'নতুন লেনদেন',
        '5': 'পেমেন্ট করুন',
        '6': 'মেসেজ সেন্টার',
        '7': 'হিসাব রিপোর্ট',
        '8': 'সেটিংস', '9': 'সাপ্লায়ার ব্যবস্থাপনা', '10': 'নতুন ক্রয়', '12': 'গ্রাহকের রিপোর্ট', '13': 'লেনদেন'
      };

      if (pageKey === '14') {
        dynamicBar.innerHTML = '';
        dynamicBar.style.display = 'none';
      } else if (pageKey === '1') {
        dynamicBar.innerHTML = `<span class="app-title e24-header-brand"><i class="fa-solid fa-store" aria-hidden="true"></i><span id="bar-title">E24 Hisab</span></span><button type="button" class="e24-notification-trigger" id="e24-notification-bell" aria-label="ইনবক্স"><svg viewBox="0 0 32 32" width="32" height="32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M4 10.5 16 5l12 5.5v15H4v-15Z" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"/><path d="m4.5 11 11.5 8 11.5-8" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/><path d="M4.5 25.5 12 17M27.5 25.5 20 17" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg><span class="e24-notification-label">ইনবক্স</span><span class="e24-notification-count" id="e24-notification-count" hidden>0</span></button><button type="button" class="e24-ai-trigger" id="e24-ai-trigger" aria-label="সাপোর্ট" title="সাপোর্ট"><svg viewBox="0 0 36 32" width="36" height="32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M3 5.5C3 3.6 4.6 2 6.5 2h18C26.4 2 28 3.6 28 5.5v12c0 1.9-1.6 3.5-3.5 3.5H13l-7.5 7v-7.2C4 20.2 3 19 3 17.5v-12Z" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/><path d="M11 9h20c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2h-2v4l-5-4h-5" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg><span class="e24-ai-label">সাপোর্ট</span></button><button type="button" class="e24-header-menu interactive-icon" aria-label="মেনু খুলুন" title="মেনু"><i class="fa-solid fa-bars" aria-hidden="true"></i></button>`;
        const homeTitle = document.getElementById('bar-title');
        if (homeTitle) homeTitle.textContent = window.e24OrgName || 'E24 Hisab';

      } else if (pageKey === '13') {
        dynamicBar.innerHTML = `<button type="button" class="interactive-icon" onclick="window.e24BackFromTransaction()" aria-label="আগের পেজে ফিরে যান" style="border:0;background:none;color:#fff;padding:0 8px 0 0;flex:0 0 auto"><i class="fa-solid fa-arrow-left"></i></button><span class="app-title">লেনদেন</span>`;
      } else if (pageKey === '3' || pageKey === '12') {
        const headerCustomer = window.db && Array.isArray(window.db.customers)
          ? window.db.customers.find(c => String(c.id) === String(window.db.selectedCustomerId))
          : null;
        const headerEscape = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
        const headerPhoto = headerCustomer && typeof headerCustomer.photo === 'string' && headerCustomer.photo.startsWith('data:image/')
          ? '<img src="' + headerEscape(headerCustomer.photo) + '" alt="">'
          : '<i class="fa-solid fa-user" aria-hidden="true"></i>';
        const backTarget=pageKey==='12'?'3':'2';
        const printButton=pageKey==='12'?'<button type="button" class="interactive-icon" onclick="printCustomerReport()" aria-label="রিপোর্ট প্রিন্ট" title="প্রিন্ট" style="border:0;background:none;color:#fff;padding:0 2px 0 10px;flex:0 0 auto"><i class="fa-solid fa-print"></i></button>':'';
        const customerMenu=pageKey==='3'?'<button type="button" id="e24-customer-header-menu-trigger" class="interactive-icon" aria-label="গ্রাহকের অপশন" aria-haspopup="true" aria-expanded="false" style="border:0;background:none;color:#fff;padding:0 4px 0 10px;flex:0 0 auto"><i class="fa-solid fa-ellipsis-vertical"></i></button><div id="e24-customer-header-menu" hidden><button type="button" id="e24-header-edit-customer"><i class="fa-solid fa-pen"></i> গ্রাহক সম্পাদনা</button><button type="button" id="e24-header-delete-customer" class="e24-menu-delete"><i class="fa-solid fa-trash"></i> গ্রাহক ডিলিট</button></div>':'';
        dynamicBar.style.position=pageKey==='3'?'relative':'';
        dynamicBar.innerHTML = `<button type="button" class="interactive-icon" onclick="switchPage('${backTarget}')" aria-label="ফিরে যান" style="border:0;background:none;color:#fff;padding:0 8px 0 0;flex:0 0 auto"><i class="fa-solid fa-arrow-left"></i></button><span style="display:flex;align-items:center;gap:9px;min-width:0;flex:1"><span style="width:36px;height:36px;border-radius:50%;overflow:hidden;display:flex;align-items:center;justify-content:center;flex:0 0 36px;background:#e8f3ec;color:#16834b;font-size:17px">${headerPhoto}</span><span style="display:flex;flex-direction:column;min-width:0;line-height:1.25"><strong style="font-size:14px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${headerEscape(headerCustomer?.name || 'গ্রাহক')}</strong><small style="font-size:11px;opacity:.9;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${headerEscape(headerCustomer?.phone || 'মোবাইল নম্বর নেই')}</small></span></span>${printButton}${customerMenu}`;
        const customerMenuTrigger=dynamicBar.querySelector('#e24-customer-header-menu-trigger');
        const customerMenuPanel=dynamicBar.querySelector('#e24-customer-header-menu');
        if(customerMenuTrigger&&customerMenuPanel){
          customerMenuTrigger.onclick=event=>{event.stopPropagation();const open=customerMenuPanel.hidden;customerMenuPanel.hidden=!open;customerMenuTrigger.setAttribute('aria-expanded',String(open));};
          customerMenuPanel.querySelector('#e24-header-edit-customer').onclick=()=>{customerMenuPanel.hidden=true;customerMenuTrigger.setAttribute('aria-expanded','false');if(typeof window.e24OpenCustomerEditFromHeader==='function')window.e24OpenCustomerEditFromHeader();};
          customerMenuPanel.querySelector('#e24-header-delete-customer').onclick=()=>{customerMenuPanel.hidden=true;customerMenuTrigger.setAttribute('aria-expanded','false');if(typeof window.e24DeleteSelectedCustomer==='function')window.e24DeleteSelectedCustomer();};
          if(!window.e24CustomerMenuOutsideBound){window.e24CustomerMenuOutsideBound=true;document.addEventListener('click',event=>{const panel=document.getElementById('e24-customer-header-menu'),trigger=document.getElementById('e24-customer-header-menu-trigger');if(panel&&!panel.hidden&&!panel.contains(event.target)&&!(trigger&&trigger.contains(event.target))){panel.hidden=true;if(trigger)trigger.setAttribute('aria-expanded','false');}});}
        }
        const headerAvatarImage = dynamicBar.querySelector('span span img');
        if (headerAvatarImage) { headerAvatarImage.style.width='100%'; headerAvatarImage.style.height='100%'; headerAvatarImage.style.objectFit='cover'; }
      } else {
        dynamicBar.innerHTML = `<i class="fa-solid fa-arrow-left interactive-icon" onclick="pageKey==='13'?window.e24BackFromTransaction():window.e24HandleHeaderBack()"></i><span class="app-title">${titles[pageKey]}</span>`;
      }
      const homeFab=document.getElementById('home-transaction-fab');if(homeFab)homeFab.style.display=pageKey==='1'?'flex':'none';
      if(pageKey==='1') e24ApplyHomeHeaderName();
      if(String(pageKey)==='5'&&typeof window.e24RenderPaymentPage==='function')window.e24RenderPaymentPage();
      else if(typeof e24CloseNotificationPanel==='function') e24CloseNotificationPanel();
      if(typeof window.e24RenderNotifications==='function'){window.e24RenderNotifications();if(pageKey==='1')requestAnimationFrame(()=>window.e24RenderNotifications());}
    }

    function openSideMenu(){const menu=document.getElementById('side-menu-backdrop');if(menu){menu.classList.add('show');menu.setAttribute('aria-hidden','false');}}
    function closeSideMenu(){const menu=document.getElementById('side-menu-backdrop');if(menu){menu.classList.remove('show');menu.setAttribute('aria-hidden','true');}}
    function openMenuPage(pageKey){closeSideMenu();switchPage(String(pageKey));}

    document.addEventListener('DOMContentLoaded',()=>{const bar=document.getElementById('dynamic-app-bar');if(bar)bar.addEventListener('click',event=>{const icon=event.target.closest('.interactive-icon');if(!icon)return;if(icon.classList.contains('fa-bell'))showToast('নতুন কোনো নোটিফিকেশন নেই');else if(icon.classList.contains('fa-bars')||icon.querySelector('.fa-bars'))openSideMenu();});document.querySelectorAll('.bottom-nav .nav-item[role="button"]').forEach(item=>item.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();item.click();}}));});
    // side-menu-backdrop-close-handler
    document.addEventListener('DOMContentLoaded',()=>{const backdrop=document.getElementById('side-menu-backdrop');if(backdrop)backdrop.addEventListener('click',e=>{if(e.target===backdrop)closeSideMenu();});document.addEventListener('keydown',e=>{if(e.key==='Escape')closeSideMenu();});});
    function printLedger() {
      const ledger = document.getElementById('page-3');
      if (!ledger || !ledger.classList.contains('active-page')) { showToast('প্রথমে গ্রাহকের খাতা খুলুন'); return; }
      if (window.AndroidPrint && typeof window.AndroidPrint.printLedger === 'function') { window.AndroidPrint.printLedger(); }
      else { window.print(); }
    }

    // E24 Hisab: persistent customer and transaction data (local device/browser storage)
    (() => {
      const KEY = 'e24hisab_records_v1';
      window.db = { customers: [], transactions: [], selectedCustomerId: null, txType: 'বাকি' }; let editingCustomerId=null,transactionAddCustomer=false,customerEntryType='customer',customerEntryPhoto='';
      const money = n => '৳ ' + Number(n || 0).toLocaleString('en-IN');
      const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
      const id = () => 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2,7);
      const safeCustomerPhoto = photo => {
        const value = typeof photo === 'string' ? photo : '';
        // Only allow bounded raster-image data URLs; never interpolate attacker-controlled HTML or URL schemes.
        return value.length <= 512000 && /^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(value) ? value : '';
      };
      const avatar = (photo, large=false) => {
        const safePhoto = safeCustomerPhoto(photo);
        return safePhoto ? `<img src="${safePhoto}" alt="গ্রাহকের ছবি">` : '<i class="fa-solid fa-user"></i>';
      }; 
      const e24SavedTransactionImageIds=window.e24SavedTransactionImageIds||(window.e24SavedTransactionImageIds=new Set());
      async function save(successMessage){
        if(!currentUser||!activeDataUid){showToast('আগে লগইন করুন','error');return false;}
        const dataRef=e24Store.collection('users').doc(activeDataUid).collection('data');
        try{
          const imageTransactions=(db.transactions||[]).filter(t=>t&&t.id&&typeof t.image==='string'&&/^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(t.image));
          const pendingImages=imageTransactions.filter(t=>!e24SavedTransactionImageIds.has(String(t.id)));
          // Save newest photos first; migrate at most five legacy photos per save to cap mobile memory/network use.
          const imagesToSave=pendingImages.slice(-5);
          if(imagesToSave.length){
            const batch=e24Store.batch();
            imagesToSave.forEach(t=>{
              const imageId='tximg_'+String(t.id).replace(/[^A-Za-z0-9_-]/g,'_');
              batch.set(dataRef.doc(imageId),{kind:'transaction-image',transactionId:String(t.id),image:t.image,updatedAt:firebase.firestore.FieldValue.serverTimestamp()},{merge:true});
            });
            await batch.commit();
            imagesToSave.forEach(t=>e24SavedTransactionImageIds.add(String(t.id)));
          }
          // Keep unmigrated legacy images in the main document; remove only after their image document is confirmed saved.
          const snapshot={...db,transactions:(db.transactions||[]).map(t=>{const copy={...t};if(e24SavedTransactionImageIds.has(String(t.id)))delete copy.image;return copy;})};
          await dataRef.doc('main').set({...snapshot,updatedAt:firebase.firestore.FieldValue.serverTimestamp()});
          if(successMessage)showToast(successMessage,'success');
          return true;
        }catch(err){
          console.error('E24 Firestore save:',err);
          showToast('Cloud-এ হিসাব সংরক্ষণ হয়নি। আবার চেষ্টা করুন।');
          return false;
        }
      }
      function validTransactions() {
        const customerIds=new Set(db.customers.map(c=>String(c.id)));
        return db.transactions.filter(t=>customerIds.has(String(t.customerId)));
      }
      function calculateBalances(transactions) {
        const byCustomer=new Map();
        (transactions||[]).forEach(t=>{
          const id=String(t.customerId);
          if(!byCustomer.has(id))byCustomer.set(id,{sales:0,paid:0});
          const balance=byCustomer.get(id);
          if(t.type==='বাকি') {
            balance.sales+=Number(t.amount)||0;
            balance.paid+=Number(t.paid)||0;
          } else if(t.type==='জমা') {
            balance.paid+=Number(t.amount)||0;
          }
        });
        return Array.from(byCustomer.values()).reduce((total,balance)=>{
          total.sales+=balance.sales;
          total.paid+=balance.paid;
          total.due+=Math.max(0,balance.sales-balance.paid);
          total.advance+=Math.max(0,balance.paid-balance.sales);
          return total;
        },{sales:0,paid:0,due:0,advance:0});
      }
      function customerTotals(cid) {
        return calculateBalances(validTransactions().filter(t=>String(t.customerId)===String(cid)));
      }
      window.customerTotals = customerTotals;
      function allCustomerTotals() {
        return calculateBalances(validTransactions());
      }
      function selected() { return db.customers.find(c=>String(c.id)===String(db.selectedCustomerId)) || db.customers[0] || null; }
      // Preserve the customer module's former global API for other app sections.
      Object.assign(window,{validTransactions,calculateBalances,customerTotals,allCustomerTotals,selected,renderCustomers,renderLedger});
      let customerDirectoryFilter='all';
      function renderCustomers() {
        const ul=document.querySelector('#page-2 #directory-customer-list');if(!ul)return;
        const totals=allCustomerTotals();
        const dueEl=document.getElementById('directory-total-due'),paidEl=document.getElementById('directory-total-paid'),advanceEl=document.getElementById('directory-total-advance'),countEl=document.getElementById('directory-customer-count');
        if(dueEl)dueEl.textContent=money(totals.due);if(paidEl)paidEl.textContent=money(totals.paid);if(advanceEl)advanceEl.textContent=money(totals.advance);
        if(countEl)countEl.textContent=db.customers.length.toLocaleString('bn-BD')+' জন';
        const query=(document.getElementById('search-input')?.value||'').trim().toLocaleLowerCase();
        const filtered=db.customers.filter(c=>{const t=customerTotals(c.id);const mf=customerDirectoryFilter==='all'||(customerDirectoryFilter==='due'&&t.due>0)||(customerDirectoryFilter==='advance'&&t.advance>0)||(customerDirectoryFilter==='settled'&&t.due<=0&&t.advance<=0);const mq=(c.name||'').toLocaleLowerCase().includes(query)||(c.phone||'').toLocaleLowerCase().includes(query);return mf&&mq;});
        const visible=document.getElementById('directory-visible-count');if(visible)visible.textContent=filtered.length.toLocaleString('bn-BD')+' জন';
        ul.innerHTML=filtered.length?filtered.map(c=>{const t=customerTotals(c.id),due=t.due,advance=t.advance,label=due>0?'বাকি: '+money(due):advance>0?'অগ্রিম: '+money(advance):'পরিশোধিত';return '<li class="customer-item" data-cid="'+esc(c.id)+'"><div class="user-avatar">'+avatar(c.photo)+'</div><div class="customer-name">'+esc(c.name)+'<small>'+esc(c.phone||'মোবাইল নম্বর নেই')+'</small></div><span class="amount-tag '+(due>0?'tag-red':advance>0?'tag-green':'tag-blue')+'">'+label+'</span><i class="fa-solid fa-chevron-right"></i></li>';}).join(''):'<li style="padding:22px;text-align:center;color:#8995a3;background:#fff;border:1px solid #e8edf1;border-radius:12px">কোনো গ্রাহক পাওয়া যায়নি</li>';
        ul.querySelectorAll('[data-cid]').forEach(el=>el.addEventListener('click',()=>{db.selectedCustomerId=el.dataset.cid;switchPage('3');}));
      }
      function renderLedger() {
        const p=document.getElementById('page-legacy-ledger'), c=selected(); if(!p)return;
        if(!c){window.currentLedgerTitle='গ্রাহকের হিসাব';p.innerHTML='<div style="padding:30px;text-align:center">প্রথমে গ্রাহক তালিকা থেকে একজন গ্রাহক যোগ করুন বা নির্বাচন করুন।<br><button class="btn btn-green" style="margin-top:15px" onclick="switchPage(\'2\')">গ্রাহক তালিকা</button></div>';return;}
        const t=customerTotals(c.id), rows=validTransactions().filter(x=>String(x.customerId)===String(c.id)).slice().reverse();
        window.currentLedgerTitle = c.name + '-এর হিসাব';
        const paymentSettings=(db&&db.paymentSettings&&typeof db.paymentSettings==='object')?db.paymentSettings:{};
        const paymentQrItems=[
          {name:'bKash',number:String(paymentSettings.bkashPersonalNumber||'').trim(),type:paymentSettings.bkashAccountType==='merchant'?'Merchant':'Personal',merchantId:String(paymentSettings.bkashMerchantId||'').trim()},
          {name:'Nagad',number:String(paymentSettings.nagadPersonalNumber||'').trim(),type:paymentSettings.nagadAccountType==='merchant'?'Merchant':'Personal',merchantId:String(paymentSettings.nagadMerchantId||'').trim()}
        ].filter(item=>item.number);
        const paymentQrHtml='<section class="e24-customer-payment-qr" aria-label="পেমেন্ট QR"><h3><i class="fa-solid fa-qrcode"></i> পেমেন্ট QR কোড</h3><div class="e24-customer-payment-qr-grid">'+(paymentQrItems.length?paymentQrItems.map(item=>{
          const qrData=item.name+' payment information\\nAccount type: '+item.type+'\\nAccount number: '+item.number+(item.merchantId?'\\nMerchant ID: '+item.merchantId:'');
          const qrUrl='https://api.qrserver.com/v1/create-qr-code/?size=180x180&data='+encodeURIComponent(qrData);
          return '<div class="e24-customer-payment-qr-card"><strong>'+esc(item.name)+' '+esc(item.type)+'</strong><img src="'+qrUrl+'" alt="'+esc(item.name)+' পেমেন্ট তথ্যের QR" loading="lazy"><span>'+esc(item.number)+'</span>'+(item.merchantId?'<small>Merchant ID: '+esc(item.merchantId)+'</small>':'')+'</div>';
        }).join(''):'<p class="e24-customer-payment-qr-empty">Settings-এর Payment Settings-এ bKash বা Nagad নম্বর যোগ করে Save করুন।</p>')+'</div><small class="e24-customer-payment-qr-note">Personal QR শুধু অ্যাকাউন্টের তথ্য দেখায়। Merchant API এখনো যুক্ত হয়নি।</small><div class="e24-demo-payment"><strong>Merchant Payment — Demo Test Mode</strong><div class="e24-demo-payment-amount">পরীক্ষার পরিমাণ: ${money(t.due)}</div><p>এখানে কোনো আসল টাকা লেনদেন হবে না এবং গ্রাহকের বকেয়া পরিবর্তন হবে না।</p><div class="e24-demo-payment-actions"><button type="button" class="btn btn-green" id="e24-demo-payment-success">সফল পেমেন্ট পরীক্ষা</button><button type="button" class="btn btn-logout" id="e24-demo-payment-fail">ব্যর্থ পেমেন্ট পরীক্ষা</button></div><div class="e24-demo-payment-result" id="e24-demo-payment-result" aria-live="polite">পরীক্ষার জন্য একটি ফলাফল নির্বাচন করুন।</div></div></section>';
        p.innerHTML=`<div class="ledger-print-only">${esc(window.currentLedgerTitle)}</div><div class="ledger-customer-nav"><button type="button" class="btn btn-green ledger-nav-btn" id="ledger-prev-customer"><i class="fa-solid fa-chevron-left"></i> আগের গ্রাহক</button><button type="button" class="btn btn-green ledger-nav-btn" id="ledger-next-customer">পরবর্তী গ্রাহক <i class="fa-solid fa-chevron-right"></i></button></div><div class="profile-header"><div class="profile-avatar-large">${avatar(c.photo,true)}</div><div class="profile-details"><div class="profile-edit-row"><div><div class="profile-name">${esc(c.name)}</div>${c.phone?`<div class="profile-phone"><i class="fa-solid fa-phone"></i> ${esc(c.phone)}</div>`:''}</div><button class="btn btn-blue" id="edit-customer" type="button"><i class="fa-solid fa-pen"></i> তথ্য এডিট</button></div><div class="customer-manage-actions" style="display:flex;gap:5px;flex-wrap:wrap;margin-top:5px"><button class="btn btn-logout" id="remove-customer" style="padding:4px 8px;width:auto;font-size:10px"><i class="fa-solid fa-trash"></i> গ্রাহক মুছুন</button><button class="btn btn-blue" id="change-customer-photo" style="padding:4px 8px;width:auto;font-size:10px"><i class="fa-solid fa-camera"></i> ছবি</button></div></div></div><div class="two-col-summary ledger-summary"><div class="summary-box box-green"><span><i class="fa-solid fa-sack-dollar"></i> মোট জমা</span><strong>${money(t.paid)}</strong></div><div class="summary-box ${t.due>0?'box-red':t.advance>0?'box-blue':'box-green'}"><span><i class="fa-solid ${t.due>0?'fa-wallet':t.advance>0?'fa-piggy-bank':'fa-circle-check'}"></i> ${t.due>0?'মোট বাকি':t.advance>0?'অগ্রিম':'পরিশোধিত'}</span><strong>${money(t.due>0?t.due:t.advance)}</strong></div></div>${paymentQrHtml}<div class="section-banner border-banner"><i class="fa-solid fa-list"></i> লেনদেনের ইতিহাস</div><ul class="transaction-history">${rows.length?rows.map(x=>`<li class="history-item" data-txid="${esc(x.id)}" role="button" tabindex="0" aria-label="লেনদেনের বিস্তারিত দেখুন"><span class="tx-icon ${x.type==='জমা'?'icon-up':'icon-down'}"><i class="fa-solid ${x.type==='জমা'?'fa-arrow-up':'fa-arrow-down'}"></i></span><div class="tx-info"><span class="tx-name">${x.type==='বাকি'?'বিক্রি':'জমা'} ${x.note?'— '+esc(x.note):''}</span><span class="${x.type==='জমা'?'green-text':'red-text'}" style="font-weight:700">${money(x.amount)}${x.type==='বাকি'&&Number(x.paid)>0?` · জমা ${money(x.paid)}`:''}</span></div><span class="tx-date">${esc(x.date)}</span></li>`).join(''):'<li style="padding:20px;text-align:center;color:#888">এখনো কোনো লেনদেন নেই</li>'}</ul><div class="action-btn-group"><button class="btn btn-blue" onclick="beginTransaction('বাকি')"><i class="fa-solid fa-plus"></i> নতুন লেনদেন</button><button class="btn btn-purple" onclick="switchPage('6')"><i class="fa-regular fa-envelope"></i> মেসেজ পাঠান</button></div>`;
        const demoResult=document.getElementById('e24-demo-payment-result');
        const demoSuccess=document.getElementById('e24-demo-payment-success'),demoFail=document.getElementById('e24-demo-payment-fail');
        if(demoSuccess)demoSuccess.onclick=()=>{if(demoResult)demoResult.textContent='DEMO SUCCESS: পরীক্ষামূলক পেমেন্ট সফল দেখানো হয়েছে। কোনো আসল টাকা নেওয়া হয়নি এবং বকেয়া অপরিবর্তিত আছে।';};
        if(demoFail)demoFail.onclick=()=>{if(demoResult)demoResult.textContent='DEMO FAILED: পরীক্ষামূলক পেমেন্ট ব্যর্থ দেখানো হয়েছে। কোনো টাকা নেওয়া হয়নি এবং বকেয়া অপরিবর্তিত আছে।';};
        const customerIndex=db.customers.findIndex(item=>String(item.id)===String(c.id));
        const prevCustomerBtn=document.getElementById('ledger-prev-customer'),nextCustomerBtn=document.getElementById('ledger-next-customer');
        if(prevCustomerBtn){prevCustomerBtn.disabled=customerIndex<=0;prevCustomerBtn.onclick=()=>{if(customerIndex>0){db.selectedCustomerId=db.customers[customerIndex-1].id;renderLedger();}};}
        if(nextCustomerBtn){nextCustomerBtn.disabled=customerIndex<0||customerIndex>=db.customers.length-1;nextCustomerBtn.onclick=()=>{if(customerIndex>=0&&customerIndex<db.customers.length-1){db.selectedCustomerId=db.customers[customerIndex+1].id;renderLedger();}};}
        const photoBtn=document.getElementById('change-customer-photo'); if(photoBtn)photoBtn.onclick=()=>{const picker=document.getElementById('customer-photo-picker');if(picker){picker.value='';picker.click();}};
        const editBtn=document.getElementById('edit-customer'); if(editBtn)editBtn.onclick=()=>{const target=selected();if(!target)return;const editModal=document.getElementById('page-14'),editName=document.getElementById('new-customer-name'),editPhone=document.getElementById('new-customer-phone');editingCustomerId=target.id;setCustomerEntryType('customer');customerEntryPhoto=target.photo||'';entryAvatar.innerHTML=customerEntryPhoto?'<img alt="ছবি" src="'+customerEntryPhoto+'">':'<i class="fa-solid fa-user"></i>';editName.value=target.name||'';editPhone.value=target.phone||'';document.getElementById('new-customer-address').value=target.address||'';document.getElementById('customer-modal-title').textContent='গ্রাহকের তথ্য এডিট';document.getElementById('customer-submit-label').textContent='আপডেট';editModal.classList.add('show');editModal.setAttribute('aria-hidden','false');setTimeout(()=>editName.focus(),80);};
        window.e24EditSelectedCustomer=()=>{if(editBtn)editBtn.onclick();};
        const removeBtn=document.getElementById('remove-customer'); if(removeBtn)removeBtn.onclick=async()=>{
          const target=selected(); if(!target)return;
          const customerName=target.name||'এই গ্রাহক';
          const deletedId=String(target.id);
          const customerTx=db.transactions.filter(x=>String(x.customerId)===deletedId);
          const removedSales=customerTx.reduce((sum,x)=>sum+(x.type==='বাকি'?(Number(x.amount)||0):0),0);
          const removedPaid=customerTx.reduce((sum,x)=>sum+(x.type==='বাকি'?(Number(x.paid)||0):(x.type==='জমা'?(Number(x.amount)||0):0)),0);
          const removedDue=Math.max(0,removedSales-removedPaid);
          const message='সতর্কতা! “'+customerName+'” গ্রাহককে স্থায়ীভাবে মুছে ফেলবেন?\n\n'+
            'মুছে যাবে: '+customerTx.length+'টি লেনদেন\n'+
            'মোট বিক্রি: '+money(removedSales)+'\n'+
            'মোট জমা: '+money(removedPaid)+'\n'+
            'মোট বাকি: '+money(removedDue)+'\n\n'+
            'Home Page, খাতা, রিপোর্ট ও প্রিন্ট থেকেও সব হিসাব বাদ যাবে।\nএই কাজটি ফিরিয়ে আনা যাবে না।';
          if(!(await showAppConfirm(message,'গ্রাহক স্থায়ীভাবে মুছবেন?')))return;
          const previousCustomers=db.customers;
          const previousTransactions=db.transactions;
          const previousSelectedCustomerId=db.selectedCustomerId;
          db.transactions=db.transactions.filter(x=>String(x.customerId)!==deletedId);
          db.customers=db.customers.filter(x=>String(x.id)!==deletedId);
          db.selectedCustomerId=null;
          const saved=await save('গ্রাহক ও তাঁর সব হিসাব স্থায়ীভাবে মুছে ফেলা হয়েছে');
          if(!saved){
            db.customers=previousCustomers;
            db.transactions=previousTransactions;
            db.selectedCustomerId=previousSelectedCustomerId;
            refreshAll();
            return;
          }
          refreshAll();
          switchPage('2');
        };
        // Header delete is handled by the active customer-page controller below.
      }
  
    function renderTransactionForm(type) {
        db.txType=type||'বাকি'; const p=document.getElementById('page-4'); if(!p)return;
        const isSale=db.txType==='বাকি';
        p.innerHTML=`<div class="type-selector"><button class="type-btn ${isSale?'active-green':'inactive-red'}" id="tx-due"><i class="fa-solid fa-cart-shopping"></i> বিক্রি করলাম</button><button class="type-btn ${!isSale?'active-green':'inactive-red'}" id="tx-paid"><i class="fa-solid fa-hand-holding-dollar"></i> বাকি আদায়</button></div><div class="form-group"><label class="form-label">গ্রাহক সার্চ:</label><input class="form-input" id="tx-customer-search" type="search" placeholder="নাম / মোবাইল"></div><div class="form-group"><label class="form-label">গ্রাহক নির্বাচন:</label><select class="form-input" id="tx-customer">${db.customers.length?db.customers.map(c=>`<option value="${esc(c.id)}" ${selected()?.id===c.id?'selected':''}>${esc(c.name)}</option>`).join(''):'<option value="">কোনো গ্রাহক নেই</option>'}</select></div><button type="button" class="btn btn-green" id="tx-add-customer" style="margin:-2px 0 10px"><i class="fa-solid fa-user-plus"></i> নতুন গ্রাহক যোগ করুন</button>${isSale?'':`<div class="form-group"><label class="form-label">জমার পরিমাণ (৳):</label><input class="form-input" id="tx-amount" type="number" min="1" step="1" inputmode="numeric" placeholder="টাকার পরিমাণ"></div>`}${isSale?`<div class="tx-amount-row"><div class="form-group"><input class="form-input" id="tx-amount" type="number" min="1" step="1" inputmode="numeric" placeholder="বিক্রি করলাম"></div><div class="form-group"><input class="form-input" id="tx-initial-paid" type="number" min="0" step="1" inputmode="numeric" placeholder="জমা নিলাম"></div></div><div class="form-group" style="padding:10px;background:#f5f7fa;border-radius:8px"><span>অবশিষ্ট বাকি: </span><strong id="tx-remaining">৳ 0</strong></div>`:''}<div class="tx-description-field"><i class="fa-regular fa-pen-to-square" aria-hidden="true"></i><textarea id="tx-note" rows="1" aria-label="লেনদেনের বিবরণ" placeholder="বিবরণ"></textarea></div>${isSale?`<div class="tx-meta-actions"><button type="button" class="tx-meta-btn" id="tx-date-button"><i class="fa-solid fa-calendar-days"></i><span id="tx-date-label">${(()=>{const d=new Date();return d.toLocaleDateString("bn-BD",{day:"numeric",month:"long"})})()}</span></button><button type="button" class="tx-meta-btn" id="tx-image-button"><i class="fa-solid fa-camera tx-camera-icon" aria-hidden="true"></i><span id="tx-image-label">ছবি</span></button></div>`:``}<input class="tx-hidden-input" id="tx-date" type="date" aria-label="লেনদেনের তারিখ" value="${(()=>{const d=new Date();return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")})()}"><input class="tx-hidden-input" id="tx-image" type="file" accept="image/*" capture="environment" aria-label="লেনদেনের ছবি"><div id="tx-image-preview" style="margin-top:8px"></div><button class="btn btn-green shadow-btn" id="tx-save"><i class="fa-solid fa-floppy-disk"></i> সংরক্ষণ করুন</button>`;
        document.getElementById('tx-paid').onclick=()=>renderTransactionForm('জমা'); document.getElementById('tx-due').onclick=()=>renderTransactionForm('বাকি');
        const customerSearch=document.getElementById('tx-customer-search'),customerSelect=document.getElementById('tx-customer');
        const txAddCustomerButton=document.getElementById('tx-add-customer');if(txAddCustomerButton)txAddCustomerButton.onclick=()=>{transactionAddCustomer=true;editingCustomerId=null;setCustomerEntryType('customer');document.getElementById('new-customer-name').value='';document.getElementById('new-customer-phone').value='';document.getElementById('new-customer-address').value='';document.getElementById('customer-modal-title').textContent='নতুন গ্রাহক';document.getElementById('customer-submit-label').textContent='সংরক্ষণ';const customerModal=document.getElementById('page-14');customerModal.classList.add('show');customerModal.setAttribute('aria-hidden','false');setTimeout(()=>document.getElementById('new-customer-name').focus(),80);};
        if(customerSearch&&customerSelect){let filteringCustomers=false;customerSearch.addEventListener('input',()=>{const q=customerSearch.value.trim().toLocaleLowerCase();const current=customerSelect.value;const matches=db.customers.filter(c=>(c.name||'').toLocaleLowerCase().includes(q)||(c.phone||'').replace(/\\D/g,'').includes(q.replace(/\\D/g,'')));customerSelect.innerHTML=matches.length?matches.map(c=>`<option value="${esc(c.id)}">${esc(c.name)}</option>`).join(''):'<option value="">কোনো গ্রাহক পাওয়া যায়নি</option>';if(matches.some(c=>c.id===current))customerSelect.value=current;else if(matches.length)customerSelect.value=matches[0].id;filteringCustomers=true;customerSelect.dispatchEvent(new Event('change'));filteringCustomers=false;});customerSelect.addEventListener('change',()=>{if(!filteringCustomers)customerSearch.value='';});}
        const amountField=document.getElementById('tx-amount'),paidField=document.getElementById('tx-initial-paid'),remaining=document.getElementById('tx-remaining');
        const dateInput=document.getElementById('tx-date'),dateButton=document.getElementById('tx-date-button'),dateLabel=document.getElementById('tx-date-label');
        const refreshDateLabel=()=>{if(dateLabel&&dateInput.value){const d=new Date(dateInput.value+'T12:00:00');dateLabel.textContent=d.toLocaleDateString('bn-BD',{day:'numeric',month:'long'});}};
        if(dateButton)dateButton.addEventListener('click',event=>{
          event.preventDefault();
          if(typeof dateInput.showPicker==='function'){
            try{dateInput.showPicker();return;}catch(_){}
          }
          dateInput.click();
        });
        if(dateInput){dateInput.addEventListener('change',refreshDateLabel);refreshDateLabel();}
        const imageButton=document.getElementById('tx-image-button'),imageLabel=document.getElementById('tx-image-label');
        if(imageButton)imageButton.addEventListener('click',event=>{
          event.preventDefault();
          imageInput.click();
        });
        const updateRemaining=()=>{if(remaining){const cid=document.getElementById('tx-customer').value,oldDue=customerTotals(cid).due;remaining.textContent=money(Math.max(0,oldDue+(Number(amountField.value)||0)-(Number(paidField.value)||0)));}};
        if(paidField){amountField.addEventListener('input',updateRemaining);paidField.addEventListener('input',updateRemaining);document.getElementById('tx-customer').addEventListener('change',updateRemaining);updateRemaining();}
        let transactionImage='',imageProcessing=false;
        const imageInput=document.getElementById('tx-image'),imagePreview=document.getElementById('tx-image-preview');
        imageInput.onchange=async()=>{
          const file=imageInput.files&&imageInput.files[0];transactionImage='';imagePreview.innerHTML='';
          if(imageLabel)imageLabel.textContent='ছবি যোগ করুন';
          if(!file)return;
          if(!/^image\/(jpeg|png|webp)$/.test(file.type)||file.size>8*1024*1024){imageInput.value='';showToast('JPG, PNG বা WebP ছবি দিন (সর্বোচ্চ ৮ MB)');return;}
          imageProcessing=true;showToast('ছবি প্রস্তুত করা হচ্ছে...');
          let bitmap=null,objectUrl='';
          try{
            if(typeof createImageBitmap==='function'){
              bitmap=await createImageBitmap(file,{resizeWidth:640,resizeQuality:'low'});
            }else{
              objectUrl=URL.createObjectURL(file);
              bitmap=new Image();
              await new Promise((resolve,reject)=>{bitmap.onload=resolve;bitmap.onerror=()=>reject(new Error('ছবি খোলা যায়নি'));bitmap.src=objectUrl;});
            }
            const width=bitmap.naturalWidth||bitmap.width,height=bitmap.naturalHeight||bitmap.height;
            const canvas=document.createElement('canvas');let scale=Math.min(1,640/Math.max(width,height)),blob=null;
            for(let pass=0;pass<5;pass++){
              canvas.width=Math.max(1,Math.round(width*scale));canvas.height=Math.max(1,Math.round(height*scale));
              const ctx=canvas.getContext('2d',{alpha:false});if(!ctx)throw new Error('ছবি প্রস্তুত করা যায়নি');
              ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);
              for(const quality of [0.72,0.58,0.46]){
                blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',quality));
                if(!blob)throw new Error('ছবি কমপ্রেস করা যায়নি');
                if(blob.size<=44*1024)break;
              }
              if(blob&&blob.size<=44*1024)break;
              scale*=0.78;
            }
            canvas.width=canvas.height=1;
            if(!blob||blob.size>44*1024)throw new Error('ছবির আকার কমানো যায়নি');
            const data=await new Promise((resolve,reject)=>{
              const reader=new FileReader();reader.onload=()=>resolve(String(reader.result||''));reader.onerror=()=>reject(new Error('ছবি পড়া যায়নি'));reader.readAsDataURL(blob);
            });
            if(data.length>60000)throw new Error('ছবির আকার বেশি হয়েছে');
            transactionImage=data;
            if(imageLabel)imageLabel.textContent='ছবি যোগ হয়েছে';
            imagePreview.innerHTML='<img alt="লেনদেনের ছবি" src="'+data+'" style="max-width:150px;max-height:130px;border-radius:8px;border:1px solid #dce5df;object-fit:contain">';
            showToast('ছবি যোগ হয়েছে');
          }catch(err){imageInput.value='';transactionImage='';if(imageLabel)imageLabel.textContent='ছবি যোগ করুন';showToast(err.message||'ছবি যোগ করা যায়নি');}
          finally{if(bitmap&&typeof bitmap.close==='function')bitmap.close();if(objectUrl)URL.revokeObjectURL(objectUrl);imageInput.value='';imageProcessing=false;}
        };
        document.getElementById('tx-save').onclick=async()=>{
          if(imageProcessing){showToast('ছবি প্রস্তুত হওয়া পর্যন্ত অপেক্ষা করুন');return;}
          const cid=document.getElementById('tx-customer').value,amount=Number(amountField.value),note=document.getElementById('tx-note').value.trim(),dateValue=document.getElementById('tx-date').value;
          const initialPaid=isSale?Number(paidField.value||0):0;
          if(!cid){showToast('আগে একজন গ্রাহক যোগ করুন');return;}
          if(!dateValue){showToast('লেনদেনের তারিখ নির্বাচন করুন');return;}
          if(!Number.isSafeInteger(amount)||amount<=0){showToast('পূর্ণ সংখ্যায় সঠিক টাকার পরিমাণ লিখুন');return;}
          if(isSale&&(!Number.isSafeInteger(initialPaid)||initialPaid<0||initialPaid>customerTotals(cid).due+amount)){showToast('জমার পরিমাণ আগের বাকি ও নতুন বিক্রির মোট টাকার বেশি হতে পারবে না');return;}
          const selectedDate=new Date(dateValue+'T12:00:00');
          const previousDue=customerTotals(cid).due,transactionId=id();
          db.transactions.push({id:transactionId,customerId:cid,type:db.txType,amount,paid:initialPaid,note,...(transactionImage?{image:transactionImage}:{}),date:selectedDate.toLocaleDateString('bn-BD'),time:new Date().toLocaleTimeString('bn-BD',{hour:'numeric',minute:'2-digit'})});
          const updatedDue=customerTotals(cid).due;
          if(previousDue>0&&updatedDue<=0){e24EnsureNotificationData();const now=new Date(),dayKey=now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0')+'-'+String(now.getDate()).padStart(2,'0'),reminder=[...db.notifications,...(db.notificationArchive||[])].find(x=>String(x.id)==='due-reminder-'+String(cid)+'-'+dayKey);if(reminder)reminder.read=true;const customer=db.customers.find(x=>String(x.id)===String(cid));e24QueueNotification('customer-paid-'+transactionId,'customer-paid','বকেয়া সম্পূর্ণ পরিশোধ',String(customer?.name||'গ্রাহক')+'-এর বকেয়া সম্পূর্ণ পরিশোধ হয়েছে।','3',cid);}
          db.selectedCustomerId=cid;const saved=await save('লেনদেন সংরক্ষিত হয়েছে');if(saved){refreshAll();e24RenderNotifications();}
        };
      }
      function renderCustomerTransactionPage(type) {
        db.txType='বাকি'; const p=document.getElementById('page-3'); if(!p)return;
        const isSale=true; const customer=selected(); const customerBalance=customer?customerTotals(customer.id):{due:0,advance:0};
        const paymentSettings=(db&&db.paymentSettings&&typeof db.paymentSettings==='object')?db.paymentSettings:{};
        const paymentQrItems=[
          {name:'bKash',type:paymentSettings.bkashAccountType==='merchant'?'Merchant':'Personal',value:String((paymentSettings.bkashAccountType==='merchant'?paymentSettings.bkashMerchantId:paymentSettings.bkashPersonalNumber)||'').trim(),payload:'bKash payment information\nAccount type: '+(paymentSettings.bkashAccountType==='merchant'?'Merchant':'Personal')+'\n'+(paymentSettings.bkashAccountType==='merchant'?'Merchant ID: ':'Account number: ')+String((paymentSettings.bkashAccountType==='merchant'?paymentSettings.bkashMerchantId:paymentSettings.bkashPersonalNumber)||'').trim()},
          {name:'Nagad',type:paymentSettings.nagadAccountType==='merchant'?'Merchant':'Personal',value:String((paymentSettings.nagadAccountType==='merchant'?paymentSettings.nagadMerchantId:paymentSettings.nagadPersonalNumber)||'').trim(),payload:'Nagad payment information\nAccount type: '+(paymentSettings.nagadAccountType==='merchant'?'Merchant':'Personal')+'\n'+(paymentSettings.nagadAccountType==='merchant'?'Merchant ID: ':'Account number: ')+String((paymentSettings.nagadAccountType==='merchant'?paymentSettings.nagadMerchantId:paymentSettings.nagadPersonalNumber)||'').trim()},
          {name:'Bank',type:'Bank Account',value:String(paymentSettings.bankAccount||'').trim(),payload:'Bank payment information\nBank: '+String(paymentSettings.bankName||'').trim()+'\nAccount holder: '+String(paymentSettings.bankHolder||'').trim()+'\nAccount number: '+String(paymentSettings.bankAccount||'').trim()+'\nBranch: '+String(paymentSettings.bankBranch||'').trim()+'\nRouting: '+String(paymentSettings.bankRouting||'').trim()}
        ].filter(item=>item.value);
        const paymentQrUrl=(item,amount)=>'https://api.qrserver.com/v1/create-qr-code/?size=180x180&data='+encodeURIComponent(item.payload+'\nOutstanding amount: BDT '+String(Math.max(0,Number(amount)||0)));
        const paymentQrHtml='<section class="e24-customer-payment-qr e24-ref-payment-qr" aria-label="পেমেন্ট QR"><h3><i class="fa-solid fa-qrcode"></i> পেমেন্ট QR কোড</h3><div class="e24-customer-payment-qr-grid">'+(paymentQrItems.length?paymentQrItems.map((item,index)=>'<div class="e24-customer-payment-qr-card"><strong>'+esc(item.name)+' '+esc(item.type)+'</strong><img data-payment-qr-index="'+index+'" src="'+paymentQrUrl(item,customerBalance.due)+'" alt="'+esc(item.name)+' পেমেন্ট তথ্যের QR" loading="lazy"><span>'+esc(item.value)+'</span></div>').join(''):'<p class="e24-customer-payment-qr-empty">Settings-এর Payment Settings-এ bKash, Nagad অথবা Bank তথ্য যোগ করে Save করুন।</p>')+'</div><small class="e24-customer-payment-qr-note">QR-এ অ্যাকাউন্টের তথ্য ও বর্তমান বকেয়া দেখানো হয়। এটি নিজে থেকে টাকা গ্রহণ বা পেমেন্ট যাচাই করে না। Merchant API যুক্ত না হওয়া পর্যন্ত Merchant ID দিয়ে লাইভ Checkout হবে না।</small><div class="e24-demo-payment"><strong>Merchant Payment — Demo Test Mode</strong><div class="e24-demo-payment-amount" id="e24-demo-payment-amount">পরীক্ষার পরিমাণ: '+money(customerBalance.due)+'</div><p>এটি শুধু পরীক্ষামূলক ফলাফল দেখায়। কোনো আসল টাকা লেনদেন হবে না এবং গ্রাহকের বকেয়া পরিবর্তন হবে না।</p><div class="e24-demo-payment-actions"><button type="button" class="btn btn-green" id="e24-demo-payment-success">সফল পেমেন্ট পরীক্ষা</button><button type="button" class="btn btn-logout" id="e24-demo-payment-fail">ব্যর্থ পেমেন্ট পরীক্ষা</button></div><div class="e24-demo-payment-result" id="e24-demo-payment-result" aria-live="polite">পরীক্ষার জন্য একটি ফলাফল নির্বাচন করুন।</div></div></section>';
        p.innerHTML=`<div class="e24-ref-balance-row"><div class="e24-ref-balance"><strong>${customerBalance.due>0?'পাবো '+money(customerBalance.due):customerBalance.advance>0?'অগ্রিম '+money(customerBalance.advance):'হিসাব পরিশোধিত'}</strong><small>বর্তমান হিসাব</small></div><button type="button" class="e24-ref-action" id="e24-ref-reminder"><i class="fa-regular fa-bell"></i> তাগাদা</button><button type="button" class="e24-ref-action" id="e24-ref-report"><i class="fa-solid fa-list-check"></i> রিপোর্ট</button></div><select id="tx-customer" class="e24-ref-hidden-select" aria-label="গ্রাহক">${db.customers.length?db.customers.map(c=>`<option value="${esc(c.id)}" ${customer?.id===c.id?'selected':''}>${esc(c.name)}</option>`).join(''):'<option value="">কোনো গ্রাহক নেই</option>'}</select><input id="tx-customer-search" type="hidden"><div class="e24-ref-amounts"><div class="e24-ref-amount"><label>৳ বিক্রি করলাম</label><input class="form-input" id="tx-amount" type="number" min="1" step="1" inputmode="numeric" placeholder="টাকার পরিমাণ"></div><div class="e24-ref-amount"><label>৳ জমা নিলাম</label><input class="form-input" id="tx-initial-paid" type="number" min="0" step="1" inputmode="numeric" placeholder="জমার পরিমাণ"></div></div><div class="e24-ref-remaining">অবশিষ্ট বাকি: <strong id="tx-remaining">${money(customerBalance.due)}</strong></div><div class="tx-description-field"><i class="fa-regular fa-pen-to-square" aria-hidden="true"></i><textarea id="tx-note" rows="1" aria-label="লেনদেনের বিবরণ" placeholder="বিবরণ"></textarea></div><div class="tx-meta-actions"><button type="button" class="tx-meta-btn" id="tx-date-button"><i class="fa-solid fa-calendar-days"></i><span id="tx-date-label">${(()=>{const d=new Date();return d.toLocaleDateString("bn-BD",{day:"numeric",month:"long"})})()}</span></button><button type="button" class="tx-meta-btn" id="tx-image-button"><span class="tx-camera-plus" aria-hidden="true"><i class="fa-solid fa-camera"></i><i class="fa-solid fa-circle-plus e24-tx-edit-camera-plus"></i></span><span id="tx-image-label">ছবি</span></button></div><input class="tx-hidden-input" id="tx-date" type="date" aria-label="লেনদেনের তারিখ" value="${(()=>{const d=new Date();return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")})()}"><input class="tx-hidden-input" id="tx-image" type="file" accept="image/*" capture="environment" aria-label="লেনদেনের ছবি"><div id="tx-image-preview" style="margin-top:8px"></div><button type="button" class="btn btn-green shadow-btn e24-ref-confirm" id="tx-save"><i class="fa-solid fa-check"></i> নিশ্চিত করুন</button><div class="e24-ref-qr"><p>এই QR কোডে বিকাশ, নগদ ও ব্যাংক অ্যাপ থেকে পেমেন্টের তথ্য দেখুন।</p><a href="javascript:void(0)" id="e24-ref-no-cost">আপনার কোন খরচ নাই* <i class="fa-solid fa-chevron-right"></i></a>${paymentQrHtml}</div>`;

        document.getElementById('e24-ref-reminder').onclick=()=>showToast('তাগাদা পাঠানোর জন্য SMS সুবিধা ব্যবহার করুন'); document.getElementById('e24-ref-report').onclick=()=>switchPage('12');
        const customerSearch=document.getElementById('tx-customer-search'),customerSelect=document.getElementById('tx-customer');
        const txAddCustomerButton=document.getElementById('tx-add-customer');if(txAddCustomerButton)txAddCustomerButton.onclick=()=>{transactionAddCustomer=true;editingCustomerId=null;setCustomerEntryType('customer');document.getElementById('new-customer-name').value='';document.getElementById('new-customer-phone').value='';document.getElementById('new-customer-address').value='';document.getElementById('customer-modal-title').textContent='নতুন গ্রাহক';document.getElementById('customer-submit-label').textContent='সংরক্ষণ';const customerModal=document.getElementById('page-14');customerModal.classList.add('show');customerModal.setAttribute('aria-hidden','false');setTimeout(()=>document.getElementById('new-customer-name').focus(),80);};
        if(customerSearch&&customerSelect){let filteringCustomers=false;customerSearch.addEventListener('input',()=>{const q=customerSearch.value.trim().toLocaleLowerCase();const current=customerSelect.value;const matches=db.customers.filter(c=>(c.name||'').toLocaleLowerCase().includes(q)||(c.phone||'').replace(/\\D/g,'').includes(q.replace(/\\D/g,'')));customerSelect.innerHTML=matches.length?matches.map(c=>`<option value="${esc(c.id)}">${esc(c.name)}</option>`).join(''):'<option value="">কোনো গ্রাহক পাওয়া যায়নি</option>';if(matches.some(c=>c.id===current))customerSelect.value=current;else if(matches.length)customerSelect.value=matches[0].id;filteringCustomers=true;customerSelect.dispatchEvent(new Event('change'));filteringCustomers=false;});customerSelect.addEventListener('change',()=>{if(!filteringCustomers)customerSearch.value='';});}
        const amountField=document.getElementById('tx-amount'),paidField=document.getElementById('tx-initial-paid'),remaining=document.getElementById('tx-remaining');
        const dateInput=document.getElementById('tx-date'),dateButton=document.getElementById('tx-date-button'),dateLabel=document.getElementById('tx-date-label');
        const refreshDateLabel=()=>{if(dateLabel&&dateInput.value){const d=new Date(dateInput.value+'T12:00:00');dateLabel.textContent=d.toLocaleDateString('bn-BD',{day:'numeric',month:'long'});}};
        if(dateButton)dateButton.addEventListener('click',event=>{
          event.preventDefault();
          if(typeof dateInput.showPicker==='function'){
            try{dateInput.showPicker();return;}catch(_){}
          }
          dateInput.click();
        });
        if(dateInput){dateInput.addEventListener('change',refreshDateLabel);refreshDateLabel();}
        const imageButton=document.getElementById('tx-image-button'),imageLabel=document.getElementById('tx-image-label');
        if(imageButton)imageButton.addEventListener('click',event=>{
          event.preventDefault();
          imageInput.click();
        });
        const updateRemaining=()=>{const cid=document.getElementById('tx-customer').value,oldDue=customerTotals(cid).due,nextDue=Math.max(0,oldDue+(Number(amountField.value)||0)-(Number(paidField.value)||0));if(remaining)remaining.textContent=money(nextDue);paymentQrItems.forEach((item,index)=>{const qr=document.querySelector('[data-payment-qr-index="'+index+'"]');if(qr)qr.src=paymentQrUrl(item,nextDue);});const demoAmount=document.getElementById('e24-demo-payment-amount');if(demoAmount)demoAmount.textContent='পরীক্ষার পরিমাণ: '+money(nextDue);};
const demoResult=document.getElementById('e24-demo-payment-result'),demoSuccess=document.getElementById('e24-demo-payment-success'),demoFail=document.getElementById('e24-demo-payment-fail');if(demoSuccess)demoSuccess.onclick=()=>{if(demoResult)demoResult.textContent='DEMO SUCCESS: পরীক্ষামূলক পেমেন্ট সফল দেখানো হয়েছে। কোনো আসল টাকা নেওয়া হয়নি এবং বকেয়া অপরিবর্তিত আছে।';};if(demoFail)demoFail.onclick=()=>{if(demoResult)demoResult.textContent='DEMO FAILED: পরীক্ষামূলক পেমেন্ট ব্যর্থ দেখানো হয়েছে। কোনো টাকা নেওয়া হয়নি এবং বকেয়া অপরিবর্তিত আছে।';};
        if(paidField){amountField.addEventListener('input',updateRemaining);paidField.addEventListener('input',updateRemaining);document.getElementById('tx-customer').addEventListener('change',updateRemaining);updateRemaining();}
        let transactionImage='',imageProcessing=false;
        const imageInput=document.getElementById('tx-image'),imagePreview=document.getElementById('tx-image-preview');
        imageInput.onchange=async()=>{
          const file=imageInput.files&&imageInput.files[0];transactionImage='';imagePreview.innerHTML='';
          if(imageLabel)imageLabel.textContent='ছবি যোগ করুন';
          if(!file)return;
          if(!/^image\/(jpeg|png|webp)$/.test(file.type)||file.size>8*1024*1024){imageInput.value='';showToast('JPG, PNG বা WebP ছবি দিন (সর্বোচ্চ ৮ MB)');return;}
          imageProcessing=true;showToast('ছবি প্রস্তুত করা হচ্ছে...');
          try{
            const objectUrl=URL.createObjectURL(file);
            try{
              const img=new Image();await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=()=>reject(new Error('ছবি খোলা যায়নি'));img.src=objectUrl;});
              const canvas=document.createElement('canvas');let scale=Math.min(1,1000/Math.max(img.naturalWidth,img.naturalHeight)),data='';
              for(let pass=0;pass<5;pass++){
                canvas.width=Math.max(1,Math.round(img.naturalWidth*scale));canvas.height=Math.max(1,Math.round(img.naturalHeight*scale));
                const ctx=canvas.getContext('2d');ctx.drawImage(img,0,0,canvas.width,canvas.height);
                for(const quality of [0.76,0.64,0.52,0.42]){data=canvas.toDataURL('image/jpeg',quality);if(data.length<=60000)break;}
                if(data.length<=60000)break;scale*=0.72;
              }
              if(data.length>60000)throw new Error('ছবির আকার কমানো যায়নি');
              transactionImage=data;if(imageLabel)imageLabel.textContent='ছবি যোগ হয়েছে';imagePreview.innerHTML='<img alt="লেনদেনের ছবি" src="'+data+'" style="max-width:150px;max-height:130px;border-radius:8px;border:1px solid #dce5df;object-fit:contain">';
              showToast('ছবি যোগ হয়েছে');
            }finally{URL.revokeObjectURL(objectUrl);}
          }catch(err){imageInput.value='';transactionImage='';if(imageLabel)imageLabel.textContent='ছবি যোগ করুন';showToast(err.message||'ছবি যোগ করা যায়নি');}
          finally{imageProcessing=false;}
        };
        document.getElementById('tx-save').onclick=async()=>{
          if(imageProcessing){showToast('ছবি প্রস্তুত হওয়া পর্যন্ত অপেক্ষা করুন');return;}
          const cid=document.getElementById('tx-customer').value,amount=Number(amountField.value),note=document.getElementById('tx-note').value.trim(),dateValue=document.getElementById('tx-date').value;
          const initialPaid=isSale?Number(paidField.value||0):0;
          if(!cid){showToast('আগে একজন গ্রাহক যোগ করুন');return;}
          if(!dateValue){showToast('লেনদেনের তারিখ নির্বাচন করুন');return;}
          if(!Number.isSafeInteger(amount)||amount<=0){showToast('পূর্ণ সংখ্যায় সঠিক টাকার পরিমাণ লিখুন');return;}
          if(isSale&&(!Number.isSafeInteger(initialPaid)||initialPaid<0||initialPaid>customerTotals(cid).due+amount)){showToast('জমার পরিমাণ আগের বাকি ও নতুন বিক্রির মোট টাকার বেশি হতে পারবে না');return;}
          const selectedDate=new Date(dateValue+'T12:00:00');
          const previousDue=customerTotals(cid).due,transactionId=id();
          db.transactions.push({id:transactionId,customerId:cid,type:db.txType,amount,paid:initialPaid,note,...(transactionImage?{image:transactionImage}:{}),date:selectedDate.toLocaleDateString('bn-BD'),time:new Date().toLocaleTimeString('bn-BD',{hour:'numeric',minute:'2-digit'})});
          const updatedDue=customerTotals(cid).due;
          if(previousDue>0&&updatedDue<=0){e24EnsureNotificationData();const now=new Date(),dayKey=now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0')+'-'+String(now.getDate()).padStart(2,'0'),reminder=[...db.notifications,...(db.notificationArchive||[])].find(x=>String(x.id)==='due-reminder-'+String(cid)+'-'+dayKey);if(reminder)reminder.read=true;const customer=db.customers.find(x=>String(x.id)===String(cid));e24QueueNotification('customer-paid-'+transactionId,'customer-paid','বকেয়া সম্পূর্ণ পরিশোধ',String(customer?.name||'গ্রাহক')+'-এর বকেয়া সম্পূর্ণ পরিশোধ হয়েছে।','3',cid);}
          db.selectedCustomerId=cid;save('লেনদেন সংরক্ষিত হয়েছে');refreshAll();e24RenderNotifications();renderCustomerTransactionPage('বাকি');
        };
      }
      function refreshHome() {
        const txs=validTransactions();
        const today=new Date().toLocaleDateString('bn-BD');
        const totals=allCustomerTotals();
        const currentDue=totals.due;
        const todayTx=txs.filter(t=>String(t.date)===today);
        const todayTotals=calculateBalances(todayTx);
        const set=(id,value)=>{const el=document.getElementById(id);if(el)el.textContent=value;};
        set('today-sales',money(todayTotals.sales));
        set('today-paid',money(todayTotals.paid));
        set('today-due',money(todayTotals.due));
        set('customer-count',db.customers.length.toLocaleString('bn-BD')+' জন');
        set('current-total-due',money(currentDue));
        const supplierTxs=db.supplierTransactions||[];
        set('supplier-total-due',money((db.suppliers||[]).reduce((sum,s)=>sum+supplierBalance(s.id),0)));
        set('supplier-total-purchase',money(supplierTxs.filter(x=>x.type===1||x.type==='purchase').reduce((sum,x)=>sum+(Number(x.amount)||0),0)));
        set('supplier-total-paid',money(supplierTxs.filter(x=>x.type===2||x.type==='payment').reduce((sum,x)=>sum+(Number(x.amount)||0),0)));
        refreshReport();
        const recent=txs;
        const ul=document.querySelector('#page-1 .transaction-list');
        if(ul)ul.innerHTML=recent.length?recent.slice(-5).reverse().map(t=>{const c=db.customers.find(x=>x.id===t.customerId);return `<li class="transaction-item"><span class="tx-icon ${t.type==='জমা'?'icon-up':'icon-down'}"><i class="fa-solid ${t.type==='জমা'?'fa-arrow-up':'fa-arrow-down'}"></i></span><div class="tx-info"><span class="tx-name">${esc(c?.name||'গ্রাহক')}</span><span class="tx-sub ${t.type==='বাকি'?'text-red':''}">${t.type==='বাকি'?'বিক্রি':'জমা'}: ${money(t.amount)}${t.type==='বাকি'&&Number(t.paid)>0?' · জমা: '+money(t.paid):''}</span></div><span class="tx-date">${esc(t.date)}</span></li>`}).join(''):'<li style="padding:18px;text-align:center;color:#888">কোনো লেনদেন নেই</li>';
      }
      let reportMode='daily', reportCursor=new Date();
      const {bnDigits,reportDate,reportMonthNames}=window.E24TransactionUtils;
      function reportSetMode(mode){reportMode=mode;reportCursor=new Date();document.querySelectorAll('.rep-tab').forEach(el=>el.classList.toggle('active',el.dataset.mode===mode));refreshReport();}
      function reportShift(step){if(reportMode==='daily')reportCursor.setDate(reportCursor.getDate()+step);else if(reportMode==='monthly')reportCursor.setMonth(reportCursor.getMonth()+step);else reportCursor.setFullYear(reportCursor.getFullYear()+step);refreshReport();}
      window.reportSetMode=reportSetMode;window.reportShift=reportShift;
      function refreshReport(){
        const y=reportCursor.getFullYear(),m=reportCursor.getMonth(),d=reportCursor.getDate();
        let start,end,label;
        if(reportMode==='daily'){start=new Date(y,m,d);end=new Date(y,m,d+1);label=reportCursor.toLocaleDateString('bn-BD',{day:'numeric',month:'long',year:'numeric'});}
        else if(reportMode==='monthly'){start=new Date(y,m,1);end=new Date(y,m+1,1);label=reportMonthNames[m]+' '+String(y).replace(/\d/g,n=>'০১২৩৪৫৬৭৮৯'[Number(n)]);}
        else {start=new Date(y,0,1);end=new Date(y+1,0,1);label=String(y).replace(/\d/g,n=>'০১২৩৪৫৬৭৮৯'[Number(n)]);}
        const labelEl=document.getElementById('report-period-label');if(labelEl)labelEl.innerHTML='<i class="fa-regular fa-calendar"></i> '+label;
        const rows=validTransactions().filter(t=>{const dt=reportDate(t.date);return dt&&dt>=start&&dt<end;}).sort((a,b)=>(reportDate(b.date)||0)-(reportDate(a.date)||0));
        const totals=calculateBalances(rows);
        const supplierRows=(db.supplierTransactions||[]).filter(x=>{const dt=reportDate(x.date);return dt&&dt>=start&&dt<end;});
        const supplierPurchases=supplierRows.filter(x=>x.type===1||x.type==='purchase').reduce((sum,x)=>sum+(Number(x.amount)||0),0);
        const supplierPayments=supplierRows.filter(x=>x.type===2||x.type==='payment').reduce((sum,x)=>sum+(Number(x.amount)||0),0);
        const supplierDue=(db.suppliers||[]).reduce((sum,s)=>sum+supplierBalance(s.id),0);
        const set=(id,value)=>{const el=document.getElementById(id);if(el)el.textContent=value;};
        set('report-total-sales',money(totals.sales));set('report-total-paid',money(totals.paid));set('report-total-due',money(totals.due));set('report-total-advance',money(totals.advance));
        set('report-supplier-purchase',money(supplierPurchases));set('report-supplier-paid',money(supplierPayments));set('report-supplier-due',money(supplierDue));
        const total=totals.sales,paidPct=total?Math.round(Math.min(totals.sales,totals.paid-totals.advance)/total*100):0,duePct=total?Math.round(totals.due/total*100):0;
        const pie=document.getElementById('report-pie-chart');if(pie){if(total<=0){pie.innerHTML='';pie.style.background='transparent';}else if(paidPct<=0||paidPct>=100){pie.innerHTML='';pie.style.background=paidPct<=0?'var(--accent-red)':'var(--primary-green)';}else{const size=55,center=size/2,radius=center,splitDeg=paidPct*3.6,endX=center+radius*Math.sin(splitDeg*Math.PI/180),endY=center-radius*Math.cos(splitDeg*Math.PI/180),largeArc=splitDeg>180?1:0;pie.style.background='transparent';pie.innerHTML=`<svg viewBox="0 0 55 55" width="55" height="55" aria-hidden="true"><defs><clipPath id="reportPieClip"><circle cx="27.5" cy="27.5" r="27.5"/></clipPath></defs><g clip-path="url(#reportPieClip)"><circle cx="27.5" cy="27.5" r="27.5" fill="var(--primary-green)"/><path d="M 27.5 27.5 L 27.5 0 A 27.5 27.5 0 ${largeArc} 1 ${endX} ${endY} Z" fill="var(--accent-red)"/><path d="M 27.5 27.5 L 27.5 0 M 27.5 27.5 L ${endX} ${endY}" fill="none" stroke="#fff" stroke-width="1.5" stroke-linecap="butt"/></g></svg>`;}}
        set('report-paid-label',`জমা (${paidPct}%)`);set('report-due-label',`বাকি (${duePct}%)`);set('report-tx-count','লেনদেন: '+rows.length.toLocaleString('bn-BD')+'টি');
        const list=document.getElementById('report-transaction-list');
        if(list)list.innerHTML=rows.length?rows.map(t=>{const c=db.customers.find(x=>String(x.id)===String(t.customerId));const isDue=t.type==='বাকি';return `<li class="e24-report-recent-item" data-txid="${esc(t.id)}"><span class="e24-report-recent-icon ${isDue?'e24-report-recent-down':'e24-report-recent-up'}"><i class="fa-solid ${isDue?'fa-arrow-down':'fa-arrow-up'}"></i></span><div class="e24-report-recent-info"><span class="e24-report-recent-name">${esc(c?.name||'গ্রাহক')} — ${isDue?'বিক্রি':'জমা'}</span><span class="e24-report-recent-amount ${isDue?'e24-is-due':'e24-is-paid'}">${money(t.amount)}${isDue&&Number(t.paid)>0?' · তাৎক্ষণিক জমা '+money(t.paid):''}${t.note?' · '+esc(t.note):''}</span></div><span class="e24-report-recent-date">${esc(t.date)}</span></li>`;}).join(''):'<li class="e24-report-recent-empty">এই সময়ে কোনো লেনদেন নেই</li>';
      }
      window.printReport=()=>{document.body.classList.add('report-printing');window.print();setTimeout(()=>document.body.classList.remove('report-printing'),500);};

      let e24ReportSelectedTransactionId=null;let e24TransactionReturnPage='3';
      function e24RenderReportTransactionDetail(){
        const headerTitle=document.querySelector('#dynamic-app-bar #bar-title');if(headerTitle)headerTitle.textContent='লেনদেন';
        const page=document.getElementById('page-13'),t=(db.transactions||[]).find(x=>String(x.id)===String(e24ReportSelectedTransactionId));
        if(!page)return;
        if(!t){page.innerHTML='<div class="e24-tx-detail"><p class="report-empty">লেনদেনটি পাওয়া যায়নি।</p><button class="btn btn-blue" type="button" onclick="switchPage(\'\${e24TransactionReturnPage}\')">রিপোর্টে ফিরে যান</button></div>';return;}
        const customer=(db.customers||[]).find(x=>String(x.id)===String(t.customerId));
        const gave=t.type==='বাকি'?Number(t.amount)||0:0,got=t.type==='বাকি'?(Number(t.paid)||0):(Number(t.amount)||0);
        const parsedDate=reportDate(t.date),date=esc(parsedDate?parsedDate.toLocaleDateString('bn-BD',{day:'numeric',month:'long',year:'numeric'}):(t.date||'')),time=esc(t.time||'সময় উল্লেখ নেই');
        const transactionImage=typeof t.image==='string'&&/^data:image\/(?:jpeg|png|webp);base64,/.test(t.image)?'<img class="e24-tx-detail-picture" src="'+t.image+'" alt="লেনদেনের ছবি">':'';
        page.innerHTML=`<section class="e24-tx-detail">
          <div class="e24-tx-detail-grid">
            <div class="e24-tx-detail-column">
              <div class="e24-tx-detail-head">বিবরণ</div>
              <div class="e24-tx-detail-description">
                <strong class="e24-tx-detail-date">${date}</strong>
                <small class="e24-tx-detail-time">${time}</small>
                <strong class="e24-tx-detail-due">বাকি: ${money(gave)}</strong>
                <div id="e24-tx-detail-picture-slot">${transactionImage}</div>
              </div>
            </div>
            <div class="e24-tx-detail-column">
              <div class="e24-tx-detail-head">বিক্রি করলাম</div>
              <div class="e24-tx-detail-amount red-text">${gave?money(gave):'—'}</div>
            </div>
            <div class="e24-tx-detail-column">
              <div class="e24-tx-detail-head">জমা নিলাম</div>
              <div class="e24-tx-detail-amount green-text">${got?money(got):'—'}</div>
            </div>
          </div>
          <div class="e24-tx-detail-actions"><button type="button" class="btn btn-red" id="e24-tx-delete"><i class="fa-solid fa-trash"></i> ডিলেট</button><button type="button" class="btn btn-blue" id="e24-tx-edit"><i class="fa-solid fa-pen-to-square"></i> এডিট</button></div>
          <div id="e24-tx-edit-area"></div>
        </section>`;
        if(!transactionImage&&activeDataUid&&t.id){
          const imageDocId='tximg_'+String(t.id).replace(/[^A-Za-z0-9_-]/g,'_');
          e24Store.collection('users').doc(activeDataUid).collection('data').doc(imageDocId).get().then(snapshot=>{
            const storedImage=snapshot.exists?snapshot.data()?.image:'';
            if(typeof storedImage==='string'&&/^data:image\/(?:jpeg|png|webp);base64,/.test(storedImage)){
              const slot=document.getElementById('e24-tx-detail-picture-slot');
              if(slot)slot.innerHTML='<img class="e24-tx-detail-picture" src="'+storedImage+'" alt="লেনদেনের ছবি">';
            }
          }).catch(error=>console.warn('E24 transaction image load failed:',error));
        }
        document.getElementById('e24-tx-delete').onclick=async()=>{
          if(!(await showAppConfirm('এই লেনদেনটি স্থায়ীভাবে ডিলেট করবেন?','লেনদেন ডিলেট করবেন?')))return;
          const index=db.transactions.findIndex(x=>String(x.id)===String(t.id));if(index<0)return;
          const removed=db.transactions.splice(index,1)[0];
          if(!await save()){db.transactions.splice(index,0,removed);return;}
          refreshReport();switchPage(e24TransactionReturnPage);showToast('লেনদেন ডিলেট করা হয়েছে','success');
        };
        document.getElementById('e24-tx-edit').onclick=()=>{
          const area=document.getElementById('e24-tx-edit-area');
          let editImage=typeof t.image==='string'?t.image:'',imageLoadToken=0;
          const avatar=customer?.photo?'<img src="'+esc(safeCustomerPhoto(customer.photo))+'" alt="গ্রাহকের ছবি">':'<span class="e24-tx-edit-avatar"><i class="fa-solid fa-user"></i></span>';
          area.innerHTML=`<div class="e24-tx-edit-form">
            <div class="e24-tx-edit-customer">${avatar}<span>${esc(customer?.name||'গ্রাহক')}</span></div>
            <div class="e24-tx-edit-amounts">
              <div><label for="e24-edit-gave">বিক্রি করলাম (৳)</label><input id="e24-edit-gave" type="number" min="0" step="1" inputmode="numeric" value="${gave}"></div>
              <div><label for="e24-edit-got">জমা নিলাম (৳)</label><input id="e24-edit-got" type="number" min="0" step="1" inputmode="numeric" value="${got}"></div>
            </div>
            <div><label for="e24-edit-note">বিবরণ</label><textarea id="e24-edit-note" rows="3">${esc(t.note||'')}</textarea></div>
            <div><label>লেনদেনের ছবি</label><input id="e24-edit-image-input" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" hidden><button type="button" class="e24-tx-edit-camera" id="e24-edit-camera" aria-label="ক্যামেরা দিয়ে ছবি যোগ করুন"><i class="fa-solid fa-camera"></i><i class="fa-solid fa-circle-plus e24-tx-edit-camera-plus"></i></button><div id="e24-edit-image-preview"></div></div>
            <div class="e24-tx-edit-save-row"><button type="button" class="btn btn-gray" id="e24-tx-edit-cancel">বাতিল</button><button type="button" class="btn btn-green" id="e24-tx-edit-save"><i class="fa-solid fa-floppy-disk"></i> সংরক্ষণ</button></div>
          </div>`;
          const preview=document.getElementById('e24-edit-image-preview');
          const renderPreview=()=>{preview.innerHTML=editImage?'<div class="e24-tx-edit-preview-wrap"><img src="'+editImage+'" alt="লেনদেনের ছবির প্রিভিউ"><button type="button" class="e24-tx-edit-photo-remove" id="e24-edit-photo-remove" aria-label="ছবি সরান">×</button></div>':'';const remove=document.getElementById('e24-edit-photo-remove');if(remove)remove.onclick=()=>{editImage='';renderPreview();};};
          renderPreview();
          if(!editImage){
            const token=++imageLoadToken;
            e24Store.collection('users').doc(activeDataUid).collection('data').doc('tximg_'+String(t.id).replace(/[^A-Za-z0-9_-]/g,'_')).get().then(snap=>{
              const value=snap.exists?snap.data().image:'';
              if(token===imageLoadToken&&!editImage&&typeof value==='string'&&/^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(value)){editImage=value;renderPreview();}
            }).catch(err=>console.warn('E24 edit image load failed:',err));
          }
          document.getElementById('e24-edit-camera').onclick=()=>document.getElementById('e24-edit-image-input').click();
          document.getElementById('e24-edit-image-input').onchange=async event=>{
            const file=event.target.files&&event.target.files[0];if(!file)return;
            if(!/^image\/(?:jpeg|png|webp)$/.test(file.type)||file.size>20*1024*1024){showToast('JPG, PNG বা WebP ছবি দিন (সর্বোচ্চ ২০ MB)');event.target.value='';return;}
            let bitmap=null;
            try{
              bitmap=await createImageBitmap(file);
              const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d',{alpha:false});
              if(!ctx)throw new Error('ছবি প্রস্তুত করা যায়নি');
              let scale=Math.min(1,640/Math.max(bitmap.width,bitmap.height)),encoded='';
              for(let pass=0;pass<8;pass++){
                canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));
                ctx.clearRect(0,0,canvas.width,canvas.height);ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);
                for(const quality of [.72,.58,.46,.34]){
                  encoded=canvas.toDataURL('image/jpeg',quality);
                  if(encoded.length<=45000)break;
                }
                if(encoded.length<=45000)break;
                scale*=.75;
              }
              if(!encoded||encoded.length>45000)throw new Error('ছবির আকার কমানো যায়নি, অন্য ছবি চেষ্টা করুন');
              editImage=encoded;renderPreview();showToast('ছবি কমপ্রেস করে যোগ হয়েছে');
            }catch(err){showToast(err.message||'ছবি যোগ করা যায়নি');}
            finally{if(bitmap&&typeof bitmap.close==='function')bitmap.close();event.target.value='';}
          };
          const title=document.querySelector('#dynamic-app-bar #bar-title');if(title)title.textContent='লেনদেন এডিট';
          document.querySelector('#page-13 .e24-tx-detail')?.classList.add('e24-tx-detail-editing');
          document.getElementById('e24-tx-edit-cancel').onclick=()=>e24RenderReportTransactionDetail();
          document.getElementById('e24-tx-edit-save').onclick=async()=>{
            const nextGave=Number(document.getElementById('e24-edit-gave').value),nextGot=Number(document.getElementById('e24-edit-got').value),nextNote=document.getElementById('e24-edit-note').value.trim();
            if(!Number.isSafeInteger(nextGave)||!Number.isSafeInteger(nextGot)||nextGave<0||nextGot<0||nextGave+nextGot<=0){showToast('সঠিক টাকার পরিমাণ দিন');return;}
            const old={...t};if(nextGave>0){t.type='বাকি';t.amount=nextGave;t.paid=nextGot;}else{t.type='জমা';t.amount=nextGot;delete t.paid;}
            t.note=nextNote;
            if(editImage)t.image=editImage;else delete t.image;
            if(e24SavedTransactionImageIds)e24SavedTransactionImageIds.delete(String(t.id));
            if(!await save()){Object.keys(t).forEach(key=>delete t[key]);Object.assign(t,old);return;}
            if(!editImage){try{await e24Store.collection('users').doc(activeDataUid).collection('data').doc('tximg_'+String(t.id).replace(/[^A-Za-z0-9_-]/g,'_')).delete();}catch(err){console.warn('E24 old transaction image cleanup failed:',err);}}
            refreshReport();switchPage(e24TransactionReturnPage);showToast('লেনদেন আপডেট হয়েছে','success');
          };
        };
      }
      window.e24BackFromTransaction=()=>switchPage(e24TransactionReturnPage);
      window.e24OpenReportTransaction=(id,returnPage='3')=>{const activePage=document.querySelector('.app-page.active-page');const activePageId=activePage&&activePage.id.match(/^page-(\d+)$/);e24ReportSelectedTransactionId=String(id);e24TransactionReturnPage=activePageId&&activePageId[1]!=='13'?activePageId[1]:String(returnPage||'3');e24RenderReportTransactionDetail();switchPage('13');};
      document.addEventListener('click',event=>{const reportRow=event.target.closest('#report-transaction-list [data-txid]');if(reportRow){window.e24OpenReportTransaction(reportRow.dataset.txid,'7');return;}const customerReportRow=event.target.closest('#customer-report-rows .customer-report-row[data-txid]');if(customerReportRow){window.e24OpenReportTransaction(customerReportRow.dataset.txid,'12');return;}const row=event.target.closest('#page-legacy-ledger .transaction-history .history-item[data-txid]');if(row)window.e24OpenReportTransaction(row.dataset.txid,'3');});
      document.addEventListener('keydown',event=>{if(event.key!=='Enter'&&event.key!==' ')return;const reportRow=event.target.closest&&event.target.closest('#report-transaction-list [data-txid]');if(reportRow){event.preventDefault();window.e24OpenReportTransaction(reportRow.dataset.txid,'7');return;}const customerReportRow=event.target.closest&&event.target.closest('#customer-report-rows .customer-report-row[data-txid]');if(customerReportRow){event.preventDefault();window.e24OpenReportTransaction(customerReportRow.dataset.txid,'12');return;}const row=event.target.closest&&event.target.closest('#page-legacy-ledger .transaction-history .history-item[data-txid]');if(row){event.preventDefault();window.e24OpenReportTransaction(row.dataset.txid,'3');}});

      function supplierBalance(sid){return (db.supplierTransactions||[]).filter(x=>String(x.supplierId)===String(sid)).reduce((v,x)=>v+((x.type===1||x.type==='purchase')?(+x.amount||0):-(+x.amount||0)),0);}
function renderSupplierPage(){const ul=document.getElementById('supplier-list'),list=document.getElementById('supplier-list-view'),form=document.getElementById('supplier-form-view'),detail=document.getElementById('supplier-detail-view');if(!ul||!list||!form||!detail)return;const pageTop=document.querySelector('#page-9 .supplier-page-top');if(pageTop)pageTop.hidden=false;list.hidden=false;form.hidden=true;detail.hidden=true;const suppliers=db.suppliers||[],txs=db.supplierTransactions||[],purchases=txs.filter(x=>x.type===1||x.type==='purchase').reduce((n,x)=>n+(+x.amount||0),0),paid=txs.filter(x=>x.type===2||x.type==='payment').reduce((n,x)=>n+(+x.amount||0),0),due=suppliers.reduce((n,x)=>n+supplierBalance(x.id),0);const put=(id,value)=>{const el=document.getElementById(id);if(el)el.textContent=money(value);};put('supplier-page-total-due',due);put('supplier-page-total-purchase',purchases);put('supplier-page-total-paid',paid);const count=document.getElementById('supplier-count-label');if(count)count.textContent=suppliers.length+' জন সাপ্লায়ার';ul.innerHTML=suppliers.map(s=>'<li class="supplier-page-item" data-sid="'+esc(s.id)+'"><span class="supplier-row-icon"><i class="fa-solid fa-truck"></i></span><span class="supplier-row-info"><strong class="supplier-name-open" role="button" tabindex="0">'+esc(s.name)+'</strong><small>'+esc(s.phone||s.address||'')+'</small></span><span class="supplier-row-balance"><small>বকেয়া</small><strong>'+money(supplierBalance(s.id))+'</strong></span><i class="fa-solid fa-chevron-right supplier-row-arrow"></i></li>').join('')||'<li class="supplier-empty">এখনো কোনো সাপ্লায়ার যোগ করা হয়নি</li>';ul.querySelectorAll('[data-sid]').forEach(el=>{el.classList.remove('supplier-selected');el.removeAttribute('aria-selected');const nameEl=el.querySelector('.supplier-name-open');const openDetail=()=>{db.selectedSupplierId=el.dataset.sid;e24ShowSupplier(el.dataset.sid);};nameEl.onclick=openDetail;nameEl.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();openDetail();}};});const search=document.getElementById('supplier-search');if(search&&!search.dataset.bound){search.dataset.bound='1';search.addEventListener('input',()=>ul.querySelectorAll('[data-sid]').forEach(el=>el.hidden=!el.textContent.toLowerCase().includes(search.value.toLowerCase())));}}
window.e24SupplierEditingId='';
window.e24OpenSupplierForm=()=>{window.e24SupplierEditingId='';const heading=document.querySelector('#supplier-form-view .supplier-form-header-title strong'),sub=document.querySelector('#supplier-form-view .supplier-form-header-title small'),submit=document.querySelector('#supplier-form-view .supplier-form-actions button');if(heading)heading.textContent='নতুন সাপ্লায়ার';if(sub)sub.textContent='সাপ্লায়ারের তথ্য যুক্ত করুন';if(submit)submit.textContent='নিশ্চিত করুন';const form=document.getElementById('supplier-form-view'),photo=document.getElementById('supplier-entry-photo'),avatar=document.getElementById('supplier-entry-avatar');if(!form){showToast('সাপ্লায়ার ফর্ম পাওয়া যায়নি');return;}document.getElementById('supplier-name').value='';document.getElementById('supplier-phone').value='';document.getElementById('supplier-address').value='';if(photo)photo.value='';if(avatar)avatar.innerHTML='<i class="fa-solid fa-user"></i>';window.e24SetSupplierEntryType('supplier');if(typeof window.e24OpenSupplierFormInternal==='function'){window.e24OpenSupplierFormInternal();}else{const list=document.getElementById('supplier-list-view'),detail=document.getElementById('supplier-detail-view'),top=document.querySelector('#page-9 .supplier-page-top');if(list)list.hidden=true;if(detail)detail.hidden=true;if(top)top.hidden=true;form.hidden=false;}};
window.e24SetSupplierEntryType=(type)=>{type=type==='customer'?'customer':'supplier';const options=document.querySelectorAll('#supplier-form-view [data-supplier-entry-type]');options.forEach(el=>{const active=el.dataset.supplierEntryType===type;el.classList.toggle('active',active);el.setAttribute('aria-checked',active?'true':'false');const icon=el.querySelector('i');if(icon){icon.className=active?'fa-solid fa-circle-dot':'fa-regular fa-circle';}});const name=document.getElementById('supplier-name');if(name){const label=type==='customer'?'গ্রাহকের নাম *':'সাপ্লায়ারের নাম *';name.placeholder=label;name.setAttribute('aria-label',type==='customer'?'গ্রাহকের নাম':'সাপ্লায়ারের নাম');}};
(()=>{const camera=document.getElementById('supplier-avatar-camera'),photo=document.getElementById('supplier-entry-photo'),avatar=document.getElementById('supplier-entry-avatar'),phonebook=document.getElementById('supplier-phonebook');if(camera&&photo&&!camera.dataset.bound){camera.dataset.bound='1';camera.onclick=()=>photo.click();photo.onchange=()=>{const file=photo.files&&photo.files[0];if(!file)return;const reader=new FileReader();reader.onload=()=>{const img=new Image();img.onload=()=>{const canvas=document.createElement('canvas'),scale=Math.min(1,500/Math.max(img.width,img.height));canvas.width=Math.round(img.width*scale);canvas.height=Math.round(img.height*scale);canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);avatar.innerHTML='<img alt="ছবি" src="'+canvas.toDataURL('image/jpeg',0.78)+'">';};img.src=reader.result;};reader.readAsDataURL(file);};}if(phonebook&&!phonebook.dataset.bound){phonebook.dataset.bound='1';phonebook.onclick=async()=>{try{if(!navigator.contacts||!navigator.contacts.select){showToast('এই ডিভাইসে ফোনবুক সুবিধা পাওয়া যাচ্ছে না');return;}const contacts=await navigator.contacts.select(['name','tel'],{multiple:false});if(contacts&&contacts[0]){document.getElementById('supplier-name').value=(contacts[0].name||[])[0]||'';document.getElementById('supplier-phone').value=(contacts[0].tel||[])[0]||'';}}catch(e){showToast('ফোনবুক থেকে তথ্য নেওয়া যায়নি');}};}})();
window.e24CancelSupplierForm=()=>renderSupplierPage();
window.e24BackSupplierDetail=()=>{renderSupplierPage();};
window.e24ToggleSupplierDetailMenu=()=>{const menu=document.getElementById('supplier-detail-menu');if(menu)menu.hidden=!menu.hidden;};
window.e24EditSupplier=()=>{const sid=db.selectedSupplierId,s=(db.suppliers||[]).find(x=>String(x.id)===String(sid));if(!s){showToast('সাপ্লায়ার পাওয়া যায়নি');return;}window.e24SupplierEditingId=String(s.id);document.getElementById('supplier-name').value=s.name||'';document.getElementById('supplier-phone').value=s.phone||'';document.getElementById('supplier-address').value=s.address||'';const heading=document.querySelector('#supplier-form-view .supplier-form-header-title strong'),sub=document.querySelector('#supplier-form-view .supplier-form-header-title small'),submit=document.querySelector('#supplier-form-view .supplier-form-actions button');if(heading)heading.textContent='সাপ্লায়ার এডিট';if(sub)sub.textContent='সাপ্লায়ারের তথ্য পরিবর্তন করুন';if(submit)submit.textContent='পরিবর্তন সংরক্ষণ';const list=document.getElementById('supplier-list-view'),detail=document.getElementById('supplier-detail-view'),form=document.getElementById('supplier-form-view'),top=document.querySelector('#page-9 .supplier-page-top');if(list)list.hidden=true;if(detail)detail.hidden=true;if(top)top.hidden=true;if(form)form.hidden=false;};
window.e24DeleteSupplier=async()=>{const sid=db.selectedSupplierId,s=(db.suppliers||[]).find(x=>String(x.id)===String(sid));if(!s){showToast('সাপ্লায়ার পাওয়া যায়নি');return;}const due=Math.round(supplierBalance(sid)*100)/100;const warning='“'+s.name+'” সাপ্লায়ার এবং তার সব ক্রয় ও পরিশোধের ইতিহাস স্থায়ীভাবে মুছে যাবে।'+(due>0?' বর্তমান বকেয়া: '+money(due)+'.':'')+' এই কাজটি আর ফেরত আনা যাবে না।';if(!confirm(warning+' আপনি কি নিশ্চিত?'))return;const oldSuppliers=db.suppliers,oldTransactions=db.supplierTransactions,oldSelected=db.selectedSupplierId;db.suppliers=(db.suppliers||[]).filter(x=>String(x.id)!==String(sid));db.supplierTransactions=(db.supplierTransactions||[]).filter(x=>String(x.supplierId)!==String(sid));db.selectedSupplierId='';const saved=await save('সাপ্লায়ার ও সংশ্লিষ্ট হিসাব মুছে ফেলা হয়েছে');if(!saved){db.suppliers=oldSuppliers;db.supplierTransactions=oldTransactions;db.selectedSupplierId=oldSelected;e24ShowSupplier(sid);return;}renderSupplierPage();refreshHome();};
window.e24OpenSelectedSupplierDetail=()=>{const suppliers=db.suppliers||[];let sid=db.selectedSupplierId;let exists=suppliers.some(x=>String(x.id)===String(sid));if(!exists&&suppliers.length===1){sid=suppliers[0].id;db.selectedSupplierId=sid;exists=true;}if(!exists){showToast(suppliers.length?'আগে তালিকা থেকে একজন সাপ্লায়ার নির্বাচন করুন':'আগে একজন সাপ্লায়ার যুক্ত করুন');return;}e24ShowSupplier(sid);};
window.e24SaveSupplier=async()=>{const name=document.getElementById('supplier-name').value.trim(),phone=document.getElementById('supplier-phone').value.trim(),address=document.getElementById('supplier-address').value.trim(),type=document.querySelector('#supplier-form-view [data-supplier-entry-type].active')?.dataset.supplierEntryType==='customer'?'customer':'supplier';if(!name){showToast(type==='customer'?'গ্রাহকের নাম লিখুন':'সাপ্লায়ারের নাম লিখুন');return;}if(type==='customer'){db.customers=db.customers||[];const avatar=document.getElementById('supplier-entry-avatar'),photo=avatar?.querySelector('img')?.src||'';const customer={id:id(),name,phone,address,photo};db.customers.push(customer);db.selectedCustomerId=customer.id;save('গ্রাহক সংরক্ষিত হয়েছে');refreshAll();switchPage('2');return;}db.suppliers=db.suppliers||[];const editingId=window.e24SupplierEditingId;if(editingId){const existing=db.suppliers.find(x=>String(x.id)===editingId);if(!existing){showToast('সাপ্লায়ার পাওয়া যায়নি');return;}const old={...existing};Object.assign(existing,{name,phone,address});if(!await save()){Object.assign(existing,old);return;}window.e24SupplierEditingId='';showToast('সাপ্লায়ারের তথ্য আপডেট হয়েছে','success');e24ShowSupplier(existing.id);return;}const s={id:id(),name,phone,address};db.suppliers.push(s);db.selectedSupplierId=s.id;await save('সাপ্লায়ার সংরক্ষিত হয়েছে');e24ShowSupplier(s.id);};
window.e24SupplierHistoryVisible=window.e24SupplierHistoryVisible||{};
window.e24ShowMoreSupplierHistory=()=>{const sid=db.selectedSupplierId;if(!sid)return;const key=String(sid);window.e24SupplierHistoryVisible[key]=(window.e24SupplierHistoryVisible[key]||10)+10;window.e24ShowSupplier(sid);};
window.e24ShowSupplier=(sid)=>{
 const s=(db.suppliers||[]).find(x=>String(x.id)===String(sid));if(!s)return;
 db.selectedSupplierId=s.id;
 document.getElementById('supplier-list-view').hidden=true;
 document.getElementById('supplier-form-view').hidden=true;
 const d=document.getElementById('supplier-detail-view');d.hidden=false;const pageTop=document.querySelector('#page-9 .supplier-page-top');if(pageTop)pageTop.hidden=true;
 const rows=(db.supplierTransactions||[]).filter(x=>String(x.supplierId)===String(sid)).slice().reverse();
 const visibleCount=window.e24SupplierHistoryVisible?.[String(sid)]||10;
 const visibleRows=rows.slice(0,visibleCount);
 const all=(db.supplierTransactions||[]).filter(x=>String(x.supplierId)===String(sid));
 const purchases=all.filter(x=>x.type===1||x.type==='purchase').reduce((n,x)=>n+(Number(x.amount)||0),0);
 const paid=all.filter(x=>x.type===2||x.type==='payment').reduce((n,x)=>n+(Number(x.amount)||0),0);
 const isPurchase=x=>x.type===1||x.type==='purchase';
 d.innerHTML='<div class="supplier-unified-header supplier-detail-header"><button type="button" class="supplier-unified-back supplier-detail-back" aria-label="ফিরে যান" onclick="window.e24BackSupplierDetail()"><i class="fa-solid fa-arrow-left"></i></button><div class="supplier-unified-title supplier-detail-heading"><strong>সাপ্লায়ার বিস্তারিত</strong><small>সাপ্লায়ারের হিসাব ও লেনদেন</small></div><div class="supplier-detail-menu-wrap"><button type="button" class="supplier-detail-menu-trigger" aria-label="আরও অপশন" aria-haspopup="true" onclick="window.e24ToggleSupplierDetailMenu()"><i class="fa-solid fa-ellipsis-vertical"></i></button><div id="supplier-detail-menu" class="supplier-detail-menu" hidden><button type="button" onclick="this.parentElement.hidden=true;window.e24EditSupplier()"><i class="fa-solid fa-pen-to-square"></i> এডিট</button><button type="button" class="supplier-menu-delete" onclick="this.parentElement.hidden=true;window.e24DeleteSupplier()"><i class="fa-solid fa-trash-can"></i> ডিলিট</button></div></div></div>'+
 '<div class="supplier-detail-profile"><div class="supplier-detail-avatar"><i class="fa-solid fa-store"></i></div><div class="supplier-detail-identity"><strong>'+esc(s.name)+'</strong><small>'+esc(s.phone||'মোবাইল নম্বর দেওয়া হয়নি')+'</small>'+(s.address?'<small>'+esc(s.address)+'</small>':'')+'</div></div>'+
 '<div class="supplier-detail-due"><span>বর্তমান বকেয়া</span><strong>'+money(supplierBalance(sid))+'</strong><small>সাপ্লায়ারকে মোট পরিশোধযোগ্য</small></div>'+
 '<div class="supplier-detail-stats"><div class="supplier-detail-stat"><span><i class="fa-solid fa-cart-shopping"></i> মোট ক্রয়</span><strong>'+money(purchases)+'</strong></div><div class="supplier-detail-stat"><span><i class="fa-solid fa-wallet"></i> মোট পরিশোধ</span><strong>'+money(paid)+'</strong></div></div>'+
 '<div class="supplier-detail-actions"><button type="button" class="supplier-detail-purchase" onclick="e24OpenPurchasePage()"><i class="fa-solid fa-plus-circle"></i> মাল ক্রয় করুন</button><button type="button" class="supplier-detail-payment" onclick="e24SupplierEntry(2)"><i class="fa-solid fa-money-bill-wave"></i> টাকা পরিশোধ</button></div>'+
 '<div class="supplier-detail-history-heading"><strong>লেনদেনের ইতিহাস</strong><span>সকল লেনদেন</span></div>'+
 '<ul class="supplier-detail-history">'+(visibleRows.map(x=>'<li class="'+(isPurchase(x)?'is-purchase':'is-payment')+'"><span class="supplier-history-icon"><i class="fa-solid '+(isPurchase(x)?'fa-cart-shopping':'fa-wallet')+'"></i></span><span class="supplier-history-info"><strong>'+(isPurchase(x)?'মাল ক্রয়':'টাকা পরিশোধ')+'</strong>'+(isPurchase(x)&&x.productName?'<small>'+esc(x.productName)+(x.quantity?' · '+esc(x.quantity)+' × '+money(x.unitPrice):'')+'</small>':'')+'<small>'+esc(x.date||'তারিখ নেই')+'</small></span><strong class="supplier-history-amount">'+(isPurchase(x)?'+':'−')+money(x.amount)+'</strong></li>').join('')||'<li class="supplier-detail-empty">এখনো কোনো লেনদেন নেই</li>')+'</ul>'+(rows.length>visibleCount?'<button type="button" class="supplier-history-more" onclick="window.e24ShowMoreSupplierHistory()">আরও দেখুন ('+(rows.length-visibleCount)+'টি বাকি)</button>':'');
};
document.addEventListener('DOMContentLoaded',()=>{const q=document.getElementById('purchase-quantity'),p=document.getElementById('purchase-unit-price'),t=document.getElementById('purchase-total'),a=document.getElementById('purchase-entry-amount');const update=()=>{const total=Math.round((Number(q&&q.value)||0)*(Number(p&&p.value)||0)*100)/100;if(t)t.textContent=money(total);if(a)a.value=total>0?String(total):'';};if(q)q.addEventListener('input',update);if(p)p.addEventListener('input',update);if(a)a.addEventListener('input',()=>{if(t)t.textContent=money(a.value?Number(a.value)||0:Math.round((Number(q&&q.value)||0)*(Number(p&&p.value)||0)*100)/100);});});
window.e24SelectPurchaseSupplier=(sid)=>{db.selectedSupplierId=sid||'';const s=(db.suppliers||[]).find(x=>String(x.id)===String(db.selectedSupplierId));const display=document.getElementById('purchase-supplier-label');if(display)display.innerHTML='<span>নির্বাচিত সাপ্লায়ার</span><strong>'+(s?esc(s.name):'নির্বাচন করা হয়নি')+'</strong>';};
 window.e24OpenPurchasePage=()=>{const suppliers=db.suppliers||[];if(!suppliers.length){showToast('আগে নতুন সাপ্লায়ার যুক্ত করুন');return;}const select=document.getElementById('purchase-supplier-select');select.innerHTML='<option value="">সাপ্লায়ার নির্বাচন করুন</option>'+suppliers.map(s=>'<option value="'+esc(s.id)+'">'+esc(s.name)+'</option>').join('');select.value=(suppliers.some(s=>String(s.id)===String(db.selectedSupplierId))?String(db.selectedSupplierId):'');window.e24SelectPurchaseSupplier(select.value);['purchase-product-name','purchase-quantity','purchase-unit-price','purchase-entry-amount','purchase-paid-amount'].forEach(k=>document.getElementById(k).value='');document.getElementById('purchase-total').textContent=money(0);switchPage('10');};
window.e24SavePurchase=()=>{const selectedSupplier=document.getElementById('purchase-supplier-select').value;if(selectedSupplier)db.selectedSupplierId=selectedSupplier;const productName=document.getElementById('purchase-product-name').value.trim(),quantityRaw=document.getElementById('purchase-quantity').value.trim(),unitPriceRaw=document.getElementById('purchase-unit-price').value.trim(),quantity=quantityRaw?Number(quantityRaw):0,unitPrice=unitPriceRaw?Number(unitPriceRaw):0,amountRaw=document.getElementById('purchase-entry-amount').value.trim(),amount=Math.round(Number(amountRaw)*100)/100,paidRaw=document.getElementById('purchase-paid-amount').value.trim(),paid=paidRaw?Math.round(Number(paidRaw)*100)/100:0;if(!amountRaw||!Number.isFinite(amount)||amount<=0){showToast('ক্রয়ের টাকার পরিমাণ সঠিকভাবে লিখুন');return;}if(!Number.isFinite(paid)||paid<0||paid>amount){showToast('জমার টাকা ক্রয়ের টাকার সমান বা কম হতে হবে');return;}if((quantityRaw&&!unitPriceRaw)||(!quantityRaw&&unitPriceRaw)|| (quantityRaw&&(!Number.isFinite(quantity)||quantity<=0)) || (unitPriceRaw&&(!Number.isFinite(unitPrice)||unitPrice<=0))){showToast('পরিমাণ ও একক দাম দুটোই সঠিকভাবে লিখুন');return;}if(!db.selectedSupplierId){showToast('সাপ্লায়ার নির্বাচন করুন');return;}const date=new Date().toLocaleDateString('bn-BD');db.supplierTransactions=db.supplierTransactions||[];db.supplierTransactions.push({id:id(),supplierId:db.selectedSupplierId,type:1,amount,productName:productName||'পণ্য ক্রয়',quantity:quantity>0?quantity:null,unitPrice:unitPrice>0?unitPrice:null,date});if(paid>0)db.supplierTransactions.push({id:id(),supplierId:db.selectedSupplierId,type:2,amount:paid,date});save(paid<amount?'ক্রয় ও জমা সংরক্ষিত হয়েছে, বাকি হিসাব যোগ হয়েছে':'ক্রয় ও জমা সংরক্ষিত হয়েছে');e24ShowSupplier(db.selectedSupplierId);refreshHome();};
window.e24SupplierEntry=(type)=>{if(type===2){const modal=document.getElementById('supplier-payment-modal');const input=document.getElementById('supplier-payment-amount');if(!modal||!input)return;input.value='';modal.classList.add('show');setTimeout(()=>input.focus(),80);return;}const raw=prompt('ক্রয়ের টাকার পরিমাণ');if(raw===null)return;const amount=Number(raw);if(!Number.isFinite(amount)||amount<=0){showToast('সঠিক টাকার পরিমাণ লিখুন');return;}db.supplierTransactions=db.supplierTransactions||[];db.supplierTransactions.push({id:id(),supplierId:db.selectedSupplierId,type,amount,date:new Date().toLocaleDateString('bn-BD')});save('হিসাব সংরক্ষিত হয়েছে');e24ShowSupplier(db.selectedSupplierId);refreshHome();};
window.e24CloseSupplierPayment=()=>{document.getElementById('supplier-payment-modal')?.classList.remove('show');};
window.e24SaveSupplierPayment=()=>{const input=document.getElementById('supplier-payment-amount');const amount=Number(input?.value);if(!Number.isFinite(amount)||amount<=0){showToast('সঠিক পরিশোধের টাকা লিখুন');input?.focus();return;}if(!db.selectedSupplierId){showToast('সাপ্লায়ার নির্বাচন করুন');return;}const due=Math.round(supplierBalance(db.selectedSupplierId)*100)/100;if(due<=0){showToast('এই সাপ্লায়ারের কোনো বকেয়া নেই');input?.focus();return;}if(amount>due+0.000001){showToast('পরিশোধের টাকা বর্তমান বকেয়ার বেশি হতে পারবে না');input?.focus();return;}db.supplierTransactions=db.supplierTransactions||[];db.supplierTransactions.push({id:id(),supplierId:db.selectedSupplierId,type:2,amount:Math.round(amount*100)/100,date:new Date().toLocaleDateString('bn-BD')});save('পরিশোধ সংরক্ষণ হয়েছে');window.e24CloseSupplierPayment();e24ShowSupplier(db.selectedSupplierId);refreshHome();};
      function renderCustomerReport(){
        const list=document.getElementById('customer-report-rows'),customer=selected();if(!list)return;
        if(!customer){list.innerHTML='<div class="customer-report-empty">প্রথমে একজন গ্রাহক নির্বাচন করুন।</div>';return;}
        let balance=0;
        const rows=db.transactions.filter(t=>String(t.customerId)===String(customer.id)).map(t=>{const amount=Number(t.amount)||0,paid=Number(t.paid)||0;if(t.type==='বাকি')balance+=amount-paid;else if(t.type==='জমা')balance-=amount;return {...t,_balance:balance};}).reverse();
        list.innerHTML=rows.length?rows.map(t=>{
          const parsed=reportDate(t.date),dateLabel=parsed?parsed.toLocaleDateString('bn-BD',{day:'numeric',month:'long',year:'numeric'}):esc(t.date||'তারিখ নেই');
          const timeLabel=t.time?esc(t.time):'সময় সংরক্ষিত নেই';
          const validImage=typeof t.image==='string'&&/^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(t.image);
          const image='<img class="customer-report-image" '+(validImage?'src="'+t.image+'"':'style="width:1px;height:1px;opacity:0" data-e24-image-id="'+esc(t.id)+'"')+' alt="লেনদেনের ছবি">';
          const note=t.note?'<div class="customer-report-note">'+esc(t.note)+'</div>':'';
          const dueLabel=t._balance>0?'বাকি '+money(t._balance):t._balance<0?'অগ্রিম '+money(Math.abs(t._balance)):'পরিশোধিত';
          const balanceClass=t._balance<0?'customer-report-balance advance':'customer-report-balance';
          const sale=t.type==='বাকি'?money(t.amount):'—',deposit=t.type==='বাকি'?(Number(t.paid)>0?money(t.paid):'—'):t.type==='জমা'?money(t.amount):'—';
          return '<div class="customer-report-row" data-txid="'+esc(t.id)+'" role="button" tabindex="0" aria-label="লেনদেনের বিস্তারিত ও এডিট দেখুন"><div class="customer-report-cell customer-report-detail"><div class="customer-report-date">'+dateLabel+'</div><div class="customer-report-time">'+timeLabel+'</div>'+note+image+'<div class="'+balanceClass+'">'+dueLabel+'</div></div><div class="customer-report-cell customer-report-amount customer-report-sale">'+sale+'</div><div class="customer-report-cell customer-report-amount customer-report-paid">'+deposit+'</div></div>';
        }).join(''):'<div class="customer-report-empty">এই গ্রাহকের কোনো লেনদেন নেই</div>';
        e24LoadVisibleReportImages(list);
      }
      function e24LoadVisibleReportImages(container){
        const images=container.querySelectorAll('img[data-e24-image-id]');
        if(!images.length)return;
        const loadOne=async img=>{
          if(img.dataset.loading==='1'||img.dataset.loaded==='1')return;
          img.dataset.loading='1';
          try{
            const imageId='tximg_'+String(img.dataset.e24ImageId).replace(/[^A-Za-z0-9_-]/g,'_');
            const snap=await e24Store.collection('users').doc(activeDataUid).collection('data').doc(imageId).get();
            const value=snap.exists?snap.data().image:'';
            if(typeof value==='string'&&/^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(value)){
              img.src=value;img.style.width='';img.style.height='';img.style.opacity='1';
            }
            img.dataset.loaded='1';
          }catch(err){console.warn('E24 report image load failed:',err);}
          finally{delete img.dataset.loading;}
        };
        if('IntersectionObserver'in window){
          const observer=new IntersectionObserver(entries=>{
            entries.forEach(entry=>{if(entry.isIntersecting){observer.unobserve(entry.target);loadOne(entry.target);}});
          },{root:container,rootMargin:'180px 0px'});
          images.forEach(img=>observer.observe(img));
        }else{
          Array.from(images).slice(0,8).forEach(loadOne);
        }
      }
      window.printCustomerReport=()=>{if(!document.getElementById('page-12')?.classList.contains('active-page'))return;document.body.classList.add('customer-report-printing');window.print();setTimeout(()=>document.body.classList.remove('customer-report-printing'),700);};
function refreshAll(){renderCustomers();renderLedger();renderTransactionForm(db.txType);refreshHome();renderSupplierPage();}
      window.beginTransaction=(type)=>{renderTransactionForm(type||'বাকি');switchPage('4');};
      window.switchPage = ((old)=>function(pageKey){if(String(pageKey)==='13')e24RenderReportTransactionDetail();if(String(pageKey)==='3')renderCustomerTransactionPage('বাকি');if(String(pageKey)==='12')renderCustomerReport();if(String(pageKey)==='4'){db.txType='বাকি';renderTransactionForm('বাকি');}if(String(pageKey)==='9')renderSupplierPage();old(String(pageKey));if(String(pageKey)==='1')refreshHome();})(window.switchPage);
      document.addEventListener('DOMContentLoaded',()=>{const homeFab=document.getElementById('home-transaction-fab');const homePage=document.getElementById('page-1');if(homeFab)homeFab.style.display=homePage&&homePage.classList.contains('active-page')?'flex':'none';});
      document.addEventListener('DOMContentLoaded',()=>{
         // Firebase data loads after authentication.
        const add=document.querySelector('#page-2 button');
        const photoPicker=document.createElement('input'); photoPicker.type='file'; photoPicker.accept='image/*'; photoPicker.hidden=true; photoPicker.id='customer-photo-picker'; document.body.appendChild(photoPicker);
        photoPicker.addEventListener('change',()=>{const file=photoPicker.files&&photoPicker.files[0];if(!file)return;if(!file.type.startsWith('image/')){showToast('শুধু ছবির ফাইল নির্বাচন করুন');return;}if(file.size>5*1024*1024){showToast('ছবির সাইজ ৫ MB-এর কম রাখুন');return;}const reader=new FileReader();reader.onload=()=>{const img=new Image();img.onload=()=>{const canvas=document.createElement('canvas'),max=480,scale=Math.min(1,max/Math.max(img.width,img.height));canvas.width=Math.round(img.width*scale);canvas.height=Math.round(img.height*scale);canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);const c=db.customers.find(x=>x.id===db.selectedCustomerId);if(c){c.photo=canvas.toDataURL('image/jpeg',0.78);save('গ্রাহকের ছবি সংরক্ষিত হয়েছে');refreshAll();}};img.onerror=()=>showToast('ছবিটি খোলা যায়নি');img.src=reader.result;};reader.readAsDataURL(file);});
        const modal=document.getElementById('page-14'),nameField=document.getElementById('new-customer-name'),phoneField=document.getElementById('new-customer-phone'),addressField=document.getElementById('new-customer-address'),customerForm=document.getElementById('customer-modal');let customerModalReturnPage='2',customerModalHistoryOpen=false;
        const entryTypeBox=document.getElementById('customer-entry-type'),entryPhoto=document.getElementById('customer-entry-photo'),entryAvatar=document.getElementById('customer-entry-avatar');window.e24OpenSupplierFormInternal=()=>{const list=document.getElementById('supplier-list-view'),form=document.getElementById('supplier-form-view'),detail=document.getElementById('supplier-detail-view'),top=document.querySelector('#page-9 .supplier-page-top');if(!list||!form||!detail)return;document.getElementById('supplier-name').value='';document.getElementById('supplier-phone').value='';document.getElementById('supplier-address').value='';list.hidden=true;detail.hidden=true;form.hidden=false;if(top)top.hidden=true;};
        const setCustomerEntryType=type=>{customerEntryType=type;entryTypeBox.querySelectorAll('[data-entry-type]').forEach(btn=>{const active=btn.dataset.entryType===type;btn.classList.toggle('active',active);btn.querySelector('i').className=active?'fa-regular fa-circle-dot':'fa-regular fa-circle';});nameField.placeholder=type==='supplier'?'সাপ্লায়ারের নাম':'নাম';};
        entryTypeBox.querySelectorAll('[data-entry-type]').forEach(btn=>btn.onclick=()=>setCustomerEntryType(btn.dataset.entryType));
        document.getElementById('customer-avatar-camera').onclick=()=>entryPhoto.click();
        entryPhoto.onchange=()=>{const file=entryPhoto.files&&entryPhoto.files[0];if(!file)return;const reader=new FileReader();reader.onload=()=>{const img=new Image();img.onload=()=>{const canvas=document.createElement('canvas'),scale=Math.min(1,500/Math.max(img.width,img.height));canvas.width=Math.round(img.width*scale);canvas.height=Math.round(img.height*scale);canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);customerEntryPhoto=canvas.toDataURL('image/jpeg',0.78);entryAvatar.innerHTML='<img alt="ছবি" src="'+customerEntryPhoto+'">';};img.src=reader.result;};reader.readAsDataURL(file);};
        document.getElementById('customer-phonebook').onclick=async()=>{try{if(!navigator.contacts||!navigator.contacts.select){showToast('এই ডিভাইসে ফোনবুক সুবিধা পাওয়া যাচ্ছে না');return;}const contacts=await navigator.contacts.select(['name','tel'],{multiple:false});if(contacts&&contacts[0]){nameField.value=(contacts[0].name||[])[0]||'';phoneField.value=(contacts[0].tel||[])[0]||'';}}catch(e){showToast('ফোনবুক থেকে তথ্য নেওয়া যায়নি');}};
        const resetCustomerEntry=()=>{setCustomerEntryType('customer');customerEntryPhoto='';entryPhoto.value='';entryAvatar.innerHTML='<i class="fa-solid fa-user"></i>';};
        const openCustomerEntry=()=>{const activePage=document.querySelector('.app-page.active-page');customerModalReturnPage=activePage?activePage.id.replace('page-',''):'2';transactionAddCustomer=false;editingCustomerId=null;nameField.value='';phoneField.value='';addressField.value='';resetCustomerEntry();customerForm.classList.remove('customer-entry-no-header');document.getElementById('customer-modal-title').textContent='নতুন গ্রাহক';document.getElementById('customer-submit-label').textContent='নিশ্চিত করুন';customerModalHistoryOpen=false;switchPage('14');};
        const addCustomerButton=document.getElementById('add-customer-button');if(addCustomerButton)addCustomerButton.onclick=()=>{openCustomerEntry();};
        window.e24OpenCustomerEditFromHeader=()=>{
          const target=db.customers.find(c=>String(c.id)===String(db.selectedCustomerId));
          if(!target){showToast('গ্রাহক পাওয়া যায়নি');return;}
          customerModalReturnPage='3';
          transactionAddCustomer=false;
          editingCustomerId=target.id;
          setCustomerEntryType('customer');
          customerEntryPhoto=target.photo||'';
          entryPhoto.value='';
          entryAvatar.innerHTML=customerEntryPhoto?'<img alt="ছবি" src="'+customerEntryPhoto+'">':'<i class="fa-solid fa-user"></i>';
          nameField.value=target.name||'';
          phoneField.value=target.phone||'';
          addressField.value=target.address||'';
          customerForm.classList.remove('customer-entry-no-header');
          document.getElementById('customer-modal-title').textContent='গ্রাহকের তথ্য এডিট';
          document.getElementById('customer-submit-label').textContent='আপডেট';
          customerModalHistoryOpen=false;
          switchPage('14');
          const editModal=document.getElementById('page-14');
          if(editModal)editModal.setAttribute('aria-hidden','false');
          setTimeout(()=>nameField.focus(),80);
        }
        window.e24DeleteSelectedCustomer=async()=>{
          const target=db.customers.find(c=>String(c.id)===String(db.selectedCustomerId));
          if(!target){showToast('গ্রাহক পাওয়া যায়নি');return;}
          const deletedId=String(target.id);
          const customerTx=db.transactions.filter(x=>String(x.customerId)===deletedId);
          const removedSales=customerTx.reduce((sum,x)=>sum+(x.type==='বাকি'?(Number(x.amount)||0):0),0);
          const removedPaid=customerTx.reduce((sum,x)=>sum+(x.type==='বাকি'?(Number(x.paid)||0):(x.type==='জমা'?(Number(x.amount)||0):0)),0);
          const removedDue=Math.max(0,removedSales-removedPaid);
          const message='সতর্কতা! “'+(target.name||'এই গ্রাহক')+'” গ্রাহককে স্থায়ীভাবে মুছে ফেলবেন?\n\n'+
            'মুছে যাবে: '+customerTx.length+'টি লেনদেন\n'+
            'মোট বিক্রি: '+money(removedSales)+'\n'+
            'মোট জমা: '+money(removedPaid)+'\n'+
            'মোট বাকি: '+money(removedDue)+'\n\n'+
            'Home Page, খাতা, রিপোর্ট ও প্রিন্ট থেকেও সব হিসাব বাদ যাবে।\nএই কাজটি ফিরিয়ে আনা যাবে না।';
          if(!(await showAppConfirm(message,'গ্রাহক স্থায়ীভাবে মুছবেন?')))return;
          const previousCustomers=db.customers;
          const previousTransactions=db.transactions;
          const previousSelectedCustomerId=db.selectedCustomerId;
          db.transactions=db.transactions.filter(x=>String(x.customerId)!==deletedId);
          db.customers=db.customers.filter(x=>String(x.id)!==deletedId);
          db.selectedCustomerId=null;
          const saved=await save('গ্রাহক ও তাঁর সব হিসাব স্থায়ীভাবে মুছে ফেলা হয়েছে');
          if(!saved){
            db.customers=previousCustomers;
            db.transactions=previousTransactions;
            db.selectedCustomerId=previousSelectedCustomerId;
            refreshAll();
            return;
          }
          refreshAll();
          switchPage('2');
        };
        const closeCustomerModal=(fromPopState=false)=>{const wasTransactionAdd=transactionAddCustomer,entryType=customerEntryType;const returnPage=wasTransactionAdd?'4':entryType==='supplier'?'9':customerModalReturnPage;customerModalHistoryOpen=false;transactionAddCustomer=false;editingCustomerId=null;resetCustomerEntry();document.getElementById('customer-submit-label').textContent='নিশ্চিত করুন';switchPage(returnPage);};window.e24CloseCustomerModal=()=>closeCustomerModal(false);
        window.addEventListener('click',e=>{const back=e.target&&e.target.closest?e.target.closest('#customer-cancel'):null;if(!back)return;e.preventDefault();e.stopImmediatePropagation();window.e24CloseCustomerModal();},true);
        if(add)add.onclick=()=>{openCustomerEntry();};
        document.addEventListener('click',e=>{const back=e.target&&e.target.closest?e.target.closest('#customer-cancel'):null;if(!back)return;e.preventDefault();e.stopImmediatePropagation();closeCustomerModal(false);},true);window.addEventListener('popstate',()=>{if(customerModalHistoryOpen&&modal.classList.contains('active-page'))closeCustomerModal(true);});
        customerForm.addEventListener('submit',e=>{e.preventDefault();const name=nameField.value.trim(),phone=phoneField.value.trim(),address=addressField.value.trim();if(!name){showToast('গ্রাহকের নাম লিখুন');nameField.focus();return;}if(editingCustomerId){const c=db.customers.find(x=>x.id===editingCustomerId);if(!c){showToast('গ্রাহক পাওয়া যায়নি');closeCustomerModal();return;}c.name=name;c.phone=phone;c.address=address;c.photo=customerEntryPhoto||'';db.selectedCustomerId=c.id;save('গ্রাহকের তথ্য আপডেট হয়েছে');refreshAll();closeCustomerModal();}else if(customerEntryType==='supplier'){db.suppliers=db.suppliers||[];const s={id:id(),name,phone,address};db.suppliers.push(s);save('সাপ্লায়ার সংরক্ষিত হয়েছে');closeCustomerModal();if(window.e24ShowSupplier)window.e24ShowSupplier(s.id);}else{const fromTransaction=transactionAddCustomer;const c={id:id(),name,phone,address,photo:customerEntryPhoto||''};db.customers.push(c);db.selectedCustomerId=c.id;save('গ্রাহক সংরক্ষিত হয়েছে');refreshAll();closeCustomerModal();if(fromTransaction){renderTransactionForm(db.txType);}}});
        const search=document.getElementById('search-input');if(search)search.addEventListener('input',()=>renderCustomers());document.querySelectorAll('#page-2 [data-customer-filter]').forEach(btn=>btn.addEventListener('click',()=>{customerDirectoryFilter=btn.dataset.customerFilter;document.querySelectorAll('#page-2 [data-customer-filter]').forEach(x=>x.classList.toggle('active',x===btn));renderCustomers();}));
         // Initial render waits for the authenticated user's cloud data.
      });

const E24_ADMIN_UID='exITNpwyRNaWpoMW6BgMcMGbf2';
const E24_FIREBASE_CONFIG={"apiKey":"AIzaSyCQbMapGDCxtxukp6ao92Bi8di5qer2gS4","authDomain":"e24-hisab.firebaseapp.com","projectId":"e24-hisab","storageBucket":"e24-hisab.firebasestorage.app","messagingSenderId":"186986158022","appId":"1:186986158022:web:abe1e7a90ee7fb64a0c4c7","measurementId":"G-GX018MK85M"};
const E24_OTP_API='https://floral-mouse-c0eae24-hisab-otp.ah0788767.workers.dev';
const E24_AI_SUPPORT_API='https://gemeni-api-key.ah0788767.workers.dev';
const E24_PAYMENT_API='https://e24-sms-wallet-payment.ah0788767.workers.dev';

const E24_ADMIN_API='https://e24-hisab-admin.ah0788767.workers.dev';
let currentUser=null,activeDataUid=null,isAdmin=false,isMainAdmin=false,e24AdminRole='user',authMode='login';
async function e24AdminApi(path,options={}){
 if(!e24Auth.currentUser)throw new Error('AUTH_REQUIRED');
 const token=await e24Auth.currentUser.getIdToken();
 const response=await fetch(E24_ADMIN_API+path,{method:options.method||'GET',headers:{'Authorization':'Bearer '+token,'Content-Type':'application/json'},body:options.body?JSON.stringify(options.body):undefined});
 let result={};try{result=await response.json();}catch(_){}
 if(!response.ok||result.success!==true)throw new Error(result.error||'ADMIN_API_NOT_READY');
 return result;
}
function e24AdminRoleName(role){return role==='main'?'Administrator':role==='full'?'Admin':role==='limited'?'Recharge Admin':'User';}

if(!firebase.apps.length)firebase.initializeApp(E24_FIREBASE_CONFIG);
const e24Auth=firebase.auth(),e24Store=firebase.firestore();
// Notification module dependencies are exposed through live getters (not copied state).
window.E24NotificationContext={
 get currentUser(){return currentUser;},
 get activeDataUid(){return activeDataUid;},
 get isAdmin(){return isAdmin;},
 get store(){return e24Store;}
};

window.e24Logout=()=>e24Auth.signOut().catch(()=>showToast('লগআউট করা যায়নি'));
async function e24ReferralRequest(path,options={}) {
 if(!e24Auth.currentUser)throw new Error('AUTH_REQUIRED');
 const token=await e24Auth.currentUser.getIdToken();
 const response=await fetch(E24_PAYMENT_API+path,{method:options.method||'GET',headers:{'Authorization':'Bearer '+token,'Content-Type':'application/json'},body:options.body?JSON.stringify(options.body):undefined});
 let result={};try{result=await response.json();}catch(_){}
 if(!response.ok||result.success!==true)throw new Error(result.error||'REFERRAL_API_NOT_READY');
 return result;
}
document.addEventListener('click',async e=>{
 if(e.target&&e.target.closest('#e24-referral-copy')){
  const code=document.getElementById('e24-referral-code')?.textContent||'';
  if(!/^E24[A-F0-9]{12}$/.test(code)){showToast('Referral Code এখনো তৈরি হয়নি');return;}
  try{if(navigator.clipboard&&navigator.clipboard.writeText)await navigator.clipboard.writeText(code);else{const t=document.createElement('textarea');t.value=code;document.body.appendChild(t);t.select();document.execCommand('copy');t.remove();}showToast('Referral Code কপি হয়েছে');}
  catch(_){showToast('কোড কপি করা যায়নি');}
 }
});
async function e24LoadReferralPanel(){
 const status=document.getElementById('e24-referral-status');
 try{
  const pending=localStorage.getItem('e24PendingReferralCode')||'';
  if(pending){
   try{await e24ReferralRequest('/referral/setup',{method:'POST',body:{referralCode:pending}});localStorage.removeItem('e24PendingReferralCode');}
   catch(err){console.warn('Referral setup pending:',err.message);}
  }
  const data=await e24ReferralRequest('/referral/profile');
  document.getElementById('e24-referral-code').textContent=data.referralCode||'—';
  document.getElementById('e24-referral-count').textContent=Number(data.successfulReferrals||0).toLocaleString('bn-BD');
  document.getElementById('e24-referral-bonus').textContent='৳ '+Number(data.bonusTotal||0).toLocaleString('bn-BD');
  if(status)status.textContent='বন্ধুকে কোডটি দিন। প্রথম সফল রিচার্জে একবার ৳৫ বোনাস পাবেন।';
 }catch(err){
  document.getElementById('e24-referral-code').textContent='সার্ভার আপডেট প্রয়োজন';
  if(status)status.textContent='Referral সুবিধা চালু করতে সার্ভার আপডেট করতে হবে।';
  console.warn('Referral panel load failed:',err.message);
 }
}
function e24AuthMessage(err){const m={'auth/email-already-in-use':'এই Email দিয়ে আগে থেকেই অ্যাকাউন্ট আছে।','auth/invalid-email':'সঠিক Email address লিখুন।','auth/weak-password':'Password কমপক্ষে ৬ অক্ষরের হতে হবে।','auth/user-not-found':'এই Email দিয়ে কোনো অ্যাকাউন্ট পাওয়া যায়নি।','auth/wrong-password':'Password সঠিক নয়।','auth/invalid-credential':'Email অথবা Password সঠিক নয়।','auth/too-many-requests':'অনেকবার চেষ্টা হয়েছে। পরে চেষ্টা করুন।','auth/network-request-failed':'ইন্টারনেট সংযোগ পরীক্ষা করুন।'};return m[err&&err.code]||'কাজটি সম্পন্ন হয়নি। আবার চেষ্টা করুন।';}
function e24SetAuthMode(mode){authMode=mode;document.getElementById("e24-launch-splash").hidden=true;document.querySelector(".e24-auth-card").classList.remove("launching");document.getElementById("e24-auth-subtitle").hidden=false;document.getElementById('e24-login-form').hidden=mode!=='login';document.getElementById('e24-register-form').hidden=mode!=='register';document.getElementById('e24-verify-panel').hidden=true;document.getElementById('e24-forgot-panel').hidden=true;document.getElementById('e24-forgot-password-link').hidden=mode!=='login';document.getElementById('e24-auth-switch').hidden=false;document.getElementById('e24-auth-subtitle').textContent=mode==='login'?'আপনার হিসাব নিরাপদে সংরক্ষণ করতে লগইন করুন':'নতুন E24 Hisab অ্যাকাউন্ট তৈরি করুন';document.getElementById('e24-auth-switch').textContent=mode==='login'?'নতুন অ্যাকাউন্ট তৈরি করবেন?':'আগে অ্যাকাউন্ট আছে? লগইন করুন';document.getElementById('e24-auth-error').textContent='';}
function e24Diagnostic(stage,details={}){try{const safe={time:new Date().toISOString(),stage,...details};console.info('[E24-DIAG]',safe);}catch(logErr){console.info('[E24-DIAG]',stage);}}
async function e24LoadData(uid){const started=performance.now();activeDataUid=uid;const ref=e24Store.collection('users').doc(uid).collection('data').doc('main');e24Diagnostic('main-data-read-start',{uidSuffix:String(uid||'').slice(-6),path:'users/{uid}/data/main'});let snap;try{snap=await ref.get();}catch(err){e24Diagnostic('main-data-read-failed',{code:err&&err.code||'unknown',message:err&&err.message||String(err),path:'users/{uid}/data/main'});throw err;}const elapsed=(performance.now()-started)/1000;e24Diagnostic('main-data-read-success',{exists:snap.exists,elapsedSeconds:Number(elapsed.toFixed(2))});if(snap.exists)db={customers:[],transactions:[],selectedCustomerId:null,txType:'বাকি',suppliers:[],supplierTransactions:[],selectedSupplierId:null,...snap.data()};else{let legacy=null;try{const old=JSON.parse(localStorage.getItem(KEY));if(old&&Array.isArray(old.customers)&&Array.isArray(old.transactions))legacy=old;}catch(_){}db=legacy||{customers:[],transactions:[],selectedCustomerId:null,txType:'বাকি',suppliers:[],supplierTransactions:[],selectedSupplierId:null};}// Transaction images are intentionally not bulk-loaded at startup; the report fetches only visible images.
if(!Array.isArray(db.suppliers))db.suppliers=[];if(!Array.isArray(db.supplierTransactions))db.supplierTransactions=[];const patch={};if(!Object.prototype.hasOwnProperty.call(db,'smsWalletBalance')||!Number.isFinite(Number(db.smsWalletBalance))){db.smsWalletBalance=0;patch.smsWalletBalance=0;}if(!Array.isArray(db.smsHistory)){db.smsHistory=[];patch.smsHistory=[];}if(!Array.isArray(db.smsRechargeRequests)){db.smsRechargeRequests=[];patch.smsRechargeRequests=[];}if(!Array.isArray(db.smsWalletTransactions)){db.smsWalletTransactions=[];patch.smsWalletTransactions=[];}if(Number(db.smsWalletBalance)===500&&db.smsWalletTransactions.length===0&&db.smsHistory.length===0&&!db.smsRechargeRequests.some(x=>String(x.status||'').toUpperCase()==='APPROVED')){db.smsWalletBalance=0;patch.smsWalletBalance=0;}if(!snap.exists||Object.keys(patch).length){e24Diagnostic('main-data-write-start',{reason:!snap.exists?'document-missing':'schema-patch',patchFields:Object.keys(patch)});try{await ref.set({...db,...patch,updatedAt:firebase.firestore.FieldValue.serverTimestamp()},{merge:true});e24Diagnostic('main-data-write-success',{reason:!snap.exists?'document-missing':'schema-patch'});}catch(err){e24Diagnostic('main-data-write-failed',{code:err&&err.code||'unknown',message:err&&err.message||String(err),path:'users/{uid}/data/main',patchFields:Object.keys(patch)});throw err;}if(legacy)localStorage.removeItem(KEY);}e24ProcessLoadedNotifications(uid);refreshAll();renderSmsWallet();if(isAdmin&&typeof e24AdminUpdateSummary==='function')e24AdminUpdateSummary();const timing=document.getElementById('e24-load-timing');if(timing){timing.textContent='ডেটা: '+elapsed.toFixed(2)+' সেকেন্ড · অ্যাপ চালু: '+((performance.now()-e24BootStartedAt)/1000).toFixed(2)+' সেকেন্ড';timing.hidden=false;}}

let e24AdminUsersCache=[];
function e24AdminUserLabel(uid,data){const d=data||{};return uid===E24_ADMIN_UID?'Administrator — '+(d.email||'নিজের হিসাব'):(d.name||d.email||'User '+uid.slice(0,8));}
async function e24RenderAdminUsers(){
 const panel=document.getElementById('e24-admin-panel'),select=document.getElementById('e24-admin-user-select');if(!panel||!select||!isAdmin)return;
 panel.hidden=false;
 try{
  const result=await e24AdminApi('/admin/users');
  e24AdminUsersCache=(result.users||[]).map(u=>({uid:u.uid,data:u.profile||{}})).sort((a,b)=>String(a.data.name||a.data.email||'').localeCompare(String(b.data.name||b.data.email||'')));
  const target=activeDataUid||currentUser.uid;select.innerHTML='';
  e24AdminUsersCache.forEach(u=>{const o=document.createElement('option');o.value=u.uid;o.textContent=e24AdminUserLabel(u.uid,u.data);select.appendChild(o);});
  select.value=e24AdminUsersCache.some(u=>u.uid===target)?target:(e24AdminUsersCache[0]?.uid||'');
  select.onchange=()=>e24AdminOpenUser(select.value);
  if(select.value&&select.value!==activeDataUid)await e24AdminOpenUser(select.value);
  e24AdminUpdateSummary();
 }catch(err){console.error('Admin users load failed:',err);const box=document.getElementById('e24-admin-user-summary');if(box)box.textContent='ব্যবহারকারীর তালিকা পাওয়া যায়নি। Admin API / অনুমতি পরীক্ষা করুন।';throw err;}
}function e24AdminUpdateSummary(){
 const box=document.getElementById('e24-admin-user-summary');if(!box||!isAdmin)return;
 const user=e24AdminUsersCache.find(u=>u.uid===activeDataUid),d=user?.data||{},saleTransactions=(db.transactions||[]).filter(t=>t.type==='বাকি'),sales=saleTransactions.reduce((n,t)=>n+(Number(t.amount)||0),0),creditSales=saleTransactions.reduce((n,t)=>n+Math.max(0,(Number(t.amount)||0)-(Number(t.paid)||0)),0),paid=(db.customers||[]).reduce((n,c)=>n+customerTotals(c.id).paid,0),due=(db.customers||[]).reduce((n,c)=>n+customerTotals(c.id).due,0);
 box.innerHTML='<div class="e24-admin-summary-name">'+esc(d.name||d.email||'ব্যবহারকারী')+'</div><div class="e24-admin-summary-email">'+esc(d.email||'')+'</div><div class="e24-admin-summary-grid"><span>গ্রাহক<strong>'+db.customers.length+'</strong></span><span>লেনদেন<strong>'+db.transactions.length+'</strong></span><span>মোট বিক্রি<strong>'+money(sales)+'</strong></span><span>বাকিতে বিক্রি<strong>'+money(creditSales)+'</strong></span><span>জমা<strong>'+money(paid)+'</strong></span><span>বর্তমান বকেয়া<strong>'+money(due)+'</strong></span></div>';
}
async function e24AdminOpenUser(uid){
 if(!isAdmin||!uid)return;const select=document.getElementById('e24-admin-user-select');if(select)select.disabled=true;
 try{await e24LoadData(uid);if(select)select.value=uid;e24AdminUpdateSummary();showToast(uid===currentUser.uid?'নিজের হিসাব খোলা হয়েছে':'নির্বাচিত ব্যবহারকারীর হিসাব খোলা হয়েছে');}
 catch(err){console.error('Admin user data load failed:',err);showToast('ব্যবহারকারীর হিসাব খোলা যায়নি। অনুমতি পরীক্ষা করুন।');}
 finally{if(select)select.disabled=false;}
}
function e24ShowVerification(user){const screen=document.getElementById('e24-auth-screen');document.getElementById("e24-launch-splash").hidden=true;document.querySelector(".e24-auth-card").classList.remove("launching");document.getElementById("e24-auth-subtitle").hidden=false;document.getElementById('e24-login-form').hidden=true;document.getElementById('e24-register-form').hidden=true;document.getElementById('e24-auth-switch').hidden=true;document.getElementById('e24-forgot-password-link').hidden=true;document.getElementById('e24-forgot-panel').hidden=true;document.getElementById('e24-verify-panel').hidden=false;document.getElementById('e24-auth-subtitle').textContent='আপনার Email ঠিকানা যাচাই করুন';document.getElementById('e24-verify-email').textContent=user.email||'';screen.hidden=false;}
async function e24OtpRequest(path,payload){const user=e24Auth.currentUser;if(!user)throw new Error('আবার লগইন করুন।');const token=await user.getIdToken();const response=await fetch(E24_OTP_API+path,{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},body:JSON.stringify(payload||{})});let data={};try{data=await response.json();}catch(_){}if(!response.ok)throw new Error(data.error||data.message||'অনুরোধটি সম্পন্ন হয়নি। পরে আবার চেষ্টা করুন।');return data;}
let e24PasswordResetEmail='',e24PasswordResetToken='';
async function e24PasswordResetRequest(path,payload){const response=await fetch(E24_OTP_API+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload||{})});let data={};try{data=await response.json();}catch(_){}if(!response.ok||data.success!==true)throw new Error(data.message||'অনুরোধটি সম্পন্ন হয়নি। আবার চেষ্টা করুন।');return data;}
function e24ShowForgotPassword(){e24PasswordResetToken='';e24PasswordResetEmail=document.getElementById('e24-login-email').value.trim();document.getElementById('e24-login-form').hidden=true;document.getElementById('e24-register-form').hidden=true;document.getElementById('e24-verify-panel').hidden=true;document.getElementById('e24-auth-switch').hidden=true;document.getElementById('e24-forgot-password-link').hidden=true;document.getElementById('e24-forgot-panel').hidden=false;document.getElementById('e24-forgot-send-step').hidden=false;document.getElementById('e24-forgot-otp-step').hidden=true;document.getElementById('e24-forgot-password-step').hidden=true;e24PasswordResetEmail='';const forgotEmailInput=document.getElementById('e24-forgot-email');forgotEmailInput.value='';forgotEmailInput.placeholder='Enter your Gmail address';forgotEmailInput.readOnly=false;forgotEmailInput.disabled=false;document.getElementById('e24-forgot-otp').value='';document.getElementById('e24-forgot-new-password').value='';document.getElementById('e24-forgot-confirm-password').value='';document.getElementById('e24-auth-subtitle').hidden=false;document.getElementById('e24-auth-subtitle').textContent='পাসওয়ার্ড পুনরুদ্ধার';document.getElementById('e24-auth-error').textContent='';}
async function e24ForgotSendOtp(){const email=document.getElementById('e24-forgot-email').value.trim().toLowerCase(),button=document.getElementById('e24-forgot-send');const error=document.getElementById('e24-auth-error');if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){error.textContent='সঠিক Email address লিখুন।';return;}button.disabled=true;error.textContent='OTP পাঠানো হচ্ছে...';try{await e24PasswordResetRequest('/forgot-password/send-otp',{email});e24PasswordResetEmail=email;document.getElementById('e24-forgot-send-step').hidden=true;document.getElementById('e24-forgot-otp-step').hidden=false;error.textContent='অ্যাকাউন্ট থাকলে Email-এ OTP পাঠানো হয়েছে। Inbox ও Spam folder দেখুন।';}catch(err){error.textContent=err.message||'OTP পাঠানো যায়নি।';}finally{button.disabled=false;}}
async function e24ForgotVerifyOtp(){const otp=document.getElementById('e24-forgot-otp').value.trim(),button=document.getElementById('e24-forgot-verify'),error=document.getElementById('e24-auth-error');if(!/^\d{6}$/.test(otp)){error.textContent='৬ সংখ্যার OTP লিখুন।';return;}button.disabled=true;error.textContent='OTP যাচাই হচ্ছে...';try{const result=await e24PasswordResetRequest('/forgot-password/verify-otp',{email:e24PasswordResetEmail,otp});e24PasswordResetToken=result.resetToken;document.getElementById('e24-forgot-otp-step').hidden=true;document.getElementById('e24-forgot-password-step').hidden=false;error.textContent='OTP যাচাই হয়েছে। এখন নতুন Password দিন।';}catch(err){error.textContent=err.message||'OTP যাচাই করা যায়নি।';}finally{button.disabled=false;}}
async function e24ForgotResetPassword(){const password=document.getElementById('e24-forgot-new-password').value,confirm=document.getElementById('e24-forgot-confirm-password').value,button=document.getElementById('e24-forgot-reset'),error=document.getElementById('e24-auth-error');if(password.length<6){error.textContent='Password কমপক্ষে ৬ অক্ষরের হতে হবে।';return;}if(password!==confirm){error.textContent='দুইটি Password একই হতে হবে।';return;}button.disabled=true;error.textContent='নতুন Password সংরক্ষণ হচ্ছে...';try{await e24PasswordResetRequest('/forgot-password/reset',{email:e24PasswordResetEmail,resetToken:e24PasswordResetToken,newPassword:password});document.getElementById('e24-forgot-panel').hidden=true;e24SetAuthMode('login');document.getElementById('e24-login-email').value=e24PasswordResetEmail;document.getElementById('e24-login-password').value='';error.textContent='Password সফলভাবে পরিবর্তন হয়েছে। নতুন Password দিয়ে Login করুন।';e24PasswordResetToken='';}catch(err){error.textContent=err.message||'Password পরিবর্তন করা যায়নি।';}finally{button.disabled=false;}}
async function e24SendEmailOtp(){const button=document.getElementById('e24-resend-verification');if(button)button.disabled=true;const error=document.getElementById('e24-auth-error');try{await e24OtpRequest('/send-email-otp',{});error.textContent='আপনার Gmail-এ ৬ সংখ্যার OTP পাঠানো হয়েছে। Inbox ও Spam folder দেখুন।';}catch(err){error.textContent=err.message||'OTP পাঠানো যায়নি। আবার চেষ্টা করুন।';}finally{if(button)button.disabled=false;}}
async function e24VerifyEmailOtp(){const user=e24Auth.currentUser,field=document.getElementById('e24-otp-code'),button=document.getElementById('e24-check-verification'),error=document.getElementById('e24-auth-error');if(!user){error.textContent='আবার লগইন করুন।';return;}const otp=(field.value||'').trim();if(!/^[0-9]{6}$/.test(otp)){error.textContent='৬ সংখ্যার OTP লিখুন।';field.focus();return;}button.disabled=true;error.textContent='OTP যাচাই হচ্ছে...';try{await e24OtpRequest('/verify-email-otp',{otp:otp});await user.reload();await user.getIdToken(true);await user.reload();if(user.emailVerified){error.textContent='Email সফলভাবে Verify হয়েছে। অ্যাপ খুলছে...';location.reload();}else{error.textContent='OTP গ্রহণ করা হয়েছে, কিন্তু Firebase verification status এখনো আপডেট হয়নি। আবার চেষ্টা করুন।';}}catch(err){error.textContent=err.message||'OTP যাচাই করা যায়নি।';}finally{button.disabled=false;}}

function e24ReadSettings(){try{return JSON.parse(localStorage.getItem('e24-app-settings')||'{}')}catch(_){return {}}}
let e24PendingProfilePhoto = null;
window.e24OrgName = '';
function e24SetProfilePhotoPreview(dataUrl){
  const preview=document.getElementById('e24-profile-photo-preview');if(!preview)return;
  preview.innerHTML='';
  if(dataUrl){const img=document.createElement('img');img.src=dataUrl;img.alt='প্রোফাইল ছবি';img.style.cssText='width:100%;height:100%;object-fit:cover';preview.appendChild(img);}
  else preview.innerHTML='<i class="fa-solid fa-user"></i>';
}
function e24PrepareProfilePhoto(file){
  return new Promise((resolve,reject)=>{
    if(!file||!file.type||!file.type.startsWith('image/'))return reject(new Error('INVALID_IMAGE'));
    if(file.size>5*1024*1024)return reject(new Error('FILE_TOO_LARGE'));
    const reader=new FileReader();reader.onerror=()=>reject(new Error('READ_FAILED'));
    reader.onload=()=>{
      const img=new Image();img.onerror=()=>reject(new Error('IMAGE_FAILED'));
      img.onload=()=>{
        const scale=Math.min(1,256/Math.max(img.width,img.height)),canvas=document.createElement('canvas');
        canvas.width=Math.max(1,Math.round(img.width*scale));canvas.height=Math.max(1,Math.round(img.height*scale));
        const ctx=canvas.getContext('2d');ctx.fillStyle='#ffffff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0,canvas.width,canvas.height);
        let quality=.78,data=canvas.toDataURL('image/jpeg',quality);
        while(data.length>320000&&quality>.35){quality-=.08;data=canvas.toDataURL('image/jpeg',quality);}
        if(data.length>320000)return reject(new Error('IMAGE_TOO_LARGE'));
        resolve(data);
      };img.src=reader.result;
    };reader.readAsDataURL(file);
  });
}
function e24SetupSettings(){
  const profileSaveButton=document.getElementById('e24-save-profile');
  if(profileSaveButton)profileSaveButton.onclick=()=>e24SaveProfile();
  const paymentSettingsSaveBtn=document.getElementById('e24-save-payment-settings');
  if(paymentSettingsSaveBtn)paymentSettingsSaveBtn.onclick=e24SavePaymentSettings;
  e24RenderPaymentSettings();
  const s=e24ReadSettings(),dark=document.getElementById('e24-settings-dark'),notice=document.getElementById('e24-settings-notifications'),language=document.getElementById('e24-settings-language'),restore=document.getElementById('e24-restore-file'),photoInput=document.getElementById('e24-profile-photo-file');
  if(dark){dark.checked=!!s.dark;dark.onchange=()=>{const v=e24ReadSettings();v.dark=dark.checked;localStorage.setItem('e24-app-settings',JSON.stringify(v));document.querySelector('.phone-screen')?.classList.toggle('e24-dark',dark.checked);};}
  if(notice){notice.checked=s.notifications!==false;notice.onchange=()=>{const v=e24ReadSettings();v.notifications=notice.checked;localStorage.setItem('e24-app-settings',JSON.stringify(v));showToast('নোটিফিকেশন পছন্দ সংরক্ষিত হয়েছে');};}
  if(language){language.value='bn';language.onchange=()=>showToast('বর্তমানে বাংলা ভাষা চালু আছে');}
  if(photoInput)photoInput.addEventListener('change',async()=>{const file=photoInput.files&&photoInput.files[0];if(!file)return;try{e24PendingProfilePhoto=await e24PrepareProfilePhoto(file);e24SetProfilePhotoPreview(e24PendingProfilePhoto);showToast('ছবি প্রস্তুত হয়েছে। প্রোফাইল সংরক্ষণ করুন।');}catch(err){photoInput.value='';showToast(err.message==='FILE_TOO_LARGE'?'ছবির ফাইল ৫ MB-এর কম হতে হবে।':'ছবিটি ব্যবহার করা যাচ্ছে না। অন্য ছবি দিন।');}});
  document.querySelector('.phone-screen')?.classList.toggle('e24-dark',!!s.dark);
  if(restore)restore.addEventListener('change',e24RestoreBackup);
}

async function e24SaveProfile(){
  if(!currentUser)return showToast('আগে লগইন করুন');
  const name=(document.getElementById('e24-settings-name').value||'').trim(),mobile=(document.getElementById('e24-settings-mobile').value||'').trim(),organizationName=(document.getElementById('e24-settings-organization').value||'').trim();
  const saveButton=document.querySelector('.e24-settings-actions button');
  if(saveButton)saveButton.disabled=true;
  try{
    const profileRef=e24Store.collection('users').doc(currentUser.uid);
    const profileData={name,mobile,organizationName,updatedAt:firebase.firestore.FieldValue.serverTimestamp()};
    if(e24PendingProfilePhoto)profileData.profilePhotoData=e24PendingProfilePhoto;
    await profileRef.set(profileData,{merge:true});
    // Confirm the committed values from the server before showing success.
    const saved=await profileRef.get({source:'server'});
    if(!saved.exists)throw new Error('PROFILE_NOT_FOUND_AFTER_SAVE');
    const verified=saved.data()||{};
    if((verified.name||'')!==name||(verified.mobile||'')!==mobile||(verified.organizationName||'')!==organizationName)throw new Error('PROFILE_SAVE_NOT_VERIFIED');
    document.getElementById('e24-settings-name').value=verified.name||'';
    document.getElementById('e24-settings-mobile').value=verified.mobile||'';
    document.getElementById('e24-settings-organization').value=verified.organizationName||'';
    if(verified.profilePhotoData)e24SetProfilePhotoPreview(verified.profilePhotoData);
    window.e24OrgName=(verified.organizationName||'').trim();
    e24PendingProfilePhoto=null;
    switchPage('1');
    showToast('প্রোফাইল সংরক্ষিত হয়েছে');
  }catch(e){console.error('E24 profile save failed:',e);showToast('প্রোফাইল সংরক্ষণ/যাচাই হয়নি: '+(e.code||e.message||'অজানা সমস্যা'));}
  finally{if(saveButton)saveButton.disabled=false;}
}
async function e24ChangeEmail(){
  if(!currentUser)return;
  const email=prompt('নতুন Email address লিখুন:');if(!email)return;
  try{await currentUser.updateEmail(email.trim());await e24Store.collection('users').doc(currentUser.uid).set({email:email.trim()},{merge:true});document.getElementById('e24-account-email').textContent=email.trim();showToast('Email পরিবর্তন হয়েছে। নতুন Email যাচাই করুন।');}
  catch(e){showToast(e.code==='auth/requires-recent-login'?'নিরাপত্তার জন্য লগআউট করে আবার লগইন করে চেষ্টা করুন।':'Email পরিবর্তন করা যায়নি। Email সঠিক কি না দেখুন।');}
}
async function e24ResetPassword(){
  const email=currentUser?.email;if(!email)return showToast('অ্যাকাউন্ট Email পাওয়া যায়নি');
  try{await e24Auth.sendPasswordResetEmail(email);showToast('Password Reset link আপনার Email-এ পাঠানো হয়েছে');}
  catch(e){showToast('Password Reset Email পাঠানো যায়নি');}
}
function e24ExportBackup(){
  if(!currentUser||!db)return showToast('আগে লগইন করুন');
  try{
    const payload={app:'E24 Hisab',version:1,exportedAt:new Date().toISOString(),data:db};
    const json=JSON.stringify(payload,null,2);
    const filename='e24-hisab-backup-'+new Date().toISOString().slice(0,10)+'.json';
    // Android WebView downloads Blob URLs unreliably; use the native save-file picker.
    if(window.AndroidBackup&&typeof window.AndroidBackup.saveBackup==='function'){
      window.AndroidBackup.saveBackup(json,filename);
      return;
    }
    const blob=new Blob([json],{type:'application/json;charset=utf-8'});
    const url=URL.createObjectURL(blob),a=document.createElement('a');
    a.href=url;a.download=filename;a.style.display='none';a.rel='noopener';
    document.body.appendChild(a);a.click();a.remove();
    // Do not revoke the Blob URL immediately; mobile browsers need time to start the download.
    window.setTimeout(()=>URL.revokeObjectURL(url),30000);
    showToast('Backup ফাইল ডাউনলোড শুরু হয়েছে');
  }catch(err){
    console.error('E24 backup export failed:',err);
    showToast('Backup তৈরি করা যায়নি। আবার চেষ্টা করুন।');
  }
}
// Expose this IIFE-scoped handler for the Data Settings inline button.
window.e24ExportBackup=e24ExportBackup;

async function e24RestoreBackup(e){
  const file=e.target.files&&e.target.files[0];if(!file)return;
  try{
    const parsed=JSON.parse(await file.text()),data=parsed.data||parsed;
    if(!Array.isArray(data.customers)||!Array.isArray(data.transactions))throw new Error('INVALID');
    if(!confirm('বর্তমান হিসাবের ডাটা Backup-এর ডাটা দিয়ে প্রতিস্থাপন করবেন? আগে Backup রাখা ভালো।')){e.target.value='';return;}
    const clean={...data,customers:data.customers,transactions:data.transactions,updatedAt:firebase.firestore.FieldValue.serverTimestamp()};
    await e24Store.collection('users').doc(currentUser.uid).collection('data').doc('main').set(clean,{merge:false});
    db={customers:[],transactions:[],selectedCustomerId:null,txType:'বাকি',...data};refreshAll();renderSmsWallet();showToast('Backup Restore সম্পন্ন হয়েছে');
  }catch(err){showToast('Backup ফাইলটি সঠিক নয় অথবা Restore করা যায়নি');}
  finally{e.target.value='';}
}

function e24SetupAuthUI(){e24SetupSmsWalletUI();e24SetupSettings();const screen=document.getElementById('e24-auth-screen'),error=document.getElementById('e24-auth-error'),verifyPanel=document.getElementById('e24-verify-panel');document.getElementById('e24-auth-switch').addEventListener('click',()=>e24SetAuthMode(authMode==='login'?'register':'login'));document.getElementById('e24-forgot-password-link').addEventListener('click',e24ShowForgotPassword);document.getElementById('e24-forgot-back').addEventListener('click',()=>e24SetAuthMode('login'));document.getElementById('e24-forgot-send').addEventListener('click',e24ForgotSendOtp);document.getElementById('e24-forgot-verify').addEventListener('click',e24ForgotVerifyOtp);document.getElementById('e24-forgot-reset').addEventListener('click',e24ForgotResetPassword);document.querySelectorAll('[data-e24-toggle]').forEach(button=>button.addEventListener('click',()=>{const input=document.getElementById(button.dataset.e24Toggle);if(!input)return;input.type=input.type==='password'?'text':'password';button.textContent=input.type==='password'?'দেখুন':'লুকান';}));document.getElementById('e24-login-form').addEventListener('submit',async e=>{e.preventDefault();error.textContent='লগইন হচ্ছে...';e24Diagnostic('login-submit');try{const remember=document.getElementById('e24-remember-me').checked;e24Diagnostic('auth-persistence-start',{remember});await e24Auth.setPersistence(remember?firebase.auth.Auth.Persistence.LOCAL:firebase.auth.Auth.Persistence.SESSION);e24Diagnostic('auth-persistence-success');e24Diagnostic('email-password-signin-start');await e24Auth.signInWithEmailAndPassword(document.getElementById('e24-login-email').value.trim(),document.getElementById('e24-login-password').value);e24Diagnostic('email-password-signin-resolved');}catch(err){e24Diagnostic('login-failed',{code:err&&err.code||'unknown',message:err&&err.message||String(err)});error.textContent=e24AuthMessage(err);}});document.getElementById('e24-register-form').addEventListener('submit',async e=>{e.preventDefault();const email=document.getElementById('e24-register-email').value.trim(),mobile=document.getElementById('e24-register-mobile').value.trim(),referralCode=(document.getElementById('e24-register-referral')?.value||'').trim().toUpperCase(),password=document.getElementById('e24-register-password').value,confirmPassword=document.getElementById('e24-register-confirm-password').value;if(password!==confirmPassword){error.textContent='দুইটি Password একই হতে হবে।';return;}if(mobile.length<7){error.textContent='সঠিক Mobile Number লিখুন।';return;}if(referralCode){try{const vr=await fetch(E24_PAYMENT_API+'/referral/validate?code='+encodeURIComponent(referralCode));if(vr.ok){const vd=await vr.json();if(vd.valid!==true){error.textContent='Referral Code সঠিক নয়। আবার পরীক্ষা করুন।';return;}}}catch(_){/* If the Worker update is not deployed yet, retain the code and retry after deployment. */}}error.textContent='অ্যাকাউন্ট তৈরি হচ্ছে...';try{const c=await e24Auth.createUserWithEmailAndPassword(email,password);await e24Store.collection('users').doc(c.user.uid).set({email:c.user.email||email,mobile:mobile,emailVerified:false,createdAt:firebase.firestore.FieldValue.serverTimestamp()},{merge:true});if(referralCode)localStorage.setItem('e24PendingReferralCode',referralCode);try{await e24ReferralRequest('/referral/setup',{method:'POST',body:{referralCode}});localStorage.removeItem('e24PendingReferralCode');}catch(refErr){console.warn('Referral setup will retry after backend deployment:',refErr.message);}e24ShowVerification(c.user);await e24SendEmailOtp();}catch(err){error.textContent=e24AuthMessage(err);}});document.getElementById('e24-resend-verification').addEventListener('click',e24SendEmailOtp);document.getElementById('e24-check-verification').addEventListener('click',e24VerifyEmailOtp);document.getElementById('e24-verify-logout').addEventListener('click',async()=>{await e24Auth.signOut();verifyPanel.hidden=true;e24SetAuthMode('login');error.textContent='লগআউট হয়েছে।';});e24Auth.onAuthStateChanged(async user=>{e24Diagnostic('auth-state-changed',{signedIn:!!user,uidSuffix:user&&user.uid?String(user.uid).slice(-6):null,emailVerified:user?!!user.emailVerified:null});window.e24ActivePageUid=user&&user.uid?user.uid:null;currentUser=user||null;if(!user){if(e24NotificationPollTimer){clearInterval(e24NotificationPollTimer);e24NotificationPollTimer=null;}activeDataUid=null;isAdmin=false;isMainAdmin=false;e24AdminRole='user';document.getElementById('e24-admin-settings').hidden=true;document.getElementById('sms-admin-recharge-panel').hidden=true;document.getElementById('e24-admin-role-manager').hidden=true;db={customers:[],transactions:[],selectedCustomerId:null,txType:'বাকি'};screen.hidden=false;verifyPanel.hidden=true;document.getElementById('e24-admin-panel').hidden=true;e24SetAuthMode('login');return;}isMainAdmin=user.uid===E24_ADMIN_UID||(String(user.email||'').trim().toLowerCase()==='mainul.ru.ac.bd@gmail.com'&&!!user.emailVerified);isAdmin=isMainAdmin;e24AdminRole=isMainAdmin?'main':'user';if(!user.emailVerified&&!isMainAdmin){activeDataUid=null;e24ShowVerification(user);return;}if(!isMainAdmin){try{const roleInfo=await e24AdminApi('/admin/me');e24AdminRole=roleInfo.role||'user';isAdmin=['limited','full','main'].includes(e24AdminRole);isMainAdmin=e24AdminRole==='main';}catch(_){isAdmin=false;e24AdminRole='user';}}const limitedRole=e24AdminRole==='limited';const smsHistoryPanel=document.getElementById('sms-history-panel'),walletHistoryPanel=document.getElementById('sms-wallet-transactions-panel');if(smsHistoryPanel)smsHistoryPanel.style.display=limitedRole?'none':'';if(walletHistoryPanel)walletHistoryPanel.style.display=limitedRole?'none':'';verifyPanel.hidden=true;screen.hidden=true;document.getElementById('e24-auth-switch').hidden=false;document.getElementById('e24-account-email').textContent=user.email||'';document.getElementById('e24-account-role').textContent=e24AdminRoleName(e24AdminRole);document.getElementById('e24-admin-settings').hidden=!isAdmin;document.getElementById('e24-admin-role-manager').hidden=!isMainAdmin;document.getElementById('e24-admin-panel').hidden=!(isMainAdmin||e24AdminRole==='full');try{e24Diagnostic('profile-read-start',{path:'users/{uid}'});const profile=e24Store.collection('users').doc(user.uid);let p;try{p=await profile.get();e24Diagnostic('profile-read-success',{exists:p.exists});}catch(profileReadErr){e24Diagnostic('profile-read-failed',{code:profileReadErr&&profileReadErr.code||'unknown',message:profileReadErr&&profileReadErr.message||String(profileReadErr),path:'users/{uid}'});throw profileReadErr;}if(p.exists){const pd=p.data()||{};document.getElementById('e24-settings-name').value=pd.name||'';document.getElementById('e24-settings-mobile').value=pd.mobile||'';document.getElementById('e24-settings-organization').value=pd.organizationName||'';window.e24OrgName=pd.organizationName||'';e24SetProfilePhotoPreview(pd.profilePhotoData||'');}else{window.e24OrgName='';e24SetProfilePhotoPreview('');}
      e24ApplyHomeHeaderName();if(!p.exists){e24Diagnostic('profile-create-start',{path:'users/{uid}'});try{await profile.set({email:user.email||'',emailVerified:!!user.emailVerified,createdAt:firebase.firestore.FieldValue.serverTimestamp()},{merge:true});e24Diagnostic('profile-create-success');}catch(profileWriteErr){e24Diagnostic('profile-create-failed',{code:profileWriteErr&&profileWriteErr.code||'unknown',message:profileWriteErr&&profileWriteErr.message||String(profileWriteErr),path:'users/{uid}'});throw profileWriteErr;}}else if(p.data().emailVerified!==!!user.emailVerified){e24Diagnostic('profile-update-start',{fields:['email','emailVerified'],refreshingAuthToken:true});try{await user.getIdToken(true);e24Diagnostic('profile-update-token-refreshed');await profile.update({email:String(user.email||p.data().email||''),emailVerified:!!user.emailVerified});e24Diagnostic('profile-update-success');}catch(profileUpdateErr){e24Diagnostic('profile-update-failed',{code:profileUpdateErr&&profileUpdateErr.code||'unknown',message:profileUpdateErr&&profileUpdateErr.message||String(profileUpdateErr),path:'users/{uid}'});throw profileUpdateErr;}}await e24LoadData(user.uid);e24RenderPaymentSettings();e24RestoreLastPage(user.uid);await e24LoadReferralPanel();e24StartNotificationPolling();if(isAdmin){try{if(isMainAdmin||e24AdminRole==='full')await e24RenderAdminUsers();await e24RenderAdminRechargeRequests();if(isMainAdmin)await e24RenderAdminRoleManager();}catch(adminErr){console.error('Admin initialization failed:',adminErr);showToast('Admin তথ্য লোড হয়নি। Worker API পরীক্ষা করুন।');}}else{document.getElementById('e24-admin-panel').hidden=true;document.getElementById('sms-admin-recharge-panel').hidden=true;}}catch(err){e24Diagnostic('startup-failed',{code:err&&err.code||'unknown',message:err&&err.message||String(err),name:err&&err.name||'Error'});console.error('E24 startup / Firestore load failed:',err);screen.hidden=false;const code=String(err&&err.code||'unknown');const detail=String(err&&err.message||err||'অজানা সমস্যা');error.textContent='ডেটা লোড হয়নি। Firebase Error: '+code+' — '+detail;}});}

function e24Money(amount){return '৳ '+Number(amount||0).toLocaleString('en-BD',{minimumFractionDigits:2,maximumFractionDigits:2});}
function renderSmsWallet(){
const b=document.getElementById('sms-wallet-balance'),h=document.getElementById('sms-history-list'),l=document.getElementById('sms-wallet-transactions'),p=document.getElementById('sms-admin-recharge-panel'),a=document.getElementById('sms-admin-recharge-list');if(!b||!db)return;
if(!Number.isFinite(Number(db.smsWalletBalance)))db.smsWalletBalance=0;if(!Array.isArray(db.smsHistory))db.smsHistory=[];if(!Array.isArray(db.smsRechargeRequests))db.smsRechargeRequests=[];if(!Array.isArray(db.smsWalletTransactions))db.smsWalletTransactions=[];
b.textContent=e24Money(db.smsWalletBalance);e24RenderSmsCustomers();
if(h){const rows=db.smsHistory.slice().reverse().slice(0,20);h.innerHTML=rows.length?rows.map(x=>'<div class="sms-history-item"><span><b>'+e24SmsEscape(x.phone||'')+'</b><br><span class="sms-wallet-note">'+e24SmsEscape(x.date||'')+' · TEST MODE</span><br><span class="sms-wallet-note">'+e24SmsEscape((x.message||'').slice(0,90))+'</span></span><span style="text-align:right"><b style="color:'+(x.status==='SUCCESS'?'var(--primary-green)':'var(--accent-red)')+'">'+(x.status==='SUCCESS'?'- '+e24Money(x.cost||1):'ব্যর্থ')+'</b><br><span class="sms-wallet-note">'+(x.status==='SUCCESS'?'Demo সফল · টাকা কাটা হয়েছে':'কাটা হয়নি')+'</span></span></div>').join(''):'<div class="sms-wallet-note">এখনো কোনো SMS পাঠানো হয়নি।</div>';}
if(l){const rows=db.smsWalletTransactions.filter(x=>x&&x.type==='CREDIT'&&((String(x.title||'').includes('Admin অনুমোদিত')&&(x.mode==='TEST'||x.mode==='MANUAL'))||(['SANDBOX','LIVE'].includes(x.mode)&&String(x.title||'').includes('SSLCOMMERZ')))).slice().reverse().slice(0,30);l.innerHTML=rows.length?rows.map(x=>{const modeLabel=x.mode==='LIVE'?'SSLCommerz Live':x.mode==='SANDBOX'?'SSLCommerz Sandbox':x.mode==='MANUAL'?'Manual Recharge':'Admin অনুমোদিত Test Recharge';return '<div class="sms-history-item"><span><b>'+e24SmsEscape(x.title||'Wallet লেনদেন')+'</b><br><span class="sms-wallet-note">'+e24SmsEscape(x.date||'')+' · '+modeLabel+'</span><br><span class="sms-wallet-note">রেফারেন্স: '+e24SmsEscape(x.id||'-')+'</span></span><span style="text-align:right"><b style="color:var(--primary-green)">+ '+e24Money(x.amount)+'</b><br><span class="sms-wallet-note">ব্যালেন্স: '+e24Money(x.balanceAfter)+'</span></span></div>';}).join(''):'<div class="sms-wallet-note">এখনো কোনো Wallet লেনদেন নেই।</div>';}
if(p)p.hidden=!isAdmin;if(a&&isAdmin)e24RenderAdminRechargeRequests();
}

async function e24RenderAdminRechargeRequests(){
 const panel=document.getElementById('sms-admin-recharge-panel'),list=document.getElementById('sms-admin-recharge-list');
 if(!isAdmin||!panel||!list)return;
 panel.hidden=false;list.innerHTML='<div class="sms-wallet-note">Pending Request লোড হচ্ছে...</div>';
 try{
  const result=await e24AdminApi('/admin/recharge');
  const pending=result.requests||[];
  e24TrackNewRechargeRequests(pending);
  list.innerHTML=pending.length?pending.map(x=>'<div class="sms-admin-request"><b>'+e24Money(x.amount)+'</b> · '+e24SmsEscape(x.date||'')+'<br><span class="sms-wallet-note">'+e24SmsEscape(x.email||'')+' · '+e24SmsEscape(x.paymentMethod||'Payment')+' · Pending</span><br><span class="sms-wallet-note">প্রাপক: '+e24SmsEscape(x.receiverNumber||'01737-537688')+'<br>TrxID: <b>'+e24SmsEscape(x.transactionId||'-')+'</b></span><br><div style="display:flex;gap:7px;flex-wrap:wrap;margin-top:8px"><button type="button" class="btn btn-green" data-sms-approve="'+e24SmsEscape(x.id)+'" data-sms-owner="'+e24SmsEscape(x.uid)+'">টাকা যাচাই করে Approve</button><button type="button" class="btn btn-logout" data-sms-cancel="'+e24SmsEscape(x.id)+'" data-sms-owner="'+e24SmsEscape(x.uid)+'">রিকোয়েস্ট Cancel</button></div></div>').join(''):'<div class="sms-wallet-note" style="margin-top:7px">কোনো Pending Request নেই।</div>';
  if(e24AdminRole==='limited')list.querySelectorAll('[data-sms-cancel]').forEach(button=>button.style.display='none');
 }catch(err){console.error('Admin recharge requests load failed:',err);list.innerHTML='<div class="sms-wallet-note">Recharge Request লোড হয়নি। Admin API সংযোগ ও অনুমতি পরীক্ষা করুন।</div>';}
}
async function e24RenderAdminRoleManager(){
 const wrap=document.getElementById('e24-admin-role-manager');if(!wrap)return;if(!isMainAdmin){wrap.hidden=true;return;}wrap.hidden=false;
 const userSelect=document.getElementById('e24-admin-role-user'),roleSelect=document.getElementById('e24-admin-role-choice'),status=document.getElementById('e24-admin-role-status');
 try{
  const [usersResult,rolesResult]=await Promise.all([e24AdminApi('/admin/users'),e24AdminApi('/admin/roles')]);
  const users=usersResult.users||[],roles=rolesResult.roles||[];
  e24AdminUsersCache=users.map(u=>({uid:u.uid,data:u.profile||{}}));
  const selectableUsers=users.filter(u=>u.uid!==currentUser.uid&&u.uid!==E24_ADMIN_UID);
  userSelect.innerHTML='<option value="">ব্যবহারকারী নির্বাচন করুন</option>'+selectableUsers.map(u=>'<option value="'+e24SmsEscape(u.uid)+'">'+e24SmsEscape((u.profile||{}).name||(u.profile||{}).email||u.uid)+'</option>').join('');
  userSelect.onchange=()=>{ const role=roles.find(r=>r.uid===userSelect.value); roleSelect.value=role?.role||'none'; };
  const box=document.getElementById('e24-admin-role-list');
  if(box)box.innerHTML=roles.length?roles.map(r=>'<div class="sms-history-item" style="gap:8px;align-items:center"><span style="flex:1;min-width:0"><b>'+e24SmsEscape(e24AdminRoleName(r.role))+'</b><br><span class="sms-wallet-note">'+e24SmsEscape((users.find(u=>u.uid===r.uid)?.profile||{}).email||r.uid)+'</span></span><span style="white-space:nowrap">'+e24SmsEscape(r.role==='limited'?'সব Recharge Request':'সব ব্যবহারকারী')+'</span></div>').join(''):'<div class="sms-wallet-note">এখনো কোনো Admin তৈরি করা হয়নি।</div>';
  if(status)status.textContent='Admin তালিকা লোড হয়েছে।';
 }catch(err){console.error('Admin roles load failed:',err);if(status)status.textContent='Admin তালিকা লোড হয়নি: '+err.message;}
}
async function e24SaveAdminRole(){
 if(!isMainAdmin){showToast('শুধু Administrator এই কাজ করতে পারবেন।');return;}
 const uid=document.getElementById('e24-admin-role-user')?.value,role=document.getElementById('e24-admin-role-choice')?.value,status=document.getElementById('e24-admin-role-status');
 if(!uid){showToast('ব্যবহারকারী নির্বাচন করুন');return;}
 const managedUsers=[];
try{
  const result=await e24AdminApi('/admin/roles',{method:'PUT',body:{uid,role,managedUsers}});
  if(status)status.textContent='Admin Role সংরক্ষিত হয়েছে। '+(role==='limited'?'সব Recharge Request পরিচালনার অনুমতি দেওয়া হয়েছে; ব্যবহারকারী ব্যবস্থাপনা বন্ধ।':'');
  showToast('Admin Role সফলভাবে সংরক্ষিত হয়েছে।');
  await e24RenderAdminRoleManager();
  const refreshedSelect=document.getElementById('e24-admin-role-user');
  if(refreshedSelect){refreshedSelect.value=uid;refreshedSelect.dispatchEvent(new Event('change'));}
 }catch(err){showToast('Role সংরক্ষণ হয়নি: '+err.message);if(status)status.textContent='Role সংরক্ষণ হয়নি: '+err.message;}
}
async function e24DeleteSelectedUser(){
 if(!isMainAdmin){showToast('শুধু Administrator এই কাজ করতে পারবেন।');return;}
 const uid=document.getElementById('e24-admin-role-user')?.value;if(!uid){showToast('ব্যবহারকারী নির্বাচন করুন');return;}
 const u=e24AdminUsersCache.find(x=>x.uid===uid),label=u?.data?.email||u?.data?.name||uid;
 if(!(await showAppConfirm('সতর্কতা: '+label+'-এর Firebase Login, গ্রাহক, লেনদেন, খাতা ও সংরক্ষিত User Data স্থায়ীভাবে মুছে ফেলার অনুরোধ করা হবে। এই কাজ ফেরানো যাবে না।','ব্যবহারকারী স্থায়ীভাবে মুছবেন?')))return;
 try{await e24AdminApi('/admin/users/'+encodeURIComponent(uid),{method:'DELETE'});showToast('ব্যবহারকারী ও তার ডেটা মুছে ফেলার কাজ সম্পন্ন হয়েছে।');await e24RenderAdminRoleManager();await e24RenderAdminUsers();}catch(err){showToast('ব্যবহারকারী মুছতে সমস্যা হয়েছে: '+err.message);}
}
// Expose inline Admin action handlers explicitly for WebView and browser compatibility.
window.e24SaveAdminRole = e24SaveAdminRole;
window.e24DeleteSelectedUser = e24DeleteSelectedUser;

function e24SmsEscape(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function e24SmsDefaultMessage(customer){
  const c=customer||null;
  const name=c&&c.name?c.name:'গ্রাহক';
  const due=c?customerTotals(c.id).due:0;
  return 'সম্মানিত '+name+', আপনার বকেয়া টাকা: '+e24Money(due)+'। দয়া করে দ্রুত পরিশোধ করুন।\n– E24 Hisab';
}
function e24SmsSelectedCustomer(){
  const select=document.getElementById('sms-customer-select');
  return select&&select.value?db.customers.find(c=>String(c.id)===String(select.value)):null;
}
function e24RenderSmsCustomers(){
  const select=document.getElementById('sms-customer-select');if(!select)return;
  const old=select.value;
  const customers=(db.customers||[]).filter(c=>(Number(customerTotals(c.id).due)||0)>0);
  select.innerHTML='<option value="">বকেয়া আছে এমন গ্রাহক নির্বাচন করুন</option>'+customers.map(c=>'<option value="'+e24SmsEscape(c.id)+'">'+e24SmsEscape(c.name)+'</option>').join('');
  if(customers.some(c=>String(c.id)===old))select.value=old;
}
function e24ApplySmsCustomer(customer){
  const phone=document.getElementById('sms-test-phone');
  const message=document.getElementById('sms-test-message');
  if(!customer){if(phone)phone.value='';if(message)message.value='';return;}
  if(phone)phone.value=customer.phone||'';
  if(message){const text=e24SmsDefaultMessage(customer);message.value=text;message.placeholder=text;}
}
function e24SetupSmsWalletUI(){
const send=document.getElementById('sms-test-send'),request=document.getElementById('sms-recharge-request'),adminList=document.getElementById('sms-admin-recharge-list'),customerSelect=document.getElementById('sms-customer-select'),defaultButton=document.getElementById('sms-use-default'),phonebook=document.getElementById('sms-phonebook');e24RenderSmsCustomers('');
/*
SSLCOMMERZ SANDBOX + LIVE AUTOMATIC PAYMENT — DISABLED / COMMENTED OUT
The Worker integration and API implementation are preserved for future activation.
Do not enable until the merchant Live account is approved and explicitly requested.

const autoRecharge=document.getElementById('sms-auto-recharge');
if(autoRecharge)autoRecharge.addEventListener('click',async()=>{
 if(!currentUser||!activeDataUid){showToast('আগে লগইন করুন');return;}
 if(isAdmin&&activeDataUid!==currentUser.uid){showToast('Admin হিসেবে অন্য ব্যবহারকারীর Wallet Recharge বন্ধ');return;}
 const amount=Number(document.getElementById('sms-recharge-amount')?.value);
 if(!Number.isFinite(amount)||amount<10||amount>10000||Math.round(amount*100)!==amount*100){showToast('১০ থেকে ১০,০০০ টাকার মধ্যে সঠিক পরিমাণ লিখুন');return;}
 autoRecharge.disabled=true;const oldText=autoRecharge.textContent;autoRecharge.textContent='পেমেন্ট সেশন তৈরি হচ্ছে...';
 try{
  const token=await currentUser.getIdToken();
  const response=await fetch(E24_PAYMENT_API+'/create-session',{method:'POST',headers:{'Authorization':'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({amount})});
  const result=await response.json();
  if(!response.ok||!result.gatewayPageURL){
   const messages={PROFILE_PHONE_REQUIRED:'আপনার Account Settings-এ সঠিক Mobile Number যোগ করুন।',INVALID_AMOUNT:'রিচার্জের পরিমাণ সঠিক নয়।',GATEWAY_SESSION_FAILED:'SSLCOMMERZ Payment Session তৈরি হয়নি। Store Configuration পরীক্ষা করুন।'};
   throw new Error(messages[result.error]||'Automatic Recharge শুরু করা যায়নি।');
  }
  window.location.href=result.gatewayPageURL;
 }catch(err){showToast(err.message||'পেমেন্ট শুরু করা যায়নি।');autoRecharge.disabled=false;autoRecharge.textContent=oldText;}
});

*/
if(customerSelect)customerSelect.addEventListener('change',()=>e24ApplySmsCustomer(e24SmsSelectedCustomer()));if(defaultButton)defaultButton.addEventListener('click',()=>{const m=document.getElementById('sms-test-message');if(m)m.value=e24SmsDefaultMessage(e24SmsSelectedCustomer());});
if(phonebook)phonebook.addEventListener('click',()=>{if(window.AndroidContacts&&typeof window.AndroidContacts.pickPhoneNumber==='function')window.AndroidContacts.pickPhoneNumber();else showToast('Phone Book সুবিধা শুধু Android APK-তে পাওয়া যাবে');});
window.e24SetPhoneBookContact=(name,phone)=>{const f=document.getElementById('sms-test-phone'),v=String(phone||'').trim(),norm=x=>String(x||'').replace(/[\s()+.-]/g,'').replace(/^\+?88/,'0'),sel=document.getElementById('sms-customer-select'),match=(db.customers||[]).find(c=>norm(c.phone)===norm(v));if(match&&sel){sel.value=String(match.id);e24ApplySmsCustomer(match);}if(f){f.value=v;f.dispatchEvent(new Event('input',{bubbles:true}));f.dispatchEvent(new Event('change',{bubbles:true}));f.focus();}showToast(f&&v?'Phone Book থেকে নম্বর যোগ হয়েছে':'ফোন নম্বর পাওয়া যায়নি');};
if(send)send.addEventListener('click',async()=>{if(!currentUser||!activeDataUid){showToast('আগে লগইন করুন');return;}if(isAdmin&&activeDataUid!==currentUser.uid){showToast('Admin হিসেবে অন্য ব্যবহারকারীর SMS পাঠানো বন্ধ');return;}const phone=(document.getElementById('sms-test-phone')?.value||'').replace(/[\s-]/g,''),message=(document.getElementById('sms-test-message')?.value||'').trim()||e24SmsDefaultMessage(e24SmsSelectedCustomer());if(!/^01[3-9]\d{8}$/.test(phone)){showToast('সঠিক ১১ সংখ্যার বাংলাদেশি নম্বর লিখুন');return;}if(!message){showToast('মেসেজ লিখুন');return;}const btn=send,smsId=id(),date=new Date().toLocaleString('bn-BD');btn.disabled=true;
try{const ref=e24Store.collection('users').doc(currentUser.uid).collection('data').doc('main');let next=0;await e24Store.runTransaction(async tx=>{const snap=await tx.get(ref),data=snap.exists?snap.data():{},bal=Number.isFinite(Number(data.smsWalletBalance))?Number(data.smsWalletBalance):0;if(bal<1)throw new Error('LOW_BALANCE');const hist=Array.isArray(data.smsHistory)?data.smsHistory:[];if(hist.some(x=>x.id===smsId))throw new Error('DUPLICATE');const ledger=Array.isArray(data.smsWalletTransactions)?data.smsWalletTransactions:[];next=Number((bal-1).toFixed(2));hist.push({id:smsId,phone,message:message.slice(0,500),status:'SUCCESS',date,mode:'TEST',cost:1});ledger.push({id:'SMS-'+smsId,type:'DEBIT',title:'Test SMS পাঠানো',amount:1,balanceAfter:next,date,mode:'TEST',referenceId:smsId});tx.set(ref,{...data,smsWalletBalance:next,smsHistory:hist.slice(-200),smsWalletTransactions:ledger.slice(-300),updatedAt:firebase.firestore.FieldValue.serverTimestamp()},{merge:true});});
db.smsWalletBalance=next;db.smsHistory=(db.smsHistory||[]).concat([{id:smsId,phone,message:message.slice(0,500),status:'SUCCESS',date,mode:'TEST',cost:1}]).slice(-200);db.smsWalletTransactions=(db.smsWalletTransactions||[]).concat([{id:'SMS-'+smsId,type:'DEBIT',title:'Test SMS পাঠানো',amount:1,balanceAfter:next,date,mode:'TEST',referenceId:smsId}]).slice(-300);renderSmsWallet();showToast('TEST MODE: Demo SMS সফল। ৳১ কাটা হয়েছে।');
}catch(err){showToast(err.message==='LOW_BALANCE'?'ওয়ালেটে পর্যাপ্ত ব্যালেন্স নেই':err.message==='DUPLICATE'?'এই SMS ইতিমধ্যে হিসাবভুক্ত হয়েছে।':'Test SMS সম্পন্ন হয়নি। কোনো টাকা কাটা হয়নি.');}finally{btn.disabled=false;}});
if(request)request.addEventListener('click',async()=>{if(!currentUser||!activeDataUid){showToast('আগে লগইন করুন');return;}if(isAdmin&&activeDataUid!==currentUser.uid){showToast('Recharge request দিতে নিজের অ্যাকাউন্ট নির্বাচন করুন');return;}const field=document.getElementById('sms-recharge-amount'),methodField=document.getElementById('sms-recharge-method'),trxField=document.getElementById('sms-recharge-trxid'),amount=Number(field?.value),paymentMethod=methodField?.value||'bKash',transactionId=(trxField?.value||'').trim().replace(/\s+/g,'').toUpperCase();if(!Number.isFinite(amount)||amount<10||amount>10000||Math.round(amount*100)!==amount*100){showToast('১০ থেকে ১০,০০০ টাকার মধ্যে সঠিক পরিমাণ লিখুন');return;}if(!transactionId||transactionId.length<5){showToast('সঠিক Transaction ID লিখুন');trxField?.focus();return;}const req={id:id(),amount:Number(amount.toFixed(2)),status:'PENDING',date:new Date().toLocaleString('bn-BD'),mode:'MANUAL',paymentMethod,receiverNumber:'01737537688',transactionId};request.disabled=true;
try{const ref=e24Store.collection('users').doc(currentUser.uid).collection('data').doc('main');await e24Store.runTransaction(async tx=>{const snap=await tx.get(ref),data=snap.exists?snap.data():{},list=Array.isArray(data.smsRechargeRequests)?data.smsRechargeRequests:[];if(list.some(x=>String(x.transactionId||'').toUpperCase()===transactionId))throw new Error('DUPLICATE_TRX');list.push(req);tx.set(ref,{...data,smsRechargeRequests:list.slice(-100),updatedAt:firebase.firestore.FieldValue.serverTimestamp()},{merge:true});});db.smsRechargeRequests=(db.smsRechargeRequests||[]).concat([req]);e24EnsureNotificationData();db.notificationMeta.rechargeStatusById[req.id]='PENDING';e24PersistNotificationState();field.value='';trxField.value='';renderSmsWallet();showToast('পেমেন্ট তথ্য জমা হয়েছে। টাকা যাচাই করে Admin অনুমোদন করবেন।');}catch(err){showToast(err.message==='DUPLICATE_TRX'?'এই Transaction ID দিয়ে আগে Request করা হয়েছে।':'Recharge Request পাঠানো যায়নি। আবার চেষ্টা করুন।');}finally{request.disabled=false;}});

/*
AUTO PAYMENT API — FUTURE INTEGRATION (DISABLED)
Use an approved bKash/Nagad merchant gateway when available.
Create payment sessions and verify signed callbacks/webhooks on a trusted backend.
Credit the wallet once only, using the provider payment ID as an idempotency key.
Keep all API credentials in backend Secrets, never in HTML, APK, or public GitHub.
This is a documented future integration point; it is intentionally not executable.
*/
if(adminList)adminList.addEventListener('click',async e=>{
 const button=e.target.closest('[data-sms-approve],[data-sms-cancel]');if(!button||!isAdmin)return;
 const isCancel=button.hasAttribute('data-sms-cancel');
 const action=isCancel?'cancel':'approve';
 const reqId=button.getAttribute(isCancel?'data-sms-cancel':'data-sms-approve');
 const ownerUid=button.getAttribute('data-sms-owner');
 if(!ownerUid||!reqId)return;
 if(isCancel&&!(await showAppConfirm('এই Recharge Request Cancel করবেন? এটি রেকর্ডে CANCELLED হিসেবে থাকবে এবং Wallet Balance-এ কোনো পরিবর্তন হবে না।','রিকোয়েস্ট Cancel করবেন?')))return;
 button.disabled=true;
 try{
  await e24AdminApi('/admin/recharge/action',{method:'POST',body:{uid:ownerUid,requestId:reqId,action}});
  if(activeDataUid===ownerUid)await e24LoadData(ownerUid);
  await e24RenderAdminRechargeRequests();
  showToast(isCancel?'Recharge Request Cancel করা হয়েছে। Wallet Balance অপরিবর্তিত আছে।':'Wallet Recharge অনুমোদিত হয়েছে।');
 }catch(err){
  console.error('Recharge request action failed:',err);
  showToast(err.message==='REQUEST_NOT_PENDING'?'রিকোয়েস্টটি আগেই অনুমোদিত বা Cancel করা হয়েছে।':'রিকোয়েস্টের কাজটি সম্পন্ন করা যায়নি। আবার চেষ্টা করুন।');
 }finally{button.disabled=false;}
});
}


/* E24 Gemini AI Support — general app guidance only; never send account/ledger data. */
const e24AiHistory=[];
function e24AiAddMessage(role,text){
 const list=document.getElementById('e24-ai-messages');if(!list)return;
 const item=document.createElement('div');item.className='e24-ai-msg '+(role==='user'?'user':'assistant');item.textContent=String(text||'');
 list.appendChild(item);list.scrollTop=list.scrollHeight;
}
let e24AiModalHistoryOpen=false;
function e24AiOpen(){
 if(!e24Auth.currentUser){showToast('AI Support ব্যবহার করতে আগে Login করুন');return;}
 const panel=document.getElementById('e24-ai-backdrop');if(!panel)return;
 panel.classList.add('show');panel.setAttribute('aria-hidden','false');
 if(!e24AiModalHistoryOpen){history.pushState({e24AiSupport:true},'');e24AiModalHistoryOpen=true;}
}
function e24AiClose(){
 const panel=document.getElementById('e24-ai-backdrop');if(!panel)return;
 panel.classList.remove('show');panel.setAttribute('aria-hidden','true');
 if(e24AiModalHistoryOpen){e24AiModalHistoryOpen=false;history.back();}
}
window.addEventListener('popstate',()=>{
 const panel=document.getElementById('e24-ai-backdrop');
 if(panel?.classList.contains('show')){
  panel.classList.remove('show');panel.setAttribute('aria-hidden','true');e24AiModalHistoryOpen=false;
 }
});
async function e24AiSend(prefill){
 const input=document.getElementById('e24-ai-input'),button=document.getElementById('e24-ai-send');
 const message=String(prefill??input?.value??'').trim();
 if(!message)return;
 if(message.length>1000){showToast('প্রশ্ন ১০০০ অক্ষরের মধ্যে লিখুন');return;}
 if(!e24Auth.currentUser){showToast('আগে Login করুন');return;}
 if(input)input.value='';
 const suggestions=document.getElementById('e24-ai-suggestions');if(suggestions)suggestions.hidden=true;
 e24AiAddMessage('user',message);
 const history=e24AiHistory.slice(-8);
 e24AiHistory.push({role:'user',text:message});
 if(button)button.disabled=true;
 const typing=document.createElement('div');typing.className='e24-ai-msg assistant';typing.textContent='উত্তর তৈরি হচ্ছে...';
 const list=document.getElementById('e24-ai-messages');list.appendChild(typing);list.scrollTop=list.scrollHeight;
 try{
  const token=await e24Auth.currentUser.getIdToken();
  const aiController=new AbortController();
  const aiTimeout=setTimeout(()=>aiController.abort(),70000);
  let response;
  try{response=await fetch(E24_AI_SUPPORT_API+'/ai-support',{method:'POST',headers:{'Authorization':'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({message,history}),signal:aiController.signal});}
  finally{clearTimeout(aiTimeout);}
  const result=await response.json().catch(()=>({}));
  if(!response.ok||result.success!==true)throw new Error(result.message||'AI উত্তর দিতে পারেনি।');
  typing.textContent=result.reply||'দুঃখিত, এই মুহূর্তে উত্তর পাওয়া যায়নি।';
  e24AiHistory.push({role:'model',text:typing.textContent});
  if(e24AiHistory.length>12)e24AiHistory.splice(0,e24AiHistory.length-12);
 }catch(error){
  typing.textContent=error.name==='AbortError'?'AI সার্ভার থেকে ৭০ সেকেন্ডেও উত্তর আসেনি। Worker ও Gemini API সেটিংস পরীক্ষা করুন।':(error.message||'সংযোগে সমস্যা হয়েছে। আবার চেষ্টা করুন।');
 }finally{
  if(button)button.disabled=false;
  list.scrollTop=list.scrollHeight;
 }
}
document.addEventListener('click',function(e){const trigger=e.target.closest('.e24-ai-trigger');if(trigger){e.preventDefault();e24AiOpen();}});
document.getElementById('e24-ai-close')?.addEventListener('click',e24AiClose);
function e24AiShowHistory(){
 const win=document.querySelector('.e24-ai-window'),view=document.getElementById('e24-ai-history-view'),items=document.getElementById('e24-ai-history-items');
 if(!win||!view||!items)return;
 items.textContent='';
 const rows=e24AiHistory.slice();
 if(!rows.length){const empty=document.createElement('div');empty.className='e24-ai-history-empty';empty.textContent='এখনো কোনো চ্যাট হিস্ট্রি নেই।';items.appendChild(empty);}
 rows.forEach(entry=>{const item=document.createElement('div');item.className='e24-ai-history-item '+(entry.role==='user'?'user':'assistant');const who=document.createElement('strong');who.textContent=entry.role==='user'?'আপনি':'E24 AI';const body=document.createElement('p');body.textContent=String(entry.text||'');item.append(who,body);items.appendChild(item);});
 win.classList.add('history-open');view.hidden=false;
}
function e24AiHideHistory(){document.querySelector('.e24-ai-window')?.classList.remove('history-open');const view=document.getElementById('e24-ai-history-view');if(view)view.hidden=true;}
document.getElementById('e24-ai-history')?.addEventListener('click',e24AiShowHistory);
document.getElementById('e24-ai-history-back')?.addEventListener('click',e24AiHideHistory);
document.getElementById('e24-ai-backdrop')?.addEventListener('click',e=>{if(e.target.id==='e24-ai-backdrop')e24AiClose();});
document.getElementById('e24-ai-send')?.addEventListener('click',()=>e24AiSend());
document.getElementById('e24-ai-input')?.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();e24AiSend();}});
document.getElementById('e24-ai-suggestions')?.addEventListener('click',e=>{const b=e.target.closest('.e24-ai-suggestion');if(b)e24AiSend(b.textContent);});

const e24BootStartedAt=performance.now();
document.addEventListener('DOMContentLoaded',e24SetupAuthUI);

    })();

// customerTotals is already exposed from the customer data scope.


  