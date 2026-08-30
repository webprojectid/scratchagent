import "./lib-env";
import pg from 'pg';

const run = async () => {
  const client = new pg.Client({ 
    connectionString: process.env.DATABASE_URL! 
  });
  await client.connect();
  
  console.log('Updating LLM config di database...');
  
  await client.query(`
    INSERT INTO llm_settings (id, base_url, api_key, model, updated_at)
    VALUES (1, $1, $2, $3, NOW())
    ON CONFLICT (id) DO UPDATE SET 
      base_url = EXCLUDED.base_url,
      api_key = EXCLUDED.api_key,
      model = EXCLUDED.model,
      updated_at = NOW()
  `, [
    process.env.LLM_BASE_URL ?? "",
    process.env.LLM_API_KEY ?? "",
    process.env.LLM_MODEL ?? ""
  ]);
  
  console.log('✅ Database updated!');
  
  // Verify
  const result = await client.query('SELECT id, base_url, model, LEFT(api_key,15) as key_prefix, updated_at FROM llm_settings WHERE id=1');
  const row = result.rows[0];
  
  console.log('');
  console.log('Verification:');
  console.log('  Base URL : ' + row.base_url);
  console.log('  Model    : ' + row.model);
  console.log('  API Key  : ' + row.key_prefix + '...');
  console.log('  Updated  : ' + row.updated_at);
  
  await client.end();
};

run().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
