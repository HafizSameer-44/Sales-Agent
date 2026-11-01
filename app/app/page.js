'use client';
// PASTE AS:  app/app/page.js   (the dashboard; new location)
import {Fragment,useState,useEffect,useRef} from 'react';
import {useRouter} from 'next/navigation';
import {sb} from '../auth-form';

const P={
 overview:'M3 3h7v9H3zM14 3h7v5h-7zM14 12h7v9h-7zM3 16h7v5H3z',
 finder:'M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9zM19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9z',
 leads:'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8',
 approvals:'M22 11.1V12a10 10 0 1 1-5.9-9.1M22 4 12 14l-3-3',
 calls:'M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z',
 settings:'M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6',
 bell:'M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0',
 mail:'M4 4h16v16H4zM4 6l8 7 8-7',
 pause:'M6 4h4v16H6zM14 4h4v16h-4z',
 zap:'M13 2 3 14h9l-1 8 10-12h-9z',
 msg:'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z',
 plug:'M9 2v6M15 2v6M6 8h12v4a6 6 0 0 1-12 0zM12 18v4',
 out:'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9',
};
const NAV=[['overview','Overview'],['finder','AI Lead Finder'],['leads','Leads'],['approvals','Approvals'],['calls','Calls'],['settings','Settings']];
const TITLES={overview:['Overview','Your pipeline at a glance'],finder:['AI Lead Finder','Find real businesses and contact them in one place'],leads:['Leads','Manage and score your prospects'],approvals:['Approvals','Review emails before they go out'],calls:['Calls','Score your sales calls and get coaching'],settings:['Settings','Control your agent, alerts and connections']};
const SETTINGS=[['paused','Pause agent','Stops all sending and automation instantly.','pause'],['auto_find','Auto-find leads','Searches for new leads every day (USA, Europe, Pakistan).','finder'],['auto_first','Auto-send first emails and follow-ups','Sends without waiting for your approval.','mail'],['auto_reply','Auto-reply to leads','Replies that need you are always held back.','msg']];
const SOCIAL=/(facebook|instagram|linktr\.ee|wa\.me|tiktok|youtube|twitter|x\.com|linkedin|business\.site)/i;

const I=({d,s=18})=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={d}/></svg>;
const arr=x=>Array.isArray(x)?x:[];
const cls=n=>n>=80?'hi':n>=60?'mid':'lo';
const Score=({n})=><span className={'sc '+cls(n)}>{n??'-'}</span>;
const Stage=({s})=><span className="tag">{(s||'new').replace('_',' ')}</span>;
const day=x=>x?new Date(x).toLocaleDateString(undefined,{month:'short',day:'numeric'}):'';
const ago=t=>{const s=(Date.now()-t)/1000;return s<60?'just now':s<3600?Math.floor(s/60)+'m ago':s<86400?Math.floor(s/3600)+'h ago':new Date(t).toLocaleDateString()};
const grab=(p,k)=>((p||'').match(new RegExp('^'+k+': (.*)$','m'))||[])[1]||'';
const isFinder=l=>{const g=[].concat(l.signals||[]);return g.includes('Finder')||g.includes('No website')};
const mapUrl=l=>grab(l.profile,'Maps')||('https://www.google.com/maps/search/?api=1&query='+encodeURIComponent((l.name+' '+grab(l.profile,'Location')).trim()));
const noSiteU=u=>!u||u==='none'||SOCIAL.test(u);
const Site=({u})=>!u||u==='none'?<span className="bd ok">No website</span>:SOCIAL.test(u)?<span className="bd warn">Social page only</span>:<a className="bd" href={/^https?:/.test(u)?u:'https://'+u} target="_blank" rel="noreferrer">Has website</a>;
const Chip=({st})=>!st?<span className="chip">Checking...</span>:!st.set?<span className="chip warn">Not set</span>:st.ok?<span className="chip ok">Connected</span>:<span className="chip bad">Key rejected</span>;
function Count({to}){const [v,setV]=useState(0);useEffect(()=>{if(typeof to!=='number')return;let r,s;const f=t=>{s=s||t;const p=Math.min(1,(t-s)/800);setV(Math.round(to*(1-Math.pow(1-p,3))));if(p<1)r=requestAnimationFrame(f)};r=requestAnimationFrame(f);return()=>cancelAnimationFrame(r)},[to]);return typeof to==='number'?v:to}

export default function Page(){
 const [user,setUser]=useState(null),[on,setOn]=useState(false),[loaded,setLoaded]=useState(false),[page,setPage]=useState('overview'),[D,setD]=useState({drafts:[],leads:[],calls:[]}),[S,setS]=useState({}),
  [ed,setEd]=useState({}),[rep,setRep]=useState({}),[q,setQ]=useState(''),[st,setSt]=useState('all'),[open,setOpen]=useState(null),
  [f,setF]=useState({name:'',email:'',company:'',profile:''}),[showAdd,setShowAdd]=useState(false),[ct,setCt]=useState({lead_id:'',transcript:''}),[busy,setBusy]=useState(''),
  [opts,setOpts]=useState({niches:[],countries:{}}),[fq,setFq]=useState({niche:'Real estate',custom:'',country:'United States',city:'Any city',count:20,mode:'mixed'}),
  [fr,setFr]=useState({running:false,msg:'',err:''}),[sel,setSel]=useState({}),[cmp,setCmp]=useState(null),[sent,setSent]=useState({}),[src,setSrc]=useState('apify'),
  [fo,setFo]=useState({q:'',onlyEmail:false}),[addOpen,setAddOpen]=useState(false),[af,setAf]=useState({name:'',phone:'',email:'',address:'',maps:'',niche:''}),
  [toasts,setToasts]=useState([]),[notes,setNotes]=useState([]),[panel,setPanel]=useState(false),[shake,setShake]=useState(false),[prefs,setPrefs]=useState({}),
  [conn,setConn]=useState({}),[newIds,setNewIds]=useState({}),[ready,setReady]=useState(false),[hyd,setHyd]=useState(false),[noteView,setNoteView]=useState(null);
 const seen=useRef(null),prefsRef=useRef({}),loadRef=useRef(null),router=useRouter();prefsRef.current=prefs;

 const say=(m,k='info')=>{if(k!='err'&&prefsRef.current.toast===false)return;const id=Math.random().toString(36).slice(2);setToasts(t=>[...t.slice(-3),{id,k,m}]);setTimeout(()=>setToasts(t=>t.filter(x=>x.id!==id)),5200)};
 const note=(kind,title,msg='',items=[])=>{setNotes(x=>[{id:Math.random().toString(36).slice(2),t:Date.now(),kind,title,msg,items:items.slice(0,30),read:false},...x].slice(0,40));say(title+(msg?': '+msg:''),'ok');setShake(true);setTimeout(()=>setShake(false),900);
  try{if(prefsRef.current.browser&&typeof Notification!=='undefined'&&Notification.permission==='granted'&&document.visibilityState!=='visible')new Notification(title,{body:msg})}catch(e){}};
 const api=async(u,b)=>{const {data}=await sb.auth.getSession();const tk=data.session?.access_token;if(!tk){router.replace('/login');throw new Error('Please log in again.')}const r=await fetch(u,{method:b?'POST':'GET',body:b&&JSON.stringify(b),headers:{'Content-Type':'application/json',Authorization:'Bearer '+tk}});if(r.status===401){throw new Error('Your session expired or this account is not allowed. Please log in again.')}const t=await r.text();try{return JSON.parse(t)}catch{throw new Error('Server error ('+r.status+'). '+t.replace(/<[^>]+>/g,' ').slice(0,90))}};
 const load=async(quiet,silent)=>{try{
  const [drafts,leads,calls,s]=await Promise.all([api('/api/drafts'),api('/api/leads'),api('/api/calls').catch(()=>[]),api('/api/settings').catch(()=>({}))]);
  const d=arr(drafts),l=arr(leads);
  if(seen.current&&!silent){const nl=l.filter(x=>!seen.current.l.has(x.id)),nd=d.filter(x=>!seen.current.d.has(x.id));
   if(nl.length)note('lead',nl.length+' new lead'+(nl.length>1?'s':'')+' added',nl.slice(0,2).map(x=>x.name).join(', ')+(nl.length>2?' and more':''),nl.map(x=>x.name));
   if(nd.length)note('draft',nd.length+' new draft'+(nd.length>1?'s':'')+' ready','Review them in Approvals',nd.map(x=>x.leads?.name||'Draft'))}
  seen.current={l:new Set(l.map(x=>x.id)),d:new Set(d.map(x=>x.id))};
  setD({drafts:d,leads:l,calls:arr(calls)});setS(s||{});setOn(true);setLoaded(true)}catch(e){if(!quiet)say(e.message,'err')}};
 loadRef.current=load;
 const run=async(k,fn)=>{setBusy(k);try{await fn();await load(false,true)}catch(e){say(e.message,'err')}setBusy('')};
 const testConn=async()=>{setConn(c=>({...c,loading:true}));try{const r=await api('/api/leadfinder',{action:'check'});if(r.error)throw new Error(r.error);setConn({...r,loading:false,at:Date.now()})}catch(e){setConn(c=>({...c,loading:false,at:Date.now()}));say(e.message,'err')}};

 useEffect(()=>{try{setPrefs(JSON.parse(localStorage.sa_prefs||'{}'));setNotes(JSON.parse(localStorage.sa_notes||'[]'))}catch(e){}setHyd(true);if(!sb){router.replace('/login');return}sb.auth.getSession().then(({data})=>{if(!data.session)router.replace('/login');else{setUser(data.session.user);setOn(true);load()}});const {data:sub}=sb.auth.onAuthStateChange((e,sess)=>{if(!sess)router.replace('/login');else setUser(sess.user)});return()=>sub.subscription.unsubscribe()},[]);
 useEffect(()=>{if(hyd)try{localStorage.sa_prefs=JSON.stringify(prefs)}catch(e){}},[prefs,hyd]);
 useEffect(()=>{if(hyd)try{localStorage.sa_notes=JSON.stringify(notes)}catch(e){}},[notes,hyd]);
 useEffect(()=>{if(!on)return;const t=setInterval(()=>{if(document.visibilityState=='visible')loadRef.current(true,false)},30000);return()=>clearInterval(t)},[on]);
 useEffect(()=>{if(on&&page=='finder'&&!opts.niches.length)api('/api/leadfinder').then(o=>o.niches?setOpts(o):say(o.error||'Add app/api/leadfinder/route.js first','err')).catch(e=>say(e.message,'err'))},[on,page]);
 useEffect(()=>{if(on&&(page=='finder'||page=='settings')&&!conn.at&&!conn.loading)testConn()},[on,page]);
 useEffect(()=>{setReady(false);const t=setTimeout(()=>setReady(true),90);return()=>clearTimeout(t)},[page,loaded]);

 const runFinder=async()=>{
  setSel({});setFr({running:true,msg:'Starting search...',err:''});
  try{
   const niche=fq.niche=='Custom'?fq.custom.trim():fq.niche;if(!niche)throw new Error('Type an industry first.');
   const eff=(src=='apify'&&opts.apify)||(!opts.geo&&opts.apify)?'apify':opts.geo?'geo':null;
   if(!eff)throw new Error('Connect a data source first (see the setup box above).');
   let s;
   if(eff=='apify'){
    const st=await api('/api/leadfinder',{action:'apify_start',niche,country:fq.country,city:fq.city,count:fq.count,mode:fq.mode});if(st.error)throw new Error(st.error);
    let status='RUNNING';const t0=Date.now();
    while(status=='RUNNING'||status=='READY'){await new Promise(r=>setTimeout(r,4000));const x=await api('/api/leadfinder',{action:'apify_status',runId:st.runId});if(x.error)throw new Error(x.error);status=x.status;setFr(p=>({...p,msg:'Searching Google Maps in '+st.city+'... '+Math.round((Date.now()-t0)/1000)+'s'}));if(Date.now()-t0>270000)throw new Error('Taking too long. Try again with fewer leads.')}
    if(status!=='SUCCEEDED')throw new Error('The Apify run ended with status '+status+'. Check your Apify credit and APIFY_TOKEN.');
    setFr(p=>({...p,msg:'Saving leads...'}));
    s=await api('/api/leadfinder',{action:'apify_import',datasetId:st.datasetId,niche,country:fq.country,count:fq.count,mode:fq.mode});
   }else s=await api('/api/leadfinder',{action:'search',niche,country:fq.country,city:fq.city,count:fq.count});
   if(s.error)throw new Error(s.error);
   const n=s.leads.length,em=s.leads.filter(l=>l.email).length,nw=s.leads.filter(l=>noSiteU(grab(l.profile,'Website'))).length;
   setNewIds(Object.fromEntries(s.leads.map(l=>[l.id,1])));
   setFr({running:false,msg:n?n+' new leads added':'',err:n?'':'No new matching businesses found here. Try another city or industry.'});
   if(n)note('lead',n+' new leads found',em+' with email, '+nw+' without a website',s.leads.map(l=>l.name));
   await load(false,true);
  }catch(e){setFr(p=>({...p,running:false,msg:'',err:e.message}));say(e.message,'err')}};
 const addLead=()=>run('addlead',async()=>{const r=await api('/api/leadfinder',{action:'add_lead',...af});if(r.error)throw new Error(r.error);setAf({name:'',phone:'',email:'',address:'',maps:'',niche:''});setAddOpen(false);note('lead','Lead added',af.name)});
 const delLeads=ids=>{if(!ids.length||!window.confirm('Delete '+ids.length+' lead(s)? Their drafts and messages are deleted too.'))return;run('del',async()=>{const r=await api('/api/leadfinder',{action:'delete_leads',ids});if(r.error)throw new Error(r.error);setSel({});say(r.deleted+' lead(s) deleted.','ok')})};
 const openMsg=async l=>{const ch=l.email?'email':'message';setCmp({lead:l,channel:ch,loading:true});try{const r=await api('/api/leadfinder',{action:'draft',channel:ch,lead_ids:[l.id]});if(r.error)throw new Error(r.error);const d=r.drafts[0];setCmp({lead:l,channel:ch,id:d.id,subject:d.subject,body:d.body})}catch(e){setCmp(null);say(e.message,'err')}};
 const sendMail=async()=>{setCmp(c=>({...c,sending:true}));try{const r=await api('/api/drafts',{id:cmp.id,action:'approve',body:cmp.body,subject:cmp.subject});if(r.r=='sent'){setSent(x=>({...x,[cmp.lead.id]:1}));note('sent','Email sent',cmp.lead.name)}else say('Approved: '+r.r);setCmp(null);await load(false,true)}catch(e){setCmp(c=>({...c,sending:false}));say(e.message,'err')}};
 const openWa=async()=>{const d=(cmp.lead.phone||'').replace(/\D/g,'');window.open('https://wa.me/'+d+'?text='+encodeURIComponent(cmp.body),'_blank');try{await api('/api/leadfinder',{action:'mark',lead_id:cmp.lead.id});setSent(x=>({...x,[cmp.lead.id]:1}));note('sent','Marked as contacted',cmp.lead.name)}catch(e){}};
 const draftSel=()=>run('bulk',async()=>{const ids=FL.filter(l=>sel[l.id]&&l.email).map(l=>l.id);if(!ids.length)throw new Error('Select leads that have an email.');const r=await api('/api/leadfinder',{action:'draft',lead_ids:ids});if(r.error)throw new Error(r.error);note('draft',ids.length+' drafts ready','Review them in Approvals');setSel({});setPage('approvals')});
 const exportCsv=()=>{const rows=[['Name','Phone','Email','Website','Location','Google Maps','Score']].concat(FL.map(l=>[l.name,l.phone,l.email,l.site,l.loc,l.maps,l.score]));const b=new Blob([rows.map(r=>r.map(v=>'"'+String(v??'').replace(/"/g,'""')+'"').join(',')).join('\n')],{type:'text/csv'});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='leads.csv';a.click()};
 const runAgent=()=>run('go',async()=>{const r=await api('/api/run');note('agent','Agent run finished','sent '+(r.sent??0)+', follow-ups '+(r.followups??0)+(r.r?' ('+r.r+')':''))});
 const toggleBrowser=async()=>{if(prefs.browser){setPrefs({...prefs,browser:false});return}if(typeof Notification==='undefined'){say('This browser does not support notifications.','err');return}const p=await Notification.requestPermission();if(p==='granted'){setPrefs({...prefs,browser:true});say('Browser notifications are on.','ok')}else say('Permission was not granted.','err')};
 const togglePanel=()=>{if(panel)setNotes(n=>n.map(x=>({...x,read:true})));setPanel(!panel)};
 const openNote=n=>{setNoteView(n);setPanel(false);setNotes(x=>x.map(y=>({...y,read:true})))};
 const goNote=n=>{setPage(n.kind=='lead'?'finder':n.kind=='draft'?'approvals':n.kind=='call'?'calls':'overview');setNoteView(null)};
 const logout=async()=>{await sb.auth.signOut();router.replace('/')};
 const testNote=()=>note('lead','Test notification','If you can see this, alerts are working.');

 const L=D.leads,FA=D.leads.filter(isFinder),cnt=s=>L.filter(l=>l.stage===s).length,paused=!!S.paused,unread=notes.filter(n=>!n.read).length;
 const funnel=[['New',cnt('new')],['Contacted',cnt('contacted')+cnt('messaged')],['Replied',cnt('replied')],['Call booked',cnt('call_booked')],['Won',cnt('won')]],fmax=Math.max(1,...funnel.map(x=>x[1]));
 const avg=D.calls.length?Math.round(D.calls.reduce((a,c)=>a+(c.score||0),0)/D.calls.length):null;
 const kpis=[['Total leads',L.length,'in your database','leads'],['Hot leads',L.filter(l=>l.score>=80).length,'score 80 or higher','zap'],['Awaiting approval',D.drafts.length,'emails to review','approvals'],['Replies',cnt('replied'),'leads who answered','msg'],['Calls booked',cnt('call_booked'),'on your calendar','calls'],['Avg call score',avg===null?'-':avg,D.calls.length+' calls scored','overview']];
 const shown=L.filter(l=>(st=='all'||l.stage===st)&&(!q||[l.name,l.company,l.email].join(' ').toLowerCase().includes(q.toLowerCase())));
 const top=[...L].sort((a,b)=>(b.score||0)-(a.score||0)).slice(0,5);
 const FL=L.filter(isFinder).map(l=>({...l,phone:grab(l.profile,'Phone'),loc:grab(l.profile,'Location'),site:grab(l.profile,'Website'),maps:mapUrl(l)})).filter(l=>(!fo.onlyEmail||l.email)&&(!fo.q||[l.name,l.email,l.phone].join(' ').toLowerCase().includes(fo.q.toLowerCase()))).sort((a,b)=>(b.email?1:0)-(a.email?1:0)||(b.score||0)-(a.score||0));
 const selIds=FL.filter(l=>sel[l.id]).map(l=>l.id),nsel=selIds.length;
 const ap=conn.apify,gp=conn.geo,pct=ap&&ap.max?Math.min(100,Math.round((ap.used||0)/ap.max*100)):0;

 if(!on||!user)return <div className="splash"><span className="spin big"/><p className="sub">Loading your workspace...</p></div>;

 const LeadRows=({rows})=><div className="tw"><table><thead><tr><th>Lead</th><th>Email</th><th>Score</th><th>Stage</th><th>Added</th></tr></thead><tbody>
  {rows.map(l=><tr key={l.id}><td><b>{l.name}</b>{l.company&&l.company!==l.name&&<div className="sub">{l.company}</div>}</td><td className="sub">{l.email||'no email'}</td><td><Score n={l.score}/></td><td><Stage s={l.stage}/></td><td className="sub">{day(l.created_at)}</td></tr>)}
  {!rows.length&&<tr><td colSpan={5} className="empty">No leads yet.</td></tr>}</tbody></table></div>;

 return <div className="app">
  <aside className="side"><div className="brand"><div className="logo">SA</div><div><div>Sales Agent</div><div className="bsub">by Greek Root AI</div></div></div>
   {NAV.map(([k,t])=><button key={k} className={'nav'+(page==k?' on':'')} onClick={()=>setPage(k)}><I d={P[k]}/>{t}{k=='approvals'&&D.drafts.length>0&&<span className="badge">{D.drafts.length}</span>}</button>)}
   <div className="sp"/><div className="foot"><span className="av">{(user.email||'?')[0].toUpperCase()}</span><div className="grow"><b className="ell" style={{display:'block'}}>{user.user_metadata?.name||'My workspace'}</b><div className="sub ell">{user.email}</div></div><button className="ib sm" aria-label="Log out" title="Log out" onClick={logout}><I d={P.out} s={16}/></button></div></aside>
  <main className="main">
   <div className="top"><div><h1>{TITLES[page][0]}</h1><p>{TITLES[page][1]}</p></div>
    <div className="row"><span className={'pill'+(paused?' off':'')}>{paused?'Paused':'Running'}</span>
     <div className="bellw"><button className={'ib'+(shake?' shake':'')} aria-label="Notifications" onClick={togglePanel}><I d={P.bell}/>{unread>0&&<span className="dot">{unread}</span>}</button>
</div>
     <button className="btn" disabled={busy=='go'} onClick={runAgent}>{busy=='go'?'Running...':'Run agent'}</button><button className="ib hide-d" aria-label="Log out" onClick={logout}><I d={P.out}/></button></div></div>
   {busy&&busy!='go'&&<p className="sub" style={{marginBottom:10}}><span className="spin"/> Working, please wait...</p>}

   <div className="pg" key={page}>
   {page=='overview'&&<div className="grid" style={{gap:18}}>
    <div className="hero2"><div><h2>{new Date().getHours()<12?'Good morning':new Date().getHours()<18?'Good afternoon':'Good evening'}, {(user.user_metadata?.name||user.email.split('@')[0]).split(' ')[0]}</h2><p>{D.drafts.length} draft{D.drafts.length==1?'':'s'} waiting and {L.filter(l=>Date.now()-new Date(l.created_at)<6048e5).length} new lead{L.filter(l=>Date.now()-new Date(l.created_at)<6048e5).length==1?'':'s'} this week.</p></div><div className="row"><button className="btn p" onClick={()=>setPage('finder')}>Find leads</button><button className="btn" onClick={()=>setPage('approvals')}>Review drafts</button></div></div>
    <div className="grid g3">{kpis.map(([l,v,s,ic],i)=><div className="card kpi" key={l}><span className={'kic t'+i}><I d={P[ic]||P.leads}/></span><div><div className="l">{l}</div>{loaded?<div className="v"><Count to={v}/></div>:<div className="sk" style={{marginTop:6}}/>}<div className="s">{s}</div></div></div>)}</div>
    <div className="grid g2">
     <div className="card"><h3>Pipeline</h3>{funnel.map(([n,v])=><div className="fn" key={n}><span>{n}</span><div className="bar"><i style={{width:(ready?v/fmax*100:0)+'%'}}/></div><b>{v}</b></div>)}</div>
     <div className="card"><h3>Needs your attention<button className="btn sm" onClick={()=>setPage('approvals')}>Review all</button></h3>
      {D.drafts.slice(0,4).map(d=><div key={d.id} style={{padding:'8px 0',borderBottom:'1px solid var(--line)'}}><b>{d.leads?.name}</b> <span className="sub">· {d.kind}</span><div className="sub">{d.why}</div></div>)}
      {!D.drafts.length&&<div className="empty">Nothing waiting. You are all caught up.</div>}</div></div>
    <div className="grid g2">
     <div className="card"><h3>Top leads<button className="btn sm" onClick={()=>setPage('leads')}>View all</button></h3><LeadRows rows={top}/></div>
     <div className="card"><h3>Recent activity</h3>{notes.slice(0,6).map(n=><div key={n.id} className="ni" style={{padding:'10px 0',borderBottom:'1px solid var(--line)'}}><span className="ico"><I d={P[n.kind=='lead'?'finder':n.kind=='sent'?'mail':n.kind=='draft'?'approvals':'zap']} s={16}/></span><div className="grow"><b>{n.title}</b>{n.msg&&<div className="sub">{n.msg}</div>}</div><span className="sub">{ago(n.t)}</span></div>)}
      {!notes.length&&<div className="empty">Activity appears here as your agent works.</div>}</div></div></div>}

   {page=='finder'&&<div className="grid" style={{gap:16}}>
    <div className="grid g4">{[['Leads found',FA.length,'finder'],['With email',FA.filter(l=>l.email).length,'mail'],['No website',FA.filter(l=>noSiteU(grab(l.profile,'Website'))).length,'zap'],['With phone',FA.filter(l=>grab(l.profile,'Phone')).length,'calls']].map(([l,v,ic],i)=><div className="card kpi sm" key={l}><span className={'kic t'+i}><I d={P[ic]}/></span><div><div className="l">{l}</div><div className="v"><Count to={v}/></div></div></div>)}</div>
    {opts.niches.length>0&&!opts.apify&&!opts.geo&&<div className="card"><h3>Connect a data source (free, 2 minutes)</h3>
     <p className="sub">The finder needs one free key. Recommended: <b>Apify</b> (real Google Maps data).</p>
     <ol className="sub" style={{margin:'8px 0 0 18px',padding:0}}><li>Create a free account at apify.com ($5 credit every month).</li><li>Open Settings, then API and integrations, and copy your token.</li><li>Add <b>APIFY_TOKEN=your_token</b> to .env.local and to Vercel, then restart or redeploy.</li></ol>
     <p className="sub" style={{marginTop:8}}>Alternative: a free <b>GEOAPIFY_KEY</b> from myprojects.geoapify.com (no card).</p></div>}
    <div className="card"><h3><span>Find businesses</span><span className="row"><span className="sub">Apify</span><Chip st={ap}/>{gp&&gp.set&&<><span className="sub">Geoapify</span><Chip st={gp}/></>}</span></h3>
     <div className="fgrid">
      {opts.apify&&opts.geo&&<label>Data source<select value={src} onChange={e=>setSrc(e.target.value)}><option value="apify">Google Maps (Apify, best)</option><option value="geo">Free map data (Geoapify)</option></select></label>}
      <label>Industry<select value={fq.niche} onChange={e=>setFq({...fq,niche:e.target.value})}>{[...opts.niches,...(opts.apify?['Custom']:[])].map(n=><option key={n}>{n}</option>)}</select></label>
      {fq.niche=='Custom'&&<label>Custom industry<input placeholder="e.g. solar installer" value={fq.custom} onChange={e=>setFq({...fq,custom:e.target.value})}/></label>}
      <label>Country<select value={fq.country} onChange={e=>setFq({...fq,country:e.target.value,city:'Any city'})}>{Object.keys(opts.countries).map(c=><option key={c}>{c}</option>)}</select></label>
      <label>City<select value={fq.city} onChange={e=>setFq({...fq,city:e.target.value})}>{['Any city',...arr(opts.countries[fq.country])].map(c=><option key={c}>{c}</option>)}</select></label>
      <label>How many leads<select value={fq.count} onChange={e=>setFq({...fq,count:+e.target.value})}>{[10,20,30,40,50].map(n=><option key={n} value={n}>{n} leads</option>)}</select></label>
      {opts.apify&&<label>Lead type<select value={fq.mode} onChange={e=>setFq({...fq,mode:e.target.value})}><option value="mixed">No website first, then fill up (more emails)</option><option value="strict">Only businesses without a website</option></select></label>}
     </div>
     <div className="row" style={{marginTop:14}}><button className="btn p" disabled={fr.running||!(opts.apify||opts.geo)} onClick={runFinder}>{fr.running?'Searching...':'Find leads'}</button><span className="sub">{fr.msg}</span></div>
     {fr.running&&<div className="prog"><i className="ind"/></div>}
     {fr.err&&<p style={{color:'var(--bad)',marginTop:10}}>{fr.err}</p>}
     <p className="sub" style={{marginTop:10}}>Every lead has a phone or email and a Google Maps link. Businesses without a website come first, then those with an email. A search takes 30 to 90 seconds.</p></div>
    <div className="card"><h3><span>Your leads ({FL.length}) <span className="sub">· {FL.filter(l=>l.email).length} with email · {FL.filter(l=>noSiteU(l.site)).length} without a website</span></span>
      <span className="row"><button className="btn sm" onClick={()=>setAddOpen(!addOpen)}>{addOpen?'Close':'Add lead'}</button><button className="btn sm" disabled={!FL.length} onClick={exportCsv}>Export CSV</button>
       <button className="btn sm danger" disabled={!nsel||busy=='del'} onClick={()=>delLeads(selIds)}>Delete ({nsel})</button><button className="btn p sm" disabled={!nsel||busy=='bulk'} onClick={draftSel}>{busy=='bulk'?'Writing...':'Draft emails ('+nsel+')'}</button></span></h3>
     {addOpen&&<div className="det" style={{marginBottom:14}}><div className="fgrid">
       <label>Business name *<input value={af.name} onChange={e=>setAf({...af,name:e.target.value})}/></label><label>Phone<input placeholder="+49 30 123456" value={af.phone} onChange={e=>setAf({...af,phone:e.target.value})}/></label>
       <label>Email<input value={af.email} onChange={e=>setAf({...af,email:e.target.value})}/></label><label>Address or city<input value={af.address} onChange={e=>setAf({...af,address:e.target.value})}/></label>
       <label>Google Maps URL (optional)<input value={af.maps} onChange={e=>setAf({...af,maps:e.target.value})}/></label><label>Industry (optional)<input value={af.niche} onChange={e=>setAf({...af,niche:e.target.value})}/></label></div>
      <div><button className="btn p" disabled={busy=='addlead'} onClick={addLead}>{busy=='addlead'?'Saving...':'Save lead'}</button></div></div>}
     <div className="bar2"><input placeholder="Search name, email or phone" value={fo.q} onChange={e=>setFo({...fo,q:e.target.value})}/>
      <label className="row sub"><input type="checkbox" className="chk" checked={fo.onlyEmail} onChange={e=>setFo({...fo,onlyEmail:e.target.checked})}/>Only with email</label></div>
     <div className="tw"><table><thead><tr><th><input type="checkbox" className="chk" checked={FL.length>0&&nsel==FL.length} onChange={e=>setSel(e.target.checked?Object.fromEntries(FL.map(l=>[l.id,true])):{})}/></th><th>Business</th><th>Phone</th><th>Email</th><th>Website</th><th>Google Maps</th><th>Score</th><th></th></tr></thead><tbody>
      {FL.map(l=><tr key={l.id} className={newIds[l.id]?'flash':''}><td><input type="checkbox" className="chk" checked={!!sel[l.id]} onChange={e=>setSel({...sel,[l.id]:e.target.checked})}/></td>
       <td><b>{l.name}</b><div className="sub">{l.loc}</div></td>
       <td>{l.phone?<a href={'tel:'+l.phone.replace(/[^+\d]/g,'')}>{l.phone}</a>:<span className="sub">no phone</span>}</td>
       <td>{l.email?<a href={'mailto:'+l.email}>{l.email}</a>:<span className="sub">no email</span>}</td>
       <td><Site u={l.site}/></td><td><a href={l.maps} target="_blank" rel="noreferrer">Open in Maps</a></td><td><Score n={l.score}/></td>
       <td><div className="row">{sent[l.id]||['contacted','messaged','replied','call_booked','won'].includes(l.stage)?<span className="tag">{sent[l.id]?'contacted':l.stage.replace('_',' ')}</span>:<button className="btn sm" onClick={()=>openMsg(l)}>{l.email?'Write email':'Write message'}</button>}<button className="btn sm danger" onClick={()=>delLeads([l.id])}>Delete</button></div></td></tr>)}
      {!FL.length&&<tr><td colSpan={8} className="empty">No leads yet. Run a search above or add one manually.</td></tr>}</tbody></table></div></div>
   </div>}

   {page=='leads'&&<div className="grid" style={{gap:16}}>
    <div className="card"><h3>Add lead with AI scoring<button className="btn sm" onClick={()=>setShowAdd(!showAdd)}>{showAdd?'Close':'Add lead'}</button></h3>
     {showAdd?<div className="grid"><div className="row"><input style={{flex:1}} placeholder="Name" value={f.name} onChange={e=>setF({...f,name:e.target.value})}/><input style={{flex:1}} placeholder="Business email" value={f.email} onChange={e=>setF({...f,email:e.target.value})}/><input style={{flex:1}} placeholder="Company" value={f.company} onChange={e=>setF({...f,company:e.target.value})}/></div>
      <textarea rows={4} placeholder="Paste their profile, bio, recent posts, hiring or funding news" value={f.profile} onChange={e=>setF({...f,profile:e.target.value})}/>
      <div><button className="btn p" disabled={busy=='add'} onClick={()=>run('add',async()=>{await api('/api/leads',f);setF({name:'',email:'',company:'',profile:''});setShowAdd(false);note('lead','Lead scored and saved',f.name)})}>{busy=='add'?'Scoring...':'Score and save'}</button></div></div>:<p className="sub">Paste a prospect's profile and the AI scores it and drafts an email.</p>}</div>
    <div className="card"><div className="bar2"><input placeholder="Search name, company or email" value={q} onChange={e=>setQ(e.target.value)}/>
     <select value={st} onChange={e=>setSt(e.target.value)}>{['all','new','contacted','messaged','replied','call_booked','won','nurture','skipped','closed'].map(s=><option key={s} value={s}>{s.replace('_',' ')}</option>)}</select></div>
     <div className="tw"><table><thead><tr><th>Lead</th><th>Email</th><th>Score</th><th>Stage</th><th>Added</th></tr></thead><tbody>
      {shown.map(l=><Fragment key={l.id}><tr className="c" onClick={()=>setOpen(open===l.id?null:l.id)}><td><b>{l.name}</b>{l.company&&l.company!==l.name&&<div className="sub">{l.company}</div>}</td><td className="sub">{l.email||'no email'}</td><td><Score n={l.score}/></td><td><Stage s={l.stage}/></td><td className="sub">{day(l.created_at)}</td></tr>
       {open===l.id&&<tr><td colSpan={5}><div className="det">{l.explanation&&<p>{l.explanation}</p>}{l.signals&&<p className="sub">Signals: {[].concat(l.signals).join(', ')}</p>}
        {rep[l.id]==null?<div className="row"><button className="btn sm" onClick={()=>setRep({...rep,[l.id]:''})}>Paste their reply</button><button className="btn sm danger" onClick={()=>delLeads([l.id])}>Delete lead</button></div>
         :<><textarea rows={4} placeholder="Paste the lead's reply here" value={rep[l.id]} onChange={e=>setRep({...rep,[l.id]:e.target.value})}/><div><button className="btn p sm" disabled={busy==l.id} onClick={()=>run(l.id,async()=>{await api('/api/reply',{lead_id:l.id,text:rep[l.id]});setRep({...rep,[l.id]:null});note('draft','Reply drafted','Check Approvals')})}>Draft my reply</button></div></>}</div></td></tr>}</Fragment>)}
      {!shown.length&&<tr><td colSpan={5} className="empty">No leads yet.</td></tr>}</tbody></table></div></div></div>}

   {page=='approvals'&&<div className="grid" style={{gap:14}}>
    {D.drafts.map(x=><div className="card dr" key={x.id}>
     <div className="h"><div><b>{x.leads?.name}</b> <span className="sub">· {x.leads?.email||'no email'}</span><div className="sub">{x.why}</div></div><div className="row"><Stage s={x.kind}/><Score n={x.leads?.score}/></div></div>
     <input defaultValue={x.subject} onChange={e=>setEd({...ed,[x.id+'s']:e.target.value})}/>
     <textarea rows={8} defaultValue={x.body} onChange={e=>setEd({...ed,[x.id]:e.target.value})}/>
     <div className="acts"><button className="btn" onClick={()=>run(x.id,()=>api('/api/drafts',{id:x.id,action:'skip'}))}>Skip</button>
      <button className="btn p" disabled={busy==x.id} onClick={()=>run(x.id,async()=>{const r=await api('/api/drafts',{id:x.id,action:'approve',body:ed[x.id],subject:ed[x.id+'s']});if(r.r=='sent')note('sent','Email sent',x.leads?.name);else say('Approved: '+r.r)})}>Approve and send</button></div></div>)}
    {!D.drafts.length&&<div className="card empty">No drafts waiting for approval.</div>}</div>}

   {page=='calls'&&<div className="grid g2" style={{alignItems:'start'}}>
    <div className="grid" style={{gap:14}}>{D.calls.map(c=><div className="card" key={c.id}><h3><span>{c.leads?.name||'Call'}</span><span><Score n={c.score}/> <span className="sub">{c.result?.verdict}</span></span></h3>
      {arr(c.result?.summary).map((s,i)=><p className="sub" key={i}>• {s}</p>)}
      {arr(c.result?.fix).length>0&&<><p style={{fontWeight:600,margin:'12px 0 4px'}}>Fix next time</p>{c.result.fix.map((x,i)=><p className="sub" key={i}>• {x.issue}. Say: "{x.say_instead}"</p>)}</>}</div>)}
     {!D.calls.length&&<div className="card empty">No calls scored yet.</div>}</div>
    <div className="card"><h3>Score a call</h3><div className="grid" style={{gap:10}}>
     <select value={ct.lead_id} onChange={e=>setCt({...ct,lead_id:e.target.value})}><option value="">Which lead?</option>{L.map(l=><option key={l.id} value={l.id}>{l.name}</option>)}</select>
     <textarea rows={10} placeholder="Paste the call transcript" value={ct.transcript} onChange={e=>setCt({...ct,transcript:e.target.value})}/>
     <button className="btn p" disabled={busy=='call'||!ct.transcript} onClick={()=>run('call',async()=>{const r=await api('/api/calls',ct);setCt({lead_id:'',transcript:''});note('call','Call scored',(r.score??'')+'/100')})}>{busy=='call'?'Scoring...':'Score call'}</button></div></div></div>}

   {page=='settings'&&<div className="grid" style={{gap:16}}>
    <div className="grid g3">
     <div className="card sstat"><span className="ico t1"><I d={P.zap}/></span><div><div className="sub">Agent</div><b>{paused?'Paused':'Running'}</b></div></div>
     <div className="card sstat"><span className="ico t0"><I d={P.plug}/></span><div><div className="sub">Data source</div><b>{ap&&ap.ok?'Apify connected':gp&&gp.ok?'Geoapify connected':'Not connected'}</b></div></div>
     <div className="card sstat"><span className="ico t3"><I d={P.bell}/></span><div><div className="sub">Alerts</div><b>{prefs.toast===false&&!prefs.browser?'Muted':prefs.browser?'In-app + browser':'In-app'}</b></div></div></div>
    <div className="sgrid">
     <div className="card sbox"><div className="sh"><span className="ico t0"><I d={P.zap}/></span><div><h3>Automation</h3><p className="sub">What your agent does on its own.</p></div></div>
      {SETTINGS.filter(([k])=>k=='paused'||k in S).map(([k,t,d])=><div className="srow" key={k}><div className="grow"><b>{t}</b><div className="sub">{d}</div></div>
       <button className={'sw'+(S[k]?' on':'')} aria-label={t} onClick={()=>run(k,()=>api('/api/settings',{key:k,value:!S[k],[k]:!S[k]}))}/></div>)}</div>
     <div className="card sbox"><div className="sh"><span className="ico t3"><I d={P.bell}/></span><div><h3>Notifications</h3><p className="sub">Be told when leads arrive and emails go out.</p></div></div>
      <div className="srow"><div className="grow"><b>In-app popups</b><div className="sub">A popup for every event.</div></div><button className={'sw'+(prefs.toast!==false?' on':'')} aria-label="Popups" onClick={()=>setPrefs({...prefs,toast:prefs.toast===false})}/></div>
      <div className="srow"><div className="grow"><b>Browser notifications</b><div className="sub">System alerts while this tab is in the background.</div></div><button className={'sw'+(prefs.browser?' on':'')} aria-label="Browser notifications" onClick={toggleBrowser}/></div>
      <div className="srow"><div className="grow"><b>Test your alerts</b><div className="sub">Sends a sample notification now.</div></div><button className="btn sm" onClick={testNote}>Send test</button></div></div>
     <div className="card sbox"><div className="sh"><span className="ico t4"><I d={P.plug}/></span><div className="grow"><h3>Connections</h3><p className="sub">Keys are read from your environment variables.</p></div><button className="btn sm" disabled={conn.loading} onClick={testConn}>{conn.loading?'Testing...':'Test'}</button></div>
      <div className="srow"><div className="grow"><b>Apify</b><div className="sub">{ap&&ap.ok?'Connected'+(ap.user?' as '+ap.user:''):ap&&ap.set?'Key rejected. Check APIFY_TOKEN.':'Add APIFY_TOKEN, then restart.'}</div>
        {ap&&ap.ok&&ap.max>0&&<><div className="meter"><i style={{width:pct+'%'}}/></div><div className="sub">${Number(ap.used||0).toFixed(2)} of ${ap.max} used this month</div></>}</div><Chip st={ap}/></div>
      <div className="srow"><div className="grow"><b>Geoapify</b><div className="sub">{gp&&gp.ok?'Connected':gp&&gp.set?'Key rejected. Check GEOAPIFY_KEY.':'Optional free backup.'}</div></div><Chip st={gp}/></div></div>
     <div className="card sbox"><div className="sh"><span className="ico t5"><I d={P.out}/></span><div><h3>Account</h3><p className="sub">This device and workspace.</p></div></div>
      <div className="srow"><span className="av">{(user.email||'?')[0].toUpperCase()}</span><div className="grow"><b>{user.user_metadata?.name||'My workspace'}</b><div className="sub ell">{user.email}</div></div><button className="btn sm" onClick={logout}>Log out</button></div>
      <div className="srow"><div className="grow"><b>Version</b><div className="sub">Sales Agent MVP</div></div><span className="chip">v1.0</span></div></div></div></div>}
   </div>
  </main>
  <div className="toasts">{toasts.map(t=><div key={t.id} className={'toast '+t.k}>{t.m}</div>)}</div>
  {noteView&&<div className="ovl" onClick={()=>setNoteView(null)}><div className="modal card nv" onClick={e=>e.stopPropagation()}>
   <div className="row" style={{gap:12,flexWrap:'nowrap'}}><span className={'ico k-'+noteView.kind}><I d={P[noteView.kind=='lead'?'finder':noteView.kind=='sent'?'mail':noteView.kind=='draft'?'approvals':'zap']} s={18}/></span><div className="grow"><h3 style={{margin:0}}>{noteView.title}</h3><div className="sub">{ago(noteView.t)}</div></div></div>
   {noteView.msg&&<p>{noteView.msg}</p>}
   {arr(noteView.items).length>0&&<ul>{noteView.items.map((x,i)=><li key={i}>{x}</li>)}</ul>}
   <div className="acts"><button className="btn" onClick={()=>setNoteView(null)}>Close</button><button className="btn p" onClick={()=>goNote(noteView)}>{noteView.kind=='lead'?'Open lead finder':noteView.kind=='draft'?'Open approvals':noteView.kind=='call'?'Open calls':'Open overview'}</button></div></div></div>}
  {cmp&&<div className="ovl" onClick={()=>setCmp(null)}><div className="modal card" onClick={e=>e.stopPropagation()}>
   <h3><span>{cmp.channel=='email'?'Email to ':'Message to '}{cmp.lead.name}</span><span className="sub">{cmp.channel=='email'?cmp.lead.email:cmp.lead.phone}</span></h3>
   {cmp.loading?<p className="sub"><span className="spin"/> Writing your {cmp.channel=='email'?'email':'message'}...</p>:<>
    {cmp.channel=='email'&&<input value={cmp.subject||''} onChange={e=>setCmp({...cmp,subject:e.target.value})}/>}
    <textarea rows={10} value={cmp.body||''} onChange={e=>setCmp({...cmp,body:e.target.value})}/>
    {cmp.channel!='email'&&<p className="sub">Opens WhatsApp with this text ready. If the number has no country code (+...), WhatsApp may not find it, so call them instead.</p>}
    <div className="acts"><button className="btn" onClick={()=>setCmp(null)}>Close</button>
     {cmp.channel=='email'?<button className="btn p" disabled={cmp.sending} onClick={sendMail}>{cmp.sending?'Sending...':'Send now'}</button>
      :<><button className="btn" onClick={()=>{navigator.clipboard?.writeText(cmp.body);say('Copied.','ok')}}>Copy</button><button className="btn p" disabled={!cmp.lead.phone} onClick={openWa}>Open WhatsApp</button></>}</div></>}
  </div></div>}
 </div>}