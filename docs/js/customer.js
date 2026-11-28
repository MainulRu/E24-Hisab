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
      function allCustomerTotals() {
        return calculateBalances(validTransactions());
      }
      function selected() { return db.customers.find(c=>String(c.id)===String(db.selectedCustomerId)) || db.customers[0] || null; }
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
  