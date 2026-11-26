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
  { label: "YOUR PROTECTION", items: [
    { id: "connections", label: "Connect social accounts", icon: Link2, tag: "START" },
    { id: "scanner", label: "Private AI chat", icon: MessageCircle, tag: "AI" },
    { id: "overview", label: "Overview", icon: LayoutDashboard },
  ]},
  { label: "WORKSPACE", items: [
    { id: "reports", label: "Threat reports", icon: ShieldAlert },
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
  const [active, setActive] = useState("connections");
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
  const [connectingProvider, setConnectingProvider] = useState("");
  const [platformFilter, setPlatformFilter] = useState("all");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const connected = params.get("social_connected");
    const error = params.get("social_error");
    if (connected || error) {
      setActive("connections");
      setSocialNotice(error ? "Connection not completed: " + error : "Account authorization returned successfully. Refreshing your connected accounts.");
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

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

  async function startSocialConnect(provider: "meta" | "google") {
    setConnectingProvider(provider);
    setSocialNotice("");
    try {
      const session = fraudGuardAuth ? (await fraudGuardAuth.auth.getSession()).data.session : null;
      if (!session?.access_token) { window.location.href = "/auth"; return; }
      const response = await fetch("/api/social/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + session.access_token },
        body: JSON.stringify({ provider })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Connection could not start.");
      window.location.href = data.authorization_url;
    } catch (error) {
      setSocialNotice(error instanceof Error ? error.message : "Connection could not start.");
    } finally {
      setConnectingProvider("");
    }
  }

  const pageTitle = useMemo(() => {
    const titles: Record<string, string> = {
      overview: "Security overview", scanner: "FraudSafe chat assistant", reports: "Threat intelligence",
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
            <a className="auth-nav-link community-link" href="/community">Community</a><a className="auth-nav-link workspace-link" href="/portal">My workspace</a><a className="auth-nav-link auth-signin" href="/auth">Sign in</a><a className="auth-nav-link auth-create" href="/auth?mode=signup">Create account <ArrowUpRight size={13}/></a><div className="top-avatar">FG</div>
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
            <div className="page-intro"><div className="eyebrow"><span/> YOUR AI PROTECTION COMPANION</div><h1>Talk to FraudSafe.</h1><p>Everyday scam checks belong in your private FraudSafe chat. Send a message, link or suspicious offer and ask follow-up questions naturally.</p></div>
            <div className="chat-launch-grid">
              <article className="chat-launch-card telegram-chat"><div className="chat-launch-top"><span className="chat-app-icon"><Send size={23}/></span><span className="platform-ready">Private bot chat</span></div><h2>FraudSafe on Telegram</h2><p>Open a dedicated bot conversation to scan suspicious messages, inspect links, ask questions and get account-safety guidance.</p>{process.env.NEXT_PUBLIC_FRAUDSAFE_TELEGRAM_URL ? <a className="primary-button" href={process.env.NEXT_PUBLIC_FRAUDSAFE_TELEGRAM_URL} target="_blank" rel="noreferrer">Open Telegram chat <ArrowUpRight size={15}/></a> : <span className="chat-not-configured"><Clock3 size={14}/> Bot link not configured yet</span>}</article>
              <article className="chat-launch-card whatsapp-chat"><div className="chat-launch-top"><span className="chat-app-icon"><MessageCircle size={23}/></span><span className="platform-ready">Business chat</span></div><h2>FraudSafe on WhatsApp</h2><p>Chat with the official FraudSafe business number. Ask for scam checks and receive private replies in that same conversation.</p>{process.env.NEXT_PUBLIC_FRAUDSAFE_WHATSAPP_URL ? <a className="primary-button" href={process.env.NEXT_PUBLIC_FRAUDSAFE_WHATSAPP_URL} target="_blank" rel="noreferrer">Open WhatsApp chat <ArrowUpRight size={15}/></a> : <span className="chat-not-configured"><Clock3 size={14}/> Business chat link not configured yet</span>}</article>
            </div>
            <div className="chat-command-panel surface-card"><div className="card-heading"><div><h3>What you can ask in the chat</h3><p>No need to memorise commands — ordinary questions work too.</p></div><span className="demo-label">CHAT FEATURES</span></div><div className="chat-command-grid">
              {[{cmd:"/scan",title:"Scan a message",desc:"Check a suspicious DM, SMS or conversation excerpt."},{cmd:"/link",title:"Check a link",desc:"Look for phishing signals and suspicious destinations."},{cmd:"/explain",title:"Explain a warning",desc:"Understand why a message or offer looks risky."},{cmd:"/protect",title:"Account safety help",desc:"Get steps to secure a compromised or targeted account."},{cmd:"/report",title:"Report a suspicious incident",desc:"Get directed to the private reporting workflow."},{cmd:"/history",title:"View scan history",desc:"Open your signed-in dashboard to review saved scan summaries."},{cmd:"/settings",title:"Protection settings",desc:"Manage account connections and security preferences."},{cmd:"/help",title:"Show chat help",desc:"See available commands and privacy information."}].map(item=><div className="chat-command-row" key={item.cmd}><code>{item.cmd}</code><div><b>{item.title}</b><small>{item.desc}</small></div></div>)}
            </div></div>
            <div className="chat-privacy-panel"><ShieldCheck size={19}/><div><b>Private by design</b><p>FraudSafe only analyses content users deliberately send to its dedicated chat. It does not silently read unrelated DMs, message contacts, impersonate users or take actions on their accounts. Never send OTPs, PINs, passwords or recovery phrases.</p></div></div>
            <div className="chat-dashboard-link"><div><b>Manage your connected accounts on the website</b><p>Connect eligible social profiles, review permissions, disconnect services and manage account security.</p></div><button className="secondary-button" onClick={()=>navigate("connections")}>Open account centre <ArrowUpRight size={14}/></button></div>
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
            <div className="page-intro"><div className="eyebrow"><span/> START HERE · CONNECT YOUR SOCIALS</div><h1>Protect every social account.</h1><p>Connect your eligible profiles first. Then use your private FraudSafe AI chat for suspicious messages, links and account-safety questions.</p></div>
            <div className="social-connect-hero surface-card">
              <div className="social-connect-copy"><span className="secure-tag"><ShieldCheck size={14}/> PRIVATE BY DESIGN</span><h2>One place to manage<br/><span>your digital identity.</span></h2><p>Authorize each platform securely. FraudSafe never asks for your social-media password and never sends messages to your contacts.</p><div className="social-benefits"><span><Check size={14}/> Official sign-in only</span><span><Check size={14}/> Read-only where available</span><span><Check size={14}/> Revoke access anytime</span></div></div>
              <div className="social-connect-art"><div className="social-orbit"><ShieldCheck size={58}/></div><span className="social-chip chip-a"><Activity size={14}/> Account signals</span><span className="social-chip chip-b"><Bell size={14}/> Private alerts</span></div>
            </div>
            <div className="social-metrics-grid">
              <article className="social-metric"><span className="metric-icon"><Link2 size={17}/></span><div><small>CONNECTED ACCOUNTS</small><b>{socialConnections.length}</b><em>Authorized by you</em></div></article>
              <article className="social-metric"><span className="metric-icon"><ShieldCheck size={17}/></span><div><small>PROTECTION MODE</small><b>Read-only</b><em>No actions on your behalf</em></div></article>
              <article className="social-metric"><span className="metric-icon"><LockKeyhole size={17}/></span><div><small>ACCESS CONTROL</small><b>Revocable</b><em>Disconnect whenever you choose</em></div></article>
              <article className="social-metric"><span className="metric-icon"><Zap size={17}/></span><div><small>LIVE MONITORING</small><b>Setup pending</b><em>Depends on platform approvals</em></div></article>
            </div>
            <div className="section-heading"><div><h3>Connected identities</h3><p>Accounts currently authorized for this FraudSafe profile</p></div><span className="demo-label">{socialConnections.length} CONNECTED</span></div>
            {socialNotice && <p className="social-status-message" role="status"><Shield size={15}/>{socialNotice}</p>}
            <div className="connected-social-list">{socialConnections.length ? socialConnections.map((connection) => <div className="connected-social-row" key={connection.id}><span className="integration-icon"><ShieldCheck size={19}/></span><div><b>{connection.account_name}</b><small>{String(connection.provider).toUpperCase()} · Connected {new Date(connection.connected_at).toLocaleDateString()} · {connection.scopes?.length || 0} permissions</small></div><span className="connected-state"><i/> Authorized</span><button onClick={() => disconnectSocialAccount(connection.id)}>Disconnect</button></div>) : <div className="connection-empty"><Link2 size={20}/><b>No accounts connected yet</b><span>Connect your first eligible account below. You will be redirected to the platform to approve access.</span></div>}</div>
            <div className="section-heading platform-heading"><div><h3>Platform integrations</h3><p>Choose a network and review its connection requirements</p></div><span className="demo-label">8 PLATFORMS</span></div>
            <div className="platform-toolbar"><div className="platform-filter-label"><Search size={15}/> Filter platforms</div><div className="platform-filter">{[{id:"all",label:"All platforms"},{id:"available",label:"Connect now"},{id:"setup",label:"Setup required"}].map(f=><button key={f.id} className={platformFilter===f.id?"selected":""} onClick={()=>setPlatformFilter(f.id)}>{f.label}</button>)}</div></div>
            <div className="integration-grid social-grid">
              {[
                {name:"Facebook Pages",desc:"Authorize Pages you manage. Available signals depend on approved Page permissions and the assets you select.",icon:Users,provider:"meta",mode:"available",label:"Meta authorization",capability:"Page identity · Page insights",tone:"blue"},
                {name:"Instagram Professional",desc:"For eligible Creator and Business profiles. Personal Instagram accounts are not supported by this API flow.",icon:Smartphone,provider:"meta",mode:"available",label:"Meta authorization",capability:"Professional profile · Supported media",tone:"pink"},
                {name:"YouTube",desc:"Connect your Google account to identify your channel and access supported channel data with read-only scope.",icon:PlayCircle,provider:"google",mode:"available",label:"Google authorization",capability:"Channel identity · Channel data",tone:"red"},
                {name:"WhatsApp Business",desc:"Requires a WhatsApp Business Platform number, Meta business setup, webhook subscription and messaging permissions.",icon:MessageCircle,provider:"none",mode:"setup",label:"Business onboarding",capability:"Dedicated FraudSafe chat · Webhook alerts",tone:"green"},
                {name:"Telegram",desc:"FraudSafe works as a dedicated bot chat. Users message the bot directly to scan content and receive private advice.",icon:Send,provider:"none",mode:"setup",label:"Bot setup",capability:"Private AI assistant chat",tone:"cyan"},
                {name:"TikTok",desc:"Requires a TikTok developer app, approved Login Kit and authorized scopes before account connection can be enabled.",icon:PlayCircle,provider:"none",mode:"setup",label:"Developer approval",capability:"Approved profile signals only",tone:"pink"},
                {name:"X",desc:"Requires an X developer project, OAuth configuration and access to the relevant API tier and scopes.",icon:MessageCircle,provider:"none",mode:"setup",label:"Developer approval",capability:"Approved account signals only",tone:"light"},
                {name:"Threads",desc:"Requires a Meta developer app configured for Threads API and the specific account permissions it supports.",icon:Globe2,provider:"none",mode:"setup",label:"Threads API setup",capability:"Supported profile and content signals",tone:"light"}
              ].filter(item=>platformFilter==="all"||(platformFilter==="available"?item.mode==="available":item.mode==="setup")).map((item) => {const Icon=item.icon;return <article className="surface-card integration-card social-card platform-card" key={item.name}><div className="integration-top"><span className={"platform-logo "+item.tone}><Icon size={21}/></span><span className={item.mode==="available"?"platform-ready":"platform-pending"}>{item.mode==="available"?"OAuth available":"Setup required"}</span></div><h3>{item.name}</h3><p>{item.desc}</p><div className="platform-capability"><ShieldCheck size={13}/><span>{item.capability}</span></div>{item.mode==="available"?<button className="secondary-button" disabled={!!connectingProvider} onClick={()=>startSocialConnect(item.provider as "meta"|"google")}>{connectingProvider===item.provider?"Opening secure sign-in…":"Connect "+item.name}<ArrowUpRight size={14}/></button>:<button className="secondary-button setup-button" disabled><LockKeyhole size={13}/> {item.label}</button>}</article>})}
            </div>
            <div className="coverage-panel surface-card"><div className="coverage-heading"><div><h3>What FraudSafe can actually protect</h3><p>Coverage depends on each platform's official API and permissions.</p></div><span className="demo-label">TRANSPARENT ACCESS</span></div><div className="coverage-grid"><div><span className="coverage-icon"><MessageCircle size={17}/></span><b>Messages you send to FraudSafe</b><p>Can be scanned and discussed inside the dedicated bot chat.</p><em className="coverage-on">Available when bot is configured</em></div><div><span className="coverage-icon"><Globe2 size={17}/></span><b>Connected account data</b><p>Only the profile, content or business signals the platform approves.</p><em className="coverage-limited">Permission dependent</em></div><div><span className="coverage-icon"><Fingerprint size={17}/></span><b>Private DMs in other chats</b><p>Not automatically readable through social OAuth. Android notification previews are a separate opt-in feature.</p><em className="coverage-off">Not available by default</em></div></div></div>
            <div className="integration-note"><LockKeyhole size={18}/><div><b>Your account stays in control.</b><p>FraudSafe is designed to warn and advise, not impersonate you. It will not message your friends, reply to other conversations, change account settings or block people. You approve each connection and can revoke it at any time.</p></div></div>
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
