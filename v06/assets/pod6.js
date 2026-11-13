/* V06 Dispatch proof of delivery: gallery, lightbox, route tab, map thumbs, filters. Sample images only. */
(function(){
const C=window.CX,V=window.V5,O=window.CXO,esc=V.esc,ic=V.ic,$=s=>document.querySelector(s);
function pod(t){return O&&O.podOf?O.podOf(t):t&&t.pod}
function fmt(at){return C&&C.fmt?C.fmt(at):at}
function canSee(){return !window.CXA||CXA.can('dispatch.view')}

function gallery(t){const p=pod(t);if(!p||!canSee())return '';
  const photos=p.photos||[];
  const miss=[];if(!p.photo)miss.push('photo');if(!p.signature&&!p.signatureImg)miss.push('signature');if(p.far)miss.push('far from address');
  return `<div class="d5-pod" id="d5pod">
    <h4>Proof of delivery</h4>
    ${miss.length?`<div class="chip warn">Missing ${esc(miss.join(' · '))}</div>`:''}
    ${photos.length?`<div class="d5-pgal">${photos.map((ph,i)=>`<button type="button" data-a="podlb" data-v="${esc(t.id)}" data-i="${i}" title="${esc(ph.label||ph.kind)}"><img alt="${esc(ph.label||'POD')}" src="${ph.src}"><span class="k">${esc(ph.kind||'photo')}</span></button>`).join('')}</div>`:'<div class="small t3">No photos on file.</div>'}
    ${p.signatureImg||p.signer?`<div class="d5-sig">${p.signatureImg?`<img alt="Signature" src="${p.signatureImg}">`:''}<div><b>${esc(p.signer||'Signed')}</b><div class="small t3">Signature${p.signer?' · '+esc(p.signer):''}</div></div></div>`:'<div class="small t3">No signature on file.</div>'}
    <div class="d5-kv">
      <div><b>${esc(p.placement||'—')}</b><span>Left at</span></div>
      <div><b>${p.at?esc(fmt(p.at)):'—'}</b><span>Timestamp</span></div>
      <div><b>${esc(p.scan||'—')}</b><span>Scan</span></div>
    </div>
    <div class="d5-kv">
      <div><b>${p.distanceFt!=null?p.distanceFt+' ft':'—'}</b><span>Drop vs address</span></div>
      <div><b>${p.far?'Far from address':'At the pin'}</b><span>GPS check</span></div>
    </div>
    ${p.notes?`<div class="card pad small"><b>Driver notes</b><br>${esc(p.notes)}</div>`:''}
  </div>`}

function routePod(wid){const tasks=(O.routeTasks?O.routeTasks(wid):C.route(wid)).filter(t=>t.state==='completed'||t.state==='failed');
  if(!tasks.length)return '<div class="empty">No delivered stops on this route yet.</div>';
  return `<div class="d5-podt">${tasks.map(t=>{const p=pod(t)||{},th=(p.photos&&p.photos[0]&&p.photos[0].src)||'';
    return `<button type="button" class="row" data-a="stop" data-v="${t.id}"><img alt="" src="${th||''}" style="${th?'':'background:var(--s3)'}">${!th?'':''}<span class="grow"><b>${esc(t.name)}</b><div class="small t3">${esc((p.placement||t.state)+' · '+(p.signer||'no signature'))}${p.far?' · far':''}</div></span></button>`}).join('')}</div>`}

let lb=null,lbList=[],lbI=0;
function openLb(list,i){lbList=list||[];lbI=i||0;drawLb()}
function drawLb(){const ph=lbList[lbI];if(!ph){closeLb();return}
  if(!lb){lb=document.createElement('div');lb.className='d5-lb';lb.id='d5lb';document.body.appendChild(lb)
    lb.addEventListener('click',e=>{if(e.target.closest('.prev')){lbI=(lbI-1+lbList.length)%lbList.length;drawLb()}
      else if(e.target.closest('.next')){lbI=(lbI+1)%lbList.length;drawLb()}
      else if(e.target.closest('.x')||e.target===lb)closeLb()});
    lb.addEventListener('touchstart',e=>{lb._x=e.touches[0].clientX},{passive:true});
    lb.addEventListener('touchend',e=>{if(lb._x==null)return;const dx=e.changedTouches[0].clientX-lb._x;lb._x=null;if(Math.abs(dx)>40){lbI=(lbI+(dx<0?1:-1)+lbList.length)%lbList.length;drawLb()}})}
  lb.innerHTML=`<button class="x" aria-label="Close">${ic('x',20)}</button>${lbList.length>1?`<button class="nav prev" aria-label="Previous">${ic('back',18)}</button><button class="nav next" aria-label="Next">${ic('chev',18)}</button>`:''}<img alt="${esc(ph.label||'POD')}" src="${ph.src}"><div class="cap">${esc(ph.label||ph.kind||'Photo')}${ph.at?' · '+esc(fmt(ph.at)):''} · ${lbI+1} of ${lbList.length}</div>`}
function closeLb(){if(lb){lb.remove();lb=null}lbList=[]}
document.addEventListener('keydown',e=>{if(!lb)return;if(e.key==='Escape')closeLb();if(e.key==='ArrowRight'){lbI=(lbI+1)%lbList.length;drawLb()}if(e.key==='ArrowLeft'){lbI=(lbI-1+lbList.length)%lbList.length;drawLb()}});

function tools(){const ui=__v5d&&__v5d.ui||{};
  const on=!!ui.showPod,f=ui.podFilter||'';
  return `<button class="${on?'podon':''}" data-a="showpod" title="Pin delivered stops with their photos">Show POD</button>
    <div class="d5-podf"${on?'':' hidden'}>
      <button class="${!f?'on':''}" data-a="podf" data-v="">All POD</button>
      <button class="${f==='photo'?'on':''}" data-a="podf" data-v="photo" title="Missing a delivery photo">Missing photo</button>
      <button class="${f==='signature'?'on':''}" data-a="podf" data-v="signature" title="Missing a signature">Missing signature</button>
      <button class="${f==='far'?'on':''}" data-a="podf" data-v="far" title="Drop pin is far from the address">Far from address</button>
    </div>`}

function injectTools(){const box=$('#d5styles');if(!box||box.querySelector('[data-a=showpod]'))return;
  box.insertAdjacentHTML('beforeend',tools())}

function hideRouteStops(on){const el=$('#d5insp')||document;const micro=[...el.querySelectorAll('.micro')].find(x=>/Stops|Route ·/.test(x.textContent||''));
  let n=micro&&micro.nextElementSibling;while(n){const nx=n.nextElementSibling;if(n.id==='d5podtab')break;n.hidden=!!on;n=nx}if(micro)micro.hidden=!!on}
function paintPodInto(el,s){if(!el||!s||!canSee())return;
  if(s.t==='stop'){const t=C.task(s.id)||(O.allTasks&&O.allTasks().find(x=>x.id===s.id));if(!t)return;
    if((t.state==='completed'||t.state==='failed'||t.pod)&&!el.querySelector('#d5pod')){
      const host=el.querySelector('.d5-ib,.x-pb')||el;const old=[...host.querySelectorAll('.card.pad.small')].find(x=>/Proof of delivery/.test(x.textContent||''));if(old)old.remove();
      host.insertAdjacentHTML('beforeend',gallery(t));
    }}
  if((s.t==='drv'||s.t==='rte')&&!el.querySelector('#d5podtab')){
    const host=el.querySelector('.d5-ib,.x-pb')||el;
    const tab=`<div id="d5podtab" style="margin-top:8px"><div class="seg" style="width:100%"><button class="${(__v5d.ui.rteTab||'stats')==='stats'?'on':''}" data-a="rtetab" data-v="stats">Route</button><button class="${__v5d.ui.rteTab==='pod'?'on':''}" data-a="rtetab" data-v="pod">POD</button></div>
      <div id="d5podtbody" style="margin-top:8px">${__v5d.ui.rteTab==='pod'?routePod(s.id):''}</div></div>`;
    host.insertAdjacentHTML('beforeend',tab);
  }
  if(s.t==='drv'||s.t==='rte')hideRouteStops(__v5d.ui.rteTab==='pod');
}
function decorateInsp(){if(!canSee()||!__v5d)return;const s=__v5d.ui.sel;if(!s)return;
  const el=$('#d5insp');if(el&&!el.hidden)paintPodInto(el,s);
  const pan=$('#x-panel');if(pan&&pan.classList.contains('on'))paintPodInto(pan,s);
}

function addPodPins(data){if(!__v5d||!__v5d.ui||(!__v5d.ui.showPod&&!__v5d.ui.podFilter))return data;
  const f=__v5d.ui.podFilter||'';
  (O.allTasks?O.allTasks():C.S.tasks).forEach(t=>{
    if(t.state!=='completed'&&t.state!=='failed')return;
    if(window.CXA&&!CXA.inHub(t))return;
    const p=pod(t);if(!p)return;
    if(f&&O.podIssues&&!O.podIssues(t,f))return;
    const thumb=(p.photos[0]&&p.photos[0].src)||'';
    if(t.ll)data.pins.push({ll:t.ll,label:'',color:'#fff',id:t.id,cls:'pod'+(p.far?' far':''),title:(t.name+' · '+(p.placement||'POD')+(p.far?' · far from address':'')),onClick:()=>{__v5d.act('stop',t.id)},thumb});
    if(p.dropLL){data.pins.push({ll:p.dropLL,label:'',color:'#3B82F6',id:t.id+'-drop',cls:'drop',title:'Drop pin · '+(p.distanceFt||0)+' ft from address',onClick:()=>{__v5d.act('stop',t.id)}});
      if(t.ll)data.lines.push({coords:[t.ll,p.dropLL],color:p.far?'#F5B544':'#3B82F6',width:1.5,opacity:.7})}
  });
  return data}

/* wrap map.set so thumbs apply after render */
function hookMap(){const map=__v5d&&__v5d.map;if(!map||map._pod)return;map._pod=1;
  const _set=map.set.bind(map);
  map.set=function(d,fit){const data=addPodPins({pins:(d.pins||[]).slice(),lines:(d.lines||[]).slice()});
    const r=_set(data,fit);
    requestAnimationFrame(()=>{(data.pins||[]).forEach(p=>{if(!p.thumb)return;const el=(map.el||document).querySelector('.mk.pod[data-id="'+p.id+'"], .mk[data-id="'+p.id+'"]');if(el){el.style.backgroundImage='url("'+p.thumb+'")';el.style.backgroundSize='cover';el.classList.add('pod')}})});
    return r}}

const _after=window.__d5after;
window.__d5after=function(){if(_after)_after();injectTools();decorateInsp();hookMap()};

const _act=window.__d5act;
window.__d5act=function(a,v,el){
  if(a==='showpod'){__v5d.ui.showPod=!__v5d.ui.showPod;if(!__v5d.ui.showPod)__v5d.ui.podFilter='';__v5d.save();__v5d.draw();return}
  if(a==='podf'){__v5d.ui.podFilter=v||'';__v5d.ui.showPod=true;__v5d.save();__v5d.draw();return}
  if(a==='rtetab'){__v5d.ui.rteTab=v;document.querySelectorAll('#d5podtab #d5podtbody, #x-panel #d5podtbody').forEach(b=>{b.innerHTML=v==='pod'?routePod(__v5d.ui.sel&&__v5d.ui.sel.id):''});
    document.querySelectorAll('#d5podtab .seg button').forEach(x=>x.classList.toggle('on',x.dataset.v===v));hideRouteStops(v==='pod');return}
  if(a==='podlb'){const t=C.task(v)||(O.allTasks&&O.allTasks().find(x=>x.id===v));const p=pod(t);if(p)openLb(p.photos,+(el&&el.dataset.i||0));return}
  if(_act)return _act(a,v,el)};

/* first paint if dispatch already drew */
if(window.__v5d&&!__v5d._podWrap){__v5d._podWrap=1;const _i=__v5d.inspHTML;__v5d.inspHTML=function(){let h=_i.apply(this,arguments);const s=__v5d.ui.sel;if(!s||!canSee())return h;
  if(s.t==='stop'){const t=C.task(s.id)||(O.allTasks&&O.allTasks().find(x=>x.id===s.id));if(t&&(t.state==='completed'||t.state==='failed'||t.pod)){h=h.replace(/<div class="card pad small"><b>Proof of delivery<\/b>[\s\S]*?<\/div>/,'');if(!/id="d5pod"/.test(h))h+=gallery(t)}}
  if((s.t==='drv'||s.t==='rte')&&!/id="d5podtab"/.test(h))h+=`<div id="d5podtab" style="margin-top:8px"><div class="seg" style="width:100%"><button class="${(__v5d.ui.rteTab||'stats')==='stats'?'on':''}" data-a="rtetab" data-v="stats">Route</button><button class="${__v5d.ui.rteTab==='pod'?'on':''}" data-a="rtetab" data-v="pod">POD</button></div><div id="d5podtbody" style="margin-top:8px">${__v5d.ui.rteTab==='pod'?routePod(s.id):''}</div></div>`;
  return h}}
try{if(window.__v5d){injectTools();decorateInsp();hookMap();if(__v5d.map&&__v5d.map.data)__v5d.map.set(__v5d.map.data||__v5d.mapData(),false)}}catch(e){}

window.__pod6={gallery,routePod,openLb,closeLb,pod};
})();
