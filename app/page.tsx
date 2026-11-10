"use client";
import { useEffect, useMemo, useState } from "react";
import { ArrowDownLeft, ArrowUpRight, CheckCircle2, ChevronDown, CircleHelp, Clock3, CreditCard, Menu, ShieldCheck, Smartphone, Wifi, Zap } from "lucide-react";

type Plan = { variation_code: string; name: string; variation_amount: string; fixedPrice: string };
const networks = [
  { id: "mtn", name: "MTN", color: "#ffca05", text: "#171717", service: "mtn-data", airtime: "mtn" },
  { id: "airtel", name: "Airtel", color: "#e31b36", text: "#fff", service: "airtel-data", airtime: "airtel" },
  { id: "glo", name: "Glo", color: "#159447", text: "#fff", service: "glo-data", airtime: "glo" },
  { id: "9mobile", name: "9mobile", color: "#087b48", text: "#fff", service: "9mobile-data", airtime: "etisalat" },
];
const money = (n: number) => "₦" + n.toLocaleString("en-NG");
export default function Home() {
  const [kind, setKind] = useState<"data" | "airtime">("data");
  const [network, setNetwork] = useState("mtn");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [amount, setAmount] = useState("100");
  const [plans, setPlans] = useState<Plan[]>([]);
  const [plan, setPlan] = useState("");
  const [markup] = useState(Number(process.env.NEXT_PUBLIC_COMMISSION_NAIRA || "30"));
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const selected = networks.find(n => n.id === network)!;
  const chosen = plans.find(p => p.variation_code === plan);
  const basePrice = kind === "airtime" ? Number(amount) : Number(chosen?.variation_amount || 0);
  const total = useMemo(() => basePrice ? Math.ceil(basePrice + markup) : 0, [basePrice, markup]);
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
    setLoading(true);
    try {
      const res = await fetch("/api/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind, network, phone: phone.replace(/\s/g, ""), email, amount: basePrice, variationCode: chosen?.variation_code, planName: chosen?.name, markup }) });
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
\n    <section className="purchase-wrap" id="services"><div className="purchase-heading"><div><div className="eyebrow">QUICK PURCHASE</div><h2>What do you need today?</h2><p>Choose a service and we’ll handle the rest.</p></div><div className="trust-mini"><ShieldCheck/> Safe & secure</div></div>
    <div className="purchase-card"><div className="service-tabs"><button className={kind === "data" ? "tab active" : "tab"} onClick={() => setKind("data")}><Wifi/> Buy data</button><button className={kind === "airtime" ? "tab active" : "tab"} onClick={() => setKind("airtime")}><Smartphone/> Airtime</button></div>
      <form onSubmit={checkout}><div className="form-grid"><div className="field full"><label>SELECT NETWORK</label><div className="network-grid">{networks.map(n => <button type="button" key={n.id} className={network === n.id ? "network selected" : "network"} onClick={() => setNetwork(n.id)}><span className="network-logo" style={{background:n.color,color:n.text}}>{n.name === "9mobile" ? "9" : n.name.slice(0,1)}</span><span>{n.name}</span>{network === n.id && <CheckCircle2 className="network-check"/>}</button>)}</div></div>
      <div className="field"><label htmlFor="phone">PHONE NUMBER</label><div className="input-wrap"><Smartphone/><input id="phone" inputMode="numeric" placeholder="08012345678" maxLength={11} value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g,""))} required/></div><small>Enter the number to receive your {kind}.</small></div>
      {kind === "data" ? <div className="field"><label htmlFor="plan">CHOOSE DATA PLAN</label><div className="select-wrap"><select id="plan" value={plan} onChange={e => setPlan(e.target.value)} required><option value="">{plans.length ? "Choose a bundle" : "Loading available plans…"}</option>{plans.map(p => <option key={p.variation_code} value={p.variation_code}>{p.name} — {money(Number(p.variation_amount))}</option>)}</select><ChevronDown/></div><small>Plans and base prices are loaded from the provider.</small></div> : <div className="field"><label htmlFor="amount">AIRTIME AMOUNT</label><div className="input-wrap"><span className="naira">₦</span><input id="amount" type="number" min="50" max="50000" value={amount} onChange={e => setAmount(e.target.value)} required/></div><small>Minimum ₦50 · Maximum ₦50,000</small></div>}
      <div className="field full"><label htmlFor="email">EMAIL ADDRESS</label><div className="input-wrap"><span className="mail-icon">✉</span><input id="email" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required/></div><small>Your payment receipt and order updates will be sent here.</small></div></div>
      <div className="price-summary"><div><span>Service amount</span><strong>{basePrice ? money(basePrice) : "—"}</strong></div><div><span>Service fee</span><strong>{basePrice ? money(markup) : "—"}</strong></div><div className="total-row"><span>Total to pay</span><strong>{total ? money(total) : "—"}</strong></div></div>
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
