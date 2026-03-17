const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

async function runSql() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to database');

    const sqlPath = path.join(__dirname, 'setup-full-db.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('Running SQL setup script...');
    await client.query(sql);
    console.log('Successfully initialized database schema');

  } catch (err) {
    console.error('Error running SQL:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runSql();
