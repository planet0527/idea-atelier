(() => {
  'use strict';
  const STORE = 'idea-atelier-v1';
  const labels = {seed:'芽が出た',growing:'育て中',ready:'実現したい',done:'実現した'};
  const colors = {'アプリ・Web':'','作品・創作':'peach','暮らし':'yellow','イベント':'lav','学び':'','その他':'peach'};
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  const state = loadState();
  let currentView = 'all', currentFilter = 'all', collectionFilter = '', activeIdea = null, sortNewest = true, toastTimer, undoDeletionTimer, pendingDeletion = null, ideaBaseline = '';

  function loadState(){
    try { const saved=JSON.parse(localStorage.getItem(STORE)); if(saved && Array.isArray(saved.ideas)) return {ideas:saved.ideas,collections:Array.isArray(saved.collections)?saved.collections:[]}; } catch(e){}
    return {ideas:[],collections:[]};
  }
  function persist(){localStorage.setItem(STORE,JSON.stringify(state));}
  function id(){return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;}
  function escapeHtml(v=''){return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function dateText(v){if(!v)return '';return new Intl.DateTimeFormat('ja-JP',{month:'numeric',day:'numeric'}).format(new Date(v));}
  function toast(text,action=null,duration=2200){
    const el=$('#toast');el.replaceChildren();const message=document.createElement('span');message.textContent=text;el.append(message);
    if(action){const button=document.createElement('button');button.type='button';button.className='toast-action';button.textContent=action.label;button.addEventListener('click',()=>{clearTimeout(toastTimer);el.classList.remove('show','has-action');action.run();});el.append(button);}
    el.classList.toggle('has-action',!!action);el.classList.add('show');clearTimeout(toastTimer);
    toastTimer=setTimeout(()=>{el.classList.remove('show','has-action');el.replaceChildren();},duration);
  }
  function renderCollections(){
    const wrap=$('#collections');wrap.innerHTML='';
    state.collections.forEach(c=>{const b=document.createElement('button');b.className='collection-link';b.innerHTML=`<i></i>${escapeHtml(c.name)}`;b.addEventListener('click',()=>{collectionFilter=c.id;currentView='all';setActiveNav();render();});wrap.append(b);});
    const select=$('#idea-collection');select.innerHTML='<option value="">未分類</option>'+state.collections.map(c=>`<option value="${escapeHtml(c.id)}">${escapeHtml(c.name)}</option>`).join('');const mobile=$('#mobile-collection-filter');mobile.innerHTML='<option value="">すべてのコレクション</option>'+state.collections.map(c=>`<option value="${escapeHtml(c.id)}">${escapeHtml(c.name)}</option>`).join('');mobile.value=collectionFilter;
  }
  function render(){
    if(location.hash.startsWith('#share=')){renderShared();return;}
    $('#home-view').hidden=false;$('#shared-view').hidden=true;
    const query=$('#search').value.trim().toLowerCase();$('#clear-search').hidden=!query;
    let ideas=[...state.ideas];
    if(currentView==='favorites')ideas=ideas.filter(x=>x.favorite);
    if(currentView==='shared')ideas=ideas.filter(x=>x.shared);
    if(collectionFilter)ideas=ideas.filter(x=>x.collection===collectionFilter);
    if(currentFilter!=='all')ideas=ideas.filter(x=>x.status===currentFilter);
    if(query)ideas=ideas.filter(x=>{const collectionName=state.collections.find(c=>c.id===x.collection)?.name||'';return [x.name,x.description,x.problem,x.impact,x.step,x.needs,x.category,labels[x.status],collectionName].join(' ').toLowerCase().includes(query);});
    ideas.sort((a,b)=>sortNewest?new Date(b.updated)-new Date(a.updated):new Date(a.updated)-new Date(b.updated));
    $('#idea-count').textContent=state.ideas.length;$('#result-count').textContent=`${ideas.length}件`;$('#result-count').setAttribute('aria-label',`全${state.ideas.length}件中 ${ideas.length}件を表示`);
    const navTitle=currentView==='favorites'?'お気に入り':currentView==='shared'?'共有したアイデア':collectionFilter?(state.collections.find(x=>x.id===collectionFilter)?.name||'コレクション'):'アイデア帳';
    $('#crumb-label').textContent=navTitle;$('#list-heading').textContent=collectionFilter?navTitle:currentView==='favorites'?'お気に入りのアイデア':currentView==='shared'?'共有したアイデア':currentFilter==='all'?'すべてのアイデア':labels[currentFilter]+'アイデア';
    $('#list-subtitle').textContent=currentView==='shared'?'これまでに共有リンクを作ったアイデア。':'思いついたことを、忘れないうちに。';
    const grid=$('#idea-grid');grid.innerHTML='';
    ideas.forEach(item=>{
      const card=document.createElement('article');card.className='idea-card';card.tabIndex=0;card.setAttribute('aria-label',item.name+'を編集');
      const short=(item.description||item.problem||'まだ説明はありません。').replace(/\s+/g,' ').trim();const taskList=Array.isArray(item.tasks)?item.tasks.filter(t=>t&&typeof t.text==='string'&&t.text.trim()):[];const taskDone=taskList.filter(t=>t.done).length;
      card.innerHTML=`<div class="card-top"><span class="category-pill ${colors[item.category]||''}">${escapeHtml(item.category||'その他')}</span><button class="favorite-button ${item.favorite?'on':''}" aria-label="${item.favorite?'お気に入りから外す':'お気に入りに追加'}">${item.favorite?'♥':'♡'}</button></div><h3>${escapeHtml(item.name)}</h3><p class="card-desc">${escapeHtml(short)}</p>${item.step?`<div class="card-step ${item.stepDone?'is-done':''}"><div><b>次の一歩</b><span>${escapeHtml(item.step)}</span></div><button type="button" class="step-complete" aria-pressed="${!!item.stepDone}" aria-label="${item.stepDone?'次の一歩の完了を取り消す':'次の一歩を完了にする'}">${item.stepDone?'✓ 完了':'完了にする'}</button></div>`:''}${taskList.length?`<div class="task-progress"><span>実現ステップ</span><span>${taskDone}/${taskList.length} 完了</span><i><b style="width:${Math.round(taskDone/taskList.length*100)}%"></b></i></div>`:''}<div class="card-bottom"><span class="status ${escapeHtml(item.status)}">${labels[item.status]||'芽が出た'}</span><span class="card-date">${dateText(item.updated)}</span></div><button class="card-share" aria-label="共有設定">↗ ${item.shared?'共有済み':'共有する'}</button>`;
      card.addEventListener('click',e=>{if(e.target.closest('.step-complete')){e.stopPropagation();item.stepDone=!item.stepDone;item.updated=new Date().toISOString();persist();render();toast(item.stepDone?'次の一歩を完了しました':'完了を取り消しました');return;}if(e.target.closest('.favorite-button')){e.stopPropagation();item.favorite=!item.favorite;persist();render();return;}if(e.target.closest('.card-share')){e.stopPropagation();openShare(item);return;}openIdea(item.id);});
      card.addEventListener('keydown',e=>{if(e.target!==card)return;if(e.key==='Enter'||e.key===' '){e.preventDefault();openIdea(item.id);}});
      grid.append(card);
    });
    const empty=ideas.length===0;$('#empty-state').hidden=!empty;const hasConditions=!!query||currentFilter!=='all'||!!collectionFilter||currentView!=='all';if(empty){$('#empty-title').textContent=hasConditions?'条件に合うアイデアはありません':'最初のひらめきを書き留めよう';$('#empty-message').textContent=hasConditions?'検索語や絞り込み条件を変えてみてください。':'まとまっていなくても大丈夫。あとから一緒に形にできます。';$('#empty-new').hidden=hasConditions;$('#empty-reset').hidden=!hasConditions;}
    renderCollections();
  }
  function setActiveNav(){
    $$('.nav-item[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===currentView));
    $$('.filter').forEach(b=>b.classList.toggle('active',b.dataset.filter===currentFilter));
  }
  function openIdea(ideaId=null){
    const item=ideaId?state.ideas.find(x=>x.id===ideaId):null;activeIdea=item?.id||null;
    $('#form-title').textContent=item?'アイデアを編集する':'アイデアを記録する';$('#idea-id').value=item?.id||'';
    renderTaskEditor(Array.isArray(item?.tasks)?item.tasks:[]);$('#idea-name').value=item?.name||'';$('#idea-category').value=item?.category||'アプリ・Web';$('#idea-status').value=item?.status||'seed';$('#idea-description').value=item?.description||'';$('#idea-problem').value=item?.problem||'';$('#idea-impact').value=item?.impact||'';$('#idea-step').value=item?.step||'';$('#idea-needs').value=item?.needs||'';$('#idea-favorite').checked=!!item?.favorite;$('#idea-collection').value=item?.collection||'';$('#delete-idea').hidden=!item;ideaBaseline=ideaFormSnapshot();
    $('#idea-dialog').showModal();
  }
  function closeDialog(sel){$(sel).close();}
  function readTasks(includeEmpty=false){const tasks=[...$('#idea-task-list').querySelectorAll('.task-row')].map(row=>({text:row.querySelector('[data-task-text]').value.trim(),done:row.querySelector('[data-task-done]').checked}));return includeEmpty?tasks:tasks.filter(t=>t.text);}
  function renderTaskEditor(tasks=[]){const list=$('#idea-task-list');list.innerHTML='';tasks.forEach(task=>{const row=document.createElement('div');row.className='task-row'+(task.done?' is-done':'');const done=document.createElement('input');done.type='checkbox';done.checked=!!task.done;done.dataset.taskDone='';done.setAttribute('aria-label','完了にする');const text=document.createElement('input');text.type='text';text.value=task.text||'';text.maxLength=100;text.placeholder='例：使う人の声を3人に聞く';text.dataset.taskText='';text.setAttribute('aria-label','実現ステップ');const remove=document.createElement('button');remove.type='button';remove.textContent='×';remove.dataset.taskRemove='';remove.setAttribute('aria-label','この項目を削除');row.append(done,text,remove);list.append(row);});}
  function ideaFormSnapshot(){return JSON.stringify({tasks:readTasks(),name:$('#idea-name').value,category:$('#idea-category').value,status:$('#idea-status').value,description:$('#idea-description').value,problem:$('#idea-problem').value,impact:$('#idea-impact').value,step:$('#idea-step').value,needs:$('#idea-needs').value,collection:$('#idea-collection').value,favorite:$('#idea-favorite').checked});}
  function closeIdeaDialog(){if(ideaFormSnapshot()!==ideaBaseline&&!confirm('保存していない変更があります。破棄して閉じますか？'))return;closeDialog('#idea-dialog');}
  function saveIdea(e){
    e.preventDefault();const old=state.ideas.find(x=>x.id===$('#idea-id').value);const now=new Date().toISOString();
    const item={id:old?.id||id(),name:$('#idea-name').value.trim(),category:$('#idea-category').value,status:$('#idea-status').value,description:$('#idea-description').value.trim(),problem:$('#idea-problem').value.trim(),impact:$('#idea-impact').value.trim(),step:$('#idea-step').value.trim(),needs:$('#idea-needs').value.trim(),tasks:readTasks(),favorite:$('#idea-favorite').checked,collection:$('#idea-collection').value,shared:!!old?.shared,created:old?.created||now,updated:now};
    if(old)Object.assign(old,item);else state.ideas.unshift(item);persist();closeDialog('#idea-dialog');render();toast(old?'アイデアを更新しました':'アイデアを記録しました');
  }
  function deleteIdea(){
    const index=state.ideas.findIndex(x=>x.id===activeIdea),item=state.ideas[index];if(!item)return;
    if(!confirm(`「${item.name}」を削除しますか？`))return;
    if(undoDeletionTimer)clearTimeout(undoDeletionTimer);
    state.ideas.splice(index,1);pendingDeletion={item,index};persist();closeDialog('#idea-dialog');render();
    undoDeletionTimer=setTimeout(()=>{pendingDeletion=null;undoDeletionTimer=null;},7000);
    toast('アイデアを削除しました',{label:'元に戻す',run:undoDeletedIdea},7000);
  }
  function undoDeletedIdea(){
    if(!pendingDeletion)return;
    const {item,index}=pendingDeletion;
    if(!state.ideas.some(x=>x.id===item.id)){state.ideas.splice(Math.min(index,state.ideas.length),0,item);persist();render();toast('削除を取り消しました');}
    pendingDeletion=null;if(undoDeletionTimer)clearTimeout(undoDeletionTimer);undoDeletionTimer=null;
  }
  function openShare(item){activeIdea=item.id;$('#share-link-field').hidden=true;$('#share-link-output').value='';$('#share-feedback').textContent='';$('#share-title').value=item.name;$('#share-alias').value='';$('#share-area').value='';$('#share-redactions').value='';$('#share-mask-contacts').checked=true;$('#share-show-alias').checked=false;$('#share-show-area').checked=false;$$('[data-share]').forEach(c=>c.checked=['description','problem','impact','step','meta'].includes(c.dataset.share));$('#share-dialog').showModal();updatePreview();}
  function redact(value){
    let text=String(value||'');
    const words=$('#share-redactions').value.split(/[,、，]/).map(x=>x.trim()).filter(Boolean).sort((a,b)=>b.length-a.length);
    for(const word of words)text=text.replace(new RegExp(word.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'gi'),'［ぼかし］');
    if($('#share-mask-contacts').checked){
      text=text.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,'［メールアドレスをぼかし］');
      text=text.replace(/(?:https?:\/\/|www\.)[^\s　]+/gi,'［URLをぼかし］');
      text=text.replace(/(?:\+?81[-ー ]?)?0\d{1,4}[-ー ]?\d{1,4}[-ー ]?\d{3,4}/g,'［電話番号をぼかし］');
    }
    return text;
  }
  function selectedPayload(){
    const item=state.ideas.find(x=>x.id===activeIdea);if(!item)return null;
    const on=key=>$(`[data-share="${key}"]`).checked;
    return {v:1,name:redact($('#share-title').value.trim()||item.name),alias:$('#share-show-alias').checked?redact($('#share-alias').value.trim()):'',area:$('#share-show-area').checked?redact($('#share-area').value.trim()):'',category:on('meta')?item.category:'',status:on('meta')?(labels[item.status]||''):'',description:on('description')?redact(item.description):'',problem:on('problem')?redact(item.problem):'',impact:on('impact')?redact(item.impact):'',step:on('step')?redact(item.step):'',needs:on('needs')?redact(item.needs):''};
  }
  function updatePreview(){
    const p=selectedPayload();if(!p)return;const blocks=[['アイデアについて',p.description],['解決したいこと',p.problem],['実現したら',p.impact],['最初の一歩',p.step],['必要なもの・協力',p.needs]].filter(x=>x[1]);
    $('#share-preview').innerHTML=`${p.category?`<span class="preview-tag">${escapeHtml(p.category)}${p.status?' · '+escapeHtml(p.status):''}</span>`:''}<h3>${escapeHtml(p.name)}</h3><div class="preview-owner">${p.alias?escapeHtml(p.alias):'匿名のアイデア'}${p.area?' ・ '+escapeHtml(p.area):''}</div>${blocks.map(([title,text])=>`<div class="preview-block"><b>${title}</b><p>${escapeHtml(text)}</p></div>`).join('')||'<div class="preview-block"><p>選択された説明項目はありません。</p></div>'}`;
  }
  function sharedPayload(){try{const raw=location.hash.slice(7);const p=JSON.parse(decodeURIComponent(raw));if(p&&p.v===1&&typeof p.name==='string')return p;}catch(e){}return null;}
  function renderShared(){
    $('#home-view').hidden=true;$('#shared-view').hidden=false;const p=sharedPayload();
    if(!p){$('#shared-title').textContent='';$('#shared-owner').textContent='';$('#shared-content').innerHTML='<div class="shared-empty"><b>リンクを読み込めませんでした</b><p>共有リンクが途中で切れているか、形式が異なります。</p></div>';return;}
    $('#crumb-label').textContent='共有アイデア';$('#shared-title').textContent=p.name;$('#shared-owner').textContent=`${p.alias||'匿名のアイデア'}${p.area?' ・ '+p.area:''}`;
    const blocks=[['アイデアについて',p.description],['解決したいこと',p.problem],['実現したら',p.impact],['最初の一歩',p.step],['必要なもの・協力',p.needs]].filter(x=>typeof x[1]==='string'&&x[1].trim());
    $('#shared-content').innerHTML=`${p.category||p.status?`<div class="shared-meta">${p.category?`<span>${escapeHtml(p.category)}</span>`:''}${p.status?`<span>${escapeHtml(p.status)}</span>`:''}</div>`:''}${blocks.map(([title,text])=>`<div class="preview-block"><b>${title}</b><p>${escapeHtml(text)}</p></div>`).join('')||'<div class="shared-empty"><p>共有できる説明はまだありません。</p></div>'}`;
  }
  function makeShareUrl(){const p=selectedPayload();const encoded=encodeURIComponent(JSON.stringify(p));return location.href.split('#')[0]+'#share='+encoded;}
  async function copyShare(){const url=makeShareUrl(),field=$('#share-link-output');field.value=url;$('#share-link-field').hidden=false;try{if(!navigator.clipboard?.writeText)throw Error('clipboard unavailable');await navigator.clipboard.writeText(url);$('#share-feedback').textContent='共有リンクをコピーしました。送る前に、プレビューをもう一度確認してください。';const item=state.ideas.find(x=>x.id===activeIdea);if(item){item.shared=true;persist();render();}}catch(e){field.focus();field.select();$('#share-feedback').textContent='自動コピーできませんでした。表示されたリンクを長押ししてコピーしてください。';}}
  function downloadFile(name,data){const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}
  function exportData(){downloadFile('idea-atelier-backup.json',{version:1,exportedAt:new Date().toISOString(),...state});toast('バックアップを書き出しました');}
  function importData(file){const reader=new FileReader();reader.onload=()=>{try{const data=JSON.parse(reader.result);if(data&&data.v===1&&typeof data.name==='string'){
      if(!confirm(`共有された「${data.name}」をアイデア帳に追加しますか？`))return;
      const status=Object.entries(labels).find(([,label])=>label===data.status)?.[0]||'seed';const now=new Date().toISOString();
      state.ideas.unshift({id:id(),name:data.name,category:data.category||'その他',status,description:data.description||'',problem:data.problem||'',impact:data.impact||'',step:data.step||'',needs:data.needs||'',favorite:false,collection:'',shared:false,created:now,updated:now});persist();render();toast('共有アイデアを追加しました');return;
    }if(!Array.isArray(data.ideas))throw Error();const incomingCollections=Array.isArray(data.collections)?data.collections:[];const replaceMessage=`バックアップを読み込むと、現在のデータ（アイデア${state.ideas.length}件・コレクション${state.collections.length}件）は、読み込むデータ（アイデア${data.ideas.length}件・コレクション${incomingCollections.length}件）に置き換わります。取り消せません。先に現在のデータを書き出しておくと安心です。続けますか？`;if(!confirm(replaceMessage))return;state.ideas=data.ideas;state.collections=incomingCollections;persist();render();toast('データを読み込みました');}catch(e){alert('このファイルはアイデア帳の共有データまたはバックアップとして読み込めませんでした。');}};reader.readAsText(file);}
  function addCollection(e){e.preventDefault();const name=$('#collection-name').value.trim();if(!name)return;state.collections.push({id:id(),name});persist();$('#collection-dialog').close();$('#collection-name').value='';render();toast('コレクションを追加しました');}

  $$('.nav-item[data-view]').forEach(b=>b.addEventListener('click',()=>{if(location.hash.startsWith('#share='))location.hash='#home';currentView=b.dataset.view;collectionFilter='';setActiveNav();render();}));
  $$('.filter').forEach(b=>b.addEventListener('click',()=>{currentFilter=b.dataset.filter;setActiveNav();render();}));
  $('#new-idea').addEventListener('click',()=>openIdea());$('#empty-new').addEventListener('click',()=>openIdea());$('#idea-form').addEventListener('submit',saveIdea);
  $$('.close-dialog').forEach(b=>b.addEventListener('click',closeIdeaDialog));$('#idea-dialog').addEventListener('cancel',e=>{e.preventDefault();closeIdeaDialog();});$('#delete-idea').addEventListener('click',deleteIdea);
  $('#add-task').addEventListener('click',()=>{const tasks=readTasks(true);tasks.push({text:'',done:false});renderTaskEditor(tasks);$('#idea-task-list .task-row:last-child [data-task-text]').focus();});$('#idea-task-list').addEventListener('change',e=>{if(e.target.matches('[data-task-done]'))e.target.closest('.task-row').classList.toggle('is-done',e.target.checked);});$('#idea-task-list').addEventListener('click',e=>{if(e.target.closest('[data-task-remove]')){const rows=[...$('#idea-task-list').querySelectorAll('.task-row')],index=rows.indexOf(e.target.closest('.task-row')),tasks=readTasks(true);tasks.splice(index,1);renderTaskEditor(tasks);}});$('#search').addEventListener('input',render);$('#clear-search').addEventListener('click',()=>{$('#search').value='';$('#search').focus();render();});$('#mobile-collection-filter').addEventListener('change',e=>{collectionFilter=e.target.value;currentView='all';setActiveNav();render();});$('#mobile-add-collection').addEventListener('click',()=>$('#collection-dialog').showModal());$('#empty-reset').addEventListener('click',()=>{$('#search').value='';currentView='all';currentFilter='all';collectionFilter='';setActiveNav();render();});$('.avatar').addEventListener('click',()=>$('#settings-dialog').showModal());$('#close-settings').addEventListener('click',()=>$('#settings-dialog').close());$('#settings-export').addEventListener('click',()=>{$('#settings-dialog').close();exportData();});$('#settings-import').addEventListener('click',()=>{$('#settings-dialog').close();$('#file-input').click();});$('#settings-collection').addEventListener('click',()=>{$('#settings-dialog').close();$('#collection-dialog').showModal();});$('#sort-button').addEventListener('click',()=>{sortNewest=!sortNewest;$('#sort-button').textContent=sortNewest?'最近更新した順⌄':'古い順⌃';render();});
  $('#add-collection').addEventListener('click',()=>$('#collection-dialog').showModal());$$('.close-collection').forEach(b=>b.addEventListener('click',()=>$('#collection-dialog').close()));$('#collection-form').addEventListener('submit',addCollection);
  $('#export-data').addEventListener('click',exportData);$('#import-data').addEventListener('click',()=>$('#file-input').click());$('#file-input').addEventListener('change',e=>{if(e.target.files[0])importData(e.target.files[0]);e.target.value='';});
  $$('.close-share').forEach(b=>b.addEventListener('click',()=>$('#share-dialog').close()));$$('[data-share],#share-show-alias,#share-show-area,#share-alias,#share-area,#share-title,#share-redactions,#share-mask-contacts').forEach(el=>el.addEventListener('input',updatePreview));$$('[data-share],#share-show-alias,#share-show-area,#share-mask-contacts').forEach(el=>el.addEventListener('change',updatePreview));
  $('#copy-share').addEventListener('click',copyShare);$('#download-share').addEventListener('click',()=>{const p=selectedPayload();downloadFile('idea-share.json',p);$('#share-feedback').textContent='選択した内容だけの共有データを保存しました。';});
  window.addEventListener('hashchange',render);renderCollections();render();
})();
