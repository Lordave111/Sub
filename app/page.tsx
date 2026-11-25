"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  Activity, AlertTriangle, ArrowDownRight, ArrowUpRight, BadgeCheck, Bell, PlayCircle,
  Building2, Check, ChevronDown, ChevronRight, CircleHelp, Clock3, Copy,
  ExternalLink, Eye, FileSearch, Fingerprint, Globe2, LayoutDashboard, Link2,
  LockKeyhole, Menu, MessageCircle, Plus, Search, Send, Settings, Shield,
  ShieldAlert, ShieldCheck, Smartphone, Sparkles, Target, Users, WalletCards,
  X, Zap
} from "lucide-react";

const fraudGuardAuth = process.env.NEXT_PUBLIC_SUPABASE_URL && (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!) : null;

type ScanResult = {
  score: number;
  level: "low" | "medium" | "high";
  verdict: string;
  summary: string;
  signals: { title: string; detail: string; severity: "high" | "medium" | "low" }[];
  recommendations: string[];
  checkedAt: string;
};

const navGroups = [
  { label: "WORKSPACE", items: [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "scanner", label: "Chat & scam detector", icon: FileSearch, tag: "AI" },
    { id: "reports", label: "Threat reports", icon: ShieldAlert },
  ]},
  { label: "PROTECTION", items: [
    { id: "connections", label: "Connected accounts", icon: Link2 },
    { id: "business", label: "Business security", icon: Building2 },
    { id: "activity", label: "Security activity", icon: Activity },
  ]},
];

const demoThreats = [
  { title: "Guaranteed 40% weekly returns", channel: "Investment message", level: "High risk", time: "12 min ago", color: "red" },
  { title: "Look-alike delivery payment page", channel: "Suspicious URL", level: "Review", time: "1 hr ago", color: "amber" },
  { title: "Urgent account verification request", channel: "Message analysis", level: "Caution", time: "Yesterday", color: "amber" },
];

export default function Home() {
  const [active, setActive] = useState("overview");
  const [mobileNav, setMobileNav] = useState(false);
  const [scanInput, setScanInput] = useState("");
  const [scanType, setScanType] = useState<"message" | "link" | "investment">("message");
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [aiResult, setAiResult] = useState<any>(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [reportText, setReportText] = useState("");
  const [reportNotice, setReportNotice] = useState("");
  const [businessMode, setBusinessMode] = useState(false);
  const [socialConnections, setSocialConnections] = useState<any[]>([]);
  const [socialNotice, setSocialNotice] = useState("");

  useEffect(() => {
    if (active !== "connections" || !fraudGuardAuth) return;
    let alive = true;
    fraudGuardAuth.auth.getSession().then(async ({ data }) => {
      if (!data.session?.access_token) return;
      try {
        const response = await fetch("/api/social/connections", { headers: { Authorization: "Bearer " + data.session.access_token } });
        const payload = await response.json();
        if (alive && response.ok) setSocialConnections(payload.connections || []);
        else if (alive && !response.ok) setSocialNotice(payload.error || "Could not load connected accounts.");
      } catch { if (alive) setSocialNotice("Could not load connected accounts."); }
    });
    return () => { alive = false; };
  }, [active]);

  async function disconnectSocialAccount(id: string) {
    const session = fraudGuardAuth ? (await fraudGuardAuth.auth.getSession()).data.session : null;
    if (!session?.access_token) { window.location.href = "/auth"; return; }
    if (!window.confirm("Remove this connection and delete its stored authorization tokens from FraudGuard?")) return;
    try {
      const response = await fetch("/api/social/connections", { method: "DELETE", headers: { "Content-Type": "application/json", Authorization: "Bearer " + session.access_token }, body: JSON.stringify({ id }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not disconnect account.");
      setSocialConnections((items) => items.filter((item) => item.id !== id));
      setSocialNotice("Connection removed and stored tokens deleted. You can also revoke FraudGuard in the platform's connected-app settings.");
    } catch (error) { setSocialNotice(error instanceof Error ? error.message : "Could not disconnect account."); }
  }

  const pageTitle = useMemo(() => {
    const titles: Record<string, string> = {
      overview: "Security overview", scanner: "Chat & scam detector", reports: "Threat intelligence",
      connections: "Connected accounts", business: "Business protection", activity: "Security activity"
    };
    return titles[active] || "Security overview";
  }, [active]);

  async function runScan(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setResult(null);
    if (scanInput.trim().length < 8) {
      setError("Paste a longer message or a complete link so FraudGuard can inspect it.");
      return;
    }
    setScanning(true);
    try {
      const session = fraudGuardAuth ? (await fraudGuardAuth.auth.getSession()).data.session : null;
      const response = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(session?.access_token ? { Authorization: "Bearer " + session.access_token } : {}) },
        body: JSON.stringify({ content: scanInput.trim(), type: scanType }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "The scan could not be completed.");
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "The scan could not be completed.");
    } finally {
      setScanning(false);
    }
  }

  async function copyResult() {
    if (!result) return;
    const text = [
      "FraudGuard scan",
      "Risk: " + result.level.toUpperCase() + " (" + result.score + "/100)",
      result.verdict,
      result.summary,
      ...result.signals.map((signal) => "- " + signal.title + ": " + signal.detail),
      "This is an automated assessment, not proof of fraud."
    ].join("\n");
    await navigator.clipboard.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  function submitReport(event: React.FormEvent) {
    event.preventDefault();
    if (reportText.trim().length < 12) {
      setReportNotice("Please add a little more detail before submitting.");
      return;
    }
    setReportNotice("Your report is ready. Sign-in and secure report storage will be enabled in the next integration stage. No report has been uploaded.");
  }

  async function runAiAnalysis() {
    const session = fraudGuardAuth ? (await fraudGuardAuth.auth.getSession()).data.session : null;
    if (!session?.access_token) { window.location.href = "/auth"; return; }
    setAiBusy(true); setAiResult(null);
    try {
      const response = await fetch("/api/ai-analysis", { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + session.access_token }, body: JSON.stringify({ content: scanInput.trim(), type: scanType }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "AI analysis failed.");
      setAiResult(data);
    } catch (err) { setError(err instanceof Error ? err.message : "AI analysis failed."); }
    finally { setAiBusy(false); }
  }

  function navigate(id: string) {
    setActive(id);
    setMobileNav(false);
  }

  return (
    <main className="app-shell">
      {mobileNav && <button className="mobile-scrim" aria-label="Close navigation" onClick={() => setMobileNav(false)} />}
      <aside className={mobileNav ? "sidebar sidebar-open" : "sidebar"}>
        <a className="brand" href="#" onClick={() => navigate("overview")}>
          <span className="brand-mark"><ShieldCheck size={21} strokeWidth={2.4}/></span>
          <span className="brand-name">Fraud<span>Guard</span><small>SECURITY INTELLIGENCE</small></span>
        </a>
        <div className="workspace-switch">
          <span className="workspace-icon"><Fingerprint size={17}/></span>
          <span><b>Personal workspace</b><small>Free protection plan</small></span>
          <ChevronDown size={15}/>
        </div>
        <nav className="side-nav">
          {navGroups.map((group) => <div className="nav-group" key={group.label}>
            <p className="nav-caption">{group.label}</p>
            {group.items.map((item) => {
              const Icon = item.icon;
              return <button key={item.id} className={active === item.id ? "nav-item active" : "nav-item"} onClick={() => navigate(item.id)}>
                <Icon size={18}/><span>{item.label}</span>{item.tag && <em>{item.tag}</em>}
              </button>;
            })}
          </div>)}
        </nav>
        <div className="sidebar-spacer"/>
        <div className="help-card">
          <div className="help-icon"><CircleHelp size={18}/></div>
          <b>Need a hand?</b>
          <p>Learn how to spot suspicious activity and protect your accounts.</p>
          <a href="#safety-guide">Explore safety guide <ArrowUpRight size={14}/></a>
        </div>
        <div className="profile-row">
          <div className="avatar">FG</div>
          <div><b>FraudGuard guest</b><small><a href="/auth">Sign in or create account</a></small></div>
          <Settings size={17}/>
        </div>
      </aside>

      <section className="main-area">
        <header className="topbar">
          <button className="mobile-menu" onClick={() => setMobileNav(true)} aria-label="Open navigation"><Menu/></button>
          <div className="breadcrumbs"><span>Workspace</span><ChevronRight size={14}/><b>{pageTitle}</b></div>
          <div className="top-actions">
            <span className="system-status"><i/> Protection engine online</span>
            <button className="icon-button" aria-label="Notifications"><Bell size={18}/><i/></button>
            <a className="auth-nav-link" href="/community">Community</a><a className="auth-nav-link" href="/portal">My workspace</a><a className="auth-nav-link" href="/auth">Sign in</a><div className="top-avatar">FG</div>
          </div>
        </header>

        <div className="page-content">
          {active === "overview" && <>
            <div className="welcome-row">
              <div><div className="eyebrow"><span/> YOUR DIGITAL SAFETY, IN ONE PLACE</div><h1>Stay one step ahead.</h1><p>Spot suspicious messages, links and money-making schemes before they cost you.</p></div>
              <button className="primary-button" onClick={() => navigate("scanner")}><Sparkles size={17}/> Scan something <ArrowUpRight size={16}/></button>
            </div>
            <section className="hero-panel">
              <div className="hero-copy">
                <div className="hero-kicker"><Shield size={14}/> FRAUDGUARD PROTECTION</div>
                <h2>Think before you<br/><span>click, pay or share.</span></h2>
                <p>Check a message, website or investment pitch with a guided risk assessment. Get clear warning signs and practical next steps.</p>
                <button className="hero-button" onClick={() => navigate("scanner")}>Open scam scanner <ArrowUpRight size={16}/></button>
                <div className="hero-footnote"><LockKeyhole size={13}/> Raw scan text is not saved. Optional AI and URL reputation providers receive submitted content for analysis.</div>
              </div>
              <div className="shield-art" aria-hidden="true">
                <div className="shield-orbit orbit-a"/><div className="shield-orbit orbit-b"/>
                <div className="shield-glow"><ShieldCheck size={82} strokeWidth={1.2}/></div>
                <span className="orbit-dot dot-a"/><span className="orbit-dot dot-b"/><span className="orbit-dot dot-c"/>
                <div className="floating-signal signal-one"><span><Check size={13}/></span> Link inspection</div>
                <div className="floating-signal signal-two"><span><Activity size={13}/></span> Threat analysis</div>
              </div>
            </section>
            <div className="section-heading"><div><h3>Protection at a glance</h3><p>Your workspace status and available tools</p></div><span className="demo-label">PREVIEW DATA</span></div>
            <div className="stats-grid">
              <article className="stat-card"><div className="stat-top"><span>SCANS RUN</span><span className="stat-icon violet"><FileSearch size={17}/></span></div><strong>—</strong><small>No scans recorded yet</small></article>
              <article className="stat-card"><div className="stat-top"><span>THREATS FLAGGED</span><span className="stat-icon red"><ShieldAlert size={17}/></span></div><strong>—</strong><small>Run your first scan to begin</small></article>
              <article className="stat-card"><div className="stat-top"><span>CONNECTED ACCOUNTS</span><span className="stat-icon blue"><Link2 size={17}/></span></div><strong>0</strong><small>Connect supported services</small></article>
              <article className="stat-card"><div className="stat-top"><span>PROTECTION STATUS</span><span className="stat-icon green"><BadgeCheck size={17}/></span></div><strong className="status-word">Ready</strong><small>Manual scanning is available</small></article>
            </div>
            <div className="content-grid">
              <section className="surface-card">
                <div className="card-heading"><div><h3>Recent threat patterns</h3><p>Examples of common scam tactics</p></div><button className="text-button" onClick={() => navigate("reports")}>View intelligence <ArrowUpRight size={14}/></button></div>
                <div className="threat-list">{demoThreats.map((threat) => <div className="threat-row" key={threat.title}><span className={"threat-symbol " + threat.color}><AlertTriangle size={16}/></span><div className="threat-info"><b>{threat.title}</b><small>{threat.channel}</small></div><span className={"risk-pill " + threat.color}>{threat.level}</span><time>{threat.time}</time></div>)}</div>
                <p className="sample-note">Illustrative examples only — not live reports or verified incidents.</p>
              </section>
              <section className="surface-card quick-card">
                <div className="card-heading"><div><h3>Quick safety check</h3><p>Choose what you want to inspect</p></div></div>
                <button className="quick-action" onClick={() => { setScanType("message"); navigate("scanner"); }}><span className="quick-icon purple"><MessageCircle size={18}/></span><span><b>Suspicious message</b><small>WhatsApp, SMS or DM</small></span><ChevronRight size={17}/></button>
                <button className="quick-action" onClick={() => { setScanType("link"); navigate("scanner"); }}><span className="quick-icon blue"><Globe2 size={18}/></span><span><b>Website or link</b><small>Check for phishing signals</small></span><ChevronRight size={17}/></button>
                <button className="quick-action" onClick={() => { setScanType("investment"); navigate("scanner"); }}><span className="quick-icon orange"><WalletCards size={18}/></span><span><b>Investment offer</b><small>Review return promises</small></span><ChevronRight size={17}/></button>
              </section>
            </div>
            <section className="bottom-banner" id="safety-guide"><div className="banner-icon"><Users size={20}/></div><div><b>Protection works better when everyone stays alert.</b><p>Never share your OTP, PIN, password or recovery code — even with someone claiming to be support.</p></div><a href="https://www.cbn.gov.ng/" target="_blank" rel="noreferrer">Security resources <ExternalLink size={14}/></a></section>
          </>}

          {active === "scanner" && <>
            <div className="page-intro"><div className="eyebrow"><span/> MANUAL THREAT ANALYSIS</div><h1>Check who you are chatting with.</h1><p>Paste a conversation from WhatsApp, Instagram, Facebook, SMS or another platform. FraudGuard checks the full chat for scam tactics, suspicious requests and pressure patterns.</p></div>
            <div className="scanner-layout">
              <section className="surface-card scanner-card">
                <div className="card-heading"><div><h3>New security scan</h3><p>Choose a scan type and add the content below</p></div><span className="secure-tag"><LockKeyhole size={13}/> Private check</span></div>
                <div className="scan-tabs">
                  <button className={scanType === "message" ? "scan-tab selected" : "scan-tab"} onClick={() => setScanType("message")}><MessageCircle size={16}/> Message</button>
                  <button className={scanType === "link" ? "scan-tab selected" : "scan-tab"} onClick={() => setScanType("link")}><Globe2 size={16}/> Website link</button>
                  <button className={scanType === "investment" ? "scan-tab selected" : "scan-tab"} onClick={() => setScanType("investment")}><WalletCards size={16}/> Investment</button>
                </div>
                <form onSubmit={runScan}>
                  <label className="field-label" htmlFor="scan-content">{scanType === "link" ? "PASTE THE WEBSITE URL" : scanType === "investment" ? "PASTE THE INVESTMENT OFFER" : "PASTE THE MESSAGE OR CHAT"}</label>
                  <textarea id="scan-content" value={scanInput} onChange={(e) => setScanInput(e.target.value)} placeholder={scanType === "link" ? "https://example.com/claim-prize" : scanType === "investment" ? "Paste the investment offer, promised returns, payment details..." : "Paste the chat conversation here. Include the sender\u2019s messages and your replies so FraudGuard can assess the context..."} rows={8}/>
                  <div className="input-meta"><span>{scanInput.length} characters</span><span><LockKeyhole size={12}/> Raw chat text is not saved</span></div><p className="muted-copy" style={{margin:"0 0 13px"}}>Paste multiple messages in order. Remove passwords, OTPs, PINs, recovery codes and other private details first. Include timestamps or sender labels if useful.</p>
                  {error && <p className="form-error">{error}</p>}
                  <button className="primary-button scan-submit" type="submit" disabled={scanning}>{scanning ? <><span className="spinner"/> Checking signals...</> : <><Search size={17}/> Analyse content <ArrowUpRight size={16}/></>}</button>
                </form>
                <div className="privacy-note"><ShieldCheck size={16}/><span><b>Privacy first.</b> FraudGuard does not save raw scan text. If enabled, AI analysis sends the text to OpenAI and URL reputation checks send links to the configured providers.</span></div>
              </section>
              <aside className="surface-card scanner-aside">
                <div className="aside-icon"><Sparkles size={20}/></div><h3>What gets checked in your chat?</h3>
                <ul><li><Check size={15}/> Fake bank, support or friend identities</li><li><Check size={15}/> Requests for money, OTPs or passwords</li><li><Check size={15}/> Gift-card, crypto and advance-fee scams</li><li><Check size={15}/> Romance, job and investment manipulation</li><li><Check size={15}/> Urgency, secrecy and suspicious links</li></ul>
                <div className="disclaimer-box"><AlertTriangle size={16}/><p>This scanner identifies warning signs, not a person\u2019s identity. A low score does not prove the sender is safe.</p></div>
              </aside>
            </div>
            {result && <section className="surface-card result-card">
              <div className="result-head"><div><div className="eyebrow"><span/> SCAN COMPLETE</div><h2>Assessment results</h2></div><button className="secondary-button" onClick={copyResult}><Copy size={15}/>{copied ? "Copied" : "Copy report"}</button><button className="secondary-button" onClick={runAiAnalysis} disabled={aiBusy}><Sparkles size={15}/>{aiBusy ? "AI reviewing..." : "AI review"}</button></div>
              <div className="result-summary">
                <div className={"score-ring " + result.level}><strong>{result.score}</strong><small>/100</small></div>
                <div className="result-copy"><span className={"risk-pill " + result.level}>{result.level.toUpperCase()} RISK INDICATORS</span><h3>{result.verdict}</h3><p>{result.summary}</p></div>
              </div>
              <div className="result-columns"><div><h4>Signals detected</h4>{result.signals.length ? result.signals.map((signal, index) => <div className="signal-row" key={index}><span className={"signal-dot " + signal.severity}/><div><b>{signal.title}</b><p>{signal.detail}</p></div></div>) : <p className="muted-copy">No obvious indicators were found by these basic checks.</p>}</div><div><h4>Recommended next steps</h4>{result.recommendations.map((tip, index) => <div className="recommendation" key={index}><Check size={15}/><span>{tip}</span></div>)}</div></div>
              {aiResult && <div className="ai-review-panel"><div className="eyebrow"><span/> AI-ASSISTED REVIEW</div><h3>{aiResult.risk_level.toUpperCase()} RISK REVIEW</h3><p>{aiResult.summary}</p><div className="ai-review-list">{aiResult.signals.map((s: any, i: number) => <div key={i}><b>{s.title}</b><small>{s.detail}</small></div>)}</div><p className="result-footnote">{aiResult.disclaimer}</p></div>}
              <p className="result-footnote">Checked {new Date(result.checkedAt).toLocaleString()} · Automated screening can miss scams and produce false positives. Verify independently before sending money or sharing information.</p>
            </section>}
          </>}

          {active === "reports" && <>
            <div className="page-intro"><div className="eyebrow"><span/> COMMUNITY DEFENCE</div><h1>Threat intelligence.</h1><p>Document suspicious activity and learn the patterns criminals use. Reports shown here are sample content until secure submissions are connected.</p></div>
            <div className="content-grid reports-grid">
              <section className="surface-card"><div className="card-heading"><div><h3>Common fraud patterns</h3><p>Examples to help you recognise red flags</p></div><span className="demo-label">SAMPLE LIBRARY</span></div>
                {demoThreats.map((t, i) => <div className="intel-card" key={t.title}><div className="intel-top"><span className={"risk-pill " + t.color}>{t.level}</span><small>Pattern 0{i+1}</small></div><h4>{t.title}</h4><p>{["Promises of fixed, unusually high returns with pressure to recruit others.","Look-alike websites that imitate delivery firms and demand small release fees.","Messages claiming an account will be blocked unless a code is shared immediately."][i]}</p></div>)}
              </section>
              <section className="surface-card report-form-card"><div className="card-heading"><div><h3>Prepare a report</h3><p>Do not include passwords, PINs or OTPs</p></div></div><form onSubmit={submitReport}><label className="field-label" htmlFor="report-detail">WHAT HAPPENED?</label><textarea id="report-detail" rows={6} value={reportText} onChange={(e) => setReportText(e.target.value)} placeholder="Describe the suspicious message, account, website or offer..."/><button className="primary-button" type="submit"><Send size={16}/> Prepare report</button>{reportNotice && <p className="form-hint">{reportNotice}</p>}</form><div className="disclaimer-box"><Shield size={16}/><p>Reports will need moderation and evidence checks before they can appear publicly. Never publish private personal information.</p></div></section>
            </div>
          </>}

          {active === "connections" && <>
            <div className="page-intro"><div className="eyebrow"><span/> SOCIAL ACCOUNT PROTECTION</div><h1>Protect every profile.</h1><p>Connect your own social accounts using the platform's secure sign-in. FraudGuard never asks for your social media password.</p></div>
            <div className="social-connect-hero surface-card">
              <div className="social-connect-copy"><span className="secure-tag"><ShieldCheck size={14}/> PRIVATE BY DESIGN</span><h2>Your social accounts,<br/><span>under one security watch.</span></h2><p>Link eligible accounts to review available security signals, account identity and platform notifications from one place.</p><div className="social-benefits"><span><Check size={14}/> Revoke access anytime</span><span><Check size={14}/> Limited read-only permissions</span><span><Check size={14}/> No password collection</span></div></div>
              <div className="social-connect-art"><div className="social-orbit"><ShieldCheck size={58}/></div><span className="social-chip chip-a"><Globe2 size={14}/> Account checks</span><span className="social-chip chip-b"><Bell size={14}/> Threat alerts</span></div>
            </div>
            <div className="section-heading"><div><h3>Connected accounts</h3><p>Accounts authorized for this FraudGuard profile</p></div><span className="demo-label">{socialConnections.length} CONNECTED</span></div>
            {socialNotice && <p className="form-hint" role="status">{socialNotice}</p>}
            <div className="connected-social-list">{socialConnections.length ? socialConnections.map((connection) => <div className="connected-social-row" key={connection.id}><span className="integration-icon"><ShieldCheck size={19}/></span><div><b>{connection.account_name}</b><small>{String(connection.provider).toUpperCase()} · Connected {new Date(connection.connected_at).toLocaleDateString()} · {connection.scopes?.length || 0} permissions</small></div><button onClick={() => disconnectSocialAccount(connection.id)}>Disconnect</button></div>) : <div className="connection-empty">No social accounts connected yet. Choose a platform below to begin.</div>}</div>
            <div className="section-heading"><div><h3>Connect your platforms</h3><p>Choose a network to begin secure authorization</p></div><span className="demo-label">OFFICIAL AUTH ONLY</span></div>
            <div className="integration-grid social-grid">
              {[{name:"Facebook Pages",desc:"Connect Pages you manage. Review supported Page identity, publishing and security signals through Meta permissions.",icon:Users,provider:"meta",status:"Connect with Meta"},{name:"Instagram Professional",desc:"Connect eligible Creator or Business profiles linked to a Facebook Page. Personal-account access is limited by Instagram APIs.",icon:Smartphone,provider:"meta",status:"Connect with Meta"},{name:"YouTube",desc:"Connect your Google account to review your own channel identity and supported channel data with read-only access.",icon:Globe2,provider:"google",status:"Connect with Google"},{name:"TikTok",desc:"TikTok account connection requires an approved TikTok developer app and the relevant product permissions.",icon:PlayCircle,provider:"tiktok",status:"Provider setup required"},{name:"X",desc:"Connect an X account after an X developer app and OAuth permissions are configured.",icon:MessageCircle,provider:"x",status:"Provider setup required"},{name:"WhatsApp Business",desc:"Connect a business number through Meta's WhatsApp Business Platform. This does not read personal WhatsApp chats.",icon:MessageCircle,provider:"meta",status:"Business setup required"}].map((item) => {const Icon = item.icon;return <article className="surface-card integration-card social-card" key={item.name}><div className="integration-top"><span className="integration-icon"><Icon size={22}/></span><span className="setup-pill">{item.status}</span></div><h3>{item.name}</h3><p>{item.desc}</p><button className="secondary-button" onClick={async()=>{if(item.provider==="tiktok"||item.provider==="x"){window.alert(item.status+" — this provider is not enabled yet.");return;}try{const session=fraudGuardAuth?(await fraudGuardAuth.auth.getSession()).data.session:null;if(!session?.access_token){window.location.href="/auth";return;}const response=await fetch("/api/social/connect",{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+session.access_token},body:JSON.stringify({provider:item.provider})});const data=await response.json();if(!response.ok)throw new Error(data.error||"Connection could not start.");window.location.href=data.authorization_url;}catch(error){window.alert(error instanceof Error?error.message:"Connection could not start.");}}}>{item.provider==="meta"||item.provider==="google"?"Connect account":"Learn about setup"} <ArrowUpRight size={14}/></button></article>})}
            </div>
            <div className="integration-note"><LockKeyhole size={18}/><div><b>Connection is not the same as full protection.</b><p>Platforms limit what approved apps can see. FraudGuard can only inspect data each provider makes available and you explicitly authorize. It cannot silently read private DMs, detect every login, or guarantee prevention of account takeover. Live connections require provider app credentials and the database migration documented in the setup guide.</p></div></div>
          </>}

          {active === "business" && <>
            <div className="page-intro"><div className="eyebrow"><span/> ORGANISATION SECURITY</div><h1>Protect your business trust.</h1><p>Prepare a shared security workspace for staff, customer-facing channels and suspicious payment requests.</p></div>
            <div className="business-hero surface-card"><div><span className="demo-label">BUSINESS WORKSPACE PREVIEW</span><h2>Reduce fraud exposure<br/>across your team.</h2><p>Business features will include team roles, approved reporting workflows, brand impersonation monitoring and incident records.</p><button className="primary-button" onClick={() => setBusinessMode(!businessMode)}>{businessMode ? "Hide setup checklist" : "View setup checklist"} <ArrowUpRight size={15}/></button></div><div className="business-graphic"><Building2 size={76}/><span><ShieldCheck size={22}/> TEAM PROTECTION</span></div></div>
            {businessMode && <div className="surface-card checklist"><h3>Business launch checklist</h3>{["Create an organisation profile and verify its domain","Invite staff with role-based permissions","Configure approved Meta business integrations","Set up incident escalation contacts","Enable audit logs and retention policies"].map((item, i) => <div key={item} className="check-row"><span>{i+1}</span>{item}<small>Pending</small></div>)}</div>}
            <div className="stats-grid business-stats"><article className="stat-card"><div className="stat-top"><span>TEAM MEMBERS</span><Users size={17}/></div><strong>—</strong><small>Organisation setup pending</small></article><article className="stat-card"><div className="stat-top"><span>PROTECTED CHANNELS</span><Link2 size={17}/></div><strong>0</strong><small>No channels connected</small></article><article className="stat-card"><div className="stat-top"><span>OPEN INCIDENTS</span><AlertTriangle size={17}/></div><strong>0</strong><small>No incident data yet</small></article></div>
          </>}

          {active === "activity" && <>
            <div className="page-intro"><div className="eyebrow"><span/> AUDIT & MONITORING</div><h1>Security activity.</h1><p>Review scans and account events as they become available.</p></div>
            <section className="surface-card empty-state"><div className="empty-icon"><Clock3 size={28}/></div><h3>No activity recorded</h3><p>Your scan history will appear here after account sign-in and secure history storage are implemented. This preview does not retain scan content.</p><button className="primary-button" onClick={() => navigate("scanner")}><Search size={16}/> Run a scan</button></section>
          </>}
          <footer className="footer"><span>© 2026 FraudGuard Security</span><span><ShieldCheck size={13}/> Built for safer digital decisions</span><a href="https://developers.facebook.com/docs/graph-api/webhooks/getting-started/" target="_blank" rel="noreferrer">Integration documentation <ExternalLink size={12}/></a></footer>
        </div>
      </section>
    </main>
  );
}
