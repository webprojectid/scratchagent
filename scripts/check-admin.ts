import pg from 'pg';

const run = async () => {
  const client = new pg.Client({ 
    connectionString: 'postgresql://postgres.loqbxknhnwukhikcpgab:Kurangkerjaan93asd%21%21@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres' 
  });
  await client.connect();
  
  // Check all users with their details
  const users = await client.query("SELECT id, email, name, tier, created_at FROM users ORDER BY created_at DESC");
  console.log('=== ALL USERS IN DATABASE ===');
  users.rows.forEach((u, i) => {
    console.log((i+1) + '. Email: ' + u.email);
    console.log('   ID: ' + u.id);
    console.log('   Tier: ' + u.tier);
    console.log('   Created: ' + u.created_at);
    console.log('');
  });
  
  // Check if teguhends@gmail.com exists
  const teguh = users.rows.find(u => u.email === 'teguhends@gmail.com');
  if (teguh) {
    console.log('✅ teguhends@gmail.com FOUND in database');
    console.log('   User ID: ' + teguh.id);
  } else {
    console.log('❌ teguhends@gmail.com NOT FOUND in database!');
    console.log('   This could be the issue - user needs to login first');
  }
  
  await client.end();
};

run().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
