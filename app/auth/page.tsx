"use client";
import { FormEvent, useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { ShieldCheck, Mail, LockKeyhole, ArrowLeft } from "lucide-react";
import Link from "next/link";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const client = url && key ? createClient(url,key) : null;

export default function AuthPage() {
  const [mode,setMode] = useState<"signin"|"signup">("signin");
  const [email,setEmail] = useState("");
  const [password,setPassword] = useState("");
  const [busy,setBusy] = useState(false);
  const [notice,setNotice] = useState("");
  useEffect(() => { if (new URLSearchParams(window.location.search).get("mode") === "signup") setMode("signup"); }, []);
  async function submit(e: FormEvent) {
    e.preventDefault(); setNotice("");
    if (!client) { setNotice("Supabase is not configured. Add the public Supabase URL and publishable key in Vercel."); return; }
    setBusy(true);
    try {
      const result = mode === "signup" ? await client.auth.signUp({ email,password,options:{emailRedirectTo:location.origin+"/portal"} }) : await client.auth.signInWithPassword({email,password});
      if (result.error) throw result.error;
      if (mode === "signup") setNotice("Account created. Check your email to confirm your address, then sign in."); else window.location.href = "/portal";
    } catch (err) { setNotice(err instanceof Error ? err.message : "Authentication failed."); }
    finally { setBusy(false); }
  }
  async function google() {
    if (!client) { setNotice("Supabase is not configured."); return; }
    setBusy(true);
    const {error} = await client.auth.signInWithOAuth({provider:"google",options:{redirectTo:location.origin+"/portal"}});
    if(error){setNotice(error.message);setBusy(false);}
  }
  return <main className="auth-shell"><section className="auth-card"><Link href="/" className="auth-back"><ArrowLeft size={15}/> Back to FraudGuard</Link><div className="auth-brand"><span><ShieldCheck size={25}/></span><b>Fraud<span>Guard</span></b></div><p className="auth-eyebrow">SECURE ACCOUNT ACCESS</p><h1>{mode==="signin"?"Welcome back":"Create your account"}</h1><p className="auth-description">Secure your personal or business workspace and keep your reports in one place.</p><form onSubmit={submit}><label>Email address</label><div className="auth-input"><Mail size={17}/><input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com"/></div><label>Password</label><div className="auth-input"><LockKeyhole size={17}/><input type="password" minLength={8} required value={password} onChange={e=>setPassword(e.target.value)} placeholder="At least 8 characters"/></div><button className="primary-button auth-submit" disabled={busy}>{busy?"Please wait…":mode==="signin"?"Sign in":"Create account"}</button></form><div className="auth-divider">OR</div><button className="secondary-button auth-google" onClick={google} disabled={busy}>Continue with Google</button>{notice&&<p className="auth-notice" role="status">{notice}</p>}<p className="auth-switch">{mode==="signin"?"New to FraudGuard?":"Already have an account?"} <button onClick={()=>{setMode(mode==="signin"?"signup":"signin");setNotice("");}}>{mode==="signin"?"Create account":"Sign in"}</button></p><small className="auth-privacy">Your password is handled by Supabase Auth. FraudGuard never stores your password.</small></section></main>;
}
