/* DELTA SCHOOL V34 — Recherche par ISII et demande d'accès inter-établissements.
 * Interface de référence : les contrôles définitifs doivent être exécutés par l'API Neon.
 */
(function(){'use strict';
 function arr(k){if(!Array.isArray(S[k]))S[k]=[];return S[k]}
 function esc34(x){return typeof esc==='function'?esc(String(x==null?'':x)):String(x==null?'':x).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
 function isSchoolRole(){return me&&['super','chef'].indexOf(me.role)>=0}
 function schoolName(id){var s=(S.schools||[]).filter(function(x){return String(x.id)===String(id)})[0];return s?s.name||s.nom||String(id):String(id||'Non renseigné')}
 function ownSchool(u){return me.role==='super'||String(u.school)===String(me.school)}
 function grants(){return arr('isiiAccessGrantsV34')}
 function requests(){return arr('isiiAccessRequestsV34')}
 function canSee(u){if(!u)return false;if(me.role==='super'||String(u.school)===String(me.school))return true;return grants().some(function(g){return String(g.studentId)===String(u.id)&&String(g.schoolId)===String(me.school)&&g.status==='approved'&&(!g.expiresAt||new Date(g.expiresAt)>new Date())})}
 function lookup(){var el=document.getElementById('v34-isii-search');if(!el)return;var q=el.value.trim().toUpperCase();var out=document.getElementById('v34-isii-result');if(!q){out.innerHTML='<p>Saisissez un ISII complet.</p>';return}
  if(!isSchoolRole()){out.innerHTML='<p>Accès réservé au superadministrateur et aux chefs d’établissement.</p>';return}
  var found=(S.users||[]).filter(function(u){return u.role==='eleve'&&String(u.isii||'').toUpperCase()===q})[0];
  if(!found){out.innerHTML='<p>Aucun élève trouvé dans les données disponibles. La recherche mondiale nécessite le service central Neon.</p>';return}
  if(!canSee(found)){out.innerHTML='<div class="card"><b>Dossier non accessible.</b><p>Le superadministrateur doit autoriser la consultation de ce dossier.</p><p>Si vous ne connaissez pas encore l’ISII, utilisez « Demander un ISII au superadministrateur » : il vous le communiquera par message après identification de l’élève.</p></div>';return}
  var history=(S.studentRecords||S.student_records||[]).filter(function(x){return String(x.studentId||x.student_id||x.student)===String(found.id)});
  var tracks=(S.trackingRecords||[]).filter(function(x){return String(x.studentId||x.student_id||'')===String(found.id)});
  var mat=(S.studentMatriculeHistory||S.matriculeHistory||[]).filter(function(x){return String(x.studentId||x.student_id||x.student)===String(found.id)});
  out.innerHTML='<div class="card"><h3>'+esc34(found.name||found.fullName||'Élève')+'</h3><p><b>ISII :</b> <code>'+esc34(found.isii)+'</code></p><p><b>Matricule actuel :</b> '+esc34(found.matricule||'Non renseigné')+'</p><p><b>Établissement :</b> '+esc34(schoolName(found.school))+'</p><p><b>Classe :</b> '+esc34(found.className||found.classe||'Non renseignée')+'</p><p><b>Cycle :</b> '+esc34(found.cycle||'Non renseigné')+'</p><p><b>Année scolaire :</b> '+esc34(found.academicYear||found.anneeScolaire||'Non renseignée')+'</p><h4>Matricules antérieurs</h4>'+(mat.map(function(x){return '<div>'+esc34(x.matricule||x.value)+' — '+esc34(x.cycle||'')+' — '+esc34(x.schoolName||schoolName(x.schoolId||x.school_id))+'</div>'}).join('')||'<p>Aucun historique local disponible.</p>')+'<h4>Numéros de suivi</h4>'+(tracks.map(function(x){return '<div><code>'+esc34(x.id||x.tracking_number)+'</code> — '+esc34(x.type||x.operation_type)+' — '+esc34(x.status)+'</div>'}).join('')||'<p>Aucun suivi local disponible.</p>')+'<h4>Historique scolaire</h4>'+(history.map(function(x){return '<div>'+esc34(x.academicYear||x.academic_year||'')+' — '+esc34(x.className||x.new_class||'')+' — '+esc34(x.schoolName||schoolName(x.schoolId||x.school_id))+'</div>'}).join('')||'<p>Les situations annuelles doivent être chargées depuis le serveur.</p>')+'</div>';
 }
 window.dsV34Lookup=lookup;
 window.dsV34RequestAccess=function(){
  if(!me||me.role!=='chef')return alert('Action réservée au chef d’établissement.');
  var name=prompt('Nom et prénom complets de l’élève :');if(!name||!name.trim())return;
  var birth=prompt('Date de naissance de l’élève (facultatif, format AAAA-MM-JJ) :')||'';
  var previous=prompt('Ancien établissement ou établissement actuel connu (facultatif) :')||'';
  var reason=prompt('Motif de la demande (admission, transfert, vérification…) :');if(!reason||!reason.trim())return;
  var r={id:'ISII-REQ-'+Date.now()+'-'+Math.random().toString(36).slice(2,7),studentName:name.trim(),birthDate:birth.trim(),previousSchool:previous.trim(),requestingSchool:me.school,requestingUser:me.id,reason:reason.trim(),status:'pending',createdAt:new Date().toISOString()};
  requests().push(r);arr('isiiAccessAuditV34').push({requestId:r.id,action:'request_isii_from_superadmin',by:me.id,at:r.createdAt});save();
  alert('Demande envoyée au superadministrateur. L’ISII n’est pas affiché dans votre espace : le superadministrateur doit identifier l’élève et vous communiquer son ISII par message.');render();
 };
 window.dsV34DeliverISII=function(id){
  if(!me||me.role!=='super')return alert('Action réservée au superadministrateur.');
  var r=requests().filter(function(x){return x.id===id})[0];if(!r)return;
  var isii=prompt('ISII exact de l’élève identifié dans le registre central :');if(!isii||!isii.trim())return;isii=isii.trim().toUpperCase();
  var student=(S.users||[]).filter(function(u){return u.role==='eleve'&&String(u.isii||'').toUpperCase()===isii})[0];
  if(!student)return alert('Aucun élève correspondant à cet ISII dans les données disponibles. Vérifiez le registre central.');
  var msg='Communication officielle de l’ISII demandée pour '+r.studentName+' : '+isii+'. Vous pouvez maintenant saisir cet ISII dans votre espace DELTA SCHOOL pour consulter le dossier selon les autorisations accordées.';
  if(!Array.isArray(S.msgs))S.msgs=[];
  S.msgs.push({id:Date.now(),from:me.id,to:r.requestingUser,text:msg,ts:new Date().toISOString(),readAt:null,isiiRequestId:r.id,kind:'isii_delivery'});
  r.status='isii_sent';r.studentId=student.id;r.studentIsii=isii;r.sentAt=new Date().toISOString();r.sentBy=me.id;
  arr('isiiAccessAuditV34').push({requestId:r.id,action:'isii_sent_by_private_message',by:me.id,at:r.sentAt});save();
  alert('ISII communiqué au chef d’établissement par la messagerie DELTA SCHOOL.');render();
 };
 window.dsV34DecideAccess=function(id,approve){if(!me||me.role!=='super')return alert('Action réservée au superadministrateur.');var r=requests().filter(function(x){return x.id===id})[0];if(!r)return;var days=approve?Number(prompt('Durée d’accès en jours (ex. 30). Saisir 0 pour sans expiration :','30')):0;if(approve&&(!Number.isFinite(days)||days<0))return; r.status=approve?'approved':'rejected';r.decidedBy=me.id;r.decidedAt=new Date().toISOString();if(approve)grants().push({studentId:r.studentId,schoolId:r.requestingSchool,requestId:r.id,status:'approved',grantedBy:me.id,grantedAt:r.decidedAt,expiresAt:days?new Date(Date.now()+days*86400000).toISOString():null});arr('isiiAccessAuditV34').push({requestId:r.id,action:approve?'access_granted':'access_rejected',by:me.id,at:r.decidedAt});save();render()};
 function view(){if(!isSchoolRole())return '';var h='<h2>🔎 Recherche et communication sécurisée de l’ISII</h2>';
  if(me.role==='chef'){
   h+='<div class="card"><p><b>Vous ne pouvez pas rechercher ni découvrir l’ISII d’un élève dans le registre central.</b> Demandez-le au superadministrateur. Après réception de son message, saisissez l’ISII reçu dans le champ ci-dessous.</p><button onclick="dsV34RequestAccess()">Demander un ISII au superadministrateur</button><hr><label>ISII communiqué par le superadministrateur</label><input id="v34-isii-search" placeholder="Saisir l’ISII reçu par message" style="width:100%;max-width:520px"><button onclick="dsV34Lookup()">Rechercher le dossier</button><div id="v34-isii-result" style="margin-top:12px"></div></div>';
   h+='<div class="card"><b>Mes demandes d’ISII</b>'+(requests().filter(function(r){return String(r.requestingSchool)===String(me.school)&&String(r.requestingUser)===String(me.id)}).map(function(r){return '<div class="row"><span><b>'+esc34(r.studentName)+'</b><div class="mu">'+esc34(r.reason)+' · '+esc34(r.status)+'</div></span></div>'}).join('')||'<p>Aucune demande.</p>')+'</div>';
  }
  if(me.role==='super'){
   h+='<div class="card"><b>Registre central — recherche réservée au superadministrateur</b><label>ISII de l’élève</label><input id="v34-isii-search" placeholder="Saisir l’ISII exact" style="width:100%;max-width:520px"><button onclick="dsV34Lookup()">Rechercher le dossier</button><div id="v34-isii-result" style="margin-top:12px"></div></div>';
   h+='<div class="card"><b>Demandes d’ISII des chefs d’établissement</b>'+(requests().filter(function(r){return r.status==='pending'}).map(function(r){return '<div class="row"><span><b>'+esc34(r.studentName)+'</b><div class="mu">Naissance : '+esc34(r.birthDate||'Non précisée')+' · Établissement connu : '+esc34(r.previousSchool||'Non précisé')+' · Demandeur : '+esc34(schoolName(r.requestingSchool))+' · Motif : '+esc34(r.reason)+'</div></span><button onclick="dsV34DeliverISII(\''+esc34(r.id)+'\')">Identifier et envoyer l’ISII par message</button></div>'}).join('')||'<p>Aucune demande en attente.</p>')+'</div>';
   h+='<div class="card"><b>ISII déjà communiqués</b>'+(requests().filter(function(r){return r.status==='isii_sent'}).map(function(r){return '<div class="row"><span>'+esc34(r.studentName)+' — '+esc34(r.studentIsii)+'<div class="mu">Envoyé à : '+esc34(schoolName(r.requestingSchool))+'</div></span></div>'}).join('')||'<p>Aucun ISII communiqué.</p>')+'</div>';
  }
  h+='<div class="mu">Règle de confidentialité : seul le superadministrateur consulte le registre central des ISII et les communique par messagerie à la suite d’une demande identifiée. Le chef ne consulte le dossier qu’après réception de l’ISII et selon une autorisation serveur accordée pour l’admission ou le transfert. Toutes les consultations doivent être journalisées.</div>';return h}
 window.VIEWS=window.VIEWS||{};VIEWS.isiiRecherchePartageV34=view;
 var old=window.tabsOf;if(typeof old==='function')window.tabsOf=function(){var t=old.apply(this,arguments)||[];if(isSchoolRole()&&!t.some(function(x){return x[0]==='isiiRecherchePartageV34'}))t.push(['isiiRecherchePartageV34','🔎','Recherche ISII']);return t};
})();
