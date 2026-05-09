CREATE TABLE bill_line_items (
  id               SERIAL PRIMARY KEY,
  bill_id          INTEGER REFERENCES bills(id) ON DELETE CASCADE,
  item_id          INTEGER REFERENCES items(id),
  item_name        VARCHAR(255) NOT NULL,
  hsn_code         VARCHAR(20),
  tax_rate         NUMERIC(5,2) NOT NULL,
  custom_rate      NUMERIC(10,2) NOT NULL,
  qty              NUMERIC(10,2),
  discount_percent NUMERIC(5,2) DEFAULT 0,
  taxable_value    NUMERIC(10,2) NOT NULL,
  cgst_amt         NUMERIC(10,2) DEFAULT 0,
  sgst_amt         NUMERIC(10,2) DEFAULT 0,
  igst_amt         NUMERIC(10,2) DEFAULT 0,
  line_total       NUMERIC(10,2) NOT NULL
);