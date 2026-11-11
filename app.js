const canvas=document.querySelector('#stars'),ctx=canvas.getContext('2d');let w,h,stars=[],pace=0.35,distance=0,last=0;
function resize(){w=canvas.width=innerWidth*devicePixelRatio;h=canvas.height=innerHeight*devicePixelRatio;stars=Array.from({length:65},()=>({x:Math.random()*w,y:Math.random()*h*.65,r:(.3+Math.random()*.8)*devicePixelRatio,a:.15+Math.random()*.5}))}addEventListener('resize',resize);resize();
function animate(t){let dt=Math.min((t-last)/1000||0,.05);last=t;ctx.clearRect(0,0,w,h);for(const s of stars){s.x-=pace*dt*devicePixelRatio*5;if(s.x<0)s.x=w;ctx.beginPath();ctx.fillStyle=`rgba(209,230,232,${s.a})`;ctx.arc(s.x,s.y,s.r,0,Math.PI*2);ctx.fill()}distance+=dt*pace*.003;document.querySelector('#distance').innerHTML=distance.toFixed(2).padStart(6,'0')+' <small>LY</small>';requestAnimationFrame(animate)}requestAnimationFrame(animate);
const scene=document.querySelector('.scene');document.querySelector('#begin').onclick=()=>scene.classList.add('settled');document.querySelector('#hide').onclick=()=>scene.classList.add('minimal');document.querySelector('#restore').onclick=()=>scene.classList.remove('minimal');
const speeds=[['Slow drift',.35],['Gentle cruise',.8],['Stillness',0]];let speedIndex=0;document.querySelector('#speed').onclick=e=>{speedIndex=(speedIndex+1)%speeds.length;pace=speeds[speedIndex][1];e.currentTarget.querySelector('b').textContent=speeds[speedIndex][0]};
let audio,osc,gain,playing=false;document.querySelector('#sound').onclick=async e=>{if(!audio){audio=new (window.AudioContext||window.webkitAudioContext)();osc=audio.createOscillator();gain=audio.createGain();osc.type='sine';osc.frequency.value=55;gain.gain.value=0;osc.connect(gain).connect(audio.destination);osc.start()}await audio.resume();playing=!playing;gain.gain.setTargetAtTime(playing?.035:0,audio.currentTime,.5);e.currentTarget.querySelector('b').textContent=playing?'On':'Off'};

// Stable configuration IDs keep saved preferences independent of asset filenames.
const ships = {
  'night-watch': { image: 'assets/cockpit-original-edited.png' },
  'amber-voyager': { image: 'assets/cockpit.png' }
};
const shipSelector = document.querySelector('#ship');
function selectShip(id) {
  if (!Object.hasOwn(ships, id)) id = 'night-watch';
  document.querySelector('.art').style.backgroundImage = `url("${ships[id].image}")`;
  shipSelector.value = id;
  try { localStorage.setItem('drift-ship', id); } catch { /* Storage may be unavailable. */ }
}
let savedShip = 'night-watch';
try { savedShip = localStorage.getItem('drift-ship') || savedShip; } catch {}
selectShip(savedShip);
shipSelector.addEventListener('change', () => selectShip(shipSelector.value));
