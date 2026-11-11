const canvas=document.querySelector('#stars'),ctx=canvas.getContext('2d');let w,h,stars=[],pace=0.35,distance=0,last=0;
function resize(){w=canvas.width=innerWidth*devicePixelRatio;h=canvas.height=innerHeight*devicePixelRatio;stars=Array.from({length:65},()=>({x:Math.random()*w,y:Math.random()*h*.65,r:(.3+Math.random()*.8)*devicePixelRatio,a:.15+Math.random()*.5}))}addEventListener('resize',resize);resize();
function animate(t){let dt=Math.min((t-last)/1000||0,.05);last=t;ctx.clearRect(0,0,w,h);for(const s of stars){s.x-=pace*dt*devicePixelRatio*5;if(s.x<0)s.x=w;ctx.beginPath();ctx.fillStyle=`rgba(209,230,232,${s.a})`;ctx.arc(s.x,s.y,s.r,0,Math.PI*2);ctx.fill()}distance+=dt*pace*.003;document.querySelector('#distance').innerHTML=distance.toFixed(2).padStart(6,'0')+' <small>LY</small>';requestAnimationFrame(animate)}requestAnimationFrame(animate);
const scene=document.querySelector('.scene');document.querySelector('#begin').onclick=()=>scene.classList.add('settled');document.querySelector('#hide').onclick=()=>scene.classList.add('minimal');document.querySelector('#restore').onclick=()=>scene.classList.remove('minimal');
const speeds=[['Slow drift',.35],['Gentle cruise',.8],['Stillness',0]];let speedIndex=0;document.querySelector('#speed').onclick=e=>{speedIndex=(speedIndex+1)%speeds.length;pace=speeds[speedIndex][1];e.currentTarget.querySelector('b').textContent=speeds[speedIndex][0]};
let audio,osc,gain,playing=false;document.querySelector('#sound').onclick=async e=>{if(!audio){audio=new (window.AudioContext||window.webkitAudioContext)();osc=audio.createOscillator();gain=audio.createGain();osc.type='sine';osc.frequency.value=55;gain.gain.value=0;osc.connect(gain).connect(audio.destination);osc.start()}await audio.resume();playing=!playing;gain.gain.setTargetAtTime(playing?.035:0,audio.currentTime,.5);e.currentTarget.querySelector('b').textContent=playing?'On':'Off'};

// Rotate the viewpoint over the cabin illustration without moving the viewer.
const look = { x: 0, y: 0, pointer: null };
function updateLook() {
  const maxX = scene.clientWidth * .07, maxY = scene.clientHeight * .07;
  look.x = Math.max(-maxX, Math.min(maxX, look.x));
  look.y = Math.max(-maxY, Math.min(maxY, look.y));
  scene.style.setProperty('--look-x', `${look.x}px`);
  scene.style.setProperty('--look-y', `${look.y}px`);
  scene.style.setProperty('--look-yaw', `${look.x / maxX * 5}deg`);
  scene.style.setProperty('--look-pitch', `${-look.y / maxY * 4}deg`);
}
scene.addEventListener('pointerdown', event => {
  if (event.button !== 0 || event.target.closest('button, select, label, a, audio, .music-player')) return;
  look.pointer = { id: event.pointerId, x: event.clientX, y: event.clientY };
  scene.setPointerCapture(event.pointerId); scene.classList.add('looking');
});
scene.addEventListener('pointermove', event => {
  if (!look.pointer || event.pointerId !== look.pointer.id) return;
  const dx = event.clientX - look.pointer.x, dy = event.clientY - look.pointer.y;
  look.x += dx; look.y += dy; look.pointer.x = event.clientX; look.pointer.y = event.clientY;
  if (dx || dy) scene.classList.add('has-looked'); updateLook();
});
function endLook(event) { if (!look.pointer || event.pointerId !== look.pointer.id) return; look.pointer = null; scene.classList.remove('looking'); }
scene.addEventListener('pointerup', endLook);
scene.addEventListener('pointercancel', endLook);
scene.addEventListener('lostpointercapture', endLook);
scene.addEventListener('keydown', event => {
  if (event.target !== scene) return;
  const offsets = { ArrowLeft: [24, 0], ArrowRight: [-24, 0], ArrowUp: [0, 24], ArrowDown: [0, -24] };
  if (!offsets[event.key]) return;
  event.preventDefault(); look.x += offsets[event.key][0]; look.y += offsets[event.key][1]; scene.classList.add('has-looked'); updateLook();
});
addEventListener('resize', updateLook);
