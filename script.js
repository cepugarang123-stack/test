/* =========================================================================
 * Web Photobooth — script.js (landscape & custom sticker) — FIXED
 * ========================================================================= */

/* ---------- Helpers & Status UI ---------- */
const $ = (sel) => document.querySelector(sel);
const statusEl = $('#status');
function setStatus(level, html){
  if(!statusEl) return;
  statusEl.className = 'status ' + (level||'');
  statusEl.innerHTML = html;
}
function isLocalhost(){ return ['localhost','127.0.0.1','[::1]'].includes(location.hostname); }
function isSecure(){ return window.isSecureContext || location.protocol === 'https:' || isLocalhost(); }

/* ---------- Elements ---------- */
const video       = $('#video');
const canvas      = $('#canvas');
const btnStart    = $('#btnStart');
const btnStop     = $('#btnStop');
const btnFlip     = $('#btnFlip');
const btnSnap     = $('#btnSnap');
const btnDownload = $('#btnDownload');
const btnClear    = $('#btnClear');
const selFilter   = $('#selFilter');
const selDevice   = $('#selDevice');
const chkTimer    = $('#chkTimer');
const countdownEl = $('#countdown');
const gallery     = $('#gallery');
const sticker     = $('#sticker'); // draggable sticker <img>

/* Opsional */
const selFrame     = $('#selFrame');
const btnSnap3     = $('#btnSnap3');
const framePreview = document.querySelector('.frame');

/* Custom sticker (opsional) */
const stickerSelect   = $('#stickerSelect');
const stickerUpload   = $('#stickerUpload');
const stickerUpload2  = $('#stickerUpload2');
const videoWrap       = document.querySelector('.video-wrap');

/* Sticker Builder controls (opsional) */
const stickerMode   = $('#stickerMode');
const emojiPicker   = $('#emojiPicker');
const stickerText   = $('#stickerText');
const textColor     = $('#textColor');
const textFont      = $('#textFont');
const shapePicker   = $('#shapePicker');
const shapeColor    = $('#shapeColor');
const stickerSizeEl = $('#stickerSize');
const btnStickerMinus = $('#btnStickerMinus');
const btnStickerPlus  = $('#btnStickerPlus');

/* Diagnostik (opsional) */
const testsEl        = $('#tests');
const btnDiagnostics = $('#btnDiagnostics');
const btnCameraTest  = $('#btnCameraTest');

/* ---------- State ---------- */
let stream = null;
let useFront = true;
let lastDataUrl = null;

/* ---------- Permissions Probe ---------- */
async function getCameraPermissionStatus(){
  if (!('permissions' in navigator)) return null;
  try{ const s = await navigator.permissions.query({ name: 'camera' }); return s.state; }
  catch{ return null; }
}

/* ---------- Devices ---------- */
async function listDevices(selectedId){
  if (!navigator.mediaDevices?.enumerateDevices || !selDevice) return;
  const devices = await navigator.mediaDevices.enumerateDevices();
  const cams = devices.filter(d => d.kind === 'videoinput');
  selDevice.innerHTML = '';
  cams.forEach((cam, idx) => {
    const opt = document.createElement('option');
    opt.value = cam.deviceId;
    opt.textContent = cam.label || `Kamera ${idx+1}`;
    selDevice.appendChild(opt);
  });
  if(selectedId){ selDevice.value = selectedId; }
}

/* ---------- Camera Control ---------- */
async function startCamera(deviceId){
  if (!isSecure()){
    setStatus('error', 'Kamera diblokir karena bukan konteks aman. Jalankan lewat <b>HTTPS</b> atau <code>http://localhost</code>.');
    return;
  }
  if (!navigator.mediaDevices?.getUserMedia){
    setStatus('error', 'Browser Anda tidak mendukung getUserMedia. Coba Chrome/Edge/Firefox terbaru atau Safari iOS.');
    return;
  }
  stopCamera();
  const constraints = {
    video: deviceId ? { deviceId: { exact: deviceId } }
                    : { facingMode: useFront ? 'user' : 'environment' },
    audio: false
  };
  try{
    stream = await navigator.mediaDevices.getUserMedia(constraints);
    video.srcObject = stream;
    await video.play();
    await listDevices(deviceId);
    setStatus('ok', 'Kamera aktif. Jika gambar hitam, pastikan tidak ada aplikasi lain memakai kamera.');
  } catch(err){
    console.error(err);
    handleGetUserMediaError(err);
  }
}
function stopCamera(){
  if(stream){ stream.getTracks().forEach(t=>t.stop()); stream = null; }
  if(video) video.srcObject = null;
}
function handleGetUserMediaError(err){
  const name = err?.name || 'Error';
  if (name === 'NotAllowedError' || name === 'SecurityError'){
    setStatus('error', 'Akses kamera ditolak. Buka <em>Site settings</em> → <b>Camera</b> → <b>Allow</b>. Pastikan halaman via <b>HTTPS</b> / <code>localhost</code>, lalu coba lagi.');
    return;
  }
  if (name === 'NotFoundError' || name === 'OverconstrainedError'){
    setStatus('error', 'Tidak ada kamera yang tersedia atau perangkat yang dipilih tidak ditemukan. Coba pilih perangkat lain.');
    return;
  }
  if (name === 'NotReadableError' || name === 'TrackStartError'){
    setStatus('error', 'Kamera sedang dipakai aplikasi lain (Zoom/Meet/Webex). Tutup aplikasi tersebut lalu coba lagi.');
    return;
  }
  setStatus('error', `${name}: ${err.message || 'Gagal membuka kamera.'}`);
}

/* ---------- UI Events (camera & filter) ---------- */
btnStart?.addEventListener('click', () => startCamera());
btnStop ?.addEventListener('click', () => { stopCamera(); setStatus('warn','Kamera dihentikan. Klik <b>Mulai Kamera</b> untuk mengaktifkan lagi.'); });
btnFlip ?.addEventListener('click', () => { useFront = !useFront; startCamera(); });
selDevice?.addEventListener('change', () => startCamera(selDevice.value));
selFilter?.addEventListener('change', () => { if(video) video.style.filter = selFilter.value; });

/* ---------- Sticker Drag ---------- */
let dragging = false, offsetX=0, offsetY=0;
sticker?.addEventListener('pointerdown', (e)=>{
  dragging = true;
  offsetX = e.offsetX; offsetY = e.offsetY;
  sticker.setPointerCapture(e.pointerId);
  sticker.style.cursor = 'grabbing';
});
sticker?.addEventListener('pointermove', (e)=>{
  if(!dragging) return;
  const wrap = video.parentElement.getBoundingClientRect();
  let x = e.clientX - wrap.left - offsetX;
  let y = e.clientY - wrap.top  - offsetY;
  x = Math.max(0, Math.min(wrap.width  - sticker.offsetWidth,  x));
  y = Math.max(0, Math.min(wrap.height - sticker.offsetHeight, y));
  sticker.style.left   = x + 'px';
  sticker.style.top    = y + 'px';
  sticker.style.bottom = 'auto';
  sticker.style.right  = 'auto';
});
sticker?.addEventListener('pointerup', ()=>{ dragging = false; sticker.style.cursor = 'grab'; });

/* ---------- Custom Sticker helpers ---------- */
let _lastStickerBlobUrl = null;
function setSticker(src, {isBlob=false} = {}){
  if(!sticker) return;
  sticker.onload = () => {
    setStatus('ok', 'Stiker siap.');
    if(isBlob && _lastStickerBlobUrl && _lastStickerBlobUrl !== src){
      URL.revokeObjectURL(_lastStickerBlobUrl);
    }
    if(isBlob) _lastStickerBlobUrl = src;
    if(!sticker.style.width) sticker.style.width = '96px';
    sticker.style.display = 'block';
  };
  sticker.onerror = (e) => { setStatus('error', 'Gagal memuat stiker.'); console.error('Sticker load error:', e, src); };
  sticker.crossOrigin = 'anonymous';
  sticker.referrerPolicy = 'no-referrer';
  sticker.src = src;
}

/* ---------- Builder: Emoji/Teks/Bentuk ---------- */
function makeEmojiDataURL(emoji, sizePx){
  const pad = Math.round(sizePx * 0.2);
  const W = sizePx + pad*2, H = sizePx + pad*2;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const ctx = c.getContext('2d');
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = `${sizePx}px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji", system-ui, sans-serif`;
  ctx.fillText(emoji || '🎉', W/2, H/2);
  return c.toDataURL('image/png');
}
function makeTextDataURL(text, sizePx, color, fontSpec){
  const pad = Math.round(sizePx * 0.35);
  const c = document.createElement('canvas'); const ctx = c.getContext('2d');
  ctx.font = fontSpec.replace(/\b\d+px\b/, `${sizePx}px`);
  const m = ctx.measureText(text || '');
  const textW = Math.max(1, Math.ceil(m.width));
  const textH = Math.max(sizePx, Math.ceil(m.actualBoundingBoxAscent + m.actualBoundingBoxDescent));
  c.width = textW + pad*2; c.height = textH + pad*2;
  const ctx2 = c.getContext('2d');
  ctx2.font = ctx.font; ctx2.textAlign = 'center'; ctx2.textBaseline = 'middle';
  ctx2.fillStyle = color || '#fff';
  ctx2.shadowColor = 'rgba(0,0,0,.35)'; ctx2.shadowBlur = Math.max(2, Math.floor(sizePx*0.08));
  ctx2.fillText(text || 'Hello!', c.width/2, c.height/2);
  return c.toDataURL('image/png');
}
function makeShapeDataURL(shape, sizePx, color){
  const pad = Math.round(sizePx * 0.25);
  const W = sizePx + pad*2, H = sizePx + pad*2;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const ctx = c.getContext('2d');
  ctx.fillStyle = color || '#ffd54f'; ctx.strokeStyle = 'rgba(0,0,0,.25)';
  ctx.lineWidth = Math.max(2, Math.floor(sizePx*0.06));
  if(shape === 'circle'){
    ctx.beginPath(); ctx.arc(W/2, H/2, sizePx/2, 0, Math.PI*2); ctx.fill(); ctx.stroke();
  } else if(shape === 'square'){
    const s = sizePx, x=(W-s)/2, y=(H-s)/2; ctx.beginPath(); ctx.rect(x,y,s,s); ctx.fill(); ctx.stroke();
  } else if(shape === 'star'){
    const spikes=5, outerR=sizePx/2, innerR=outerR*0.5; const cx=W/2, cy=H/2; let rot=Math.PI/2*3; let x=cx, y=cy;
    ctx.beginPath(); ctx.moveTo(cx, cy-outerR);
    for(let i=0; i<spikes; i++){
      x = cx + Math.cos(rot) * outerR; y = cy + Math.sin(rot) * outerR; ctx.lineTo(x,y); rot += Math.PI/spikes;
      x = cx + Math.cos(rot) * innerR; y = cy + Math.sin(rot) * innerR; ctx.lineTo(x,y); rot += Math.PI/spikes;
    }
    ctx.lineTo(cx, cy-outerR); ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  return c.toDataURL('image/png');
}

/* Apply builder → <img id="sticker"> */
function rebuildSticker(){
  if(!sticker) return;
  const mode = stickerMode?.value || 'emoji';
  const size = parseInt(stickerSizeEl?.value || '120', 10);

  if(mode === 'none'){
    sticker.style.display = 'none';
    updateStickerControlsEnable(mode);
    return;
  }

  let dataURL = null;
  if(mode === 'emoji'){
    const emoji = (emojiPicker?.value || '🎉').trim();
    dataURL = makeEmojiDataURL(emoji, size);
  } else if(mode === 'text'){
    const text    = (stickerText?.value || '').slice(0, 40);
    const color   = textColor?.value || '#ffffff';
    const fontSel = textFont?.value || 'Bold 48px system-ui';
    const fontSz  = fontSel.replace(/\b\d+px\b/, `${size}px`);
    dataURL = makeTextDataURL(text || 'Hello!', size, color, fontSz);
  } else if(mode === 'shape'){
    const shape = shapePicker?.value || 'circle';
    const color = shapeColor?.value || '#ffd54f';
    dataURL = makeShapeDataURL(shape, size, color);
  }

  if(dataURL){
    setSticker(dataURL, { isBlob:false });
    sticker.style.width  = `${size + Math.round(size*0.3)}px`;
    sticker.style.height = 'auto';
    sticker.style.display= 'block';
  }
  updateStickerControlsEnable(mode);
}

/* Enable/disable kontrol sesuai mode agar UI lebih jelas */
function updateStickerControlsEnable(mode){
  const enable = (el, on)=>{ if(el){ el.disabled = !on; el.ariaDisabled = String(!on); } };
  mode = mode || (stickerMode?.value || 'emoji');
  enable(emojiPicker, mode === 'emoji');
  [stickerText,textColor,textFont].forEach(el=> enable(el, mode === 'text'));
  [shapePicker,shapeColor].forEach(el=> enable(el, mode === 'shape'));
  enable(stickerSizeEl, mode !== 'none');
}

/* Ukuran cepat: tombol ± dan fungsi setter */
function setStickerSize(px){
  const min = 48, max = 256;
  const v = Math.max(min, Math.min(max, Math.round(px)));
  if (stickerSizeEl) stickerSizeEl.value = String(v);

  // Jika stiker dibuat dari builder (emoji/teks/bentuk), rebuild
  // supaya ukuran di hasil foto ikut berubah.
  if (typeof rebuildSticker === 'function') {
    rebuildSticker();
  } else {
    // fallback: ubah ukuran preview saja
    if (sticker) sticker.style.width = (v + Math.round(v*0.3)) + 'px';
  }
}

// slider
stickerSizeEl?.addEventListener('input',  ()=> setStickerSize(+stickerSizeEl.value));
stickerSizeEl?.addEventListener('change', ()=> setStickerSize(+stickerSizeEl.value));

// tombol ±
btnStickerMinus?.addEventListener('click', ()=> setStickerSize(+stickerSizeEl.value - 8));
btnStickerPlus ?.addEventListener('click', ()=> setStickerSize(+stickerSizeEl.value + 8));


/* Pastikan kontrol memicu rebuild (input & change) */
function bindStickerControlEvents(){
  const ids = ['stickerMode','emojiPicker','stickerText','textColor','textFont','shapePicker','shapeColor','stickerSize'];
  for (const id of ids){
    const el = document.getElementById(id);
    if(!el) continue;
    el.addEventListener('input',  rebuildSticker);
    el.addEventListener('change', rebuildSticker);
  }
}

/* ---------- Upload/preset/drag&drop ---------- */
stickerUpload?.addEventListener('change', (e)=>{
  const file = e.target.files?.[0]; if(!file) return;
  const url = URL.createObjectURL(file);
  setSticker(url, {isBlob:true});
});
stickerSelect?.addEventListener('change', (e)=>{
  const v = e.target.value;
  if(v === 'smile') setSticker('stickers/smile.png');
  else if(v === 'love') setSticker('stickers/love.png');
  else if(v === 'star') setSticker('stickers/star.png');
  else if(v === 'custom') stickerUpload2?.click();
});
stickerUpload2?.addEventListener('change', (e)=>{
  const file = e.target.files?.[0]; if(!file) return;
  const url = URL.createObjectURL(file);
  setSticker(url, {isBlob:true});
});
if(videoWrap){
  videoWrap.addEventListener('dragover', (e)=>{ e.preventDefault(); videoWrap.classList.add('drag-over'); });
  videoWrap.addEventListener('dragleave', ()=>{ videoWrap.classList.remove('drag-over'); });
  videoWrap.addEventListener('drop', (e)=>{
    e.preventDefault(); videoWrap.classList.remove('drag-over');
    const file = e.dataTransfer.files?.[0]; if(!file) return;
    const url = URL.createObjectURL(file);
    setSticker(url, {isBlob:true});
  });
}

/* ---------- Countdown ---------- */
async function doCountdown(){
  countdownEl?.classList.remove('hidden');
  for(let n=3; n>0; n--){ if (countdownEl) countdownEl.textContent = n; await new Promise(r => setTimeout(r, 900)); }
  countdownEl?.classList.add('hidden');
}

/* ---------- Frame preview ---------- */
function updateFramePreview(){
  if(!framePreview || !selFrame) return;
  const f = selFrame.value;
  framePreview.style.boxShadow='none'; framePreview.style.borderRadius='0';
  framePreview.style.background='transparent'; framePreview.style.clipPath='none';
  if(f === 'polaroid'){ framePreview.style.clipPath='inset(4% 4% 14% 4%)'; }
  else if(f === 'gold'){ framePreview.style.boxShadow='inset 0 0 0 14px #d4af37'; framePreview.style.borderRadius='18px'; }
  else if(f === 'simple'){ framePreview.style.boxShadow='inset 0 0 0 12px rgba(255,255,255,.85)'; framePreview.style.borderRadius='12px'; }
}
selFrame?.addEventListener('change', updateFramePreview);

/* ---------- Capture (LANDSCAPE 1280x960) ---------- */
async function snapOne(){
  if(!stream) { setStatus('warn','Kamera belum aktif. Klik <b>Mulai Kamera</b> terlebih dahulu.'); return null; }
  if(chkTimer?.checked){ await doCountdown(); }
  const vw = video.videoWidth, vh = video.videoHeight;
  if (!vw || !vh){ setStatus('warn','Stream belum siap. Tunggu 1-2 detik lalu coba lagi.'); return null; }

  const W = 1280, H = 960;
  const off = document.createElement('canvas'); off.width = W; off.height = H;
  const ctx = off.getContext('2d');

  ctx.save();
  ctx.filter = getComputedStyle(video).filter || 'none';
  ctx.translate(W, 0); ctx.scale(-1, 1);

  const sourceAR = vw/vh, targetAR = W/H;
  let sx, sy, sW, sH;
  if(sourceAR > targetAR){ sH = vh; sW = vh * targetAR; sx = (vw - sW)/2; sy = 0; }
  else { sW = vw; sH = vw / targetAR; sx = 0; sy = (vh - sH)/2; }
  ctx.drawImage(video, sx, sy, sW, sH, 0, 0, W, H);
  ctx.restore();

  // Draw sticker only if visible
  if (sticker && getComputedStyle(sticker).display !== 'none'){
    const wrapRect = video.getBoundingClientRect();
    const sRect = sticker.getBoundingClientRect();
    const relX = (sRect.left - wrapRect.left) / wrapRect.width;
    const relY = (sRect.top  - wrapRect.top ) / wrapRect.height;
    const relW = sRect.width / wrapRect.width;
    const relH = sRect.height/ wrapRect.height;
    const dx = relX * W, dy = relY * H, dw = relW * W, dh = relH * H;

    const img = new Image();
    img.crossOrigin = 'anonymous'; img.referrerPolicy = 'no-referrer';
    img.src = sticker.src;
    try { await img.decode(); } catch(e) { console.warn('Sticker decode warning:', e); }
    ctx.globalAlpha = 0.95; ctx.drawImage(img, dx, dy, dw, dh); ctx.globalAlpha = 1;
  }

  drawFrame(ctx, W, H, selFrame?.value || 'none');
  return off.toDataURL('image/png');
}

/* ---------- Frame render ---------- */
function drawFrame(ctx, W, H, type){
  if(type === 'polaroid'){
    ctx.save();
    const pad = Math.floor(0.04*W), bottom = Math.floor(0.10*H);
    roundRect(ctx, pad, pad, W-2*pad, H-2*pad+bottom, 22);
    ctx.fillStyle = '#fff'; ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.08)'; ctx.lineWidth = 5;
    roundRect(ctx, pad, pad, W-2*pad, H-2*pad, 18); ctx.stroke();
    ctx.restore();
  } else if(type === 'gold'){
    ctx.save(); ctx.strokeStyle = '#d4af37'; ctx.lineWidth = 24;
    roundRect(ctx, 16, 16, W-32, H-32, 28); ctx.stroke(); ctx.restore();
  } else if(type === 'simple'){
    ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 16;
    roundRect(ctx, 14, 14, W-28, H-28, 16); ctx.stroke(); ctx.restore();
  } else {
    ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,.12)'; ctx.lineWidth = 12;
    roundRect(ctx, 10, 10, W-20, H-20, 14); ctx.stroke(); ctx.restore();
  }
}
function roundRect(ctx, x, y, w, h, r){
  const rr = Math.min(r, w/2, h/2);
  ctx.beginPath();
  ctx.moveTo(x+rr, y);
  ctx.arcTo(x+w, y, x+w, y+h, rr);
  ctx.arcTo(x+w, y+h, x, y+h, rr);
  ctx.arcTo(x, y+h, x, y, rr);
  ctx.arcTo(x, y, x+w, y, rr);
  ctx.closePath();
}

/* ---------- Single & Triple capture ---------- */
async function snap(){
  const dataUrl = await snapOne();
  if(!dataUrl) return;
  lastDataUrl = dataUrl;
  addToGallery(dataUrl);
  setStatus('ok','Foto diambil. Lihat di Galeri atau klik "Unduh Terakhir".');
}
async function snapThreeStrip(){
  if(!btnSnap3) return;
  const shots = [];
  for(let i=0;i<3;i++){ const d = await snapOne(); if(!d) return; shots.push(d); await sleep(300); }

  const singleW = 1280, singleH = 960, gap = 36;
  const stripW = singleW, stripH = singleH*3 + gap*2;
  const out = document.createElement('canvas'); out.width = stripW; out.height = stripH;
  const ctx = out.getContext('2d');
  ctx.fillStyle = '#111'; ctx.fillRect(0,0,stripW,stripH);

  for(let i=0;i<shots.length;i++){
    const img = await loadImage(shots[i]);
    const y = i*(singleH+gap);
    ctx.drawImage(img, 0, y, singleW, singleH);
  }
  ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 22;
  roundRect(ctx, 12, 12, stripW-24, stripH-24, 24); ctx.stroke();

  const dataUrl = out.toDataURL('image/png');
  lastDataUrl = dataUrl; addToGallery(dataUrl);
  setStatus('ok','Photo strip siap! Lihat di Galeri atau klik "Unduh Terakhir".');
}

/* ---------- Utilities ---------- */
function addToGallery(dataUrl){
  if(!gallery) return;
  const div = document.createElement('div'); div.className = 'thumb';
  const img = document.createElement('img'); img.src = dataUrl;
  const a = document.createElement('a'); const ts = new Date().toISOString().replace(/[:.]/g,'-');
  a.textContent = 'Unduh'; a.href = dataUrl; a.download = 'photobooth-'+ts+'.png';
  div.appendChild(img); div.appendChild(a); gallery.prepend(div);
}
function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }
function loadImage(src){
  return new Promise((res, rej)=>{ const img = new Image(); img.onload = ()=>res(img); img.onerror = rej; img.src = src; });
}

/* ---------- Download & Clear ---------- */
btnDownload?.addEventListener('click', ()=>{
  if(!lastDataUrl) { setStatus('warn','Belum ada foto. Klik "Ambil Foto" dulu.'); return; }
  const a = document.createElement('a'); const ts = new Date().toISOString().replace(/[:.]/g,'-');
  a.href = lastDataUrl; a.download = 'photobooth-'+ts+'.png';
  document.body.appendChild(a); a.click(); a.remove();
});
btnClear?.addEventListener('click', ()=>{ if(gallery) gallery.innerHTML=''; lastDataUrl=null; });

/* ---------- Diagnostics ---------- */
function addTestResult(ok, label, extra=''){
  if(!testsEl) return;
  const li = document.createElement('li');
  li.innerHTML = `<b>${ok? 'PASS':'FAIL'}</b> — ${label}${extra? ' — '+extra:''}`;
  li.style.color = ok ? 'var(--ok)' : 'var(--danger)';
  testsEl.appendChild(li);
}
async function runDiagnostics(){
  if(!testsEl) return;
  testsEl.innerHTML = '';
  addTestResult(isSecure(), 'Konteks aman (HTTPS atau localhost)', location.protocol + '//' + location.host);
  addTestResult(!!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia), 'API getUserMedia tersedia');
  addTestResult(!!navigator.mediaDevices?.enumerateDevices, 'API enumerateDevices tersedia');
  const perm = await getCameraPermissionStatus();
  addTestResult(perm !== 'denied', 'Izin kamera (Permissions API)', perm ?? 'tidak didukung');
  addTestResult(!!video, 'Elemen <video> siap');
}
async function runCameraSmokeTest(){
  if(!testsEl) return;
  testsEl.innerHTML = '';
  try{
    const s = await navigator.mediaDevices.getUserMedia({ video:true, audio:false });
    addTestResult(true, 'getUserMedia berhasil (smoke test)');
    s.getTracks().forEach(t=>t.stop());
  }catch(err){
    addTestResult(false, 'getUserMedia gagal (smoke test)', `${err.name}: ${err.message}`);
    handleGetUserMediaError(err);
  }
}
btnDiagnostics?.addEventListener('click', runDiagnostics);
btnCameraTest ?.addEventListener('click', runCameraSmokeTest);

/* ---------- Bind Capture Buttons ---------- */
btnSnap ?.addEventListener('click', snap);
btnSnap3?.addEventListener('click', snapThreeStrip);

/* ---------- Init ---------- */
window.addEventListener('load', ()=>{
  if (selFilter && video) video.style.filter = selFilter.value || 'none';
  updateFramePreview();
  setStatus(isSecure()? 'warn' : 'error', isSecure()
    ? 'Siap. Klik <b>Mulai Kamera</b> untuk meminta izin.'
    : 'Tidak aman: jalankan di <b>HTTPS</b> atau <code>localhost</code> agar kamera bisa dipakai.');

  if(sticker){ sticker.style.left='12px'; sticker.style.bottom='12px'; sticker.style.top='auto'; }

  bindStickerControlEvents();
  if(stickerMode || emojiPicker || stickerText || shapePicker) rebuildSticker();
});
