'use client';
// PASTE AS:  app/auth-form.js   (new file, shared by login, signup and the dashboard)
import {useState, useEffect} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {createClient} from '@supabase/supabase-js';

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL, KEY_ = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
export const sb = URL_ && KEY_ ? createClient(URL_, KEY_) : null;

const nice = m => /invalid login/i.test(m) ? 'Wrong email or password.'
  : /not confirmed/i.test(m) ? 'Please confirm your email first. Check your inbox.'
  : /already registered|already been registered/i.test(m) ? 'This email already has an account. Log in instead.'
  : /rate limit|too many/i.test(m) ? 'Too many attempts. Please wait a minute and try again.'
  : /provider is not enabled|unsupported provider/i.test(m) ? 'Google sign-in is not enabled in Supabase yet.'
  : m;

const Google = () => <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.7 6c4.5-4.2 6.9-10.3 6.9-17.7z"/><path fill="#FBBC05" d="M10.5 28.7a14.5 14.5 0 0 1 0-9.4l-7.9-6.1a24 24 0 0 0 0 21.6l7.9-6.1z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.7-6c-2.2 1.5-4.9 2.3-8.2 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z"/></svg>;

export default function AuthForm({mode}) {
  const router = useRouter();
  const [email, setEmail] = useState(''), [password, setPassword] = useState(''), [name, setName] = useState('');
  const [busy, setBusy] = useState(false), [err, setErr] = useState(''), [ok, setOk] = useState('');
  const signup = mode === 'signup', forgot = mode === 'forgot';

  useEffect(() => { if (sb) sb.auth.getSession().then(({data}) => { if (data.session) router.replace('/app'); }); }, []);

  const google = async () => {
    setErr('');
    const {error} = await sb.auth.signInWithOAuth({provider: 'google', options: {redirectTo: window.location.origin + '/app'}});
    if (error) setErr(nice(error.message));
  };
  const submit = async e => {
    e.preventDefault(); setErr(''); setOk('');
    if (!/^\S+@\S+\.\S+$/.test(email)) return setErr('Enter a valid email address.');
    if (!forgot && password.length < 8) return setErr('Password must be at least 8 characters.');
    setBusy(true);
    try {
      if (forgot) {
        const {error} = await sb.auth.resetPasswordForEmail(email, {redirectTo: window.location.origin + '/reset'});
        if (error) throw error;
        setOk('Check your inbox for a password reset link.');
      } else if (signup) {
        const {data, error} = await sb.auth.signUp({email, password, options: {emailRedirectTo: window.location.origin + '/app', data: {name}}});
        if (error) throw error;
        if (data.session) router.replace('/app'); else setOk('Account created. Check your email to confirm it, then log in.');
      } else {
        const {error} = await sb.auth.signInWithPassword({email, password});
        if (error) throw error;
        router.replace('/app');
      }
    } catch (x) { setErr(nice(x.message || 'Something went wrong.')); }
    setBusy(false);
  };

  return <div className="au">
    <div className="au-side"><Link href="/" className="brand" style={{color:'#fff',textDecoration:'none',padding:0}}><div className="logo" style={{background:'rgba(255,255,255,.2)',boxShadow:'none'}}>SA</div><div>Sales Agent</div></Link>
      <div><h2>Find the businesses that need you. Reach them in minutes.</h2>
       <ul><li>✓ Real businesses with phone, email and a Google Maps link</li><li>✓ AI writes the email or WhatsApp message for you</li><li>✓ You approve everything before it goes out</li></ul></div>
      <div style={{opacity:.8,fontSize:13}}>by Greek Root AI</div></div>
    <div className="au-main"><div className="au-card">
      <h1>{forgot ? 'Reset your password' : signup ? 'Create your account' : 'Welcome back'}</h1>
      <p className="sub">{forgot ? 'We will email you a link to choose a new password.' : signup ? 'Start finding leads in a few minutes.' : 'Log in to your workspace.'}</p>
      {!sb ? <div className="au-msg err">Setup needed: add <b>NEXT_PUBLIC_SUPABASE_URL</b> and <b>NEXT_PUBLIC_SUPABASE_ANON_KEY</b> to your environment variables, then restart the app.</div> : <>
        {!forgot && <><button type="button" className="au-google" onClick={google}><Google/>Continue with Google</button><div className="au-or">or use your email</div></>}
        <form className="au-f" onSubmit={submit}>
          {signup && <label>Your name<input autoComplete="name" value={name} onChange={e => setName(e.target.value)} placeholder="Jane Doe"/></label>}
          <label>Email<input type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com"/></label>
          {!forgot && <label>Password<input type="password" autoComplete={signup ? 'new-password' : 'current-password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 8 characters"/></label>}
          {!signup && !forgot && <div style={{textAlign:'right',marginTop:-6}}><Link href="/forgot" style={{color:'var(--brand)',fontWeight:700,textDecoration:'none',fontSize:13}}>Forgot password?</Link></div>}
          {err && <div className="au-msg err">{err}</div>}{ok && <div className="au-msg ok">{ok}</div>}
          <button className="btn p lg" disabled={busy}>{busy ? 'Please wait...' : forgot ? 'Send reset link' : signup ? 'Create account' : 'Log in'}</button>
        </form></>}
      <div className="au-alt">{signup ? <>Already have an account? <Link href="/login">Log in</Link></> : forgot ? <Link href="/login">Back to log in</Link> : <>New here? <Link href="/signup">Create an account</Link></>}</div>
    </div></div>
  </div>;
}