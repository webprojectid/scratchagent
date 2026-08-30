import { createClient } from "@supabase/supabase-js";

const BASE_URL = "https://scratchagent.web.id";
const SUPABASE_URL = "https://loqbxknhnwukhikcpgab.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxvcWJ4a25obnd1a2hpa2NwZ2FiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYwNzIzNjAsImV4cCI6MjEwMTY0ODM2MH0.x5dA1ztdxQHKOWCuEj7quwWUyJAbdeGtpio-vuv6OEo";

const EMAIL = "admin@scratchagent.com";
const PASSWORD = "Bleedemo1993!!";

const BRIEF_TEXT =
  "Platform SaaS Real-time Server & Uptime Monitor dengan multi-channel alert (Telegram, Discord, Email), public status page kustom, visual latency analytics, automatic SSL certificate expiration checker, dan team role permissions.";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  console.log("==================================================================");
  console.log("🌐 SIMULASI PRODUKSI: SCRATCHAGENT.WEB.ID");
  console.log(`🎯 URL Target : ${BASE_URL}`);
  console.log(`👤 User       : ${EMAIL}`);
  console.log("==================================================================\n");

  const startTime = Date.now();

  // STEP 1: Test reachability of production website
  console.log("📡 [1/6] Memeriksa konektivitas ke website live...");
  try {
    const rootRes = await fetch(BASE_URL, { headers: { "User-Agent": "ScratchAgent-Sim-Bot/1.0" } });
    console.log(`   Status HTTP Home: ${rootRes.status} ${rootRes.statusText}`);
    if (!rootRes.ok) {
      throw new Error(`Website live merespons dengan status ${rootRes.status}`);
    }
  } catch (err: any) {
    console.error("❌ Gagal terhubung ke website live:", err.message);
    process.exit(1);
  }

  // STEP 2: Authenticate via Supabase Auth
  console.log("\n🔐 [2/6] Melakukan autentikasi akun admin ke Supabase...");
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
  });

  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: EMAIL,
    password: PASSWORD,
  });

  if (authError || !authData.session) {
    console.error("❌ Login gagal:", authError?.message || "Tidak ada session");
    process.exit(1);
  }

  const session = authData.session;
  console.log("✅ Login berhasil!");
  console.log(`   - User ID: ${session.user.id}`);
  console.log(`   - Email  : ${session.user.email}`);
  console.log(`   - Role   : ${session.user.role}`);

  // Create cookie string for @supabase/ssr format
  const projectRef = "loqbxknhnwukhikcpgab";
  const cookieVal = encodeURIComponent(JSON.stringify({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    token_type: session.token_type,
    user: session.user,
  }));
  const cookieHeader = `sb-${projectRef}-auth-token=${cookieVal}; sb-${projectRef}-auth-token.0=${encodeURIComponent(JSON.stringify(session))}`;

  const headersWithAuth: Record<string, string> = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${session.access_token}`,
    "Cookie": cookieHeader,
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  };

  // STEP 3: Verify /api/me or /api/generate quota on live server
  console.log("\n🔍 [3/6] Memeriksa endpoint identitas & kuota di server live...");
  try {
    const quotaRes = await fetch(`${BASE_URL}/api/generate?userId=${encodeURIComponent(EMAIL)}`, {
      headers: headersWithAuth,
    });
    console.log(`   Status /api/generate (GET): ${quotaRes.status}`);
    if (quotaRes.ok) {
      const quotaData = await quotaRes.json();
      console.log(`   - Kuota data:`, quotaData);
    }
  } catch (err: any) {
    console.log("   Info quota check:", err.message);
  }

  // STEP 4: Submit Brief to POST /api/generate
  console.log("\n📝 [4/6] Mengirim brief baru ke /api/generate live...");
  console.log(`   Brief: "${BRIEF_TEXT}"`);

  const genPayload = {
    brief: BRIEF_TEXT,
    techPrefs: { mode: "auto" },
    userId: EMAIL,
    answers: [],
  };

  const tPost = Date.now();
  const genRes = await fetch(`${BASE_URL}/api/generate`, {
    method: "POST",
    headers: headersWithAuth,
    body: JSON.stringify(genPayload),
  });

  const genStatus = genRes.status;
  const genText = await genRes.text();
  let genJson: any = {};
  try {
    genJson = JSON.parse(genText);
  } catch {
    console.error(`❌ Respons /api/generate bukan JSON (HTTP ${genStatus}): ${genText.slice(0, 300)}`);
    process.exit(1);
  }

  if (!genRes.ok || genJson.error) {
    console.error(`❌ Gagal mengirim brief: HTTP ${genStatus} -`, genJson.error || genText);
    process.exit(1);
  }

  const planId = genJson.id;
  console.log(`✅ Brief diterima server! (Response time: ${(Date.now() - tPost)}ms)`);
  console.log(`   - Plan ID: ${planId}`);

  // STEP 5: Poll /api/plans/{id}/progress for PRD structure
  console.log("\n⏳ [5/6] Menunggu server menyelesaikan PRD Blueprint (Fase & Stack)...");
  let structureReady = false;
  let features: any[] = [];
  let planTitle = "";
  let planStack: string[] = [];

  for (let attempt = 1; attempt <= 60; attempt++) {
    await sleep(3000);
    try {
      const progRes = await fetch(`${BASE_URL}/api/plans/${planId}/progress`, {
        headers: headersWithAuth,
      });

      if (progRes.status === 404) {
        console.log(`   [Attempt ${attempt}] Plan belum ditemukan di DB / sedang diinisialisasi...`);
        continue;
      }

      if (progRes.ok) {
        const progData = await progRes.json();
        const fList = progData.features || [];
        const taskCount = progData.completedTasks ?? 0;
        const totalTasks = progData.totalTasks ?? 0;
        console.log(
          `   [Attempt ${attempt} (${attempt * 3}s)] Status: ${progData.status || "processing"} | Fase: ${fList.length} | Tasks: ${taskCount}/${totalTasks}`
        );

        if (fList.length > 0) {
          structureReady = true;
          features = fList;
          planTitle = progData.title || "";
          planStack = progData.stack || [];
          break;
        }
      }
    } catch (e: any) {
      console.log(`   [Attempt ${attempt}] Jaringan polling: ${e.message}`);
    }
  }

  if (!structureReady) {
    console.error("❌ Timeout menunggu pembentukan struktur PRD.");
    process.exit(1);
  }

  console.log(`\n🎉 Struktur PRD Berhasil Terbentuk!`);
  console.log(`   - Judul Plan : "${planTitle}"`);
  console.log(`   - Tech Stack : ${planStack.join(", ") || "Auto-detected"}`);
  console.log(`   - Total Fase : ${features.length} Fase:`);
  features.forEach((f, idx) => {
    console.log(`     ${idx + 1}. [${f.priority || "P1"}] ${f.title}`);
  });

  // STEP 6: Trigger & Poll Task Generation
  console.log("\n⚡ [6/6] Memicu & memantau pembuatan Tasks secara lengkap (/generate-all)...");

  const genAllRes = await fetch(`${BASE_URL}/api/plans/${planId}/generate-all?userId=${encodeURIComponent(EMAIL)}`, {
    method: "POST",
    headers: headersWithAuth,
  });
  console.log(`   Trigger /generate-all status: ${genAllRes.status}`);

  let allCompleted = false;
  let finalPlan: any = null;

  for (let attempt = 1; attempt <= 80; attempt++) {
    await sleep(3000);
    try {
      const progRes = await fetch(`${BASE_URL}/api/plans/${planId}/progress`, {
        headers: headersWithAuth,
      });

      if (progRes.ok) {
        const progData = await progRes.json();
        const fList = progData.features || [];
        const completedTasks = progData.completedTasks ?? 0;
        const totalTasks = progData.totalTasks ?? 0;
        const status = progData.status || "generating";

        console.log(
          `   [Progress ${attempt * 3}s] Status: ${status} | Tasks Selesai: ${completedTasks}/${totalTasks}`
        );

        if (status === "completed" || (totalTasks > 0 && completedTasks >= totalTasks)) {
          allCompleted = true;
          finalPlan = progData;
          break;
        }
      }
    } catch (e: any) {
      console.log(`   Polling error: ${e.message}`);
    }
  }

  const totalDuration = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log("\n==================================================================");
  console.log("🏁 HASIL SIMULASI PRODUKSI SCRATCHAGENT.WEB.ID");
  console.log("==================================================================");
  console.log(`⏱️  Total Waktu : ${totalDuration} detik`);
  console.log(`🔗 URL Plan    : ${BASE_URL}/project/${planId}`);
  console.log(`📄 Judul       : "${planTitle}"`);
  console.log(`📊 Status      : ${allCompleted ? "✅ SUKSES 100% (Completed)" : "⏳ Dalam Proses / Sebagian Selesai"}`);

  // Fetch final plan details for verification
  try {
    const planDetailRes = await fetch(`${BASE_URL}/api/plans/${planId}/export?format=md&userId=${encodeURIComponent(EMAIL)}`, {
      headers: headersWithAuth,
    });
    if (planDetailRes.ok) {
      const mdContent = await planDetailRes.text();
      console.log(`📦 Export Markdown: Berhasil (${mdContent.length} bytes)`);
    }
  } catch {}

  console.log("==================================================================\n");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
