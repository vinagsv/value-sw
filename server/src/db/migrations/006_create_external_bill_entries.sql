CREATE TABLE external_bill_entries (
  id         SERIAL PRIMARY KEY,
  bill_id    INTEGER REFERENCES bills(id) ON DELETE CASCADE,
  type_id    INTEGER REFERENCES external_bill_types(id),
  ref_number VARCHAR(100),
  amount     NUMERIC(10,2) NOT NULL
);