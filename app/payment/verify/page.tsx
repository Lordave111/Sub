"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Clock3, LoaderCircle, XCircle } from "lucide-react";
export default function VerifyPage() {
 const [reference,setReference]=useState(""); const [status,setStatus]=useState("checking"); const [message,setMessage]=useState("Confirming your payment and processing your order…");
 useEffect(()=>{ const ref=new URLSearchParams(window.location.search).get("reference")||""; setReference(ref); if(!ref){setStatus("failed");setMessage("No payment reference was found.");return;} fetch("/api/verify",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({reference:ref})}).then(r=>r.json()).then(d=>{setStatus(d.status==="delivered"?"success":d.status==="pending_provider"||d.status==="processing"?"pending":"failed");setMessage(d.message||d.error||"We could not confirm your order.");}).catch(()=>{setStatus("pending");setMessage("We could not reach the server. Your payment may still be processing. Contact support with your reference.");}); },[]);
 return <main className="result-page"><div className="result-card">{status==="checking"?<LoaderCircle className="result-icon spin"/>:status==="success"?<CheckCircle2 className="result-icon success"/>:status==="pending"?<Clock3 className="result-icon pending"/>:<XCircle className="result-icon failed"/>}<h1>{status==="checking"?"Checking your payment":status==="success"?"Order delivered":status==="pending"?"Payment received":"We need to check this"}</h1><p>{message}</p><div className="reference">Reference: <strong>{reference||"Not available"}</strong></div><Link className="result-btn" href="/">Back to Sub</Link></div></main>;
}
