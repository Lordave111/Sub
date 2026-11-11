"use client";
import "./subscriptions.css";
import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { ArrowLeft, CalendarClock, CheckCircle2, CircleAlert, RefreshCw, ShieldCheck, Tv, Music2, Clapperboard } from "lucide-react";

type CatalogItem = { id:string; provider:string; category:string; description:string; plans:any[]; enabled:boolean };
type UserSubscription = { id:string; catalog_id:string; provider:string; plan_name:string; account_identifier:string; status:string; auto_renew:boolean; started_at:string|null; expires_at:string|null; created_at:string };
type Order = { reference:string; provider:string; plan_name:string; amount:number; status:string; created_at:string };
const money = (n:number) => "₦" + Number(n || 0).toLocaleString("en-NG");
const date = (value:string|null) => value ? new Date(value).toLocaleDateString("en-NG",{day:"numeric",month:"short",year:"numeric"}) : "Not set";
const iconFor = (category:string) => category.toLowerCase().includes("music") ? Music2 : category.toLowerCase().includes("tv") ? Tv : Clapperboard;

export default function SubscriptionsPage() {
  const [client] = useState(() => {
    const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    return url && key ? createClient(url,key) : null;
  });
  const [session,setSession]=useState<any>(null);
  const [catalog,setCatalog]=useState<CatalogItem[]>([]);
  const [subscriptions,setSubscriptions]=useState<UserSubscription[]>([]);
  const [orders,setOrders]=useState<Order[]>([]);
  const [busy,setBusy]=useState(false);
  const [saving,setSaving]=useState("");
  const [notice,setNotice]=useState("");
  useEffect(()=>{ if(!client)return; client.auth.getSession().then(({data})=>setSession(data.session)); const {data:{subscription}}=client.auth.onAuthStateChange((_e,s)=>setSession(s)); return ()=>subscription.unsubscribe(); },[client]);
  async function load() {
    if(!session?.access_token)return;
    setBusy(true);setNotice("");
    try {
      const r=await fetch("/api/subscriptions",{headers:{Authorization:"Bearer "+session.access_token}});
      const d=await r.json();if(!r.ok)throw new Error(d.error||"Could not load subscriptions.");
      setCatalog(d.catalog||[]);setSubscriptions(d.subscriptions||[]);setOrders(d.orders||[]);
    } catch(e){setNotice(e instanceof Error?e.message:"Could not load subscriptions.");}
    finally{setBusy(false);}
  }
  useEffect(()=>{load();},[session]);
  async function toggleRenewal(item:UserSubscription) {
    if(!session?.access_token)return;
    setSaving(item.id);setNotice("");
    try {
      const r=await fetch("/api/subscriptions",{method:"PATCH",headers:{"Content-Type":"application/json",Authorization:"Bearer "+session.access_token},body:JSON.stringify({id:item.id,autoRenew:!item.auto_renew})});
      const d=await r.json();if(!r.ok)throw new Error(d.error||"Could not update renewal.");
      setSubscriptions(rows=>rows.map(row=>row.id===item.id?{...row,auto_renew:!row.auto_renew}:row));
    }catch(e){setNotice(e instanceof Error?e.message:"Could not update renewal.");}
    finally{setSaving("");}
  }
  const active=subscriptions.filter(s=>s.status==="active").length;
  return <main className="subs-page">
    <header className="subs-top"><a className="subs-brand" href="/"><span className="subs-mark">S</span> sub<span>.</span></a><a href="/" className="subs-back"><ArrowLeft size={16}/> Back to marketplace</a></header>
    <section className="subs-hero"><div className="subs-eyebrow"><span/> YOUR DIGITAL LIFE, ONE PLACE</div><h1>Subscriptions,<br/><em>made simple.</em></h1><p>Keep track of your streaming, music and TV services. See what is active, check expiry dates and manage renewal preferences.</p><div className="subs-stats"><article><small>ACTIVE SERVICES</small><strong>{active}</strong></article><article><small>ALL SUBSCRIPTIONS</small><strong>{subscriptions.length}</strong></article><article><small>PAYMENT RECORDS</small><strong>{orders.length}</strong></article></div></section>
    {!session ? <section className="subs-panel subs-signin"><ShieldCheck size={25}/><h2>Sign in to manage your subscriptions</h2><p>Your subscription records are private and linked to your Sub account.</p><a href="/#services">Go to sign in <ArrowLeft size={14}/></a></section> : <>
      <section className="subs-section"><div className="subs-section-heading"><div><small>YOUR SERVICES</small><h2>My subscriptions</h2></div><button onClick={load} disabled={busy}><RefreshCw size={14}/> Refresh</button></div>
        {notice&&<div className="subs-notice"><CircleAlert size={16}/>{notice}</div>}
        {busy?<div className="subs-empty">Loading your subscriptions…</div>:subscriptions.length?<div className="subs-list">{subscriptions.map(item=>{const Icon=iconFor(item.provider);return <article className="subs-item" key={item.id}><div className="subs-provider-icon"><Icon size={21}/></div><div className="subs-item-main"><div className="subs-item-title"><strong>{item.provider}</strong><span className={"subs-status "+item.status}>{item.status.replaceAll("_"," ")}</span></div><p>{item.plan_name} · {item.account_identifier}</p><small>Expires {date(item.expires_at)}</small></div><div className="subs-renew"><small>Auto-renew</small><button disabled={saving===item.id||item.status!=="active"} className={item.auto_renew?"enabled":""} onClick={()=>toggleRenewal(item)} aria-label="Toggle auto renewal">{saving===item.id?"…":item.auto_renew?"On":"Off"}</button></div></article>;})}</div>:<div className="subs-empty"><CalendarClock size={25}/><strong>No subscriptions yet</strong><span>Your purchased streaming and TV services will appear here after activation.</span></div>}
      </section>
      <section className="subs-section"><div className="subs-section-heading"><div><small>EXPLORE SERVICES</small><h2>Subscription marketplace</h2></div></div>
        {catalog.length?<div className="subs-catalog">{catalog.map(item=>{const Icon=iconFor(item.category);return <article className="subs-catalog-card" key={item.id}><div className="subs-provider-icon"><Icon size={22}/></div><small>{item.category}</small><h3>{item.provider}</h3><p>{item.description}</p><span>{item.plans?.length||0} plans listed</span><button disabled>Purchases opening soon</button></article>;})}</div>:<><div className="subs-catalog">{[{provider:"Netflix",category:"Streaming",description:"Choose a supported Netflix plan and manage renewals."},{provider:"Spotify",category:"Music",description:"Music plans and premium account renewals."},{provider:"YouTube Premium",category:"Streaming",description:"Premium video and music subscriptions."},{provider:"Apple Music",category:"Music",description:"Apple Music subscription options."},{provider:"Showmax",category:"Streaming",description:"Entertainment and sports streaming plans."},{provider:"DStv · GOtv · Startimes",category:"TV",description:"TV package renewals and account management."}].map(item=>{const Icon=iconFor(item.category);return <article className="subs-catalog-card" key={item.provider}><div className="subs-provider-icon"><Icon size={22}/></div><small>{item.category}</small><h3>{item.provider}</h3><p>{item.description}</p><span>Supplier connection required</span><button disabled>Coming soon</button></article>;})}</div><p className="subs-disclaimer">These services are displayed as upcoming options, not live offers. Checkout will be enabled only after an approved supplier, current pricing and fulfillment verification are configured.</p></>}
      </section>
      <section className="subs-section"><div className="subs-section-heading"><div><small>TRANSACTION HISTORY</small><h2>Subscription payments</h2></div></div>{orders.length?<div className="subs-orders">{orders.map(order=><article key={order.reference}><div><strong>{order.provider} · {order.plan_name}</strong><small>{date(order.created_at)} · {order.reference}</small></div><b>{money(order.amount)}</b><span className={"subs-status "+order.status}>{order.status.replaceAll("_"," ")}</span></article>)}</div>:<div className="subs-empty compact">No subscription payments yet.</div>}</section>
    </>}
    <footer className="subs-footer"><ShieldCheck size={15}/> Secure account management · Sub</footer>
  </main>;
}
