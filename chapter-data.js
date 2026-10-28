import{createClient}from'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
const db=createClient('https://tzrmtdwsspobcbucwtrj.supabase.co','sb_publishable_57LLRCD8y-LWGQ4yVTL7bg__HF20OFF');
const page=document.body.dataset.page;
function el(tag,cls='',value){const node=document.createElement(tag);if(cls)node.className=cls;if(value!==undefined)node.textContent=value;return node}
function officerCard(officer){
  const cabinet=officer.category==='cabinet';
  const commissioner=!cabinet&&/^commissioner$/i.test(officer.position.trim());
  const card=el('article','card officer-card'+(cabinet?'':' committee-card')+(commissioner?' commissioner-card':'')+(cabinet&&/^president$/i.test(officer.position.trim())?' cabinet-president':''));
  const details=el('div','officer-details');
  if(cabinet&&safePhoto(officer.photo_url)){const image=el('img','chapter-officer-photo');image.src=safePhoto(officer.photo_url);image.alt=officer.name;image.loading='lazy';card.append(image)}
  if(cabinet){
    if(!safePhoto(officer.photo_url)){const initials=el('span','cabinet-monogram',officer.name.trim().split(/\s+/).filter(Boolean).map(part=>part[0]).filter((_,i,all)=>i===0||i===all.length-1).join(''));initials.setAttribute('aria-hidden','true');card.append(initials)}
    details.append(el('p','cabinet-position',officer.position),el('h3','',officer.name));
  }
  else{details.append(el('h3','',officer.position));if(officer.name)details.append(el('p','committee-chair',officer.name))}
  if(officer.email){const email=el('a','officer-email',officer.email);email.href='mailto:'+officer.email;details.append(email)}
  card.append(details);
  if(!cabinet&&officer.committee_members?.length){const group=el('div','committee-roster');group.append(el('h4','','Committee members'));const members=el('ul','committee-member-list'+(officer.committee_members.length>=6?' large-roster':''));for(const name of officer.committee_members)members.append(el('li','',name));group.append(members);card.append(group)}
  return card;
}
async function renderOfficers(){
  if(page!=='leadership')return;
  const{data,error}=await db.from('chapter_officers').select('category,position,name,photo_url,email,committee_members,display_order').order('display_order').order('position');
  if(error)return;
  const main=document.getElementById('main');if(!main)return;
  main.querySelector('#executive-profiles')?.closest('section')?.remove();
  for(const [category,title] of [['cabinet','Chapter Cabinet'],['executive','Executive Board & Committees']]){
    const list=(data||[]).filter(o=>o.category===category);
    const section=el('section','section chapter-officer-section '+category+'-section');
    section.append(el('p','eyebrow',category==='cabinet'?'CHAPTER LEADERSHIP':'EXECUTIVE LEADERSHIP'),el('h2','',title));
    const grid=el('div',category==='executive'?'executive-directory':'officer-grid cabinet-grid');
    if(category==='executive'){
      const leaders=list.filter(o=>/^commissioner$/i.test(o.position.trim()));
      for(const officer of leaders){const spotlight=el('div','commissioner-spotlight');spotlight.append(officerCard(officer));section.append(spotlight)}
      const committees=list.filter(o=>!leaders.includes(o));
      for(const officer of committees){
        const card=officerCard(officer);
        if(officer.committee_members?.length>=12){const featured=el('div','featured-committee');featured.append(card);section.append(featured)}
        else grid.append(card);
      }
    }else for(const officer of list)grid.append(officerCard(officer));
    if(!list.length)grid.append(el('p','muted','Leadership positions will be listed here as they are added through the Website Manager.'));
    section.append(grid);main.append(section);
  }
}
async function renderRecruitment(){if(page!=='recruitment')return;const{data,error}=await db.from('chapter_settings').select('value').eq('key','recruitment').maybeSingle();if(error||!data?.value)return;const v=data.value;const main=document.getElementById('main');if(!main)return;const section=main.querySelector('.rush-chair');if(section){const kicker=section.querySelector('.eyebrow');if(kicker)kicker.textContent=(v.year?v.year+' ':'')+'HEAD OF RECRUITMENT';const h=section.querySelector('h2');if(h&&v.chair)h.textContent='Meet '+v.chair+'.';const link=section.querySelector('a[href^="tel:"]');const sms=section.querySelector('a[href^="sms:"]');const digits=(v.phone||'').replace(/[^0-9+]/g,'');if(link){if(digits){link.href='tel:'+digits;link.textContent=v.phone;link.hidden=false}else link.hidden=true}if(sms){if(digits){sms.href='sms:'+digits;sms.hidden=false}else sms.hidden=true}const img=section.querySelector('img');if(img&&v.photo_url?.startsWith('https://')){img.src=v.photo_url;img.alt=(v.chair||'Recruitment chair')+' portrait'}}if(v.dates||v.details){const dates=el('section','section chapter-recruitment-dates');dates.append(el('p','eyebrow','RECRUITMENT INFORMATION'),el('h2','','Upcoming Recruitment'));if(v.dates){dates.append(el('h3','','Dates & Schedule'));const p=el('p','',v.dates);p.style.whiteSpace='pre-line';dates.append(p)}if(v.details){const p=el('p','',v.details);p.style.whiteSpace='pre-line';dates.append(p)}const after=main.querySelector('.rush-chair');if(after)after.after(dates);else main.append(dates)}}

function safePhoto(url){try{const u=new URL(url);return u.protocol==='https:'?u.href:null}catch{return null}}
function changePhoto(target,url,alt){const src=safePhoto(url);if(!target||!src)return;if(target.tagName==='IMG'){target.src=src;target.alt=alt||target.alt;return}const img=el('img','managed-site-photo');img.src=src;img.alt=alt||target.getAttribute('aria-label')||'Chapter photo';img.loading='lazy';target.replaceWith(img)}
async function renderIfc(){if(page!=='recruitment')return;const{data,error}=await db.from('chapter_settings').select('value').eq('key','recruitment_ifc').maybeSingle();if(error||!data?.value)return;const v=data.value;const section=document.querySelector('#main .rush-overview');if(!section)return;const eyebrow=section.querySelector('.eyebrow');if(eyebrow&&v.eyebrow!==undefined)eyebrow.textContent=v.eyebrow;const heading=section.querySelector('h2');if(heading&&v.heading!==undefined)heading.textContent=v.heading;const intro=section.querySelector(':scope > p:not(.eyebrow)');if(intro&&v.intro!==undefined)intro.textContent=v.intro;const cards=[...section.querySelectorAll('.cards .card')];(v.steps||[]).forEach((step,i)=>{const card=cards[i];if(!card)return;const label=card.querySelector('.eyebrow'),title=card.querySelector('h3'),desc=card.querySelector('p:not(.eyebrow)');if(label&&step.label!==undefined)label.textContent=step.label;if(title&&step.title!==undefined)title.textContent=step.title;if(desc&&step.description!==undefined)desc.textContent=step.description});const link=section.querySelector('a.btn');if(link){if(v.link_label!==undefined)link.textContent=v.link_label;const url=safePhoto(v.link_url);if(url)link.href=url;else if(!v.link_url)link.hidden=true}}
async function renderSpotlight(){if(page!=='brotherhood')return;const{data,error}=await db.from('chapter_settings').select('value').eq('key','brother_of_month').maybeSingle();if(error||!data?.value)return;const v=data.value;const section=document.querySelector('#main .brother-of-month');if(!section)return;const name=section.querySelector('h3');if(name&&v.name)name.textContent=v.name;const paragraphs=[...section.querySelectorAll('.split > div:first-child > p:not(.eyebrow)')];if(paragraphs.length&&v.description)paragraphs[paragraphs.length-1].textContent=v.description;if(v.photo_url)changePhoto(section.querySelector('.photo-slot, img'),v.photo_url,(v.name||'Brother of the Month')+' portrait')}
async function renderSiteImages(){const{data,error}=await db.from('chapter_settings').select('value').eq('key','site_images').maybeSingle();if(error||!data?.value)return;const images=data.value;const main=document.getElementById('main');if(!main)return;for(const slot of main.querySelectorAll('[data-photo-key]')){const key=page+':'+slot.dataset.photoKey;const url=images[key];if(url)changePhoto(slot,url,slot.getAttribute('aria-label'))}if(page==='recruitment'&&images['recruitment:rush-chair'])changePhoto(main.querySelector('.rush-chair-photo img'),images['recruitment:rush-chair'],'Head of Recruitment')}


async function renderPhilanthropy(){if(page!=='philanthropy')return;const{data,error}=await db.from('chapter_settings').select('value').eq('key','philanthropy_events').maybeSingle();if(error||!Array.isArray(data?.value?.events))return;const host=document.querySelector('#main .philanthropy-events');if(!host)return;host.replaceChildren();for(const event of data.value.events){const card=el('article','card');const image=safePhoto(event.photo_url);if(image){const img=el('img','managed-site-photo');img.src=image;img.alt=event.title||'Philanthropy event';img.loading='lazy';card.append(img)}else{const key=(event.title||'event').replace(/[^a-z0-9]+/gi,'-').toLowerCase().replace(/^-|-$/g,'');const placeholder=el('div','photo-slot');placeholder.dataset.photoKey=key;placeholder.setAttribute('role','img');placeholder.setAttribute('aria-label',event.title||'Event photo');placeholder.append(el('span','','CHAPTER PHOTOGRAPHY'),el('small','',(event.title||'Event')+' · Photo coming soon'));card.append(placeholder)}card.append(el('h3','',event.title||'Event'),el('p','',event.description||''));host.append(card)}}


async function renderContact(){if(page!=='contact')return;const{data,error}=await db.from('chapter_settings').select('value').eq('key','contact').maybeSingle();if(error||!data?.value)return;const v=data.value;const main=document.getElementById('main');const house=main?.querySelector('.contact-top-grid .card p:last-child');if(house){house.replaceChildren();if(v.house_address){house.append(document.createTextNode(v.house_address));house.append(document.createElement('br'))}house.append(document.createTextNode(v.house_city||'Starkville, Mississippi'))}const host=main?.querySelector('#contact-cards');if(!host)return;const items=[['General Questions','For chapter questions, general outreach, and basic information.',v.general_email],['Recruitment','For prospective members, rush events, and recruitment information.',v.recruitment_email],['Philanthropy','For service partnerships, fundraising, and philanthropy events.',v.philanthropy_email],['Website / Admin Issues','For account access, website bugs, technical support, and admin portal problems.',v.support_email]];host.replaceChildren();for(const [title,description,email] of items){const card=el('article','card');card.append(el('p','eyebrow','CONTACT'),el('h3','',title),el('p','',description));if(email){const a=el('a','contact-email',email);a.href='mailto:'+email;card.append(a)}else card.append(el('p','muted','Contact details coming soon.'));host.append(card)}}
async function renderImpact(){if(page!=='philanthropy')return;const{data,error}=await db.from('chapter_settings').select('value').eq('key','philanthropy_impact').maybeSingle();if(error||!data?.value)return;const v=data.value;const main=document.getElementById('main');if(!main)return;const section=el('section','section philanthropy-impact');section.append(el('p','eyebrow','OUR PHILANTHROPIC IMPACT'),el('h2','','Making a difference together.'));const featured=el('div','impact-feature');featured.append(el('p','eyebrow',v.year?'FEATURED YEAR · '+v.year:'FEATURED FUNDRAISER'));const number=Number(v.amount);if(Number.isFinite(number)&&number>0)featured.append(el('strong','impact-number',(v.amount_prefix||'Over $')+number.toLocaleString('en-US')));if(v.event)featured.append(el('h3','',v.event));if(v.description)featured.append(el('p','',v.description));section.append(featured);const history=Array.isArray(v.history)?v.history:[];if(history.length){section.append(el('h3','','Annual Fundraising'));const list=el('div','impact-year-grid');for(const item of history){const card=el('article','card');card.append(el('h3','',String(item.year||'')));const amt=Number(item.amount);if(Number.isFinite(amt))card.append(el('strong','', '$'+amt.toLocaleString('en-US')));if(item.note)card.append(el('p','',item.note));list.append(card)}section.append(list)}const existing=main.querySelector('.philanthropy-events')?.closest('section');if(existing)existing.after(section);else main.append(section)}

await Promise.all([renderOfficers(),renderRecruitment(),renderIfc(),renderPhilanthropy(),renderImpact(),renderContact()]);
await renderSiteImages();
await renderSpotlight();
