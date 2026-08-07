const {Pool}=require("pg");
const p=new Pool({connectionString:"postgresql://postgres.loqbxknhnwukhikcpgab:Kurangkerjaan93asd!!@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres"});
(async()=>{
  let r=await p.query("SELECT id, title, brief, status FROM plans WHERE id='b5474921-4ed2-4c48-b92e-9a36813ae641'");
  console.log("Plan:", r.rows[0]?.title, r.rows[0]?.status);
  let f=await p.query("SELECT count(*) FROM features WHERE plan_id='b5474921-4ed2-4c48-b92e-9a36813ae641'");
  console.log("Features:", f.rows[0].count);
  let s=await p.query("SELECT count(*) FROM sub_features sf JOIN features f ON sf.feature_id=f.id WHERE f.plan_id='b5474921-4ed2-4c48-b92e-9a36813ae641'");
  console.log("Sub-features:", s.rows[0].count);
  let t=await p.query("SELECT count(*) FROM tasks WHERE plan_id='b5474921-4ed2-4c48-b92e-9a36813ae641'");
  console.log("Tasks:", t.rows[0].count);
  await p.end();
})().catch(e=>{console.error(e.message);p.end()});
