let e24NotificationPollTimer=null;
function e24EnsureNotificationData(){
 if(!Array.isArray(window.db.notifications))window.db.notifications=[];
 if(!Array.isArray(window.db.notificationArchive))window.db.notificationArchive=[];
 if(!window.db.notificationMeta||typeof window.db.notificationMeta!=='object')window.db.notificationMeta={};
 if(!window.db.notificationMeta.rechargeStatusById||typeof window.db.notificationMeta.rechargeStatusById!=='object')window.db.notificationMeta.rechargeStatusById={};
 let migrated=false;
 if(window.db.notifications.length>35){const moved=window.db.notifications.splice(0,window.db.notifications.length-35);window.db.notificationArchive=window.db.notificationArchive.concat(moved);migrated=true;}
 if(migrated)e24PersistNotificationState();
}
function e24QueueNotification(notificationId,type,title,message,page,customerId){
 e24EnsureNotificationData();
 const key=String(notificationId||'');
 if(!key||window.db.notifications.some(x=>String(x.id)===key)||window.db.notificationArchive.some(x=>String(x.id)===key))return false;
 window.db.notifications.push({id:key,type:String(type||''),title:String(title||''),message:String(message||''),page:String(page||'1'),customerId:customerId==null?null:String(customerId),createdAt:Date.now(),read:false});
 if(window.db.notifications.length>35){const moved=window.db.notifications.splice(0,window.db.notifications.length-35);window.db.notificationArchive=window.db.notificationArchive.concat(moved);}
 return true;
}
function e24PersistNotificationState(){
 if(!window.E24NotificationContext.currentUser||!window.E24NotificationContext.activeDataUid)return Promise.resolve();
 const ref=window.E24NotificationContext.store.collection('users').doc(window.E24NotificationContext.activeDataUid).collection('data').doc('main');
 return ref.set({notifications:window.db.notifications||[],notificationMeta:window.db.notificationMeta||{},updatedAt:window.firebase.firestore.FieldValue.serverTimestamp()},{merge:true}).catch(err=>console.error('Notification save failed:',err));
}
function e24ProcessLoadedNotifications(uid){
 e24EnsureNotificationData();
 let changed=false;
 const now=new Date(),dayKey=now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0')+'-'+String(now.getDate()).padStart(2,'0');
 (window.db.customers||[]).forEach(customer=>{
  const due=Number(window.customerTotals(customer.id).due)||0,reminderId='due-reminder-'+String(customer.id)+'-'+dayKey;
  const reminder=[...window.db.notifications,...(window.db.notificationArchive||[])].find(x=>String(x.id)===reminderId);
  if(due>0){
   const amount=due.toLocaleString('bn-BD',{maximumFractionDigits:0}),message=String(customer.name||'গ্রাহক')+' সাহেবের ৳'+amount+' বকেয়া রয়েছে।';
   if(reminder){if(reminder.message!==message){reminder.message=message;reminder.createdAt=Date.now();changed=true;}}
   else if(e24QueueNotification(reminderId,'due-reminder','বকেয়া পরিশোধের স্মরণ',message,'3',customer.id))changed=true;
  }else if(reminder&&!reminder.read){reminder.read=true;changed=true;}
 });
 const statusMap=window.db.notificationMeta.rechargeStatusById;
 (window.db.smsRechargeRequests||[]).forEach(request=>{
  if(!request||!request.id)return;
  const requestId=String(request.id),status=String(request.status||'PENDING').toUpperCase(),previous=String(statusMap[requestId]||'').toUpperCase();
  if(previous==='PENDING'&&(status==='APPROVED'||status==='CANCELLED')){
   const approved=status==='APPROVED';
   if(e24QueueNotification('recharge-status-'+requestId,approved?'recharge-approved':'recharge-cancelled','SMS Wallet Recharge',approved?'আপনার Recharge Request অনুমোদিত হয়েছে।':'আপনার Recharge Request বাতিল করা হয়েছে।','8'))changed=true;
  }
  if(previous!==status){statusMap[requestId]=status;changed=true;}
 });
 if(changed)e24PersistNotificationState();
 e24RenderNotifications();
}
function e24NotificationEscape(value){
 return String(value==null?'':value).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
}
let e24NotificationArchiveView=false;
function e24RenderNotifications(){
 const panel=document.getElementById('e24-notification-panel'),list=document.getElementById('e24-notification-list'),badge=document.getElementById('e24-notification-count');
 if(!window.db)return;
 e24EnsureNotificationData();
 const unread=window.db.notifications.filter(x=>!x.read).length,archiveUnread=window.db.notificationArchive.filter(x=>!x.read).length,archiveCount=window.db.notificationArchive.length;
 if(badge){badge.textContent=unread>99?'99+':String(unread);badge.hidden=unread===0;}
 if(!panel||!list)return;
 const rows=(e24NotificationArchiveView?window.db.notificationArchive:window.db.notifications).slice().sort((a,b)=>(Number(b.createdAt)||0)-(Number(a.createdAt)||0));
 const heading=document.getElementById('e24-notification-heading'),archiveButton=document.getElementById('e24-notification-archive');
 if(heading)heading.textContent=e24NotificationArchiveView?'নোটিফিকেশন আর্কাইভ':'নোটিফিকেশন';
 if(archiveButton){archiveButton.textContent=e24NotificationArchiveView?'সর্বশেষ ৩৫টি':'আর্কাইভ ('+archiveCount+')';archiveButton.classList.toggle('active',e24NotificationArchiveView);}
 list.innerHTML=rows.length?rows.map(item=>{
  const time=Number(item.createdAt)?new Date(Number(item.createdAt)).toLocaleString('bn-BD',{day:'numeric',month:'short',hour:'numeric',minute:'2-digit'}):'';
  return '<button type="button" class="e24-notification-item '+(item.read?'':'unread')+'" data-e24-notification-id="'+e24NotificationEscape(item.id)+'"><span class="e24-notification-title">'+e24NotificationEscape(item.title)+'</span><span class="e24-notification-message">'+e24NotificationEscape(item.message)+'</span><span class="e24-notification-time">'+e24NotificationEscape(time)+'</span></button>';
 }).join(''):'<div class="e24-notification-empty">'+(e24NotificationArchiveView?'আর্কাইভে কোনো Notification নেই।':'এখনো কোনো Notification নেই।')+'</div>';
 list.querySelectorAll('[data-e24-notification-id]').forEach(button=>{
  button.addEventListener('click',event=>{
   event.preventDefault();event.stopPropagation();
   const key=button.getAttribute('data-e24-notification-id');
   const item=[...(window.db.notifications||[]),...(window.db.notificationArchive||[])].find(x=>String(x.id)===key);
   e24OpenNotification(item);
  });
 });
 const readAll=document.getElementById('e24-notification-read-all');if(readAll)readAll.disabled=unread+archiveUnread===0;
}
window.e24RenderNotifications=e24RenderNotifications;
function e24CloseNotificationPanel(){
 const panel=document.getElementById('e24-notification-panel');
 if(panel){panel.classList.remove('show');panel.setAttribute('aria-hidden','true');}
}
function e24ToggleNotificationPanel(){
 const panel=document.getElementById('e24-notification-panel');if(!panel)return;
 e24RenderNotifications();
 const show=!panel.classList.contains('show');
 panel.classList.toggle('show',show);panel.setAttribute('aria-hidden',show?'false':'true');
}
function e24OpenNotification(item){
 if(!item)return;
 item.read=true;e24CloseNotificationPanel();e24RenderNotifications();e24PersistNotificationState();
 if(item.customerId){
  window.db.selectedCustomerId=item.customerId;
  if(typeof window.renderLedger==='function')window.renderLedger();
  if(typeof window.switchPage==='function')window.switchPage('3');
  else console.error('Notification open failed: switchPage is unavailable');
  return;
 }
 const page=String(item.page||'1');
 if(typeof window.switchPage!=='function'){console.error('Notification open failed: switchPage is unavailable');return;}
 window.switchPage(page);
 if(page==='8'){
  const settings=[...document.querySelectorAll('#page-8 details.e24-settings-card')].find(x=>x.querySelector('#sms-recharge-request'));
  if(settings)settings.open=true;
 }
}
document.addEventListener('click',event=>{
 const bell=event.target.closest('#e24-notification-bell');
 if(bell){event.preventDefault();event.stopPropagation();e24ToggleNotificationPanel();return;}
 const archiveButton=event.target.closest('#e24-notification-archive');
 if(archiveButton){e24NotificationArchiveView=!e24NotificationArchiveView;e24RenderNotifications();return;}
 const readAll=event.target.closest('#e24-notification-read-all');
 if(readAll){e24EnsureNotificationData();window.db.notifications.forEach(x=>x.read=true);window.db.notificationArchive.forEach(x=>x.read=true);e24PersistNotificationState();e24RenderNotifications();return;}
 if(!event.target.closest('#e24-notification-panel'))e24CloseNotificationPanel();
});
async function e24CheckRechargeStatusFromCloud(){
 if(!window.E24NotificationContext.currentUser||!window.E24NotificationContext.activeDataUid)return;
 try{
  const ref=window.E24NotificationContext.store.collection('users').doc(window.E24NotificationContext.activeDataUid).collection('data').doc('main'),snap=await ref.get();
  if(!snap.exists)return;
  const remote=snap.data()||{},latest=Array.isArray(remote.smsRechargeRequests)?remote.smsRechargeRequests:[];
  e24EnsureNotificationData();
  let changed=false;
  latest.forEach(request=>{
   if(!request||!request.id)return;
   const id=String(request.id),status=String(request.status||'PENDING').toUpperCase(),previous=String(window.db.notificationMeta.rechargeStatusById[id]||'').toUpperCase();
   if(previous==='PENDING'&&(status==='APPROVED'||status==='CANCELLED')){
    const approved=status==='APPROVED';
    if(e24QueueNotification('recharge-status-'+id,approved?'recharge-approved':'recharge-cancelled','SMS Wallet Recharge',approved?'আপনার Recharge Request অনুমোদিত হয়েছে।':'আপনার Recharge Request বাতিল করা হয়েছে।','8'))changed=true;
   }
   if(previous!==status){window.db.notificationMeta.rechargeStatusById[id]=status;changed=true;}
  });
  window.db.smsRechargeRequests=latest;
  if(changed){await e24PersistNotificationState();e24RenderNotifications();}
 }catch(err){console.error('Recharge notification sync failed:',err);}
}
function e24TrackNewRechargeRequests(requests){
 e24EnsureNotificationData();
 const meta=window.db.notificationMeta;
 if(!Array.isArray(meta.knownRechargeRequestIds)){
  meta.knownRechargeRequestIds=(requests||[]).map(x=>String(x.id)).filter(Boolean).slice(-200);
  e24PersistNotificationState();return;
 }
 let changed=false;
 (requests||[]).forEach(request=>{
  const requestId=String(request&&request.id||'');if(!requestId||meta.knownRechargeRequestIds.includes(requestId))return;
  meta.knownRechargeRequestIds.push(requestId);
  if(e24QueueNotification('new-recharge-'+requestId,'new-recharge-request','নতুন Recharge Request',window.e24Money(request.amount)+' রিচার্জের নতুন Request এসেছে।','8'))changed=true;
  changed=true;
 });
 meta.knownRechargeRequestIds=meta.knownRechargeRequestIds.slice(-200);
 if(changed){e24PersistNotificationState();e24RenderNotifications();}
}
function e24StartNotificationPolling(){
 if(e24NotificationPollTimer)clearInterval(e24NotificationPollTimer);
 e24NotificationPollTimer=setInterval(()=>{
  if(!window.E24NotificationContext.currentUser||!window.E24NotificationContext.activeDataUid)return;
  e24CheckRechargeStatusFromCloud();
  if(window.E24NotificationContext.isAdmin)window.e24RenderAdminRechargeRequests();
 },30000);
}

