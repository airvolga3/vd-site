/* Концепт «Начните с груза». Данные отдельно от разметки: правка содержания не трогает вёрстку.
   Всё помеченное demo:true — демонстрационное, заменить по DATA-REVISION.md. */
var VD = {
  aircraft: [
    { id:"an", name:"Ан-124-100", hold:{L:36.5, W:6.4, H:4.4}, payload:120, cruise:780, range:{full:4800, light:11000} },
    { id:"il", name:"Ил-76ТД-90ВД", hold:{L:20.0, W:3.45, H:3.4}, payload:50, cruise:750, range:{full:4000, light:6700} }
  ],
  presets: [
    { id:"tr",  name:"Трансформатор", L:7.8, W:3.9, H:4.2, M:95 },
    { id:"tu",  name:"Ротор турбины", L:9.1, W:4.2, H:4.0, M:82 },
    { id:"he",  name:"Вертолёт Ми-8", L:18.2, W:2.5, H:4.4, M:12 },
    { id:"dr",  name:"Буровой модуль", L:12.0, W:3.0, H:2.9, M:40 },
    { id:"ge",  name:"Генератор", L:6.0, W:2.4, H:2.6, M:18 }
  ],
  cities: [ /* название, долгота, широта */
    ["Москва",37.6,55.8],["Ульяновск",48.4,54.3],["Казань",49.1,55.8],["Новосибирск",82.9,55.0],["Красноярск",92.9,56.0],
    ["Иркутск",104.3,52.3],["Хабаровск",135.1,48.5],["Владивосток",131.9,43.1],["Магадан",150.8,59.6],["Нижневартовск",76.6,60.9],
    ["Атырау",51.9,47.1],["Ташкент",69.2,41.3],["Алматы",76.9,43.2],["Пекин",116.4,39.9],["Чжэнчжоу",113.6,34.7],
    ["Шанхай",121.5,31.2],["Гонконг",114.2,22.3],["Сеул",126.9,37.5],["Ханой",105.8,21.0],["Дели",77.2,28.6],
    ["Мумбаи",72.9,19.1],["Стамбул",29.0,41.0],["Дубай",55.3,25.2],["Каир",31.2,30.0],["Найроби",36.8,-1.3],
    ["Йоханнесбург",28.0,-26.2],["Лагос",3.4,6.5]
  ],
  windows: [ /* demo: свободные окна бортов и попутные перегоны */
    { d:"29.10", ac:"Ан-124-100", from:"Ульяновск", to:"Шанхай", kind:"leg", cap:"до 110 т", note:"перегон под рейс" },
    { d:"31.10", ac:"Ил-76ТД-90ВД", from:"Красноярск", to:"Чжэнчжоу", kind:"leg", cap:"до 40 т", note:"обратное плечо" },
    { d:"02.11", ac:"Ан-124-100", from:"Ульяновск", to:"по заявке", kind:"win", cap:"борт целиком", note:"окно 3 суток" },
    { d:"04.11", ac:"Ил-76ТД-90ВД", from:"Москва", to:"Ташкент", kind:"leg", cap:"до 35 т", note:"перегон" },
    { d:"06.11", ac:"Ил-76ТД-90ВД", from:"Ульяновск", to:"по заявке", kind:"win", cap:"борт целиком", note:"окно 2 суток" },
    { d:"09.11", ac:"Ан-124-100", from:"Дубай", to:"Ульяновск", kind:"leg", cap:"до 100 т", note:"возврат в базу" }
  ]
};

(function(){
  "use strict";
  var NS = "http://www.w3.org/2000/svg";
  function $(s,r){ return (r||document).querySelector(s); }
  function $$(s,r){ return Array.prototype.slice.call((r||document).querySelectorAll(s)); }
  function el(t,a,txt){ var e=document.createElementNS(NS,t); for(var k in a) e.setAttribute(k,a[k]); if(txt!=null) e.textContent=txt; return e; }
  function fmt(n,d){ return (d==null?String(n):n.toFixed(d)).replace(".",","); }
  function css(v){ return getComputedStyle(document.documentElement).getPropertyValue(v).trim(); }
  function store(k,v){ try{ if(v===undefined){ var s=sessionStorage.getItem(k); return s?JSON.parse(s):null; } sessionStorage.setItem(k,JSON.stringify(v)); }catch(e){ return null; } }

  /* меню на телефоне */
  var bg=$("#burger"), mn=$("#mnav");
  if(bg&&mn) bg.addEventListener("click",function(){ var o=mn.classList.toggle("open"); bg.setAttribute("aria-expanded",o); });

  /* ── Профили бортов, метры: x от носа, y от земли. Схема, не чертёж ── */
  var PLANES = {
    an:{ L:69.1, Hh:20.8, hold:{x:8.5,y:1.9},
      body:"M0,4.6 C0,7.6 3,9.6 9,9.8 L54,9.8 C60,9.8 66,9.9 69.1,9.6 L69.1,8.8 C64,7.8 56,3.5 50,1.4 L7,1.4 C3,1.4 0,2.6 0,4.6 Z",
      fin:"M54.5,9.8 L62,20.8 L66.6,20.8 L69.1,9.6 Z",
      stab:"M57,10.1 L68.8,10.7 L69.1,9.9 L57,9.8 Z",
      wing:"M21,9.8 C25,11.1 37,11.1 43,9.8 Z",
      eng:[[24.5,7.4,3.7,1.3],[30.5,8.1,3.7,1.3]],
      pyl:[[25.5,8.5,27.5,9.9],[31.5,9.2,33.5,10.4]],
      wheels:[6.6,8.0,23,25.4,27.8,30.2,32.6,35,37.4,39.8], wr:.62,
      glass:"M3.2,8.2 L6.6,9.2 L6.6,8.5 L3.6,7.7 Z" },
    il:{ L:46.6, Hh:14.8, hold:{x:8,y:1.9},
      body:"M0,3.4 C0,5.3 2,6.6 6,6.7 L33,6.7 C38,6.8 43,7.6 46.6,8.2 L46.6,7.4 C41,6.4 36,3.2 31,1.4 L5,1.4 C2,1.4 0,2.2 0,3.4 Z",
      fin:"M36.5,6.9 L42.6,14.5 L45.9,14.5 L46.4,7.9 Z",
      stab:"M40.2,14.9 L46.6,14.9 L46.6,14.3 L40.8,14.2 Z",
      wing:"M14.5,6.7 C18,7.7 25,7.7 28.5,6.7 Z",
      eng:[[15.6,4.9,2.4,.85],[20.4,5.5,2.4,.85]],
      pyl:[[16.5,5.6,17.5,6.8],[21.3,6.2,22.3,7.0]],
      wheels:[5.8,17.6,19.2,20.8,22.4,24], wr:.55,
      glass:"M0.4,2.4 C0.8,1.8 1.8,1.6 2.6,1.7 L2.6,3.0 L0.3,3.1 Z" }
  };

  function drawPlane(g, id, ox, oy, s, cargo, fits){
    var p=PLANES[id], ac=VD.aircraft.filter(function(a){return a.id===id;})[0];
    var ink=css("--ink"), faint=css("--faint"), line=css("--line-2"), sheet=css("--sheet");
    var col=fits?css("--ok"):css("--no");
    var T="translate("+ox+","+oy+") scale("+s+",-"+s+")";
    var grp=el("g",{transform:T});
    var sw=1.4/s;
    grp.appendChild(el("path",{d:p.fin,fill:sheet,stroke:ink,"stroke-width":sw}));
    grp.appendChild(el("path",{d:p.body,fill:sheet,stroke:ink,"stroke-width":sw}));
    grp.appendChild(el("path",{d:p.stab,fill:sheet,stroke:ink,"stroke-width":sw}));
    grp.appendChild(el("path",{d:p.wing,fill:sheet,stroke:ink,"stroke-width":sw}));
    p.pyl.forEach(function(q){ grp.appendChild(el("line",{x1:q[0],y1:q[1],x2:q[2],y2:q[3],stroke:ink,"stroke-width":sw})); });
    p.eng.forEach(function(e){ grp.appendChild(el("ellipse",{cx:e[0],cy:e[1],rx:e[2],ry:e[3],fill:sheet,stroke:ink,"stroke-width":sw}));
      grp.appendChild(el("line",{x1:e[0]-e[2]+.5,y1:e[1]-e[3]+.25,x2:e[0]-e[2]+.5,y2:e[1]+e[3]-.25,stroke:ink,"stroke-width":sw*.7})); });
    grp.appendChild(el("path",{d:p.glass,fill:ink,"fill-opacity":.75}));
    p.wheels.forEach(function(x){ grp.appendChild(el("circle",{cx:x,cy:p.wr,r:p.wr,fill:ink})); });
    grp.appendChild(el("line",{x1:-2,y1:0,x2:p.L+2,y2:0,stroke:line,"stroke-width":sw}));
    /* кабина */
    var h=ac.hold, hx=p.hold.x, hy=p.hold.y;
    grp.appendChild(el("rect",{x:hx,y:hy,width:h.L,height:h.H,fill:css("--vd-soft"),stroke:css("--draw"),"stroke-width":sw,"stroke-dasharray":(4/s)+" "+(3/s)}));
    /* груз */
    if(cargo.L&&cargo.H){
      var cl=Math.min(cargo.L,h.L*1.15), chh=Math.min(cargo.H,h.H*1.6);
      grp.appendChild(el("rect",{x:hx+(h.L-cl)/2,y:hy,width:cl,height:chh,fill:col,"fill-opacity":.28,stroke:col,"stroke-width":sw*1.3,"stroke-dasharray":fits?"":(5/s)+" "+(3/s)}));
    }
    g.appendChild(grp);
    /* подписи в экранных координатах */
    var mono=css("--mono")||"monospace";
    var tt=el("text",{x:ox,y:oy-p.Hh*s+8,fill:ink,"font-size":16,"font-weight":700,"font-family":"Golos Text, sans-serif"},ac.name);
    g.appendChild(tt);
    g.appendChild(el("text",{x:ox,y:oy-p.Hh*s+28,fill:css("--draw"),"font-size":12,"font-family":mono},"кабина "+fmt(h.L)+" × "+fmt(h.W)+" × "+fmt(h.H)+" м · до "+ac.payload+" т"));
    /* размерная линия всей длины */
    var dy=oy+14;
    g.appendChild(el("line",{x1:ox,y1:dy,x2:ox+p.L*s,y2:dy,stroke:faint,"stroke-width":1}));
    [ox,ox+p.L*s].forEach(function(x){ g.appendChild(el("line",{x1:x,y1:dy-4,x2:x,y2:dy+4,stroke:faint,"stroke-width":1})); });
    g.appendChild(el("text",{x:ox+p.L*s/2,y:dy+14,fill:faint,"font-size":11,"text-anchor":"middle","font-family":mono},fmt(p.L)+" м"));
  }

  function section(svg, id, cargo, fits){
    var ac=VD.aircraft.filter(function(a){return a.id===id;})[0], h=ac.hold;
    while(svg.firstChild) svg.removeChild(svg.firstChild);
    var s=16, W=7.2*s+20, H=7*s;
    svg.setAttribute("viewBox","0 0 "+W+" "+H);
    var ox=10+(7.2-h.W)*s/2, base=H-14;
    svg.appendChild(el("rect",{x:ox,y:base-h.H*s,width:h.W*s,height:h.H*s,fill:css("--vd-soft"),stroke:css("--draw"),"stroke-width":1.4,rx:id==="an"?6:4}));
    if(cargo.W&&cargo.H){ var col=fits?css("--ok"):css("--no");
      var cw=Math.min(cargo.W,7.2), ch=Math.min(cargo.H,6.8);
      svg.appendChild(el("rect",{x:10+(7.2-cw)*s/2,y:base-ch*s,width:cw*s,height:ch*s,fill:col,"fill-opacity":.28,stroke:col,"stroke-width":1.6,"stroke-dasharray":fits?"":"5 3"})); }
    svg.appendChild(el("line",{x1:4,y1:base,x2:W-4,y2:base,stroke:css("--ink"),"stroke-width":1.4}));
    svg.appendChild(el("text",{x:W/2,y:H-2,fill:css("--faint"),"font-size":10,"text-anchor":"middle","font-family":css("--mono")},"сечение "+fmt(h.W)+" × "+fmt(h.H)));
  }

  function dist(a,b){
    var R=6371, r=Math.PI/180, la1=a[2]*r, la2=b[2]*r, dl=(b[1]-a[1])*r;
    return R*Math.acos(Math.min(1,Math.sin(la1)*Math.sin(la2)+Math.cos(la1)*Math.cos(la2)*Math.cos(dl)));
  }

  /* ── Примерка на главной ── */
  var fit=$("#fit");
  if(fit){
    var F={L:$("#cL"),W:$("#cW"),H:$("#cH"),M:$("#cM"),from:$("#cFrom"),to:$("#cTo")};
    var chips=$("#presets");
    VD.presets.forEach(function(p,i){ var b=document.createElement("button"); b.type="button"; b.textContent=p.name; b.dataset.i=i; b.setAttribute("aria-pressed",i===0); chips.appendChild(b); });
    [F.from,F.to].forEach(function(sel,j){ VD.cities.forEach(function(c,i){ var o=document.createElement("option"); o.value=i; o.textContent=c[0]; sel.appendChild(o); }); });
    F.from.value=String(VD.cities.findIndex(function(c){return c[0]==="Шанхай";}));
    F.to.value=String(VD.cities.findIndex(function(c){return c[0]==="Хабаровск";}));
    function setPreset(i){ var p=VD.presets[i]; F.L.value=p.L; F.W.value=p.W; F.H.value=p.H; F.M.value=p.M;
      $$("button",chips).forEach(function(b){ b.setAttribute("aria-pressed",String(b.dataset.i==i)); }); run(); }
    chips.addEventListener("click",function(e){ var b=e.target.closest("button"); if(b) setPreset(+b.dataset.i); });
    ["L","W","H","M"].forEach(function(k){ F[k].addEventListener("input",function(){ $$("button",chips).forEach(function(b){ b.setAttribute("aria-pressed","false"); }); run(); }); });
    [F.from,F.to].forEach(function(s){ s.addEventListener("change",run); });

    function num(i){ var v=parseFloat(String(i.value).replace(",",".")); return isFinite(v)&&v>0?v:0; }
    function run(){
      var c={L:num(F.L),W:num(F.W),H:num(F.H),M:num(F.M)};
      var a=VD.cities[+F.from.value], b=VD.cities[+F.to.value], d=(a&&b&&a!==b)?dist(a,b):0;
      var svg=$("#planes"); while(svg.firstChild) svg.removeChild(svg.firstChild);
      var s=13.2, res={};
      VD.aircraft.forEach(function(ac){
        var h=ac.hold, dims=c.L<=h.L&&c.W<=h.W&&c.H<=h.H, mass=c.M<=ac.payload;
        res[ac.id]={ok:dims&&mass, why:[].concat(c.L>h.L?["длина"]:[],c.W>h.W?["ширина"]:[],c.H>h.H?["высота"]:[],mass?[]:["масса"])};
        var rng=ac.range.full+(ac.range.light-ac.range.full)*Math.max(0,1-c.M/ac.payload);
        res[ac.id].stops=d?Math.max(0,Math.ceil(d/rng)-1):0;
        res[ac.id].time=d?d/ac.cruise+res[ac.id].stops*2.5:0;
      });
      drawPlane(svg,"an",20,300,s,c,res.an.ok);
      drawPlane(svg,"il",20,560,s,c,res.il.ok);
      VD.aircraft.forEach(function(ac){
        var r=res[ac.id], card=$("#v-"+ac.id);
        section($("svg",card),ac.id,c,r.ok);
        $(".chip",card).className="chip "+(r.ok?"ok":"no");
        $(".chip",card).textContent=r.ok?"входит":"не входит";
        $(".why",card).textContent=r.ok?("запас: "+fmt(ac.hold.H-c.H,1)+" м по высоте, "+fmt(ac.payload-c.M)+" т по массе"):("мешает: "+r.why.join(", "));
        $(".fly",card).textContent=d?("≈ "+fmt(r.time,1)+" ч"+(r.stops?", посадок: "+r.stops:", без посадок")):"—";
      });
      $("#dist").textContent=d?(Math.round(d/10)*10).toLocaleString("ru-RU")+" км":"—";
      var best=res.il.ok?"Ил-76ТД-90ВД":(res.an.ok?"Ан-124-100":"");
      $("#best").textContent=best||"нужна проработка ЦГП";
      $("#nextTxt").textContent=best?("Подходит "+best+". Отправьте эти параметры, и менеджер вернётся со ставкой и окном борта за 4 рабочих часа."):"Груз больше стандартной кабины. Такие задачи мы решаем разборкой, спецоснасткой или двумя рейсами: инженер ЦГП посмотрит чертёж.";
      store("vdq",{L:c.L,W:c.W,H:c.H,M:c.M,from:a?a[0]:"",to:b?b[0]:"",best:best,src:"примерка на главной"});
    }
    setPreset(0);
    try{ new MutationObserver(run).observe(document.documentElement,{attributes:true,attributeFilter:["data-theme"]}); }catch(e){}
  }

  /* живая строка на первом экране */
  var tw=$("#tkWin"), tl=$("#tkLeg");
  if(tw){ var w1=VD.windows.filter(function(w){return w.kind==="win";})[0], l1=VD.windows.filter(function(w){return w.kind==="leg";})[0];
    if(w1) tw.textContent=w1.d+" · "+w1.ac+" · "+w1.from; if(l1) tl.textContent=l1.d+" · "+l1.from+" → "+l1.to; }

  /* ── Окна бортов ── */
  var board=$("#board");
  if(board){
    function render(kind){
      board.innerHTML="";
      VD.windows.filter(function(w){ return kind==="all"||w.kind===kind; }).forEach(function(w,i){
        var tr=document.createElement("tr");
        tr.innerHTML='<td class="num">'+w.d+'</td><td>'+w.ac+'</td><td class="rt">'+w.from+' → '+w.to+'</td>'+
          '<td><span class="tag '+w.kind+'">'+(w.kind==="leg"?"попутный рейс":"свободное окно")+'</span></td>'+
          '<td class="num">'+w.cap+'</td><td style="color:var(--ink-2)">'+w.note+'</td>'+
          '<td><a class="btn sm line" href="request.html" data-w="'+VD.windows.indexOf(w)+'">Взять груз</a></td>';
        board.appendChild(tr);
      });
    }
    render("all");
    $$("#bfilter button").forEach(function(b){ b.addEventListener("click",function(){
      $$("#bfilter button").forEach(function(x){ x.setAttribute("aria-pressed",String(x===b)); }); render(b.dataset.k); }); });
    board.addEventListener("click",function(e){ var a=e.target.closest("a[data-w]"); if(!a) return;
      var w=VD.windows[+a.dataset.w]; store("vdq",{from:w.from,to:w.to==="по заявке"?"":w.to,src:"окно "+w.d+" · "+w.ac,ac:w.ac}); });
  }

  /* быстрые ссылки, которые задают тип заявки */
  $$("a[data-kind]").forEach(function(a){ a.addEventListener("click",function(){ var q=store("vdq")||{}; q.kind=a.dataset.kind; q.src=a.dataset.src||q.src; store("vdq",q); }); });

  /* ── Заявка ── */
  var rf=$("#rform");
  if(rf){
    var q=store("vdq")||{}, step=0, steps=$$("fieldset",rf), marks=$$(".stepper div");
    var cs=$("#rFrom"), ct=$("#rTo");
    [cs,ct].forEach(function(sel){ VD.cities.forEach(function(c){ var o=document.createElement("option"); o.value=c[0]; o.textContent=c[0]; sel.appendChild(o); });
      var o=document.createElement("option"); o.value="другое"; o.textContent="Другой город"; sel.appendChild(o); });
    if(q.L) $("#rL").value=q.L; if(q.W) $("#rW").value=q.W; if(q.H) $("#rH").value=q.H; if(q.M) $("#rM").value=q.M;
    if(q.from) cs.value=q.from; if(q.to) ct.value=q.to;
    if(q.kind) $("#rKind").value=q.kind;
    if(q.src){ $("#srcNote").hidden=false; $("#srcTxt").textContent=q.src+(q.best?" · подходит "+q.best:""); }
    function show(i){ step=i; steps.forEach(function(f,j){ f.hidden=j!==i; });
      marks.forEach(function(m,j){ m.className=j<i?"done":(j===i?"on":""); }); window.scrollTo({top:rf.offsetTop-90,behavior:"smooth"}); }
    function valid(i){ var ok=true; $$("[required]",steps[i]).forEach(function(x){ if(x.type==="checkbox"?!x.checked:!x.value.trim()){ ok=false; x.setAttribute("aria-invalid","true"); } else x.removeAttribute("aria-invalid"); });
      $(".err",steps[i]).hidden=ok; return ok; }
    $$("[data-next]",rf).forEach(function(b){ b.addEventListener("click",function(){ if(valid(step)) show(step+1); }); });
    $$("[data-prev]",rf).forEach(function(b){ b.addEventListener("click",function(){ show(step-1); }); });
    var drop=$("#drop"), file=$("#rFile");
    drop.addEventListener("click",function(){ file.click(); });
    drop.addEventListener("keydown",function(e){ if(e.key==="Enter"||e.key===" "){ e.preventDefault(); file.click(); } });
    file.addEventListener("change",function(){ if(file.files.length){ drop.classList.add("has"); drop.textContent="Приложено: "+Array.prototype.map.call(file.files,function(f){return f.name;}).join(", "); } });
    rf.addEventListener("submit",function(e){ e.preventDefault(); if(!valid(2)) return;
      var now=new Date(), due=new Date(now), h=now.getHours();
      /* 4 рабочих часа: 9:00–18:00 пн–пт */
      var left=4*60; if(due.getDay()===0||due.getDay()===6||h>=18){ do{ due.setDate(due.getDate()+1); }while(due.getDay()===0||due.getDay()===6); due.setHours(9,0,0,0); }
      else if(h<9) due.setHours(9,0,0,0);
      var endDay=new Date(due); endDay.setHours(18,0,0,0); var room=(endDay-due)/60000;
      if(left<=room) due=new Date(due.getTime()+left*60000);
      else { left-=room; do{ due.setDate(due.getDate()+1); }while(due.getDay()===0||due.getDay()===6); due.setHours(9,0,0,0); due=new Date(due.getTime()+left*60000); }
      var p2=function(n){ return (n<10?"0":"")+n; };
      var no="ВД-"+String(now.getFullYear()).slice(2)+p2(now.getMonth()+1)+p2(now.getDate())+"-"+(100+Math.floor(Math.random()*900));
      var kind=$("#rKind").value;
      var who={charter:"Менеджер чартерных перевозок",regular:"Менеджер регулярных перевозок",back:"Менеджер регулярных перевозок · Китай",agent:"Менеджер по работе с агентами"}[kind]||"Менеджер чартерных перевозок";
      $("#dNo").textContent=no; $("#dWho").textContent=who;
      $("#dDue").textContent=p2(due.getDate())+"."+p2(due.getMonth()+1)+" до "+p2(due.getHours())+":"+p2(due.getMinutes());
      $("#dNow").textContent=p2(now.getHours())+":"+p2(now.getMinutes());
      $("#dSum").textContent=[$("#rWhat").value||"груз", ($("#rM").value?$("#rM").value+" т":""), ($("#rL").value?[$("#rL").value,$("#rW").value,$("#rH").value].join(" × ")+" м":""), cs.value+" → "+ct.value].filter(Boolean).join(" · ");
      rf.hidden=true; $(".stepper").hidden=true; $("#done").hidden=false; window.scrollTo({top:0,behavior:"smooth"});
    });
    show(0); window.scrollTo(0,0);
  }
})();
