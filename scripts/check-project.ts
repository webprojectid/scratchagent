import "./lib-env";
import pg from 'pg';

const run = async () => {
  const client = new pg.Client({ 
    connectionString: process.env.DATABASE_URL! 
  });
  await client.connect();
  
  const planId = '9ade6972-7792-43d7-beac-2f4a53fda9fd';
  
  // Get plan
  const plan = await client.query('SELECT id, title, brief, status, created_at FROM plans WHERE id = $1', [planId]);
  console.log('=== PLAN ===');
  if (plan.rows.length > 0) {
    console.log('Title   : ' + plan.rows[0].title);
    console.log('Brief   : ' + plan.rows[0].brief.substring(0, 200));
    console.log('Status  : ' + plan.rows[0].status);
    console.log('Created : ' + plan.rows[0].created_at);
  } else {
    console.log('Plan not found!');
  }
  
  // Get features
  const features = await client.query('SELECT id, slug, title, icon, description, tujuan, priority, status, "order" FROM features WHERE plan_id = $1 ORDER BY "order"', [planId]);
  console.log('\n=== FEATURES (' + features.rows.length + ') ===');
  features.rows.forEach((f, i) => {
    console.log((i+1) + '. ' + f.icon + ' ' + f.title + ' [' + f.priority + '] - ' + f.status);
    console.log('   Desc: ' + f.description.substring(0, 100));
    console.log('   Tujuan: ' + (f.tujuan || '(empty)').substring(0, 80));
  });
  
  // Get sub-features
  const subFeatures = await client.query(`
    SELECT sf.id, sf.title, sf.tujuan, sf."order", f.title as feature_title 
    FROM sub_features sf 
    JOIN features f ON sf.feature_id = f.id 
    WHERE f.plan_id = $1 
    ORDER BY f."order", sf."order"
  `, [planId]);
  console.log('\n=== SUB-FEATURES (' + subFeatures.rows.length + ') ===');
  subFeatures.rows.forEach((sf, i) => {
    console.log((i+1) + '. [' + sf.feature_title.substring(0, 30) + '] ' + sf.title);
  });
  
  // Get tasks
  const tasks = await client.query(`
    SELECT t.ref, t.title, t.layer, t.phase, t.status, t.page, t.deps, sf.title as sub_feature_title 
    FROM tasks t 
    JOIN sub_features sf ON t.sub_feature_id = sf.id 
    JOIN features f ON sf.feature_id = f.id 
    WHERE f.plan_id = $1 
    ORDER BY t.ref
  `, [planId]);
  console.log('\n=== TASKS (' + tasks.rows.length + ') ===');
  tasks.rows.forEach((t, i) => {
    console.log(t.ref + ' [' + t.layer + '] ' + t.title);
    console.log('   Sub-feature: ' + t.sub_feature_title);
    console.log('   Phase: ' + t.phase + ' | Status: ' + t.status);
    console.log('   Page: ' + (t.page || 'null') + ' | Deps: ' + JSON.stringify(t.deps));
  });
  
  await client.end();
};

run().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
