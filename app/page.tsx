"use client";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { Activity, Apple, ArrowUpRight, CheckCircle2, CreditCard, Eye, EyeOff, Gauge, Menu, ShieldCheck, Smartphone, TrendingUp, Wallet, Wifi, Zap } from "lucide-react";

type Plan = { variation_code: string; name: string; variation_amount: string; fixedPrice: string };
const networks = [
  { id: "mtn", name: "MTN", color: "#ffca05", text: "#171717", service: "mtn-data", airtime: "mtn" },
  { id: "airtel", name: "Airtel", color: "#e31b36", text: "#fff", service: "airtel-data", airtime: "airtel" },
  { id: "glo", name: "Glo", color: "#159447", text: "#fff", service: "glo-data", airtime: "glo" },
  { id: "9mobile", name: "9mobile", color: "#087b48", text: "#fff", service: "9mobile-data", airtime: "etisalat" },
];
const money = (n: number) => "₦" + n.toLocaleString("en-NG");
const planSize = (name: string) => name.match(/\d+(?:\.\d+)?\s?(?:MB|GB|TB)/i)?.[0] || "DATA BUNDLE";
const planValidity = (name: string) => name.match(/\d+\s?(?:hours?|days?|weeks?|months?)/i)?.[0] || "Provider validity";
type PlanCategory = "all" | "daily" | "weekly" | "monthly" | "other";
const planCategory = (name: string): PlanCategory => {
  const value = name.toLowerCase();
  if (/\b(daily|24\s?hours?|1\s?day)\b/.test(value)) return "daily";
  if (/\b(weekly|7\s?days?|14\s?days?)\b/.test(value)) return "weekly";
  if (/\b(monthly|30\s?days?|1\s?month|2\s?months?)\b/.test(value)) return "monthly";
  const days = value.match(/(\d+)\s?days?/);
  if (days) {
    const count = Number(days[1]);
    if (count <= 2) return "daily";
    if (count <= 14) return "weekly";
    if (count <= 31) return "monthly";
  }
  return "other";
};
export default function Home() {
  const [kind, setKind] = useState<"data" | "airtime">("data");
  const [network, setNetwork] = useState("mtn");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [amount, setAmount] = useState("100");
  const [plans, setPlans] = useState<Plan[]>([]);
  const [plan, setPlan] = useState("");
  const [planCategoryFilter, setPlanCategoryFilter] = useState<PlanCategory>("all");
  const [plansExpanded, setPlansExpanded] = useState(false);
  const [commissionPercent] = useState(10);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [supabaseClient] = useState(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    return url && key ? createClient(url, key) : null;
  });
  const [session, setSession] = useState<any>(null);
  const [authMode, setAuthMode] = useState<"login" | "signup" | "forgot">("signup");
  const [showPassword, setShowPassword] = useState(false);
  const [authNeedsResend, setAuthNeedsResend] = useState(false);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [authNotice, setAuthNotice] = useState("");
  const [account, setAccount] = useState<any>(null);
  const [accountBusy, setAccountBusy] = useState(false);
  const [signOutBusy, setSignOutBusy] = useState(false);
  const [orderFilter, setOrderFilter] = useState<"all" | "data" | "airtime">("all");
  const activityBars = useMemo(() => {
    const orders = account?.orders || [];
    const days = Array.from({ length: 7 }, (_, index) => {
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() - (6 - index));
      const key = [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
      const spent = orders.filter((order: any) => {
        const created = new Date(order.created_at);
        const orderKey = [created.getFullYear(), String(created.getMonth() + 1).padStart(2, "0"), String(created.getDate()).padStart(2, "0")].join("-");
        return orderKey === key;
      }).reduce((sum: number, order: any) => sum + Number(order.total || 0), 0);
      return { label: date.toLocaleDateString("en-NG", { weekday: "short" }), spent };
    });
    const max = Math.max(1, ...days.map(day => day.spent));
    return days.map(day => ({ ...day, height: Math.max(5, Math.round(day.spent / max * 100)) }));
  }, [account]);
  const filteredOrders = (account?.orders || []).filter((order: any) => orderFilter === "all" || order.kind === orderFilter);
  const trackedSpend = (account?.orders || []).reduce((sum: number, order: any) => sum + Number(order.total || 0), 0);
  const dataSpend = (account?.orders || []).filter((order: any) => order.kind === "data").reduce((sum: number, order: any) => sum + Number(order.total || 0), 0);
  const airtimeSpend = (account?.orders || []).filter((order: any) => order.kind === "airtime").reduce((sum: number, order: any) => sum + Number(order.total || 0), 0);

  const selected = networks.find(n => n.id === network)!;
  const chosen = plans.find(p => p.variation_code === plan);
  const filteredPlans = useMemo(() => plans.filter(p => planCategoryFilter === "all" || planCategory(p.name) === planCategoryFilter), [plans, planCategoryFilter]);
  const basePrice = kind === "airtime" ? Number(amount) : Number(chosen?.variation_amount || 0);
  const serviceFee = useMemo(() => basePrice ? Math.round(basePrice * commissionPercent) / 100 : 0, [basePrice, commissionPercent]);
  const total = useMemo(() => basePrice ? Math.round((basePrice + serviceFee) * 100) / 100 : 0, [basePrice, serviceFee]);
  useEffect(() => {
    if (!supabaseClient) return;
    supabaseClient.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: { subscription } } = supabaseClient.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setAccount(null);
    });
    return () => subscription.unsubscribe();
  }, [supabaseClient]);
  useEffect(() => {
    if (!session?.access_token) { setAccount(null); return; }
    setAccountBusy(true);
    fetch("/api/account", { headers: { Authorization: "Bearer " + session.access_token } })
      .then(async response => { const data = await response.json(); if (!response.ok) throw new Error(data.error || "Could not load account."); setAccount(data); })
      .catch(error => setAuthNotice(error instanceof Error ? error.message : "Could not load account."))
      .finally(() => setAccountBusy(false));
  }, [session]);
  async function handleAuth(e: React.FormEvent) {
    e.preventDefault(); setAuthNotice(""); setAuthNeedsResend(false);
    if (!supabaseClient) { setAuthNotice("Supabase is not connected. Check your public URL and publishable key in Vercel."); return; }
    setAuthBusy(true);
    try {
      if (authMode === "forgot") {
        const { error } = await supabaseClient.auth.resetPasswordForEmail(authEmail, {
          redirectTo: window.location.origin + "/auth/reset-password",
        });
        if (error) throw error;
        setAuthNotice("If an account exists for this email, a password reset link is on its way. Check your inbox and spam folder.");
      } else if (authMode === "signup") {
        const { data, error } = await supabaseClient.auth.signUp({ email: authEmail, password: authPassword, options: { emailRedirectTo: window.location.origin + "/auth/callback" } });
        if (error) throw error;
        setEmail(authEmail);
        setAuthNotice(data.session ? "Your account is ready. Welcome to Sub!" : "Account created. Check your email to confirm your address, then sign in.");
      } else {
        const { error } = await supabaseClient.auth.signInWithPassword({ email: authEmail, password: authPassword });
        if (error) throw error;
        setEmail(authEmail);
        setAuthNotice("Welcome back.");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Authentication failed.";
      setAuthNotice(message);
      if (/email not confirmed/i.test(message)) setAuthNeedsResend(true);
    } finally { setAuthBusy(false); }
  }
  async function signInWithProvider(provider: "google" | "apple") {
    if (!supabaseClient) { setAuthNotice("Supabase is not connected. Check your public URL and publishable key in Vercel."); return; }
    setAuthNotice(""); setAuthBusy(true);
    const { error } = await supabaseClient.auth.signInWithOAuth({
      provider,
      options: { redirectTo: window.location.origin + "/auth/callback" },
    });
    if (error) { setAuthNotice(error.message); setAuthBusy(false); }
  }
  async function resendConfirmation() {
    if (!supabaseClient || !authEmail) return;
    setAuthBusy(true); setAuthNotice("");
    const { error } = await supabaseClient.auth.resend({ type: "signup", email: authEmail, options: { emailRedirectTo: window.location.origin + "/auth/callback" } });
    setAuthNotice(error ? error.message : "A new confirmation email has been sent. Check your inbox and spam folder.");
    setAuthBusy(false);
  }
  async function signOut() {
    if (!supabaseClient || signOutBusy) return;
    setSignOutBusy(true);
    setAuthNotice("");
    try {
      const { error } = await supabaseClient.auth.signOut({ scope: "local" });
      if (error) throw error;
      setAccount(null);
      setSession(null);
      setAuthEmail("");
      setAuthPassword("");
      setAuthMode("login");
      setAuthNotice("You have signed out successfully.");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      setAuthNotice(error instanceof Error ? error.message : "Could not sign out. Please try again.");
    } finally {
      setSignOutBusy(false);
    }
  }
  useEffect(() => {
    if (kind !== "data") return;
    setPlans([]); setPlan("");
    fetch("/api/plans?network=" + network).then(r => r.json()).then(d => { if (Array.isArray(d.plans)) { setPlans(d.plans); if (d.plans[0]) setPlan(d.plans[0].variation_code); } }).catch(() => {});
  }, [network, kind]);
  async function checkout(e: React.FormEvent) {
    e.preventDefault(); setNotice("");
    if (!/^0[789][01]\d{8}$/.test(phone.replace(/\s/g, ""))) return setNotice("Enter a valid 11-digit Nigerian phone number.");
    if (!email.includes("@")) return setNotice("Enter a valid email address for your receipt.");
    if (kind === "data" && !chosen) return setNotice("Choose a data plan first.");
    if (kind === "airtime" && (basePrice < 50 || basePrice > 50000)) return setNotice("Airtime must be between ₦50 and ₦50,000.");
    if (!session?.access_token) return setNotice("Please sign in or create an account before purchasing.");
    setLoading(true);
    try {
      const res = await fetch("/api/checkout", { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + session.access_token }, body: JSON.stringify({ kind, network, phone: phone.replace(/\s/g, ""), email, amount: basePrice, variationCode: chosen?.variation_code, planName: chosen?.name, commissionPercent }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not start payment.");
      window.location.href = data.authorizationUrl;
    } catch (err) { setNotice(err instanceof Error ? err.message : "Something went wrong."); setLoading(false); }
  }
  return <main>
    <header className="topbar"><a className="brand" href="#"><span className="brand-mark">S</span><span>sub<span className="brand-dot">.</span></span></a><nav className={mobileOpen ? "nav nav-open" : "nav"}><a href="#services" onClick={() => setMobileOpen(false)}>Buy data & airtime</a><a href="#account" onClick={() => setMobileOpen(false)}>My dashboard</a><a href="#how" onClick={() => setMobileOpen(false)}>How it works</a><a href="#support" onClick={() => setMobileOpen(false)}>Support</a></nav><div className="header-right"><span className="secure"><ShieldCheck size={15}/> Secure checkout</span><button className="menu-btn" onClick={() => setMobileOpen(!mobileOpen)}><Menu/></button></div></header>
    <section className="hero"><div className="hero-copy"><div className="eyebrow"><span className="pulse"/> SUB CONNECTIVITY LAB <span className="hero-status">SYSTEM ONLINE</span></div><h1>Your network.<br/><span>Under control.</span></h1><p>A precision-built control room for Nigerian data and airtime. Explore bundles, recharge securely and keep every purchase organised.</p><div className="hero-points"><span><CheckCircle2/> Four major networks</span><span><CheckCircle2/> Protected checkout</span></div></div><div className="hero-art"><div className="orbit orbit-one"/><div className="orbit orbit-two"/><div className="phone-card"><div className="phone-speaker"/><div className="phone-screen"><div className="screen-greeting">Good day 👋</div><div className="screen-title">Your connection,<br/>your way.</div><div className="screen-balance"><small>QUICK TOP-UP</small><strong>₦2,500</strong><span>Ready when you are</span></div><div className="screen-bars"><i/><i/><i/><i/></div></div></div><div className="float-chip chip-top"><Zap size={17}/> Instant top-up</div><div className="float-chip chip-bottom"><Wifi size={17}/> Data delivered</div></div></section>

    <section className="live-overview" aria-label="Platform overview">
      <div className="live-overview-head"><div><span className="live-ping"/> LIVE NETWORK MATRIX <b>4 networks supported</b></div><span>NIGERIA // CONNECTIVITY</span></div>
      <div className="live-metrics">
        <article><span className="metric-icon">◉</span><small>NETWORKS</small><strong>4</strong><em>MTN · Airtel · Glo · 9mobile</em></article>
        <article><span className="metric-icon">▤</span><small>DATA BUNDLES</small><strong>{plans.length || "—"}</strong><em>{plans.length ? "Plans loaded from provider" : "Live provider catalogue"}</em></article>
        <article><span className="metric-icon">↗</span><small>DELIVERY</small><strong>24/7</strong><em>Automated after payment</em></article>
        <article><span className="metric-icon">♧</span><small>PAYMENTS</small><strong>Secure</strong><em>Paystack checkout</em></article>
      </div>
    </section>
\n
    <section className="dashboard-preview" id="account" aria-label="Customer account dashboard">
      {!session ? <div className="account-auth-card">
        <div className="auth-copy"><div className="eyebrow">YOUR SUB ACCOUNT</div><h2>Everything connected, in one place.</h2><p>Create an account to keep your purchases together and view your real order history whenever you return.</p><div className="auth-benefit"><CheckCircle2/> Track airtime and data orders</div><div className="auth-benefit"><CheckCircle2/> See delivery and payment status</div><div className="auth-benefit"><CheckCircle2/> Keep your account private</div></div>
        <form className="auth-form" onSubmit={handleAuth}>
          <div className="auth-form-heading"><span className="auth-kicker">WELCOME TO SUB</span><h3>{authMode === "signup" ? "Create your account" : authMode === "forgot" ? "Reset your password" : "Good to see you again"}</h3><p>{authMode === "signup" ? "One account for every top-up and order." : authMode === "forgot" ? "We’ll email you a secure link to choose a new password." : "Sign in to continue to your Sub dashboard."}</p></div>
          <div className="auth-toggle"><button type="button" className={authMode === "signup" ? "active" : ""} onClick={() => {setAuthMode("signup");setAuthNotice("");setAuthNeedsResend(false);}}>Create account</button><button type="button" className={authMode !== "signup" ? "active" : ""} onClick={() => {setAuthMode("login");setAuthNotice("");setAuthNeedsResend(false);}}>Sign in</button></div>
          <label htmlFor="account-email">EMAIL ADDRESS</label><input id="account-email" type="email" autoComplete="email" placeholder="you@example.com" value={authEmail} onChange={e => setAuthEmail(e.target.value)} required/>
          {authMode !== "forgot" && <><div className="auth-password-label"><label htmlFor="account-password">PASSWORD</label>{authMode === "login" && <button type="button" onClick={() => {setAuthMode("forgot");setAuthNotice("");}}>Forgot password?</button>}</div><div className="auth-password-field"><input id="account-password" type={showPassword ? "text" : "password"} autoComplete={authMode === "signup" ? "new-password" : "current-password"} minLength={6} placeholder="At least 6 characters" value={authPassword} onChange={e => setAuthPassword(e.target.value)} required/><button type="button" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword(value => !value)}>{showPassword ? <EyeOff size={17}/> : <Eye size={17}/>}</button></div></>}
          {authMode === "forgot" && <button type="button" className="auth-back-link" onClick={() => {setAuthMode("login");setAuthNotice("");}}>← Back to sign in</button>}
          {authNotice && <p className="auth-notice">{authNotice}</p>}
          {authNeedsResend && <button type="button" className="auth-resend" disabled={authBusy} onClick={resendConfirmation}>Resend confirmation email</button>}
          <button className="auth-submit" disabled={authBusy || !supabaseClient}>{authBusy ? "Please wait…" : authMode === "signup" ? "Create my account" : authMode === "forgot" ? "Send reset link" : "Sign in securely"} <ArrowUpRight size={16}/></button>
          {authMode !== "forgot" && <><div className="auth-divider"><span>OR CONTINUE WITH</span></div><div className="auth-socials"><button type="button" disabled={authBusy || !supabaseClient} onClick={() => signInWithProvider("google")}><span className="google-g">G</span><span>Google</span></button><button type="button" disabled={authBusy || !supabaseClient} onClick={() => signInWithProvider("apple")}><Apple size={18}/><span>Apple</span></button></div><p className="auth-legal">Protected with encrypted authentication. By continuing, you agree to Sub’s terms and privacy policy.</p></>}
          {!supabaseClient && <small className="auth-config-hint">Add the Supabase URL and public publishable key in Vercel to activate account access.</small>}
        </form>
      </div> : <div className="real-account">
        <div className="account-title"><div><div className="eyebrow">CUSTOMER DASHBOARD</div><h2>Welcome back.</h2><p>{session.user?.email}</p></div><button type="button" onClick={signOut} className="signout-btn" disabled={signOutBusy || !supabaseClient} aria-live="polite">{signOutBusy ? <><span className="signout-spinner" /> Signing out…</> : "Sign out"}</button></div>
        {accountBusy ? <div className="account-loading">Loading your account activity…</div> : account ? <>
          <div className="account-stats">
            <article className="account-wallet"><small>WALLET LEDGER</small><strong>{money(Number(account.walletBalance || 0))}</strong><span>Wallet funding is not enabled yet</span></article>
            <article><small>TOTAL PURCHASES</small><strong>{account.stats.totalOrders}</strong><span>Orders on this account</span></article>
            <article><small>DELIVERED</small><strong>{account.stats.delivered}</strong><span>Successfully completed</span></article>
            <article><small>IN PROGRESS</small><strong>{account.stats.pending}</strong><span>Awaiting confirmation</span></article>
          </div>
          <div className="account-insights">
            <article className="insight-spend"><div className="insight-topline"><span>RECENT SPEND</span><span>LAST 30 ORDERS</span></div><strong>{money(trackedSpend)}</strong><p>Tracked purchases on this account</p><div className="spend-split"><span><i className="spend-dot data-dot"/> Data <b>{money(dataSpend)}</b></span><span><i className="spend-dot airtime-dot"/> Airtime <b>{money(airtimeSpend)}</b></span></div></article>
            <article className="insight-chart"><div className="insight-topline"><span>7-DAY ACTIVITY</span><span>FROM YOUR ORDERS</span></div><div className="activity-bars">{activityBars.map((day,index)=><div className="activity-day" key={day.label+index}><div className="activity-track"><i style={{height:day.height+"%"}} title={money(day.spent)}/></div><small>{day.label}</small></div>)}</div><p>Daily purchase value · {money(activityBars.reduce((sum,day)=>sum+day.spent,0))} this week</p></article>
          </div>
          <div className="account-orders-head"><div><h3>Purchase management</h3><p>Review, filter and repeat your recent top-ups.</p></div><button type="button" onClick={() => {setAccountBusy(true);fetch("/api/account",{headers:{Authorization:"Bearer "+session.access_token}}).then(async r=>{const d=await r.json();if(!r.ok)throw new Error(d.error||"Refresh failed");setAccount(d);}).catch(e=>setAuthNotice(e.message)).finally(()=>setAccountBusy(false));}}>Refresh activity</button></div>
          <div className="order-filter-tabs" role="group" aria-label="Filter purchase history">{([{id:"all",label:"All activity"},{id:"data",label:"Data"},{id:"airtime",label:"Airtime"}] as {id:"all"|"data"|"airtime";label:string}[]).map(item=><button type="button" key={item.id} className={orderFilter===item.id?"active":""} onClick={()=>setOrderFilter(item.id)}>{item.label}<span>{item.id==="all"?(account.orders||[]).length:(account.orders||[]).filter((order:any)=>order.kind===item.id).length}</span></button>)}</div>
          {filteredOrders.length ? <div className="orders-list">{filteredOrders.slice(0,12).map((order:any) => <article key={order.reference}><span className="order-kind">{order.kind === "data" ? <Wifi size={16}/> : <Smartphone size={16}/>}</span><div className="order-description"><strong>{order.network.toUpperCase()} {order.kind === "data" ? "Data" : "Airtime"}</strong><small>{order.plan_name || order.phone} · {new Date(order.created_at).toLocaleDateString("en-NG")}</small></div><b>{money(Number(order.total))}</b><em className={"order-status " + order.status}>{order.status.replaceAll("_"," ")}</em><button type="button" className="repeat-order" onClick={()=>{setKind(order.kind==="data"?"data":"airtime");setNetwork(order.network);setPhone(order.phone);setEmail(session.user?.email||"");if(order.kind==="airtime")setAmount(String(order.amount||100));setPlanCategoryFilter("all");document.getElementById("services")?.scrollIntoView({behavior:"smooth",block:"start"});}}>Buy again <ArrowUpRight size={13}/></button></article>)}</div> : <div className="empty-orders">No {orderFilter==="all"?"purchases":orderFilter+" purchases"} yet. Your top-ups will appear here after checkout.</div>}
          <div className="usage-unavailable"><Gauge size={18}/><div><strong>Live network data balance</strong><span>Your order history is connected. Remaining MB/GB requires a supported network usage API; it is not available from the current VTPass setup.</span></div></div>
        </> : <div className="account-loading">Your account activity could not be loaded. Please refresh.</div>}
      </div>}
    </section>

    <section className="purchase-wrap" id="services"><div className="purchase-heading"><div><div className="eyebrow">QUICK PURCHASE</div><h2>What do you need today?</h2><p>Choose a service and we’ll handle the rest.</p></div><div className="trust-mini"><ShieldCheck/> Safe & secure</div></div>
    <div className="purchase-card"><div className="service-tabs"><button className={kind === "data" ? "tab active" : "tab"} onClick={() => setKind("data")}><Wifi/> Buy data</button><button className={kind === "airtime" ? "tab active" : "tab"} onClick={() => setKind("airtime")}><Smartphone/> Airtime</button></div>
      <form onSubmit={checkout}><div className="form-grid"><div className="field full"><label>SELECT NETWORK</label><div className="network-grid">{networks.map(n => <button type="button" key={n.id} className={network === n.id ? "network selected" : "network"} onClick={() => setNetwork(n.id)}><span className="network-logo">{n.name === "9mobile" ? "9" : n.name.slice(0,1)}</span><span>{n.name}</span>{network === n.id && <CheckCircle2 className="network-check"/>}</button>)}</div></div>
      <div className="field"><label htmlFor="phone">PHONE NUMBER</label><div className="input-wrap"><Smartphone/><input id="phone" inputMode="numeric" placeholder="08012345678" maxLength={11} value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g,""))} required/></div><small>Enter the number to receive your {kind}.</small></div>
      {kind === "data" ? <div className="field full"><div className="plan-picker-heading"><label>CHOOSE YOUR DATA PLAN</label><span>{plans.length ? plans.length + " live bundles" : "Loading live bundles"}</span></div><div className="plan-category-tabs" role="group" aria-label="Filter data plans">{([{id:"all",label:"All plans"},{id:"daily",label:"Daily"},{id:"weekly",label:"Weekly"},{id:"monthly",label:"Monthly"},{id:"other",label:"Other"}] as {id:PlanCategory;label:string}[]).map(category => <button type="button" key={category.id} className={planCategoryFilter === category.id ? "active" : ""} onClick={() => { setPlansExpanded(false); setPlanCategoryFilter(category.id); const firstMatch = plans.find(p => category.id === "all" || planCategory(p.name) === category.id); setPlan(firstMatch?.variation_code || ""); }}>{category.label}<small>{category.id === "all" ? plans.length : plans.filter(p => planCategory(p.name) === category.id).length}</small></button>)}</div><div className="advanced-plan-grid">{filteredPlans.map((p, index) => { const selectedPlan = plan === p.variation_code; const rawPrice = Number(p.variation_amount); const customerPrice = Math.round(rawPrice * (1 + commissionPercent / 100) * 100) / 100; return <button type="button" key={p.variation_code} className={"advanced-plan " + (selectedPlan ? "selected" : "") + (index >= 4 && !plansExpanded ? " mobile-plan-hidden" : "")} onClick={() => setPlan(p.variation_code)} aria-pressed={selectedPlan}><span className="plan-card-top"><span className="plan-network-mark">{selected.name === "9mobile" ? "9" : selected.name.slice(0,1)}</span><span className="plan-validity">{planValidity(p.name)}</span>{selectedPlan && <CheckCircle2 size={17}/>}</span><strong className="plan-size">{planSize(p.name)}</strong><span className="plan-name">{p.name}</span><span className="plan-card-bottom"><span><small>YOU PAY</small><b>{money(customerPrice)}</b></span></span></button>; })}{!plans.length && <div className="plans-empty">Loading provider bundles. If this takes too long, check your VTpass API settings.</div>}{plans.length > 0 && !filteredPlans.length && <div className="plans-empty">No bundles found in this category for {selected.name}. Choose another category to see more plans.</div>}</div>{filteredPlans.length > 4 && <button type="button" className="plans-see-more" onClick={() => setPlansExpanded(value => !value)}>{plansExpanded ? "Show less" : `See more (${filteredPlans.length - 4} more)`}<span>{plansExpanded ? "⌃" : "⌄"}</span></button>}<small>Live bundles from the provider. The displayed price is the amount you pay.</small></div> : <div className="field"><label htmlFor="amount">AIRTIME AMOUNT</label><div className="input-wrap"><span className="naira">₦</span><input id="amount" type="number" min="50" max="50000" value={amount} onChange={e => setAmount(e.target.value)} required/></div><small>Minimum ₦50 · Maximum ₦50,000</small></div>}
      <div className="field full"><label htmlFor="email">EMAIL ADDRESS</label><div className="input-wrap"><span className="mail-icon">✉</span><input id="email" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required/></div><small>Your payment receipt and order updates will be sent here.</small></div></div>
      <div className="price-summary"><div className="total-row"><span>Total to pay</span><strong>{total ? money(total) : "—"}</strong></div></div>
      {notice && <div className="notice">{notice}</div>}<button className="pay-btn" type="submit" disabled={loading || (kind === "data" && !plans.length)}>{loading ? "Preparing secure payment…" : <>Continue to payment <ArrowUpRight size={18}/></>}</button><div className="payment-note"><ShieldCheck size={15}/> Payments are processed securely by Paystack</div></form>
    </div></section>

    <section className="connectivity-suite" aria-label="Data and airtime management">
      <div className="suite-heading"><div><div className="eyebrow">YOUR CONNECTIVITY TOOLKIT</div><h2>Everything essential.<br/><span>Nothing extra.</span></h2><p>Manage the two things that keep you connected, with one account and a clear purchase history.</p></div><div className="suite-orbit"><span>SUB</span><i/><i/><i/></div></div>
      <div className="suite-cards">
        <article className="suite-card suite-data"><div className="suite-card-icon"><Wifi size={22}/></div><small>DATA MANAGEMENT</small><h3>Find your next bundle.</h3><p>Compare network bundles by validity, size and price. Filter daily, weekly and monthly options.</p><button type="button" onClick={()=>{setKind("data");document.getElementById("services")?.scrollIntoView({behavior:"smooth",block:"start"});}}>Explore data plans <ArrowUpRight size={16}/></button></article>
        <article className="suite-card suite-airtime"><div className="suite-card-icon"><Smartphone size={22}/></div><small>AIRTIME MANAGEMENT</small><h3>Top up in seconds.</h3><p>Choose your network, set an amount and securely recharge any supported Nigerian number.</p><button type="button" onClick={()=>{setKind("airtime");document.getElementById("services")?.scrollIntoView({behavior:"smooth",block:"start"});}}>Buy airtime <ArrowUpRight size={16}/></button></article>
        <article className="suite-card suite-history"><div className="suite-card-icon"><Activity size={22}/></div><small>ACCOUNT CONTROL</small><h3>Your activity, organised.</h3><p>Review purchases, see delivery status, filter by service and repeat a previous top-up.</p><button type="button" onClick={()=>document.getElementById("account")?.scrollIntoView({behavior:"smooth",block:"start"})}>Open dashboard <ArrowUpRight size={16}/></button></article>
      </div>
    </section>
\n    <section className="benefits" id="how"><div className="eyebrow">WHY SUB?</div><h2>Small steps. Big convenience.</h2><div className="benefit-grid"><article><span className="benefit-icon"><Zap/></span><h3>Fast delivery</h3><p>Your airtime or data is processed automatically after payment confirmation.</p></article><article><span className="benefit-icon"><CreditCard/></span><h3>Clear pricing</h3><p>See the full price before you pay. No hidden charges at checkout.</p></article><article><span className="benefit-icon"><ShieldCheck/></span><h3>Protected payments</h3><p>Payment verification happens securely on our server before any top-up.</p></article></div></section>
    <footer id="support"><a className="brand" href="#"><span className="brand-mark">S</span><span>sub<span className="brand-dot">.</span></span></a><span>Simple, affordable connectivity for everyone.</span><a href="mailto:support@example.com">Need help? Contact support <ArrowUpRight size={14}/></a><small>© {new Date().getFullYear()} Sub. All rights reserved.</small></footer>
    </main>;
}
