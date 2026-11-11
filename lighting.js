// Independent lamp states. Instrument displays are owned by dashboard.js.
(() => {
  const scene = document.querySelector('.scene');
  const layer = document.querySelector('.light-layer');
  const fixtures = [
    {selector:'.ceiling-light',box:[138,240,145,100],mask:'left'},
    {selector:'.desk-light',box:[1408,630,110,165],mask:'right'},
    {name:'Overhead strip light',className:'overhead-strip',box:[790,72,118,38]},
    {name:'Shelf strip light',className:'shelf-strip',box:[1615,166,110,36]}
  ];
  for(const fixture of fixtures){
    let button = fixture.selector ? layer.querySelector(fixture.selector) : layer.querySelector('.'+fixture.className);
    if(!button){
      button=document.createElement('button');button.type='button';
      button.className=`cabin-light strip-light ${fixture.className}`;
      button.setAttribute('aria-label',fixture.name);button.setAttribute('aria-pressed','true');layer.append(button);
    }
    fixture.button=button;
    if(fixture.mask){
      button.classList.add('painted-lamp');
      const spill=document.createElement('div');spill.className=`lamp-spill ${fixture.mask}-lamp-spill`;
      spill.setAttribute('aria-hidden','true');layer.prepend(spill);fixture.spill=spill;
    }
    function sync(){
      const on=button.getAttribute('aria-pressed')==='true';
      fixture.spill?.classList.toggle('is-on',on);
      button.title=`Turn ${on?'off':'on'} ${button.getAttribute('aria-label').toLowerCase()}`;
    }
    button.addEventListener('click',()=>{button.setAttribute('aria-pressed',String(button.getAttribute('aria-pressed')!=='true'));sync()});sync();
  }
  function position(){
    const g=window.DriftCabin,scale=layer.clientWidth/g.width;
    for(const fixture of fixtures){
      const [x,y,bw,bh]=fixture.box,[px,py]=g.point(x,y);
      Object.assign(fixture.button.style,{left:`${px*scale}px`,top:`${py*scale}px`,width:`${bw*.75*scale}px`,height:`${bh*.75*scale}px`});
      if(fixture.spill)Object.assign(fixture.spill.style,{left:'0px',top:'0px',width:'1672px',height:'941px',transform:g.overlayTransform(scale)});
    }
  }
  new ResizeObserver(position).observe(layer);position();
})();
