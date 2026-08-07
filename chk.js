const {Pool}=require("pg");
const p=new Pool({connectionString:"postgresql://postgres.loqbxknhnwukhikcpgab:Kurangkerjaan93asd!!@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres"});
p.query("SELECT id, title, status, created_at FROM plans ORDER BY created_at DESC LIMIT 3").then(r=>{
  r.rows.forEach(pl=>console.log(pl.id.slice(0,8)+"... "+pl.title+" ["+pl.status+"]"));
  p.end();
}).catch(e=>{console.error(e.message);p.end()});
