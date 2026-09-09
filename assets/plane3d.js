/* Волга-Днепр · примерка груза в НАСТОЯЩЕЙ модели Ан-124.
   Корпус самолёта — «рентген» (полупрозрачный), внутри — янтарный каркас
   грузовой кабины и груз клиента в реальном масштабе. */
(function(){
  var stage = document.getElementById("stage3d");
  if (!stage || typeof THREE === "undefined") return;
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* длина фюзеляжа задаёт масштаб модели; cab — грузовая кабина, floorY — высота пола над землёй */
  var AIRCRAFT = [
    { name:"Ан-124", fusLen:69.0, cab:{L:36.5, W:6.4, H:4.4}, floorY:2.2, cabShift:0, P:150,
      note:"кабина 36,5 × 6,4 × 4,4 м · до 150 т", scaled:false },
    { name:"Ил-76", fusLen:46.6, cab:{L:20.0, W:3.45, H:3.4}, floorY:1.9, cabShift:0, P:50,
      note:"кабина 20,0 × 3,45 × 3,4 м · до 50 т", scaled:true }
  ];
  var curAC = 0;

  function val(id){
    var el = document.getElementById(id);
    var v = el ? parseFloat(el.value) : 0;
    return isNaN(v) ? 0 : v;
  }
  function fmt(x){ return String(x).replace(".", ","); }

  var W = stage.clientWidth, H = stage.clientHeight || 360;
  var renderer;
  try { renderer = new THREE.WebGLRenderer({antialias:true, alpha:true}); }
  catch(e){
    stage.innerHTML = '<div style="padding:40px;color:#9DB0C1;font-size:14px;">3D недоступно в этом браузере</div>';
    return;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(W, H);
  stage.appendChild(renderer.domElement);

  var scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x1E2A36, 140, 380);
  var camera = new THREE.PerspectiveCamera(42, W/H, 0.5, 600);

  scene.add(new THREE.HemisphereLight(0xC9DAE8, 0x141D26, 0.95));
  var sun = new THREE.DirectionalLight(0xFFE0B0, 0.9);
  sun.position.set(60, 80, 40); scene.add(sun);
  var rim = new THREE.DirectionalLight(0x7A98B4, 0.55);
  rim.position.set(-70, 30, -60); scene.add(rim);

  /* тень-блоб */
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
  shadow.position.y = 0.05;
  scene.add(shadow);

  var MAT = {
    xray: new THREE.MeshStandardMaterial({color:0xC9D8E4, metalness:.2, roughness:.55,
      transparent:true, opacity:.22, depthWrite:false, side:THREE.DoubleSide}),
    cabLine: new THREE.LineBasicMaterial({color:0x55A9F5}),
    cabFill: new THREE.MeshBasicMaterial({color:0x55A9F5, transparent:true, opacity:.05, depthWrite:false}),
    okBox: new THREE.MeshStandardMaterial({color:0x2AA57E, metalness:.15, roughness:.55}),
    noBox: new THREE.MeshStandardMaterial({color:0xD9573B, metalness:.15, roughness:.55}),
    okLine: new THREE.LineBasicMaterial({color:0x9FF0D6}),
    noLine: new THREE.LineBasicMaterial({color:0xFFC1AE}),
    strap: new THREE.MeshStandardMaterial({color:0xC9902E, metalness:.2, roughness:.6})
  };

  var baseModel = null;      /* нормализованная модель (длина 1.0 по X, на земле) */
  var planeGroup = null;     /* текущий экземпляр под выбранный борт */
  var cargoGroup = null, cabinGroup = null;

  var msg = document.createElement("div");
  msg.style.cssText = "position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#9DB0C1;font-size:14px;pointer-events:none;z-index:4;";
  msg.textContent = "Загружаю модель самолёта…";
  stage.appendChild(msg);

  function normalizeModel(gltfScene){
    /* чистка: только меши, единый рентген-материал, без линий-мусора */
    gltfScene.traverse(function(o){
      if (o.isLine || o.isPoints) o.visible = false;
      if (o.isMesh) o.material = MAT.xray;
    });
    var box = new THREE.Box3().setFromObject(gltfScene);
    var size = box.getSize(new THREE.Vector3());
    var center = box.getCenter(new THREE.Vector3());
    gltfScene.position.sub(center);
    var wrap = new THREE.Group();
    wrap.add(gltfScene);
    /* ШАГ 1. Вверх — ось с НАИМЕНЬШИМ габаритом (высота 22 м против 70/73 м). */
    var sx = size.x, sy = size.y, sz = size.z;
    if (sx <= sy && sx <= sz){ wrap.rotation.z = -Math.PI/2; }        /* X-up → Y-up */
    else if (sz <= sx && sz <= sy){ wrap.rotation.x = -Math.PI/2; }   /* Z-up → Y-up */
    /* ШАГ 2. Длина против размаха (70 и 73,7 — почти равны, по габаритам
       не отличить). Железный признак — КИЛЬ: самые высокие точки самолёта
       стоят на корме, то есть на оси длины. */
    wrap.updateMatrixWorld(true);
    var pts = [], v = new THREE.Vector3();
    gltfScene.traverse(function(o){
      if (!o.isMesh || !o.geometry || !o.geometry.attributes.position) return;
      var pos = o.geometry.attributes.position;
      var step = Math.max(1, Math.floor(pos.count / 3000));
      for (var i = 0; i < pos.count; i += step){
        v.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld);
        pts.push([v.x, v.y, v.z]);
      }
    });
    var maxY = -Infinity, i2;
    for (i2 = 0; i2 < pts.length; i2++) if (pts[i2][1] > maxY) maxY = pts[i2][1];
    var sumAX = 0, sumAZ = 0, nTop = 0;
    for (i2 = 0; i2 < pts.length; i2++){
      if (pts[i2][1] > maxY * 0.8){ sumAX += Math.abs(pts[i2][0]); sumAZ += Math.abs(pts[i2][2]); nTop++; }
    }
    /* киль далеко от центра по оси длины: где смещение больше — там длина */
    if (nTop > 5 && sumAZ > sumAX){ wrap.rotation.y = Math.PI/2; }    /* длина лежала на Z → в X */
    /* ШАГ 3. Масштаб: длина фюзеляжа = 1. */
    wrap.updateMatrixWorld(true);
    var b1 = new THREE.Box3().setFromObject(wrap);
    var s1 = b1.getSize(new THREE.Vector3());
    wrap.scale.setScalar(1 / s1.x);
    var outer = new THREE.Group();
    outer.add(wrap);
    var b2 = new THREE.Box3().setFromObject(outer);
    outer.userData.groundOffset = -b2.min.y;
    outer.userData.dims = { L: 1, W: s1.z / s1.x, H: s1.y / s1.x };
    return outer;
  }

  /* обмер корпуса: реальные брюхо/потолок/центр фюзеляжа в зоне кабины,
     чтобы кабина и груз сидели ВНУТРИ модели, а не по прикидкам */
  function measureHull(a){
    var halfW = a.cab.W/2 * 0.9;
    var belly = Infinity, maxY = -Infinity, sumX = 0, nX = 0;
    var bins = {};                       /* низ обшивки по метровым сечениям вдоль длины */
    var v = new THREE.Vector3();
    planeGroup.updateMatrixWorld(true);
    planeGroup.traverse(function(o){
      if (!o.isMesh || !o.geometry || !o.geometry.attributes.position) return;
      var pos = o.geometry.attributes.position;
      var step = Math.max(1, Math.floor(pos.count / 9000));
      for (var i = 0; i < pos.count; i += step){
        v.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld);
        if (Math.abs(v.x) > a.fusLen * 0.52) continue;
        if (Math.abs(v.z) > halfW) continue;
        if (Math.abs(v.z) < 1.2 && v.y > 0.4){
          if (v.y < belly) belly = v.y;
          var bi = Math.round(v.x);
          if (!(bi in bins) || v.y < bins[bi]) bins[bi] = v.y;
        }
        if (v.y > maxY) maxY = v.y;
        sumX += v.x; nX++;
      }
    });
    if (nX < 50) return null;
    var floorY = Math.max(a.floorY, isFinite(belly) ? belly + 0.7 : 0);
    var innerTop = maxY - 0.4;
    if (floorY + a.cab.H > innerTop) floorY = Math.max((isFinite(belly)?belly:0) + 0.3, innerTop - a.cab.H);
    return { floorY: floorY, xCenter: sumX / nX, bins: bins };
  }

  /* границы, в которых низ обшивки НИЖЕ пола: только там рамка сидит в корпусе */
  function measureBay(a, fit, floorF){
    var ref = floorF - 0.2, lim = Math.round(a.fusLen * 0.5);
    var cx = Math.round(fit.xCenter);
    var x0 = cx, x1 = cx, miss, bi, b;
    miss = 0;
    for (bi = cx - 1; bi >= -lim; bi--){
      b = fit.bins[bi];
      if (b === undefined){ if (++miss > 3) break; x0 = bi; continue; }
      if (b < ref){ x0 = bi; miss = 0; } else break;
    }
    miss = 0;
    for (bi = cx + 1; bi <= lim; bi++){
      b = fit.bins[bi];
      if (b === undefined){ if (++miss > 3) break; x1 = bi; continue; }
      if (b < ref){ x1 = bi; miss = 0; } else break;
    }
    /* не длиннее настоящей кабины и не короче разумного минимума */
    if (x1 - x0 > a.cab.L){
      var c = (x0 + x1) / 2;
      x0 = c - a.cab.L/2; x1 = c + a.cab.L/2;
    }
    if (x1 - x0 < 10) return null;
    return { x0: x0, x1: x1 };
  }

  function rebuild(){
    var a = AIRCRAFT[curAC];
    if (planeGroup){ scene.remove(planeGroup); planeGroup = null; }
    if (cabinGroup){ scene.remove(cabinGroup); cabinGroup = null; }
    /* запасные значения (без модели): честные размеры, масштаб 1:1 */
    a._floorY = a.floorY; a._shift = a.cabShift; a._visL = a.cab.L; a._kX = 1;
    if (baseModel){
      planeGroup = baseModel.clone();
      planeGroup.scale.setScalar(a.fusLen);
      planeGroup.position.y = baseModel.userData.groundOffset * a.fusLen;
      planeGroup.renderOrder = 3;
      planeGroup.traverse(function(o){ o.renderOrder = 3; });
      scene.add(planeGroup);
      var fit = measureHull(a);
      if (fit){
        var k = a.fusLen / 69.0;
        a._floorY = fit.floorY + 0.6 * k;
        var bay = measureBay(a, fit, a._floorY);
        if (bay){
          /* рамка — строго в границах, где корпус её вмещает;
             груз масштабируется в её пропорциях (расчёт — по настоящим цифрам) */
          a._shift = (bay.x0 + bay.x1) / 2;
          a._visL  = bay.x1 - bay.x0;
          a._kX    = a._visL / a.cab.L;
        } else {
          a._shift = fit.xCenter - 5.0 * k;
        }
      }
    }
    /* кабина: янтарный каркас + едва заметная заливка */
    cabinGroup = new THREE.Group();
    var cg = new THREE.BoxGeometry(a._visL, a.cab.H, a.cab.W);
    var wire = new THREE.LineSegments(new THREE.EdgesGeometry(cg), MAT.cabLine);
    var fill = new THREE.Mesh(cg, MAT.cabFill);
    wire.position.set(a._shift, a._floorY + a.cab.H/2, 0);
    fill.position.copy(wire.position);
    fill.renderOrder = 1; wire.renderOrder = 2;
    cabinGroup.add(fill); cabinGroup.add(wire);
    scene.add(cabinGroup);
    updateCargo();
  }

  function updateCargo(){
    var a = AIRCRAFT[curAC];
    if (cargoGroup){ scene.remove(cargoGroup); cargoGroup = null; }
    var ln = val("l"), w = val("w"), h = val("h"), wt = val("weight");
    var fits = (ln<=a.cab.L)&&(w<=a.cab.W)&&(h<=a.cab.H)&&(wt<=a.P)&&(ln+w+h+wt>0);
    if (ln>0 && w>0 && h>0){
      cargoGroup = new THREE.Group();
      /* длина груза рисуется в пропорциях видимой рамки (kX), расчёт — по настоящим метрам */
      var cl = Math.min(ln, a.cab.L*1.1) * a._kX, cw = Math.min(w, a.cab.W*1.5), ch = Math.min(h, a.cab.H*1.5);
      var geo = new THREE.BoxGeometry(cl, ch, cw);
      var box = new THREE.Mesh(geo, fits ? MAT.okBox : MAT.noBox);
      box.position.set(a._shift, a._floorY + ch/2, 0);
      box.renderOrder = 1;
      cargoGroup.add(box);
      var wire = new THREE.LineSegments(new THREE.EdgesGeometry(geo), fits ? MAT.okLine : MAT.noLine);
      wire.position.copy(box.position); wire.renderOrder = 2;
      cargoGroup.add(wire);
      var straps = Math.max(2, Math.round(cl/4));
      for (var i=0;i<straps;i++){
        var sx = box.position.x - cl/2 + cl*(i+0.5)/straps;
        var strap = new THREE.Mesh(new THREE.BoxGeometry(0.12, ch+0.18, cw+0.35), MAT.strap);
        strap.position.set(sx, box.position.y, 0);
        strap.renderOrder = 1;
        cargoGroup.add(strap);
      }
      scene.add(cargoGroup);
    }
    var hud = document.getElementById("hud");
    if (hud){
      hud.innerHTML = "<b>" + a.name + "</b> · " + a.note +
        (a.scaled ? "<br>силуэт масштабирован из модели Ан-124 — до получения модели Ил-76" : "") +
        (ln+w+h>0 ? "<br>груз " + fmt(ln) + " × " + fmt(w) + " × " + fmt(h) + " м · " + fmt(wt) + " т" : "");
    }
    renderVerdicts();
  }

  function renderVerdicts(){
    var res = document.getElementById("res");
    if (!res) return;
    var wt = val("weight"), l = val("l"), wd = val("w"), h = val("h");
    res.innerHTML = "";
    [
      {n:"Ил-76ТД-90ВД", L:20.0, W:3.45, H:3.4, P:50,  sp:"20,0 × 3,45 × 3,4 м · 50 т"},
      {n:"Ан-124-100",   L:36.5, W:6.4,  H:4.4, P:120, sp:"36,5 × 6,4 × 4,4 м · 120 т"},
      {n:"Ан-124-150",   L:36.5, W:6.4,  H:4.4, P:150, sp:"36,5 × 6,4 × 4,4 м · 150 т"}
    ].forEach(function(A){
      var fits = (l<=A.L)&&(wd<=A.W)&&(h<=A.H)&&(wt<=A.P)&&(l+wd+h+wt>0);
      var row = document.createElement("div");
      row.className = "rrow" + (fits ? " fit" : "");
      row.innerHTML = '<span class="nm">'+A.n+'<br><span class="sp">'+A.sp+'</span></span>' +
        '<span class="tag '+(fits?'y">влезает':'n">не влезает')+'</span>';
      res.appendChild(row);
    });
  }

  /* загрузка модели: сперва из упакованного скрипта (работает с file://),
     иначе — обычным путём; без модели сцена показывает кабину и груз */
  function onModel(gltf){
    baseModel = normalizeModel(gltf.scene);
    msg.remove();
    rebuild();
  }
  function onFail(){
    msg.textContent = "Модель не загрузилась — показываю только кабину и груз";
    setTimeout(function(){ msg.remove(); }, 3500);
    rebuild();
  }
  if (typeof THREE.GLTFLoader !== "undefined"){
    var loader = new THREE.GLTFLoader();
    if (typeof MeshoptDecoder !== "undefined" && loader.setMeshoptDecoder) loader.setMeshoptDecoder(MeshoptDecoder);
    var P3 = /\/(en|zh)\//.test(location.pathname) ? "../assets/" : "assets/";
    if (window.AN124_B64){
      try {
        var bin = atob(window.AN124_B64);
        var bytes = new Uint8Array(bin.length);
        for (var bi = 0; bi < bin.length; bi++) bytes[bi] = bin.charCodeAt(bi);
        loader.parse(bytes.buffer, "", onModel, onFail);
      } catch(e){ onFail(); }
    } else {
      loader.load(P3 + "an124-fit.glb", onModel, undefined, onFail);
    }
  } else { msg.remove(); rebuild(); }
  rebuild();

  /* камера-орбита */
  var yaw = 0.85, pitch = 0.24, dist = 0, autorot = true;
  function applyCam(){
    var a = AIRCRAFT[curAC];
    if (!dist) dist = a.fusLen * 1.05;
    pitch = Math.max(0.05, Math.min(1.1, pitch));
    dist = Math.max(a.fusLen*0.35, Math.min(a.fusLen*2.4, dist));
    var cy = (a._floorY !== undefined ? a._floorY : a.floorY) + a.cab.H*0.5;
    camera.position.set(
      dist * Math.cos(pitch) * Math.sin(yaw),
      cy + dist * Math.sin(pitch),
      dist * Math.cos(pitch) * Math.cos(yaw)
    );
    camera.lookAt(0, cy, 0);
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
    var w2 = stage.clientWidth, h2 = stage.clientHeight || 360;
    camera.aspect = w2/h2; camera.updateProjectionMatrix();
    renderer.setSize(w2, h2);
  });

  ["weight","l","w","h"].forEach(function(id){
    var el = document.getElementById(id);
    if (el) el.addEventListener("input", updateCargo);
  });
  document.querySelectorAll(".actab").forEach(function(t){
    t.addEventListener("click", function(){
      curAC = parseInt(this.getAttribute("data-ac"), 10);
      document.querySelectorAll(".actab").forEach(function(x){ x.classList.toggle("on", x===t); });
      dist = 0;
      rebuild();
    });
  });

  (function loop(){
    if (autorot && !reduced) yaw += 0.0016;
    applyCam();
    renderer.render(scene, camera);
    requestAnimationFrame(loop);
  })();
})();
