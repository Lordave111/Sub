"use client";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { Activity, ArrowUpRight, CheckCircle2, CreditCard, Gauge, Menu, ShieldCheck, Smartphone, TrendingUp, Wallet, Wifi, Zap } from "lucide-react";

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
export default function Home() {
  const [kind, setKind] = useState<"data" | "airtime">("data");
  const [network, setNetwork] = useState("mtn");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [amount, setAmount] = useState("100");
  const [plans, setPlans] = useState<Plan[]>([]);
  const [plan, setPlan] = useState("");
  const [commissionPercent] = useState(Number(process.env.NEXT_PUBLIC_COMMISSION_PERCENT || "20"));
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [supabaseClient] = useState(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    return url && key ? createClient(url, key) : null;
  });
  const [session, setSession] = useState<any>(null);
  const [authMode, setAuthMode] = useState<"login" | "signup">("signup");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [authNotice, setAuthNotice] = useState("");
  const [account, setAccount] = useState<any>(null);
  const [accountBusy, setAccountBusy] = useState(false);
  const [usagePeriod, setUsagePeriod] = useState<"week" | "month">("week");
  const usageBars = usagePeriod === "week"
    ? [{ day: "M", value: 42 }, { day: "T", value: 66 }, { day: "W", value: 54 }, { day: "T", value: 82 }, { day: "F", value: 61 }, { day: "S", value: 94 }, { day: "S", value: 48 }]
    : [{ day: "W1", value: 48 }, { day: "W2", value: 72 }, { day: "W3", value: 56 }, { day: "W4", value: 88 }];

  const selected = networks.find(n => n.id === network)!;
  const chosen = plans.find(p => p.variation_code === plan);
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
    e.preventDefault(); setAuthNotice("");
    if (!supabaseClient) { setAuthNotice("Supabase is not connected. Check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in Vercel."); return; }
    setAuthBusy(true);
    try {
      const result = authMode === "signup"
        ? await supabaseClient.auth.signUp({ email: authEmail, password: authPassword })
        : await supabaseClient.auth.signInWithPassword({ email: authEmail, password: authPassword });
      if (result.error) throw result.error;
      setEmail(authEmail);
      if (authMode === "signup" && !result.data.session) setAuthNotice("Account created. Check your email to confirm it, then sign in.");
      else setAuthNotice(authMode === "signup" ? "Your account is ready." : "Welcome back.");
    } catch (error) { setAuthNotice(error instanceof Error ? error.message : "Authentication failed."); }
    finally { setAuthBusy(false); }
  }
  async function signOut() {
    await supabaseClient?.auth.signOut();
    setAccount(null);
    setAuthNotice("You have signed out.");
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
    <header className="topbar"><a className="brand" href="#"><span className="brand-mark">S</span><span>sub<span className="brand-dot">.</span></span></a><nav className={mobileOpen ? "nav nav-open" : "nav"}><a href="#services">Services</a><a href="#how">How it works</a><a href="#support">Support</a></nav><div className="header-right"><span className="secure"><ShieldCheck size={15}/> Secure checkout</span><button className="menu-btn" onClick={() => setMobileOpen(!mobileOpen)}><Menu/></button></div></header>
    <section className="hero"><div className="hero-copy"><div className="eyebrow"><span className="pulse"/> SIMPLE. FAST. AFFORDABLE.</div><h1>Stay connected.<br/><span>Spend less.</span></h1><p>Instant airtime and data top-ups for every network in Nigeria. Great value, zero stress.</p><div className="hero-points"><span><CheckCircle2/> Instant delivery</span><span><CheckCircle2/> Secure payments</span></div></div><div className="hero-art"><div className="orbit orbit-one"/><div className="orbit orbit-two"/><div className="phone-card"><div className="phone-speaker"/><div className="phone-screen"><div className="screen-greeting">Good day 👋</div><div className="screen-title">Your connection,<br/>your way.</div><div className="screen-balance"><small>QUICK TOP-UP</small><strong>₦2,500</strong><span>Ready when you are</span></div><div className="screen-bars"><i/><i/><i/><i/></div></div></div><div className="float-chip chip-top"><Zap size={17}/> Instant top-up</div><div className="float-chip chip-bottom"><Wifi size={17}/> Data delivered</div></div></section>

    <section className="live-overview" aria-label="Platform overview">
      <div className="live-overview-head"><div><span className="live-ping"/> NETWORK COVERAGE <b>4 networks supported</b></div><span>POWERED FOR NIGERIA</span></div>
      <div className="live-metrics">
        <article><span className="metric-icon">◉</span><small>NETWORKS</small><strong>4</strong><em>MTN · Airtel · Glo · 9mobile</em></article>
        <article><span className="metric-icon">▤</span><small>DATA BUNDLES</small><strong>{plans.length || "—"}</strong><em>{plans.length ? "Plans loaded from provider" : "Live provider catalogue"}</em></article>
        <article><span className="metric-icon">↗</span><small>DELIVERY</small><strong>24/7</strong><em>Automated after payment</em></article>
        <article><span className="metric-icon">♧</span><small>PAYMENTS</small><strong>Secure</strong><em>Paystack checkout</em></article>
      </div>
    </section>
\n
    <section className="dashboard-preview" aria-label="Customer account dashboard">
      {!session ? <div className="account-auth-card">
        <div className="auth-copy"><div className="eyebrow">YOUR SUB ACCOUNT</div><h2>Everything connected, in one place.</h2><p>Create an account to keep your purchases together and view your real order history whenever you return.</p><div className="auth-benefit"><CheckCircle2/> Track airtime and data orders</div><div className="auth-benefit"><CheckCircle2/> See delivery and payment status</div><div className="auth-benefit"><CheckCircle2/> Keep your account private</div></div>
        <form className="auth-form" onSubmit={handleAuth}>
          <div className="auth-toggle"><button type="button" className={authMode === "signup" ? "active" : ""} onClick={() => {setAuthMode("signup");setAuthNotice("");}}>Create account</button><button type="button" className={authMode === "login" ? "active" : ""} onClick={() => {setAuthMode("login");setAuthNotice("");}}>Sign in</button></div>
          <label htmlFor="account-email">EMAIL ADDRESS</label><input id="account-email" type="email" autoComplete="email" placeholder="you@example.com" value={authEmail} onChange={e => setAuthEmail(e.target.value)} required/>
          <label htmlFor="account-password">PASSWORD</label><input id="account-password" type="password" autoComplete={authMode === "signup" ? "new-password" : "current-password"} minLength={6} placeholder="At least 6 characters" value={authPassword} onChange={e => setAuthPassword(e.target.value)} required/>
          {authNotice && <p className="auth-notice">{authNotice}</p>}
          <button className="auth-submit" disabled={authBusy || !supabaseClient}>{authBusy ? "Please wait…" : authMode === "signup" ? "Create my account" : "Sign in securely"} <ArrowUpRight size={16}/></button>
          {!supabaseClient && <small className="auth-config-hint">Account sign-in will activate after the Supabase public key is added in Vercel.</small>}
        </form>
      </div> : <div className="real-account">
        <div className="account-title"><div><div className="eyebrow">CUSTOMER DASHBOARD</div><h2>Welcome back.</h2><p>{session.user?.email}</p></div><button type="button" onClick={signOut} className="signout-btn">Sign out</button></div>
        {accountBusy ? <div className="account-loading">Loading your account activity…</div> : account ? <>
          <div className="account-stats">
            <article className="account-wallet"><small>WALLET LEDGER</small><strong>{money(Number(account.walletBalance || 0))}</strong><span>Wallet funding is not enabled yet</span></article>
            <article><small>TOTAL PURCHASES</small><strong>{account.stats.totalOrders}</strong><span>Orders on this account</span></article>
            <article><small>DELIVERED</small><strong>{account.stats.delivered}</strong><span>Successfully completed</span></article>
            <article><small>IN PROGRESS</small><strong>{account.stats.pending}</strong><span>Awaiting confirmation</span></article>
          </div>
          <div className="account-orders-head"><div><h3>Recent purchases</h3><p>Your order records, loaded from your account.</p></div><button type="button" onClick={() => {setAccountBusy(true);fetch("/api/account",{headers:{Authorization:"Bearer "+session.access_token}}).then(r=>r.json()).then(setAccount).finally(()=>setAccountBusy(false));}}>Refresh</button></div>
          {account.orders.length ? <div className="orders-list">{account.orders.slice(0,8).map((order:any) => <article key={order.reference}><span className="order-kind">{order.kind === "data" ? <Wifi size={16}/> : <Smartphone size={16}/>}</span><div className="order-description"><strong>{order.network.toUpperCase()} {order.kind === "data" ? "Data" : "Airtime"}</strong><small>{order.plan_name || order.phone} · {new Date(order.created_at).toLocaleDateString("en-NG")}</small></div><b>{money(Number(order.total))}</b><em className={"order-status " + order.status}>{order.status.replaceAll("_"," ")}</em></article>)}</div> : <div className="empty-orders">No purchases yet. Your completed and pending orders will appear here.</div>}
          <div className="usage-unavailable"><Gauge size={18}/><div><strong>Live network data balance</strong><span>Your order history is connected. Remaining MB/GB requires a supported network usage API; it is not available from the current VTPass setup.</span></div></div>
        </> : <div className="account-loading">Your account activity could not be loaded. Please refresh.</div>}
      </div>}
    </section>

    <section className="purchase-wrap" id="services"><div className="purchase-heading"><div><div className="eyebrow">QUICK PURCHASE</div><h2>What do you need today?</h2><p>Choose a service and we’ll handle the rest.</p></div><div className="trust-mini"><ShieldCheck/> Safe & secure</div></div>
    <div className="purchase-card"><div className="service-tabs"><button className={kind === "data" ? "tab active" : "tab"} onClick={() => setKind("data")}><Wifi/> Buy data</button><button className={kind === "airtime" ? "tab active" : "tab"} onClick={() => setKind("airtime")}><Smartphone/> Airtime</button></div>
      <form onSubmit={checkout}><div className="form-grid"><div className="field full"><label>SELECT NETWORK</label><div className="network-grid">{networks.map(n => <button type="button" key={n.id} className={network === n.id ? "network selected" : "network"} onClick={() => setNetwork(n.id)}><span className="network-logo" style={{background:n.color,color:n.text}}>{n.name === "9mobile" ? "9" : n.name.slice(0,1)}</span><span>{n.name}</span>{network === n.id && <CheckCircle2 className="network-check"/>}</button>)}</div></div>
      <div className="field"><label htmlFor="phone">PHONE NUMBER</label><div className="input-wrap"><Smartphone/><input id="phone" inputMode="numeric" placeholder="08012345678" maxLength={11} value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g,""))} required/></div><small>Enter the number to receive your {kind}.</small></div>
      {kind === "data" ? <div className="field full"><div className="plan-picker-heading"><label>CHOOSE YOUR DATA PLAN</label><span>{plans.length ? plans.length + " live bundles" : "Loading live bundles"}</span></div><div className="advanced-plan-grid">{plans.map(p => { const selectedPlan = plan === p.variation_code; const rawPrice = Number(p.variation_amount); const customerPrice = Math.round(rawPrice * (1 + commissionPercent / 100) * 100) / 100; return <button type="button" key={p.variation_code} className={"advanced-plan " + (selectedPlan ? "selected" : "")} onClick={() => setPlan(p.variation_code)} aria-pressed={selectedPlan}><span className="plan-card-top"><span className="plan-network-mark" style={{background:selected.color,color:selected.text}}>{selected.name === "9mobile" ? "9" : selected.name.slice(0,1)}</span><span className="plan-validity">{planValidity(p.name)}</span>{selectedPlan && <CheckCircle2 size={17}/>}</span><strong className="plan-size">{planSize(p.name)}</strong><span className="plan-name">{p.name}</span><span className="plan-card-bottom"><span><small>YOU PAY</small><b>{money(customerPrice)}</b></span><span className="plan-base-price">{money(rawPrice)} base</span></span></button>; })}{!plans.length && <div className="plans-empty">Loading provider bundles. If this takes too long, check your VTpass API settings.</div>}</div><small>Live bundles from the provider. Prices include your {commissionPercent}% service fee.</small></div> : <div className="field"><label htmlFor="amount">AIRTIME AMOUNT</label><div className="input-wrap"><span className="naira">₦</span><input id="amount" type="number" min="50" max="50000" value={amount} onChange={e => setAmount(e.target.value)} required/></div><small>Minimum ₦50 · Maximum ₦50,000</small></div>}
      <div className="field full"><label htmlFor="email">EMAIL ADDRESS</label><div className="input-wrap"><span className="mail-icon">✉</span><input id="email" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required/></div><small>Your payment receipt and order updates will be sent here.</small></div></div>
      <div className="price-summary"><div><span>Service amount</span><strong>{basePrice ? money(basePrice) : "—"}</strong></div><div><span>Service fee ({commissionPercent}%)</span><strong>{basePrice ? money(serviceFee) : "—"}</strong></div><div className="total-row"><span>Total to pay</span><strong>{total ? money(total) : "—"}</strong></div></div>
      {notice && <div className="notice">{notice}</div>}<button className="pay-btn" type="submit" disabled={loading || (kind === "data" && !plans.length)}>{loading ? "Preparing secure payment…" : <>Continue to payment <ArrowUpRight size={18}/></>}</button><div className="payment-note"><ShieldCheck size={15}/> Payments are processed securely by Paystack</div></form>
    </div></section>

    <section className="more-services" aria-label="More services">
      <div className="more-services-heading"><div><div className="eyebrow">MORE FROM SUB</div><h2>More ways to stay sorted.</h2><p>Your everyday digital services, in one simple place.</p></div><span>MORE SERVICES <b>COMING SOON</b></span></div>
      <div className="more-services-grid">
        <article><i>▣</i><div><b>TV subscriptions</b><small>Renew DStv, GOtv and Startimes packages.</small></div><em>Coming soon</em></article>
        <article><i>ϟ</i><div><b>Electricity bills</b><small>Pay prepaid and postpaid electricity bills.</small></div><em>Coming soon</em></article>
        <article><i>▤</i><div><b>Education pins</b><small>Get exam and learning service pins.</small></div><em>Coming soon</em></article>
        <article><i>◷</i><div><b>Order tracking</b><small>Check payment and delivery progress.</small></div><em>Use receipt link</em></article>
      </div>
    </section>
\n    <section className="benefits" id="how"><div className="eyebrow">WHY SUB?</div><h2>Small steps. Big convenience.</h2><div className="benefit-grid"><article><span className="benefit-icon"><Zap/></span><h3>Fast delivery</h3><p>Your airtime or data is processed automatically after payment confirmation.</p></article><article><span className="benefit-icon"><CreditCard/></span><h3>Clear pricing</h3><p>See the full price before you pay. No hidden charges at checkout.</p></article><article><span className="benefit-icon"><ShieldCheck/></span><h3>Protected payments</h3><p>Payment verification happens securely on our server before any top-up.</p></article></div></section>
    <footer id="support"><a className="brand" href="#"><span className="brand-mark">S</span><span>sub<span className="brand-dot">.</span></span></a><span>Simple, affordable connectivity for everyone.</span><a href="mailto:support@example.com">Need help? Contact support <ArrowUpRight size={14}/></a><small>© {new Date().getFullYear()} Sub. All rights reserved.</small></footer>
    </main>;
}
