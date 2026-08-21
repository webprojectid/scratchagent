import pg from 'pg';

const run = async () => {
  const client = new pg.Client({ 
    connectionString: 'postgresql://postgres.loqbxknhnwukhikcpgab:Kurangkerjaan93asd%21%21@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres' 
  });
  await client.connect();
  
  const planId = '9ade6972-7792-43d7-beac-2f4a53fda9fd';
  
  const features = await client.query('SELECT id, slug, title, icon, "order" FROM features WHERE plan_id = $1 ORDER BY "order"', [planId]);
  console.log(`Total Features: ${features.rows.length}`);
  
  for (let i = 0; i < features.rows.length; i++) {
    const f = features.rows[i];
    const subs = await client.query('SELECT id, title, "order" FROM sub_features WHERE feature_id = $1 ORDER BY "order"', [f.id]);
    const tasks = await client.query(`
      SELECT t.ref, t.title FROM tasks t 
      JOIN sub_features sf ON t.sub_feature_id = sf.id 
      WHERE sf.feature_id = $1
    `, [f.id]);
    console.log(`Fase ${i + 1} (order ${f.order}): "${f.title}" -> ${subs.rows.length} subs, ${tasks.rows.length} tasks`);
    if (subs.rows.length === 0 || tasks.rows.length === 0) {
      console.log(`   --> DETAIL FASE ${i + 1} (KOSONG):`, JSON.stringify(f));
    }
  }
  
  await client.end();
};

run().catch(console.error);
