CREATE TABLE bills (
  id               SERIAL PRIMARY KEY,
  bill_no          VARCHAR(50) UNIQUE NOT NULL,
  date             DATE NOT NULL,
  customer_name    VARCHAR(255) NOT NULL,
  customer_gstin   VARCHAR(15),
  is_interstate    BOOLEAN NOT NULL DEFAULT false,
  job_card_no      VARCHAR(100),
  vehicle_reg_no   VARCHAR(50),
  narration        TEXT,
  discount_percent NUMERIC(5,2) DEFAULT 0,
  discount_amount  NUMERIC(10,2) DEFAULT 0,
  subtotal         NUMERIC(10,2) NOT NULL,
  total_tax        NUMERIC(10,2) NOT NULL,
  grand_total      NUMERIC(10,2) NOT NULL,
  status           VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  created_at       TIMESTAMP DEFAULT NOW()
);