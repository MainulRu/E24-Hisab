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


window.e24SetupSettings=e24SetupSettings;
window.e24SaveProfile=e24SaveProfile;
window.e24ChangeEmail=e24ChangeEmail;
window.e24ResetPassword=e24ResetPassword;
window.e24ExportBackup=e24ExportBackup;
window.e24RestoreBackup=e24RestoreBackup;
