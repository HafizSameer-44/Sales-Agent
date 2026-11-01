'use client';
// PASTE AS:  app/reset/page.js   (opened from the password reset email)
import {useState, useEffect} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {sb} from '../auth-form';

export default function Reset() {
  const router = useRouter();
  const [pw, setPw] = useState(''), [ready, setReady] = useState(false), [err, setErr] = useState(''), [ok, setOk] = useState(''), [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!sb) return;
    sb.auth.getSession().then(({data}) => { if (data.session) setReady(true); });
    const {data: sub} = sb.auth.onAuthStateChange(ev => { if (ev === 'PASSWORD_RECOVERY' || ev === 'SIGNED_IN') setReady(true); });
    return () => sub.subscription.unsubscribe();
  }, []);
  const save = async e => {
    e.preventDefault(); setErr('');
    if (pw.length < 8) return setErr('Password must be at least 8 characters.');
    setBusy(true);
    const {error} = await sb.auth.updateUser({password: pw});
    setBusy(false);
    if (error) return setErr(error.message);
    setOk('Password updated. Opening your workspace...'); setTimeout(() => router.replace('/app'), 900);
  };
  return <div className="au-main" style={{minHeight:'100vh'}}><div className="au-card">
    <h1>Choose a new password</h1><p className="sub">{ready ? 'Enter a new password for your account.' : 'Open this page from the link in your reset email.'}</p>
    {ready && <form className="au-f" onSubmit={save}><label>New password<input type="password" autoComplete="new-password" value={pw} onChange={e => setPw(e.target.value)} placeholder="At least 8 characters"/></label>
      {err && <div className="au-msg err">{err}</div>}{ok && <div className="au-msg ok">{ok}</div>}<button className="btn p lg" disabled={busy}>{busy ? 'Saving...' : 'Update password'}</button></form>}
    <div className="au-alt"><Link href="/login">Back to log in</Link></div></div></div>;
}