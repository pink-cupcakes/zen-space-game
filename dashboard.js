(async () => {
  await import('./instrument-screens.js');
  await import('./cabin-surface.js');
  const cabin=document.querySelector('.scene'),art=cabin.querySelector('.art');
  const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
  const destinations=[
    {id:'lantern',code:'01',name:'Lantern Station',x:370,y:133},
    {id:'moss',code:'02',name:'Moss moon',x:180,y:140},
    {id:'cinder',code:'03',name:'Cinder Belt',x:350,y:330}
  ];
  const state={destination:destinations[0],position:{x:140,y:305},paceName:'Slow drift',engine:{load:'32.4',temp:'64.2',energy:'87.6',draw:'2.4',rpm:'1,240'},log:[]};
  const startTime=performance.now();let lastTick=startTime,lastLog=startTime,lastPaint=0,returnFocus,currentModule='navigation',closing=false,animation;
  const screens=window.createDriftScreens();
  const world=document.createElement('div');world.className='console-world';
  const surface=await window.createCabinSurface(screens.canvases,{
    navigation:[[879,571],[1013,575],[987,630],[845,623]],
    engineering:[[694,588],[781,591],[766,620],[675,616]],
    activity:[[1047,588],[1094,591],[1081,628],[1035,624]]
  });
  world.append(surface.canvas);
  art.classList.add('surface-ready');
  const switches=document.createElement('div');switches.className='course-switches';switches.setAttribute('aria-label','Destination switches');
  switches.innerHTML=destinations.map((d,i)=>`<button type="button" data-destination="${d.id}" aria-pressed="${i===0}" aria-label="Set course for ${d.name}" title="${d.code} · ${d.name}"></button>`).join('');world.append(switches);
  const hotspots=document.createElement('div');hotspots.className='instrument-hotspots';
  hotspots.innerHTML='<button type="button" class="instrument-hotspot nav-hotspot" data-console="navigation" aria-label="Open navigation dashboard"><span>⌖ NAVIGATION ↗</span></button><button type="button" class="instrument-hotspot engine-hotspot" data-console="engineering" aria-label="Open ship systems dashboard"><span>⚙ SHIP SYSTEMS ↗</span></button>';
  art.append(hotspots);
  const shortcut=document.createElement('button');shortcut.id='instruments';shortcut.dataset.console='navigation';
  shortcut.innerHTML='<span>⌖</span><div><small>INSTRUMENTS</small><b>Navigation & ship</b></div>';cabin.querySelector('.actions').prepend(shortcut);
  const dialog=document.createElement('dialog');dialog.className='console-view';dialog.setAttribute('aria-label','Close-up of the ship console');
  dialog.innerHTML='<header class="console-view-controls"><div><span>DRIFT / AT THE CONSOLE</span><h1 id="view-title">Navigation</h1></div><button type="button" class="console-close" aria-label="Return to cabin">↙ BACK TO CABIN <kbd>ESC</kbd></button></header><div class="console-guide"><span class="course-legend">01 Lantern Station &nbsp; · &nbsp; 02 Moss moon &nbsp; · &nbsp; 03 Cinder Belt</span><small id="console-instruction">Use the amber buttons, or press 1, 2, or 3</small></div><p class="instrument-accessible" id="instrument-summary"></p><p class="instrument-accessible" role="status" id="course-status"></p>';
  document.body.append(dialog);
  const q=s=>dialog.querySelector(s);
  function project(el,w,h,points){
    const [p0,p1,p2,p3]=points.map(([x,y])=>window.DriftCabin.point(x,y)),dx1=p1[0]-p2[0],dx2=p3[0]-p2[0],dx3=p0[0]-p1[0]+p2[0]-p3[0],dy1=p1[1]-p2[1],dy2=p3[1]-p2[1],dy3=p0[1]-p1[1]+p2[1]-p3[1];
    const det=dx1*dy2-dx2*dy1,g=(dx3*dy2-dx2*dy3)/det,hp=(dx1*dy3-dx3*dy1)/det;
    const a=p1[0]-p0[0]+g*p1[0],b=p3[0]-p0[0]+hp*p3[0],d=p1[1]-p0[1]+g*p1[1],e=p3[1]-p0[1]+hp*p3[1];
    Object.assign(el.style,{width:w+'px',height:h+'px',transform:`matrix3d(${a/w},${d/w},0,${g/w},${b/h},${e/h},0,${hp/h},0,0,1,0,${p0[0]},${p0[1]},0,1)`});
  }
  // Transparent hit targets follow physical buttons; all visible instruments live in the cabin material.
  project(switches,300,60,[[832,638],[898,643],[892,654],[826,649]]);
  function geometry(){const w=art.clientWidth,h=art.clientHeight;return {w,h,scale:w/window.DriftCabin.width,left:0,top:0};}
  function overviewCamera(){const g=geometry();world.style.transform=`scale(${g.scale})`;}
  function placeHotspots(){const g=geometry();for(const [selector,x,y,w,h] of [['.nav-hotspot',930,598,185,86],['.engine-hotspot',725,603,130,65]]){const [px,py]=window.DriftCabin.point(x,y);Object.assign(hotspots.querySelector(selector).style,{left:`${px*g.scale}px`,top:`${py*g.scale}px`,width:`${w*.75*g.scale}px`,height:`${h*.75*g.scale}px`});}}
  function returnWorld(){world.inert=true;art.prepend(world);surface.resolution(false);surface.render();overviewCamera();}
  function cabinCamera(){
    const g=geometry(),r=art.getBoundingClientRect();
    return `translate(${r.left}px,${r.top}px) scale(${g.scale})`;
  }
  function focusCamera(){const nav=currentModule==='navigation',[x,y]=window.DriftCabin.point(nav?963:735,nav?604:605),scale=Math.min(innerWidth/(nav?248:150),(innerHeight-140)/(nav?135:101));return `translate(${innerWidth/2-x*scale}px,${innerHeight*.52-y*scale}px) scale(${scale})`;}
  function openConsole(trigger){
    if(dialog.open)return;returnFocus=trigger;currentModule=trigger.dataset.console;
    dialog.dataset.module=currentModule;switches.inert=currentModule!=='navigation';
    q('#view-title').textContent=currentModule==='navigation'?'Navigation':'Ship systems';
    q('#console-instruction').textContent=currentModule==='navigation'?'Use the amber buttons, or press 1, 2, or 3':'Engine · energy · hull / all systems calm';
    const from=cabinCamera(),to=focusCamera();surface.resolution(true);surface.render();
    dialog.prepend(world);world.inert=false;world.style.transform=to;dialog.showModal();
    animation=world.animate([{transform:from},{transform:to}],{duration:reducedMotion.matches?0:850,easing:'cubic-bezier(.22,.68,.2,1)'});
    q('.console-close').focus({preventScroll:true});
  }
  async function closeConsole(){
    if(closing)return;closing=true;const from=getComputedStyle(world).transform;animation?.cancel();const to=cabinCamera();world.style.transform=to;
    animation=world.animate([{transform:from},{transform:to}],{duration:reducedMotion.matches?0:550,easing:'cubic-bezier(.3,0,.3,1)'});
    await animation.finished;returnWorld();dialog.close();closing=false;returnFocus?.focus({preventScroll:true});
  }
  returnWorld();new ResizeObserver(()=>{placeHotspots();if(!dialog.open)overviewCamera();else if(!closing){animation?.cancel();world.style.transform=focusCamera();}}).observe(art);placeHotspots();
  cabin.querySelectorAll('[data-console]').forEach(b=>b.addEventListener('click',()=>openConsole(b)));
  q('.console-close').addEventListener('click',closeConsole);dialog.addEventListener('cancel',e=>{e.preventDefault();closeConsole();});
  function addLog(label,detail){const elapsed=Math.floor((performance.now()-startTime)/1000);state.log.unshift({stamp:`${String(Math.floor(elapsed/60)).padStart(2,'0')}:${String(elapsed%60).padStart(2,'0')}`,label,detail});state.log.length=Math.min(state.log.length,4);}
  function setCourse(next){if(next.id!==state.destination.id){state.destination=next;addLog('COURSE SET',next.name);q('#course-status').textContent=`Course set for ${next.name}.`;}switches.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.destination===next.id)));}
  switches.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>setCourse(destinations.find(d=>d.id===b.dataset.destination))));
  dialog.addEventListener('keydown',e=>{if(currentModule==='navigation'&&/^[123]$/.test(e.key)&&!e.ctrlKey&&!e.altKey&&!e.metaKey){e.preventDefault();setCourse(destinations[+e.key-1]);}});
  addLog('HULL SURVEY','Seals sound');addLog('DRIVE SYNC','Steady hum');addLog('COURSE SET',state.destination.name);
  function frame(now){
    requestAnimationFrame(frame);if(document.hidden)return;
    const dt=Math.min((now-lastTick)/1000,.1);lastTick=now;
    const p=state.position,d=state.destination,dx=d.x-p.x,dy=d.y-p.y,r=Math.hypot(dx,dy),step=Math.min(r,dt*pace*.08);if(r){p.x+=dx/r*step;p.y+=dy/r*step;}
    if(now-lastPaint<125)return;lastPaint=now;
    const t=now/1000;state.paceName=speeds[speedIndex][0];
    state.engine={load:((pace===0?12:pace===.8?48:32)+Math.sin(t*.23)*1.5).toFixed(1),temp:(64+Math.sin(t*.11)*.7).toFixed(1),energy:(87.6+Math.sin(t*.04)*.2).toFixed(1),draw:(1.4+pace*2.8+Math.sin(t*.3)*.1).toFixed(1),rpm:Math.round(700+pace*1540+Math.sin(t*.4)*12).toLocaleString()};
    if(now-lastLog>=22000){lastLog=now;const updates=[['NAV FIX','Position confirmed'],['CORE CHECK','Temperature steady'],['HULL SURVEY','Seals sound'],['POWER BUS','Reserves healthy']],entry=updates[Math.floor((now-startTime)/22000)%4];addLog(...entry);}
    screens.render(state,reducedMotion.matches?0:now);surface.render();
    q('#instrument-summary').textContent=`Hearth system. Position ${(p.x/100).toFixed(2)}, ${(p.y/100).toFixed(2)}. Course: ${d.name}, ${(r/100).toFixed(2)} AU remaining. ${state.paceName}. Engine ${state.engine.load} percent. Energy ${state.engine.energy} percent. Hull corrosion 1.8 percent.`;
  }
  screens.render(state,startTime);surface.render();requestAnimationFrame(frame);
  // Consumers may read the same textures; lamp controls have no instrument-power API.
  window.DriftInstruments={canvases:screens.canvases,getSnapshot:()=>JSON.parse(JSON.stringify(state))};
})();
