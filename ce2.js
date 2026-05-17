
// CALEDIT - config stockée dans localStorage
const CE_TOK_KEY  = 'vc_gh_token';
const CE_CFG_KEY  = 'vc_ce_cfg';

function ceCfg(){
  try{ return Object.assign({owner:'villaCorsu',repo:'admin',file:'reservations.csv',branch:'main'},
    JSON.parse(localStorage.getItem(CE_CFG_KEY)||'{}')); }
  catch(e){ return {owner:'villaCorsu',repo:'admin',file:'reservations.csv',branch:'main'}; }
}
function ceSaveCfg(){
  var cfg={
    owner: document.getElementById('ce-cfg-owner').value.trim(),
    repo:  document.getElementById('ce-cfg-repo').value.trim(),
    branch:document.getElementById('ce-cfg-branch').value.trim()||'main',
    file:  'reservations.csv'
  };
  localStorage.setItem(CE_CFG_KEY,JSON.stringify(cfg));
  ceStat('ok','Configuration sauvegard\u00e9e');
  setTimeout(function(){openCalEdit();},600);
}
function ceLoadCfgToForm(){
  var cfg=ceCfg();
  document.getElementById('ce-cfg-owner').value  = cfg.owner;
  document.getElementById('ce-cfg-repo').value   = cfg.repo;
  document.getElementById('ce-cfg-branch').value = cfg.branch;
}

let ceD=[],ceSha=null,_cid=0;
let ceD=[],ceSha=null,_cid=0;
const ceId=()=>++_cid;
const ceOwn=n=>String(n).toLowerCase().indexOf('propri')>=0;
const cePad=n=>n<10?'0'+n:String(n);
const ceMOS=['Janvier','F\u00e9vrier','Mars','Avril','Mai','Juin','Juillet','Ao\u00fbt','Septembre','Octobre','Novembre','D\u00e9cembre'];
const ceWDS=['L','M','M','J','V','S','D'];

function ceTst(type,msg){
  const el=document.getElementById('toast');if(!el)return;
  el.className='toast '+type+' show';el.textContent=msg;
  clearTimeout(ceTst._t);ceTst._t=setTimeout(function(){el.classList.remove('show');},4200);
}

function ceGetTok(){
  var raw=localStorage.getItem(CE_TOK_KEY)||'';
  // Strip any non-ASCII or non-printable characters that would break fetch headers
  return raw.replace(/[^\x20-\x7E]/g,'').trim();
}
function ceSaveTok(){
  // Strip non-ASCII characters before saving
  var raw=document.getElementById('ce-tok').value;
  var v=raw.replace(/[^\x20-\x7E]/g,'').trim();
  if(!v){ceTst('err','Collez votre GitHub Token');return;}
  localStorage.setItem(CE_TOK_KEY,v);ceTokUI(v);ceTst('ok','Token enregistr\u00e9');
}
function ceTokUI(t){
  const el=document.getElementById('ce-tok-st');
  if(t){el.style.color='#00C9A7';el.textContent='Activ\u00e9';document.getElementById('ce-tok').value=t.slice(0,8)+'\u2026';}
  else{el.style.color='rgba(240,238,255,.3)';el.textContent='Non configur\u00e9 (requis pour sauvegarder)';}
}

async function openCalEdit(){
  document.getElementById('ce-ov').classList.add('on');
  ceTokUI(ceGetTok());
  ceLoadCfgToForm();
  ceStat('inf','Chargement depuis GitHub...');
  try{
    const tok=ceGetTok();
    // Encode as Latin-1 safe strings for fetch headers
    const h={'Accept':'application/vnd.github+json'};
    if(tok) h['Authorization']='Bearer '+tok.replace(/[^\x20-\x7E]/g,'');
    var _cfg=ceCfg();var url='https://api.github.com/repos/'+_cfg.owner+'/'+_cfg.repo+'/contents/'+_cfg.file+'?ref='+_cfg.branch+'&t='+Date.now();
    const res=await fetch(url,{headers:h});
    if(!res.ok) throw new Error('GitHub '+res.status+(res.status===404?' fichier introuvable':res.status===401?' token invalide':''));
    const j=await res.json();
    ceSha=j.sha;
    const raw=atob(j.content.replace(/\n/g,''));
    const txt=new TextDecoder('utf-8').decode(new Uint8Array([...raw].map(function(c){return c.charCodeAt(0);})));
    ceD=ceParseCsv(txt);ceRender();
    ceStat('ok','Charg\u00e9 depuis GitHub : '+ceD.length+' r\u00e9servations');
    setTimeout(function(){document.getElementById('ce-st').className='ce-st';},3500);
  }catch(e){
    ceD=BOOKINGS.map(function(b){return{_id:ceId(),arr:b.arr,dep:b.dep,name:b.name,nat:b.nat||'',vis:b.vis||0,prix:b.prix||0};});
    ceSha=null;ceRender();
    ceStat('err','\u26a0 '+e.message+' \u2014 donn\u00e9es locales');
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
  const ln=['Arriv\u00e9e;D\u00e9part;Locataire;Nationalit\u00e9;Visiteurs;Prix'];
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
  var tb=document.getElementById('ce-tbody');
  tb.innerHTML='';
  var sorted=ceD.slice().sort(function(a,b){
    function p(s){if(!s)return new Date(0);var x=s.split('/');return new Date(+x[2],+x[1]-1,+x[0]);}
    return p(a.arr)-p(b.arr);
  });
  sorted.forEach(function(row){
    var i=ceD.findIndex(function(r){return r._id===row._id;});
    var own=ceOwn(row.name);
    var tr=document.createElement('tr');
    if(own) tr.classList.add('ce-own-row');
    // Icon
    var td0=document.createElement('td');
    td0.style.cssText='padding:3px 6px;text-align:center;font-size:14px';
    td0.textContent=own?'\uD83C\uDFE1':'\uD83D\uDC64';
    tr.appendChild(td0);
    // Date inputs with calendar picker
    function makeDateTd(fld,val){
      var td=document.createElement('td');
      var inp=document.createElement('input');
      inp.className='ce-ci mono';inp.value=val||'';
      inp.placeholder='JJ/MM/AAAA';inp.style.width='105px';inp.style.cursor='pointer';
      inp.title='Cliquer pour le calendrier';
      (function(f){
        inp.addEventListener('input',function(){ceUp(i,f,this.value);});
        inp.addEventListener('click',function(){ceOpenEdit(i,f,this);});
      })(fld);
      td.appendChild(inp);return td;
    }
    tr.appendChild(makeDateTd('arr',row.arr));
    tr.appendChild(makeDateTd('dep',row.dep));
    // Text inputs
    function makeTextTd(fld,val,minW){
      var td=document.createElement('td');
      var inp=document.createElement('input');
      inp.className='ce-ci';inp.value=val||'';inp.style.minWidth=minW;
      (function(f){inp.addEventListener('input',function(){ceUp(i,f,this.value);});})(fld);
      td.appendChild(inp);return td;
    }
    tr.appendChild(makeTextTd('name',row.name,'120px'));
    tr.appendChild(makeTextTd('nat',row.nat,'90px'));
    // Number inputs
    function makeNumTd(fld,val,align){
      var td=document.createElement('td');
      var inp=document.createElement('input');
      inp.type='number';inp.className='ce-ci';inp.value=val||0;
      inp.style.textAlign=align;inp.style.width=align==='center'?'65px':'80px';
      if(fld==='vis'){inp.min='1';inp.max='20';}else{inp.min='0';}
      (function(f){inp.addEventListener('input',function(){ceUp(i,f,this.value);});})(fld);
      td.appendChild(inp);return td;
    }
    tr.appendChild(makeNumTd('vis',row.vis,'center'));
    tr.appendChild(makeNumTd('prix',row.prix,'right'));
    // Nights
    var tdNt=document.createElement('td');
    tdNt.className='ce-ni';tdNt.id='ce-ni-'+i;tdNt.textContent=ceNt(row.arr,row.dep);
    tr.appendChild(tdNt);
    // Delete
    var tdDel=document.createElement('td');
    var btnDel=document.createElement('button');
    btnDel.className='ce-delbtn';btnDel.title='Supprimer';btnDel.innerHTML='&#x2715;';
    (function(idx){btnDel.addEventListener('click',function(){ceDel(idx);});})(i);
    tdDel.appendChild(btnDel);tr.appendChild(tdDel);
    tb.appendChild(tr);
  });
}
function ceUp(i,f,v){
  if(i<0||i>=ceD.length)return;
  ceD[i][f]=(f==='vis'||f==='prix')?(+v||0):v;
  if(f==='arr'||f==='dep'){var el=document.getElementById('ce-ni-'+i);if(el)el.textContent=ceNt(ceD[i].arr,ceD[i].dep);}
}
function ceDel(i){
  if(!confirm('Supprimer la r\u00e9servation de "'+ceD[i].name+'" ?'))return;
  ceD.splice(i,1);ceRender();ceStat('inf','Supprim\u00e9 \u2014 Sauvegarder pour confirmer');
}

async function cePush(){
  var tok=ceGetTok();
  if(!tok){ceStat('err','Configurez votre GitHub Token');return;}
  var btn=document.getElementById('ce-save-btn');
  btn.disabled=true;btn.textContent='Sauvegarde...';
  var cleanTok=tok.replace(/[^\x20-\x7E]/g,'');
  var _cfg2=ceCfg();var apiUrl='https://api.github.com/repos/'+_cfg2.owner+'/'+_cfg2.repo+'/contents/'+_cfg2.file;
  var apiHeaders={'Authorization':'Bearer '+cleanTok,'Content-Type':'application/json','Accept':'application/vnd.github+json'};
  try{
    ceStat('inf','R\u00e9cup\u00e9ration du SHA...');
    var getUrl=apiUrl+'?ref='+_cfg2.branch+'&t='+Date.now();
    console.log('[CE] cfg:',_cfg2.owner+'/'+_cfg2.repo+'/'+_cfg2.file+' branch:'+_cfg2.branch);
    console.log('[CE] GET '+getUrl);
    var getRes=await fetch(getUrl,{headers:{'Authorization':'Bearer '+cleanTok,'Accept':'application/vnd.github+json'}});
    console.log('[CE] GET status:'+getRes.status);
    if(!getRes.ok){
      var errTxt=await getRes.text();
      console.log('[CE] error:',errTxt.slice(0,200));
      throw new Error('GitHub GET '+getRes.status+(getRes.status===404?' \u2014 "'+_cfg2.file+'" introuvable dans '+_cfg2.owner+'/'+_cfg2.repo+' (branche: '+_cfg2.branch+')':getRes.status===401?' \u2014 token invalide':''));
    }
    var getJson=await getRes.json();
    ceSha=getJson.sha;
    console.log('[CE] SHA:'+ceSha+' path:'+getJson.path);

    // PUT avec le SHA frais
    ceStat('inf','Envoi vers GitHub...');
    var csv=ceGenCsv();
    var bytes=new TextEncoder().encode('\ufeff'+csv);
    var bin='';bytes.forEach(function(b){bin+=String.fromCharCode(b);});
    var pl={message:'Mise \u00e0 jour reservations.csv \u2014 CalEdit',content:btoa(bin),branch:_cfg2.branch,sha:ceSha};
    var res=await fetch(apiUrl,{method:'PUT',headers:apiHeaders,body:JSON.stringify(pl)});
    if(!res.ok){var e=await res.json();throw new Error(e.message||'GitHub PUT '+res.status);}
    var result=await res.json();
    ceSha=result.content.sha;
    ceStat('ok','Sauvegard\u00e9 sur GitHub : '+ceD.length+' r\u00e9servations');
    btn.textContent='Sauvegard\u00e9 !';
    ceTst('ok','Sauvegard\u00e9 sur GitHub');
    setTimeout(async function(){btn.textContent='Sauvegarder';btn.disabled=false;await syncFromSheet();},2000);
  }catch(e){
    ceStat('err','Erreur : '+e.message);
    ceTst('err','Erreur : '+e.message);
    btn.textContent='Sauvegarder';btn.disabled=false;
  }
}
function ceDl(){
  var blob=new Blob(['\ufeff'+ceGenCsv()],{type:'text/csv;charset=utf-8;'});
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
  document.getElementById('ce-d-arr').textContent='\u2014';
  document.getElementById('ce-d-dep').textContent='\u2014';
  document.getElementById('ce-add-title').textContent='Nouvelle r\u00e9servation';
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
  document.getElementById('ce-d-arr').textContent=arrDt?ceFmt(arrDt):'\u2014';
  document.getElementById('ce-d-dep').textContent=depDt?ceFmt(depDt):'\u2014';
  document.getElementById('ce-add-title').textContent='Modifier la r\u00e9servation';
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
    document.getElementById('ce-d-dep').textContent='\u2014';
  }else if(calStep==='dep'){
    if(calSel.arr&&dt<=calSel.arr){calSel={arr:dt,dep:null};calStep='dep';document.getElementById('ce-d-dep').textContent='\u2014';}
    else{calSel.dep=dt;calStep='done';}
  }else{calSel={arr:dt,dep:null};calStep='dep';document.getElementById('ce-d-dep').textContent='\u2014';}
  if(calSel.arr)document.getElementById('ce-d-arr').textContent=ceFmt(calSel.arr);
  if(calSel.dep)document.getElementById('ce-d-dep').textContent=ceFmt(calSel.dep);
  ceRenderCal();
}
function ceRenderCal(){
  var stepEl=document.getElementById('ce-cal-step');
  if(calStep==='arr')stepEl.textContent="1. S\u00e9lectionnez la date d'arriv\u00e9e";
  else if(calStep==='dep')stepEl.textContent='2. S\u00e9lectionnez la date de d\u00e9part';
  else stepEl.textContent='\u2713 Dates s\u00e9lectionn\u00e9es';
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
  var finalName=isOwn?'Propri\u00e9taire':name;
  if(calEditIdx!==null){
    var row=ceD[calEditIdx];
    if(calSel.arr)row.arr=ceFmt(calSel.arr);
    if(calSel.dep)row.dep=ceFmt(calSel.dep);
    row.name=finalName||row.name;row.nat=nat;row.vis=vis;row.prix=prix;
    if(calEditInp)calEditInp.value=calEditFld==='arr'?row.arr:row.dep;
    ceRender();ceCloseAdd();ceStat('inf','Modifi\u00e9 \u2014 Sauvegarder pour confirmer');
    return;
  }
  if(!calSel.arr||!calSel.dep){ceTst('err','S\u00e9lectionnez les deux dates');return;}
  if(!finalName){ceTst('err','Renseignez le nom du locataire');document.getElementById('ce-a-name').focus();return;}
  function p(s){var x=s.split('/');return new Date(+x[2],+x[1]-1,+x[0]);}
  ceD.push({_id:ceId(),arr:ceFmt(calSel.arr),dep:ceFmt(calSel.dep),name:finalName,nat:nat,vis:vis,prix:prix});
  ceRender();ceCloseAdd();
  ceTst('ok','R\u00e9servation ajout\u00e9e \u2014 Sauvegarder pour confirmer');
  ceStat('inf','Ajout\u00e9e \u2014 Sauvegarder pour confirmer');
}
document.addEventListener('keydown',function(e){if(e.key==='Escape'){ceClose();ceCloseAdd();}});

// Override the stub with the real function and drain any queued calls
window.openCalEdit = openCalEdit;
if(window._ceQueue && window._ceQueue.length) {
  window._ceQueue.forEach(function(cmd){ if(cmd==='open') openCalEdit(); });
  window._ceQueue = [];
}
