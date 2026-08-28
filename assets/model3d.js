/* Волга-Днепр · интерактивная 3D-модель Ан-124 (assets/an124.glb) */
(function(){
  var stage = document.getElementById("modelstage");
  if (!stage || typeof THREE === "undefined" || typeof THREE.GLTFLoader === "undefined") return;
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var W = stage.clientWidth, H = stage.clientHeight || 420;
  var renderer;
  try { renderer = new THREE.WebGLRenderer({antialias:true, alpha:true}); }
  catch(e){ stage.innerHTML = '<div style="padding:40px;color:#9DB0C1;">3D недоступно в этом браузере</div>'; return; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(W, H);
  renderer.outputEncoding = THREE.sRGBEncoding;
  stage.appendChild(renderer.domElement);

  var scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x1E2A36, 160, 420);
  var camera = new THREE.PerspectiveCamera(40, W/H, 0.5, 600);

  scene.add(new THREE.HemisphereLight(0xC9DAE8, 0x141D26, 1.0));
  var sun = new THREE.DirectionalLight(0xFFE0B0, 1.1);
  sun.position.set(60, 80, 40); scene.add(sun);
  var rim = new THREE.DirectionalLight(0x7A98B4, 0.6);
  rim.position.set(-70, 30, -60); scene.add(rim);

  /* тень-блоб на земле */
  var cv = document.createElement("canvas"); cv.width = cv.height = 256;
  var c2 = cv.getContext("2d");
  var grad = c2.createRadialGradient(128,128,20,128,128,128);
  grad.addColorStop(0,"rgba(0,0,0,.4)"); grad.addColorStop(1,"rgba(0,0,0,0)");
  c2.fillStyle = grad; c2.fillRect(0,0,256,256);
  var shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(170, 70),
    new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(cv), transparent:true, depthWrite:false})
  );
  shadow.rotation.x = -Math.PI/2;
  scene.add(shadow);

  var root = new THREE.Group();
  scene.add(root);

  var msg = document.createElement("div");
  msg.style.cssText = "position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#9DB0C1;font-size:14px;pointer-events:none;";
  msg.textContent = "Загружаю модель…";
  stage.appendChild(msg);

  new THREE.GLTFLoader().load("assets/an124.glb", function(gltf){
    var model = gltf.scene;
    model.traverse(function(o){
      if (o.isMesh && o.material){
        var mats = Array.isArray(o.material) ? o.material : [o.material];
        mats.forEach(function(m){
          m.side = THREE.DoubleSide;
          if (m.metalness !== undefined) m.metalness = Math.min(m.metalness, .35);
          if (m.roughness !== undefined) m.roughness = Math.max(m.roughness, .45);
        });
      }
    });
    /* нормализация: в центр, длина фюзеляжа 69 м вдоль X */
    var box = new THREE.Box3().setFromObject(model);
    var size = box.getSize(new THREE.Vector3());
    var center = box.getCenter(new THREE.Vector3());
    model.position.sub(center);
    var wrapper = new THREE.Group();
    wrapper.add(model);
    if (size.z >= size.x && size.z >= size.y) wrapper.rotation.y = Math.PI/2;
    else if (size.y >= size.x && size.y >= size.z) wrapper.rotation.z = -Math.PI/2;
    var maxDim = Math.max(size.x, size.y, size.z);
    var s = 69 / maxDim;
    wrapper.scale.setScalar(s);
    /* поставить на землю */
    var box2 = new THREE.Box3().setFromObject(wrapper);
    wrapper.position.y = -box2.min.y;
    shadow.position.y = 0.05;
    root.add(wrapper);
    msg.remove();
  }, undefined, function(err){
    msg.textContent = "Не удалось загрузить модель (assets/an124.glb)";
  });

  var yaw = 0.85, pitch = 0.22, dist = 105, autorot = true;
  function applyCam(){
    pitch = Math.max(0.05, Math.min(1.1, pitch));
    dist = Math.max(45, Math.min(180, dist));
    camera.position.set(
      dist * Math.cos(pitch) * Math.sin(yaw),
      12 + dist * Math.sin(pitch),
      dist * Math.cos(pitch) * Math.cos(yaw)
    );
    camera.lookAt(0, 8, 0);
  }

  var dragging = false, px = 0, py = 0;
  stage.addEventListener("pointerdown", function(e){
    dragging = true; autorot = false; px = e.clientX; py = e.clientY;
    stage.setPointerCapture(e.pointerId);
  });
  stage.addEventListener("pointermove", function(e){
    if (!dragging) return;
    yaw += (e.clientX - px) * 0.006;
    pitch += (e.clientY - py) * 0.004;
    px = e.clientX; py = e.clientY;
  });
  stage.addEventListener("pointerup", function(){ dragging = false; });
  stage.addEventListener("pointercancel", function(){ dragging = false; });
  stage.addEventListener("wheel", function(e){
    e.preventDefault(); autorot = false;
    dist += e.deltaY * 0.08;
  }, {passive:false});

  window.addEventListener("resize", function(){
    var w2 = stage.clientWidth, h2 = stage.clientHeight || 420;
    camera.aspect = w2/h2; camera.updateProjectionMatrix();
    renderer.setSize(w2, h2);
  });

  (function loop(){
    if (autorot && !reduced) yaw += 0.0018;
    applyCam();
    renderer.render(scene, camera);
    requestAnimationFrame(loop);
  })();
})();
