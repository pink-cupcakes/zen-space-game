import * as THREE from './assets/vendor/three.module.js';

// One orthographic, textured relief surface. Only light intensity changes at runtime;
// neither the texture, UVs, camera nor vertices change when a switch is pressed.
const WIDTH=2149, HEIGHT=732, METERS_PER_PIXEL=.005;
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t);};
function polygonDistance(x,y,points){
  let inside=false,d=Infinity;
  for(let i=0,j=points.length-1;i<points.length;j=i++){
    const [ax,ay]=points[j],[bx,by]=points[i],dx=bx-ax,dy=by-ay;
    const t=clamp(((x-ax)*dx+(y-ay)*dy)/(dx*dx+dy*dy));
    d=Math.min(d,Math.hypot(x-ax-t*dx,y-ay-t*dy));
    if((ay>y)!==(by>y)&&x<(bx-ax)*(y-ay)/(by-ay)+ax)inside=!inside;
  }
  return inside?d:-d;
}
const mainWindow=[[698,110],[1428,63],[1490,103],[1561,173],[1677,400],[1657,419],[655,424],[608,396],[599,365]];
const leftWindow=[[586,135],[651,127],[568,355],[542,391],[476,400],[488,359],[549,215]];
const chair=[[300,346],[367,327],[435,351],[452,436],[558,463],[654,628],[860,590],[933,731],[289,732],[270,440]];
const books=[[1481,401],[1543,404],[1547,420],[1589,425],[1583,559],[1468,536]];
const desk=[[580,493],[1190,515],[1588,531],[1680,589],[1598,630],[1130,565],[600,546]];
function region(x,y,points,feather=12){return smooth(-feather,feather,polygonDistance(x,y,points));}
export function surfaceDepth(x,y){
  const windowWeight=Math.max(region(x,y,mainWindow,5),region(x,y,leftWindow,4));
  let z=-3.5*windowWeight;
  z=z*(1-region(x,y,desk))+.30*region(x,y,desk);
  z=z*(1-region(x,y,books,5))+.48*region(x,y,books,5);
  const plant=Math.exp(-(((x-1354)/65)**2+((y-486)/52)**2));
  z+=.44*plant;
  const seat=region(x,y,chair,16);
  z=z*(1-seat)+(.62+.10*Math.cos((x-450)/180))*seat;
  // Shelf lip and overhead frame project ahead of the wall and cast shadows.
  z+=.14*Math.exp(-(((y-(160-.14*(x-460)))/12)**2))*smooth(290,390,x)*(1-smooth(580,630,x));
  return z;
}
export function makeCabinSurface(){
  const mesh=new THREE.PlaneGeometry(WIDTH*METERS_PER_PIXEL,HEIGHT*METERS_PER_PIXEL,430,147);
  const positions=mesh.attributes.position,uv=mesh.attributes.uv;
  for(let i=0;i<positions.count;i++)positions.setZ(i,surfaceDepth(uv.getX(i)*WIDTH,(1-uv.getY(i))*HEIGHT));
  positions.needsUpdate=true;mesh.computeVertexNormals();return mesh;
}
const sourceGLSL=`
  uniform vec4 cabinPower;
  float ellipseSource(vec2 p,vec2 c,vec2 r){return 1.-smoothstep(.78,1.,length((p-c)/r));}
  float stripSource(vec2 p,vec2 a,vec2 b,float r){vec2 d=b-a;float t=clamp(dot(p-a,d)/dot(d,d),0.,1.);return 1.-smoothstep(r*.5,r,length(p-a-t*d));}
`;
export async function createCabinLighting(screens,surfaces){
  const fixtures=window.DriftLightFixtures;
  if(!fixtures?.length)throw new Error("Cabin light controls must initialize first");
  const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'low-power'});
  renderer.setSize(WIDTH,HEIGHT,false);renderer.setPixelRatio(1);
  renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.NoToneMapping;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;
  renderer.domElement.className='cabin-surface';renderer.domElement.setAttribute('aria-hidden','true');
  const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-WIDTH*.0025,WIDTH*.0025,HEIGHT*.0025,-HEIGHT*.0025,.1,50);
  camera.position.z=12;
  const texture=await new THREE.TextureLoader().loadAsync('assets/cockpit-wide-strips-off.png');
  texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());
  const power={value:new THREE.Vector4()};
  const screenTextures=Object.fromEntries(Object.entries(screens).map(([name,canvas])=>{
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
    texture.generateMipmaps=false;texture.minFilter=THREE.LinearFilter;
    return [name,texture];
  }));
  const material=new THREE.MeshStandardMaterial({map:texture,roughness:1,metalness:0});
  material.onBeforeCompile=shader=>{
    shader.uniforms.cabinPower=power;
    for(const [name,texture] of Object.entries(screenTextures)){
      shader.uniforms[name]={value:texture};
      shader.uniforms[name+'UV']={value:surfaceUV(surfaces[name])};
    }
    shader.fragmentShader=sourceGLSL+instrumentGLSL+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>',`
      #include <emissivemap_fragment>
      vec2 px=vec2(vMapUv.x*2149.,(1.-vMapUv.y)*732.);
      // Emission belongs to the material at the actual bulbs, not an image layer.
      float hanging=ellipseSource(px,vec2(472.,190.),vec2(27.,13.));
      float lantern=ellipseSource(px,vec2(1438.,478.),vec2(19.,36.));
      // Retain the cage ribs and the painted details within the emitting glass.
      float detail=clamp(dot(diffuseColor.rgb,vec3(.2126,.7152,.0722))*18.,.12,1.);
      float overhead=stripSource(px,vec2(947.,52.),vec2(980.,49.),2.4);
      float shelf=stripSource(px,vec2(1575.,131.),vec2(1616.,115.),2.8);
      float lampEmission=dot(vec2(hanging*2.2,lantern*.5),cabinPower.xy);
      float stripEmission=dot(vec2(overhead*.45,shelf*.45),cabinPower.zw);
      totalEmissiveRadiance+=(vec3(1.,.30,.025)*lampEmission+vec3(1.,.40,.065)*stripEmission)*1.4*(.35+.65*detail);
      totalEmissiveRadiance+=phosphor(navigation,navigationUV,px,diffuseColor.rgb)
        +phosphor(engineering,engineeringUV,px,diffuseColor.rgb)
        +phosphor(activity,activityUV,px,diffuseColor.rgb);
    `.replace('cabinPower.value','cabinPower'));
  };
  const surface=new THREE.Mesh(makeCabinSurface(),material);surface.castShadow=true;surface.receiveShadow=true;scene.add(surface);
  scene.add(new THREE.AmbientLight(0xffffff,Math.PI));
  const strengths=[15.3,3.75,.675,.675];
  const lights=fixtures.map((fixture,i)=>{
    const [x,y]=window.DriftCabin.point(...fixture.box);
    const light=new THREE.PointLight(i<2?0xffa52b:0xffaf46,0,0,2);
    light.position.set((x-WIDTH/2)*METERS_PER_PIXEL,(HEIGHT/2-y)*METERS_PER_PIXEL,i===1?.95:.85);
    light.castShadow=i<2;light.shadow.mapSize.set(512,512);light.shadow.camera.near=.03;light.shadow.camera.far=14;
    light.shadow.bias=-.00015;light.shadow.normalBias=.015;scene.add(light);return light;
  });
  let frame=0,lastTime=0,disposed=false;
  const values=fixtures.map(f=>f.button.getAttribute('aria-pressed')==='true'?1:0);
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  function render(now){
    frame=0;if(disposed)return;
    const dt=Math.min((now-lastTime)/1000||.016,.1);lastTime=now;let changing=false;
    fixtures.forEach((fixture,i)=>{
      const target=fixture.button.getAttribute('aria-pressed')==='true'?1:0;
      values[i]=reduced.matches?target:values[i]+(target-values[i])*(1-Math.exp(-dt*9));
      if(Math.abs(values[i]-target)<.001)values[i]=target;else changing=true;
      lights[i].intensity=values[i]*strengths[i];
    });
    power.value.fromArray(values);renderer.render(scene,camera);
    if(changing)frame=requestAnimationFrame(render);
  }
  function requestRender(){if(!frame&&!disposed)frame=requestAnimationFrame(render);}
  const observer=new MutationObserver(requestRender);
  fixtures.forEach(f=>observer.observe(f.button,{attributes:true,attributeFilter:['aria-pressed']}));
  renderer.domElement.dataset.lightingEngine='three-pbr';
  render(performance.now());
  renderer.domElement.addEventListener('webglcontextlost',event=>{event.preventDefault();cancelAnimationFrame(frame);frame=0;});
  renderer.domElement.addEventListener('webglcontextrestored',requestRender);
  function resolution(closeup){
    const maximum=renderer.capabilities.maxTextureSize;
    const scale=Math.min(closeup?2:1.25,maximum/WIDTH);
    renderer.setSize(Math.round(WIDTH*scale),Math.round(HEIGHT*scale),false);requestRender();
  }
  function updateInstruments(){for(const texture of Object.values(screenTextures))texture.needsUpdate=true;requestRender();}
  resolution(false);
  return {canvas:renderer.domElement,render:updateInstruments,resolution,dispose(){disposed=true;cancelAnimationFrame(frame);observer.disconnect();surface.geometry.dispose();material.dispose();texture.dispose();Object.values(screenTextures).forEach(t=>t.dispose());renderer.dispose();renderer.domElement.remove();}};
}

// Panorama pixels -> UVs on each physical instrument glass (projective mapping).
export function surfaceUV(corners){
  const target=[[0,0],[1,0],[1,1],[0,1]],rows=[];
  corners.map(([x,y])=>window.DriftCabin.point(x,y)).forEach(([x,y],i)=>{
    const [u,v]=target[i];rows.push([x,y,1,0,0,0,-u*x,-u*y,u],[0,0,0,x,y,1,-v*x,-v*y,v]);
  });
  for(let col=0;col<8;col++){
    let pivot=col;for(let row=col+1;row<8;row++)if(Math.abs(rows[row][col])>Math.abs(rows[pivot][col]))pivot=row;
    [rows[col],rows[pivot]]=[rows[pivot],rows[col]];
    const divisor=rows[col][col];if(Math.abs(divisor)<1e-12)throw new Error('Invalid instrument surface');
    for(let j=col;j<9;j++)rows[col][j]/=divisor;
    for(let row=0;row<8;row++)if(row!==col){const factor=rows[row][col];for(let j=col;j<9;j++)rows[row][j]-=factor*rows[col][j];}
  }
  const [a,b,c,d,e,f,g,h]=rows.map(row=>row[8]);return new THREE.Matrix3().set(a,b,c,d,e,f,g,h,1);
}
const instrumentGLSL=`
  uniform sampler2D navigation,engineering,activity;
  uniform mat3 navigationUV,engineeringUV,activityUV;
  vec3 phosphor(sampler2D pixels,mat3 mapping,vec2 px,vec3 glass){
    vec3 point=mapping*vec3(px,1.);vec2 st=point.xy/point.z;
    if(any(lessThan(st,vec2(0.)))||any(greaterThan(st,vec2(1.))))return vec3(0.);
    vec2 centered=st*2.-1.;st+=centered*dot(centered,centered)*.008;
    if(any(lessThan(st,vec2(0.)))||any(greaterThan(st,vec2(1.))))return vec3(0.);
    vec4 ink=texture2D(pixels,vec2(st.x,1.-st.y));
    float transmission=mix(.68,.94,clamp(dot(glass,vec3(.21,.72,.07))*9.,0.,1.));
    return ink.rgb*ink.a*transmission*.82;
  }
`;
