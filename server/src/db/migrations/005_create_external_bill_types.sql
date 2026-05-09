CREATE TABLE external_bill_types (
  id        SERIAL PRIMARY KEY,
  name      VARCHAR(100) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true
);

INSERT INTO external_bill_types (name, is_active) VALUES
  ('CSI Bill', true),
  ('BC Bill', true);