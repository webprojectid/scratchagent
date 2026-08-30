import "./lib-env";
import pg from 'pg';

const run = async () => {
  const client = new pg.Client({ 
    connectionString: process.env.DATABASE_URL! 
  });
  await client.connect();
  
  // Check user
  const user = await client.query("SELECT id, email, name, tier, created_at FROM users WHERE email = $1", ['teguhends@gmail.com']);
  console.log('=== USER DATA ===');
  if (user.rows.length > 0) {
    console.log(JSON.stringify(user.rows[0], null, 2));
  } else {
    console.log('User NOT found in database!');
  }
  
  // Check all users
  const allUsers = await client.query("SELECT id, email, name, tier FROM users ORDER BY created_at DESC LIMIT 10");
  console.log('\n=== ALL USERS ===');
  allUsers.rows.forEach((u, i) => {
    console.log((i+1) + '. ' + u.email + ' (tier: ' + u.tier + ')');
  });
  
  await client.end();
};

run().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
