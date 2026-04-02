const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres.pvembnauypaqggmowveh:9PS8Lz%2BeK%2B%26x99B@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres',
});

async function run() {
  try {
    await client.connect();
    console.log('Connected to Supabase PostgreSQL!');

    const salesRes = await client.query('SELECT COUNT(*) FROM "SalesDelivery"');
    console.log(`SalesDelivery count in Supabase: ${salesRes.rows[0].count}`);

    const vendorRes = await client.query('SELECT type, COUNT(*) FROM "Vendor" GROUP BY type');
    console.log(`Vendor counts in Supabase:`);
    vendorRes.rows.forEach(r => console.log(` - ${r.type}: ${r.count}`));

    const productRes = await client.query('SELECT COUNT(*) FROM "Product"');
    console.log(`Product count in Supabase: ${productRes.rows[0].count}`);
    
  } catch (err) {
    console.error('Error connecting or querying:', err);
  } finally {
    await client.end();
  }
}

run();
