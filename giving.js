const API='https://tzrmtdwsspobcbucwtrj.supabase.co/functions/v1/create-public-donation-checkout';
const key='sb_publishable_57LLRCD8y-LWGQ4yVTL7bg__HF20OFF';
const form=document.getElementById('giving-form'),button=document.getElementById('giving-submit'),status=document.getElementById('giving-status');
let ready=false,requestId=null,paymentMode=null;
async function invoke(body){const response=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json',apikey:key},body:JSON.stringify(body)});const data=await response.json();if(!response.ok)throw Error(data.error||'Checkout is unavailable. Please try again later.');return data}
function selectFund(){const fund=location.hash==='#give-parents'?'parents':location.hash==='#give-persistence'?'persistence':null;if(fund){form.elements.fund.value=fund;requestId=null;document.getElementById('give').scrollIntoView({behavior:'smooth'})}}
window.addEventListener('hashchange',selectFund);selectFund();
form.addEventListener('input',()=>requestId=null);
form.addEventListener('submit',async event=>{event.preventDefault();if(!ready)return;button.disabled=true;status.textContent=paymentMode==='live'?'Opening secure Stripe checkout…':'Opening Stripe test checkout…';try{requestId ||= crypto.randomUUID();const data=await invoke({fund:form.elements.fund.value,amount:form.elements.amount.value,purpose:form.elements.purpose.value,request_id:requestId,expected_mode:paymentMode});if(data.mode!==paymentMode)throw Error('Payment mode changed. Refresh this page before continuing.');const url=new URL(data.url);if(url.origin!=='https://checkout.stripe.com')throw Error('The checkout address could not be verified.');location.assign(url.href)}catch(error){status.textContent=error.message;button.disabled=!ready}});
try{
 const data=await invoke({action:'status'});paymentMode=['live','test'].includes(data.mode)?data.mode:null;
 ready=data.ready===true&&!!paymentMode;button.disabled=!ready;
 button.textContent=paymentMode==='test'?'Continue to test checkout':'Continue to secure checkout';
 document.getElementById('giving-mode-notice').textContent=paymentMode==='live'?'This is a real, one-time gift. Your payment details are entered securely on Stripe.':paymentMode==='test'?'Test mode: No real money is collected. Please do not enter real card details.':'Online giving is temporarily unavailable.';
 const params=new URLSearchParams(location.search);
 status.textContent=params.has('checkout_return')?'Thank you for supporting Sigma Mu. Returning from checkout does not confirm payment; Stripe provides your payment confirmation.':params.has('cancelled')?'Checkout was cancelled. You can try again whenever you’re ready.':ready?(paymentMode==='live'?'Choose a fund and amount to continue securely to Stripe.':'Test checkout is ready. No real money will be collected.'):'Online giving is being configured. Please check back soon.';
}catch{document.getElementById('giving-mode-notice').textContent='Online giving is temporarily unavailable.';status.textContent='Checkout is temporarily unavailable. Please try again later.'}
