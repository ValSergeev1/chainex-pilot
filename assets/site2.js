/* V02 website: interactive market map (city chips <-> pins) and small helpers. */
(function(){function setCity(c){document.querySelectorAll('.mp-b').forEach(b=>b.classList.toggle('on',b.dataset.city===c));document.querySelectorAll('.st-map .mp-p').forEach(p=>p.classList.toggle('on',p.dataset.city===c));document.querySelectorAll('.st-map .mp-l').forEach(l=>l.classList.toggle('on',l.dataset.c===c));const cap=document.getElementById('mpCity');if(cap)cap.textContent=c}
document.addEventListener('click',e=>{const b=e.target.closest('.mp-b,.st-map .mp-p');if(b)setCity(b.dataset.city)});
window.CXSite={setCity};})();
