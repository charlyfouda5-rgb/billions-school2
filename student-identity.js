/* DELTA SCHOOL V26 — ISII et règles de visibilité par rôle.
   L'identifiant est créé côté client en attendant l'API serveur transactionnelle.
   La garantie mondiale d'unicité exige la migration SQL et un endpoint serveur. */
(function(){
  'use strict';
  function escI(x){return typeof esc==='function'?esc(String(x==null?'':x)):String(x==null?'':x).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
  function list(k){if(!Array.isArray(S[k]))S[k]=[];return S[k]}
  function makeId(){var b=new Uint8Array(16);if(window.crypto&&crypto.getRandomValues)crypto.getRandomValues(b);else for(var i=0;i<16;i++)b[i]=Math.floor(Math.random()*256);return 'DS-GLOBAL-'+Array.from(b).map(function(x){return x.toString(16).padStart(2,'0')}).join('').toUpperCase()}
  function ensure(u){if(!u||u.role!=='eleve')return '';if(!u.isii){u.isii=makeId();list('studentIdentityAudit').push({student:u.id,action:'ISII créé',at:new Date().toISOString()});}return u.isii}
  function children(){var ids=(S.parentChildren||S.parent_children||[]).filter(function(x){return x.parent==me.id||x.parentId==me.id||x.parent_id==me.id}).map(function(x){return x.student||x.child||x.childId||x.child_id});return (S.users||[]).filter(function(u){return u.role==='eleve'&&(u.parent==me.id||u.parentId==me.id||ids.indexOf(u.id)>=0)})}
  function allowed(u){if(!me||!u||u.role!=='eleve')return false;if(me.role==='super')return true;if(me.role==='eleve')return u.id==me.id;if(me.role==='parent')return children().some(function(x){return x.id==u.id});if(me.role==='chef')return u.school==me.school;return false}
  function rows(){var a=(S.users||[]).filter(function(u){return u.role==='eleve'&&allowed(u)});return a.map(function(u){return {u:u,id:ensure(u)}})}
  function view(){if(!me)return '';var a=rows();if(me.role==='prof'||me.role==='comptable'||me.role==='censeur'||me.role==='repetiteur')return '<h2>Identité scolaire</h2><div class="card">L’ISII n’est pas accessible à ce rôle sans autorisation spécifique.</div>';
    if(me.role==='eleve'||me.role==='parent')return '<h2>🌍 Identité scolaire internationale</h2><div class="card"><div class="mu">Identifiant confidentiel : visible uniquement par vous et les personnes légalement autorisées.</div>'+ (a.map(function(x){return '<div class="row"><b>'+escI(x.u.name)+'</b><code>'+escI(x.id)+'</code></div>'}).join('')||'Aucun dossier élève associé.')+'</div>';
    return '<h2>🌍 Registre des identités scolaires internationales</h2><div class="card"><div class="mu">Le super administrateur peut consulter les ISII de tous les élèves enregistrés dans les données auxquelles la plateforme est connectée. Chaque consultation est journalisée localement.</div><input id="isiiq" placeholder="Rechercher nom ou ISII" oninput="dsISearch()"><div id="isiilist">'+a.slice(0,100).map(function(x){return row(x)}).join('')+'</div><div class="mu">'+a.length+' élève(s) accessible(s).</div></div>';
  }
  function row(x){return '<div class="row"><span><b>'+escI(x.u.name)+'</b><div class="mu">'+escI(x.u.matricule||'Matricule non renseigné')+' · '+escI(x.u.code||'Suivi non renseigné')+'</div><code>'+escI(x.id)+'</code></span><button onclick="dsIView('+Number(x.u.id)+')">Consulter</button></div>'}
  window.dsISearch=function(){var el=document.getElementById('isiiq'),out=document.getElementById('isiilist');if(!el||!out)return;var q=el.value.toLowerCase();out.innerHTML=rows().filter(function(x){return (String(x.u.name||'')+' '+x.id).toLowerCase().indexOf(q)>=0}).slice(0,200).map(row).join('')||'Aucun résultat.';};
  window.dsIView=function(id){var u=(S.users||[]).filter(function(x){return x.id==id})[0];if(!allowed(u))return alert('Accès refusé.');list('studentIdentityAudit').push({student:u.id,viewer:me.id,role:me.role,action:'Consultation ISII',at:new Date().toISOString()});save();alert('Élève : '+u.name+'\nISII : '+ensure(u)+'\nMatricule : '+(u.matricule||'—')+'\nCode de suivi : '+(u.code||'—'));};
  var oldTabs=window.tabsOf;if(typeof oldTabs==='function'){window.tabsOf=function(){var t=oldTabs.apply(this,arguments)||[];if(me&&['super','chef','parent','eleve'].indexOf(me.role)>=0&&!t.some(function(x){return x[0]==='isii'}))t.push(['isii','🌍','Identité internationale']);return t;};}
  window.VIEWS=window.VIEWS||{};VIEWS.isii=view;
  // Génération initiale pour les élèves déjà présents dans l'état chargé.
  (S.users||[]).forEach(function(u){if(u.role==='eleve')ensure(u)});
})();
