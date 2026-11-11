/* Fixed-resolution phosphor displays. Cabin lighting never owns their content or power. */
window.createDriftScreens = function () {
  const sizes={navigation:[384,176],engineering:[320,144],activity:[144,176]};
  const canvases=Object.fromEntries(Object.entries(sizes).map(([name,[w,h]])=>{
    const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;canvas.dataset.instrument=name;
    canvas.className='instrument-bitmap';canvas.setAttribute('aria-label',`${name} display`);canvas.setAttribute('role','img');return [name,canvas];
  }));
  const green='#8fcb98',dim='#416a51',bright='#c2dfad';
  function begin(canvas){const c=canvas.getContext('2d');c.clearRect(0,0,canvas.width,canvas.height);c.save();c.lineWidth=1;c.font='10px monospace';c.textBaseline='top';return c;}
  function text(c,value,x,y,color=green,font='10px monospace'){c.fillStyle=color;c.font=font;c.fillText(value,x,y);}
  function finish(c,w,h){c.globalCompositeOperation='destination-out';c.fillStyle='rgba(0,0,0,.15)';for(let y=1;y<h;y+=3)c.fillRect(0,y,w,1);c.restore();}
  function render(state,time){
    const {position,destination,paceName,engine,log}=state;
    let c=begin(canvases.navigation);
    text(c,'HEARTH SYSTEM',12,9,bright,'bold 11px monospace');text(c,'NAV / 07',314,10,dim,'9px monospace');
    c.strokeStyle=dim;c.beginPath();c.moveTo(10,26);c.lineTo(374,26);c.stroke();
    const cx=102,cy=98,r=61;
    c.strokeStyle='#294b37';for(const radius of [21,41,61]){c.beginPath();c.arc(cx,cy,radius,0,Math.PI*2);c.stroke();}
    c.beginPath();c.moveTo(cx-r,cy);c.lineTo(cx+r,cy);c.moveTo(cx,cy-r);c.lineTo(cx,cy+r);c.stroke();
    const angle=time/6000, a=angle-Math.PI/8;
    c.fillStyle='rgba(111,190,126,.08)';c.beginPath();c.moveTo(cx,cy);c.arc(cx,cy,r,a,angle);c.closePath();c.fill();
    c.strokeStyle='#638d65';c.beginPath();c.moveTo(cx,cy);c.lineTo(cx+Math.cos(angle)*r,cy+Math.sin(angle)*r);c.stroke();
    const map=p=>[cx+(p.x-250)*.34,cy+(p.y-210)*.34];
    c.fillStyle=bright;c.fillRect(cx-2,cy-2,4,4);
    for(const point of [{x:370,y:133},{x:180,y:140},{x:350,y:330}]){const [x,y]=map(point);c.fillStyle=green;c.fillRect(Math.round(x)-1,Math.round(y)-1,3,3);}
    const [sx,sy]=map(position),[tx,ty]=map(destination);
    c.setLineDash([2,3]);c.strokeStyle=green;c.beginPath();c.moveTo(sx,sy);c.lineTo(tx,ty);c.stroke();c.setLineDash([]);
    c.beginPath();c.arc(tx,ty,5,0,Math.PI*2);c.stroke();
    c.fillStyle=bright;c.beginPath();c.moveTo(sx,sy-4);c.lineTo(sx+3,sy+3);c.lineTo(sx-3,sy+3);c.closePath();c.fill();
    c.globalAlpha=1-(time%2800)/2800;c.beginPath();c.arc(sx,sy,5+(time%2800)/280,0,Math.PI*2);c.stroke();c.globalAlpha=1;
    text(c,'YOU',sx+7,sy-2,bright,'8px monospace');
    text(c,'PRESENT POSITION',204,37,dim,'9px monospace');text(c,`${(position.x/100).toFixed(2)} / ${(position.y/100).toFixed(2)}`,204,51);
    text(c,'ON COURSE FOR',204,76,dim,'9px monospace');text(c,destination.name.toUpperCase(),204,91,bright,'bold 11px monospace');
    const remaining=Math.hypot(destination.x-position.x,destination.y-position.y)/100;
    text(c,`${remaining.toFixed(2)} AU`,204,112,green,'bold 14px monospace');text(c,paceName.toUpperCase(),204,137,dim,'9px monospace');
    text(c,'SIGNAL STEADY',12,162,dim,'8px monospace');text(c,'COURSE '+destination.code,306,162,dim,'8px monospace');finish(c,384,176);
    c=begin(canvases.engineering);text(c,'SHIPKEEPING / ALL CALM',10,8,bright,'bold 10px monospace');
    const values=[['ENGINE',engine.load+'%'],['ENERGY',engine.energy+'%'],['CORROSION','1.8%'],['CORE',engine.temp+' C'],['DRAW',engine.draw+' kW'],['SEALS','100%']];
    values.forEach(([label,value],i)=>{const x=10+i%3*105,y=33+Math.floor(i/3)*43;text(c,label,x,y,dim,'8px monospace');text(c,value,x,y+13,green,'bold 13px monospace');});
    c.strokeStyle=green;c.beginPath();for(let i=0;i<110;i++){const y=125+Math.sin(i*.32+time/700)*3;i?c.lineTo(185+i,y):c.moveTo(185+i,y);}c.stroke();text(c,engine.rpm+' RPM',10,123,dim,'9px monospace');finish(c,320,144);
    c=begin(canvases.activity);text(c,'SHIP LOG',9,9,bright,'bold 11px monospace');
    (log||[]).slice(0,4).forEach((entry,i)=>{const y=33+i*32;text(c,entry.stamp+' '+entry.label.slice(0,12),9,y,dim,'7px monospace');text(c,entry.detail.slice(0,20),9,y+11,i===0?bright:green,'9px monospace');});
    text(c,'WATCH 07 / ALL QUIET',9,164,dim,'7px monospace');finish(c,144,176);
  }
  return {canvases,render};
};
