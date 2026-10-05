/* Волга-Днепр · примерка груза: Ан-124 — купленная 3D-модель (an124-fit.glb),
   Ил-76ТД-90ВД — схематичная модель, построенная здесь же в коде по габаритам
   (длина 46,6 м, размах 50,5 м, высота 14,8 м; кабина 20,0 × 3,45 × 3,4 м).
   Корпус самолёта — «рентген» (полупрозрачный), внутри — янтарный каркас
   грузовой кабины и груз клиента в реальном масштабе. */
(function(){
  var stage = document.getElementById("stage3d");
  if (!stage || typeof THREE === "undefined") return;
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* длина фюзеляжа задаёт масштаб модели; cab — грузовая кабина, floorY — высота пола над землёй */
  var LANG = (document.documentElement.lang || "ru").slice(0,2);
  var TX = {
    ru:{fit:"влезает", no:"не влезает", warn:"проверка по чертежу", cab:"кабина", upto:"до", cargo:"груз", t:"т", m:"м",
        ref:"справочно, без 3D",
        roof:"Верхние углы груза упираются в скруглённый потолок кабины — по габаритам проходит, но нужна проверка по чертежу сечения.",
        fail:"Модель не загрузилась — показываю только кабину и груз", an:"Ан-124", il:"Ил-76", ilsfx:"ТД-90ВД"},
    en:{fit:"fits", no:"does not fit", warn:"drawing check", cab:"cabin", upto:"up to", cargo:"cargo", t:"t", m:"m",
        ref:"reference only, no 3D",
        roof:"The upper corners of the cargo reach the curved cabin roof — within nominal dimensions, but a cross-section drawing check is required.",
        fail:"Model failed to load — showing cabin and cargo only", an:"An-124", il:"Il-76", ilsfx:"TD-90VD"},
    zh:{fit:"可装载", no:"无法装载", warn:"需图纸校核", cab:"货舱", upto:"最多", cargo:"货物", t:"吨", m:"米",
        ref:"仅供参考，无3D",
        roof:"货物上角触及弧形舱顶——名义尺寸内，但需按截面图纸校核。",
        fail:"模型未能加载——仅显示货舱与货物", an:"安-124", il:"伊尔-76", ilsfx:"TD-90VD"}
  }[LANG] || null;
  if (!TX) TX = {fit:"влезает", no:"не влезает", warn:"проверка по чертежу", cab:"кабина", upto:"до", cargo:"груз", t:"т", m:"м", ref:"", roof:"", fail:"", an:"Ан-124", il:"Ил-76", ilsfx:"ТД-90ВД"};
  /* profile — ориентировочный контур скруглённого потолка: [полуширина, высота над полом];
     снят с внутренней геометрии модели, не чертёж. Используется только для предупреждения. */
  var PROFILE_AN = [[0,4.75],[0.8,4.75],[1.6,4.75],[2.28,4.75],[2.4,4.53],[2.8,3.82],[3.2,3.11]];
  /* Ил-76: круглый свод радиусом ~2,35 м, пол на 1,3 м ниже оси фюзеляжа — по габаритам, не чертёж */
  var PROFILE_IL = [[0,3.65],[0.6,3.57],[1.0,3.43],[1.2,3.32],[1.4,3.19],[1.6,3.02],[1.725,2.9]];
  var IL_AXIS = 3.75;                      /* ось фюзеляжа Ил-76 над землёй, м */
  var AIRCRAFT = [
    { name:TX.an, fusLen:69.0, cab:{L:36.5, W:6.4, H:4.4}, floorY:2.2, cabShift:0, P:150, profile:PROFILE_AN,
      note:TX.cab+" 36,5 × 6,4 × 4,4 "+TX.m+" · "+TX.upto+" 150 "+TX.t },
    { name:TX.il+TX.ilsfx, fusLen:46.6, cab:{L:20.0, W:3.45, H:3.4}, floorY:IL_AXIS-1.3, cabShift:3.0, P:50, profile:PROFILE_IL,
      build:buildIl76, note:TX.cab+" 20,0 × 3,45 × 3,4 "+TX.m+" · "+TX.upto+" 50 "+TX.t }
  ];

  /* ---------- схематичный Ил-76 из простых тел: фюзеляж по сечениям, высокоплан
     со стреловидностью и отрицательным V, Т-образное оперение, 4 мотогондолы,
     обтекатели шасси, остеклённый нос штурмана. Нос — +X, земля — y = 0. ---------- */
  function hullGeometry(st, seg){
    /* st: [x, смещение центра по y, полувысота, полуширина] от носа к хвосту */
    var pos = [], idx = [], n = seg || 28, i, j;
    for (i = 0; i < st.length; i++){
      for (j = 0; j < n; j++){
        var a = j / n * Math.PI * 2;
        pos.push(st[i][0], IL_AXIS + st[i][1] + Math.cos(a) * st[i][2], Math.sin(a) * st[i][3]);
      }
    }
    for (i = 0; i < st.length - 1; i++){
      for (j = 0; j < n; j++){
        var a0 = i*n + j, a1 = i*n + (j+1)%n, b0 = a0 + n, b1 = a1 + n;
        idx.push(a0, b0, a1, a1, b0, b1);
      }
    }
    var g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx); g.computeVertexNormals();
    return g;
  }
  function slabGeometry(r0, r1, t0, t1){
    /* плоская консоль: r0/r1 — [xLE, xTE, y, z] у корня и на конце, t — толщина */
    var P = [
      [r0[0], r0[2]+t0/2, r0[3]], [r0[1], r0[2]+t0/4, r0[3]], [r1[1], r1[2]+t1/4, r1[3]], [r1[0], r1[2]+t1/2, r1[3]],
      [r0[0], r0[2]-t0/2, r0[3]], [r0[1], r0[2]-t0/4, r0[3]], [r1[1], r1[2]-t1/4, r1[3]], [r1[0], r1[2]-t1/2, r1[3]]
    ];
    var F = [0,1,2, 0,2,3, 4,6,5, 4,7,6, 0,4,5, 0,5,1, 1,5,6, 1,6,2, 2,6,7, 2,7,3, 3,7,4, 3,4,0];
    var pos = []; P.forEach(function(p){ pos.push(p[0], p[1], p[2]); });
    var g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(F); g.computeVertexNormals();
    return g;
  }
  function finGeometry(r0, r1, t0, t1){
    /* вертикальная консоль: r — [xLE, xTE, y, z] */
    var P = [
      [r0[0], r0[2], r0[3]+t0/2], [r0[1], r0[2], r0[3]+t0/4], [r1[1], r1[2], r1[3]+t1/4], [r1[0], r1[2], r1[3]+t1/2],
      [r0[0], r0[2], r0[3]-t0/2], [r0[1], r0[2], r0[3]-t0/4], [r1[1], r1[2], r1[3]-t1/4], [r1[0], r1[2], r1[3]-t1/2]
    ];
    var F = [0,1,2, 0,2,3, 4,6,5, 4,7,6, 0,4,5, 0,5,1, 1,5,6, 1,6,2, 2,6,7, 2,7,3, 3,7,4, 3,4,0];
    var pos = []; P.forEach(function(p){ pos.push(p[0], p[1], p[2]); });
    var g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(F); g.computeVertexNormals();
    return g;
  }
  function buildIl76(){
    var grp = new THREE.Group(), m = MAT.xray;
    function add(g, x, y, z, sx, sy, sz){
      var o = new THREE.Mesh(g, m);
      o.position.set(x||0, y||0, z||0);
      if (sx) o.scale.set(sx, sy, sz);
      grp.add(o); return o;
    }
    /* фюзеляж: длина 46,6 м, Ø ~5 м, хвост с подъёмом над грузовой рампой */
    add(hullGeometry([
      [23.3,-0.55,0.08,0.08], [22.9,-0.45,0.85,0.95], [22.0,-0.2,1.55,1.65], [20.6,0.05,2.1,2.2],
      [18.8,0.1,2.45,2.45], [16.5,0,2.5,2.5], [-6.5,0,2.5,2.5], [-9.5,0.25,2.35,2.42],
      [-13,0.75,2.0,2.1], [-16.5,1.3,1.5,1.6], [-19.8,1.85,0.95,1.05], [-22.4,2.2,0.45,0.5], [-23.3,2.3,0.08,0.08]
    ]));
    /* кабина пилотов — горб над носом, остеклённый нос штурмана — под ним */
    add(new THREE.SphereGeometry(1, 20, 14), 18.6, IL_AXIS + 1.85, 0, 3.2, 1.0, 1.5);
    add(new THREE.SphereGeometry(1, 20, 14), 21.9, IL_AXIS - 0.85, 0, 1.25, 0.75, 0.9);
    /* обтекатели шасси по бортам */
    [-1, 1].forEach(function(s){
      add(new THREE.SphereGeometry(1, 24, 12), 0.5, IL_AXIS - 1.75, s*2.25, 7.5, 0.95, 0.8);
    });
    /* крыло: высокоплан, полуразмах 25,25 м, стреловидность ~25°, отрицательное V −3° */
    var wy = IL_AXIS + 2.2, semi = 25.25, dih = -Math.sin(3*Math.PI/180);
    function wingLE(z){ return 5.0 - Math.abs(z) * Math.tan(25*Math.PI/180); }
    function wingY(z){ return wy + Math.abs(z) * dih; }
    [-1, 1].forEach(function(s){
      add(slabGeometry([5.0, -4.6, wy, 0], [wingLE(semi), wingLE(semi) - 3.1, wingY(semi), s*semi], 1.0, 0.3));
      /* две мотогондолы на пилонах под крылом */
      [7.3, 12.9].forEach(function(z){
        var le = wingLE(z), y = wingY(z) - 1.55;
        var nac = new THREE.CylinderGeometry(0.88, 0.62, 5.6, 18, 1, false);
        nac.rotateZ(Math.PI/2);
        add(nac, le + 0.6, y, s*z);
        add(finGeometry([le + 0.2, le - 3.2, y + 0.6, s*z], [le - 0.2, le - 3.6, wingY(z), s*z], 0.35, 0.3));
      });
    });
    /* киль до 14,8 м над землёй и Т-образный стабилизатор */
    var finRootY = IL_AXIS + 2.0, finTop = 14.6;
    add(finGeometry([-12.0, -21.8, finRootY, 0], [-19.6, -23.4, finTop, 0], 0.7, 0.35));
    [-1, 1].forEach(function(s){
      add(slabGeometry([-19.2, -23.6, finTop, 0], [-23.2, -25.0, finTop + 0.2, s*8.7], 0.45, 0.2));
    });
    grp.userData.groundOffset = 0;
    return grp;
  }
  function roofAt(halfW, prof, H){
    if (halfW > prof[prof.length-1][0]) return 0;
    for (var i=1;i<prof.length;i++) if (halfW <= prof[i][0]){
      var k = (halfW - prof[i-1][0]) / (prof[i][0] - prof[i-1][0]);
      return Math.min(H, prof[i-1][1] + k*(prof[i][1]-prof[i-1][1]));
    }
    return Math.min(H, prof[0][1]);
  }
  function roofConflict(w, h, prof, H, W){ return !!prof && w > 0 && h > 0 && w <= W && h <= H && h > roofAt(w/2, prof, H); }
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
    if (a.build){
      /* модель по габаритам: масштаб уже в метрах, кабина стоит по расчёту */
      planeGroup = a.build();
      planeGroup.traverse(function(o){ o.renderOrder = 3; });
      scene.add(planeGroup);
    } else if (baseModel){
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
    /* ориентировочный контур скруглённого потолка — три арки по длине кабины */
    if (a.profile){
      var arch = a.profile.slice().reverse().map(function(q){ return [-q[0], Math.min(q[1], a.cab.H)]; })
        .concat(a.profile.slice(1).map(function(q){ return [q[0], Math.min(q[1], a.cab.H)]; }));
      [-0.3, 0, 0.3].forEach(function(part){
        var x = a._shift + a._visL * part, pts = [new THREE.Vector3(x, a._floorY, -a.cab.W/2)];
        arch.forEach(function(q){ pts.push(new THREE.Vector3(x, a._floorY + q[1], q[0])); });
        pts.push(new THREE.Vector3(x, a._floorY, a.cab.W/2));
        var ln = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), MAT.cabLine);
        ln.renderOrder = 2; cabinGroup.add(ln);
      });
    }
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
        (ln+w+h>0 ? "<br>" + TX.cargo + " " + fmt(ln) + " × " + fmt(w) + " × " + fmt(h) + " " + TX.m + " · " + fmt(wt) + " " + TX.t : "");
    }
    renderVerdicts();
  }

  function renderVerdicts(){
    var res = document.getElementById("res");
    if (!res) return;
    var wt = val("weight"), l = val("l"), wd = val("w"), h = val("h");
    res.innerHTML = "";
    var anyRoof = false;
    [
      {n:TX.il+TX.ilsfx, L:20.0, W:3.45, H:3.4, P:50,  prof:PROFILE_IL, sp:"20,0 × 3,45 × 3,4 "+TX.m+" · 50 "+TX.t},
      {n:TX.an+"-100",   L:36.5, W:6.4,  H:4.4, P:120, prof:PROFILE_AN, sp:"36,5 × 6,4 × 4,4 "+TX.m+" · 120 "+TX.t},
      {n:TX.an+"-150",   L:36.5, W:6.4,  H:4.4, P:150, prof:PROFILE_AN, sp:"36,5 × 6,4 × 4,4 "+TX.m+" · 150 "+TX.t}
    ].forEach(function(A){
      var fits = (l<=A.L)&&(wd<=A.W)&&(h<=A.H)&&(wt<=A.P)&&(l+wd+h+wt>0);
      var roof = fits && roofConflict(wd, h, A.prof, A.H, A.W);
      if (roof) anyRoof = true;
      var row = document.createElement("div");
      row.className = "rrow" + (fits ? (roof ? " fit warn" : " fit") : "");
      row.innerHTML = '<span class="nm">'+A.n+'<br><span class="sp">'+A.sp+'</span></span>' +
        '<span class="tag '+(fits ? (roof ? 'w">'+TX.warn : 'y">'+TX.fit) : 'n">'+TX.no)+'</span>';
      res.appendChild(row);
    });
    if (anyRoof){
      var note = document.createElement("p"); note.className = "roof-note"; note.textContent = TX.roof; res.appendChild(note);
    }
  }

  /* загрузка модели: сперва из упакованного скрипта (работает с file://),
     иначе — обычным путём; без модели сцена показывает кабину и груз */
  function onModel(gltf){
    baseModel = normalizeModel(gltf.scene);
    msg.remove();
    rebuild();
  }
  function onFail(){
    msg.textContent = TX.fail;
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
  document.querySelectorAll("button.actab").forEach(function(t){
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
