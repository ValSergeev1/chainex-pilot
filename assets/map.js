/* ChainEx Pilot · shared map (MapLibre + OpenFreeMap positron) with schematic fallback */
(function(){
const STYLE='https://tiles.openfreemap.org/styles/positron';
function CXMap(el,opts={}){
  this.el=el;this.opts=opts;this.markers=[];this.mode='pending';this.data=null;this._fitDone=false;
  const fallback=(why)=>{if(this.mode==='fallback')return;console.warn('[ChainEx map] fallback:',why);this.mode='fallback';try{this.map&&this.map.remove()}catch(e){}this.map=null;this.render()};
  if(!window.maplibregl){fallback('maplibre not loaded');return}
  try{
    this.map=new maplibregl.Map({container:el,style:STYLE,center:opts.center||[-122.2,47.65],zoom:opts.zoom||10.3,attributionControl:{compact:true},dark:false});
    if(opts.controls!==false)this.map.addControl(new maplibregl.NavigationControl({showCompass:false}),'top-right');
    const to=setTimeout(()=>{if(this.mode==='pending')fallback('style load timeout')},9000);
    this.map.on('load',()=>{clearTimeout(to);this.mode='gl';this.map.addSource('routes',{type:'geojson',data:{type:'FeatureCollection',features:[]}});
      this.map.addLayer({id:'routes-casing',type:'line',source:'routes',paint:{'line-color':'#ffffff','line-width':['case',['get','sel'],7,5],'line-opacity':.9},layout:{'line-join':'round','line-cap':'round'}});
      this.map.addLayer({id:'routes',type:'line',source:'routes',paint:{'line-color':['case',['get','sel'],'#1f4f9a','#6f97d6'],'line-width':['case',['get','sel'],4,2.5],'line-opacity':['case',['get','sel'],1,.75]},layout:{'line-join':'round','line-cap':'round'}});
      this.applyTheme();this.render()});
    window.addEventListener('cx-theme',()=>this.applyTheme());
    this.map.on('click',e=>{this.opts.onMap&&this.opts.onMap([+e.lngLat.lng.toFixed(5),+e.lngLat.lat.toFixed(5)])});
    this.map.on('error',e=>{if(this.mode==='pending')fallback(e&&e.error&&e.error.message||'map error')});
  }catch(e){fallback(e.message)}
}
CXMap.prototype.set=function(data){this.data=data;this.render()};
CXMap.prototype.render=function(){const d=this.data;if(!d)return;
  if(this.mode==='gl')return this.renderGL(d);if(this.mode==='fallback')return this.renderSVG(d)};
CXMap.prototype.pinEl=function(p){const e=document.createElement('div');e.className=`pin st-${p.state}${p.sel?' sel':''}`;e.textContent=p.label;e.title=p.title||'';e.dataset.id=p.id;
  e.addEventListener('click',ev=>{ev.stopPropagation();this.opts.onPin&&this.opts.onPin(p.id)});return e};
CXMap.prototype.renderGL=function(d){this.markers.forEach(m=>m.remove());this.markers=[];
  d.pins.forEach(p=>{this.markers.push(new maplibregl.Marker({element:this.pinEl(p)}).setLngLat(p.ll).addTo(this.map))});
  (d.drivers||[]).forEach(v=>{const e=document.createElement('div');e.className='drv-marker'+(v.sos?' sos':'');e.title=v.name;e.addEventListener('click',()=>this.opts.onDriver&&this.opts.onDriver(v.id));this.markers.push(new maplibregl.Marker({element:e}).setLngLat(v.ll).addTo(this.map))});
  const src=this.map.getSource('routes');src&&src.setData({type:'FeatureCollection',features:(d.lines||[]).filter(l=>l.coords.length>1).map(l=>({type:'Feature',properties:{sel:!!l.sel},geometry:{type:'LineString',coordinates:l.coords}}))});
  if(!this._fitDone||d.refit){this._fitDone=true;this.fit(d.fitTo||d.pins.map(p=>p.ll))}};
CXMap.prototype.fit=function(lls){if(!lls||!lls.length)return;if(this.mode==='gl'){const b=new maplibregl.LngLatBounds(lls[0],lls[0]);lls.forEach(x=>b.extend(x));const pd=typeof this.opts.pad==='function'?this.opts.pad():(this.opts.pad||60);this.map.fitBounds(b,{padding:pd,maxZoom:14,duration:this._fitDone?500:0})}else{this._fit=lls;this.render()}};
CXMap.prototype.renderSVG=function(d){const el=this.el;el.innerHTML='';const W=el.clientWidth||600,H=el.clientHeight||400;const pts=(this._fit&&this._fit.length?this._fit:d.pins.map(p=>p.ll).concat((d.drivers||[]).map(v=>v.ll)));if(!pts.length)return;
  let x0=Math.min(...pts.map(p=>p[0])),x1=Math.max(...pts.map(p=>p[0])),y0=Math.min(...pts.map(p=>p[1])),y1=Math.max(...pts.map(p=>p[1]));const pad=50,sx=(W-2*pad)/Math.max(1e-4,(x1-x0)*0.674),sy=(H-2*pad)/Math.max(1e-4,(y1-y0));const s=Math.min(sx,sy);
  const P=ll=>[pad+((ll[0]-x0)*0.674)*s+((W-2*pad)-(x1-x0)*0.674*s)/2,H-pad-(ll[1]-y0)*s-((H-2*pad)-(y1-y0)*s)/2];
  const wrap=document.createElement('div');wrap.className='map-fallback';let svg=`<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg"><defs><pattern id="g" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0H0V40" fill="none" stroke="#dde3ea" stroke-width="1"/></pattern></defs><rect width="100%" height="100%" fill="url(#g)"/>`;
  (d.lines||[]).forEach(l=>{if(l.coords.length>1)svg+=`<polyline points="${l.coords.map(c=>P(c).join(',')).join(' ')}" fill="none" stroke="${l.sel?'#1f4f9a':'#6f97d6'}" stroke-width="${l.sel?4:2.5}" stroke-linejoin="round" opacity="${l.sel?1:.75}"/>`});
  svg+='</svg>';wrap.innerHTML=svg+'<div class="note">Map tiles unavailable · schematic view</div>';el.appendChild(wrap);
  d.pins.forEach(p=>{const e=this.pinEl(p);const [x,y]=P(p.ll);e.style.cssText=`position:absolute;left:${x-13}px;top:${y-13}px`;wrap.appendChild(e)});
  (d.drivers||[]).forEach(v=>{const e=document.createElement('div');e.className='drv-marker'+(v.sos?' sos':'');const [x,y]=P(v.ll);e.style.cssText=`position:absolute;left:${x-9}px;top:${y-9}px`;wrap.appendChild(e)})};
CXMap.prototype.resize=function(){this.map&&this.map.resize();if(this.mode==='fallback')this.render()};
window.CXMap=CXMap;
})();

/* Mission-control map theming: recolor the vector style in place for dark mode, restore for light. */
CXMap.prototype.applyTheme=function(){if(this.opts.noTheme)return;const m=this.map;if(!m||!m.getStyle)return;let st;try{st=m.getStyle()}catch(e){return}if(!st||!st.layers)return;
  const dark=document.documentElement.classList.contains('dark')&&document.documentElement.classList.contains('cx');this._orig=this._orig||{};
  const set=(id,p,v)=>{try{const k=id+'|'+p;if(!(k in this._orig))this._orig[k]=m.getPaintProperty(id,p);m.setPaintProperty(id,p,dark?v:this._orig[k])}catch(e){}};
  st.layers.forEach(l=>{const id=l.id,n=id.toLowerCase();
    if(l.type==='background')set(id,'background-color','#07101d');
    else if(l.type==='fill'){if(/water|ocean|lake|river/.test(n))set(id,'fill-color','#0a2038');else if(/park|wood|forest|grass|landcover|green|cemetery/.test(n))set(id,'fill-color','#0b1a22');else if(/building/.test(n)){set(id,'fill-color','#111f33');set(id,'fill-outline-color','#16273f')}else set(id,'fill-color','#0a1626')}
    else if(l.type==='line'){if(/water|river|stream|canal/.test(n))set(id,'line-color','#0f3156');else if(/motorway|trunk|primary|major/.test(n))set(id,'line-color','#22426b');else if(/rail/.test(n))set(id,'line-color','#17283f');else if(/boundary|admin/.test(n))set(id,'line-color','#2a3f5f');else if(/road|highway|street|transport|minor|secondary|tertiary|path|service|bridge|tunnel/.test(n))set(id,'line-color','#16283f')}
    else if(l.type==='symbol'){set(id,'text-color','#7f97b8');set(id,'text-halo-color','#07101d')}});
  if(m.getLayer('routes')){set('routes','line-color',['case',['get','sel'],'#4c95ff','#2f5f9e']);set('routes-casing','line-color','#04101f')}
  if(dark&&!m.getLayer('routes-glow')&&m.getSource('routes')){try{m.addLayer({id:'routes-glow',type:'line',source:'routes',paint:{'line-color':'#3b8cff','line-width':['case',['get','sel'],14,0],'line-blur':10,'line-opacity':.45},layout:{'line-join':'round','line-cap':'round'}},'routes-casing')}catch(e){}}
  if(m.getLayer('routes-glow'))m.setLayoutProperty('routes-glow','visibility',dark?'visible':'none')};
