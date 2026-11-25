(() => {
  'use strict';
  const STORE = 'idea-atelier-v1';
  const labels = {seed:'�肪�o��',growing:'��Ē�',ready:'����������',done:'��������'};
  const colors = {'�A�v���EWeb':'','��i�E�n��':'peach','��炵':'yellow','�C�x���g':'lav','�w��':'','���̑�':'peach'};
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  const state = loadState();
  let currentView = 'all', currentFilter = 'all', collectionFilter = '', activeIdea = null, sortNewest = true, toastTimer;

  function loadState(){
    try { const saved=JSON.parse(localStorage.getItem(STORE)); if(saved && Array.isArray(saved.ideas)) return {ideas:saved.ideas,collections:Array.isArray(saved.collections)?saved.collections:[]}; } catch(e){}
    return {ideas:[],collections:[]};
  }
  function persist(){localStorage.setItem(STORE,JSON.stringify(state));}
  function id(){return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;}
  function escapeHtml(v=''){return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function dateText(v){if(!v)return '';return new Intl.DateTimeFormat('ja-JP',{month:'numeric',day:'numeric'}).format(new Date(v));}
  function toast(text){const el=$('#toast');el.textContent=text;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),2200);}
  function renderCollections(){
    const wrap=$('#collections');wrap.innerHTML='';
    state.collections.forEach(c=>{const b=document.createElement('button');b.className='collection-link';b.innerHTML=`<i></i>${escapeHtml(c.name)}`;b.addEventListener('click',()=>{collectionFilter=c.id;currentView='all';setActiveNav();render();});wrap.append(b);});
    const select=$('#idea-collection');select.innerHTML='<option value="">������</option>'+state.collections.map(c=>`<option value="${escapeHtml(c.id)}">${escapeHtml(c.name)}</option>`).join('');
  }
  function render(){
    if(location.hash.startsWith('#share=')){renderShared();return;}
    $('#home-view').hidden=false;$('#shared-view').hidden=true;
    const query=$('#search').value.trim().toLowerCase();
    let ideas=[...state.ideas];
    if(currentView==='favorites')ideas=ideas.filter(x=>x.favorite);
    if(currentView==='shared')ideas=ideas.filter(x=>x.shared);
    if(collectionFilter)ideas=ideas.filter(x=>x.collection===collectionFilter);
    if(currentFilter!=='all')ideas=ideas.filter(x=>x.status===currentFilter);
    if(query)ideas=ideas.filter(x=>[x.name,x.description,x.problem,x.impact,x.category].join(' ').toLowerCase().includes(query));
    ideas.sort((a,b)=>sortNewest?new Date(b.updated)-new Date(a.updated):new Date(a.updated)-new Date(b.updated));
    $('#idea-count').textContent=state.ideas.length;
    const navTitle=currentView==='favorites'?'���C�ɓ���':currentView==='shared'?'���L�����A�C�f�A':collectionFilter?(state.collections.find(x=>x.id===collectionFilter)?.name||'�R���N�V����'):'�A�C�f�A��';
    $('#crumb-label').textContent=navTitle;$('#list-heading').textContent=collectionFilter?navTitle:currentView==='favorites'?'���C�ɓ���̃A�C�f�A':currentView==='shared'?'���L�����A�C�f�A':currentFilter==='all'?'���ׂẴA�C�f�A':labels[currentFilter]+'�A�C�f�A';
    $('#list-subtitle').textContent=currentView==='shared'?'����܂łɋ��L�����N��������A�C�f�A�B':'�v���������Ƃ��A�Y��Ȃ������ɁB';
    const grid=$('#idea-grid');grid.innerHTML='';
    ideas.forEach(item=>{
      const card=document.createElement('article');card.className='idea-card';card.tabIndex=0;card.setAttribute('aria-label',item.name+'��ҏW');
      const short=(item.description||item.problem||'�܂������͂���܂���B').replace(/\s+/g,' ').trim();
      card.innerHTML=`<div class="card-top"><span class="category-pill ${colors[item.category]||''}">${escapeHtml(item.category||'���̑�')}</span><button class="favorite-button ${item.favorite?'on':''}" aria-label="���C�ɓ���">${item.favorite?'?':'?'}</button></div><h3>${escapeHtml(item.name)}</h3><p class="card-desc">${escapeHtml(short)}</p><div class="card-bottom"><span class="status ${escapeHtml(item.status)}">${labels[item.status]||'�肪�o��'}</span><span class="card-date">${dateText(item.updated)}</span></div><button class="card-share" aria-label="���L�ݒ�">? ${item.shared?'���L�ς�':'���L����'}</button>`;
      card.addEventListener('click',e=>{if(e.target.closest('.favorite-button')){e.stopPropagation();item.favorite=!item.favorite;persist();render();return;}if(e.target.closest('.card-share')){e.stopPropagation();openShare(item);return;}openIdea(item.id);});
      card.addEventListener('keydown',e=>{if(e.key==='Enter')openIdea(item.id);});
      grid.append(card);
    });
    $('#empty-state').hidden=ideas.length>0;
    renderCollections();
  }
  function setActiveNav(){
    $$('.nav-item[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===currentView));
    $$('.filter').forEach(b=>b.classList.toggle('active',b.dataset.filter===currentFilter));
  }
  function openIdea(ideaId=null){
    const item=ideaId?state.ideas.find(x=>x.id===ideaId):null;activeIdea=item?.id||null;
    $('#form-title').textContent=item?'�A�C�f�A��ҏW����':'�A�C�f�A���L�^����';$('#idea-id').value=item?.id||'';
    $('#idea-name').value=item?.name||'';$('#idea-category').value=item?.category||'�A�v���EWeb';$('#idea-status').value=item?.status||'seed';$('#idea-description').value=item?.description||'';$('#idea-problem').value=item?.problem||'';$('#idea-impact').value=item?.impact||'';$('#idea-step').value=item?.step||'';$('#idea-needs').value=item?.needs||'';$('#idea-favorite').checked=!!item?.favorite;$('#idea-collection').value=item?.collection||'';$('#delete-idea').hidden=!item;
    $('#idea-dialog').showModal();
  }
  function closeDialog(sel){$(sel).close();}
  function saveIdea(e){
    e.preventDefault();const old=state.ideas.find(x=>x.id===$('#idea-id').value);const now=new Date().toISOString();
    const item={id:old?.id||id(),name:$('#idea-name').value.trim(),category:$('#idea-category').value,status:$('#idea-status').value,description:$('#idea-description').value.trim(),problem:$('#idea-problem').value.trim(),impact:$('#idea-impact').value.trim(),step:$('#idea-step').value.trim(),needs:$('#idea-needs').value.trim(),favorite:$('#idea-favorite').checked,collection:$('#idea-collection').value,shared:!!old?.shared,created:old?.created||now,updated:now};
    if(old)Object.assign(old,item);else state.ideas.unshift(item);persist();closeDialog('#idea-dialog');render();toast(old?'�A�C�f�A���X�V���܂���':'�A�C�f�A���L�^���܂���');
  }
  function deleteIdea(){const item=state.ideas.find(x=>x.id===activeIdea);if(!item)return;if(!confirm(`�u${item.name}�v���폜���܂����H`))return;state.ideas=state.ideas.filter(x=>x.id!==activeIdea);persist();closeDialog('#idea-dialog');render();toast('�A�C�f�A���폜���܂���');}
  function openShare(item){activeIdea=item.id;$('#share-title').value=item.name;$('#share-alias').value='';$('#share-area').value='';$('#share-redactions').value='';$('#share-mask-contacts').checked=true;$('#share-show-alias').checked=false;$('#share-show-area').checked=false;$$('[data-share]').forEach(c=>c.checked=['description','problem','impact','step','meta'].includes(c.dataset.share));$('#share-dialog').showModal();updatePreview();}
  function redact(value){
    let text=String(value||'');
    const words=$('#share-redactions').value.split(/[,�A�C]/).map(x=>x.trim()).filter(Boolean).sort((a,b)=>b.length-a.length);
    for(const word of words)text=text.replace(new RegExp(word.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'gi'),'�m�ڂ����n');
    if($('#share-mask-contacts').checked){
      text=text.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,'�m���[���A�h���X���ڂ����n');
      text=text.replace(/(?:https?:\/\/|www\.)[^\s�@]+/gi,'�mURL���ڂ����n');
      text=text.replace(/(?:\+?81[-�[ ]?)?0\d{1,4}[-�[ ]?\d{1,4}[-�[ ]?\d{3,4}/g,'�m�d�b�ԍ����ڂ����n');
    }
    return text;
  }
  function selectedPayload(){
    const item=state.ideas.find(x=>x.id===activeIdea);if(!item)return null;
    const on=key=>$(`[data-share="${key}"]`).checked;
    return {v:1,name:redact($('#share-title').value.trim()||item.name),alias:$('#share-show-alias').checked?redact($('#share-alias').value.trim()):'',area:$('#share-show-area').checked?redact($('#share-area').value.trim()):'',category:on('meta')?item.category:'',status:on('meta')?(labels[item.status]||''):'',description:on('description')?redact(item.description):'',problem:on('problem')?redact(item.problem):'',impact:on('impact')?redact(item.impact):'',step:on('step')?redact(item.step):'',needs:on('needs')?redact(item.needs):''};
  }
  function updatePreview(){
    const p=selectedPayload();if(!p)return;const blocks=[['�A�C�f�A�ɂ���',p.description],['��������������',p.problem],['����������',p.impact],['�ŏ��̈��',p.step],['�K�v�Ȃ��́E����',p.needs]].filter(x=>x[1]);
    $('#share-preview').innerHTML=`${p.category?`<span class="preview-tag">${escapeHtml(p.category)}${p.status?' �E '+escapeHtml(p.status):''}</span>`:''}<h3>${escapeHtml(p.name)}</h3><div class="preview-owner">${p.alias?escapeHtml(p.alias):'�����̃A�C�f�A'}${p.area?' �E '+escapeHtml(p.area):''}</div>${blocks.map(([title,text])=>`<div class="preview-block"><b>${title}</b><p>${escapeHtml(text)}</p></div>`).join('')||'<div class="preview-block"><p>�I�����ꂽ�������ڂ͂���܂���B</p></div>'}`;
  }
  function sharedPayload(){try{const raw=location.hash.slice(7);const p=JSON.parse(decodeURIComponent(raw));if(p&&p.v===1&&typeof p.name==='string')return p;}catch(e){}return null;}
  function renderShared(){
    $('#home-view').hidden=true;$('#shared-view').hidden=false;const p=sharedPayload();
    if(!p){$('#shared-title').textContent='';$('#shared-owner').textContent='';$('#shared-content').innerHTML='<div class="shared-empty"><b>�����N��ǂݍ��߂܂���ł���</b><p>���L�����N���r���Ő؂�Ă��邩�A�`�����قȂ�܂��B</p></div>';return;}
    $('#crumb-label').textContent='���L�A�C�f�A';$('#shared-title').textContent=p.name;$('#shared-owner').textContent=`${p.alias||'�����̃A�C�f�A'}${p.area?' �E '+p.area:''}`;
    const blocks=[['�A�C�f�A�ɂ���',p.description],['��������������',p.problem],['����������',p.impact],['�ŏ��̈��',p.step],['�K�v�Ȃ��́E����',p.needs]].filter(x=>typeof x[1]==='string'&&x[1].trim());
    $('#shared-content').innerHTML=`${p.category||p.status?`<div class="shared-meta">${p.category?`<span>${escapeHtml(p.category)}</span>`:''}${p.status?`<span>${escapeHtml(p.status)}</span>`:''}</div>`:''}${blocks.map(([title,text])=>`<div class="preview-block"><b>${title}</b><p>${escapeHtml(text)}</p></div>`).join('')||'<div class="shared-empty"><p>���L�ł�������͂܂�����܂���B</p></div>'}`;
  }
  function makeShareUrl(){const p=selectedPayload();const encoded=encodeURIComponent(JSON.stringify(p));return location.href.split('#')[0]+'#share='+encoded;}
  async function copyShare(){const url=makeShareUrl();try{await navigator.clipboard.writeText(url);$('#share-feedback').textContent='���L�����N���R�s�[���܂����B����O�ɁA�v���r���[��������x�m�F���Ă��������B';const item=state.ideas.find(x=>x.id===activeIdea);if(item){item.shared=true;persist();render();}}catch(e){$('#share-feedback').textContent='�R�s�[�ł��܂���ł����B���̃{�^�����狤�L�f�[�^��ۑ����Ă��������B';}}
  function downloadFile(name,data){const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}
  function exportData(){downloadFile('idea-atelier-backup.json',{version:1,exportedAt:new Date().toISOString(),...state});toast('�o�b�N�A�b�v�������o���܂���');}
  function importData(file){const reader=new FileReader();reader.onload=()=>{try{const data=JSON.parse(reader.result);if(data&&data.v===1&&typeof data.name==='string'){
      if(!confirm(`���L���ꂽ�u${data.name}�v���A�C�f�A���ɒǉ����܂����H`))return;
      const status=Object.entries(labels).find(([,label])=>label===data.status)?.[0]||'seed';const now=new Date().toISOString();
      state.ideas.unshift({id:id(),name:data.name,category:data.category||'���̑�',status,description:data.description||'',problem:data.problem||'',impact:data.impact||'',step:data.step||'',needs:data.needs||'',favorite:false,collection:'',shared:false,created:now,updated:now});persist();render();toast('���L�A�C�f�A��ǉ����܂���');return;
    }if(!Array.isArray(data.ideas))throw Error();if(!confirm('�ǂݍ��񂾓��e�ŁA���݂̃A�C�f�A����u�������܂����H'))return;state.ideas=data.ideas;state.collections=Array.isArray(data.collections)?data.collections:[];persist();render();toast('�f�[�^��ǂݍ��݂܂���');}catch(e){alert('���̃t�@�C���̓A�C�f�A���̋��L�f�[�^�܂��̓o�b�N�A�b�v�Ƃ��ēǂݍ��߂܂���ł����B');}};reader.readAsText(file);}
  function addCollection(e){e.preventDefault();const name=$('#collection-name').value.trim();if(!name)return;state.collections.push({id:id(),name});persist();$('#collection-dialog').close();$('#collection-name').value='';render();toast('�R���N�V������ǉ����܂���');}

  $$('.nav-item[data-view]').forEach(b=>b.addEventListener('click',()=>{currentView=b.dataset.view;collectionFilter='';setActiveNav();render();}));
  $$('.filter').forEach(b=>b.addEventListener('click',()=>{currentFilter=b.dataset.filter;setActiveNav();render();}));
  $('#new-idea').addEventListener('click',()=>openIdea());$('#empty-new').addEventListener('click',()=>openIdea());$('#idea-form').addEventListener('submit',saveIdea);
  $$('.close-dialog').forEach(b=>b.addEventListener('click',()=>closeDialog('#idea-dialog')));$('#delete-idea').addEventListener('click',deleteIdea);
  $('#search').addEventListener('input',render);$('#sort-button').addEventListener('click',()=>{sortNewest=!sortNewest;$('#sort-button').textContent=sortNewest?'�ŋߍX�V������?':'�Â���?';render();});
  $('#add-collection').addEventListener('click',()=>$('#collection-dialog').showModal());$$('.close-collection').forEach(b=>b.addEventListener('click',()=>$('#collection-dialog').close()));$('#collection-form').addEventListener('submit',addCollection);
  $('#export-data').addEventListener('click',exportData);$('#import-data').addEventListener('click',()=>$('#file-input').click());$('#file-input').addEventListener('change',e=>{if(e.target.files[0])importData(e.target.files[0]);e.target.value='';});
  $$('.close-share').forEach(b=>b.addEventListener('click',()=>$('#share-dialog').close()));$$('[data-share],#share-show-alias,#share-show-area,#share-alias,#share-area,#share-title,#share-redactions,#share-mask-contacts').forEach(el=>el.addEventListener('input',updatePreview));$$('[data-share],#share-show-alias,#share-show-area,#share-mask-contacts').forEach(el=>el.addEventListener('change',updatePreview));
  $('#copy-share').addEventListener('click',copyShare);$('#download-share').addEventListener('click',()=>{const p=selectedPayload();downloadFile('idea-share.json',p);$('#share-feedback').textContent='�I���������e�����̋��L�f�[�^��ۑ����܂����B';});
  window.addEventListener('hashchange',render);renderCollections();render();
})();

