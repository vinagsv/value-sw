import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import db from './index.js';

// Setup __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const runMigrations = async () => {
  console.log('⏳ Attempting to connect to the database...');
  let client;
  
  try {
    client = await db.connect();
    console.log('✅ Connection successful! You are connected to the Railway Database.');
    
    const migrationsDir = path.join(__dirname, 'migrations');
    const files = fs.readdirSync(migrationsDir).sort();

    console.log('📦 Starting table creation...');
    for (const file of files) {
      if (file.endsWith('.sql')) {
        console.log(`   Running ${file}...`);
        const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
        await client.query(sql);
        console.log(`   ✔️  ${file} applied.`);
      }
    }
    
    console.log('🎉 Database setup complete! All tables are ready.');
  } catch (error) {
    console.error('❌ Database Connection or Setup Failed:');
    console.error(error.message);
  } finally {
    if (client) client.release();
    process.exit();
  }
};

runMigrations();