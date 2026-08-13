(function(){
 const CFG=window.ANDEY_CONFIG, STORAGE='andeyCompleteBookings', BLOCKS='andeyCompleteBlocks';
 const slots=Array.from({length:24},(_,i)=>{const n=8*60+i*30;let h=Math.floor(n/60),m=n%60,ap=h>=12?'PM':'AM';h=h%12||12;return `${h}:${String(m).padStart(2,'0')} ${ap}`});
 const load=k=>{try{return JSON.parse(localStorage.getItem(k)||'[]')}catch{return []}}, save=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
 function mins(t){const m=t.match(/(\d+):(\d+)\s*(AM|PM)/i);let h=+m[1]%12;if(m[3].toUpperCase()==='PM')h+=12;return h*60+(+m[2])}
 function durationMinutes(v){if(v==='30 minutes')return 30;if(v==='1 hour')return 60;const n=parseInt(v,10);return Number.isFinite(n)?n*60:60}
 const rangesOverlap=(a1,a2,b1,b2)=>a1<b2&&b1<a2;
 function friendlyError(err){
   const raw=String(err?.message||err||'').toLowerCase();
   if(raw.includes('bookings_no_overlap')||raw.includes('exclusion constraint'))return new Error('That time was just reserved by another family. Please choose another available time.');
   if(raw.includes('24 hours')||raw.includes('24-hour'))return new Error('This booking is within 24 hours of the start time. Please contact Andey directly for changes.');
   if(raw.includes('edge function returned')||raw.includes('failed to send a request'))return new Error('We could not open secure checkout. Please try again in a moment.');
   if(raw.includes('booking not found'))return new Error('We could not find that booking. Double-check your confirmation code and email.');
   return err instanceof Error?err:new Error('Something went wrong. Please try again.');
 }
 function demoSeed(){if(localStorage.getItem('andeyCompleteSeeded'))return;const d=new Date();d.setDate(d.getDate()+1);const date=d.toISOString().slice(0,10);save(STORAGE,[{id:crypto.randomUUID(),code:'ABS-DEMO1',service:'Private Swim Lesson',date,time:'10:00 AM',startMinute:600,endMinute:660,duration:'1 hour',parent:'Demo Family',phone:'(850) 555-0130',email:'demo@example.com',children:'1',ages:'6',location:'Seaside vacation rental',experience:'Working on freestyle.',special:'Demo booking for testing.',emergency:'Demo Contact',created:new Date().toISOString(),status:'Requested',paymentStatus:'Deposit Paid',amountTotal:CFG.prices.private60,amountPaid:CFG.prices.private60*CFG.depositPercent/100,paymentChoice:'deposit'}]);save(BLOCKS,[]);localStorage.setItem('andeyCompleteSeeded','1')}
 async function sb(){if(CFG.mode!=='supabase')return null;if(!window.supabase)throw new Error('Supabase library did not load.');return window.supabase.createClient(CFG.supabaseUrl,CFG.supabasePublishableKey)}
 async function listBusy(date){if(CFG.mode==='demo'){demoSeed();return [...load(STORAGE).filter(x=>x.date===date&&['Requested','Confirmed'].includes(x.status)).map(x=>({start_minute:x.startMinute,end_minute:x.endMinute})),...load(BLOCKS).filter(x=>x.date===date).map(x=>({start_minute:x.startMinute,end_minute:x.endMinute}))]};const c=await sb();const {data,error}=await c.rpc('get_busy_ranges',{p_date:date});if(error)throw friendlyError(error);return data||[]}
 async function createBooking(b){if(CFG.mode==='demo'){demoSeed();const all=load(STORAGE), busy=await listBusy(b.date);if(busy.some(r=>rangesOverlap(b.startMinute,b.endMinute,r.start_minute,r.end_minute)))throw new Error('That time is no longer available.');const x={...b,id:crypto.randomUUID(),created:new Date().toISOString(),status:'Requested'};all.push(x);save(STORAGE,all);return x}const c=await sb();const payload={code:b.code,service:b.service,booking_date:b.date,start_minute:b.startMinute,end_minute:b.endMinute,duration_label:b.duration,parent_name:b.parent,phone:b.phone,email:b.email,children_count:+b.children,ages:b.ages,location:b.location,experience:b.experience,special_notes:b.special,emergency_contact:b.emergency,status:'Requested',payment_status:'Unpaid',amount_total:0,amount_paid:0,payment_choice:b.paymentChoice,policy_accepted:b.policyAccepted};const {error}=await c.from('bookings').insert(payload);if(error)throw friendlyError(error);return {...b,status:'Requested',paymentStatus:'Unpaid'}}
 async function startPayment(booking){
  if(CFG.paymentMode==='demo')return {ok:true,checkoutUrl:null,simulated:true};
  if(CFG.mode!=='supabase')throw new Error('Live payments require Supabase mode.');
  const c=await sb();
  const {data,error}=await c.functions.invoke('create-checkout-section',{
    body:{bookingCode:booking.code,paymentChoice:booking.paymentChoice}
  });
  if(error)throw friendlyError(error);
  if(data?.error)throw friendlyError(new Error(data.error));
  if(!data?.url)throw new Error('Secure checkout did not return a payment link. Please try again.');
  return {ok:true,checkoutUrl:data.url,simulated:false};
}
 async function markDemoPaid(code,choice,total){if(CFG.mode==='supabase'){return {code,paymentStatus:choice==='full'?'Test Full Payment':'Test Deposit',amountPaid:0,simulated:true}}const all=load(STORAGE),x=all.find(v=>v.code===code);if(!x)throw new Error('Booking not found.');x.paymentStatus=choice==='full'?'Paid':'Deposit Paid';x.amountPaid=choice==='full'?total:Math.round(total*CFG.depositPercent)/100;save(STORAGE,all);return x}
 async function adminSignIn(email,password){if(CFG.mode==='demo')return {user:{email:'demo-admin@local.test'}};const c=await sb();const {data,error}=await c.auth.signInWithPassword({email,password});if(error)throw friendlyError(error);return data}
 async function listAdminBookings(){if(CFG.mode==='demo'){demoSeed();return load(STORAGE).sort((a,b)=>(a.date+String(a.startMinute).padStart(4,'0')).localeCompare(b.date+String(b.startMinute).padStart(4,'0')))}const c=await sb();const {data,error}=await c.from('bookings').select('*').order('booking_date').order('start_minute');if(error)throw error;return (data||[]).map(mapLive)}
 function mapLive(x){return {id:x.id,code:x.code,service:x.service,date:x.booking_date,time:minutesToTime(x.start_minute),startMinute:x.start_minute,endMinute:x.end_minute,duration:x.duration_label,parent:x.parent_name,phone:x.phone,email:x.email,children:String(x.children_count||''),ages:x.ages,location:x.location,experience:x.experience||'',special:x.special_notes||'',emergency:x.emergency_contact||'',created:x.created_at,status:x.status,paymentStatus:x.payment_status||'Unpaid',amountTotal:+x.amount_total||0,amountPaid:+x.amount_paid||0,paymentChoice:x.payment_choice||''}}
 async function updateStatus(id,status){if(CFG.mode==='demo'){const all=load(STORAGE),x=all.find(v=>v.id===id);if(x)x.status=status;save(STORAGE,all);return x}const c=await sb();const {data,error}=await c.from('bookings').update({status}).eq('id',id).select().single();if(error)throw friendlyError(error);return data}
 async function findBooking(code,email){if(CFG.mode==='demo'){demoSeed();return load(STORAGE).find(x=>x.code.toLowerCase()===code.trim().toLowerCase()&&x.email.toLowerCase()===email.trim().toLowerCase())||null}const c=await sb();const {data,error}=await c.rpc('lookup_booking',{p_code:code.trim(),p_email:email.trim()});if(error)throw error;return data?.[0]?mapLive(data[0]):null}
 async function customerCancel(code,email){if(CFG.mode==='demo'){const all=load(STORAGE),x=all.find(v=>v.code.toLowerCase()===code.toLowerCase()&&v.email.toLowerCase()===email.toLowerCase());if(!x)throw new Error('Booking not found.');x.status='Cancelled';save(STORAGE,all);return x}const c=await sb();const {data,error}=await c.rpc('customer_cancel_booking',{p_code:code,p_email:email});if(error)throw friendlyError(error);return data}
 async function customerReschedule(code,email,date,startMinute,endMinute,time,duration){if(CFG.mode==='demo'){const all=load(STORAGE),x=all.find(v=>v.code.toLowerCase()===code.toLowerCase()&&v.email.toLowerCase()===email.toLowerCase());if(!x)throw new Error('Booking not found.');const busy=[...load(STORAGE).filter(v=>v.id!==x.id&&v.date===date&&['Requested','Confirmed'].includes(v.status)).map(v=>({start_minute:v.startMinute,end_minute:v.endMinute})),...load(BLOCKS).filter(v=>v.date===date).map(v=>({start_minute:v.startMinute,end_minute:v.endMinute}))];if(busy.some(r=>rangesOverlap(startMinute,endMinute,r.start_minute,r.end_minute)))throw new Error('That new time is unavailable.');Object.assign(x,{date,startMinute,endMinute,time,duration,status:'Requested'});save(STORAGE,all);return x}const c=await sb();const {data,error}=await c.rpc('customer_reschedule_booking',{p_code:code,p_email:email,p_date:date,p_start:startMinute,p_end:endMinute,p_duration:duration});if(error)throw error;return data}
 async function listBlocks(){if(CFG.mode==='demo'){demoSeed();return load(BLOCKS)}const c=await sb();const {data,error}=await c.from('blocked_times').select('*').order('block_date').order('start_minute');if(error)throw error;return (data||[]).map(x=>({id:x.id,date:x.block_date,startMinute:x.start_minute,endMinute:x.end_minute,note:x.note||''}))}
 async function addBlock(b){if(CFG.mode==='demo'){const all=load(BLOCKS);all.push({...b,id:crypto.randomUUID()});save(BLOCKS,all);return}const c=await sb();const {error}=await c.from('blocked_times').insert({block_date:b.date,start_minute:b.startMinute,end_minute:b.endMinute,note:b.note});if(error)throw error}
 async function deleteBlock(id){if(CFG.mode==='demo'){save(BLOCKS,load(BLOCKS).filter(x=>x.id!==id));return}const c=await sb();const {error}=await c.from('blocked_times').delete().eq('id',id);if(error)throw error}
 function minutesToTime(n){let h=Math.floor(n/60),m=n%60,ap=h>=12?'PM':'AM';h=h%12||12;return `${h}:${String(m).padStart(2,'0')} ${ap}`}
 function priceFor(service,duration){
  const dm=durationMinutes(duration);
  if(service==='Private Swim — 30 Min')return CFG.prices.private30;
  if(service==='Private Swim — 60 Min')return CFG.prices.private60;
  if(service==='Two-Child Private Swim — 60 Min Split')return CFG.prices.doublePrivate60;
  if(service==='6-Lesson Package — 30 Min')return CFG.prices.package30;
  if(service==='6-Lesson Package — 60 Min')return CFG.prices.package60;
  if(service==='Babysitting / Vacation Childcare')return Math.round(CFG.prices.babysittingHourly*(dm/60)*100)/100;
  return 0
}
function isSwim(service){return service!=='Babysitting / Vacation Childcare'}
function serviceDurationOptions(service){
  if(service==='Private Swim — 30 Min'||service==='6-Lesson Package — 30 Min')return ['30 minutes'];
  if(service==='Private Swim — 60 Min'||service==='Two-Child Private Swim — 60 Min Split'||service==='6-Lesson Package — 60 Min')return ['1 hour'];
  if(service==='Babysitting / Vacation Childcare')return Array.from({length:9},(_,i)=>`${i+2} hours`);
  return []
}
function occupiedEnd(startMinute,duration){return startMinute+durationMinutes(duration)+(CFG.travelBufferMinutes||30)}

 function resetDemo(){localStorage.removeItem(STORAGE);localStorage.removeItem(BLOCKS);localStorage.removeItem('andeyCompleteSeeded');demoSeed()}

 async function sendBookingNotification(type,booking){
   if(CFG.mode==='demo')return {ok:true,simulated:true};
   const c=await sb();
   const {data,error}=await c.functions.invoke('booking-notifications',{
     body:{type,code:booking.code,email:booking.email}
   });
   if(error)throw friendlyError(error);
   if(data?.error)throw friendlyError(new Error(data.error));
   return data||{ok:true};
 }

 window.AndeyData={slots,mins,durationMinutes,rangesOverlap,friendlyError,listBusy,sendBookingNotification,createBooking,startPayment,markDemoPaid,adminSignIn,listAdminBookings,updateStatus,findBooking,customerCancel,customerReschedule,listBlocks,addBlock,deleteBlock,minutesToTime,priceFor,isSwim,serviceDurationOptions,occupiedEnd,resetDemo};
})();