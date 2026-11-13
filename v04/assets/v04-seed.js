/* ChainEx V04 · demo seed: two real driver tickets through the shared driver Dispatch bot (once per data version) so the approve flow is visible. */
(function(){const C=window.CX;if(!C)return;
(function seedTickets(){try{C.init();if((C.S.tickets||[]).some(t=>t.status==='pending'))return;if(localStorage.getItem('cx.v04.seeded')===String(C.S.version))return;
 C.update(S=>{const a=S.drivers.find(d=>d.id==='drew')||S.drivers.find(d=>d.line==='pd'&&d.route&&d.route.stage==='on_road');const b=S.drivers.find(d=>d.line==='bulky'&&d.route&&d.route.stage==='on_road');
  if(a&&C.ops.botIssue)C.ops.botIssue(a.id,'toomany',null,"I'm not going to finish all of these before 8, too many stops in the north loop");
  if(b&&C.ops.botIssue)C.ops.botIssue(b.id,'vehicle',null,'Liftgate stopped working, waiting on roadside');});localStorage.setItem('cx.v04.seeded',String(C.S.version))}catch(e){console.warn(e)}})();
})();
