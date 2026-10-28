// Run with Node and Playwright available on NODE_PATH. Uses fixtures, never live writes.
const {chromium}=require('playwright');
const fs=require('node:fs');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
 const page=await browser.newPage();
 await page.setContent(fs.readFileSync('manager.html','utf8').replace(/<script[^>]*>[\s\S]*?<\/script>/g,''));
 const manager=fs.readFileSync('manager.js','utf8');
 const editor=manager.slice(manager.indexOf('function officerEditor('),manager.indexOf("for(const category of ['cabinet','executive'])$("));
 const helpers=manager.slice(manager.indexOf('function element('),manager.indexOf('async function upload('));
 await page.addScriptTag({content:helpers+`\nwindow.saved=[];window.fail=false;window.role='editor';const officers=[];
 function editable(){return window.role==='editor'}
 function status(message){document.getElementById('manager-status').textContent=message}
 async function loadOfficers(){}
 const db={
   from(){
     return {
       update(payload){window.saved.push(payload);return {eq:async()=>({error:window.fail?{message:'Save failed'}:null})}},
       insert:async payload=>{window.saved.push(payload);return {error:null}},
       delete(){return {eq:async()=>{window.deleted=true;return {error:null}}}}
     };
   }
 };

 `+editor+`\nwindow.renderEditor=(category,item)=>{const host=document.getElementById('executive-list');host.replaceChildren(officerEditor(item,category));document.getElementById('manager-app').hidden=false;document.getElementById('executive-panel').hidden=false;document.getElementById('cabinet-panel').hidden=true;};
 window.renderEditor('executive',{id:'fixture',position:'Service Chairman',name:'Chair Name',email:'chair@example.org',photo_url:'https://example.org/old.jpg',committee_members:['First Member']});`});
 const host=page.locator('#executive-list');
 assert.equal(await host.locator('input[type=file],input[type=url],img').count(),0);
 assert.equal(await host.locator('input[type=email]').inputValue(),'chair@example.org');
 await host.getByLabel('Member name',{exact:true}).fill('Updated Member');
 await host.getByRole('button',{name:'+ Add Committee Member',exact:true}).click();
 await host.getByLabel('Member name',{exact:true}).nth(1).fill('Second Member');
 await host.getByRole('button',{name:'Save Officer',exact:true}).click();
 assert.deepEqual(await page.evaluate(()=>saved[0].committee_members),['Updated Member','Second Member']);
 assert.equal(await page.evaluate(()=>saved[0].email),'chair@example.org');
 assert.equal(await page.evaluate(()=>Object.hasOwn(saved[0],'photo_url')),false);
 await host.getByRole('button',{name:'Remove Member',exact:true}).first().click();
 await host.getByRole('button',{name:'Save Officer',exact:true}).click();
 assert.deepEqual(await page.evaluate(()=>saved[1].committee_members),['Second Member']);
 await host.getByRole('button',{name:'+ Add Committee Member',exact:true}).click();
 await host.getByRole('button',{name:'Save Officer',exact:true}).click();
 assert.equal(await page.evaluate(()=>saved.length),2);
 await host.getByRole('button',{name:'Remove Member',exact:true}).last().click();
 await page.evaluate(()=>window.fail=true);
 await host.getByRole('button',{name:'Save Officer',exact:true}).click();
 assert.equal(await host.getByRole('button',{name:'Save Officer',exact:true}).isEnabled(),true);
 assert.match(await page.locator('#manager-status').innerText(),/Save failed/);
 page.on('dialog',dialog=>dialog.accept());
 await host.getByRole('button',{name:'Remove Position',exact:true}).click();
 assert.equal(await page.evaluate(()=>window.deleted),true);
 await page.evaluate(()=>renderEditor('executive',null));
 await host.getByLabel('Position',{exact:true}).fill('New Chairman');
 await host.getByLabel('Chairman / committee head name',{exact:true}).fill('New Chair');
 await host.getByRole('button',{name:'+ Add Committee Member',exact:true}).click();
 await host.getByLabel('Member name',{exact:true}).fill('New Member');
 await host.getByRole('button',{name:'Save Officer',exact:true}).click();
 assert.deepEqual(await page.evaluate(()=>saved.at(-1).committee_members),['New Member']);
 await page.evaluate(()=>renderEditor('executive',{id:'chaplins',position:'Chaplins',name:'',committee_members:['Member']}));
 assert.equal(await host.getByLabel('Committee only — no chair',{exact:true}).isChecked(),true);
 assert.equal(await host.getByLabel('Chairman / committee head name',{exact:true}).isVisible(),false);
 await host.getByRole('button',{name:'Save Officer',exact:true}).click();
 assert.equal(await page.evaluate(()=>saved.at(-1).name),'');
 assert.equal(await page.evaluate(()=>saved.at(-1).email),'');
 await page.evaluate(()=>{window.role='contributor';renderEditor('executive',{committee_members:['Member']})});
 assert.equal(await host.locator('input:enabled,button:enabled').count(),0);
 await page.evaluate(()=>{window.role='editor';renderEditor('cabinet',{name:'Cabinet Name',photo_url:'https://example.org/photo.jpg'})});
 assert.equal(await host.locator('input[type=file]').count(),1);
 assert.equal(await host.locator('input[type=email]').count(),1);
 assert.equal(await host.getByRole('button',{name:'+ Add Committee Member',exact:true}).count(),0);
 const publicCode=fs.readFileSync('chapter-data.js','utf8');
 const card=publicCode.slice(publicCode.indexOf('function el('),publicCode.indexOf('async function renderRecruitment'));
 await page.setContent('<main id="main"><section><div id="executive-profiles"></div></section></main>');
 await page.addScriptTag({content:"{\n"+card+`\nfunction safePhoto(url){try{const u=new URL(url);return u.protocol==='https:'?u.href:null}catch{return null}}
 const page='leadership';const fixtures=[{category:'executive',position:'Service Chairman',name:'Chair Name',email:'chair@example.org',photo_url:'https://example.org/old.jpg',committee_members:['<img src=x onerror=alert(1)>','Member Two']},{category:'executive',position:'Commissioner',name:'Commissioner Name',committee_members:[]},{category:'cabinet',name:'President Name',position:'President',photo_url:'https://example.org/president.jpg',email:'president@example.org'}];
 const db={from(){return {select(){return this},eq(){return this},order(){return this},then(resolve){resolve({data:fixtures,error:null})}}}};
 renderOfficers();\n}`});
 const executive=page.locator('.committee-card').filter({hasText:'Service Chairman'});
 assert.equal(await executive.locator('img').count(),0);
 assert.equal(await executive.locator('h3').innerText(),'Service Chairman');
 assert.equal(await executive.locator('li').count(),2);
 assert.equal(await executive.locator('a').getAttribute('href'),'mailto:chair@example.org');
 assert.equal(await page.locator('.chapter-officer-photo').count(),1);
 assert.equal(await page.locator('#executive-profiles').count(),0);
 await page.addStyleTag({content:fs.readFileSync('styles.css','utf8')});
 assert.equal(await page.locator('.executive-directory article').first().locator('h3').innerText(),'Commissioner');
 for(const width of [1280,768,390]){
   await page.setViewportSize({width,height:1000});
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
   const columns=await executive.evaluate(node=>getComputedStyle(node).gridTemplateColumns.split(' ').length);
   assert.equal(columns,width<=600?1:2);
 }
 console.log('PASS: committee add/edit/remove/create, validation, failure recovery, permissions, Cabinet fields, grouped public rendering and safe names.');
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exit(1)});
