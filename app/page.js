'use client';
// PASTE AS:  app/page.js   (this REPLACES your old dashboard page; the dashboard moves to app/app/page.js)
import {useState} from 'react';
import Link from 'next/link';

const Ico = ({d}) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={d}/></svg>;
const F = [
  ['AI Lead Finder', 'Search any industry across the USA, Europe and Pakistan. Get real businesses with phone numbers, emails and a Google Maps link, and see who has no website.', 'M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9zM19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9z', 't0'],
  ['Outreach written for you', 'One click writes a personal email or a short WhatsApp message for each business. Edit it, then send.', 'M4 4h16v16H4zM4 6l8 7 8-7', 't3'],
  ['You stay in control', 'Every email waits for your approval, unless you switch auto-send on. Nothing goes out behind your back.', 'M22 11.1V12a10 10 0 1 1-5.9-9.1M22 4 12 14l-3-3', 't1'],
  ['Follow-ups and replies', 'The agent drafts follow-ups on time and prepares a reply when a lead answers, so no conversation goes cold.', 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z', 't4'],
  ['Call scoring and coaching', 'Paste a call transcript and get a score out of 100 with exact sentences to say next time.', 'M13 2 3 14h9l-1 8 10-12h-9z', 't2'],
  ['Instant notifications', 'Get alerted when new leads arrive, emails go out and drafts are ready, even when the tab is in the background.', 'M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0', 't5'],
];
const FAQ = [
  ['Does it send emails by itself?', 'Only if you turn auto-send on. By default every email waits in your approval queue so you can read and edit it first.'],
  ['Where do the leads come from?', 'From public business listings such as Google Maps and OpenStreetMap. You see the phone, email (when one is listed) and a Maps link for each business.'],
  ['What if a business has no email?', 'Many small businesses without a website list only a phone number. For those, the app writes a short WhatsApp message you can open in one tap.'],
  ['Can I use it on my phone?', 'Yes. The whole product works in your mobile browser, and you can add it to your Home Screen.'],
  ['Who can see my data?', 'Your workspace sits behind a login. Only the people you allow can open it.'],
];

export default function Landing() {
  const [open, setOpen] = useState(false);
  return <div className="lp">
    <header className="lp-nav"><div className="lp-w">
      <Link href="/" className="brand" style={{padding:0,textDecoration:'none'}}><div className="logo">SA</div><div><div>Sales Agent</div><div className="bsub">by Greek Root AI</div></div></Link>
      <nav className="lp-links"><a href="#features">Features</a><a href="#how">How it works</a><a href="#faq">FAQ</a></nav>
      <div className="lp-act"><Link href="/login" className="btn g">Log in</Link><Link href="/signup" className="btn p">Get started</Link>
        <button className="ib lp-burger" aria-label="Menu" onClick={() => setOpen(!open)}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d={open ? 'M6 6l12 12M18 6 6 18' : 'M4 7h16M4 12h16M4 17h16'}/></svg></button></div></div>
      {open && <div className="lp-menu"><a href="#features" onClick={() => setOpen(false)}>Features</a><a href="#how" onClick={() => setOpen(false)}>How it works</a><a href="#faq" onClick={() => setOpen(false)}>FAQ</a><Link href="/login" style={{fontWeight:600,padding:'12px 4px',textDecoration:'none'}}>Log in</Link></div>}
    </header>

    <section className="lp-hero"><div className="lp-w">
      <div><span className="lp-badge">✦ AI sales agent for outbound</span>
        <h1 className="lp-h1">Find businesses that need you. <em>Win them on autopilot.</em></h1>
        <p className="lp-lead">Search any industry in the USA, Europe or Pakistan. Get real businesses with contact details and a Google Maps link, then let AI write the outreach while you stay in control.</p>
        <div className="lp-cta"><Link href="/signup" className="btn p lg">Get started</Link><Link href="/login" className="btn lg">Log in</Link></div>
        <p className="lp-note">Works on your phone. Sign up with Google or email.</p></div>
      <div className="lp-mock" aria-hidden="true"><div className="bar"><i/><i/><i/></div>
        <div className="lp-mk3"><div><b>48</b><span>Leads found</span></div><div><b>31</b><span>With phone</span></div><div><b>12</b><span>No website</span></div></div>
        {[['Example Dental Studio','Berlin · No website','94'],['Sample Realty Group','Austin · Has email','88'],['Demo Hair Lounge','London · No website','81']].map(([n,s,sc]) => <div className="lp-row" key={n}><span className="av" style={{width:32,height:32,fontSize:13}}>{n[0]}</span><div className="grow"><b>{n}</b><span>{s}</span></div><span className="sc hi">{sc}</span></div>)}
        <div className="sub" style={{marginTop:10,textAlign:'center'}}>Illustrative preview</div></div>
    </div></section>

    <div className="lp-w"><div className="lp-trust"><span>✓ Real business listings</span><span>✓ Phone, email and Maps link</span><span>✓ You approve every message</span></div></div>

    <section className="lp-sec" id="features"><div className="lp-w">
      <div className="lp-eyebrow">Features</div><h2 className="lp-h2">Everything you need to turn a search into a conversation</h2>
      <p className="lp-p">One workspace for finding, contacting and tracking your leads.</p>
      <div className="lp-g3">{F.map(([t, d, ic, c]) => <div className="lp-card" key={t}><span className={'kic ' + c}><Ico d={ic}/></span><h3>{t}</h3><p>{d}</p></div>)}</div></div></section>

    <section className="lp-sec alt" id="how"><div className="lp-w">
      <div className="lp-eyebrow">How it works</div><h2 className="lp-h2">From search to first message in three steps</h2>
      <div className="lp-steps">
        <div className="lp-step"><h3>Pick your market</h3><p>Choose an industry, a country and how many leads you want, from 10 to 50.</p></div>
        <div className="lp-step"><h3>Review real leads</h3><p>See phone, email, website status and a Google Maps link. Add or delete leads any time.</p></div>
        <div className="lp-step"><h3>Reach out in one click</h3><p>AI writes the email or WhatsApp message. You edit, approve and send, then track replies.</p></div></div></div></section>

    <section className="lp-sec" id="faq"><div className="lp-w" style={{textAlign:'center'}}>
      <div className="lp-eyebrow">FAQ</div><h2 className="lp-h2" style={{margin:'0 auto'}}>Questions, answered</h2>
      <div className="lp-faq" style={{textAlign:'left'}}>{FAQ.map(([q, a]) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}</div></div></section>

    <section style={{paddingBottom:70}}><div className="lp-band"><h2>Ready to find your next clients?</h2><p>Create your account in under a minute and run your first search today.</p>
      <Link href="/signup" className="btn lg">Create your account</Link></div></section>

    <footer className="lp-foot"><div className="lp-w"><div>© {new Date().getFullYear()} Greek Root AI. All rights reserved.</div><div><Link href="/login">Log in</Link><Link href="/signup">Sign up</Link></div></div></footer>
  </div>;
}