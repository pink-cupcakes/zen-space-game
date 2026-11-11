const canvas=document.querySelector('#stars'),ctx=canvas.getContext('2d');let w,h,stars=[],pace=0.35,distance=0,last=0;
function resize(){w=canvas.width=innerWidth*devicePixelRatio;h=canvas.height=innerHeight*devicePixelRatio;stars=Array.from({length:65},()=>({x:Math.random()*w,y:Math.random()*h*.65,r:(.3+Math.random()*.8)*devicePixelRatio,a:.15+Math.random()*.5}))}addEventListener('resize',resize);resize();
function animate(t){let dt=Math.min((t-last)/1000||0,.05);last=t;ctx.clearRect(0,0,w,h);for(const s of stars){s.x-=pace*dt*devicePixelRatio*5;if(s.x<0)s.x=w;ctx.beginPath();ctx.fillStyle=`rgba(209,230,232,${s.a})`;ctx.arc((s.x+look.x*.08*devicePixelRatio+w)%w,s.y+look.y*.04*devicePixelRatio,s.r,0,Math.PI*2);ctx.fill()}distance+=dt*pace*.003;document.querySelector('#distance').innerHTML=distance.toFixed(2).padStart(6,'0')+' <small>LY</small>';requestAnimationFrame(animate)}requestAnimationFrame(animate);
const scene=document.querySelector('.scene');document.querySelector('#begin').onclick=()=>scene.classList.add('settled');document.querySelector('#hide').onclick=()=>scene.classList.add('minimal');document.querySelector('#restore').onclick=()=>scene.classList.remove('minimal');
const speeds=[['Slow drift',.35],['Gentle cruise',.8],['Stillness',0]];let speedIndex=0;document.querySelector('#speed').onclick=e=>{speedIndex=(speedIndex+1)%speeds.length;pace=speeds[speedIndex][1];e.currentTarget.querySelector('b').textContent=speeds[speedIndex][0]};
let humAudio,humGain,humPlaying=false,humBusy=false;
const humButton=document.querySelector('#sound');
humButton.setAttribute('aria-pressed','false');
function createShipHum(){
  humAudio=new (window.AudioContext||window.webkitAudioContext)();
  humGain=humAudio.createGain();humGain.gain.value=0;humGain.connect(humAudio.destination);
  // Audible harmonics carry the engine sound on laptop speakers; the sub stays gentle.
  for(const [frequency,level] of [[65,.25],[130,.45],[195,.13],[260,.10]]){
    const tone=humAudio.createOscillator(),levelNode=humAudio.createGain();
    tone.type='sine';tone.frequency.value=frequency;levelNode.gain.value=level;
    tone.connect(levelNode).connect(humGain);tone.start();
  }
  // Quiet, filtered ventilation adds texture without a sharp hiss.
  const buffer=humAudio.createBuffer(1,humAudio.sampleRate*4,humAudio.sampleRate),samples=buffer.getChannelData(0);
  for(let i=0;i<samples.length;i++)samples[i]=Math.random()*2-1;
  const air=humAudio.createBufferSource(),filter=humAudio.createBiquadFilter(),airLevel=humAudio.createGain();
  air.buffer=buffer;air.loop=true;filter.type='lowpass';filter.frequency.value=480;filter.Q.value=.5;airLevel.gain.value=.18;
  air.connect(filter).connect(airLevel).connect(humGain);air.start();
}
humButton.onclick=async()=>{
  if(humBusy)return;humBusy=true;
  try{
    if(!humAudio)createShipHum();
    await humAudio.resume();
    if(humAudio.state!=='running')throw new Error('Audio did not start');
    humPlaying=!humPlaying;
    const now=humAudio.currentTime;
    humGain.gain.cancelScheduledValues(now);
    humGain.gain.setValueAtTime(humGain.gain.value,now);
    humGain.gain.linearRampToValueAtTime(humPlaying?.12:0,now+.7);
    humButton.setAttribute('aria-pressed',String(humPlaying));
    humButton.querySelector('b').textContent=humPlaying?'On':'Off';
    humButton.title='Toggle ambient ship hum';
  }catch(error){humButton.querySelector('b').textContent='Try again';humButton.title='Click to retry audio';console.error('Ship hum:',error);}
  finally{humBusy=false;}
};

// Move the camera crop across the approved illustration; never expose empty edges.
const look = { x: 0, y: 0, pointer: null };
function updateLook() {
  const g=window.DriftCabin, width=scene.clientWidth, height=scene.clientHeight;
  const scale=g.scale(width,height), imageWidth=g.width*scale, imageHeight=g.height*scale;
  const maxX=Math.max(0,(imageWidth-width)/2), maxY=Math.max(0,(imageHeight-height)/2);
  look.x=Math.max(-maxX,Math.min(maxX,look.x));
  look.y=Math.max(-maxY,Math.min(maxY,look.y));
  for(const layer of scene.querySelectorAll('.art,.light-layer')) Object.assign(layer.style,{width:`${imageWidth}px`,height:`${imageHeight}px`,left:`${-maxX}px`,top:`${-maxY}px`});
  scene.style.setProperty('--look-x',`${look.x}px`);
  scene.style.setProperty('--look-y',`${look.y}px`);
}
updateLook();
scene.addEventListener('pointerdown', event => {
  if (event.button !== 0 || event.target.closest('button, select, input, label, a, audio, .music-player')) return;
  look.pointer = { id: event.pointerId, x: event.clientX, y: event.clientY };
  scene.setPointerCapture(event.pointerId); scene.classList.add('looking');
});
scene.addEventListener('pointermove', event => {
  if (!look.pointer || event.pointerId !== look.pointer.id) return;
  const dx = event.clientX - look.pointer.x, dy = event.clientY - look.pointer.y;
  look.x += dx*2; look.y += dy; look.pointer.x = event.clientX; look.pointer.y = event.clientY;
  if (dx || dy) scene.classList.add('has-looked'); updateLook();
});
function endLook(event) { if (!look.pointer || event.pointerId !== look.pointer.id) return; look.pointer = null; scene.classList.remove('looking'); }
scene.addEventListener('pointerup', endLook);
scene.addEventListener('pointercancel', endLook);
scene.addEventListener('lostpointercapture', endLook);
scene.addEventListener('keydown', event => {
  if (event.target !== scene) return;
  if(event.key==='Home'){event.preventDefault();look.x=0;look.y=0;updateLook();return;}
  const horizontalStep=scene.clientWidth*(event.shiftKey?.18:.06);
  const offsets = { ArrowLeft: [horizontalStep, 0], ArrowRight: [-horizontalStep, 0], ArrowUp: [0, 24], ArrowDown: [0, -24] };
  if (!offsets[event.key]) return;
  event.preventDefault(); look.x += offsets[event.key][0]; look.y += offsets[event.key][1]; scene.classList.add('has-looked'); updateLook();
});
addEventListener('resize', updateLook);

// Horizontal trackpad gestures and Shift+wheel share the same real image bounds.
scene.addEventListener('wheel',event=>{
  if(event.ctrlKey||event.target.closest('.music-player,input,select'))return;
  const unit=event.deltaMode===1?16:event.deltaMode===2?scene.clientWidth:1;
  const dx=event.shiftKey?event.deltaY:event.deltaX;
  const dy=event.shiftKey?0:event.deltaY;
  if(!dx&&!dy)return;
  event.preventDefault();look.x-=dx*unit*2;look.y-=dy*unit;
  scene.classList.add('has-looked');updateLook();
},{passive:false});
