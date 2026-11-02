const {chromium}=require('playwright');
const fs=require('node:fs');
const assert=require('node:assert/strict');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const scripts=read('script.js').split('/* Published content')[0];
const withoutScripts=html=>html.replace(/<script[^>]*>[\s\S]*?<\/script>/g,'').replace(/<link[^>]+>/g,'');
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
 const page=await browser.newPage();page.on('pageerror',e=>console.error('PAGE ERROR',e.message));
 await page.route('**/*',route=>route.fulfill({status:200,contentType:'text/html',body:'<!doctype html>'}));
 await page.goto('https://fixture.test/');
 for(const width of [1440,1024,390]){
  await page.setViewportSize({width,height:1000});
  await page.setContent(withoutScripts(read('giving.html')));await page.addStyleTag({content:read('styles.css')});await page.addScriptTag({content:"(()=>{"+scripts+"})()"});
  assert.equal(await page.locator('.fund-card').count(),2);assert.equal(await page.locator('#site-nav a[href="giving.html"]').count(),1);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'No horizontal overflow '+width);
  if(width===1440)await page.screenshot({path:'/private/tmp/fiji-giving-desktop.png',fullPage:true});
  if(width===390)await page.screenshot({path:'/private/tmp/fiji-giving-mobile.png',fullPage:true});
 }
 await page.evaluate(()=>{window.requests=[];window.fetch=async(url,opts)=>{const body=JSON.parse(opts.body);requests.push(body);return {ok:body.action==='status',json:async()=>body.action==='status'?{ready:true,mode:'test'}:{error:'Fixture checkout error'}}}});
 await page.addScriptTag({content:'(async()=>{'+read('giving.js')+'})()'});
 await page.waitForFunction(()=>!document.getElementById('giving-submit').disabled);
 await page.getByRole('link',{name:'Give to the Parents Fund',exact:true}).click();
 await page.waitForFunction(()=>document.getElementById('giving-fund').value==='parents');assert.equal(await page.locator('#giving-fund').inputValue(),'parents');
 await page.locator('[name="amount"]').fill('25.01');await page.locator('#giving-submit').click();
 await page.waitForFunction(()=>document.getElementById('giving-status').textContent==='Fixture checkout error');
 assert.equal(await page.evaluate(()=>requests.at(-1).fund),'parents');assert.equal(await page.evaluate(()=>requests.at(-1).amount),'25.01');
 // Alumni rendering and safe plain-text story; no feature placeholders once saved.
 await page.setContent(withoutScripts(read('alumni-spotlight.html')));await page.addStyleTag({content:read('styles.css')});await page.addScriptTag({content:"(()=>{"+scripts+"})()"});
 const chapter=read('chapter-data.js');const render=chapter.slice(chapter.indexOf('async function renderAlumniSpotlight()'),chapter.indexOf('renderAlumniSpotlight().catch'));
 await page.addScriptTag({content:`const page='alumni-spotlight';function el(tag,cls='',value){const n=document.createElement(tag);n.className=cls;if(value!==undefined)n.textContent=value;return n}function safePhoto(u){try{return new URL(u).protocol==='https:'?u:null}catch{return null}}const db={from(){return {select(){return this},eq(){return this},maybeSingle:async()=>({data:{value:{name:'Fixture Alumnus',class_year:'2000',headline:'A lifetime of service',description:'First paragraph.\\n\\n<script>unsafe</scr'+'ipt>',photo_url:'https://fixture.test/photo.png'}}})}}};`+render});
 await page.evaluate(()=>renderAlumniSpotlight());assert.equal(await page.locator('.alumni-copy h2').textContent(),'Fixture Alumnus');assert.equal(await page.locator('.alumni-portrait').count(),1);assert.equal(await page.locator('.alumni-story').count(),2);assert.equal(await page.locator('.alumni-copy script').count(),0);
 for(const width of [1440,390]){await page.setViewportSize({width,height:1000});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true)}
 // Full manager handlers with an in-memory settings fixture, no live writes.
 const managerPage=await browser.newPage();await managerPage.route('**/*',route=>route.fulfill({status:200,body:''}));await managerPage.goto('https://fixture.test/manager');
 await managerPage.setContent(withoutScripts(read('manager.html')));await managerPage.addStyleTag({content:read('manager.css')});
 let manager=read('manager.js').replace(/^import.*\n/,'').replace(/^const db=.*\n/m,'const db=window.mockDB;\n').replace('\ninit();','');
 await managerPage.evaluate(()=>{window.saved=[];window.failSave=false;window.mockDB={from(){return {select(){return this},eq(){return this},maybeSingle:async()=>({data:{value:{name:'Existing Alumnus',class_year:'1999',photo_url:'https://fixture.test/existing.png'}}}),upsert:async payload=>{if(window.failSave)return {error:{message:'Fixture failure'}};saved.push(payload);return {}}}}}});
 await managerPage.addScriptTag({content:manager+"\nrole='editor';document.getElementById('manager-app').hidden=false;showPanel('alumni');"});
 await managerPage.waitForFunction(()=>document.querySelector('#alumni-form [name=name]').value==='Existing Alumnus');
 await managerPage.locator('#alumni-form [name=name]').fill('Updated Alumnus');await managerPage.locator('#alumni-form [name=description]').fill('Updated story');await managerPage.getByRole('button',{name:'Save Alumni Spotlight',exact:true}).click();
 assert.equal(await managerPage.evaluate(()=>saved[0].key),'alumni_spotlight');assert.equal(await managerPage.evaluate(()=>saved[0].value.description),'Updated story');
 await managerPage.evaluate(()=>{window.failSave=true});await managerPage.getByRole('button',{name:'Save Alumni Spotlight',exact:true}).click();assert.match(await managerPage.locator('#manager-status').textContent(),/Unable to save/);
 await managerPage.evaluate(()=>{role='contributor';loadAlumniSpotlight()});await managerPage.waitForFunction(()=>document.querySelector('#alumni-form button').disabled);assert.equal(await managerPage.locator('#alumni-photo').isDisabled(),true);
 console.log('Passed Giving fund selection, error handling, responsive layouts, safe alumni rendering, editor save/failure, and contributor restrictions.');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
