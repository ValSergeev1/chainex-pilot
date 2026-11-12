/* ChainEx V02 · Driver app chat panel "ChainEx Dispatch" (AI bot + dispatcher). Pilot: rule-based. */
(function(){const C=CX,esc=C.esc,$=s=>document.querySelector(s);if(!window.__drv||!C.dlink)return;
const W=()=>__drv.ui.wid,I=C.dlink.ISSUES;let open=false,stopSel=null,lastSeen=+sessionStorage.getItem('cx.chat.seen')||0;
function phone(){return $('#phone')}
function thread(){return (C.S.msgs||[]).filter(m=>m.wid===W())}
function unread(){return thread().filter(m=>!m.readDriver).length}
function tkCard(id){const t=(C.S.tickets||[]).find(x=>x.id===id);if(!t)return '';const col={applied:'ok',approved:'ok',pending:'pend',declined:'rev'}[t.status];return `<div class="cc-tk ${col}" data-tk="${t.id}"><b>${esc(t.id)}</b> · ${esc({applied:'Fixed in your route',approved:'Approved by Dispatch',pending:'Waiting for Dispatch',declined:'Declined by Dispatch'}[t.status])}<ul>${t.fixes.map(f=>`<li class="${f.status}">${f.status==='applied'?'✓':f.status==='pending'?'…':f.status==='declined'?'✕':'!'} ${esc(f.desc)}</li>`).join('')}</ul></div>`}
function html(){const d=C.driver(W());if(!d)return `<div class="cc-h"><b>ChainEx Dispatch</b><button data-cc="x">✕</button></div><div class="cc-b"><p class="hint">Sign in to chat with Dispatch.</p></div>`;
 const stops=C.route(W());if(stopSel&&!stops.find(t=>t.id===stopSel))stopSel=null;
 return `<div class="cc-h"><span class="cc-av">CX</span><div><b>ChainEx Dispatch</b><small>AI assistant + dispatcher on duty · ${esc(C.lines[d.line].name)}</small></div><button data-cc="x" aria-label="Close">✕</button></div>
 <div class="cc-b" id="ccBody">${thread().length?'':`<div class="cc-m bot"><div>Hi ${esc(d.name.split(' ')[0])}, tell me what's going on. I can fix simple things in your route right away and send anything that affects other drivers or customers to your dispatcher for one-click approval.</div></div>`}
 ${thread().map(m=>`<div class="cc-m ${m.from}"><div>${m.from!=='driver'?`<small>${m.from==='bot'?'ChainEx Dispatch bot':esc(m.actor||'Dispatch')}</small>`:''}${esc(m.text).replace(/\n/g,'<br>')}${m.ticket&&m.from==='bot'?tkCard(m.ticket):''}</div><time>${C.fmt(m.at)}</time></div>`).join('')}</div>
 <div class="cc-q"><select id="ccStop" aria-label="Stop"><option value="">Current stop${stops[0]?' · '+esc(stops[0].name):''}</option>${stops.map(t=>`<option value="${t.id}"${stopSel===t.id?' selected':''}>${esc(t.name)}</option>`).join('')}</select><div class="cc-chips">${Object.entries(I).filter(([k])=>k!=='other').map(([k,v])=>`<button data-issue="${k}">${v.icon} ${esc(v.label)}</button>`).join('')}</div></div>
 <form class="cc-in" id="ccForm"><input id="ccText" placeholder="Describe the issue or message Dispatch…" autocomplete="off"><button class="btn primary" id="ccSend">Send</button></form>`}
function ensureEl(){let el=$('#cxchat');if(!el){el=document.createElement('div');el.id='cxchat';el.className='cxchat';phone().appendChild(el)}return el}
function draw(){if(!open)return;const el=ensureEl();const keep=$('#ccText')&&$('#ccText').value;el.innerHTML=html();el.classList.add('show');if(keep)$('#ccText').value=keep;const b=$('#ccBody');if(b)b.scrollTop=b.scrollHeight;if(unread())setTimeout(()=>C.update(()=>C.ops.msgRead(W(),'driver')),0)}
function show(){if(!W()){C.toast('Sign in first');return}open=true;draw();fab()}
function hide(){open=false;const el=$('#cxchat');if(el)el.classList.remove('show');fab()}
function fab(){const p=phone();if(!p)return;let b=$('#ccFab');const d=W()&&C.driver(W());if(!d||__drv.ui.screen==='welcome'){b&&b.remove();return}if(!b){b=document.createElement('button');b.id='ccFab';b.className='cc-fab';b.title='ChainEx Dispatch';p.appendChild(b);b.onclick=show}const n=unread();b.innerHTML=`💬<span>Dispatch</span>${n&&!open?`<i>${n}</i>`:''}`;b.hidden=open;
 const note=d.route.botNote;if(note&&!note.seen){C.update(()=>C.ops.botNoteSeen(W()));const t=(C.S.tickets||[]).find(x=>x.id===note.id);__drv.toast?0:0;const pt=$('#ptoast');if(pt){pt.className='ptoast show'+(note.status==='approved'?' ok':' bad');pt.textContent=(note.status==='approved'?'✓ Dispatch approved ':'Dispatch declined ')+(t?t.label.toLowerCase():'your request');clearTimeout(pt._t);pt._t=setTimeout(()=>pt.classList.remove('show'),2600)}}}
function send(kind){const txt=($('#ccText')||{}).value||'';const st=($('#ccStop')||{}).value||null;if(!kind&&!txt.trim())return;let tk;C.update(()=>{if(txt.trim()&&!kind)C.ops.msgSend(W(),'driver',txt.trim());else C.ops.msgSend(W(),'driver',I[kind].label+(st?' · '+C.task(st).name:'')+(txt.trim()?' — '+txt.trim():''));tk=C.ops.botIssue(W(),kind||null,st,txt)});if($('#ccText'))$('#ccText').value='';draw();return tk}
document.addEventListener('click',e=>{const t=e.target.closest&&e.target.closest('[data-a="msgdisp"],[data-cc],[data-issue]');if(!t)return;if(t.dataset.a==='msgdisp'){e.preventDefault();e.stopImmediatePropagation();show();return}if(t.dataset.cc==='x'){hide();return}if(t.dataset.issue){send(t.dataset.issue)}},true);
document.addEventListener('submit',e=>{if(e.target.id==='ccForm'){e.preventDefault();send(null)}});
document.addEventListener('change',e=>{if(e.target.id==='ccStop')stopSel=e.target.value||null});
C.subscribe(()=>setTimeout(()=>{fab();if(open){const ae=document.activeElement;if(ae&&ae.id==='ccText'){/* keep typing, refresh thread only */const b=$('#ccBody');if(b){const tmp=document.createElement('div');tmp.innerHTML=html();b.innerHTML=tmp.querySelector('#ccBody').innerHTML;b.scrollTop=b.scrollHeight}}else draw()}},0));
new MutationObserver(()=>{if(!$('#ccFab'))fab()}).observe(phone(),{childList:true});
setTimeout(fab,50);
window.__chat={show,hide,send,get open(){return open}};
})();
