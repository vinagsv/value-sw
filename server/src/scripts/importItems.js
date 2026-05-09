import * as XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';
import db from '../db/index.js';

const importInventory = async () => {
  const filePath = process.argv[2];

  if (!filePath) {
    console.error('❌ Please provide the path to the Excel file.');
    console.error('Usage: node src/scripts/importItems.js <path-to-Item.xlsx>');
    process.exit(1);
  }

  const absolutePath = path.resolve(filePath);
  if (!fs.existsSync(absolutePath)) {
    console.error(`❌ File not found at path: ${absolutePath}`);
    process.exit(1);
  }

  console.log(`📄 Reading Excel file: ${absolutePath}`);

  try {
    const fileBuffer = fs.readFileSync(absolutePath);
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const items = XLSX.utils.sheet_to_json(sheet);

    console.log(`📊 Found ${items.length} items to import. Starting database insertion...`);

    const client = await db.connect();
    await client.query('BEGIN');

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    for (const item of items) {
      // Map exact Excel column headers
      const item_id = item['Item ID']?.toString().trim();
      const item_name = item['Item Name']?.toString().trim();

      if (!item_id || !item_name) {
        console.log(`⚠️ Skipped row missing 'Item ID' or 'Item Name': ${JSON.stringify(item)}`);
        skipCount++;
        continue;
      }

      // 'Quantity Applicable' in Excel (was wrongly named 'Quantity' before)
      const quantity_applicable = item['Quantity Applicable']?.toString().trim() || 'No';
      const available_quantity = Number(item['Available Quantity']) || 0;

      // Rate comes as "INR 178.00" — strip the currency prefix
      const rawRate = item['Rate']?.toString().trim() || '0';
      const rate = rawRate.replace(/^INR\s*/i, '').trim() || '0';

      const hsn_sac = item['HSN/SAC']?.toString().trim() || '';
      const description = item['Description']?.toString().trim() || '';

      // Taxable is a boolean in Excel (TRUE/FALSE)
      const taxableRaw = item['Taxable'];
      const taxable = taxableRaw === true || taxableRaw?.toString().toLowerCase() === 'true';

      const product_type = item['Product Type']?.toString().trim() || 'goods';
      const intra_state_tax_name = item['Intra State Tax Name']?.toString().trim() || '';
      const intra_state_tax_rate = Number(item['Intra State Tax Rate']) || 0;
      const intra_state_tax_type = item['Intra State Tax Type']?.toString().trim() || '';
      const inter_state_tax_name = item['Inter State Tax Name']?.toString().trim() || '';
      const inter_state_tax_rate = Number(item['Inter State Tax Rate']) || 0;
      const status = item['Status']?.toString().trim() || 'Active';

      try {
        await client.query(
          `INSERT INTO items (
            item_id, item_name, hsn_sac, quantity_applicable, available_quantity, description, rate,
            taxable, product_type, intra_state_tax_name, intra_state_tax_rate,
            intra_state_tax_type, inter_state_tax_name, inter_state_tax_rate, status
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
          ON CONFLICT (item_id) DO UPDATE SET
            item_name            = EXCLUDED.item_name,
            hsn_sac              = EXCLUDED.hsn_sac,
            quantity_applicable  = EXCLUDED.quantity_applicable,
            available_quantity   = EXCLUDED.available_quantity,
            description          = EXCLUDED.description,
            rate                 = EXCLUDED.rate,
            taxable              = EXCLUDED.taxable,
            product_type         = EXCLUDED.product_type,
            intra_state_tax_name = EXCLUDED.intra_state_tax_name,
            intra_state_tax_rate = EXCLUDED.intra_state_tax_rate,
            intra_state_tax_type = EXCLUDED.intra_state_tax_type,
            inter_state_tax_name = EXCLUDED.inter_state_tax_name,
            inter_state_tax_rate = EXCLUDED.inter_state_tax_rate,
            status               = EXCLUDED.status
          `,
          [
            item_id, item_name, hsn_sac, quantity_applicable, available_quantity, description, rate,
            taxable, product_type, intra_state_tax_name, intra_state_tax_rate,
            intra_state_tax_type, inter_state_tax_name, inter_state_tax_rate, status
          ]
        );
        successCount++;
      } catch (err) {
        console.error(`❌ Error inserting item ${item_id}:`, err.message);
        errorCount++;
      }
    }

    if (successCount > 0) {
      await client.query(
        `INSERT INTO audit_logs (action, details) VALUES ($1, $2)`,
        ['BULK_IMPORT_INVENTORY', `Admin bulk imported/synced ${successCount} items from Excel file.`]
      );
    }

    await client.query('COMMIT');
    client.release();

    console.log('\n✅ Import Complete!');
    console.log(`   Successfully imported/updated: ${successCount}`);
    console.log(`   Skipped (missing IDs/Names):   ${skipCount}`);
    console.log(`   Failed errors:                 ${errorCount}\n`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Fatal Error during import:', error);
    process.exit(1);
  }
};

importInventory();