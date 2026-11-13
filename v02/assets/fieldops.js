/* ChainEx Pilot · field operations module: driver route review/edit (P&D, Bulky), DSP/carrier portal ops,
   contractor + shipper sample logins. Shared by Driver app, Dispatch desk, DSP portal and Shipper view. */
(function(){
const C=CX;
const EDIT_LINES=['pd','bulky'];
C.routeEditLines=EDIT_LINES;
C.registerModule({id:'fieldops',
  seed(S){S.roadIssues=[];
    const P=C.portal,find=n=>S.partners.find(p=>p.short===n);
    const L=[['DSP-EEX-01','Eastside Express','Carla Mendes','Owner'],['DSP-EEX-02','Eastside Express','Marco Diaz','Dispatch manager'],['DSP-RFM-01','Rainier Final Mile','Dev Raman','Owner'],['DSP-SRP-01','Sound Route Partners','Ty Wells','Owner'],['CAR-CFR-01','Cascade Freight','Lin Park','Operations manager'],['CAR-VDR-01','Valley Drayage','Ana Ruiz','Owner']];
    S.contractorLogins=L.map(([login,short,name,title])=>{const p=find(short);return p&&{login,partnerId:p.id,name,title}}).filter(Boolean);
    const sh=[['SPN-PNW','u-spn'],['HPL-SEA','u-hpl']];S.shipperLogins=sh.map(([login,uid])=>{const u=S.users.find(x=>x.id===uid);return u&&{login,name:u.name,partnerId:u.customers[0].customer,stations:u.customers[0].stations}}).filter(Boolean);
    S.partners.filter(p=>p.type==='Shipper'&&p.status==='Fully approved'&&!/accounts/i.test(p.name)).forEach(p=>S.shipperLogins.push({login:'SHP-'+(p.short||p.name).split(/\s|&/)[0].replace(/[^A-Za-z]/g,'').toUpperCase(),name:(p.short||p.name)+' shipping desk',partnerId:p.id,stations:p.stations||[]}))},
  ops:(api,ops)=>({
    submitRouteEdit(wid,draft){const S=api.S,d=api.driver(wid);if(!d||!EDIT_LINES.includes(d.line))return false;const all=C.routeAll(wid);
      const prev=all.map(t=>({id:t.id,seq:t.seq,ll:t.ll.slice()}));const before=all.filter(t=>t.state==='assigned').map(t=>t.id).join();
      const fixed=all.filter(t=>t.state!=='assigned').sort((a,b)=>a.seq-b.seq);const skip=new Set(draft.skipped||[]);
      const ord=(draft.order||[]).map(id=>all.find(t=>t.id===id)).filter(t=>t&&t.state==='assigned');all.filter(t=>t.state==='assigned'&&!ord.includes(t)).forEach(t=>ord.push(t));
      const final=[...fixed,...ord.filter(t=>!skip.has(t.id)),...ord.filter(t=>skip.has(t.id))];final.forEach((t,i)=>t.seq=i);
      const moved=ord.filter(t=>!skip.has(t.id)).map(t=>t.id).join()!==before.split(',').filter(id=>!skip.has(id)).join();
      skip.forEach(id=>{const t=api.task(id);if(!t)return;if(!t.tags.includes('DRIVER SKIP'))t.tags.push('DRIVER SKIP');t.timeline.push({at:S.clock,text:'Driver skipped · moved to end of route',actor:d.name})});
      Object.entries(draft.notes||{}).forEach(([id,txt])=>{const t=api.task(id);if(!t||!txt)return;t.driverNote=txt;t.timeline.push({at:S.clock,text:'Driver address note · '+txt,actor:d.name})});
      Object.entries(draft.pins||{}).forEach(([id,ll])=>{const t=api.task(id);if(!t)return;t.llOrig=t.llOrig||t.ll.slice();t.ll=ll.slice();if(!t.tags.includes('PIN FIX'))t.tags.push('PIN FIX');t.timeline.push({at:S.clock,text:`Driver corrected the pin (${ll[1].toFixed(5)}, ${ll[0].toFixed(5)})`,actor:d.name})});
      (draft.issues||[]).forEach(x=>{S.roadIssues=S.roadIssues||[];S.roadIssues.unshift(Object.assign({id:'RI-'+(100+S.roadIssues.length),at:S.clock,wid,by:d.name,line:d.line,status:'Open'},x));api.log(`Road issue · ${x.type}${x.near?' near '+x.near:''} · reported by ${d.name}${x.note?' · '+x.note:''}`,'exception',d.line)});
      const sum={moved,skipped:skip.size,notes:Object.values(draft.notes||{}).filter(Boolean).length,pins:Object.keys(draft.pins||{}).length,issues:(draft.issues||[]).length};
      d.route.edit={status:'pending',at:S.clock,by:d.name,prev,summary:sum};d.route.plan={first:draft.first||null,last:draft.last||null,locked:(draft.locked||[]).slice(),by:d.name,at:S.clock};
      api.log(`${d.name} submitted route changes on ${d.route.id} · ${[sum.moved&&'new sequence',sum.skipped&&sum.skipped+' skipped',sum.notes&&sum.notes+' address note(s)',sum.pins&&sum.pins+' pin fix(es)',sum.issues&&sum.issues+' road issue(s)'].filter(Boolean).join(' · ')||'no changes'}`,'driver',d.line);return sum},
    reviewRouteEdit(wid,accept,actor='Dispatcher'){const S=api.S,d=api.driver(wid);const e=d&&d.route.edit;if(!e||e.status!=='pending')return false;
      if(accept){e.status='accepted';e.reviewedBy=actor;api.log(`${actor} accepted ${d.name}'s route changes (${d.route.id})`,'desk',d.line);return true}
      e.prev.forEach(p=>{const t=api.task(p.id);if(!t||t.workerId!==wid)return;if(t.state==='assigned')t.seq=p.seq;t.ll=p.ll.slice();delete t.llOrig;t.tags=t.tags.filter(x=>x!=='PIN FIX'&&x!=='DRIVER SKIP')});
      S.tasks.filter(t=>t.workerId===wid).sort((a,b)=>a.seq-b.seq).forEach((t,i)=>t.seq=i);e.status='reverted';e.reviewedBy=actor;api.log(`${actor} reverted ${d.name}'s route changes (${d.route.id}); dispatch sequence restored`,'desk',d.line);return true},
    resolveRoadIssue(id,actor){const x=(api.S.roadIssues||[]).find(r=>r.id===id);if(x){x.status='Resolved';x.resolvedBy=actor}},
    dspRespond(slotId,accept,actor){const S=api.S,slot=api.driver(slotId);if(!slot||!slot.dspSlot)return false;
      if(accept){slot.tenderStatus='accepted';api.log(`${actor} accepted tender ${slot.route.id}`,'partner',slot.line);return true}
      C.route(slotId).forEach(t=>ops.assign(t.id,null,null,null,actor));S.drivers=S.drivers.filter(x=>x.id!==slotId);
      S.events&&S.events.unshift({name:'route.declined',at:C.portal.today()+' '+C.fmt(S.clock),h:C.portal.nowH(),payload:{id:slot.route.id,name:actor}});api.log(`Tender ${slot.route.id} declined by ${actor} · stops back in Unassigned`,'exception',slot.line);return true},
    dspReassign(fromWid,toWid,actor){const to=api.driver(toWid);const e=C.eligibility(toWid,to.line);if(!e.ok){ops.lastBlock=e.reasons;return false}
      const open=C.route(fromWid).filter(t=>t.state==='assigned');open.forEach(t=>ops.assign(t.id,toWid,null,null,actor));api.log(`${actor} reassigned ${open.length} stop(s) from ${api.driver(fromWid).name} to ${to.name}`,'partner',to.line);return open.length},
    dspAddVehicle(pid,name,actor){const p=C.portal.partner(pid);p.fleet=p.fleet||[];p.fleet.push(name);api.log(`${actor} added vehicle ${name} (${p.short||p.name})`,'partner')},
  })});
})();
