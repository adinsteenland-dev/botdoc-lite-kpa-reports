-- Seed 6 customer groups with their Fabric data_filter configs.
-- Idempotent — ON CONFLICT (id) DO NOTHING skips rows that already exist.

INSERT INTO botdoc.customers (id, name, data_filter, avg_cars_config)
VALUES
  (
    '0842c4f4-ebd2-4a25-860e-8c7e7c8ff0ae',
    'AMSI',
    '{"userIds":[215],"titleExcludes":["%Campbell%","%Botdoc Auto%"]}',
    '{"stores":{}}'
  ),
  (
    'a081a567-4b22-47c1-8bbd-dd845f6a1671',
    'Eide Automotive Group',
    '{"storeIds":["ea2fc4aec5fd409f9c26c3eb31f72a4d","5d478cb059f14735a9feb74764be09c0","ded298d481f54f49b62f92d84a6505c7","503f1c4e0ff34661ae5198b37c695152","0f746e95bb034191a0922e246e31efd0","213bac66c5a64b9696d88fb025fe8967","aaf475c1b40e4cc2877e4937bde31e62"]}',
    '{}'
  ),
  (
    '9bcf63a4-dcca-493b-b938-cb5cc7c84aa8',
    'Bettenhausen Motors',
    '{"storeIds":["dd88c83df18948ea87985f58832dd694","ade5272cf3a047d089758f631ceb2218"]}',
    '{}'
  ),
  (
    '9b82e01b-b865-4c9b-b38b-0a4a09f3ff28',
    'Sewell Automotive',
    NULL,
    '{}'
  ),
  (
    'cc4b2c23-9b95-43c0-a417-1fe7cfa033b5',
    'Monroe Nissan & East Charlotte Nissan',
    '{"storeIds":["46f93253c60246d181f38903012986a6","b997ec3b536541878cb05bd3c58e0ba1"]}',
    '{}'
  ),
  (
    '375ffd34-871b-4a42-baa5-46d30428000c',
    'San Tan Ford',
    '{"storeIds":["70be8f9342614b3882482d012ca548bf"]}',
    '{}'
  )
ON CONFLICT (id) DO NOTHING;
