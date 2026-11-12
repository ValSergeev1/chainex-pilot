/* ChainEx Pilot · fictional addresses on real Seattle / Bellevue / Kent street grids (approximate coordinates) */
(function(){
const ord=n=>{const s=n%100;if(s>=11&&s<=13)return n+'th';return n+({1:'st',2:'nd',3:'rd'}[n%10]||'th')};
function rng(seed){let a=seed>>>0;return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const G={
  belNE:{lat:x=>47.6105+x*0.00087,lng:n=>-122.2045+(n-100)*0.00131,ave:n=>`${ord(n)} Ave NE`,st:x=>`NE ${ord(x)} St`,city:'Bellevue',zip:n=>n<116?'98004':n<140?'98005':'98007'},
  belSE:{lat:x=>47.6105-x*0.00087,lng:n=>-122.2045+(n-100)*0.00131,ave:n=>`${ord(n)} Ave SE`,st:x=>`SE ${ord(x)} St`,city:'Bellevue',zip:n=>n<140?'98005':'98006'},
  seaNE:{lat:x=>47.6614+(x-45)*0.00072,lng:n=>-122.3345+n*0.00148,ave:n=>`${ord(n)} Ave NE`,st:x=>`NE ${ord(x)} St`,city:'Seattle',zip:(n,x)=>x<55?'98105':'98115'},
  seaNW:{lat:x=>47.6614+(x-45)*0.00072,lng:n=>-122.3567-n*0.00122,ave:n=>`${ord(n)} Ave NW`,st:x=>`NW ${ord(x)} St`,city:'Seattle',zip:(n,x)=>x<70?'98107':'98117'},
  kentS:{lat:x=>47.4405-(x-180)*0.000906,lng:n=>-122.2525+(n-64)*0.0014,ave:n=>`${ord(n)} Ave S`,st:x=>`S ${ord(x)} St`,city:'Kent',zip:()=>'98032'},
};
function addr(gk,r,o){const g=G[gk];const ri=(a,b)=>a+Math.floor(r()*(b-a+1));let ave=ri(o.aves[0],o.aves[1]),st=ri(o.sts[0],o.sts[1]),num,street,ll;
  if(r()<0.55){const f=r();num=st*100+Math.floor(f*98)+1;street=g.ave(ave);ll=[g.lng(ave),g.lat(st)+(g.lat(st+1)-g.lat(st))*f]}
  else{const f=r();num=ave*100+Math.floor(f*98)+1;street=g.st(st);ll=[g.lng(ave)+(g.lng(ave+1)-g.lng(ave))*f,g.lat(st)]}
  return{num,street,line1:`${num} ${street}`,address:`${num} ${street}, ${g.city}, WA ${g.zip(ave,st)}`,city:g.city,ll:[+ll[0].toFixed(5),+ll[1].toFixed(5)]}}
window.CXGeo={rng,addr,grids:G,ord};
})();
