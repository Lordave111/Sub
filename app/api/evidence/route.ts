import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getAuthenticatedUserId } from "@/lib/auth";
import { env, supabase } from "@/lib/server";

export const runtime = "nodejs";
const allowed = new Set(["image/jpeg","image/png","image/webp","application/pdf","text/plain"]);
const MAX = 10 * 1024 * 1024;

export async function POST(req: NextRequest) {
  const userId = await getAuthenticatedUserId(req);
  if (!userId) return NextResponse.json({ error: "Sign in before uploading evidence." }, { status: 401 });
  try {
    const form = await req.formData();
    const file = form.get("file");
    const reportId = String(form.get("report_id") || "");
    if (!(file instanceof File) || !reportId) return NextResponse.json({ error: "Choose a file and report." }, { status: 400 });
    if (!allowed.has(file.type) || file.size < 1 || file.size > MAX) return NextResponse.json({ error: "Allowed files: JPG, PNG, WebP, PDF or TXT, up to 10 MB." }, { status: 400 });
    const report = await supabase("fg_reports?id=eq." + encodeURIComponent(reportId) + "&reporter_id=eq." + encodeURIComponent(userId) + "&select=id");
    if (!report.ok || !(await report.json()).length) return NextResponse.json({ error: "Report not found or access denied." }, { status: 404 });
    const ext = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g,"").slice(0,8) || "bin";
    const path = userId + "/" + reportId + "/" + randomUUID() + "." + ext;
    const key = process.env.SUPABASE_SECRET_KEY || env("SUPABASE_SERVICE_ROLE_KEY");
    const upload = await fetch(env("SUPABASE_URL") + "/storage/v1/object/fraudguard-evidence/" + path.split("/").map(encodeURIComponent).join("/"), {
      method: "POST", headers: { apikey: key, Authorization: "Bearer " + key, "Content-Type": file.type, "x-upsert": "false" }, body: await file.arrayBuffer(), cache: "no-store"
    });
    if (!upload.ok) return NextResponse.json({ error: "Evidence storage failed. Apply the FraudGuard storage migration." }, { status: 503 });
    const saved = await supabase("fg_evidence", { method: "POST", body: JSON.stringify({ report_id: reportId, uploader_id: userId, storage_path: path, original_name: file.name.slice(0,180), mime_type: file.type, byte_size: file.size, review_status: "quarantined" }) });
    if (!saved.ok) return NextResponse.json({ error: "File stored in private quarantine, but its evidence record could not be created. Contact support." }, { status: 500 });
    return NextResponse.json({ evidence: (await saved.json())[0], message: "Evidence uploaded to private quarantine. It is not publicly accessible and has not yet been malware-scanned." }, { status: 201 });
  } catch { return NextResponse.json({ error: "Evidence upload failed." }, { status: 400 }); }
}
