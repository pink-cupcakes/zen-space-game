import * as THREE from './assets/vendor/three.module.js';

// Image-aligned cabin geometry with real light sources, cutout window openings,
// separate book faces and shadows. The exterior is an unlit scene background.
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
// Image-aligned surface meshes. There is no displaced sheet spanning the windows.
// Each polygon has its own plane and depth; orthographic projection preserves the artwork.
const cabinFaces=[
  {points:[[0,0],[2149,0],[2149,732],[0,732]],depth:()=>0,cutWindows:true},
  {points:[[300,346],[367,327],[435,351],[452,436],[558,463],[654,628],[860,590],[933,731],[289,732],[270,440]],depth:(x,y)=>.65+.12*(y/732)},
  {points:[[580,493],[1190,515],[1588,531],[1680,589],[1598,630],[1130,565],[600,546]],depth:(x,y)=>.30+(y-493)*.006},
  // Individual spines and the broad, dark book cover beside the lantern.
  {points:[[1485,397],[1503,397],[1491,526],[1473,521]],depth:(x,y)=>.54+(x-1473)*.004},
  {points:[[1507,405],[1526,406],[1510,532],[1492,527]],depth:(x,y)=>.58+(x-1492)*.003},
  {points:[[1530,411],[1570,411],[1540,540],[1510,533]],depth:(x,y)=>.56+(x-1510)*.002},
  {points:[[1538,435],[1551,435],[1532,535],[1520,533]],depth:(x,y)=>.65+(x-1520)*.003},
  {points:[[1552,431],[1568,429],[1546,539],[1532,536]],depth:(x,y)=>.67+(x-1532)*.003},
  {points:[[1570,429],[1617,429],[1598,550],[1548,541]],depth:(x,y)=>.70+(x-1548)*.0015}
];
function makeFace(points,depth){
  const contour=points.map(([x,y])=>new THREE.Vector2(x,y));
  const indices=THREE.ShapeUtils.triangulateShape(contour,[]).flat();
  const positions=[],uv=[];
  for(const [x,y] of points){positions.push((x-WIDTH/2)*METERS_PER_PIXEL,(HEIGHT/2-y)*METERS_PER_PIXEL,depth(x,y));uv.push(x/WIDTH,1-y/HEIGHT);}
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.setIndex(indices);geometry.computeVertexNormals();
  // Source polygons use screen coordinates, with downward Y.
  if(geometry.attributes.normal.getZ(0)<0){const reversed=[];for(let i=0;i<indices.length;i+=3)reversed.push(indices[i],indices[i+2],indices[i+1]);geometry.setIndex(reversed);geometry.computeVertexNormals();}
  return geometry;
}
function makeWindowOpenings(image){
  const canvas=document.createElement('canvas');canvas.width=WIDTH;canvas.height=HEIGHT;
  const context=canvas.getContext('2d',{willReadFrequently:true});context.drawImage(image,0,0);
  const pixels=context.getImageData(0,0,WIDTH,HEIGHT).data;
  const glassBounds=[
    [[552,137],[584,109],[603,98],[626,101],[653,96],[669,91],[672,105],[668,119],[655,141],[641,164],[626,190],[613,214],[600,240],[589,266],[578,294],[568,323],[558,350],[551,369],[537,382],[518,388],[489,389],[465,374],[461,352],[460,324],[462,297],[467,269],[474,242],[479,215],[481,200],[504,188],[516,182],[512,170],[547,165],[547,146]],
    [[742,95],[775,85],[1360,57],[1390,61],[1420,70],[1450,90],[1480,116],[1515,161],[1545,222],[1574,300],[1595,350],[1594,374],[1583,388],[1550,399],[1470,420],[1200,414],[1060,408],[900,413],[700,429],[650,430],[620,421],[590,400],[575,370],[578,350],[600,300],[640,218],[690,135],[715,110]],
    [[1575,153],[1630,152],[1660,176],[1680,230],[1690,310],[1681,338],[1650,353],[1630,360],[1610,302],[1590,240]]
  ];
  function inside(x,y,polygon){let result=false;for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){const [ax,ay]=polygon[i],[bx,by]=polygon[j];if((ay>y)!==(by>y)&&x<(bx-ax)*(y-ay)/(by-ay)+ax)result=!result;}return result;}
  const sky=new Uint8Array(WIDTH*HEIGHT);
  function enqueue(x,y){
    if(x<460||x>=1710||y<45||y>=435)return;
    const at=y*WIDTH+x;if(sky[at]||!glassBounds.some(p=>inside(x,y,p)))return;
    const i=at*4,r=pixels[i],g=pixels[i+1],b=pixels[i+2];
    // Follow the actual dark-blue exterior between leaves, flower stems and the frame.
    if(r>32||g>42||b>58||b<=r*1.10||b<=g*1.02)return;
    sky[at]=1;
  }
  // Treat disconnected gaps between flower stems and leaves as exterior too.
  for(let y=45;y<435;y++)for(let x=460;x<1710;x++)enqueue(x,y);
  const data=new Uint8Array(WIDTH*HEIGHT*4);
  for(let at=0;at<sky.length;at++){const value=sky[at]?0:255;data.set([value,value,value,255],at*4);}
  const mask=new THREE.DataTexture(data,WIDTH,HEIGHT,THREE.RGBAFormat);
  mask.flipY=true;mask.needsUpdate=true;mask.minFilter=THREE.LinearFilter;mask.magFilter=THREE.LinearFilter;
  return mask;
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
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  renderer.domElement.className='cabin-surface';renderer.domElement.setAttribute('aria-hidden','true');
  const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-WIDTH*.0025,WIDTH*.0025,HEIGHT*.0025,-HEIGHT*.0025,.1,50);
  camera.position.z=12;
  const texture=await new THREE.TextureLoader().loadAsync('assets/cockpit-wide-strips-off.png');
  texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());
  const openings=makeWindowOpenings(texture.image);
  scene.background=texture;
  const power={value:new THREE.Vector4()};
  const screenTextures=Object.fromEntries(Object.entries(screens).map(([name,canvas])=>{
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
    texture.generateMipmaps=false;texture.minFilter=THREE.LinearFilter;
    return [name,texture];
  }));
  const material=new THREE.MeshStandardMaterial({map:texture,roughness:.86,metalness:0,side:THREE.FrontSide});
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
  const surfacesInRoom=cabinFaces.map(face=>{
    const faceMaterial=material.clone();faceMaterial.onBeforeCompile=material.onBeforeCompile;
    faceMaterial.customProgramCacheKey=()=> 'physical-cabin-faces-v2';
    if(face.cutWindows){faceMaterial.alphaMap=openings;faceMaterial.alphaTest=.5;}
    const mesh=new THREE.Mesh(makeFace(face.points,face.depth),faceMaterial);
    mesh.castShadow=true;mesh.receiveShadow=true;scene.add(mesh);return mesh;
  });
  scene.add(new THREE.AmbientLight(0xffffff,Math.PI));
  const strengths=[15.3,3.75,.675,.675];
  const lights=fixtures.map((fixture,i)=>{
    const [x,y]=window.DriftCabin.point(...fixture.box);
    const light=new THREE.PointLight(i<2?0xffa52b:0xffaf46,0,0,2);
    light.position.set((x-WIDTH/2)*METERS_PER_PIXEL,(HEIGHT/2-y)*METERS_PER_PIXEL,i===1?.95:.85);
    light.castShadow=i<2;light.shadow.mapSize.set(1024,1024);light.shadow.camera.near=.03;light.shadow.camera.far=14;
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
  return {canvas:renderer.domElement,render:updateInstruments,resolution,dispose(){disposed=true;cancelAnimationFrame(frame);observer.disconnect();surfacesInRoom.forEach(mesh=>{mesh.geometry.dispose();mesh.material.dispose();});openings.dispose();material.dispose();texture.dispose();Object.values(screenTextures).forEach(t=>t.dispose());renderer.dispose();renderer.domElement.remove();}};
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
