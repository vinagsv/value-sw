CREATE TABLE gate_passes (
  id SERIAL PRIMARY KEY,
  gate_pass_no VARCHAR(50) UNIQUE NOT NULL,
  date DATE NOT NULL,
  customer_name VARCHAR(255) NOT NULL,
  customer_mobile VARCHAR(20),
  vehicle_reg_no VARCHAR(50),
  ref_bill_no VARCHAR(50),
  ref_bill_id INTEGER REFERENCES bills(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW()
);