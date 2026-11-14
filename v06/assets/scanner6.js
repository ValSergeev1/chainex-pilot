/* ChainEx V06 · camera barcode scanner (scanner6.js). One API for every device:
     1) ChainEx Driver store app (Capacitor): native ML Kit (@capacitor-mlkit/barcode-scanning), continuous or single.
     2) Browsers with BarcodeDetector (Chrome / Android).
     3) Everything else, including iPhone Safari: vendored ZXing JS decoder (../assets/vendor/zxing, loaded on demand, no CDN).
   Continuous mode ("auto-scan") de-duplicates: the same code is ignored for sameMs, and any code waits gapMs after the last hit.
   CXScan.start(video,onCode,{continuous,sameMs,gapMs}) -> Promise<{engine,stop()}>; CXScan.feedback('ok'|'dup'|'wrong'). */
(function(){
const BASE=(()=>{try{return new URL('../../assets/vendor/zxing/zxing.min.js',document.currentScript.src).href}catch(e){return '../assets/vendor/zxing/zxing.min.js'}})();
const FORMATS=['code_128','code_39','qr_code','data_matrix','ean_13','ean_8','upc_a','upc_e','itf','pdf417','codabar'];
const cap=()=>{const C=window.Capacitor;return C&&C.isNativePlatform&&C.isNativePlatform()&&C.Plugins&&C.Plugins.BarcodeScanner?C.Plugins.BarcodeScanner:null};
let force=null;try{force=localStorage.getItem('cx.scan.engine')}catch(e){}
function engine(){if(force)return force;if(cap())return 'native';if('BarcodeDetector' in window)return 'detector';return 'zxing'}
let zxP=null;
function loadZXing(){if(window.ZXing)return Promise.resolve(window.ZXing);if(zxP)return zxP;
  zxP=new Promise((res,rej)=>{const s=document.createElement('script');s.src=BASE;s.async=true;s.onload=()=>window.ZXing?res(window.ZXing):rej(new Error('ZXing missing'));s.onerror=()=>{zxP=null;rej(new Error('ZXing failed to load'))};document.head.appendChild(s)});return zxP}
let reader=null;
function zxReader(Z){if(reader)return reader;reader=new Z.MultiFormatReader();const h=new Map();
  h.set(Z.DecodeHintType.POSSIBLE_FORMATS,[Z.BarcodeFormat.CODE_128,Z.BarcodeFormat.CODE_39,Z.BarcodeFormat.QR_CODE,Z.BarcodeFormat.DATA_MATRIX,Z.BarcodeFormat.EAN_13,Z.BarcodeFormat.EAN_8,Z.BarcodeFormat.UPC_A,Z.BarcodeFormat.UPC_E,Z.BarcodeFormat.ITF,Z.BarcodeFormat.PDF_417,Z.BarcodeFormat.CODABAR]);
  h.set(Z.DecodeHintType.TRY_HARDER,true);reader.setHints(h);return reader}
/* Decode one canvas / image / video frame with ZXing. Returns the text or null. */
async function decodeImage(src){const Z=await loadZXing();const c=document.createElement('canvas');const w=src.videoWidth||src.naturalWidth||src.width,h=src.videoHeight||src.naturalHeight||src.height;if(!w||!h)return null;
  const k=Math.min(1,1280/Math.max(w,h));c.width=Math.round(w*k);c.height=Math.round(h*k);c.getContext('2d',{willReadFrequently:true}).drawImage(src,0,0,c.width,c.height);return decodeCanvas(Z,c)}
function decodeCanvas(Z,c){const r=zxReader(Z);try{const lum=new Z.HTMLCanvasElementLuminanceSource(c);const bmp=new Z.BinaryBitmap(new Z.HybridBinarizer(lum));const out=r.decodeWithState?r.decodeWithState(bmp):r.decode(bmp);return out&&out.getText()}catch(e){return null}finally{try{r.reset()}catch(e){}}}
/* ---- feedback: distinct haptic + tone per result ---- */
let ac=null;const set={sound:true,haptics:true};
function tone(seq){if(!set.sound)return;try{ac=ac||new (window.AudioContext||window.webkitAudioContext)();if(ac.state==='suspended')ac.resume();let t=ac.currentTime;
  seq.forEach(([f,d,type])=>{const o=ac.createOscillator(),g=ac.createGain();o.type=type||'sine';o.frequency.value=f;g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.25,t+.01);g.gain.exponentialRampToValueAtTime(.0001,t+d/1000);o.connect(g).connect(ac.destination);o.start(t);o.stop(t+d/1000+.02);t+=d/1000+.05})}catch(e){}}
const PAT={ok:{v:[35],t:[[1480,80]]},dup:{v:[40,70,40],t:[[880,70],[880,70]]},wrong:{v:[220,90,220,90,450],t:[[196,180,'sawtooth'],[147,180,'sawtooth'],[110,320,'sawtooth']]}};
function feedback(kind){const p=PAT[kind]||PAT.ok;try{if(set.haptics){if(window.CXNativeHaptic)window.CXNativeHaptic(kind);else if(navigator.vibrate)navigator.vibrate(p.v)}}catch(e){}tone(p.t);window.__cxScanFeedback=(window.__cxScanFeedback||[]).concat([{kind,at:Date.now(),vibrate:p.v}]).slice(-20)}
/* ---- de-duplicating sink ---- */
function sink(onCode,o){let last='',lastAt=0,anyAt=0;const same=o.sameMs??2500,gap=o.gapMs??650;
  return raw=>{const code=String(raw||'').trim();if(!code)return false;const n=Date.now();if(n-anyAt<gap)return false;if(code===last&&n-lastAt<same)return false;last=code;lastAt=n;anyAt=n;try{onCode(code)}catch(e){console.warn(e)}return true}}
/* ---- flashlight (torch). Many desktop browsers and iPhone Safari have no torch; degrade quietly. ---- */
function videoTrack(stream){try{return stream&&stream.getVideoTracks&&stream.getVideoTracks()[0]||null}catch(e){return null}}
function torchCapable(track){try{const c=track&&track.getCapabilities&&track.getCapabilities();return !!(c&&('torch' in c)&&c.torch)}catch(e){return false}}
async function applyTorch(track,on){if(!track)return false;try{await track.applyConstraints({advanced:[{torch:!!on}]});return true}catch(e){return false}}
function sampleLuma(video){try{const w=video.videoWidth,h=video.videoHeight;if(!w||!h)return null;const c=sampleLuma._c||(sampleLuma._c=document.createElement('canvas'));const g=c.getContext('2d',{willReadFrequently:true});c.width=32;c.height=32;const s=Math.min(w,h)*.5,sx=(w-s)/2,sy=(h-s)/2;g.drawImage(video,sx,sy,s,s,0,0,32,32);const d=g.getImageData(0,0,32,32).data;let t=0,n=0;for(let i=0;i<d.length;i+=4){t+=.2126*d[i]+.7152*d[i+1]+.0722*d[i+2];n++}return n?t/n:null}catch(e){return null}}
function attachTorch(sess,video,stream,o){const track=videoTrack(stream);sess.stream=stream;sess.torchCapable=torchCapable(track);sess.torchOn=false;sess.luma=null;sess.torchManual=null;let darkN=0,litN=0;
  sess.setTorch=async on=>{const ok=await applyTorch(track,on);if(ok)sess.torchOn=!!on;return ok};
  sess.sampleLight=async()=>{const luma=sampleLuma(video);sess.luma=luma;const auto=o&&(typeof o.autoTorch==='function'?o.autoTorch():o&&o.autoTorch);const man=sess.torchManual;
    if(sess.torchCapable&&auto&&man==null&&luma!=null){if(luma<45){darkN++;litN=0;if(darkN>=3&&!sess.torchOn)await sess.setTorch(true)}else if(luma>80){litN++;darkN=0;if(litN>=4&&sess.torchOn)await sess.setTorch(false)}else{darkN=0;litN=0}}
    if(o&&o.onLight)try{o.onLight({luma,capable:sess.torchCapable,on:sess.torchOn,manual:man})}catch(e){}
    return luma};
  return sess}
/* ---- start a camera session ---- */
async function start(video,onCode,o={}){const eng=o.engine||engine();const push=sink(onCode,o);let stopped=false,stream=null,timer=null,handle=null;
  const stop=async()=>{stopped=true;clearTimeout(timer);if(stream){try{const t=videoTrack(stream);if(t)await applyTorch(t,false)}catch(e){}stream.getTracks().forEach(t=>t.stop())}stream=null;if(video)video.srcObject=null;
    if(eng==='native'){const BS=cap();try{handle&&handle.remove&&(await handle.remove())}catch(e){}try{await BS.stopScan()}catch(e){}document.documentElement.classList.remove('cx-native-scan')}};
  const sess={engine:eng,stop,push};
  if(eng==='native'){const BS=cap();try{const p=await BS.checkPermissions();if(p.camera!=='granted'){const q=await BS.requestPermissions();if(q.camera!=='granted')throw new Error('Camera permission denied')}}catch(e){if(/denied/i.test(e.message))throw e}
    if(!o.continuous&&BS.scan){const r=await BS.scan({});const b=r&&r.barcodes&&r.barcodes[0];if(b)push(b.rawValue||b.displayValue);return sess}
    document.documentElement.classList.add('cx-native-scan');handle=await BS.addListener('barcodesScanned',ev=>{(ev.barcodes||[]).forEach(b=>{if(!stopped&&push(b.rawValue||b.displayValue)&&!o.continuous)stop()})});await BS.startScan({});return sess}
  if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia)throw new Error('No camera in this browser');
  stream=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:720}}});
  if(stopped){stream.getTracks().forEach(t=>t.stop());return sess}
  video.setAttribute('playsinline','');video.muted=true;video.srcObject=stream;try{await video.play()}catch(e){}
  attachTorch(sess,video,stream,o);
  let detect;
  if(eng==='detector'){let fm=FORMATS;try{const sup=await BarcodeDetector.getSupportedFormats();fm=FORMATS.filter(f=>sup.includes(f))}catch(e){}const det=new BarcodeDetector({formats:fm});detect=async()=>{const r=await det.detect(video);return r&&r[0]&&r[0].rawValue}}
  else{const Z=await loadZXing();const c=document.createElement('canvas');const g=c.getContext('2d',{willReadFrequently:true});
    detect=async()=>{const w=video.videoWidth,h=video.videoHeight;if(!w||!h)return null;const k=Math.min(1,960/Math.max(w,h));c.width=Math.round(w*k);c.height=Math.round(h*k);g.drawImage(video,0,0,c.width,c.height);return decodeCanvas(Z,c)}}
  const loop=async()=>{if(stopped)return;let code=null;try{code=await detect()}catch(e){}if(stopped)return;try{if(sess.sampleLight)await sess.sampleLight()}catch(e){}if(code&&push(code)&&!o.continuous){stop();return}timer=setTimeout(loop,eng==='zxing'?140:200)};loop();
  return sess}
window.CXScan={engine,start,decodeImage,loadZXing,feedback,settings:set,FORMATS,zxingUrl:BASE,torchCapable,sampleLuma,applyTorch,setEngine:e=>{force=e||null;try{e?localStorage.setItem('cx.scan.engine',e):localStorage.removeItem('cx.scan.engine')}catch(x){}}};
})();
