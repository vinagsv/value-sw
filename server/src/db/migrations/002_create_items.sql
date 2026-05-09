DROP TABLE IF EXISTS items CASCADE;

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