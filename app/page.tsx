"use client";

import { useMemo, useState } from "react";
import {
  Activity, AlertTriangle, ArrowDownRight, ArrowUpRight, BadgeCheck, Bell,
  Building2, Check, ChevronDown, ChevronRight, CircleHelp, Clock3, Copy,
  ExternalLink, Eye, FileSearch, Fingerprint, Globe2, LayoutDashboard, Link2,
  LockKeyhole, Menu, MessageCircle, Plus, Search, Send, Settings, Shield,
  ShieldAlert, ShieldCheck, Smartphone, Sparkles, Target, Users, WalletCards,
  X, Zap
} from "lucide-react";

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
    { id: "scanner", label: "Scam scanner", icon: FileSearch, tag: "AI" },
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
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [reportText, setReportText] = useState("");
  const [reportNotice, setReportNotice] = useState("");
  const [businessMode, setBusinessMode] = useState(false);

  const pageTitle = useMemo(() => {
    const titles: Record<string, string> = {
      overview: "Security overview", scanner: "Scam scanner", reports: "Threat intelligence",
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
      const response = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
            <a className="auth-nav-link" href="/auth">Sign in</a><div className="top-avatar">FG</div>
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
                <div className="hero-footnote"><LockKeyhole size={13}/> Your scan text is processed for this check and is not saved by this demo.</div>
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
            <div className="page-intro"><div className="eyebrow"><span/> MANUAL THREAT ANALYSIS</div><h1>Check before you trust.</h1><p>Paste a suspicious message, website link or investment pitch. FraudGuard will explain the warning signs it can detect.</p></div>
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
                  <textarea id="scan-content" value={scanInput} onChange={(e) => setScanInput(e.target.value)} placeholder={scanType === "link" ? "https://example.com/claim-prize" : scanType === "investment" ? "Paste the investment offer, promised returns, payment details..." : "Paste the suspicious WhatsApp message, SMS or social media DM here..."} rows={8}/>
                  <div className="input-meta"><span>{scanInput.length} characters</span><span><LockKeyhole size={12}/> Not stored in this preview</span></div>
                  {error && <p className="form-error">{error}</p>}
                  <button className="primary-button scan-submit" type="submit" disabled={scanning}>{scanning ? <><span className="spinner"/> Checking signals...</> : <><Search size={17}/> Analyse content <ArrowUpRight size={16}/></>}</button>
                </form>
                <div className="privacy-note"><ShieldCheck size={16}/><span><b>Privacy first.</b> This preview processes the text you submit and does not save it to a user account.</span></div>
              </section>
              <aside className="surface-card scanner-aside">
                <div className="aside-icon"><Sparkles size={20}/></div><h3>What gets checked?</h3>
                <ul><li><Check size={15}/> Pressure, urgency and threats</li><li><Check size={15}/> Requests for OTPs or secret codes</li><li><Check size={15}/> Guaranteed or unrealistic returns</li><li><Check size={15}/> Suspicious URL structure</li><li><Check size={15}/> Upfront fees and impersonation clues</li></ul>
                <div className="disclaimer-box"><AlertTriangle size={16}/><p>This is an early rule-based scanner, not a guarantee. A low score does not prove something is safe.</p></div>
              </aside>
            </div>
            {result && <section className="surface-card result-card">
              <div className="result-head"><div><div className="eyebrow"><span/> SCAN COMPLETE</div><h2>Assessment results</h2></div><button className="secondary-button" onClick={copyResult}><Copy size={15}/>{copied ? "Copied" : "Copy report"}</button></div>
              <div className="result-summary">
                <div className={"score-ring " + result.level}><strong>{result.score}</strong><small>/100</small></div>
                <div className="result-copy"><span className={"risk-pill " + result.level}>{result.level.toUpperCase()} RISK INDICATORS</span><h3>{result.verdict}</h3><p>{result.summary}</p></div>
              </div>
              <div className="result-columns"><div><h4>Signals detected</h4>{result.signals.length ? result.signals.map((signal, index) => <div className="signal-row" key={index}><span className={"signal-dot " + signal.severity}/><div><b>{signal.title}</b><p>{signal.detail}</p></div></div>) : <p className="muted-copy">No obvious indicators were found by these basic checks.</p>}</div><div><h4>Recommended next steps</h4>{result.recommendations.map((tip, index) => <div className="recommendation" key={index}><Check size={15}/><span>{tip}</span></div>)}</div></div>
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
            <div className="page-intro"><div className="eyebrow"><span/> ACCOUNT INTEGRATIONS</div><h1>Your apps. Your permission.</h1><p>Connect supported business services through official authorization. Personal message access is not silently enabled.</p></div>
            <div className="integration-grid">
              {[{name:"WhatsApp Business",desc:"Receive business messages through the official WhatsApp Business Platform webhook.",icon:MessageCircle,kind:"WhatsApp",status:"Setup required"},{name:"Facebook Pages",desc:"Review supported Page events using Meta permissions and app review.",icon:Users,kind:"Meta",status:"Setup required"},{name:"Instagram Professional",desc:"Connect eligible professional accounts through Meta's approved APIs.",icon:Smartphone,kind:"Meta",status:"Setup required"},{name:"Telegram",desc:"Add a FraudGuard bot to chats where users choose to send suspicious content.",icon:Send,kind:"Telegram",status:"Planned"}].map((item) => {const Icon = item.icon;return <article className="surface-card integration-card" key={item.name}><div className="integration-top"><span className="integration-icon"><Icon size={22}/></span><span className="setup-pill">{item.status}</span></div><h3>{item.name}</h3><p>{item.desc}</p><button className="secondary-button" disabled>{item.status === "Planned" ? "Coming later" : "Configure integration"} <LockKeyhole size={14}/></button></article>})}
            </div>
            <div className="integration-note"><LockKeyhole size={18}/><div><b>No password collection. No hidden access.</b><p>FraudGuard will use official OAuth, approved API scopes and revocable permissions. Integration buttons remain disabled until provider credentials, callback URLs and compliance reviews are configured.</p></div></div>
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
