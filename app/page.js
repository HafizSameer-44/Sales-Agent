'use client';
import {Fragment,useState,useEffect,useRef} from 'react';

const NAV=[
 ['overview','Overview','M3 3h7v9H3zM14 3h7v5h-7zM14 12h7v9h-7zM3 16h7v5H3z'],
 ['finder','AI Lead Finder','M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9zM19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9z'],
 ['leads','Leads','M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8'],
 ['approvals','Approvals','M22 11.1V12a10 10 0 1 1-5.9-9.1M22 4 12 14l-3-3'],
 ['calls','Calls','M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z'],
 ['settings','Settings','M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6'],
];
const TITLES={overview:['Overview','Your pipeline at a glance'],finder:['AI Lead Finder','Find real businesses with verified emails and contact them'],leads:['Leads','Find, score and manage prospects'],approvals:['Approvals','Review emails before they go out'],calls:['Calls','Score your sales calls and get coaching'],settings:['Settings','Control how your agent works']};
const SETTINGS=[['paused','Pause agent','Stops all sending and automation instantly.'],['auto_find','Auto-find leads','Search new leads every day (USA, Europe, Pakistan).'],['auto_first','Auto-send first emails and follow-ups','Sends without waiting for your approval.'],['auto_reply','Auto-reply to leads','Replies that need you are always held back.']];
const I=({d,s=18})=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={d}/></svg>;
const arr=x=>Array.isArray(x)?x:[];
const cls=n=>n>=80?'hi':n>=60?'mid':'lo';
const Score=({n})=><span className={'sc '+cls(n)}>{n??'-'}</span>;
const Stage=({s})=><span className="tag">{(s||'new').replace('_',' ')}</span>;
const day=x=>x?new Date(x).toLocaleDateString(undefined,{month:'short',day:'numeric'}):'';

export default function Page(){
 const [pw,setPw]=useState(''),[on,setOn]=useState(false),[page,setPage]=useState('overview'),[D,setD]=useState({drafts:[],leads:[],calls:[]}),[S,setS]=useState({}),
  [ed,setEd]=useState({}),[rep,setRep]=useState({}),[q,setQ]=useState(''),[st,setSt]=useState('all'),[open,setOpen]=useState(null),[fd,setFd]=useState({niche:'',city:''}),
  [f,setF]=useState({name:'',email:'',company:'',profile:''}),[showAdd,setShowAdd]=useState(false),[ct,setCt]=useState({lead_id:'',transcript:''}),[busy,setBusy]=useState(''),[toast,setToast]=useState(''),[opts,setOpts]=useState({niches:[],countries:{}}),[fq,setFq]=useState({niche:'Real estate',custom:'',country:'United States',city:'Any city',count:20}),[fr,setFr]=useState({running:false,msg:'',checked:0,total:0,found:[],stats:{noEmail:0,badDomain:0},err:''}),[sel,setSel]=useState({}),[cmp,setCmp]=useState(null),[sent,setSent]=useState({}),[src,setSrc]=useState('apify');
 const stopRef=useRef(false);
 const say=m=>{setToast(m);setTimeout(()=>setToast(''),4500)};
 const api=async(u,b)=>{const r=await fetch(u,{method:b?'POST':'GET',body:b&&JSON.stringify(b),headers:{'Content-Type':'application/json','x-passcode':localStorage.pw||''}});if(r.status===401){delete localStorage.pw;setOn(false);throw new Error('Wrong passcode')}const t=await r.text();try{return JSON.parse(t)}catch{throw new Error('Server error ('+r.status+'). '+t.replace(/<[^>]+>/g,' ').slice(0,90))}};
 const load=async()=>{try{const [drafts,leads,calls,s]=await Promise.all([api('/api/drafts'),api('/api/leads'),api('/api/calls').catch(()=>[]),api('/api/settings').catch(()=>({}))]);setD({drafts:arr(drafts),leads:arr(leads),calls:arr(calls)});setS(s||{});setOn(true)}catch(e){say(e.message)}};
 useEffect(()=>{if(localStorage.pw)load()},[]);
 useEffect(()=>{if(on&&page=='finder'&&!opts.niches.length)api('/api/leadfinder').then(o=>o.niches?setOpts(o):say(o.error||'Add app/api/leadfinder/route.js first')).catch(e=>say(e.message))},[on,page]);
 const run=async(k,fn)=>{setBusy(k);try{await fn();await load()}catch(e){say(e.message)}setBusy('')};


 const runFinder=async()=>{
  setSel({});setFr({running:true,msg:'Searching... usually 5 to 20 seconds',found:[],stats:{noEmail:0,badDomain:0},err:''});
  try{
   const niche=fq.niche=='Custom'?fq.custom:fq.niche;if(!niche)throw new Error('Type an industry first');
   let s;
   if(opts.apify&&src=='apify'){
    const st=await api('/api/leadfinder',{action:'apify_start',niche,country:fq.country,city:fq.city,count:fq.count});if(st.error)throw new Error(st.error);
    let status='RUNNING';const t0=Date.now();
    while(status=='RUNNING'||status=='READY'){await new Promise(r=>setTimeout(r,4000));const x=await api('/api/leadfinder',{action:'apify_status',runId:st.runId});if(x.error)throw new Error(x.error);status=x.status;setFr(p=>({...p,msg:'Google Maps search running in '+st.city+'... '+Math.round((Date.now()-t0)/1000)+'s'}));if(Date.now()-t0>240000)throw new Error('Taking too long. Try again with fewer leads.')}
    if(status!=='SUCCEEDED')throw new Error('Apify run '+status+'. Check your APIFY_TOKEN and Apify credit.');
    s=await api('/api/leadfinder',{action:'apify_import',datasetId:st.datasetId,niche,country:fq.country,count:fq.count});
   }else s=await api('/api/leadfinder',{action:'search',niche,country:fq.country,city:fq.city,count:fq.count});
   if(s.error)throw new Error(s.error);
   setFr({running:false,msg:s.leads.length?s.leads.length+' new leads saved ('+s.pool+' matches found in '+s.cities.join(', ')+')':'',found:s.leads,stats:{noEmail:0,badDomain:0},err:s.leads.length?'':'No new businesses without a website found here. Try another city or industry.'});load();
  }catch(e){setFr(p=>({...p,running:false,msg:'',err:e.message}))}};
 const openMsg=async l=>{const ch=l.email?'email':'message';setCmp({lead:l,channel:ch,loading:true});try{const r=await api('/api/leadfinder',{action:'draft',channel:ch,lead_ids:[l.id]});if(r.error)throw new Error(r.error);const d=r.drafts[0];setCmp({lead:l,channel:ch,id:d.id,subject:d.subject,body:d.body})}catch(e){setCmp(null);say(e.message)}};
 const sendMail=async()=>{setCmp(c=>({...c,sending:true}));try{const r=await api('/api/drafts',{id:cmp.id,action:'approve',body:cmp.body,subject:cmp.subject});if(r.r=='sent')setSent(x=>({...x,[cmp.lead.id]:1}));say(r.r=='sent'?'Email sent.':'Approved: '+r.r);setCmp(null);load()}catch(e){setCmp(c=>({...c,sending:false}));say(e.message)}};
 const openWa=async()=>{const d=(cmp.lead.phone||'').replace(/\D/g,'');window.open('https://wa.me/'+d+'?text='+encodeURIComponent(cmp.body),'_blank');try{await api('/api/leadfinder',{action:'mark',lead_id:cmp.lead.id});setSent(x=>({...x,[cmp.lead.id]:1}))}catch(e){}};
 const draftSel=()=>run('bulk',async()=>{const ids=fr.found.filter(l=>sel[l.id]&&l.email).map(l=>l.id);if(!ids.length)throw new Error('Select leads that have an email.');const r=await api('/api/leadfinder',{action:'draft',lead_ids:ids});if(r.error)throw new Error(r.error);say(ids.length+' drafts ready. Review them in Approvals.');setSel({});setPage('approvals')});
 const exportCsv=()=>{const rows=[['Name','Email','Website','Phone','Address','Country','Score']].concat(fr.found.map(l=>[l.name,l.email,l.website,l.phone,l.address,l.country,l.score]));const b=new Blob([rows.map(r=>r.map(v=>'"'+String(v??'').replace(/"/g,'""')+'"').join(',')).join('\n')],{type:'text/csv'});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='leads.csv';a.click()};
 const foundSorted=[...fr.found].sort((a,b)=>(b.score||0)-(a.score||0)),nsel=Object.keys(sel).filter(k=>sel[k]).length;

 if(!on)return <div className="login"><div className="card"><div className="brand" style={{padding:0}}><div className="logo">SA</div>Sales Agent</div><p className="sub">Enter your passcode to continue.</p>
  <input type="password" placeholder="Passcode" value={pw} onChange={e=>setPw(e.target.value)} onKeyDown={e=>e.key=='Enter'&&(localStorage.pw=pw,load())}/><button className="btn p" onClick={()=>{localStorage.pw=pw;load()}}>Unlock</button>{toast&&<p className="sub">{toast}</p>}</div></div>;

 const L=D.leads,cnt=s=>L.filter(l=>l.stage===s).length,paused=!!S.paused;
 const funnel=[['New',cnt('new')],['Contacted',cnt('contacted')],['Replied',cnt('replied')],['Call booked',cnt('call_booked')],['Won',cnt('won')]],fmax=Math.max(1,...funnel.map(x=>x[1]));
 const avg=D.calls.length?Math.round(D.calls.reduce((a,c)=>a+(c.score||0),0)/D.calls.length):null;
 const kpis=[['Total leads',L.length,'in your database'],['Hot leads',L.filter(l=>l.score>=80).length,'score 80 or higher'],['Awaiting approval',D.drafts.length,'emails to review'],['Replies',cnt('replied'),'leads who answered'],['Calls booked',cnt('call_booked'),'on your calendar'],['Avg call score',avg===null?'-':avg+'/100',D.calls.length+' calls scored']];
 const shown=L.filter(l=>(st=='all'||l.stage===st)&&(!q||[l.name,l.company,l.email].join(' ').toLowerCase().includes(q.toLowerCase())));
 const top=[...L].sort((a,b)=>(b.score||0)-(a.score||0)).slice(0,5);

 const LeadRows=({rows,expand})=><div className="tw"><table><thead><tr><th>Lead</th><th>Email</th><th>Score</th><th>Stage</th><th>Added</th></tr></thead><tbody>
  {rows.map(l=><Fragment key={l.id}><tr className={expand?'c':''} onClick={()=>expand&&setOpen(open===l.id?null:l.id)}>
   <td><b>{l.name}</b>{l.company&&l.company!==l.name&&<div className="sub">{l.company}</div>}</td><td className="sub">{l.email||'no email'}</td><td><Score n={l.score}/></td><td><Stage s={l.stage}/></td><td className="sub">{day(l.created_at)}</td></tr>
   {expand&&open===l.id&&<tr><td colSpan={5}><div className="det">
    {l.explanation&&<p>{l.explanation}</p>}{l.signals&&<p className="sub">Signals: {[].concat(l.signals).join(', ')}</p>}
    {rep[l.id]==null?<div><button className="btn sm" onClick={()=>setRep({...rep,[l.id]:''})}>Paste their reply</button></div>
     :<><textarea rows={4} placeholder="Paste the lead's reply here" value={rep[l.id]} onChange={e=>setRep({...rep,[l.id]:e.target.value})}/>
      <div><button className="btn p sm" disabled={busy==l.id} onClick={()=>run(l.id,async()=>{await api('/api/reply',{lead_id:l.id,text:rep[l.id]});setRep({...rep,[l.id]:null});say('Reply drafted. Check Approvals.')})}>Draft my reply</button></div></>}
   </div></td></tr>}</Fragment>)}
  {!rows.length&&<tr><td colSpan={5} className="empty">No leads yet.</td></tr>}</tbody></table></div>;

 return <div className="app">
  <aside className="side"><div className="brand"><div className="logo">SA</div>Sales Agent</div>
   {NAV.map(([k,t,d])=><button key={k} className={'nav'+(page==k?' on':'')} onClick={()=>setPage(k)}><I d={d}/>{t}{k=='approvals'&&D.drafts.length>0&&<span className="badge">{D.drafts.length}</span>}</button>)}
   <div className="sp"/><div className="foot">Greek Root AI</div></aside>
  <main className="main">
   <div className="top"><div><h1>{TITLES[page][0]}</h1><p>{TITLES[page][1]}</p></div>
    <div className="row"><span className={'pill'+(paused?' off':'')}>{paused?'Paused':'Running'}</span>
     <button className="btn" disabled={busy=='go'} onClick={()=>run('go',async()=>{const r=await api('/api/run');say('Agent run: '+JSON.stringify(r).slice(0,120))})}>{busy=='go'?'Running...':'Run agent'}</button></div></div>
   {busy&&busy!='go'&&<p className="sub" style={{marginBottom:10}}>Working, please wait...</p>}

   {page=='overview'&&<div className="grid" style={{gap:18}}>
    <div className="grid g3">{kpis.map(([l,v,s])=><div className="card kpi" key={l}><div className="l">{l}</div><div className="v">{v}</div><div className="s">{s}</div></div>)}</div>
    <div className="grid g2">
     <div className="card"><h3>Pipeline</h3>{funnel.map(([n,v])=><div className="fn" key={n}><span>{n}</span><div className="bar"><i style={{width:(v/fmax*100)+'%'}}/></div><b>{v}</b></div>)}</div>
     <div className="card"><h3>Needs your attention<button className="btn sm" onClick={()=>setPage('approvals')}>Review all</button></h3>
      {D.drafts.slice(0,4).map(d=><div key={d.id} style={{padding:'8px 0',borderBottom:'1px solid var(--line)'}}><b>{d.leads?.name}</b> <span className="sub">· {d.kind}</span><div className="sub">{d.why}</div></div>)}
      {!D.drafts.length&&<div className="empty">Nothing waiting. You are all caught up.</div>}</div></div>
    <div className="card"><h3>Top leads<button className="btn sm" onClick={()=>setPage('leads')}>View all</button></h3><LeadRows rows={top}/></div></div>}

   {page=='finder'&&<div className="grid" style={{gap:16}}>
    <div className="card"><h3>Find businesses without a website</h3>
     <div className="fgrid">
      {opts.apify&&<label>Data source<select value={src} onChange={e=>setSrc(e.target.value)}><option value="apify">Google Maps (Apify, best)</option><option value="free">Free map data</option></select></label>}
      <label>Industry<select value={fq.niche} onChange={e=>setFq({...fq,niche:e.target.value})}>{[...opts.niches,'Custom'].map(n=><option key={n}>{n}</option>)}</select></label>
      {fq.niche=='Custom'&&<label>Custom industry<input placeholder="e.g. solar installer" value={fq.custom} onChange={e=>setFq({...fq,custom:e.target.value})}/></label>}
      <label>Country<select value={fq.country} onChange={e=>setFq({...fq,country:e.target.value,city:'Any city'})}>{Object.keys(opts.countries).map(c=><option key={c}>{c}</option>)}</select></label>
      <label>City<select value={fq.city} onChange={e=>setFq({...fq,city:e.target.value})}>{['Any city',...arr(opts.countries[fq.country])].map(c=><option key={c}>{c}</option>)}</select></label>
      <label>How many leads<select value={fq.count} onChange={e=>setFq({...fq,count:+e.target.value})}>{[10,20,30,40,50].map(n=><option key={n} value={n}>{n} leads</option>)}</select></label>
     </div>
     <div className="row" style={{marginTop:14}}><button className="btn p" disabled={fr.running||!opts.niches.length} onClick={runFinder}>{fr.running?'Searching...':'Find leads'}</button><span className="sub">{fr.msg}</span></div>
     {fr.running&&<div className="prog"><i className="ind"/></div>}
     {fr.err&&<p style={{color:'var(--bad)',marginTop:10}}>{fr.err}</p>}
     <p className="sub" style={{marginTop:10}}>Every lead is a real, listed business with no website and a phone number or email. Contact them and offer a professional website.</p></div>
    {fr.found.length>0&&<div className="card"><h3><span>{fr.found.length} leads found</span><span className="row"><button className="btn sm" onClick={exportCsv}>Export CSV</button>
      <button className="btn p sm" disabled={!nsel||busy=='bulk'} onClick={draftSel}>{busy=='bulk'?'Writing...':'Draft emails for selected ('+nsel+')'}</button></span></h3>
     <div className="tw"><table><thead><tr><th><input type="checkbox" className="chk" checked={nsel==fr.found.length} onChange={e=>setSel(e.target.checked?Object.fromEntries(fr.found.map(l=>[l.id,true])):{})}/></th><th>Business</th><th>Contact</th><th>Location</th><th>Score</th><th></th></tr></thead><tbody>
      {foundSorted.map(l=><tr key={l.id}><td><input type="checkbox" className="chk" checked={!!sel[l.id]} onChange={e=>setSel({...sel,[l.id]:e.target.checked})}/></td>
       <td><b>{l.name}</b><div className="vok">No website in map data</div><div className="sub"><a href={l.maps||('https://www.google.com/search?q='+encodeURIComponent(l.name+' '+(l.address||'')+' website'))} target="_blank" rel="noreferrer">Double-check on Google</a></div></td>
       <td>{l.phone?<div><a href={'tel:'+l.phone.replace(/[^+\d]/g,'')}>{l.phone}</a></div>:null}{l.email?<div className="sub">{l.email}</div>:<div className="sub">no email</div>}</td>
       <td className="sub">{l.address}<div>{l.country}</div></td><td><Score n={l.score}/></td>
       <td>{sent[l.id]?<span className="tag">Contacted</span>:<button className="btn sm" onClick={()=>openMsg(l)}>{l.email?'Write email':'Write message'}</button>}</td></tr>)}</tbody></table></div></div>}
   </div>}

   {page=='leads'&&<div className="grid" style={{gap:16}}>
    <div className="card"><h3>Find new leads</h3><div className="row"><input style={{flex:1,minWidth:160}} placeholder="Niche, e.g. dentist" value={fd.niche} onChange={e=>setFd({...fd,niche:e.target.value})}/><input style={{flex:1,minWidth:160}} placeholder="City, e.g. Berlin, Germany" value={fd.city} onChange={e=>setFd({...fd,city:e.target.value})}/>
     <button className="btn p" disabled={busy=='find'||!fd.niche||!fd.city} onClick={()=>run('find',async()=>{const r=await api('/api/autofind?niche='+encodeURIComponent(fd.niche)+'&city='+encodeURIComponent(fd.city));say([].concat(r.r||r.error||'Done').join(' | '))})}>{busy=='find'?'Searching...':'Find leads'}</button>
     <button className="btn" onClick={()=>setShowAdd(!showAdd)}>{showAdd?'Close':'Add lead manually'}</button></div>
     {showAdd&&<div className="grid" style={{marginTop:14}}><div className="row"><input style={{flex:1}} placeholder="Name" value={f.name} onChange={e=>setF({...f,name:e.target.value})}/><input style={{flex:1}} placeholder="Business email" value={f.email} onChange={e=>setF({...f,email:e.target.value})}/><input style={{flex:1}} placeholder="Company" value={f.company} onChange={e=>setF({...f,company:e.target.value})}/></div>
      <textarea rows={4} placeholder="Paste their profile, bio, recent posts, hiring or funding news" value={f.profile} onChange={e=>setF({...f,profile:e.target.value})}/>
      <div><button className="btn p" disabled={busy=='add'} onClick={()=>run('add',async()=>{await api('/api/leads',f);setF({name:'',email:'',company:'',profile:''});setShowAdd(false);say('Lead scored and saved.')})}>{busy=='add'?'Scoring...':'Score and save'}</button></div></div>}</div>
    <div className="card"><div className="bar2"><input placeholder="Search name, company or email" value={q} onChange={e=>setQ(e.target.value)}/>
     <select value={st} onChange={e=>setSt(e.target.value)}>{['all','new','contacted','replied','call_booked','won','nurture','skipped','closed'].map(s=><option key={s} value={s}>{s.replace('_',' ')}</option>)}</select></div>
     <LeadRows rows={shown} expand/></div></div>}

   {page=='approvals'&&<div className="grid" style={{gap:14}}>
    {D.drafts.map(x=><div className="card dr" key={x.id}>
     <div className="h"><div><b>{x.leads?.name}</b> <span className="sub">· {x.leads?.email||'no email'}</span><div className="sub">{x.why}</div></div><div className="row"><Stage s={x.kind}/><Score n={x.leads?.score}/></div></div>
     <input defaultValue={x.subject} onChange={e=>setEd({...ed,[x.id+'s']:e.target.value})}/>
     <textarea rows={8} defaultValue={x.body} onChange={e=>setEd({...ed,[x.id]:e.target.value})}/>
     <div className="acts"><button className="btn" onClick={()=>run(x.id,()=>api('/api/drafts',{id:x.id,action:'skip'}))}>Skip</button>
      <button className="btn p" disabled={busy==x.id} onClick={()=>run(x.id,async()=>{const r=await api('/api/drafts',{id:x.id,action:'approve',body:ed[x.id],subject:ed[x.id+'s']});say(r.r=='sent'?'Email sent.':'Approved: '+r.r)})}>Approve and send</button></div></div>)}
    {!D.drafts.length&&<div className="card empty">No drafts waiting for approval.</div>}</div>}

   {page=='calls'&&<div className="grid g2" style={{alignItems:'start'}}>
    <div className="grid" style={{gap:14}}>{D.calls.map(c=><div className="card" key={c.id}><h3><span>{c.leads?.name||'Call'}</span><span><Score n={c.score}/> <span className="sub">{c.result?.verdict}</span></span></h3>
      {arr(c.result?.summary).map((s,i)=><p className="sub" key={i}>• {s}</p>)}
      {arr(c.result?.fix).length>0&&<><p style={{fontWeight:600,margin:'12px 0 4px'}}>Fix next time</p>{c.result.fix.map((x,i)=><p className="sub" key={i}>• {x.issue}. Say: "{x.say_instead}"</p>)}</>}</div>)}
     {!D.calls.length&&<div className="card empty">No calls scored yet.</div>}</div>
    <div className="card"><h3>Score a call</h3><div className="grid" style={{gap:10}}>
     <select value={ct.lead_id} onChange={e=>setCt({...ct,lead_id:e.target.value})}><option value="">Which lead?</option>{L.map(l=><option key={l.id} value={l.id}>{l.name}</option>)}</select>
     <textarea rows={10} placeholder="Paste the call transcript" value={ct.transcript} onChange={e=>setCt({...ct,transcript:e.target.value})}/>
     <button className="btn p" disabled={busy=='call'||!ct.transcript} onClick={()=>run('call',async()=>{await api('/api/calls',ct);setCt({lead_id:'',transcript:''});say('Call scored.')})}>{busy=='call'?'Scoring...':'Score call'}</button></div></div></div>}

   {page=='settings'&&<div className="card">{SETTINGS.filter(([k])=>k=='paused'||k in S).map(([k,t,d])=><div className="set" key={k}><div><b>{t}</b><div className="sub">{d}</div></div>
     <button className={'sw'+(S[k]?' on':'')} onClick={()=>run(k,()=>api('/api/settings',{key:k,value:!S[k],[k]:!S[k]}))}/></div>)}
    <div className="set"><div><b>Sign out</b><div className="sub">Remove the saved passcode from this device.</div></div><button className="btn" onClick={()=>{delete localStorage.pw;setOn(false)}}>Sign out</button></div></div>}
  </main>
  {toast&&<div className="toast">{toast}</div>}
  <style>{`.fgrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px}.fgrid label{display:grid;gap:5px;font-size:12.5px;font-weight:600;color:var(--mut)}.prog{height:6px;border-radius:6px;background:var(--bg);margin-top:12px;overflow:hidden}.prog i{display:block;height:100%;background:var(--acc);transition:width .3s}.ind{width:35%;animation:mv 1s ease-in-out infinite alternate}@keyframes mv{from{margin-left:0}to{margin-left:65%}}.ovl{position:fixed;inset:0;background:rgba(0,0,0,.35);display:grid;place-items:center;z-index:60;padding:16px}.modal{width:100%;max-width:640px;display:grid;gap:10px;max-height:90vh;overflow:auto}.vok{color:var(--ok);font-weight:600;font-size:12px}.chk{width:16px;height:16px;padding:0}a{color:inherit}`}</style>
  {cmp&&<div className="ovl" onClick={()=>setCmp(null)}><div className="modal card" onClick={e=>e.stopPropagation()}>
   <h3><span>{cmp.channel=='email'?'Email to ':'Message to '}{cmp.lead.name}</span><span className="sub">{cmp.channel=='email'?cmp.lead.email:cmp.lead.phone}</span></h3>
   {cmp.loading?<p className="sub">Writing your {cmp.channel=='email'?'email':'message'}...</p>:<>
    {cmp.channel=='email'&&<input value={cmp.subject||''} onChange={e=>setCmp({...cmp,subject:e.target.value})}/>}
    <textarea rows={10} value={cmp.body||''} onChange={e=>setCmp({...cmp,body:e.target.value})}/>
    {cmp.channel!='email'&&<p className="sub">Opens WhatsApp with this text ready. If the number has no country code (+...), WhatsApp may not find it, so call them instead.</p>}
    <div className="acts"><button className="btn" onClick={()=>setCmp(null)}>Close</button>
     {cmp.channel=='email'?<button className="btn p" disabled={cmp.sending} onClick={sendMail}>{cmp.sending?'Sending...':'Send now'}</button>
      :<><button className="btn" onClick={()=>{navigator.clipboard?.writeText(cmp.body);say('Copied.')}}>Copy</button><button className="btn p" disabled={!cmp.lead.phone} onClick={openWa}>Open WhatsApp</button></>}</div></>}
  </div></div>}
 </div>}