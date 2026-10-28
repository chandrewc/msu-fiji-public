import{createClient}from'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
const db=createClient('https://tzrmtdwsspobcbucwtrj.supabase.co','sb_publishable_57LLRCD8y-LWGQ4yVTL7bg__HF20OFF');
const $=id=>document.getElementById(id);let role='',officers=[],recruitment={};
function status(message){$('manager-status').textContent=message}
function editable(){return role==='editor'||role==='super_admin'}
function element(tag,cls='',text){const el=document.createElement(tag);if(cls)el.className=cls;if(text!==undefined)el.textContent=text;return el}
function field(label,value='',type='text'){const wrap=element('label','',label);const input=element('input');input.type=type;input.value=value||'';wrap.append(input);return [wrap,input]}
async function upload(file,title){if(!file||!file.type.startsWith('image/'))throw Error('Select an image');if(file.size>40*1024*1024)throw Error('Image must be under 40 MB');const bmp=await createImageBitmap(file);let blob;try{const scale=Math.min(1,1920/Math.max(bmp.width,bmp.height));const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bmp.width*scale));canvas.height=Math.max(1,Math.round(bmp.height*scale));const ctx=canvas.getContext('2d');ctx.drawImage(bmp,0,0,canvas.width,canvas.height);blob=await new Promise((resolve,reject)=>canvas.toBlob(x=>x?resolve(x):reject(Error('Could not process photo')),'image/webp',.8))}finally{bmp.close()}const path=crypto.randomUUID()+'.webp';const{error}=await db.storage.from('sigma-mu-site').upload(path,blob,{contentType:'image/webp'});if(error)throw error;const url=db.storage.from('sigma-mu-site').getPublicUrl(path).data.publicUrl;const{error:mediaError}=await db.from('site_media').insert({title:title||file.name,url});if(mediaError)status('Photo uploaded, but the media library entry could not be saved: '+mediaError.message);return url}
async function init(){const{data:{user},error:authError}=await db.auth.getUser();if(authError||!user){role='';$('manager-app').hidden=true;$('manager-login').hidden=false;status('Sign in to access Website Manager.');return}const{data,error}=await db.from('site_permissions').select('role').eq('user_id',user.id).maybeSingle();if(error||!data){role='';$('manager-app').hidden=true;$('manager-login').hidden=false;status('This account does not have Website Manager permissions.');return}role=data.role;$('manager-login').hidden=true;$('manager-app').hidden=false;$('manager-session-email').textContent=user.email||'';showPanel('cabinet');status(editable()?'Signed in. Changes you save will appear on the public website.':'Signed in as Contributor. Editing requires Editor permissions.');await Promise.all([loadOfficers(),loadRecruitment(),loadIfc(),loadSpotlight(),loadSiteImages(),loadPhilanthropy(),loadImpact(),loadContact()])}
$('manager-login-form').addEventListener('submit',async e=>{e.preventDefault();const button=e.currentTarget.querySelector('button');button.disabled=true;status('Signing in…');try{const{error}=await db.auth.signInWithPassword({email:$('manager-email').value.trim(),password:$('manager-password').value});if(error)throw error;$('manager-password').value='';await init()}catch(err){status('Sign in failed: '+err.message)}finally{button.disabled=false}});
$('manager-signout').addEventListener('click',async()=>{await db.auth.signOut();role='';$('manager-app').hidden=true;$('manager-login').hidden=false;status('Signed out. Sign in to access Website Manager.')});
function showPanel(name){for(const btn of document.querySelectorAll('[data-panel]')){const selected=btn.dataset.panel===name;btn.classList.toggle('active',selected);btn.setAttribute('aria-selected',String(selected))}for(const panel of document.querySelectorAll('.manager-panel')){const selected=panel.id===name+'-panel';panel.hidden=!selected;panel.style.display=selected?'block':'none'}if(name==='media')loadMedia();if(name==='images')loadSiteImages();if(name==='ifc')loadIfc();if(name==='philanthropy')loadPhilanthropy();if(name==='spotlight')loadSpotlight()}
document.querySelectorAll('[data-panel]').forEach(btn=>btn.addEventListener('click',()=>showPanel(btn.dataset.panel)));
async function loadOfficers(){const{data,error}=await db.from('chapter_officers').select('*').order('display_order').order('position');if(error)return status('Unable to load officers: '+error.message);officers=data||[];for(const category of ['cabinet','executive'])drawOfficers(category)}
function drawOfficers(category){const host=$(category+'-list');host.replaceChildren();for(const item of officers.filter(o=>o.category===category))host.append(officerEditor(item,category));if(!host.childNodes.length)host.append(element('p','manager-note','No positions yet. Add one below.'));$(category+'-add').disabled=!editable()}
function officerEditor(item,category){
  const cabinet=category==='cabinet';
  const card=element('article','manager-entry');
  const head=element('div','manager-entry-head');
  head.append(element('h3','',item?.position||'New position'));card.append(head);
  const grid=element('div','manager-fields');
  const [posLabel,pos]=field('Position',item?.position);
  const [nameLabel,name]=field(cabinet?'Brother name':'Chairman / committee head name',item?.name);
  const [orderLabel,order]=field('Display order',String(item?.display_order??(officers.filter(x=>x.category===category).length+1)*10),'number');
  const [emailLabel,email]=field('Chair email(s) (optional)',item?.email||'','email');
  email.multiple=true;email.placeholder='first@example.com, second@example.com';
  emailLabel.append(element('small','manager-note','Separate addresses with commas, semicolons, or “and”.'));
  for(const label of [posLabel,nameLabel,orderLabel,emailLabel])grid.append(label);
  card.append(grid);
  let committeeOnly;
  if(!cabinet){
    const option=element('label','committee-only-option');committeeOnly=element('input');committeeOnly.type='checkbox';committeeOnly.checked=!!item&&!item.name;committeeOnly.disabled=!editable();
    option.append(committeeOnly,document.createTextNode('Committee only — no chair'));card.insertBefore(option,grid);
    const updateChairFields=()=>{nameLabel.hidden=committeeOnly.checked;emailLabel.hidden=committeeOnly.checked};committeeOnly.onchange=updateChairFields;updateChairFields();
  }
  let photo;
  if(cabinet){
    const [photoLabel,photoInput]=field('Photo URL',item?.photo_url,'url');photo=photoInput;grid.append(photoLabel);
    const preview=element('img','manager-preview');preview.alt='Officer portrait';preview.hidden=!item?.photo_url;if(item?.photo_url)preview.src=item.photo_url;card.append(preview);
    photo.addEventListener('input',()=>{preview.hidden=!photo.value;if(photo.value)preview.src=photo.value});
    const uploadLabel=element('label','upload','Upload officer photo');const file=element('input');file.type='file';file.accept='image/png,image/jpeg,image/webp';file.disabled=!editable();
    file.onchange=async()=>{if(!editable()||!file.files?.[0])return;file.disabled=true;try{status('Uploading officer photo…');photo.value=await upload(file.files[0],name.value||pos.value);preview.src=photo.value;preview.hidden=false;status('Photo uploaded. Save this officer to publish it.')}catch(e){status('Upload failed: '+e.message)}finally{file.disabled=!editable()}};
    uploadLabel.append(file);card.append(uploadLabel);
  }
  const members=element('div','committee-members');
  if(!cabinet){
    card.append(element('h4','','Committee members'),element('p','manager-note','Names only. Add, edit, or remove members below, then Save Officer to publish.'),members);
    const addMemberRow=value=>{
      const row=element('div','committee-member-row');const [label,input]=field('Member name',value);input.disabled=!editable();
      const remove=element('button','danger','Remove Member');remove.type='button';remove.disabled=!editable();remove.onclick=()=>{if(editable())row.remove()};row.append(label,remove);members.append(row);
    };
    for(const member of item?.committee_members||[])addMemberRow(member);
    const add=element('button','secondary','+ Add Committee Member');add.type='button';add.disabled=!editable();add.onclick=()=>{if(editable())addMemberRow('')};card.append(add);
  }
  grid.querySelectorAll('input').forEach(input=>input.disabled=!editable());
  const actions=element('div','manager-actions');const save=element('button','','Save Officer');save.type='button';save.disabled=!editable();
  save.onclick=async()=>{
    if(!editable())return;
    if(!pos.value.trim()||(!committeeOnly?.checked&&!name.value.trim()))return status('Enter a position and brother name, or select Committee only.');
    const addresses=[...new Set(email.value.trim().split(/\s+and\s+|[,;\s]+/i).filter(Boolean))];
    email.value=addresses.join(', ');
    if(!committeeOnly?.checked&&!email.checkValidity())return status('Enter valid email addresses separated by commas, or leave the field blank.');
    const memberNames=[...members.querySelectorAll('input')].map(input=>input.value.trim());
    if(memberNames.some(value=>!value))return status('Enter a name for each committee member or remove the empty row.');
    save.disabled=true;
    try{
      const payload={category,position:pos.value.trim(),name:committeeOnly?.checked?'':name.value.trim(),display_order:Number(order.value)||100,email:committeeOnly?.checked?'':email.value.trim(),updated_at:new Date().toISOString()};
      if(cabinet)payload.photo_url=photo.value.trim();else payload.committee_members=memberNames;
      const q=item?db.from('chapter_officers').update(payload).eq('id',item.id):db.from('chapter_officers').insert(payload);
      const{error}=await q;if(error)throw error;status('Officer saved and published.');await loadOfficers();
    }catch(error){status('Could not save officer: '+error.message)}finally{save.disabled=!editable()}
  };
  actions.append(save);
  if(item){const remove=element('button','danger','Remove Position');remove.type='button';remove.disabled=!editable();remove.onclick=async()=>{if(!editable()||!confirm('Remove '+item.position+' and its committee members from the public website?'))return;try{const{error}=await db.from('chapter_officers').delete().eq('id',item.id);if(error)throw error;status('Position removed.');await loadOfficers()}catch(error){status('Could not remove position: '+error.message)}};actions.append(remove)}
  card.append(actions);return card;
}
for(const category of ['cabinet','executive'])$(category+'-add').onclick=()=>{$(category+'-list').prepend(officerEditor(null,category));$(category+'-list').firstElementChild.scrollIntoView({behavior:'smooth',block:'nearest'})};
async function loadRecruitment(){const{data,error}=await db.from('chapter_settings').select('value').eq('key','recruitment').maybeSingle();if(error)return status('Unable to load recruitment: '+error.message);recruitment=data?.value||{};const form=$('recruitment-form');for(const key of ['chair','year','phone','photo_url','dates','details'])form.elements.namedItem(key).value=recruitment[key]||'';const img=$('recruitment-photo-preview');img.hidden=!recruitment.photo_url;if(recruitment.photo_url)img.src=recruitment.photo_url;form.querySelector('button[type=submit]').disabled=!editable();$('recruitment-photo').disabled=!editable()}
$('recruitment-photo').onchange=async()=>{const file=$('recruitment-photo').files?.[0];if(!file)return;try{status('Uploading recruitment photo…');const url=await upload(file,$('recruitment-form').elements.namedItem('chair').value||'Recruitment chair');$('recruitment-form').elements.namedItem('photo_url').value=url;$('recruitment-photo-preview').src=url;$('recruitment-photo-preview').hidden=false;status('Photo uploaded. Save recruitment information to publish.')}catch(e){status(e.message)}};
$('recruitment-form').onsubmit=async e=>{e.preventDefault();if(!editable())return;const form=e.currentTarget;const value={};for(const key of ['chair','year','phone','photo_url','dates','details'])value[key]=form.elements.namedItem(key).value.trim();const{error}=await db.from('chapter_settings').upsert({key:'recruitment',value,updated_at:new Date().toISOString()});if(error)return status('Unable to save recruitment: '+error.message);status('Recruitment information saved and published.');recruitment=value};
$('media-upload-form').onsubmit=async e=>{e.preventDefault();if(!editable())return;const button=e.submitter;button.disabled=true;try{await upload($('media-file').files[0],$('media-title').value.trim());$('media-upload-form').reset();status('Photo uploaded.');await loadMedia()}catch(err){status('Upload failed: '+err.message)}finally{button.disabled=false}};
async function loadMedia(){const{data,error}=await db.from('site_media').select('title,url').order('created_at',{ascending:false}).limit(100);if(error)return status(error.message);const host=$('media-list');host.replaceChildren();for(const item of data||[]){const row=element('div','manager-media');const img=element('img');img.src=item.url;img.alt=item.title||'Chapter photo';row.append(img,element('p','',item.title||'Photo'));const btn=element('button','secondary','Copy URL');btn.onclick=()=>navigator.clipboard.writeText(item.url).then(()=>status('Photo URL copied.')).catch(()=>status('Unable to copy URL.'));row.append(btn);host.append(row)}}

const imageSlots=[
['home','your-chapter-photo','Home — Main hero photo'],
['about','chapter-history','About — Chapter history photo'],
['recruitment','rush-chair','Recruitment — Head of Recruitment photo'],
['recruitment','recruitment','Recruitment — Chapter recruitment photo'],
['brotherhood','brotherhood-moments','Brotherhood — Brotherhood moments photo'],
['brotherhood','brother-of-the-month-portrait','Brotherhood — Brother of the Month portrait'],
['philanthropy','cheese-fry-for-bin612','Philanthropy — Cheese Fry for Bin612'],
['philanthropy','space-jam','Philanthropy — Space Jam'],
['graduates','graduate-brothers','Graduates — Graduate brothers photo']
];
async function setting(key){const{data,error}=await db.from('chapter_settings').select('value').eq('key',key).maybeSingle();if(error)throw error;return data?.value||{}}
async function saveSetting(key,value){if(!editable())throw Error('Editor or Super Admin permission required');const{error}=await db.from('chapter_settings').upsert({key,value,updated_at:new Date().toISOString()});if(error)throw error}
const ifcFields=['eyebrow','heading','intro','link_label','link_url'];
async function loadIfc(){try{const v=await setting('recruitment_ifc');const form=$('ifc-form');for(const key of ifcFields)form.elements.namedItem(key).value=v[key]||'';const host=$('ifc-steps');host.replaceChildren();for(let i=0;i<3;i++){const step=v.steps?.[i]||{};const section=element('div','manager-entry');section.append(element('h3','', 'Step '+(i+1)));const grid=element('div','manager-fields');for(const [key,label] of [['label','Step label'],['title','Step title'],['description','Description']]){const [wrap,input]=field(label,step[key]||'');input.dataset.step=String(i);input.dataset.key=key;grid.append(wrap)}section.append(grid);host.append(section)}form.querySelector('button[type=submit]').disabled=!editable()}catch(e){status('Unable to load IFC information: '+e.message)}}
$('ifc-form').onsubmit=async e=>{e.preventDefault();const form=e.currentTarget;const v={};for(const key of ifcFields)v[key]=form.elements.namedItem(key).value.trim();v.steps=[0,1,2].map(i=>{const result={};for(const key of ['label','title','description'])result[key]=form.querySelector('[data-step="'+i+'"][data-key="'+key+'"]').value.trim();return result});try{await saveSetting('recruitment_ifc',v);status('IFC and rush information updated on the public Recruitment page.')}catch(e){status(e.message)}};
async function loadSpotlight(){try{const v=await setting('brother_of_month');const form=$('spotlight-form');for(const key of ['name','description','photo_url'])form.elements.namedItem(key).value=v[key]||'';const img=$('spotlight-preview');img.hidden=!v.photo_url;if(v.photo_url)img.src=v.photo_url;form.querySelector('button[type=submit]').disabled=!editable();$('spotlight-photo').disabled=!editable()}catch(e){status(e.message)}}
$('spotlight-photo').onchange=async()=>{const file=$('spotlight-photo').files?.[0];if(!file)return;try{status('Uploading Brother of the Month photo…');const url=await upload(file,'Brother of the Month');$('spotlight-form').elements.namedItem('photo_url').value=url;$('spotlight-preview').src=url;$('spotlight-preview').hidden=false;status('Photo uploaded. Save Brother of the Month to publish.')}catch(e){status(e.message)}};
$('spotlight-form').onsubmit=async e=>{e.preventDefault();const form=e.currentTarget;const v={};for(const key of ['name','description','photo_url'])v[key]=form.elements.namedItem(key).value.trim();try{await saveSetting('brother_of_month',v);status('Brother of the Month saved and published.')}catch(e){status(e.message)}};
async function loadSiteImages(){try{const values=await setting('site_images');const host=$('site-image-fields');host.replaceChildren();for(const [page,key,label] of imageSlots){const row=element('div','manager-entry');const [wrap,input]=field(label,values[page+':'+key]||'','url');input.placeholder='https://...';input.dataset.imageSlot=page+':'+key;row.append(wrap);host.append(row)}$('save-site-images').disabled=!editable()}catch(e){status('Unable to load website image settings: '+e.message)}}
$('save-site-images').onclick=async()=>{const values={};for(const input of document.querySelectorAll('[data-image-slot]')){const value=input.value.trim();if(value&&!/^https:\/\//i.test(value))return status('Image URLs must start with https://');if(value)values[input.dataset.imageSlot]=value}try{await saveSetting('site_images',values);status('Website image URLs saved and published.')}catch(e){status(e.message)}};

let philanthropyEvents=[];
function drawPhilanthropy(){const host=$('philanthropy-list');host.replaceChildren();philanthropyEvents.forEach((event,i)=>{const card=element('div','manager-entry');const heading=element('h3','','Event '+(i+1));card.append(heading);const grid=element('div','manager-fields');const fields={};for(const [key,label,type] of [['title','Event name','text'],['photo_url','Event photo URL','url']]){const [wrap,input]=field(label,event[key]||'',type);input.oninput=()=>{philanthropyEvents[i][key]=input.value};fields[key]=input;grid.append(wrap)}const wrap=element('label','full','Event description');const desc=element('textarea');desc.rows=4;desc.value=event.description||'';desc.oninput=()=>{philanthropyEvents[i].description=desc.value};wrap.append(desc);grid.append(wrap);card.append(grid);const fileWrap=element('label','upload','Upload event photo');const file=element('input');file.type='file';file.accept='image/png,image/jpeg,image/webp';file.disabled=!editable();file.onchange=async()=>{if(!file.files?.[0])return;try{status('Uploading event photo…');const url=await upload(file.files[0],fields.title.value||'Philanthropy event');philanthropyEvents[i].photo_url=url;fields.photo_url.value=url;status('Photo uploaded. Save All Philanthropy Events to publish.')}catch(e){status('Upload failed: '+e.message)}};fileWrap.append(file);card.append(fileWrap);const actions=element('div','manager-actions');const up=element('button','secondary','Move Up');up.disabled=!editable()||i===0;up.onclick=()=>{[philanthropyEvents[i-1],philanthropyEvents[i]]=[philanthropyEvents[i],philanthropyEvents[i-1]];drawPhilanthropy()};const down=element('button','secondary','Move Down');down.disabled=!editable()||i===philanthropyEvents.length-1;down.onclick=()=>{[philanthropyEvents[i+1],philanthropyEvents[i]]=[philanthropyEvents[i],philanthropyEvents[i+1]];drawPhilanthropy()};const remove=element('button','danger','Remove Event');remove.disabled=!editable();remove.onclick=()=>{if(!confirm('Remove this event? Save changes to publish.'))return;philanthropyEvents.splice(i,1);drawPhilanthropy()};actions.append(up,down,remove);card.append(actions);host.append(card)});$('add-philanthropy-event').disabled=!editable();$('save-philanthropy-events').disabled=!editable()}
async function loadPhilanthropy(){try{const v=await setting('philanthropy_events');philanthropyEvents=Array.isArray(v.events)?v.events.map(e=>({title:e.title||'',description:e.description||'',photo_url:e.photo_url||''})):[];drawPhilanthropy()}catch(e){status('Unable to load philanthropy events: '+e.message)}}
$('add-philanthropy-event').onclick=()=>{philanthropyEvents.push({title:'',description:'',photo_url:''});drawPhilanthropy()};
$('save-philanthropy-events').onclick=async()=>{if(philanthropyEvents.some(e=>!e.title.trim()))return status('Every philanthropy event needs a name.');try{await saveSetting('philanthropy_events',{events:philanthropyEvents});status('Philanthropy events saved and published.')}catch(e){status('Unable to save philanthropy events: '+e.message)}};

async function loadContact(){try{const v=await setting('contact');for(const key of ['general_email','recruitment_email','philanthropy_email','support_email','house_address','house_city'])$('contact-form').elements.namedItem(key).value=v[key]||'';$('contact-form').querySelector('button[type=submit]').disabled=!editable()}catch(e){status('Contact information could not load: '+e.message)}}
$('contact-form').onsubmit=async e=>{e.preventDefault();const v={};for(const key of ['general_email','recruitment_email','philanthropy_email','support_email','house_address','house_city'])v[key]=e.currentTarget.elements.namedItem(key).value.trim();try{await saveSetting('contact',v);status('Contact details saved and published.')}catch(e){status(e.message)}};
let impactHistory=[];
function drawImpactYears(){const host=$('impact-years');host.replaceChildren();impactHistory.forEach((v,i)=>{const row=element('div','manager-entry');const grid=element('div','manager-fields');for(const [key,label,type] of [['year','Year','number'],['amount','Amount Raised (USD)','number'],['note','Description','text']]){const [wrap,input]=field(label,v[key]||'',type);input.oninput=()=>impactHistory[i][key]=input.value;grid.append(wrap)}row.append(grid);const remove=element('button','danger','Remove Year');remove.type='button';remove.disabled=!editable();remove.onclick=()=>{impactHistory.splice(i,1);drawImpactYears()};row.append(remove);host.append(row)});$('impact-add-year').disabled=!editable();$('impact-form').querySelector('button[type=submit]').disabled=!editable()}
async function loadImpact(){try{const v=await setting('philanthropy_impact');for(const key of ['year','amount','event','description'])$('impact-form').elements.namedItem(key).value=v[key]||'';impactHistory=Array.isArray(v.history)?v.history.map(x=>({...x})):[];drawImpactYears()}catch(e){status('Fundraising details could not load: '+e.message)}}
$('impact-add-year').onclick=()=>{impactHistory.push({year:'',amount:'',note:''});drawImpactYears()};
$('impact-form').onsubmit=async e=>{e.preventDefault();const v={};for(const key of ['year','amount','event','description'])v[key]=e.currentTarget.elements.namedItem(key).value.trim();v.history=impactHistory.filter(x=>x.year);try{await saveSetting('philanthropy_impact',v);status('Fundraising amounts saved and published.')}catch(e){status(e.message)}};

init();