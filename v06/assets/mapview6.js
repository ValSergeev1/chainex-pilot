/* ChainEx V06 driver · map view providers (pluggable).
   Styles: ChainEx (current look), Google style, Apple style, Satellite. All key-free by default:
   - ChainEx / Google style / Apple style recolor OpenFreeMap vector tiles (no key) with each palette.
   - Satellite uses Esri World Imagery raster tiles (no key, attribution shown).
   Real providers switch on only when keys are configured at deploy time (never committed):
     window.CX_MAP_KEYS = { GOOGLE_MAPS_KEY, MAPKIT_TOKEN }  (values come from Secret Manager at serve time)
   - GOOGLE_MAPS_KEY → Google Map Tiles API (official 2D roadmap tiles via a session token).
   - MAPKIT_TOKEN → Apple MapKit JS needs its own map widget; a registered adapter
     (CXMapView.register('apple-real', …)) takes over when present, otherwise the Apple-style look stays.
   Settings are per device (localStorage cx.v06.mapview) and apply live. */
(function(){
const SK='cx.v06.mapview';
const DEF={style:'chainex',theme:'app',tilt:'3d',orient:'heading',text:'m'};
const OPTS={style:['chainex','google','apple','satellite'],theme:['app','auto','day','night'],tilt:['3d','2d'],orient:['heading','north'],text:['s','m','l']};
const OFM='https://tiles.openfreemap.org/styles/';
const keys=()=>{const k=window.CX_MAP_KEYS||{};return{google:typeof k.GOOGLE_MAPS_KEY==='string'?k.GOOGLE_MAPS_KEY.trim():'',apple:typeof k.MAPKIT_TOKEN==='string'?k.MAPKIT_TOKEN.trim():''}};
/* palettes: day / night for each vector look */
const PAL={
 chainex:{base:'positron',pois:false,
  day:{bg:'#EEF3FA',water:'#D5E2F2',park:'#E5EDF7',bld:'#E0E8F3',road:'#FFFFFF',major:'#FFFFFF',hwy:'#FFFFFF',case:'#D3DEEB',label:'#7F92AC',halo:'#EEF3FA',boundary:'#C6D3E4'},
  night:{bg:'#0A1422',water:'#050C16',park:'#0C1828',bld:'#10203A',road:'#1A2B44',major:'#22385A',hwy:'#22385A',case:'#0A1422',label:'#6A7E99',halo:'#0A1422',boundary:'#22385A'}},
 google:{base:'liberty',pois:true,
  day:{bg:'#F1F3F4',water:'#9CC0F9',park:'#C8E6C9',bld:'#E3E5E8',road:'#FFFFFF',major:'#FFFFFF',hwy:'#FDE293',case:'#DADCE0',label:'#5F6368',halo:'#FFFFFF',boundary:'#9AA0A6'},
  night:{bg:'#242F3E',water:'#17263C',park:'#263C3F',bld:'#2C3A4B',road:'#38414E',major:'#4B5566',hwy:'#746855',case:'#212A37',label:'#9CA5B3',halo:'#17263C',boundary:'#4B6878'}},
 apple:{base:'liberty',pois:true,
  day:{bg:'#F8F4EC',water:'#8FCBF4',park:'#C2E3A6',bld:'#EAE2D3',road:'#FFFFFF',major:'#FFF6E0',hwy:'#F6B65A',case:'#DDD2BF',label:'#6E6A64',halo:'#F8F4EC',boundary:'#C9BFAF'},
  night:{bg:'#2A2C30',water:'#1D3550',park:'#24382A',bld:'#34363B',road:'#45474C',major:'#55575D',hwy:'#7A6440',case:'#232428',label:'#B3B5BA',halo:'#1E1F22',boundary:'#5A5C62'}}};
const SAT={version:8,sources:{esri:{type:'raster',tiles:['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],tileSize:256,maxzoom:19,attribution:'Imagery © Esri, Maxar, Earthstar Geographics'},
 esrilbl:{type:'raster',tiles:['https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}'],tileSize:256,maxzoom:19}},
 layers:[{id:'esri',type:'raster',source:'esri'},{id:'esri-labels',type:'raster',source:'esrilbl'}]};
const adapters={};
function get(){let o={};try{o=JSON.parse(localStorage.getItem(SK)||'{}')||{}}catch(e){}const r=Object.assign({},DEF);Object.keys(OPTS).forEach(k=>{if(OPTS[k].includes(o[k]))r[k]=o[k]});return r}
function set(k,v){if(!OPTS[k]||!OPTS[k].includes(v))return get();const o=get();o[k]=v;try{localStorage.setItem(SK,JSON.stringify(o))}catch(e){}dispatchEvent(new CustomEvent('cx-mapview',{detail:o}));return o}
function night(o){o=o||get();if(o.theme==='day')return false;if(o.theme==='night')return true;if(o.theme==='auto'){const h=new Date().getHours()+new Date().getMinutes()/60;return h<6.5||h>=19.5}
 try{return V5.resolve(V5.pref())==='night'}catch(e){return document.documentElement.classList.contains('dark')}}
/* which provider actually renders, given keys */
function provider(o){o=o||get();const k=keys();
 if(o.style==='google'&&k.google)return{id:'google-real',style:'google',real:true,label:'Google Maps'};
 if(o.style==='apple'&&k.apple&&adapters['apple-real'])return{id:'apple-real',style:'apple',real:true,label:'Apple Maps'};
 return{id:o.style,style:o.style,real:false,label:{chainex:'ChainEx',google:'Google style',apple:'Apple style',satellite:'Satellite'}[o.style]}}
function labels(){const k=keys();return{chainex:'ChainEx',google:k.google?'Google Maps':'Google style',apple:k.apple&&adapters['apple-real']?'Apple Maps':'Apple style',satellite:'Satellite'}}
const pitch=()=>get().tilt==='3d'?50:0;
const bearing=(hd,cur)=>get().orient==='north'?0:(hd!=null?hd:cur||0);
const TXT={s:.85,m:1,l:1.25};
/* Google Map Tiles API session (only with a configured key) */
const gSess={};
async function googleSpec(dark){const k=keys().google;const id=dark?'n':'d';const s=gSess[id];if(s&&s.exp>Date.now()+60e3)return s.spec;
 const body={mapType:'roadmap',language:'en-US',region:'US',scale:'scaleFactor2x',highDpi:true};
 if(dark)body.styles=[{stylers:[{invert_lightness:true},{saturation:-60}]}];
 const r=await fetch('https://tile.googleapis.com/v1/createSession?key='+encodeURIComponent(k),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});if(!r.ok)throw new Error('google session '+r.status);const j=await r.json();
 const spec={version:8,sources:{g:{type:'raster',tiles:['https://tile.googleapis.com/v1/2dtiles/{z}/{x}/{y}?session='+encodeURIComponent(j.session)+'&key='+encodeURIComponent(k)],tileSize:256,maxzoom:22,attribution:'Map data © Google'}},layers:[{id:'g',type:'raster',source:'g'}]};
 gSess[id]={spec,exp:j.expiry?(+j.expiry*1000):Date.now()+6*3600e3};return spec}
function recolor(m,look,dark,txt,orig){const p=PAL[look][dark?'night':'day'];const L=(m.getStyle()||{}).layers||[];L.forEach(l=>{const id=l.id.toLowerCase();if(/^cx/.test(id))return;try{
 if(l.type==='background')m.setPaintProperty(l.id,'background-color',p.bg);
 else if(l.type==='fill'){m.setPaintProperty(l.id,'fill-color',/water|ocean|lake|river/.test(id)?p.water:/park|wood|grass|green|forest|landcover|landuse|cemetery|pitch/.test(id)?p.park:/building/.test(id)?p.bld:p.bg);try{m.setPaintProperty(l.id,'fill-outline-color',/building/.test(id)?p.bld:p.bg)}catch(e){}if(l.paint&&l.paint['fill-pattern'])m.setPaintProperty(l.id,'fill-pattern',undefined)}
 else if(l.type==='line'){if(/water|river|stream|canal/.test(id))m.setPaintProperty(l.id,'line-color',p.water);else if(/boundary|admin/.test(id))m.setPaintProperty(l.id,'line-color',p.boundary);else if(/casing|outline/.test(id))m.setPaintProperty(l.id,'line-color',p.case);else m.setPaintProperty(l.id,'line-color',/motorway|trunk|highway/.test(id)?p.hwy:/primary|secondary|major/.test(id)?p.major:p.road)}
 else if(l.type==='symbol'){if(/poi|icon|transit|rail|aeroway|airport/.test(id)&&!PAL[look].pois){m.setLayoutProperty(l.id,'visibility','none');return}if(/shield/.test(id)&&!PAL[look].pois){m.setLayoutProperty(l.id,'visibility','none');return}
  try{m.setPaintProperty(l.id,'text-color',p.label);m.setPaintProperty(l.id,'text-halo-color',p.halo)}catch(e){}
  const o=orig[l.id];if(o!==undefined&&o!==null)m.setLayoutProperty(l.id,'text-size',scaleTxt(o,txt))}
 else if(l.type==='fill-extrusion'){if(!PAL[look].pois)m.setLayoutProperty(l.id,'visibility','none');else m.setPaintProperty(l.id,'fill-extrusion-color',p.bld)}}catch(e){}})}
/* text-size may be a number, a legacy {stops} function or an interpolate/step expression: scale its outputs */
function scaleTxt(v,f){if(f===1)return v;if(typeof v==='number')return +(v*f).toFixed(2);
 if(v&&typeof v==='object'&&!Array.isArray(v)&&v.stops)return Object.assign({},v,{stops:v.stops.map(s=>[s[0],typeof s[1]==='number'?+(s[1]*f).toFixed(2):s[1]])});
 if(Array.isArray(v)){if(v[0]==='interpolate')return v.slice(0,3).concat(v.slice(3).map((x,i)=>i%2?scaleTxt(x,f):x));if(v[0]==='step')return [v[0],v[1],scaleTxt(v[2],f)].concat(v.slice(3).map((x,i)=>i%2?scaleTxt(x,f):x));return ['*',v,f]}return v}
function addLines(m){if(m.getSource('cxl'))return;m.addSource('cxl',{type:'geojson',data:{type:'FeatureCollection',features:[]}});m.addLayer({id:'cxl-glow',type:'line',source:'cxl',paint:{'line-color':['get','c'],'line-width':['*',['get','w'],3],'line-opacity':.16,'line-blur':2},layout:{'line-cap':'round','line-join':'round'}});m.addLayer({id:'cxl',type:'line',source:'cxl',paint:{'line-color':['get','c'],'line-width':['get','w'],'line-opacity':['get','o']},layout:{'line-cap':'round','line-join':'round'}})}
/* apply the saved view to a V5 map instance (map5.m = maplibre map). Idempotent. */
async function apply(map5){const m=map5&&map5.m;if(!m||map5.mode!=='gl')return;const o=get(),pv=provider(o),dark=night(o),txt=TXT[o.text]||1;
 const look=pv.style==='satellite'?null:pv.style;
 let base=pv.id==='google-real'?'google-real:'+(dark?'n':'d'):pv.style==='satellite'?'satellite':PAL[look].base;
 map5._mv=map5._mv||{};const S=map5._mv;S.pending=base;
 const finish=()=>{if(S.pending!==base)return;try{addLines(m)}catch(e){}try{m.setPaintProperty('cxl','line-color',['get','c']);m.setPaintProperty('cxl-glow','line-color',['get','c'])}catch(e){}if(look&&!pv.real){recolor(m,look,dark,txt,S.orig||{})}
  S.applied={base,look,dark,txt,real:pv.real};map5.ready=true;map5._ls=null;try{map5.render(false)}catch(e){}document.documentElement.dataset.mapview=pv.id+(dark?'-night':'-day');dispatchEvent(new CustomEvent('cx-mapview-applied',{detail:{provider:pv.id,dark,base}}))};
 if(S.base===base&&map5.ready){finish();return}
 let spec;try{spec=base.startsWith('google-real')?await googleSpec(dark):base==='satellite'?SAT:OFM+base}catch(e){console.warn('[map view] provider unavailable, using Google style',e&&e.message);spec=OFM+PAL.google.base;base=PAL.google.base;S.pending=base}
 if(S.pending!==base)return;
 if(pv.id==='apple-real'){try{adapters['apple-real'](map5,{token:keys().apple,dark});S.base=base;finish();return}catch(e){}}
 map5.ready=false;S.base=base;
 m.once('style.load',()=>{const orig={};try{(m.getStyle().layers||[]).forEach(l=>{if(l.type==='symbol'&&l.layout&&l.layout['text-size']!=null)orig[l.id]=l.layout['text-size']})}catch(e){}S.orig=orig;finish()});
 try{m.setStyle(spec,{diff:false})}catch(e){map5.ready=true}}
function attach(map5){if(!map5||map5._mvAttached)return;map5._mvAttached=1;const go=()=>apply(map5);
 if(map5.m){if(map5.ready)setTimeout(go,0);else map5.m.once('load',()=>setTimeout(go,0))}
 addEventListener('cx-mapview',go);addEventListener('v5-theme',()=>setTimeout(go,0));
 let lastN=night();setInterval(()=>{const n=night();if(n!==lastN){lastN=n;go()}},60000)}
window.CXMapView={get,set,night,provider,labels,pitch,bearing,apply,attach,register:(id,fn)=>{adapters[id]=fn},OPTS,DEF,keys:()=>{const k=keys();return{google:!!k.google,apple:!!k.apple}},_scaleTxt:scaleTxt};
})();
