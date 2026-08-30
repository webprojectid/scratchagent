const pg = require('pg');
const pid = process.argv[2];
const c = new pg.Client({ connectionString: 'postgresql://postgres.loqbxknhnwukhikcpgab:Bleedemo1993%21%21@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres' });
(async () => {
  await c.connect();
  const r = (await c.query('select p.status, round(extract(epoch from (now()-p.created_at))) umur, (select count(*) from features f where f.plan_id=p.id) fase, (select count(*) from tasks t where t.plan_id=p.id) task from plans p where p.id=$1', [pid])).rows[0] ?? null;
  console.log(new Date().toLocaleTimeString('id-ID'), r ? ('umur ' + r.umur + 's | status: ' + r.status + ' | fase: ' + r.fase + ' | task: ' + r.task) : 'PLAN DIHAPUS (gagal + refund)');
  await c.end();
})().catch(e => console.error('ERR', e.message));
