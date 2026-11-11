(() => {

// Accessible switches share the panorama's coordinates with the light sources.
const layer=document.querySelector('.light-layer');
const fixtures=[
  {selector:'.ceiling-light',box:[138,240,145,100]},
  {selector:'.desk-light',box:[1408,630,110,165]},
  {name:'Overhead strip light',className:'overhead-strip',box:[790,72,118,38]},
  {name:'Shelf strip light',className:'shelf-strip',box:[1615,166,110,36]}
];
for(const fixture of fixtures){
  let button=fixture.selector?layer.querySelector(fixture.selector):null;
  if(!button){
    button=document.createElement('button');button.type='button';
    button.className=`cabin-light strip-light ${fixture.className}`;
    button.setAttribute('aria-label',fixture.name);button.setAttribute('aria-pressed','true');layer.append(button);
  }
  fixture.button=button;
  function sync(){button.title=`Turn ${button.getAttribute('aria-pressed')==='true'?'off':'on'} ${button.getAttribute('aria-label').toLowerCase()}`;}
  button.addEventListener('click',()=>{button.setAttribute('aria-pressed',String(button.getAttribute('aria-pressed')!=='true'));sync();});sync();
}
function position(){
  const g=window.DriftCabin,scale=layer.clientWidth/g.width;
  for(const {button,box:[x,y,w,h]} of fixtures){
    const [px,py]=g.point(x,y),a=g.point(x-w/2,y-h/2),b=g.point(x+w/2,y+h/2);
    Object.assign(button.style,{left:`${px*scale}px`,top:`${py*scale}px`,width:`${(b[0]-a[0])*scale}px`,height:`${(b[1]-a[1])*scale}px`});
  }
}
new ResizeObserver(position).observe(layer);position();
window.DriftLightFixtures=fixtures;
})();
