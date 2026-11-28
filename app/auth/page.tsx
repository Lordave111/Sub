"use client";
import { FormEvent, useEffect, useState } from "react";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { ShieldCheck, Mail, LockKeyhole, ArrowLeft, Eye, EyeOff, ArrowUpRight, KeyRound, Sparkles } from "lucide-react";
import Link from "next/link";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const client: SupabaseClient | null = url && key ? createClient(url, key, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
}) : null;

export default function AuthPage() {
  const [mode,setMode] = useState<"signin"|"signup">("signin");
  const [email,setEmail] = useState("");
  const [password,setPassword] = useState("");
  const [showPassword,setShowPassword] = useState(false);
  const [busy,setBusy] = useState(false);
  const [notice,setNotice] = useState("");
  const [noticeKind,setNoticeKind] = useState<"info"|"error"|"success">("info");

  useEffect(() => {
    if (!client) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("mode") === "signup") setMode("signup");
    client.auth.getSession().then(({data}) => {
      if (data.session) window.location.replace("/portal");
    });
    const { data: listener } = client.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) window.location.replace("/portal");
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  function message(text: string, kind: "info"|"error"|"success" = "info") {
    setNotice(text); setNoticeKind(kind);
  }

  async function submit(e: FormEvent) {
    e.preventDefault(); setNotice("");
    if (!client) { message("Supabase is not configured. Add the public Supabase URL and publishable key in Vercel.", "error"); return; }
    setBusy(true);
    try {
      const result = mode === "signup"
        ? await client.auth.signUp({ email: email.trim(), password, options:{emailRedirectTo:location.origin+"/auth/callback"} })
        : await client.auth.signInWithPassword({email:email.trim(),password});
      if (result.error) throw result.error;
      if (mode === "signup") message("Account created. Check your email to confirm your address, then return here to sign in.", "success");
      else if (result.data.session) window.location.replace("/portal");
      else message("Check your email to finish signing in.", "success");
    } catch (err) { message(err instanceof Error ? err.message : "Authentication failed.", "error"); }
    finally { setBusy(false); }
  }

  async function google() {
    if (!client) { message("Supabase is not configured.", "error"); return; }
    setBusy(true); setNotice("");
    try {
      const {error} = await client.auth.signInWithOAuth({provider:"google",options:{redirectTo:location.origin+"/auth/callback"}});
      if(error) throw error;
    } catch(err) { message(err instanceof Error ? err.message : "Google sign-in could not start.", "error"); setBusy(false); }
  }

  async function forgotPassword() {
    if (!client) { message("Supabase is not configured.", "error"); return; }
    if (!email.trim()) { message("Enter your email address first, then choose Forgot password.", "error"); return; }
    setBusy(true); setNotice("");
    try {
      const {error} = await client.auth.resetPasswordForEmail(email.trim(), {redirectTo:location.origin+"/auth/reset-password"});
      if(error) throw error;
      message("Password reset email sent. Open the link in that email to choose a new password.", "success");
    } catch(err) { message(err instanceof Error ? err.message : "Could not send a reset email.", "error"); }
    finally { setBusy(false); }
  }

  return <main className="auth-shell">
    <div className="auth-ambient auth-ambient-one"/><div className="auth-ambient auth-ambient-two"/>
    <section className="auth-card">
      <Link href="/" className="auth-back"><ArrowLeft size={15}/> Back to FraudGuard</Link>
      <div className="auth-brand"><span><ShieldCheck size={25}/></span><b>FRAUD<span>GUARD</span></b><small>PERSONAL SECURITY</small></div>
      <div className="auth-eyebrow"><Sparkles size={13}/> SECURE ACCOUNT ACCESS</div>
      <h1>{mode==="signin"?"Welcome back.":"Your safer space starts here."}</h1>
      <p className="auth-description">{mode==="signin"?"Sign in to manage your connected accounts and security settings.":"Create a private workspace for your connected accounts and security settings."}</p>
      <button className="secondary-button auth-google" onClick={google} disabled={busy}><span className="google-g">G</span> Continue with Google <ArrowUpRight size={15}/></button>
      <div className="auth-divider"><span/> OR USE EMAIL <span/></div>
      <form onSubmit={submit}>
        <label htmlFor="auth-email">EMAIL ADDRESS</label>
        <div className="auth-input"><Mail size={17}/><input id="auth-email" type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com"/></div>
        <div className="auth-password-label"><label htmlFor="auth-password">PASSWORD</label>{mode==="signin"&&<button type="button" className="forgot-link" onClick={forgotPassword} disabled={busy}><KeyRound size={12}/> Forgot password?</button>}</div>
        <div className="auth-input"><LockKeyhole size={17}/><input id="auth-password" type={showPassword?"text":"password"} minLength={8} autoComplete={mode==="signin"?"current-password":"new-password"} required value={password} onChange={e=>setPassword(e.target.value)} placeholder={mode==="signin"?"Enter your password":"At least 8 characters"}/><button className="auth-eye" type="button" aria-label={showPassword?"Hide password":"Show password"} onClick={()=>setShowPassword(v=>!v)}>{showPassword?<EyeOff size={17}/>:<Eye size={17}/>}</button></div>
        <button className="primary-button auth-submit" disabled={busy}>{busy?"Please wait…":mode==="signin"?"Sign in securely":"Create secure account"}<ArrowUpRight size={16}/></button>
      </form>
      {notice&&<p className={"auth-notice "+noticeKind} role="status">{notice}</p>}
      <p className="auth-switch">{mode==="signin"?"New to FraudGuard?":"Already have an account?"} <button onClick={()=>{setMode(mode==="signin"?"signup":"signin");setNotice("");}}>{mode==="signin"?"Create account":"Sign in"}</button></p>
      <div className="auth-trust"><LockKeyhole size={13}/><span>Encrypted session · You control connected accounts · Revoke access anytime</span></div>
      <small className="auth-privacy">Your password is handled by Supabase Auth. FraudGuard never stores your password.</small>
    </section>
  </main>;
}
