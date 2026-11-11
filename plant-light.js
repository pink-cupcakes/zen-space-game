// Match the plant's exposure to its nearby lamp without touching instrument lighting.
(() => {
  const layer=document.querySelector('.light-layer');
  const lamp=layer.querySelector('.desk-light');
  const shade=document.createElement('div');
  shade.className='desk-plant-shade';shade.setAttribute('aria-hidden','true');layer.append(shade);
  function sync(){shade.classList.toggle('is-illuminated',lamp.getAttribute('aria-pressed')==='true');}
  function position(){shade.style.transform=window.DriftCabin.overlayTransform(layer.clientWidth/window.DriftCabin.width);}
  new MutationObserver(sync).observe(lamp,{attributes:true,attributeFilter:['aria-pressed']});
  new ResizeObserver(position).observe(layer);
  sync();position();
})();
