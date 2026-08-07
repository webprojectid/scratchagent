const {Pool}=require("pg");
const p=new Pool({connectionString:"postgresql://postgres.loqbxknhnwukhikcpgab:Kurangkerjaan93asd!!@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres"});
(async()=>{
  let r=await p.query("SELECT id, title, slug FROM features WHERE plan_id='b5474921-4ed2-4c48-b92e-9a36813ae641'");
  for(let f of r.rows){console.log("F:", f.slug, f.title);let r2=await p.query("SELECT id, title FROM sub_features WHERE feature_id=$1",[f.id]);for(let s of r2.rows){let r3=await p.query("SELECT ref, title, status FROM tasks WHERE sub_feature_id=$1",[s.id]);console.log("  S:", s.title, r3.rows.length+" tasks");for(let t of r3.rows)console.log("    T:", t.ref, t.status, t.title.slice(0,50));}}
  await p.end();
})().catch(e=>{console.error(e.message);p.end()});
