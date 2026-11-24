"use client";
import { useEffect, useState } from "react";
import { ShieldCheck, AlertTriangle, ArrowLeft, RefreshCw } from "lucide-react";
import Link from "next/link";
export default function CommunityPage(){
 const [patterns,setPatterns]=useState<any[]>([]);
 const [message,setMessage]=useState("Loading verified community patterns...");
 async function load(){try{const r=await fetch("/api/intelligence",{cache:"no-store"});const d=await r.json();setPatterns(d.patterns||[]);setMessage(d.message||"Only moderator-approved patterns are shown here.");}catch{setMessage("Could not load community intelligence.");}}
 useEffect(()=>{load();},[]);
 return <main className="portal-shell"><header className="portal-header"><Link href="/" className="portal-logo"><ShieldCheck/> FraudGuard</Link><Link className="auth-nav-link" href="/portal">My workspace</Link></header><div className="portal-content"><Link href="/" className="auth-back"><ArrowLeft size={14}/> Dashboard</Link><div className="page-intro" style={{marginTop:22}}><div className="eyebrow"><span/> COMMUNITY DEFENCE</div><h1>Verified scam patterns.</h1><p>Only reports reviewed and approved by FraudGuard moderators can appear here. Personal details are not displayed.</p></div><div className="surface-card"><div className="card-heading"><div><h3>Community threat intelligence</h3><p>Moderated patterns, not public accusations.</p></div><button className="secondary-button" onClick={load}><RefreshCw size={14}/> Refresh</button></div>{patterns.length?patterns.map((p,i)=><article className="intel-card" key={i}><div className="intel-top"><span className="risk-pill amber">{p.category}</span><small>{p.channel}</small></div><p>{p.description}</p><small>{new Date(p.created_at).toLocaleDateString()}</small></article>):<div className="portal-empty"><AlertTriangle size={20}/><p>{message}</p></div>}</div><p className="portal-footnote">A verified pattern means the report passed internal moderation; it is not a legal finding about any named person or organisation.</p></div></main>;
}
