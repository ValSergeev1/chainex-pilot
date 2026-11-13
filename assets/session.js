/* ChainEx Pilot V02 · unified sign-in session, sample accounts, staff roles + permissions.
   Pure localStorage, no network. Every account here is SAMPLE data (no real people or partners). */
(function(){
const SK='cx.session.v02';
const base=(function(){const s=document.currentScript&&document.currentScript.getAttribute('src')||'assets/session.js';return s.replace(/assets\/session\.js.*$/,'')})();
const LINES={pd:'P&D',bulky:'Bulky',wg:'White glove',ltl:'LTL',shuttle:'Shuttle'};
const ALL=['pd','bulky','wg','ltl','shuttle'];
/* Staff roles. Dispatch teams are based on service categories. */
const ROLES={
  'Admin':{lines:ALL,desc:'Owner-level admin. Security, roles, backups, every workspace.',perms:['*']},
  'Ops manager':{lines:ALL,desc:'Sees every service line on the dispatch board; re-optimizes across lines.',perms:['dispatch','dispatch.all','reopt','dashboard','onboarding','compliance','scorecards','payments.view','payments.ops','audit.view','bids','sales']},
  'P&D team':{lines:['pd'],desc:'P&D dispatchers. Board limited to P&D work.',perms:['dispatch','reopt','scorecards.own']},
  'Bulky team':{lines:['bulky'],desc:'Bulky dispatchers. Board limited to Bulky work.',perms:['dispatch','reopt','scorecards.own']},
  'White glove team':{lines:['wg'],desc:'White glove dispatchers.',perms:['dispatch','reopt','scorecards.own']},
  'LTL team':{lines:['ltl'],desc:'LTL dispatchers.',perms:['dispatch','reopt','scorecards.own']},
  'Shuttle team':{lines:['shuttle'],desc:'Shuttle / linehaul dispatchers.',perms:['dispatch','reopt','scorecards.own']},
  'Onboarding':{lines:[],desc:'Applications, documents, agreements, reminders.',perms:['dashboard','onboarding','compliance']},
  'Finance':{lines:[],desc:'Rate cards, invoices, settlements, payout batches.',perms:['dashboard','payments.view','payments.ops','payments.approve','scorecards','audit.view']},
  'Sales':{lines:[],desc:'Customer accounts and outreach (Sales workspace).',perms:['sales','bids','dashboard']},
  'Viewer':{lines:[],desc:'Read-only reporting.',perms:['dashboard','scorecards','payments.view']}
};
const PERMS=[['dispatch','Dispatch board (own line)'],['dispatch.all','Dispatch board (all lines)'],['reopt','Re-optimize routes'],['dashboard','Dashboard · partners'],['onboarding','Onboarding queue'],['compliance','Compliance center'],['scorecards','Scorecards (all lines)'],['payments.view','Payments · view'],['payments.ops','Payments · ops review'],['payments.approve','Payments · finance approve & payout'],['security','Security, roles & sessions'],['audit.view','Audit log'],['backups','Backups & restore'],['sales','Sales workspace'],['bids','Bids workspace']];
const STAFF=[
  ['admin@chainex.example','Jordan Lee','Admin'],['ops.manager@chainex.example','Sasha Patel','Ops manager'],
  ['pd.dispatch@chainex.example','Miguel Torres','P&D team'],['bulky.dispatch@chainex.example','Dana Ruiz','Bulky team'],
  ['wg.dispatch@chainex.example','Leo Grant','White glove team'],['ltl.dispatch@chainex.example','Kim Osei','LTL team'],
  ['shuttle.dispatch@chainex.example','Ray Novak','Shuttle team'],['onboarding@chainex.example','Hannah Kim','Onboarding'],
  ['finance@chainex.example','Owen Brooks','Finance'],['sales@chainex.example','Nina Alvarez','Sales'],['viewer@chainex.example','Ari Cohen','Viewer']
].map(([email,name,role])=>({kind:'staff',id:email,email,name,role,lines:ROLES[role].lines}));
const PARTNERS=[
  {kind:'driver',id:'CX-PILOT-001',name:'Avery Valdez',label:'Driver · P&D'},{kind:'driver',id:'CX-PILOT-002',name:'Omar Haddad',label:'Driver · Bulky'},
  {kind:'driver',id:'CX-PILOT-003',name:'Tia Brooks',label:'Driver · White glove'},{kind:'driver',id:'CX-PILOT-004',name:'LTL pilot driver',label:'Driver · LTL'},
  {kind:'driver',id:'CX-PILOT-005',name:'Shuttle pilot driver',label:'Driver · Shuttle'},
  {kind:'dsp',id:'DSP-EEX-01',name:'Eastside Express (sample DSP)',label:'DSP owner'},{kind:'carrier',id:'CAR-CFR-01',name:'Cascade Freight (sample carrier)',label:'Carrier dispatcher'},
  {kind:'warehouse',id:'WH-KNT-014',name:'Jamie Ortiz',label:'Warehouse associate · Kent'},
  {kind:'shipper',id:'SPN-PNW',name:'Summit Parcel Network (sample shipper)',label:'Shipper · station BEL1'},{kind:'shipper',id:'HPL-SEA',name:'Harborline Parcel (sample shipper)',label:'Shipper · station SEA1'},{kind:'shipper',id:'SHP-NORTHLINE',name:'Northline Home (sample shipper)',label:'Shipper · Kent'}
];
const ACCOUNTS=[...STAFF,...PARTNERS];
const ALIAS={};function find(q){q=String(q||'').trim();if(ALIAS[q.toUpperCase()])q=ALIAS[q.toUpperCase()];if(!q)return null;const u=q.toUpperCase(),l=q.toLowerCase();return ACCOUNTS.find(a=>a.id.toUpperCase()===u||(a.email&&a.email===l))||null}
function get(){try{return JSON.parse(localStorage.getItem(SK)||'null')}catch(e){return null}}
function set(a,extra){const s=Object.assign({kind:a.kind,id:a.id,name:a.name,role:a.role||a.label,lines:a.lines||[],at:Date.now(),mfa:a.kind==='staff'},extra||{});localStorage.setItem(SK,JSON.stringify(s));
  try{const L=JSON.parse(localStorage.getItem('cx.sessions.v02')||'[]');L.unshift({id:a.id,role:s.role,at:s.at,device:(navigator.userAgent.match(/(Chrome|Firefox|Safari|Edg)\/[\d]+/)||['Browser'])[0],mfa:s.mfa});localStorage.setItem('cx.sessions.v02',JSON.stringify(L.slice(0,25)))}catch(e){}
  window.dispatchEvent(new CustomEvent('cx-session',{detail:s}));return s}
function clear(){localStorage.removeItem(SK);window.dispatchEvent(new CustomEvent('cx-session',{detail:null}))}
function routeFor(a){if(!a)return base+'auth/signin.html';switch(a.kind){
  case 'staff':return base+'workspaces.html';case 'dsp':return base+'portal-dsp.html?login='+encodeURIComponent(a.id);case 'carrier':return base+'portal-carrier.html?login='+encodeURIComponent(a.id);
  case 'driver':return base+'portal-driver.html?id='+encodeURIComponent(a.id);case 'warehouse':return base+'portal-warehouse.html';
  case 'shipper':return base+'shipper.html?login='+encodeURIComponent(a.id);default:return base+'start.html'}}
/* Pilot default for the staff apps when nobody has signed in: Ops manager (sample). */
const DEFAULT_STAFF=STAFF[1];
function staff(){const s=get();if(!s)return Object.assign({},DEFAULT_STAFF,{implicit:true});return s.kind==='staff'?Object.assign({},s,{lines:(ROLES[s.role]||{}).lines||s.lines||[]}):null}
function can(perm,s){s=s===undefined?staff():s;if(!s||s.kind!=='staff')return false;const r=ROLES[s.role];if(!r)return false;return r.perms.includes('*')||r.perms.includes(perm)}
function lines(s){s=s===undefined?staff():s;if(!s)return[];const r=ROLES[s.role];return r?r.lines.slice():[]}
function actAs(role){const a=STAFF.find(x=>x.role===role);if(a)set(a);return a}
window.CXS={KEY:SK,base,ROLES,PERMS,STAFF,PARTNERS,ACCOUNTS,LINES,ALL,find,get,set,clear,routeFor,staff,can,lines,actAs,DEFAULT_STAFF};
})();
