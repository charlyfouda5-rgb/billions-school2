/* DELTA SCHOOL V22 — scoring transparent 0–20, recherche géolocalisée et classement local. */
(function(){
"use strict";
function arr(){S.schools=S.schools||[];S.reps=S.reps||[];S.priorityLog=S.priorityLog||[];}
function escp(x){return typeof esc==="function"?esc(String(x==null?"":x)):String(x||"");}
function norm(x){return String(x||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();}
function num(x){x=Number(x);return isFinite(x)?Math.max(0,Math.min(100,x)):0;}
function points(o,kind){
 var f=kind==="school"?(o.performance||{}):(o.performance||{});
 /* Les quatre indicateurs sont saisis/validés par le super administrateur à partir des données vérifiées. */
 var vals=[num(f.results),num(f.attendance),num(f.satisfaction),num(f.reliability)];
 var p=Math.round((vals[0]*.35+vals[1]*.25+vals[2]*.20+vals[3]*.20)/5);
 return Math.max(0,Math.min(20,p));
}
function refresh(){
 arr(); var changed=false;
 S.schools.forEach(function(x){var p=points(x,"school");if(x.priorityPoints!==p){x.priorityPoints=p;x.priorityUpdated=new Date().toISOString();changed=true;}});
 S.reps.forEach(function(x){var p=points(x,"rep");if(x.priorityPoints!==p){x.priorityPoints=p;x.priorityUpdated=new Date().toISOString();changed=true;}});
 if(changed&&typeof save==="function")save();
}
function isSuper(){return typeof me!=="undefined"&&me&&me.role==="super";}
function eligibleSchool(s){return s.status!=="bloque"&&s.status!=="suspendu";}
function eligibleRep(r){return r.status==="actif"&&(!window.daysLeft||daysLeft(r.exp)>=0);}
function loc(o){return [o.quartier,o.ville,o.region,o.country].filter(Boolean).join(", ");}
function dist(a,b){var R=6371,rad=Math.PI/180,d1=(b.lat-a.lat)*rad,d2=(b.lon-a.lon)*rad,x=Math.sin(d1/2)**2+Math.cos(a.lat*rad)*Math.cos(b.lat*rad)*Math.sin(d2/2)**2;return 2*R*Math.asin(Math.sqrt(x));}
function scoreCard(o,type,d){return '<div class="card"><div class="row"><b>'+escp(o.name||((o.prenom||"")+" "+(o.nom||"")) )+'</b><span class="tag">⭐ '+(o.priorityPoints||0)+'/20</span></div><div class="mu">'+escp(loc(o)||o.country||"Localisation non renseignée")+(d!=null?' · '+d.toFixed(1)+' km':'')+'</div><div class="bar"><i style="width:'+((o.priorityPoints||0)*5)+'%"></i></div><div class="mu">Priorité calculée selon résultats, assiduité, satisfaction et fiabilité.</div></div>';}
function priorityView(){
 refresh();
 var h='<h2>🏆 Priorité & performances</h2><div class="sim">Barème automatique de 0 à 20. Les points sont calculés à partir de quatre indicateurs vérifiés (résultats 35 %, assiduité 25 %, satisfaction 20 %, fiabilité 20 %). Ils servent au classement et à de futures récompenses ; ils ne garantissent pas une récompense.</div>';
 h+='<h3>Établissements</h3>';
 S.schools.slice().sort(function(a,b){return (b.priorityPoints||0)-(a.priorityPoints||0)}).forEach(function(o){
 var f=o.performance||{};
 h+='<div class="card"><b>'+escp(o.name)+'</b> <span class="tag">'+(o.priorityPoints||0)+'/20 points</span><div class="mu">'+escp(loc(o)||o.country)+'</div>'+
 ['results','attendance','satisfaction','reliability'].map(function(k,i){return '<label>'+['Résultats scolaires','Assiduité','Satisfaction','Fiabilité administrative'][i]+' (%)</label><input type="number" min="0" max="100" id="sp_'+o.id+'_'+k+'" value="'+(f[k]==null?0:f[k])+'">'}).join("")+
 '<label>Latitude</label><input id="slat_'+o.id+'" type="number" step="any" value="'+(o.lat==null?"":o.lat)+'" placeholder="Latitude"><label>Longitude</label><input id="slon_'+o.id+'" type="number" step="any" value="'+(o.lon==null?"":o.lon)+'" placeholder="Longitude"><button onclick="saveSchoolPriority('+o.id+')">Enregistrer les indicateurs et la position</button></div>';
 });
 h+='<h3>Répétiteurs</h3>';
 S.reps.slice().sort(function(a,b){return (b.priorityPoints||0)-(a.priorityPoints||0)}).forEach(function(o){
 var f=o.performance||{},u=uid(o.uid)||{};
 h+='<div class="card"><b>'+escp((o.prenom||"")+" "+(o.nom||u.name||""))+'</b> <span class="tag">'+(o.priorityPoints||0)+'/20</span><div class="mu">'+escp(loc(o))+'</div>'+
 ['results','attendance','satisfaction','reliability'].map(function(k,i){return '<label>'+['Progression des élèves','Assiduité aux séances','Avis vérifiés','Fiabilité / respect des engagements'][i]+' (%)</label><input type="number" min="0" max="100" id="rp_'+o.id+'_'+k+'" value="'+(f[k]==null?0:f[k])+'">'}).join("")+
 '<label>Latitude</label><input type="number" step="any" id="rlat_'+o.id+'" value="'+(o.lat==null?"":o.lat)+'"><label>Longitude</label><input type="number" step="any" id="rlon_'+o.id+'" value="'+(o.lon==null?"":o.lon)+'"><button onclick="saveRepPriority('+o.id+')">Enregistrer et recalculer</button></div>';
 });
 return h;
}
window.saveSchoolPriority=function(id){if(!isSuper())return;var o=S.schools.find(function(x){return x.id==id});if(!o)return;o.performance={};["results","attendance","satisfaction","reliability"].forEach(function(k){o.performance[k]=num(document.getElementById("sp_"+id+"_"+k).value)});var a=document.getElementById("slat_"+id).value,b=document.getElementById("slon_"+id).value;o.lat=a===""?null:Number(a);o.lon=b===""?null:Number(b);refresh();S.priorityLog.push({type:"school",id:id,points:o.priorityPoints,at:new Date().toISOString()});save();render();};
window.saveRepPriority=function(id){if(!isSuper())return;var o=S.reps.find(function(x){return x.id==id});if(!o)return;o.performance={};["results","attendance","satisfaction","reliability"].forEach(function(k){o.performance[k]=num(document.getElementById("rp_"+id+"_"+k).value)});var a=document.getElementById("rlat_"+id).value,b=document.getElementById("rlon_"+id).value;o.lat=a===""?null:Number(a);o.lon=b===""?null:Number(b);refresh();S.priorityLog.push({type:"rep",id:id,points:o.priorityPoints,at:new Date().toISOString()});save();render();};
var userPos=null, searchState={kind:"school",city:"",level:"",subject:"",max:25,near:false};
window.findBestNear=function(){var k=document.getElementById("best_kind").value,city=document.getElementById("best_city").value,level=document.getElementById("best_level").value,subject=document.getElementById("best_subject").value,max=Number(document.getElementById("best_max").value)||25,near=document.getElementById("best_near").checked;searchState={kind:k,city:city,level:level,subject:subject,max:max,near:near};if(near&&navigator.geolocation){navigator.geolocation.getCurrentPosition(function(p){userPos={lat:p.coords.latitude,lon:p.coords.longitude};render();},function(){userPos=null;alert("Position indisponible. Vous pouvez rechercher par ville ou quartier.");render();},{enableHighAccuracy:true,timeout:12000});}else{userPos=null;render();}};
function discovery(){
 refresh();var q=searchState, h='<h2>🔎 Trouver les meilleurs '+(q.kind==="school"?"établissements":"répétiteurs")+'</h2><div class="card"><label>Que recherchez-vous ?</label><select id="best_kind"><option value="school" '+(q.kind==="school"?"selected":"")+'>Établissements</option><option value="rep" '+(q.kind==="rep"?"selected":"")+'>Répétiteurs</option></select><label>Ville, région ou quartier</label><input id="best_city" value="'+escp(q.city)+'" placeholder="Ex. Yaoundé, Mvan"><label>Niveau / classe</label><input id="best_level" value="'+escp(q.level)+'" placeholder="Ex. collège, 3e, terminale"><label>Matière (pour répétiteur)</label><input id="best_subject" value="'+escp(q.subject)+'" placeholder="Ex. mathématiques"><label>Distance maximale (km)</label><input id="best_max" type="number" min="1" value="'+q.max+'"><label><input id="best_near" type="checkbox" style="width:auto" '+(q.near?"checked":"")+'> Me localiser pour classer les résultats par proximité</label><button onclick="findBestNear()">Rechercher</button></div>';
 var list=q.kind==="school"?S.schools.filter(eligibleSchool):S.reps.filter(eligibleRep);
 list=list.filter(function(o){var area=norm(loc(o)+" "+(o.country||""));if(q.city&&!area.includes(norm(q.city)))return false;if(q.level&&q.kind==="school"&&!norm((o.levels||"")+" "+(o.name||"")).includes(norm(q.level)))return false;if(q.subject&&q.kind==="rep"&&!norm([o.m1,o.m2,o.niveau,o.all?"toutes matieres":""].join(" ")).includes(norm(q.subject)))return false;return true;});
 list=list.map(function(o){var d=null;if(userPos&&o.lat!=null&&o.lon!=null)d=dist(userPos,{lat:Number(o.lat),lon:Number(o.lon)});return{o:o,d:d};});
 if(userPos)list=list.filter(function(x){return x.d==null||x.d<=q.max;}).sort(function(a,b){if(a.d==null)return 1;if(b.d==null)return -1;return (b.o.priorityPoints||0)-(a.o.priorityPoints||0)||a.d-b.d;});
 else list.sort(function(a,b){return (b.o.priorityPoints||0)-(a.o.priorityPoints||0);});
 h+='<div class="mu">Classement prioritaire : points de performance sur 20'+(userPos?' puis distance géographique':'')+'. Les résultats sans coordonnées restent affichés après les établissements localisés.</div>';
 h+=list.length?list.map(function(x){var o=x.o;if(q.kind==="school"){var copy=Object.assign({},o,{name:o.name});return scoreCard(copy,"school",x.d);}var copy=Object.assign({},o,{name:(o.prenom||"")+" "+(o.nom||"")});return scoreCard(copy,"rep",x.d);}).join(""):'<div class="card mu">Aucun résultat correspondant. Élargissez la zone ou modifiez vos critères.</div>';
 return h;
}
var oldTabs=window.tabsOf;
window.tabsOf=function(){var t=oldTabs.apply(this,arguments);if(me&&me.role==="super")t.splice(Math.max(1,t.length-1),0,["priority","🏆","Classements & points"]);if(me&&(me.role==="parent"||me.role==="eleve"))t.splice(Math.max(0,t.length-1),0,["best","🔎","Meilleurs établissements"]);return t;};
var oldRender=window.render;
window.render=function(){arr();refresh();if(me&&((me.role==="super"&&tab==="priority")||((me.role==="parent"||me.role==="eleve")&&tab==="best"))){document.body.className="in";var h=head(),n=navbar(tabsOf());h+='<div class="sb">'+n+'</div><div class="mn">'+(tab==="priority"?priorityView():discovery())+'</div>';R(h);return;}return oldRender.apply(this,arguments);};
window.deltaRefreshPriority=refresh;
})();
