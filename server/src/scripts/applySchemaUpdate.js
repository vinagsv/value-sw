import db from '../db/index.js';

const updateSchema = async () => {
  console.log('⏳ Connecting to database to apply schema updates...');
  const client = await db.connect();

  try {
    await client.query('BEGIN');

    console.log('1️⃣  Dropping old items table...');
    await client.query(`DROP TABLE IF EXISTS items CASCADE;`);

    console.log('2️⃣  Creating new items table matching Excel schema exactly...');
    await client.query(`
      CREATE TABLE items (
        id                   SERIAL PRIMARY KEY,
        item_id              VARCHAR(100) UNIQUE NOT NULL,
        item_name            VARCHAR(255) NOT NULL,
        hsn_sac              VARCHAR(50),
        quantity_applicable  VARCHAR(10) DEFAULT 'No',
        available_quantity   NUMERIC(10,2) DEFAULT 0,
        description          TEXT,
        rate                 VARCHAR(50) DEFAULT '0',
        taxable              BOOLEAN DEFAULT TRUE,
        product_type         VARCHAR(50) DEFAULT 'goods',
        intra_state_tax_name VARCHAR(100),
        intra_state_tax_rate NUMERIC(5,2) DEFAULT 0,
        intra_state_tax_type VARCHAR(50),
        inter_state_tax_name VARCHAR(100),
        inter_state_tax_rate NUMERIC(5,2) DEFAULT 0,
        status               VARCHAR(50) DEFAULT 'Active',
        created_at           TIMESTAMP DEFAULT NOW()
      );
    `);

    console.log('3️⃣  Restoring foreign key connections for billing...');
    try {
      await client.query(`
        ALTER TABLE bill_line_items 
        ADD CONSTRAINT bill_line_items_item_id_fkey 
        FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE SET NULL;
      `);
    } catch (fkError) {
      console.log('   ℹ️ Note: Foreign key not added (bill_line_items may not exist yet — this is fine).');
    }

    console.log('4️⃣  Ensuring audit_logs table exists...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
        action VARCHAR(100) NOT NULL,
        details TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await client.query('COMMIT');
    console.log('✅ Schema update completely successful!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Schema update failed:', error.message);
  } finally {
    client.release();
    process.exit(0);
  }
};

updateSchema();