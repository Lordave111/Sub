"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

export default function AuthCallbackPage() {
  const [message, setMessage] = useState("Completing your secure sign-in…");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) {
      setFailed(true);
      setMessage("Supabase is not configured. Please contact support.");
      return;
    }
    const supabase = createClient(url, key);
    const finish = async () => {
      const params = new URLSearchParams(window.location.search);
      const providerError = params.get("error_description") || params.get("error");
      if (providerError) {
        setFailed(true);
        setMessage(providerError.replace(/\+/g, " "));
        return;
      }
      const code = params.get("code");
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          setFailed(true);
          setMessage(error.message);
          return;
        }
      } else {
        const { data, error } = await supabase.auth.getSession();
        if (error || !data.session) {
          setFailed(true);
          setMessage(error?.message || "The sign-in link is invalid or has expired. Please try again.");
          return;
        }
      }
      window.location.replace("/");
    };
    finish().catch(error => {
      setFailed(true);
      setMessage(error instanceof Error ? error.message : "Could not complete sign-in.");
    });
  }, []);

  return <main className="result-page"><section className="result-card auth-callback-card">
    <div className={failed ? "result-icon failed" : "result-icon pending"}>{failed ? "!" : "↻"}</div>
    <h1>{failed ? "Sign-in could not finish" : "Securing your account"}</h1>
    <p>{message}</p>
    {failed && <a className="result-btn" href="/">Return to Sub</a>}
  </section></main>;
}
