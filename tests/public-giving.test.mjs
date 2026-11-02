import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import {parseDonation,isTestKey} from '../supabase/functions/_shared/donations.ts';
const id='310f2c02-6386-4d28-8b15-6af93763f855';
const apiKey='sb_publishable_57LLRCD8y-LWGQ4yVTL7bg__HF20OFF';
async function fixture(options={}){
 let handler,record=options.record||null;const calls=[];
 const db={from(){return {select(){return this},eq(){return this},is(){return this},gte:async()=>({count:options.busy?30:0}),maybeSingle:async()=>({data:record}),single:async()=>({data:record}),insert:async value=>{record={...value,status:'pending'};return {}},update(value){calls.push({update:value});return this},then(resolve){resolve({})}}}};
 class Stripe{constructor(){this.checkout={sessions:{create:async(params,opts)=>{calls.push({params,opts});return {id:'cs_test_fixture',url:'https://checkout.stripe.com/c/pay/test_fixture',status:'open',livemode:!!options.liveSession}},retrieve:async()=>({id:'cs_test_fixture',url:'https://checkout.stripe.com/c/pay/test_fixture',status:'open',livemode:false})}}}}
 const context={Request,Response,Set,Error,Date,Object,JSON,Stripe,createClient:()=>db,parseDonation,isTestKey,Deno:{serve:fn=>handler=fn,env:{get:name=>({STRIPE_DONATIONS_TEST_KEY:options.liveKey?'sk_live_fixture':'sk_test_fixture',STRIPE_DONATIONS_TEST_WEBHOOK_SECRET:'whsec_fixture'})[name]}}};
 vm.createContext(context);vm.runInContext((await fs.readFile(new URL('../supabase/functions/create-public-donation-checkout/index.ts',import.meta.url),'utf8')).replace(/^import .*;\n/gm,''),context);
 return {handler,calls,get record(){return record}};
}
function request(body,headers={}){return new Request('https://example.test/checkout',{method:'POST',headers:{origin:'https://www.msufiji.com',apikey:apiKey,...headers},body:JSON.stringify(body)})}
const input={fund:'parents',amount:'25.01',purpose:'For member programs',request_id:id};
test('guest checkout tags the correct fund, exact amount, test mode and idempotency',async()=>{const f=await fixture();const response=await f.handler(request(input));assert.equal(response.status,200);assert.equal((await response.json()).mode,'test');const {params,opts}=f.calls[0];assert.equal(params.metadata.fund,'parents');assert.equal(params.metadata.member_id,'public');assert.equal(params.line_items[0].price_data.unit_amount,2501);assert.equal(params.line_items[0].price_data.product_data.name,'Sigma Mu — Parents Fund');assert.equal(params.mode,'payment');assert.equal(params.payment_method_types,undefined);assert.equal(opts.idempotencyKey,'public-donation-'+id);assert.equal(f.record.member_id,null);assert.equal(f.record.fund,'parents')});
test('rejects unsupported fund and invalid cents before any write',async()=>{for(const body of [{...input,fund:'unknown'},{...input,amount:'1.001'}]){const f=await fixture();assert.equal((await f.handler(request(body))).status,400);assert.equal(f.record,null)}});
test('requires website key, rejects other origins and live credentials',async()=>{const f=await fixture();assert.equal((await f.handler(request(input,{apikey:'wrong'}))).status,401);assert.equal((await f.handler(request(input,{origin:'https://other.test'}))).status,403);const live=await fixture({liveKey:true});assert.equal((await live.handler(request(input))).status,503);assert.equal(live.record,null)});
test('rejects mismatched reuse, creation bursts and live sessions',async()=>{const f=await fixture({record:{id,member_id:'another-member'}});assert.equal((await f.handler(request(input))).status,409);const busy=await fixture({busy:true});assert.equal((await busy.handler(request(input))).status,429);const live=await fixture({liveSession:true});assert.equal((await live.handler(request(input))).status,409)});
