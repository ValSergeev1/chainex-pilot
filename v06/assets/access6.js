/* ChainEx V06 · access, hubs and role locks. Sample staff only. Does not change V03 session.js.
   Admin uses everything. Other roles still SEE every control; locked ones are dimmed and say "Access restricted, ask an admin."
   Hub scope: a member assigned to a hub only sees that hub's work. Admin and Middle mile see every hub plus inter-hub moves. */
(function(){
const KEY='cx.v06.access';
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c]);
const HUBS=[
  {id:'sea',name:'Seattle / Kent',short:'SEA',city:'Kent',ll:[-122.233,47.418],facilities:['BEL1','SEA1','KNTB','WGH','KNT','KNT-DC','SEA-SODO','BEL-WH']},
  {id:'tac',name:'Tacoma',short:'TAC',city:'Tacoma',ll:[-122.444,47.252],facilities:['TAC1']},
  {id:'evt',name:'Everett',short:'EVT',city:'Everett',ll:[-122.248,47.922],facilities:['EVT-WH','EVT1']},
  {id:'pdx',name:'Portland',short:'PDX',city:'Portland',ll:[-122.676,45.515],facilities:['PDX1']}
];
const HMAP={};HUBS.forEach(h=>h.facilities.forEach(f=>HMAP[f]=h.id));
function opHub(x){if(!x)return 'sea';if(x.opHub&&HUBS.some(h=>h.id===x.opHub))return x.opHub;const raw=x.hub||x.hubId||(x.x&&x.x.hub)||'';return HMAP[raw]||HMAP[String(raw).toUpperCase()]||'sea'}

const ACTIONS=[
  ['dispatch.view','View the dispatch board'],['dispatch.edit','Edit routes and stops'],['stop.add','Add a stop'],['stop.edit','Edit a stop'],['stop.move','Move or drag a stop'],['stop.delete','Delete a stop'],
  ['route.add','Create a route'],['route.edit','Edit a route'],['route.delete','Delete a route'],['route.split','Split a route'],['route.merge','Merge routes'],['route.optimize','Optimize or reorder a route'],
  ['route.draw','Draw or lasso routes on the map'],['route.autobuild','Auto-build routes'],['route.assign','Assign a driver or vehicle'],
  ['order.create','Create an order or work order'],['import.batch','Batch import and scan reports'],['settings.edit','Edit dispatch settings'],
  ['dashboard.view','View the control tower'],['partners.view','View the partner directory'],['partners.edit','Add partners and change files'],['partners.remind','Queue setup reminders'],
  ['agreements.draft','Prepare agreement drafts'],['recruiting.view','View recruiting'],['recruiting.edit','Move recruiting candidates'],
  ['payments.setup','View payment setup records'],['admin.access','Configure roles, hubs and intake'],['midmile.view','View middle-mile and inter-hub moves'],['copilot.use','Use Copilot drafts']
];

/* family = the V06 role the user asked for. Existing CXS roles map onto a family. */
const FAMILY={
  'Admin':'admin','Ops manager':'dispatcher','P&D team':'dispatcher','Bulky team':'dispatcher','White glove team':'dispatcher','LTL team':'dispatcher','Shuttle team':'middle-mile',
  'Middle mile':'middle-mile','Dispatcher':'dispatcher','Warehouse':'warehouse','Onboarding':'recruiting','Recruiting':'recruiting','Finance':'finance','Sales':'sales','Viewer':'viewer'
};
const ALLHUBS=HUBS.map(h=>h.id);
const GRANT={
  admin:['*'],
  'middle-mile':['dispatch.view','dispatch.edit','stop.add','stop.edit','stop.move','route.add','route.edit','route.optimize','route.assign','order.create','import.batch','dashboard.view','partners.view','midmile.view','copilot.use'],
  dispatcher:['dispatch.view','dispatch.edit','stop.add','stop.edit','stop.move','stop.delete','route.add','route.edit','route.delete','route.split','route.merge','route.optimize','route.draw','route.autobuild','route.assign','order.create','import.batch','settings.edit','dashboard.view','partners.view','copilot.use'],
  warehouse:['dispatch.view','import.batch','dashboard.view','partners.view'],
  finance:['dashboard.view','partners.view','payments.setup','copilot.use'],
  sales:['dashboard.view','partners.view','agreements.draft','copilot.use'],
  recruiting:['dashboard.view','partners.view','partners.edit','partners.remind','agreements.draft','recruiting.view','recruiting.edit','copilot.use'],
  viewer:['dispatch.view','dashboard.view','partners.view','recruiting.view']
};
/* Who may see all hubs (and the middle-mile layer) by default. */
const SEE_ALL={admin:1,'middle-mile':1};

const EXTRA_STAFF=[
  {kind:'staff',id:'midmile@chainex.example',email:'midmile@chainex.example',name:'Riley Chen',role:'Middle mile',lines:['shuttle','ltl'],hub:'all'},
  {kind:'staff',id:'warehouse@chainex.example',email:'warehouse@chainex.example',name:'Jamie Cole',role:'Warehouse',lines:[],hub:'sea'},
  {kind:'staff',id:'recruiting@chainex.example',email:'recruiting@chainex.example',name:'Priya Shah',role:'Recruiting',lines:[],hub:'sea'},
  {kind:'staff',id:'tac.dispatch@chainex.example',email:'tac.dispatch@chainex.example',name:'Alex Rivera',role:'Dispatcher',lines:['pd','bulky'],hub:'tac'},
  {kind:'staff',id:'evt.dispatch@chainex.example',email:'evt.dispatch@chainex.example',name:'Jordan Park',role:'Dispatcher',lines:['pd','bulky'],hub:'evt'},
  {kind:'staff',id:'pdx.dispatch@chainex.example',email:'pdx.dispatch@chainex.example',name:'Morgan Blake',role:'Dispatcher',lines:['pd','bulky'],hub:'pdx'}
];
const DEFAULT_HUB={
  'Admin':'all','Ops manager':'all','Middle mile':'all','Shuttle team':'all',
  'P&D team':'sea','Bulky team':'sea','White glove team':'sea','LTL team':'sea',
  'Dispatcher':'sea','Warehouse':'sea','Onboarding':'sea','Recruiting':'sea','Finance':'sea','Sales':'sea','Viewer':'sea'
};

function load(){try{return JSON.parse(localStorage.getItem(KEY)||'{}')}catch(e){return {}}}
function save(x){localStorage.setItem(KEY,JSON.stringify(x))}
function state(){const s=load();s.members=s.members||{};s.viewHub=s.viewHub||null;return s}

function installRoles(){if(!window.CXS)return;if(!CXS._v06wrap){CXS._v06wrap=1;const _can=CXS.can.bind(CXS);CXS.can=function(perm,s){if(_can(perm,s))return true;try{return !!(window.CXA&&ACTIONS.some(a=>a[0]===perm)&&can(perm,s))}catch(e){return false}}}
  const R=CXS.ROLES;
  if(!R['Middle mile'])R['Middle mile']={lines:['shuttle','ltl'],desc:'Linehaul and carrier moves between hubs. Sees every hub.',perms:['dispatch','dispatch.all','reopt','dashboard','scorecards']};
  if(!R['Warehouse'])R['Warehouse']={lines:[],desc:'Warehouse and scan reports for their hub.',perms:['dashboard']};
  if(!R['Recruiting'])R['Recruiting']={lines:[],desc:'Hiring pipeline and partner setup.',perms:['dashboard','onboarding']};
  if(!R['Dispatcher'])R['Dispatcher']={lines:['pd','bulky','wg','ltl'],desc:'Last-mile dispatch for an assigned hub.',perms:['dispatch','reopt','scorecards.own']};
  EXTRA_STAFF.forEach(a=>{if(!CXS.STAFF.some(x=>x.id===a.id)){CXS.STAFF.push(a);CXS.ACCOUNTS.push(a)}});
}

function familyOf(role){return FAMILY[role]||'viewer'}
function rec(st){st=st||(window.CXS&&CXS.staff());if(!st)return {hub:'sea',allHubs:false,family:'viewer',perms:{}};
  const s=state(),id=st.email||st.id,row=s.members[id]||{};
  const fam=row.family||familyOf(st.role);
  const accountHub=(st.hub&&st.hub!=='all')?st.hub:null;
  const defHub=row.hub||accountHub||DEFAULT_HUB[st.role]||'sea';
  const all=row.allHubs!=null?!!row.allHubs:((st.hub==='all')||DEFAULT_HUB[st.role]==='all'||!!SEE_ALL[fam]);
  const base=GRANT[fam]||GRANT.viewer;
  const perms=Object.assign({},row.perms||{});
  return {id,name:st.name,role:st.role,family:fam,hub:defHub,allHubs:all,perms,base,lines:st.lines||[]}}

function can(action,st){
  const r=rec(st);
  if(r.base.includes('*')||r.perms[action]===true)return true;
  if(r.perms[action]===false)return false;
  return r.base.includes(action);
}
function canAllHubs(st){return rec(st).allHubs}
function homeHub(st){const r=rec(st);return r.hub==='all'?'sea':r.hub}
function viewHub(st){
  const r=rec(st);if(!r.allHubs)return r.hub;
  const s=state();
  return s.viewHub&&s.viewHub!=='all'&&HUBS.some(h=>h.id===s.viewHub)?s.viewHub:(s.viewHub==='all'||!s.viewHub?'all':s.viewHub);
}
function setViewHub(id){const s=state();s.viewHub=id||'all';save(s);window.dispatchEvent(new CustomEvent('cx-hub',{detail:id}));try{if(window.__v5d)__v5d.draw();else if(window.__v5db&&__v5db.draw)__v5db.draw()}catch(e){}}
function setMember(id,patch,actor){const s=state();s.members[id]=Object.assign({},s.members[id]||{},patch);save(s);
  try{const C=window.CX;C&&C.update&&C.update(S=>{(S.audit=S.audit||[]).unshift({at:'now',actor:actor||'Admin',action:'Access updated',target:id,detail:JSON.stringify(patch),area:'admin'})})}catch(e){}}
function inHub(x,st){if(!x)return false;const vh=viewHub(st);if(vh==='all'||canAllHubs(st)&&vh==='all')return true;return opHub(x)===vh}
function filter(list,st){const vh=viewHub(st);if(vh==='all')return list.slice();return list.filter(x=>opHub(x)===vh)}

const MSG='Access restricted, ask an admin.';
function deny(action){if(window.V5){V5.toast(MSG,'lock');V5.panel('Access restricted',`<p style="margin:0 0 10px">This action is limited to another role. Ask an admin if you need it.</p>${action?`<div class="small t3">Needed: <b>${esc((ACTIONS.find(a=>a[0]===action)||[action,action])[1])}</b></div>`:''}`,{icon:'lock'});}else alert(MSG)}
function locked(label){const ic=window.V5?V5.ic('lock',13):'';return `<button type="button" class="btn sm x-locked" data-restricted="1" aria-label="${esc(MSG)}">${ic}<span>${label}</span></button>`}
function actBtn(action,inner,cls,attrs){if(can(action))return `<button type="button" class="${cls||'btn sm'}" ${attrs||''}>${inner}</button>`;
  return `<button type="button" class="${cls||'btn sm'} x-locked" data-restricted="1" data-need="${esc(action)}" ${attrs||''} aria-label="${esc(MSG)}">${window.V5?V5.ic('lock',13):''}<span>${inner.replace(/<svg[\s\S]*?<\/svg>/g,'')}</span></button>`}

document.addEventListener('click',e=>{const b=e.target.closest('[data-restricted],.x-locked');if(!b)return;e.preventDefault();e.stopPropagation();deny(b.dataset.need)},true);

function workspaces(){return [
  ['dashboard.html','Dashboard','Today\'s operations and partner work.'],
  ['dispatch.html','Dispatch','Routes, stops and driver assignments.'],
  ['bids.html','Bids','Opportunities and proposal documents.'],
  ['sales.html','Sales','Customer accounts and outreach.']
]}
function workspaceMenu(){const here=(location.pathname.split('/').pop()||'');
  return `<div class="x-ws">${workspaces().map(([h,l,s])=>`<a class="x-wsi${here===h?' on':''}" href="${h}"><b>${esc(l)}</b><span>${esc(s)}</span></a>`).join('')}</div>`}
function openWorkspaces(){if(window.V5)V5.panel('Switch workspace',workspaceMenu(),{icon:'grid',kind:'ws'})}
function openCopilot(){
  if(!can('copilot.use'))return deny('copilot.use');
  const C=window.CX,A=window.CXA,m=C&&C.portal&&C.portal.metrics&&C.portal.metrics();
  const n=m?(m.openQueue||0):0,blocked=m&&m.blocked?m.blocked.length:0;
  const drafts=[
    n?`Draft: ${n} partner file${n>1?'s':''} still need a team next step. I can queue a reminder for the owners, for you to review before anything is sent.`:'Draft: No partner files are waiting on the team this morning.',
    blocked?`Draft: ${blocked} driver${blocked>1?'s are':' is'} blocked by documents and should stay off the offer list until compliance clears them.`:'Draft: Every on-duty driver in this hub is currently cleared.',
    'Draft: Suggested afternoon check-in with the middle-mile desk on the Kent → Portland trailer, to confirm the evening ETA.'
  ];
  if(window.V5)V5.panel('ChainEx copilot',`<p class="small t2" style="margin:0 0 12px">Drafts only. Nothing is sent until a teammate approves it.</p>${drafts.map((d,i)=>`<div class="card pad" style="margin-bottom:8px"><div class="small">${esc(d)}</div><div style="margin-top:8px;display:flex;gap:6px"><button class="btn sm" data-copy="${i}">Copy draft</button><button class="btn sm ghost" data-hold="${i}">Hold for approval</button></div></div>`).join('')}`,{icon:'spark',kind:'copilot'});
  const p=document.getElementById('x-panel');if(!p)return;
  p.querySelectorAll('[data-copy]').forEach(b=>b.onclick=()=>{const t=drafts[+b.dataset.copy];navigator.clipboard&&navigator.clipboard.writeText(t);V5.toast('Draft copied','check')});
  p.querySelectorAll('[data-hold]').forEach(b=>b.onclick=()=>{V5.toast('Draft held for a teammate to approve','check');V5.close()});
}
function demoHTML(){
  const st=window.CXS&&CXS.staff();const r=rec(st);
  const roles=window.CXS?Object.keys(CXS.ROLES):[];
  return `<div class="small t2" style="margin-bottom:10px">Pilot only. This control is hidden from everyday use and lives here so you can try each role and hub. Sample accounts, not real people.</div>
    <div class="w6-form">${field('Act as role',`<select class="in" id="cxaRole">${roles.map(x=>`<option${x===st.role?' selected':''}>${esc(x)}</option>`).join('')}</select>`)}
    ${r.allHubs||familyOf(st&&st.role)==='admin'?field('View hub',`<select class="in" id="cxaHub"><option value="all"${viewHub()==='all'?' selected':''}>All hubs</option>${HUBS.map(h=>`<option value="${h.id}"${viewHub()===h.id?' selected':''}>${esc(h.name)}</option>`).join('')}</select>`):`<div class="small">This role is tied to <b>${esc((HUBS.find(h=>h.id===r.hub)||{}).name||r.hub)}</b>.</div>`}
    </div><div style="margin-top:12px"><button class="btn pri" id="cxaApply">Apply</button></div>`;
}
function field(l,c){return `<label class="x-field"><span class="micro">${l}</span>${c}</label>`}
function openDemo(){if(!window.V5)return;V5.panel('Demo · role and hub',demoHTML(),{icon:'user',kind:'demo'});
  const a=document.getElementById('cxaApply');if(a)a.onclick=()=>{const r=document.getElementById('cxaRole').value;const h=document.getElementById('cxaHub');if(h)setViewHub(h.value);if(window.CXS)CXS.actAs(r);location.reload()}}

function decorateShell(){
  const top=document.querySelector('.x-top');if(!top||top.dataset.cxa)return;top.dataset.cxa='1';
  const role=document.getElementById('x-role');if(role)role.remove(); /* everyday switcher moved to Settings → Demo */
  const clock=document.getElementById('x-clock');
  const r=rec();
  const hubSel=r.allHubs?`<select class="x-hub" id="x-hub" title="Hub">${[['all','All hubs'],...HUBS.map(h=>[h.id,h.short+' · '+h.name])].map(([v,l])=>`<option value="${esc(v)}"${viewHub()===v?' selected':''}>${esc(l)}</option>`).join('')}</select>`:`<span class="x-hubpill" title="Your hub">${esc((HUBS.find(h=>h.id===r.hub)||{short:r.hub}).short)}</span>`;
  const html=`<button class="x-ib x-hide-m" data-x="ws" title="Switch workspace">${window.V5?V5.ic('grid',16):''}</button>
    ${hubSel}
    <button class="x-ib" data-x="copilot" title="ChainEx copilot">${window.V5?V5.ic('spark',16):''}<span class="x-hide-m" style="font-size:12px;margin-left:4px">Copilot</span></button>`;
  const wrap=document.createElement('div');wrap.className='x-topx';wrap.innerHTML=html;
  if(clock)clock.before(wrap);else top.appendChild(wrap);
  const hs=document.getElementById('x-hub');if(hs)hs.onchange=()=>setViewHub(hs.value);
  /* lock nav items the role cannot use, but keep them visible */
  document.querySelectorAll('.x-ni[href],.x-tab[href],.x-rail a.x-ni').forEach(a=>{
    const href=(a.getAttribute('href')||'').split('?')[0];
    const need=navPerm(href);if(!need||can(need))return;
    a.classList.add('x-locked');a.dataset.restricted='1';a.dataset.need=need;a.setAttribute('title',MSG);
    if(!a.querySelector('.x-lk')){const i=document.createElement('span');i.className='x-lk';i.innerHTML=window.V5?V5.ic('lock',12):'';a.appendChild(i)}
  });
}
function navPerm(h){return ({'dispatch.html':'dispatch.view','dashboard.html':'dashboard.view','partners.html':'partners.view','recruiting.html':'recruiting.view','payments.html':'dashboard.view','admin.html':'admin.access','onboarding.html':'partners.view','sales.html':'dashboard.view','bids.html':'dashboard.view'}[h])||null}

document.addEventListener('click',e=>{
  if(e.target.closest('[data-x="ws"]')){e.preventDefault();openWorkspaces();return}
  if(e.target.closest('[data-x="copilot"]')){e.preventDefault();openCopilot();return}
  if(e.target.closest('[data-x="demo"]')){e.preventDefault();openDemo()}
},true);

const _shell=window.V5&&V5.shell;
if(_shell){V5.shell=function(o){const m=_shell(o);try{decorateShell()}catch(e){console.warn(e)}return m}}
if(window.CXS)installRoles();else document.addEventListener('DOMContentLoaded',installRoles);

if(document.querySelector('.x-top'))try{decorateShell()}catch(e){}
window.CXA={KEY,HUBS,ACTIONS,FAMILY,GRANT,EXTRA_STAFF,opHub,familyOf,rec,can,canAllHubs,homeHub,viewHub,setViewHub,setMember,inHub,filter,deny,locked,actBtn,MSG,workspaces,openWorkspaces,openCopilot,openDemo,demoHTML,decorateShell,installRoles,state};
})();
