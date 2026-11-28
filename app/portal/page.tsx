"use client";
import { FormEvent, useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { ShieldCheck, FileText, Building2, Bell, History, Upload, LogOut, RefreshCw, AlertTriangle } from "lucide-react";
import Link from "next/link";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const auth = supabaseUrl && supabaseKey ? createClient(supabaseUrl,supabaseKey) : null;

export default function PortalPage() {
  const [token,setToken] = useState("");
  const [email,setEmail] = useState("");
  const [reports,setReports] = useState<any[]>([]);
  const [scans,setScans] = useState<any[]>([]);
  const [orgs,setOrgs] = useState<any[]>([]);
  const [reportId,setReportId] = useState("");
  const [orgName,setOrgName] = useState("");
  const [reportText,setReportText] = useState("");
  const [category,setCategory] = useState("other");
  const [file,setFile] = useState<File|null>(null);
  const [digest,setDigest] = useState("instant");
  const [notice,setNotice] = useState("");
  const [busy,setBusy] = useState(false);

  async function load(accessToken:string) {
    const headers={Authorization:"Bearer "+accessToken};
    const [r,s,o,a]=await Promise.all([
      fetch("/api/reports",{headers}),fetch("/api/history",{headers}),fetch("/api/organizations",{headers}),fetch("/api/alerts",{headers})
    ]);
    const [rd,sd,od,ad]=await Promise.all([r.json(),s.json(),o.json(),a.json()]);
    if(r.ok)setReports(rd.reports||[]);
    if(s.ok)setScans(sd.scans||[]);
    if(o.ok)setOrgs(od.organizations||[]);
    if(a.ok)setDigest(ad.preferences?.digest||"instant");
  }
  useEffect(()=>{let active=true; if(auth){auth.auth.getSession().then(async ({data})=>{if(active&&data.session){setToken(data.session.access_token);setEmail(data.session.user.email||"");await load(data.session.access_token);}});} return ()=>{active=false;};},[]);

  async function request(path:string,method:string,body?:any) {
    const response=await fetch(path,{method,headers:{"Content-Type":"application/json",Authorization:"Bearer "+token},body:body===undefined?undefined:JSON.stringify(body)});
    const data=await response.json();
    if(!response.ok)throw new Error(data.error||"Request failed");
    return data;
  }
  async function submitReport(e:FormEvent) {
    e.preventDefault();setBusy(true);setNotice("");
    try{await request("/api/reports","POST",{category,channel:"other",description:reportText});setReportText("");await load(token);setNotice("Private report submitted for review.");}
    catch(err){setNotice(err instanceof Error?err.message:"Report failed.");}finally{setBusy(false);}
  }
  async function createOrg(e:FormEvent) {
    e.preventDefault();setBusy(true);setNotice("");
    try{await request("/api/organizations","POST",{name:orgName});setOrgName("");await load(token);setNotice("Business workspace created.");}
    catch(err){setNotice(err instanceof Error?err.message:"Workspace creation failed.");}finally{setBusy(false);}
  }
  async function uploadEvidence(e:FormEvent) {
    e.preventDefault();if(!file||!reportId)return;setBusy(true);setNotice("");
    try{const form=new FormData();form.append("file",file);form.append("report_id",reportId);const response=await fetch("/api/evidence",{method:"POST",headers:{Authorization:"Bearer "+token},body:form});const data=await response.json();if(!response.ok)throw new Error(data.error||"Upload failed.");setFile(null);setNotice(data.message);}
    catch(err){setNotice(err instanceof Error?err.message:"Evidence upload failed.");}finally{setBusy(false);}
  }
  async function saveAlerts(e:FormEvent) {
    e.preventDefault();setBusy(true);
    try{await request("/api/alerts","PUT",{email_alerts:true,high_risk_only:true,digest});setNotice("Alert preferences saved. Delivery still requires an email notification provider.");}
    catch(err){setNotice(err instanceof Error?err.message:"Could not save alerts.");}finally{setBusy(false);}
  }
  async function signOut(){if(auth)await auth.auth.signOut();setToken("");setEmail("");setReports([]);setScans([]);setOrgs([]);}
  if(!token)return <main className="portal-shell"><section className="portal-login"><div className="auth-brand"><span><ShieldCheck size={25}/></span><b>Fraud<span>Guard</span></b></div><h1>Your security workspace</h1><p>Sign in to manage private reports, evidence, scan history, alerts and business workspaces.</p><Link className="primary-button" href="/auth">Sign in or create account</Link><Link className="portal-back" href="/">Back to dashboard</Link></section></main>;
  return <main className="portal-shell"><header className="portal-header"><Link href="/" className="portal-logo"><ShieldCheck/> FraudGuard</Link><span>{email}</span><button className="secondary-button" onClick={signOut}><LogOut size={15}/> Sign out</button></header><div className="portal-content"><div className="page-intro"><div className="eyebrow"><span/> PRIVATE ACCOUNT CENTRE</div><h1>Your protection workspace.</h1><p>Manage your reports and security activity. Private by default.</p></div>{notice&&<div className="portal-notice" role="status">{notice}</div>}
  <div className="portal-grid"><section className="surface-card"><div className="card-heading"><div><h3><FileText size={16}/> Submit a private report</h3><p>Send suspicious activity for moderation.</p></div></div><form onSubmit={submitReport} className="portal-form"><label>Category</label><select value={category} onChange={e=>setCategory(e.target.value)}><option value="other">Other</option><option value="phishing">Phishing</option><option value="impersonation">Impersonation</option><option value="investment">Investment scam</option><option value="payment">Payment / fake transfer</option><option value="romance">Romance scam</option><option value="job">Job scam</option></select><label>What happened?</label><textarea required minLength={12} maxLength={8000} rows={5} value={reportText} onChange={e=>setReportText(e.target.value)} placeholder="Describe the suspicious activity. Do not include passwords, PINs or OTPs."/><button className="primary-button" disabled={busy}>Submit report</button></form></section>
  <section className="surface-card"><div className="card-heading"><div><h3><Building2 size={16}/> Business workspace</h3><p>Create a shared organisation space.</p></div></div><form onSubmit={createOrg} className="portal-form"><label>Business or organisation name</label><input required minLength={2} maxLength={120} value={orgName} onChange={e=>setOrgName(e.target.value)} placeholder="Your company name"/><button className="primary-button" disabled={busy}>Create workspace</button></form><div className="portal-list">{orgs.map(o=><div key={o.id}><b>{o.name}</b><span>{o.role}</span></div>)}{!orgs.length&&<small>No business workspaces yet.</small>}</div></section>
  <section className="surface-card"><div className="card-heading"><div><h3><Upload size={16}/> Attach evidence</h3><p>Files are private and quarantined after upload.</p></div></div><form onSubmit={uploadEvidence} className="portal-form"><label>Choose your report</label><select value={reportId} onChange={e=>setReportId(e.target.value)}><option value="">Select a report</option>{reports.map(r=><option value={r.id} key={r.id}>{r.category} · {r.id.slice(0,8)}</option>)}</select><label>Evidence file (10 MB max)</label><input type="file" accept="image/jpeg,image/png,image/webp,application/pdf,text/plain" onChange={e=>setFile(e.target.files?.[0]||null)}/><button className="primary-button" disabled={busy||!file||!reportId}>Upload to private quarantine</button></form><p className="portal-caution"><AlertTriangle size={14}/> Evidence is not malware-scanned yet. Do not upload sensitive credentials.</p></section>
  <section className="surface-card"><div className="card-heading"><div><h3><Bell size={16}/> Alert preferences</h3><p>Choose your preferred alert frequency.</p></div></div><form onSubmit={saveAlerts} className="portal-form"><label>Digest frequency</label><select value={digest} onChange={e=>setDigest(e.target.value)}><option value="instant">Instant</option><option value="daily">Daily summary</option><option value="weekly">Weekly summary</option><option value="off">Off</option></select><button className="primary-button" disabled={busy}>Save preferences</button></form><p className="portal-caution">Preferences are saved. Email and push delivery require a notification provider and are not active yet.</p></section>
  <section className="surface-card portal-wide"><div className="card-heading"><div><h3><History size={16}/> Scan history</h3><p>Recent scan summaries. Raw pasted content is not stored.</p></div><button className="secondary-button" onClick={()=>load(token)}><RefreshCw size={14}/> Refresh</button></div>{scans.length?scans.map(s=><div className="portal-history" key={s.id}><span className={"risk-pill "+s.risk_level}>{s.risk_level} risk</span><b>{s.scan_type} scan · {s.score}/100</b><small>{new Date(s.created_at).toLocaleString()}</small></div>):<p className="portal-empty">No saved scans yet. Sign-in scan results will appear here.</p>}</section>
  <section className="surface-card portal-wide"><div className="card-heading"><div><h3><FileText size={16}/> Your incident reports</h3><p>Reports are private until reviewed and approved.</p></div><button className="secondary-button" onClick={()=>load(token)}><RefreshCw size={14}/> Refresh</button></div>{reports.length?reports.map(r=><div className="portal-history" key={r.id}><span className="setup-pill">{r.status.replaceAll("_"," ")}</span><b>{r.category}</b><small>{new Date(r.created_at).toLocaleString()}</small><p>{r.description}</p></div>):<p className="portal-empty">No reports submitted yet.</p>}</section>
  </div><p className="portal-footnote">Integrations are not secretly connected. Configure WhatsApp Business, Meta and Telegram only through their official developer consoles and explicit account consent.</p></div></main>;
}
