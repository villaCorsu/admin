
// CALEDIT
const CE_OWNER='villaCorsu',CE_REPO='admin',CE_FILE='reservations.csv',CE_BRANCH='main';
const CE_TOK_KEY='vc_gh_token';
let ceD=[],ceSha=null,_cid=0;
const ceId=()=>++_cid;
const ceOwn=n=>String(n).toLowerCase().indexOf('propri')>=0;
const cePad=n=>n<10?'0'+n:String(n);
const ceMOS=['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
const ceWDS=['L','M','M','J','V','S','D'];

function ceTst(type,msg){
  const el=document.getElementById('toast');if(!el)return;
  el.className='toast '+type+' show';el.textContent=msg;
  clearTimeout(ceTst._t);ceTst._t=setTimeout(function(){el.classList.remove('show');},4200);
}

function ceGetTok(){return localStorage.getItem(CE_TOK_KEY)||'';}
function ceSaveTok(){
  const v=document.getElementById('ce-tok').value.trim();
  if(!v){ceTst('err','Collez votre GitHub Token');return;}
  localStorage.setItem(CE_TOK_KEY,v);ceTokUI(v);ceTst('ok','Token enregistré');
}
function ceTokUI(t){
  const el=document.getElementById('ce-tok-st');
  if(t){el.style.color='#00C9A7';el.textContent='Activé';document.getElementById('ce-tok').value=t.slice(0,8)+'…';}
  else{el.style.color='rgba(240,238,255,.3)';el.textContent='Non configuré (requis pour sauvegarder)';}
}

async function openCalEdit(){
  document.getElementById('ce-ov').classList.add('on');
  ceTokUI(ceGetTok());
  ceStat('inf','Chargement depuis GitHub...');
  try{
    const tok=ceGetTok();
    const h={'Accept':'application/vnd.github+json'};
    if(tok) h['Authorization']='Bearer '+tok;
    const url='https://api.github.com/repos/'+CE_OWNER+'/'+CE_REPO+'/contents/'+CE_FILE+'?ref='+CE_BRANCH+'&t='+Date.now();
    const res=await fetch(url,{headers:h});
    if(!res.ok) throw new Error('GitHub '+res.status+(res.status===404?' fichier introuvable':res.status===401?' token invalide':''));
    const j=await res.json();
    ceSha=j.sha;
    const raw=atob(j.content.replace(/\n/g,''));
    const txt=new TextDecoder('utf-8').decode(new Uint8Array([...raw].map(function(c){return c.charCodeAt(0);})));
    ceD=ceParseCsv(txt);ceRender();
    ceStat('ok','Chargé depuis GitHub : '+ceD.length+' réservations');
    setTimeout(function(){document.getElementById('ce-st').className='ce-st';},3500);
  }catch(e){
    ceD=BOOKINGS.map(function(b){return{_id:ceId(),arr:b.arr,dep:b.dep,name:b.name,nat:b.nat||'',vis:b.vis||0,prix:b.prix||0};});
    ceSha=null;ceRender();
    ceStat('err','⚠ '+e.message+' — données locales');
  }
}
function ceClose(){document.getElementById('ce-ov').classList.remove('on');}

function ceStat(t,m){const el=document.getElementById('ce-st');el.className='ce-st '+t;el.textContent=m;}

function ceParseCsv(txt){
  const lines=txt.replace(/^\uFEFF/,'').trim().split(/\r?\n/).filter(function(l){return l.trim();});
  if(lines.length<2) return [];
  const sep=(lines[0].match(/;/g)||[]).length>=(lines[0].match(/,/g)||[]).length?';':',';
  return lines.slice(1).map(function(l){
    const c=l.split(sep).map(function(x){return x.trim().replace(/^"|"$/g,'');});
    if(!c[0]&&!c[2]) return null;
    return{_id:ceId(),arr:c[0]||'',dep:c[1]||'',name:c[2]||'',nat:c[3]||'',vis:+c[4]||0,prix:+c[5]||0};
  }).filter(Boolean);
}
function ceGenCsv(){
  const ln=['Arrivée;Départ;Locataire;Nationalité;Visiteurs;Prix'];
  ceD.forEach(function(r){if(r.arr||r.name)ln.push([r.arr,r.dep,r.name,r.nat,r.vis,r.prix].join(';'));});
  return ln.join('\r\n');
}
function ceNt(a,d){
  try{
    function p(s){var x=s.split('/');return new Date(+x[2],+x[1]-1,+x[0]);}
    var n=Math.round((p(d)-p(a))/86400000);
    return n>0?n+'n':'--';
  }catch(e){return '--';}
}
function ceFmt(dt){return cePad(dt.getDate())+'/'+cePad(dt.getMonth()+1)+'/'+dt.getFullYear();}
function cePD(s){
  if(!s)return null;
  var x=s.split('/');
  var dt=new Date(+x[2],+x[1]-1,+x[0]);
  dt.setHours(0,0,0,0);return dt;
}
function ceEsc(s){return String(s||'').replace(/&/g,'&amp;').replace(/\x22/g,'\x26quot;').replace(/</g,'&lt;');}

function ceRender(){
  var tb=document.getElementById('ce-tbody');tb.innerHTML='';
  var sorted=ceD.slice().sort(function(a,b){
    function p(s){if(!s)return new Date(0);var x=s.split('/');return new Date(+x[2],+x[1]-1,+x[0]);}
    return p(a.arr)-p(b.arr);
  });
  sorted.forEach(function(row){
    var i=ceD.indexOf(row);
    var own=ceOwn(row.name);
    var tr=document.createElement('tr');
    if(own)tr.classList.add('ce-own-row');
    tr.innerHTML=
      '<td style="padding:3px 6px;text-align:center;font-size:14px">'+(own?'&#127968;':'&#128100;')+'</td>'+
      '<td><input class="ce-ci mono" value="'+ceEsc(row.arr)+'" oninput="ceUp('+i+','arr',this.value)" placeholder="JJ/MM/AAAA" onclick="ceOpenEdit('+i+','arr',this)" style="width:105px;cursor:pointer"/></td>'+
      '<td><input class="ce-ci mono" value="'+ceEsc(row.dep)+'" oninput="ceUp('+i+','dep',this.value)" placeholder="JJ/MM/AAAA" onclick="ceOpenEdit('+i+','dep',this)" style="width:105px;cursor:pointer"/></td>'+
      '<td><input class="ce-ci" value="'+ceEsc(row.name)+'" oninput="ceUp('+i+','name',this.value)" style="min-width:120px"/></td>'+
      '<td><input class="ce-ci" value="'+ceEsc(row.nat)+'" oninput="ceUp('+i+','nat',this.value)" style="min-width:90px"/></td>'+
      '<td><input class="ce-ci num" type="number" min="1" max="20" value="'+row.vis+'" oninput="ceUp('+i+','vis',this.value)"/></td>'+
      '<td><input class="ce-ci rt" type="number" min="0" value="'+row.prix+'" oninput="ceUp('+i+','prix',this.value)"/></td>'+
      '<td class="ce-ni" id="ce-ni-'+i+'">'+ceNt(row.arr,row.dep)+'</td>'+
      '<td><button class="ce-delbtn" onclick="ceDel('+i+')" title="Supprimer">&#x2715;</button></td>';
    tb.appendChild(tr);
  });
}
function ceUp(i,f,v){
  ceD[i][f]=(f==='vis'||f==='prix')?(+v||0):v;
  if(f==='arr'||f==='dep'){var el=document.getElementById('ce-ni-'+i);if(el)el.textContent=ceNt(ceD[i].arr,ceD[i].dep);}
}
function ceDel(i){
  if(!confirm('Supprimer la réservation de "'+ceD[i].name+'" ?'))return;
  ceD.splice(i,1);ceRender();ceStat('inf','Supprimé — Sauvegarder pour confirmer');
}

async function cePush(){
  var tok=ceGetTok();
  if(!tok){ceStat('err','Configurez votre GitHub Token');return;}
  var btn=document.getElementById('ce-save-btn');
  btn.disabled=true;btn.textContent='Sauvegarde...';ceStat('inf','Envoi vers GitHub...');
  try{
    var csv=ceGenCsv();
    var bytes=new TextEncoder().encode('﻿'+csv);
    var bin='';bytes.forEach(function(b){bin+=String.fromCharCode(b);});
    var pl={message:'Mise à jour reservations.csv',content:btoa(bin),branch:CE_BRANCH};
    if(ceSha)pl.sha=ceSha;
    var res=await fetch('https://api.github.com/repos/'+CE_OWNER+'/'+CE_REPO+'/contents/'+CE_FILE,{
      method:'PUT',
      headers:{'Authorization':'Bearer '+tok,'Content-Type':'application/json','Accept':'application/vnd.github+json'},
      body:JSON.stringify(pl),
    });
    if(!res.ok){var e=await res.json();throw new Error(e.message||'GitHub API '+res.status);}
    var result=await res.json();ceSha=result.content.sha;
    ceStat('ok','Sauvegardé sur GitHub : '+ceD.length+' réservations');
    btn.textContent='Sauvegardé !';ceTst('ok','Sauvegardé sur GitHub');
    setTimeout(async function(){btn.textContent='Sauvegarder';btn.disabled=false;await syncFromSheet();},2000);
  }catch(e){
    ceStat('err','Erreur : '+e.message);ceTst('err','Erreur : '+e.message);
    btn.textContent='Sauvegarder';btn.disabled=false;
  }
}
function ceDl(){
  var blob=new Blob(['﻿'+ceGenCsv()],{type:'text/csv;charset=utf-8;'});
  var url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download='reservations.csv';a.click();URL.revokeObjectURL(url);
}

// Calendar for add/edit
var calY=new Date().getFullYear(),calM=new Date().getMonth();
var calSel={arr:null,dep:null},calStep='arr';
var calEditIdx=null,calEditFld=null,calEditInp=null;

function ceOpenAdd(){
  calEditIdx=null;calEditFld=null;calEditInp=null;
  calY=new Date().getFullYear();calM=new Date().getMonth();
  calSel={arr:null,dep:null};calStep='arr';
  ['ce-a-name','ce-a-nat'].forEach(function(id){document.getElementById(id).value='';});
  document.getElementById('ce-a-vis').value=2;document.getElementById('ce-a-prix').value=0;
  document.getElementById('ce-a-own').checked=false;
  document.getElementById('ce-d-arr').textContent='—';
  document.getElementById('ce-d-dep').textContent='—';
  document.getElementById('ce-add-title').textContent='Nouvelle réservation';
  document.getElementById('ce-add-ov').classList.add('on');ceRenderCal();
}
function ceOpenEdit(i,fld,inp){
  calEditIdx=i;calEditFld=fld;calEditInp=inp;
  var row=ceD[i];
  var arrDt=cePD(row.arr),depDt=cePD(row.dep);
  calSel={arr:arrDt,dep:depDt};
  var ref=fld==='arr'?arrDt:depDt;
  if(ref){calY=ref.getFullYear();calM=ref.getMonth();}
  else{calY=new Date().getFullYear();calM=new Date().getMonth();}
  calStep=fld;
  document.getElementById('ce-a-name').value=row.name||'';
  document.getElementById('ce-a-nat').value=row.nat||'';
  document.getElementById('ce-a-vis').value=row.vis||2;
  document.getElementById('ce-a-prix').value=row.prix||0;
  document.getElementById('ce-a-own').checked=ceOwn(row.name);
  document.getElementById('ce-d-arr').textContent=arrDt?ceFmt(arrDt):'—';
  document.getElementById('ce-d-dep').textContent=depDt?ceFmt(depDt):'—';
  document.getElementById('ce-add-title').textContent='Modifier la réservation';
  document.getElementById('ce-add-ov').classList.add('on');ceRenderCal();
}
function ceCloseAdd(){document.getElementById('ce-add-ov').classList.remove('on');calEditIdx=null;}

function ceCalNav(dir){
  calM+=dir;if(calM<0){calM=11;calY--;}else if(calM>11){calM=0;calY++;}ceRenderCal();
}
function ceCalClick(y,m,d){
  var dt=new Date(y,m,d);dt.setHours(0,0,0,0);
  if(calStep==='arr'){
    calSel={arr:dt,dep:null};calStep='dep';
    document.getElementById('ce-d-dep').textContent='—';
  }else if(calStep==='dep'){
    if(calSel.arr&&dt<=calSel.arr){calSel={arr:dt,dep:null};calStep='dep';document.getElementById('ce-d-dep').textContent='—';}
    else{calSel.dep=dt;calStep='done';}
  }else{calSel={arr:dt,dep:null};calStep='dep';document.getElementById('ce-d-dep').textContent='—';}
  if(calSel.arr)document.getElementById('ce-d-arr').textContent=ceFmt(calSel.arr);
  if(calSel.dep)document.getElementById('ce-d-dep').textContent=ceFmt(calSel.dep);
  ceRenderCal();
}
function ceRenderCal(){
  var stepEl=document.getElementById('ce-cal-step');
  if(calStep==='arr')stepEl.textContent="1. Sélectionnez la date d'arrivée";
  else if(calStep==='dep')stepEl.textContent='2. Sélectionnez la date de départ';
  else stepEl.textContent='✓ Dates sélectionnées';
  document.getElementById('ce-cal-lbl').textContent=ceMOS[calM]+' '+calY;
  var first=new Date(calY,calM,1),last=new Date(calY,calM+1,0);
  var dow=first.getDay();dow=dow===0?6:dow-1;
  var today=new Date();today.setHours(0,0,0,0);
  var arrT=calSel.arr?calSel.arr.getTime():null,depT=calSel.dep?calSel.dep.getTime():null;
  var html='';
  ceWDS.forEach(function(j){html+='<div class="ce-cal-dh">'+j+'</div>';});
  for(var i=0;i<dow;i++)html+='<div></div>';
  for(var d=1;d<=last.getDate();d++){
    var dt=new Date(calY,calM,d);dt.setHours(0,0,0,0);var t=dt.getTime();
    var cls='ce-cal-d';
    if(arrT&&t===arrT)cls+=' ce-cal-arr';
    else if(depT&&t===depT)cls+=' ce-cal-dep';
    else if(arrT&&depT&&t>arrT&&t<depT)cls+=' ce-cal-rng';
    else if(t<today.getTime())cls+=' ce-cal-past';
    html+='<div class="'+cls+'" onclick="ceCalClick('+calY+','+calM+','+d+')">'+d+'</div>';
  }
  document.getElementById('ce-cal-grid').innerHTML=html;
}
function ceConfirmAdd(){
  var name=document.getElementById('ce-a-name').value.trim();
  var nat=document.getElementById('ce-a-nat').value.trim();
  var vis=+document.getElementById('ce-a-vis').value||2;
  var prix=+document.getElementById('ce-a-prix').value||0;
  var isOwn=document.getElementById('ce-a-own').checked;
  var finalName=isOwn?'Propriétaire':name;
  if(calEditIdx!==null){
    var row=ceD[calEditIdx];
    if(calSel.arr)row.arr=ceFmt(calSel.arr);
    if(calSel.dep)row.dep=ceFmt(calSel.dep);
    row.name=finalName||row.name;row.nat=nat;row.vis=vis;row.prix=prix;
    if(calEditInp)calEditInp.value=calEditFld==='arr'?row.arr:row.dep;
    ceRender();ceCloseAdd();ceStat('inf','Modifié — Sauvegarder pour confirmer');
    return;
  }
  if(!calSel.arr||!calSel.dep){ceTst('err','Sélectionnez les deux dates');return;}
  if(!finalName){ceTst('err','Renseignez le nom du locataire');document.getElementById('ce-a-name').focus();return;}
  function p(s){var x=s.split('/');return new Date(+x[2],+x[1]-1,+x[0]);}
  ceD.push({_id:ceId(),arr:ceFmt(calSel.arr),dep:ceFmt(calSel.dep),name:finalName,nat:nat,vis:vis,prix:prix});
  ceD.sort(function(a,b){return p(a.arr)-p(b.arr);});
  ceRender();ceCloseAdd();
  ceTst('ok','Réservation ajoutée — Sauvegarder pour confirmer');
  ceStat('inf','Ajoutée — Sauvegarder pour confirmer');
}
document.addEventListener('keydown',function(e){if(e.key==='Escape'){ceClose();ceCloseAdd();}});
