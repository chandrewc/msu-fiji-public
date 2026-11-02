import Stripe from 'npm:stripe@23.0.0';
import { createClient } from 'npm:@supabase/supabase-js@2.99.1';
import { parseDonation, isTestKey } from '../_shared/donations.ts';
const SITE='https://www.msufiji.com';
const ORIGINS=new Set([SITE,'https://msufiji.com','https://chandrewc.github.io']);
const FUNDS={persistence:'Persistence Fund',parents:'Parents Fund'};
Deno.serve(async req=>{
 const origin=req.headers.get('origin')||'';
 const headers={'Access-Control-Allow-Origin':ORIGINS.has(origin)?origin:SITE,'Access-Control-Allow-Headers':'apikey, authorization, x-client-info, content-type','Access-Control-Allow-Methods':'POST, OPTIONS','Cache-Control':'no-store','Vary':'Origin','Content-Type':'application/json'};
 const reply=(body,status=200)=>new Response(JSON.stringify(body),{status,headers});
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
 if(req.method!=='POST')return reply({error:'Method not allowed.'},405);
 if(origin&&!ORIGINS.has(origin))return reply({error:'Origin not allowed.'},403);
 // This endpoint intentionally supports guests, using the public site's API key.
 if(req.headers.get('apikey')!=='sb_publishable_57LLRCD8y-LWGQ4yVTL7bg__HF20OFF')return reply({error:'Invalid website API key.'},401);
 try{
  const key=Deno.env.get('STRIPE_DONATIONS_TEST_KEY');
  const ready=isTestKey(key)&&!!Deno.env.get('STRIPE_DONATIONS_TEST_WEBHOOK_SECRET');
  const raw=await req.text();if(raw.length>3000)return reply({error:'Request is too large.'},400);
  let input;try{input=JSON.parse(raw)}catch{return reply({error:'Invalid donation request.'},400)}
  if(input?.action==='status')return reply({ready,mode:'test'});
  if(!ready)return reply({error:'Test checkout is being configured. Please check back soon.'},503);
  if(!Object.hasOwn(FUNDS,input?.fund))return reply({error:'Choose a chapter fund.'},400);
  let parsed;try{parsed=parseDonation(input)}catch(error){return reply({error:error.message},400)}
  const db=createClient(Deno.env.get('SUPABASE_URL'),Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),{auth:{persistSession:false,autoRefreshToken:false}});
  const existing=await db.from('stripe_donations').select('*').eq('id',parsed.requestId).maybeSingle();
  if(existing.error)throw Error('Donation lookup failed');
  if(existing.data&&(existing.data.member_id!==null||existing.data.fund!==input.fund||existing.data.amount_cents!==parsed.cents||existing.data.purpose!==parsed.purpose||existing.data.status!=='pending'))return reply({error:'Start a new donation before continuing.'},409);
  if(!existing.data){
   // Bound creation bursts without storing guest IP addresses or exposing donor data.
   const recent=await db.from('stripe_donations').select('id',{count:'exact',head:true}).is('member_id',null).gte('created_at',new Date(Date.now()-60000).toISOString());
   if(recent.error)throw Error('Availability check failed');
   if((recent.count||0)>=30)return reply({error:'Checkout is busy. Please try again in a minute.'},429);
   const added=await db.from('stripe_donations').insert({id:parsed.requestId,member_id:null,fund:input.fund,amount_cents:parsed.cents,currency:'usd',purpose:parsed.purpose,livemode:false});
   if(added.error&&added.error.code!=='23505')throw Error('Could not save donation');
  }
  const read=await db.from('stripe_donations').select('*').eq('id',parsed.requestId).single();const donation=read.data;
  if(read.error||!donation||donation.member_id!==null||donation.fund!==input.fund||donation.amount_cents!==parsed.cents||donation.purpose!==parsed.purpose||donation.status!=='pending')return reply({error:'Start a new donation before continuing.'},409);
  const stripe=new Stripe(key,{apiVersion:'2026-09-30.endive',maxNetworkRetries:2});
  const metadata={donation_id:donation.id,member_id:'public',fund:donation.fund};
  const session=donation.checkout_session_id?await stripe.checkout.sessions.retrieve(donation.checkout_session_id):await stripe.checkout.sessions.create({mode:'payment',submit_type:'donate',integration_identifier:'sigma_mu_public_giving_xprmtvqa',client_reference_id:donation.id,line_items:[{price_data:{currency:'usd',unit_amount:donation.amount_cents,product_data:{name:'Sigma Mu — '+FUNDS[donation.fund]}},quantity:1}],metadata,payment_intent_data:{metadata},success_url:SITE+'/giving.html?checkout_return=1',cancel_url:SITE+'/giving.html?cancelled=1'},{idempotencyKey:'public-donation-'+donation.id});
  if(session.livemode||session.status!=='open'||!session.url?.startsWith('https://checkout.stripe.com/'))return reply({error:'Test checkout is unavailable. Start a new donation.'},409);
  const saved=await db.from('stripe_donations').update({checkout_session_id:session.id}).eq('id',donation.id).is('member_id',null);if(saved.error)throw Error('Could not save checkout');
  return reply({url:session.url,mode:'test'});
 }catch{return reply({error:'Unable to open test checkout. Please try again later.'},502)}
});
