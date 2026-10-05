/* Волга-Днепр · общий скрипт сайта (все модули с проверкой наличия элементов) */
(function(){
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function $(id){ return document.getElementById(id); }
  function fmt(x){ return String(x).replace(".", ","); }

  /* ---------- шапка, прогресс, наверх ---------- */
  var hdr = document.querySelector("header.site");
  var pbar = document.createElement("div"); pbar.className = "pbar"; document.body.appendChild(pbar);
  var toTop = document.createElement("button");
  toTop.className = "totop"; toTop.setAttribute("aria-label","Наверх");
  toTop.innerHTML = '<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M9 15V3M3 9l6-6 6 6" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  document.body.appendChild(toTop);
  toTop.addEventListener("click", function(){ window.scrollTo({top:0, behavior: reduced ? "auto" : "smooth"}); });
  function onScroll(){
    var y = window.scrollY;
    if (hdr) hdr.classList.toggle("scrolled", y > 40);
    toTop.classList.toggle("show", y > 700);
    var max = document.documentElement.scrollHeight - window.innerHeight;
    pbar.style.width = (max > 0 ? (y / max * 100) : 0) + "%";
  }
  window.addEventListener("scroll", onScroll, {passive:true});
  onScroll();

  /* ---------- мобильное меню ---------- */
  var mmenu = $("mmenu"), burger = $("burger"), mclose = $("mclose");
  if (mmenu && burger){
    burger.addEventListener("click", function(){ mmenu.classList.add("open"); });
    if (mclose) mclose.addEventListener("click", function(){ mmenu.classList.remove("open"); });
    mmenu.querySelectorAll("a").forEach(function(a){
      a.addEventListener("click", function(){ mmenu.classList.remove("open"); });
    });
  }

  /* ---------- подсветка текущего пункта меню ---------- */
  var here = (location.pathname.split("/").pop() || "index.html");
  document.querySelectorAll("nav.main a, .mmenu a").forEach(function(a){
    var href = a.getAttribute("href") || "";
    if (href.split("#")[0] === here && href.indexOf("#") === -1) a.classList.add("on");
  });

  /* ---------- reveal + counters ---------- */
  function animateCount(el){
    var to = parseFloat(el.getAttribute("data-to"));
    var dur = 1500, start = null;
    function step(ts){
      if (!start) start = ts;
      var p = Math.min((ts - start) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(to * eased);
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  if (!reduced && "IntersectionObserver" in window){
    var io = new IntersectionObserver(function(es){
      es.forEach(function(e){ if (e.isIntersecting){ e.target.classList.add("in"); io.unobserve(e.target); } });
    }, {threshold:.1});
    document.querySelectorAll(".rv").forEach(function(el){ io.observe(el); });
    var cio = new IntersectionObserver(function(es){
      es.forEach(function(e){ if (e.isIntersecting){ animateCount(e.target); cio.unobserve(e.target); } });
    }, {threshold:.5});
    document.querySelectorAll(".cnt").forEach(function(el){ cio.observe(el); });
  } else {
    document.querySelectorAll(".rv").forEach(function(el){ el.classList.add("in"); });
    document.querySelectorAll(".cnt").forEach(function(el){ el.textContent = el.getAttribute("data-to"); });
  }

  /* ---------- дождь на hero ---------- */
  var cv = $("rain");
  if (cv && !reduced){
    var ctx = cv.getContext("2d"), heroEl = cv.parentElement, drops = [];
    function size(){
      cv.width = heroEl.clientWidth; cv.height = heroEl.clientHeight;
      drops = [];
      for (var i=0;i<Math.round(cv.width/14);i++){
        drops.push({x:Math.random()*cv.width, y:Math.random()*cv.height,
          l:10+Math.random()*16, v:260+Math.random()*240, a:.04+Math.random()*.09});
      }
    }
    size(); window.addEventListener("resize", size);
    var last = null;
    (function tick(ts){
      if (last === null){ last = ts || 0; }
      var dt = Math.min(((ts||0) - last)/1000, .05); last = ts || 0;
      ctx.clearRect(0,0,cv.width,cv.height); ctx.lineWidth = 1;
      for (var i=0;i<drops.length;i++){
        var d = drops[i];
        d.y += d.v*dt; d.x -= d.v*dt*.12;
        if (d.y > cv.height + 20){ d.y = -20; d.x = Math.random()*(cv.width+80); }
        ctx.strokeStyle = "rgba(214,228,238," + d.a + ")";
        ctx.beginPath(); ctx.moveTo(d.x, d.y); ctx.lineTo(d.x + d.l*.12, d.y - d.l); ctx.stroke();
      }
      requestAnimationFrame(tick);
    })(0);
  } else if (cv){ cv.style.display = "none"; }

  /* ---------- карта маршрутной сети ---------- */
  /* ---------- локализация ---------- */
  var LANG = (document.documentElement.lang || "ru").slice(0,2);
  var LZ = {
    ru: {ci:0, qqCity:"Город", qq3d:"Примерить груз в 3D", qqAny:"Ил-76 или Ан-124", qq100:"Ан-124-100", qq150:"Ан-124-150", qqOver:"свыше 150 т — нужен разбор деления груза", qqFit:"подходит: ", qqSame:"Выберите два разных города", qqPick:"Выберите города отправления и назначения", qqTo:"Передать в заявку", qqStop:"возможна техпосадка", hint0:"Кликните город отправления, затем город назначения — покажу расстояние и время полёта",
      hintReset:"Кликните город отправления, затем город назначения",
      hintNext:" → теперь кликните город назначения",
      km:" км", h:" ч", m:" мин", an:"Ан-124", il:"Ил-76",
      tech1:"При большой загрузке ", tech2:": возможна техпосадка (+~2 ч)", and:" и ",
      est:"Оценка по крейсерской скорости, без учёта ветра и маршрутов обхода",
      toReq:"В заявку с этим маршрутом", reset:"Сброс",
      mSubj:"Заявка ", mSite:"Заявка с сайта · № ", mCargo:"ГРУЗ", mWhat:"Что за груз: ", mType:"Тип: ",
      mW:"Вес: ", mT:" т", mDims:"Габариты (Д×Ш×В): ", mM:" м", mRoute:"МАРШРУТ", mFrom:"Откуда: ", mTo:"Куда: ",
      mReady:"Готовность груза: ", mServ:"Объём услуги: ", mCont:"КОНТАКТЫ", mCo:"Компания: ", mName:"Имя: ",
      mPh:"Телефон: ", mEm:"E-mail: ", mCm:"Комментарий: ", due:"Ответим до "},
    en: {ci:1, qqCity:"City", qq3d:"Fit the cargo in 3D", qqAny:"Il-76 or An-124", qq100:"An-124-100", qq150:"An-124-150", qqOver:"over 150 t — cargo split assessment needed", qqFit:"suitable: ", qqSame:"Choose two different cities", qqPick:"Choose origin and destination", qqTo:"Send to request form", qqStop:"technical stop possible", hint0:"Click the origin city, then the destination — I will show distance and flight time",
      hintReset:"Click the origin city, then the destination",
      hintNext:" → now click the destination city",
      km:" km", h:" h", m:" min", an:"An-124", il:"Il-76",
      tech1:"With a heavy payload, ", tech2:": a technical stop may be required (+~2 h)", and:" and ",
      est:"Estimate at cruise speed, excluding winds and routing detours",
      toReq:"Start a request with this route", reset:"Reset",
      mSubj:"Request ", mSite:"Website request · No. ", mCargo:"CARGO", mWhat:"Cargo: ", mType:"Type: ",
      mW:"Weight: ", mT:" t", mDims:"Dimensions (L×W×H): ", mM:" m", mRoute:"ROUTE", mFrom:"From: ", mTo:"To: ",
      mReady:"Cargo ready: ", mServ:"Service scope: ", mCont:"CONTACTS", mCo:"Company: ", mName:"Name: ",
      mPh:"Phone: ", mEm:"E-mail: ", mCm:"Comments: ", due:"We will reply by "},
    zh: {ci:2, qqCity:"城市", qq3d:"3D货舱适配", qqAny:"伊尔-76 或 安-124", qq100:"安-124-100", qq150:"安-124-150", qqOver:"超过150吨——需评估分拆运输", qqFit:"适用机型：", qqSame:"请选择两个不同的城市", qqPick:"请选择出发地和目的地", qqTo:"提交询价", qqStop:"可能需要技术经停", hint0:"点击出发城市，再点击目的地城市——即可显示距离和飞行时间",
      hintReset:"点击出发城市，再点击目的地城市",
      hintNext:" → 现在请点击目的地城市",
      km:" 公里", h:" 小时", m:" 分", an:"安-124", il:"伊尔-76",
      tech1:"满载情况下，", tech2:"：可能需要技术经停（约 +2 小时）", and:" 和 ",
      est:"按巡航速度估算，不含风力及绕航影响",
      toReq:"按此航线提交询价", reset:"重置",
      mSubj:"询价 ", mSite:"网站询价 · 编号 ", mCargo:"货物", mWhat:"货物名称: ", mType:"类型: ",
      mW:"重量: ", mT:" 吨", mDims:"尺寸 (长×宽×高): ", mM:" 米", mRoute:"航线", mFrom:"出发地: ", mTo:"目的地: ",
      mReady:"货物就绪日期: ", mServ:"服务范围: ", mCont:"联系方式", mCo:"公司: ", mName:"姓名: ",
      mPh:"电话: ", mEm:"电子邮箱: ", mCm:"备注: ", due:"我们将在此时间前回复："}
  };
  var T = LZ[LANG] || LZ.ru;

  var rmap = $("routemap-svg");
  if (rmap){
    var W = 1180, H = 680;
    /* город: [имя RU, EN, ZH, lon, lat, выравнивание подписи] · ДЕМО-сеть; города из кейсов тоже здесь, чтобы их можно было посчитать в быстром расчёте */
    var CITIES = [
      ["Москва","Moscow","莫斯科",37.6,55.8], ["Казань","Kazan","喀山",49.1,55.8,"t"], ["Ульяновск","Ulyanovsk","乌里扬诺夫斯克",48.4,54.3,"b"],
      ["Новосибирск","Novosibirsk","新西伯利亚",82.9,55.0], ["Красноярск","Krasnoyarsk","克拉斯诺亚尔斯克",92.9,56.0,"t"], ["Иркутск","Irkutsk","伊尔库茨克",104.3,52.3,"l"],
      ["Владивосток","Vladivostok","符拉迪沃斯托克",131.9,43.1], ["Магадан","Magadan","马加丹",150.8,59.6,"l"], ["Хабаровск","Khabarovsk","哈巴罗夫斯克",135.1,48.5], ["Улан-Удэ","Ulan-Ude","乌兰乌德",107.6,51.8,"b"],
      ["Нижневартовск","Nizhnevartovsk","下瓦尔托夫斯克",76.6,60.9], ["Атырау","Atyrau","阿特劳",51.9,47.1,"b"], ["Байконур","Baikonur","拜科努尔",63.3,45.6,"b"],
      ["Ташкент","Tashkent","塔什干",69.2,41.3], ["Алматы","Almaty","阿拉木图",76.9,43.2],
      ["Пекин","Beijing","北京",116.4,39.9], ["Чжэнчжоу","Zhengzhou","郑州",113.6,34.7,"l"], ["Шанхай","Shanghai","上海",121.5,31.2],
      ["Гонконг","Hong Kong","香港",114.2,22.3], ["Сеул","Seoul","首尔",126.9,37.5],
      ["Ханой","Hanoi","河内",105.8,21.0,"l"], ["Бангкок","Bangkok","曼谷",100.5,13.7,"l"], ["Сингапур","Singapore","新加坡",103.8,1.35], ["Джакарта","Jakarta","雅加达",106.8,-6.2],
      ["Дели","Delhi","德里",77.2,28.6], ["Мумбаи","Mumbai","孟买",72.9,19.1], ["Ченнаи","Chennai","金奈",80.3,13.1], ["Калькутта","Kolkata","加尔各答",88.4,22.6],
      ["Стамбул","Istanbul","伊斯坦布尔",29.0,41.0], ["Дубай","Dubai","迪拜",55.3,25.2], ["Доха","Doha","多哈",51.5,25.3,"l"], ["Джидда","Jeddah","吉达",39.2,21.5],
      ["Каир","Cairo","开罗",31.2,30.0], ["Дамаск","Damascus","大马士革",36.3,33.5,"t"], ["Найроби","Nairobi","内罗毕",36.8,-1.3], ["Йоханнесбург","Johannesburg","约翰内斯堡",28.0,-26.2], ["Лагос","Lagos","拉各斯",3.4,6.5]
    ];
    function cname(c){ return c[T.ci]; }
    var RN = {}; CITIES.forEach(function(c,i){ RN[c[0]] = i; });
    var ROUTES = [
      ["Москва","Шанхай"], ["Москва","Пекин"], ["Красноярск","Шанхай"], ["Красноярск","Гонконг"],
      ["Ульяновск","Дубай"], ["Москва","Стамбул"], ["Дубай","Дели"], ["Москва","Ташкент"],
      ["Красноярск","Ханой"], ["Стамбул","Каир"], ["Дубай","Найроби"], ["Дубай","Йоханнесбург"],
      ["Гонконг","Сингапур"], ["Москва","Джидда"]
    ].map(function(r){ return [RN[r[0]], RN[r[1]]]; });
    function xy(lon, lat){
      var x = (lon + 18) / 176 * W;                 /* окно 18°W..158°E */
      var y = (63 - lat) / 101 * H;                 /* окно 38°S..63°N */
      return [x, y];
    }
    var NS = "http://www.w3.org/2000/svg";
    rmap.setAttribute("viewBox", "0 0 " + W + " " + H);
    /* суша — настоящие контуры материков */
    if (window.VD_LAND_PATHS){
      window.VD_LAND_PATHS.forEach(function(d){
        var p = document.createElementNS(NS, "path");
        p.setAttribute("d", d);
        p.setAttribute("fill", "rgba(90,112,133,.16)");
        p.setAttribute("stroke", "rgba(157,176,193,.28)");
        p.setAttribute("stroke-width", "1");
        rmap.appendChild(p);
      });
    }
    /* сетка меридианов/параллелей */
    for (var gx=0; gx<=W; gx+=W/12){
      var l = document.createElementNS(NS,"line");
      l.setAttribute("x1",gx); l.setAttribute("x2",gx); l.setAttribute("y1",0); l.setAttribute("y2",H);
      l.setAttribute("stroke","rgba(157,176,193,.07)"); rmap.appendChild(l);
    }
    for (var gy=0; gy<=H; gy+=H/7){
      var l2 = document.createElementNS(NS,"line");
      l2.setAttribute("x1",0); l2.setAttribute("x2",W); l2.setAttribute("y1",gy); l2.setAttribute("y2",gy);
      l2.setAttribute("stroke","rgba(157,176,193,.07)"); rmap.appendChild(l2);
    }
    /* демо-дуги маршрутов убраны: карта показывает только выбранный маршрут (см. rm-note) */
    /* города — кликабельные: выбор маршрута */
    var selFrom = null, selTo = null, selArc = null, dots = [];
    CITIES.forEach(function(c, ci){
      var pt = xy(c[3], c[4]);
      var g = document.createElementNS(NS,"g");
      g.setAttribute("class","rm-city"); g.style.cursor = "pointer";
      var hit = document.createElementNS(NS,"circle");
      hit.setAttribute("cx",pt[0]); hit.setAttribute("cy",pt[1]); hit.setAttribute("r","16");
      hit.setAttribute("fill","transparent"); g.appendChild(hit);
      var halo = document.createElementNS(NS,"circle");
      halo.setAttribute("cx",pt[0]); halo.setAttribute("cy",pt[1]); halo.setAttribute("r","7");
      halo.setAttribute("fill","rgba(85,169,245,.18)"); g.appendChild(halo);
      var dot = document.createElementNS(NS,"circle");
      dot.setAttribute("cx",pt[0]); dot.setAttribute("cy",pt[1]); dot.setAttribute("r","3");
      dot.setAttribute("fill","#55A9F5"); g.appendChild(dot);
      var t = document.createElementNS(NS,"text");
      var al = c[5];
      if (al === "l"){ t.setAttribute("x",pt[0]-10); t.setAttribute("text-anchor","end"); t.setAttribute("y",pt[1]+4); }
      else if (al === "t"){ t.setAttribute("x",pt[0]); t.setAttribute("text-anchor","middle"); t.setAttribute("y",pt[1]-11); }
      else if (al === "b"){ t.setAttribute("x",pt[0]); t.setAttribute("text-anchor","middle"); t.setAttribute("y",pt[1]+18); }
      else { t.setAttribute("x",pt[0]+10); t.setAttribute("y",pt[1]+4); }
      t.setAttribute("fill","rgba(233,238,243,.8)");
      t.setAttribute("font-family","Golos Text, Noto Sans SC, sans-serif");
      t.setAttribute("font-size","13"); t.setAttribute("font-weight","500");
      t.textContent = cname(c); g.appendChild(t);
      dots.push({dot:dot, halo:halo});
      g.addEventListener("click", function(){ pick(ci); });
      rmap.appendChild(g);
    });

    /* панель маршрута */
    var panel = document.createElement("div");
    panel.className = "rm-sel";
    rmap.parentNode.appendChild(panel);
    function hint(msg){ panel.innerHTML = '<div class="rm-hint">'+msg+'</div>'; }
    hint(T.hint0);

    function mark(ci, on){
      if (ci === null) return;
      dots[ci].dot.setAttribute("r", on ? "5" : "3");
      dots[ci].dot.setAttribute("fill", on ? "#FFFFFF" : "#55A9F5");
      dots[ci].halo.setAttribute("r", on ? "10" : "7");
      dots[ci].halo.setAttribute("fill", on ? "rgba(85,169,245,.4)" : "rgba(85,169,245,.18)");
    }
    function clearSel(){
      mark(selFrom,false); mark(selTo,false);
      selFrom = selTo = null;
      if (selArc){ selArc.remove(); selArc = null; }
      hint(T.hintReset);
    }
    function gcKm(a, b){
      var R = 6371, D = Math.PI/180;
      var f1 = a[4]*D, f2 = b[4]*D, dF = (b[4]-a[4])*D, dL = (b[3]-a[3])*D;
      var h = Math.sin(dF/2)*Math.sin(dF/2) + Math.cos(f1)*Math.cos(f2)*Math.sin(dL/2)*Math.sin(dL/2);
      return Math.round(2*R*Math.atan2(Math.sqrt(h), Math.sqrt(1-h)) / 10) * 10;
    }
    function fmtH(hrs){
      var h = Math.floor(hrs), m = Math.round((hrs - h) * 60 / 5) * 5;
      if (m === 60){ h++; m = 0; }
      return "≈ " + h + T.h + (m ? " " + m + T.m : "");
    }
    function pick(ci){
      if (selFrom === null || (selFrom !== null && selTo !== null)){
        clearSel(); selFrom = ci; mark(ci,true);
        hint("<b>" + cname(CITIES[ci]) + "</b>" + T.hintNext);
        return;
      }
      if (ci === selFrom) { clearSel(); return; }
      selTo = ci; mark(ci,true);
      var A = CITIES[selFrom], B = CITIES[selTo];
      var a = xy(A[3],A[4]), b = xy(B[3],B[4]);
      var mx = (a[0]+b[0])/2, my = Math.min(a[1],b[1]) - Math.max(40, Math.abs(a[0]-b[0])*.16);
      selArc = document.createElementNS(NS,"path");
      selArc.setAttribute("d","M "+a[0]+" "+a[1]+" Q "+mx+" "+my+" "+b[0]+" "+b[1]);
      selArc.setAttribute("fill","none");
      selArc.setAttribute("stroke","#FFFFFF");
      selArc.setAttribute("stroke-width","2.4");
      selArc.setAttribute("stroke-linecap","round");
      rmap.appendChild(selArc);
      var km = gcKm(A, B);
      var tAn = fmtH(km/800 + 0.6), tIl = fmtH(km/750 + 0.6);
      var stops = [];
      if (km > 4500) stops.push(T.an);
      if (km > 4000) stops.push(T.il);
      var note = stops.length
        ? '<div class="rm-note2">' + T.tech1 + stops.join(T.and) + T.tech2 + '</div>' : '';
      panel.innerHTML =
        '<div class="rm-route"><b>' + cname(A) + '</b> → <b>' + cname(B) + '</b><span class="rm-km">' + km.toLocaleString("ru-RU") + T.km + '</span></div>' +
        '<div class="rm-times"><span>' + T.an + ': <b>' + tAn + '</b></span><span>' + T.il + ': <b>' + tIl + '</b></span></div>' +
        note +
        '<div class="rm-note2">' + T.est + '</div>' +
        '<div class="rm-cta"><a class="btn" href="request.html?from=' + encodeURIComponent(cname(A)) + '&to=' + encodeURIComponent(cname(B)) + '">' + T.toReq + ' <span class="ar">→</span></a><button class="rm-reset" type="button">' + T.reset + '</button></div>';
      panel.querySelector(".rm-reset").addEventListener("click", clearSel);
    }

    /* ---------- мгновенный расчёт в hero (тот же справочник городов и та же математика) ---------- */
    var qq = $("qq");
    if (qq){
      var qFrom = $("qq-from"), qTo = $("qq-to"), qW = $("qq-w"), qRes = $("qq-res");
      var order = CITIES.map(function(c,i){ return i; }).sort(function(a,b){ return cname(CITIES[a]).localeCompare(cname(CITIES[b]), LANG); });
      [qFrom, qTo].forEach(function(sel){
        sel.options[0].textContent = T.qqCity;
        order.forEach(function(i){ var o = document.createElement("option"); o.value = i; o.textContent = cname(CITIES[i]); sel.appendChild(o); });
      });
      var pre = new URLSearchParams(location.search);
      function preset(sel, name){ if (!name) return; for (var i = 0; i < sel.options.length; i++){ if (sel.options[i].textContent === name){ sel.value = sel.options[i].value; break; } } }
      preset(qFrom, pre.get("from")); preset(qTo, pre.get("to"));
      function esc(t){ return String(t).replace(/[&<>"]/g, function(ch){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[ch]; }); }
      qq.addEventListener("submit", function(e){
        e.preventDefault();
        var a = qFrom.value, b = qTo.value;
        qRes.classList.remove("err");
        if (a === "" || b === ""){ qRes.textContent = T.qqPick; qRes.classList.add("err"); return; }
        if (a === b){ qRes.textContent = T.qqSame; qRes.classList.add("err"); return; }
        var A = CITIES[+a], B = CITIES[+b], km = gcKm(A, B);
        var w = parseFloat(String(qW.value).replace(",", "."));
        var fit = "", stops = [];
        if (w > 150) fit = '<span class="warn">' + T.qqOver + '</span>';
        else if (w > 120) fit = T.qq150;
        else if (w > 40)  fit = T.qq100;
        else if (w > 0)   fit = T.qqAny;
        if (km > 4500) stops.push(T.an);
        if (km > 4000 && !(w > 40)) stops.push(T.il);
        var href = "request.html?from=" + encodeURIComponent(cname(A)) + "&to=" + encodeURIComponent(cname(B)) + (w > 0 ? "&weight=" + encodeURIComponent(w) : "");
        qRes.innerHTML =
          '<span><b>' + esc(cname(A)) + '</b> → <b>' + esc(cname(B)) + '</b></span>' +
          '<span class="km">' + km.toLocaleString("ru-RU") + T.km + '</span>' +
          '<span>' + T.an + ' <b>' + fmtH(km/800 + 0.6) + '</b></span>' +
          '<span>' + T.il + ' <b>' + fmtH(km/750 + 0.6) + '</b></span>' +
          (fit ? '<span>' + T.qqFit + '<span class="ac">' + fit + '</span></span>' : '') +
          (stops.length ? '<span class="warn">' + stops.join(T.and) + ': ' + T.qqStop + '</span>' : '') +
          '<a href="' + href + '">' + T.qqTo + ' →</a>' +
          '<a href="fleet.html#fit">' + T.qq3d + ' →</a>';
        /* подсветить тот же маршрут на карте ниже */
        if (typeof clearSel === "function"){ clearSel(); pick(+a); pick(+b); }
      });
    }

    var st = document.createElement("style");
    st.textContent = "@keyframes rmdash{to{stroke-dashoffset:-600;}}";
    document.head.appendChild(st);
  }

  /* ---------- 3D-примерка ---------- */
  var scene = $("scene");
  if (scene){
    var AIRCRAFT = [
      {name:"Ан-124", L:36.5, W:6.4,  H:4.4,  P:150, note:"кабина 36,5 × 6,4 × 4,4 м · до 150 т"},
      {name:"Ил-76",  L:20.0, W:3.45, H:3.4,  P:50,  note:"кабина 20,0 × 3,45 × 3,4 м · до 50 т"}
    ];
    var curAC = 0, rotY = -32, rotX = -14, autorot = true;
    function val(id){ var v = parseFloat($(id).value); return isNaN(v) ? 0 : v; }
    function makeBox(w,h,d,styleFace,styleEdge){
      var box = document.createElement("div"); box.style.position = "absolute";
      function face(fw,fh,transform){
        var f = document.createElement("div"); f.className = "face";
        f.style.width = fw+"px"; f.style.height = fh+"px";
        f.style.marginLeft = (-fw/2)+"px"; f.style.marginTop = (-fh/2)+"px";
        f.style.transform = transform; f.style.background = styleFace; f.style.border = styleEdge;
        box.appendChild(f);
      }
      face(w,h,"translateZ("+(d/2)+"px)");
      face(w,h,"rotateY(180deg) translateZ("+(d/2)+"px)");
      face(d,h,"rotateY(90deg) translateZ("+(w/2)+"px)");
      face(d,h,"rotateY(-90deg) translateZ("+(w/2)+"px)");
      face(w,d,"rotateX(90deg) translateZ("+(h/2)+"px)");
      face(w,d,"rotateX(-90deg) translateZ("+(h/2)+"px)");
      return box;
    }
    function buildScene(){
      while (scene.firstChild) scene.removeChild(scene.firstChild);
      var a = AIRCRAFT[curAC];
      var w = val("w"), h = val("h"), ln = val("l"), wt = val("weight");
      var S = Math.min(430/a.L, 88/a.W, 66/a.H);
      var cabX = a.L*S, cabY = a.H*S, cabZ = a.W*S;
      var floor = document.createElement("div");
      floor.className = "grid-floor";
      floor.style.transform = "rotateX(90deg) translateZ("+(cabY/2+8)+"px)";
      scene.appendChild(floor);
      scene.appendChild(makeBox(cabX,cabY,cabZ,"rgba(157,176,193,.05)","1.5px dashed rgba(85,169,245,.65)"));
      var fits = (ln<=a.L)&&(w<=a.W)&&(h<=a.H)&&(wt<=a.P)&&(ln+w+h+wt>0);
      if (ln>0 && w>0 && h>0){
        var gx = Math.min(ln,a.L*1.3)*S, gy = Math.min(h,a.H*1.3)*S, gz = Math.min(w,a.W*1.3)*S;
        var cargo = makeBox(gx,gy,gz,
          fits ? "rgba(42,165,126,.35)" : "rgba(217,87,59,.32)",
          "1.5px solid " + (fits ? "#2AA57E" : "#D9573B"));
        cargo.style.transform = "translate3d("+(-(cabX-gx)/2+14)+"px,"+((cabY-gy)/2)+"px,0)";
        scene.appendChild(cargo);
      }
      $("hud").innerHTML = "<b>"+a.name+"</b> · "+a.note +
        (ln+w+h>0 ? "<br>груз "+fmt(ln)+" × "+fmt(w)+" × "+fmt(h)+" м · "+fmt(wt)+" т" : "");
      applyRot();
    }
    function applyRot(){
      scene.style.transform = "translate(-50%,-50%) rotateX("+rotX+"deg) rotateY("+rotY+"deg)";
    }
    var stage = $("stage"), dragging = false, px = 0, py = 0;
    stage.addEventListener("pointerdown", function(e){
      dragging = true; autorot = false; px = e.clientX; py = e.clientY;
      stage.setPointerCapture(e.pointerId);
    });
    stage.addEventListener("pointermove", function(e){
      if (!dragging) return;
      rotY += (e.clientX-px)*0.4; rotX -= (e.clientY-py)*0.3;
      rotX = Math.max(-70, Math.min(10, rotX));
      px = e.clientX; py = e.clientY; applyRot();
    });
    stage.addEventListener("pointerup", function(){ dragging = false; });
    stage.addEventListener("pointercancel", function(){ dragging = false; });
    if (!reduced){
      (function spin(){ if (autorot){ rotY += 0.12; applyRot(); } requestAnimationFrame(spin); })();
    }
    function renderVerdicts(){
      var res = $("res");
      if (!res) return;
      var w = val("weight"), l = val("l"), wd = val("w"), h = val("h");
      res.innerHTML = "";
      [
        {n:"Ил-76ТД-90ВД", L:20.0, W:3.45, H:3.4, P:50,  sp:"20,0 × 3,45 × 3,4 м · 50 т"},
        {n:"Ан-124-100",   L:36.5, W:6.4,  H:4.4, P:120, sp:"36,5 × 6,4 × 4,4 м · 120 т"},
        {n:"Ан-124-150",   L:36.5, W:6.4,  H:4.4, P:150, sp:"36,5 × 6,4 × 4,4 м · 150 т"}
      ].forEach(function(a){
        var fits = (l<=a.L)&&(wd<=a.W)&&(h<=a.H)&&(w<=a.P)&&(l+wd+h+w>0);
        var row = document.createElement("div");
        row.className = "rrow" + (fits ? " fit" : "");
        row.innerHTML = '<span class="nm">'+a.n+'<br><span class="sp">'+a.sp+'</span></span>' +
          '<span class="tag '+(fits?'y">влезает':'n">не влезает')+'</span>';
        res.appendChild(row);
      });
    }
    function refresh(){ buildScene(); renderVerdicts(); }
    ["weight","l","w","h"].forEach(function(id){
      var el = $(id); if (el) el.addEventListener("input", refresh);
    });
    document.querySelectorAll(".actab").forEach(function(t){
      t.addEventListener("click", function(){
        curAC = parseInt(this.getAttribute("data-ac"),10);
        document.querySelectorAll(".actab").forEach(function(x){ x.classList.toggle("on", x===t); });
        buildScene();
      });
    });
    refresh();
  }

  /* префилл маршрута из ссылки с карты (request.html?from=..&to=..) */
  (function(){
    var ffrom = $("ffrom"), fto = $("fto");
    if (!ffrom || !fto || !location.search) return;
    try {
      var q = new URLSearchParams(location.search);
      if (q.get("from")) ffrom.value = q.get("from");
      if (q.get("to")) fto.value = q.get("to");
      var fw = $("weight"), qw = parseFloat(q.get("weight"));
      if (fw && qw > 0 && qw <= 200) fw.value = qw;
    } catch(e){}
  })();

  /* ---------- форма заявки (request.html) ---------- */
  var tabs = $("tabs");
  if (tabs){
    function go(n){
      document.querySelectorAll(".panel").forEach(function(p){
        p.classList.toggle("on", p.getAttribute("data-panel") === String(n));
      });
      document.querySelectorAll(".step-tab").forEach(function(t){
        t.classList.toggle("on", t.getAttribute("data-step") === String(n));
      });
      var d = $("done"); if (d) d.classList.remove("on");
    }
    document.querySelectorAll("[data-go]").forEach(function(b){
      b.addEventListener("click", function(){ go(this.getAttribute("data-go")); });
    });
    document.querySelectorAll(".step-tab").forEach(function(t){
      t.addEventListener("click", function(){ go(this.getAttribute("data-step")); });
    });
    var send = $("send");
    if (send) send.addEventListener("click", function(){
      function v(id){ var el = $(id); return el ? (el.value || "—") : "—"; }
      /* проверка: согласие и хотя бы один контакт */
      var ag = $("agree"), agl = $("agreelab");
      if (ag && !ag.checked){ if (agl) agl.classList.add("err"); return; }
      if (agl) agl.classList.remove("err");
      var ph = $("fph"), em = $("fem");
      if (ph && em && !ph.value.trim() && !em.value.trim()){
        ph.style.borderColor = "var(--no)"; em.style.borderColor = "var(--no)";
        ph.focus(); return;
      }
      var num = "VD-" + String(100000 + Math.floor(Math.random()*899999));
      var subject = T.mSubj + num + ": " + v("fn") + ", " + v("fw") + T.mT + ", " + v("ffrom") + " → " + v("fto");
      var body = [
        T.mSite + num,
        "",
        T.mCargo,
        T.mWhat + v("fn"),
        T.mType + v("ft"),
        T.mW + v("fw") + T.mT,
        T.mDims + v("fl") + " × " + v("fwd") + " × " + v("fh") + T.mM,
        "",
        T.mRoute,
        T.mFrom + v("ffrom"),
        T.mTo + v("fto"),
        T.mReady + v("fdate") + " (" + v("fflex") + ")",
        T.mServ + v("fserv"),
        "",
        T.mCont,
        T.mCo + v("fco"),
        T.mName + v("fnm"),
        T.mPh + v("fph"),
        T.mEm + v("fem"),
        "",
        T.mCm + v("fcm")
      ].join("\n");
      /* открываем готовое письмо в почтовой программе */
      window.location.href = "mailto:sales@volga-dnepr.com?subject=" +
        encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
      document.querySelectorAll(".panel").forEach(function(p){ p.classList.remove("on"); });
      var due = new Date(Date.now() + 4*60*60*1000);
      var hh = ("0"+due.getHours()).slice(-2), mm = ("0"+due.getMinutes()).slice(-2);
      $("donebig").textContent = T.due + hh + ":" + mm;
      $("num").textContent = num;
      $("done").classList.add("on");
    });
  }

  /* ---------- фильтр кейсов (cases.html) ---------- */
  var chips = document.querySelectorAll(".chip[data-f]");
  if (chips.length){
    chips.forEach(function(c){
      c.addEventListener("click", function(){
        chips.forEach(function(x){ x.classList.toggle("on", x===c); });
        var f = c.getAttribute("data-f");
        document.querySelectorAll(".case[data-ind]").forEach(function(k){
          k.style.display = (f === "all" || k.getAttribute("data-ind") === f) ? "" : "none";
        });
      });
    });
  }
})();
