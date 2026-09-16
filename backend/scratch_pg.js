const { Client } = require('pg');

async function testPostgres() {
  const passwords = ['postgres', 'admin', 'root', 'password', '123456', ''];
  const ports = [5432, 5433];

  for (const port of ports) {
    for (const p of passwords) {
      try {
        const client = new Client({ connectionString: `postgresql://postgres:${p}@localhost:${port}/postgres` });
        await client.connect();
        console.log(`SUCCESS: Connected to PostgreSQL on port ${port} with password: "${p}"`);
        
        // Try creating database av_lending_db if not exists
        try {
          await client.query('CREATE DATABASE av_lending_db;');
          console.log('Database av_lending_db created!');
        } catch (dbErr) {
          console.log('Database av_lending_db already exists or error:', dbErr.message);
        }

        await client.end();
        return;
      } catch (e) {
        // Continue trying
      }
    }
  }
  console.log('Could not connect to local PostgreSQL with test credentials.');
}

testPostgres();
