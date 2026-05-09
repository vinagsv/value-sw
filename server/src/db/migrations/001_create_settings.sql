CREATE TABLE settings (
  key   VARCHAR(100) PRIMARY KEY,
  value TEXT NOT NULL
);

INSERT INTO settings (key, value) VALUES
  ('auth_username',    'admin'),
  ('auth_password',    '$2b$10$CHANGE_THIS_TO_REAL_BCRYPT_HASH'),
  ('bill_prefix',      'VMA\26\'),
  ('bill_counter',     '1'),
  ('gate_pass_prefix', 'GP\26\'),
  ('gate_pass_counter','1'),
  ('company_name',     'VALUE MOTOR AGENCY PVT LTD'),
  ('company_address',  '#16/A, MILLERS ROAD, VASANTH NAGAR, BANGALORE - 52'),
  ('company_gstin',    '29AACCV2521J1ZA'),
  ('company_phone',    '9845906084'),
  ('company_email',    'millers_road_suzuki@yahoo.com');