"use client";

import { FormEvent, useEffect, useState } from "react";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { ArrowUpRight, Eye, EyeOff, ShieldCheck } from "lucide-react";

export default function ResetPasswordPage() {
  const [client, setClient] = useState<SupabaseClient | null>(null);
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) {
      setNotice("Supabase is not configured. Please contact support.");
      return;
    }
    const supabase = createClient(url, key);
    setClient(supabase);
    const prepare = async () => {
      const code = new URLSearchParams(window.location.search).get("code");
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) { setNotice(error.message); return; }
      }
      const { data, error } = await supabase.auth.getSession();
      if (error || !data.session) {
        setNotice("This password reset link is invalid or has expired. Request a new one from the sign-in panel.");
        return;
      }
      setReady(true);
    };
    prepare().catch(error => setNotice(error instanceof Error ? error.message : "Could not validate your reset link."));
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setNotice("");
    if (password.length < 8) { setNotice("Use at least 8 characters for your new password."); return; }
    if (password !== confirmPassword) { setNotice("Your passwords do not match."); return; }
    if (!client) return;
    setBusy(true);
    const { error } = await client.auth.updateUser({ password });
    if (error) {
      setNotice(error.message);
      setBusy(false);
      return;
    }
    setNotice("Your password has been updated. You can now sign in with your new password.");
    setBusy(false);
    setTimeout(() => window.location.replace("/"), 1600);
  }

  return <main className="result-page"><section className="result-card reset-card">
    <div className="reset-brand"><span className="brand-mark">S</span><strong>sub<span className="brand-dot">.</span></strong></div>
    <div className="reset-shield"><ShieldCheck size={23}/></div>
    <h1>Choose a new password</h1>
    <p>Create a strong password to secure your Sub account.</p>
    {ready ? <form className="reset-form" onSubmit={submit}>
      <label htmlFor="new-password">NEW PASSWORD</label>
      <div className="reset-password-field"><input id="new-password" type={showPassword ? "text" : "password"} minLength={8} autoComplete="new-password" placeholder="At least 8 characters" value={password} onChange={e => setPassword(e.target.value)} required/><button type="button" aria-label="Toggle password visibility" onClick={() => setShowPassword(v => !v)}>{showPassword ? <EyeOff size={17}/> : <Eye size={17}/>}</button></div>
      <label htmlFor="confirm-password">CONFIRM NEW PASSWORD</label>
      <input id="confirm-password" type="password" minLength={8} autoComplete="new-password" placeholder="Enter it again" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required/>
      {notice && <p className="auth-notice">{notice}</p>}
      <button className="auth-submit" disabled={busy}>{busy ? "Updating password…" : "Update password"} <ArrowUpRight size={16}/></button>
    </form> : <p className="auth-notice">{notice || "Checking your secure reset link…"}</p>}
    <a className="reset-back" href="/">Back to Sub</a>
  </section></main>;
}
