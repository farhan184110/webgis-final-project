CREATE TABLE homescope.raw_block_groups AS
SELECT f -> 'properties' AS p,
       ST_SetSRID(ST_GeomFromGeoJSON(f ->> 'geometry'), 4326) AS geom
FROM json_array_elements(
       pg_read_file('D:/DevSource/webgis-final-project/working_data/Tempe_Block_Groups.geojson')::json -> 'features'
     ) AS f;

CREATE TABLE homescope.raw_rail_stations AS
SELECT f -> 'properties' AS p,
       ST_SetSRID(ST_GeomFromGeoJSON(f ->> 'geometry'), 4326) AS geom
FROM json_array_elements(
       pg_read_file('D:/DevSource/webgis-final-project/working_data/rail_stations.geojson')::json -> 'features'
     ) AS f;

CREATE TABLE homescope.raw_bus_stops AS
SELECT f -> 'properties' AS p,
       ST_SetSRID(ST_GeomFromGeoJSON(f ->> 'geometry'), 4326) AS geom
FROM json_array_elements(
       pg_read_file('D:/DevSource/webgis-final-project/working_data/bus_stops.geojson')::json -> 'features'
     ) AS f;

CREATE TABLE homescope.raw_schools AS
SELECT f -> 'properties' AS p,
       ST_SetSRID(ST_GeomFromGeoJSON(f ->> 'geometry'), 4326) AS geom
FROM json_array_elements(
       pg_read_file('D:/DevSource/webgis-final-project/working_data/schools.geojson')::json -> 'features'
     ) AS f;

CREATE TABLE homescope.raw_hospitals AS
SELECT f -> 'properties' AS p,
       ST_SetSRID(ST_GeomFromGeoJSON(f ->> 'geometry'), 4326) AS geom
FROM json_array_elements(
       pg_read_file('D:/DevSource/webgis-final-project/working_data/Hospitals.geojson')::json -> 'features'
     ) AS f;

CREATE TABLE homescope.raw_grocery_stores AS
SELECT f -> 'properties' AS p,
       ST_SetSRID(ST_GeomFromGeoJSON(f ->> 'geometry'), 4326) AS geom
FROM json_array_elements(
       pg_read_file('D:/DevSource/webgis-final-project/working_data/grocery_stores.geojson')::json -> 'features'
     ) AS f;

CREATE TABLE homescope.raw_parks AS
SELECT f -> 'properties' AS p,
       ST_SetSRID(ST_GeomFromGeoJSON(f ->> 'geometry'), 4326) AS geom
FROM json_array_elements(
       pg_read_file('D:/DevSource/webgis-final-project/working_data/parks.geojson')::json -> 'features'
     ) AS f;

CREATE TABLE homescope.block_groups AS
SELECT
    p ->> 'GEOID'                                         AS geoid,
    p ->> 'NAME'                                          AS name,
    (p ->> 'TotalPop')::int                               AS total_pop,
    NULLIF((p ->> 'MedianAge')::numeric, -666666666)      AS median_age,
    (p ->> 'TotOwnerRenter')::int                         AS tot_owner_renter,
    (p ->> 'TotHomeOwners')::int                          AS tot_home_owners,
    (p ->> 'PctHomeOwners')::numeric                      AS pct_home_owners,
    (p ->> 'TotHomeRenters')::int                         AS tot_home_renters,
    (p ->> 'PctHomeRenters')::numeric                     AS pct_home_renters,
    NULLIF((p ->> 'MedMonthlyRent')::numeric, -666666666) AS med_monthly_rent,
    NULLIF((p ->> 'MedHomeValue')::numeric, -666666666)   AS med_home_value,
    NULLIF((p ->> 'MedHHIncome')::numeric, -666666666)    AS med_hh_income,
    (p ->> 'Acres')::numeric                              AS acres,
    (p ->> 'PctUnder18')::numeric                         AS pct_under18,
    (p ->> 'Pop18to39')::int                              AS pop_18to39,
    (p ->> 'Pct18to39')::numeric                          AS pct_18to39,
    (p ->> 'Pop40to64')::int                              AS pop_40to64,
    (p ->> 'Pct40to64')::numeric                          AS pct_40to64,
    (p ->> 'Pop65Plus')::int                              AS pop_65plus,
    (p ->> 'Pct65Plus')::numeric                          AS pct_65plus,
    ST_MakeValid(geom)                                    AS geom
FROM homescope.raw_block_groups;

CREATE TABLE homescope.study_area AS
SELECT ST_Union(geom)                                       AS geom,
       ST_Buffer(ST_Union(geom)::geography, 1609.344)::geometry AS geom_1mi
FROM homescope.block_groups;

CREATE TABLE homescope.rail_stations AS
SELECT r.p ->> 'name'    AS name,
       r.p ->> 'city'    AS city,
       r.p ->> 'service' AS service,
       r.geom
FROM homescope.raw_rail_stations r, homescope.study_area s
WHERE ST_Intersects(r.geom, s.geom_1mi);

CREATE TABLE homescope.bus_stops AS
SELECT r.p ->> 'stop_id'   AS stop_id,
       r.p ->> 'stop_name' AS stop_name,
       r.p ->> 'Juris'     AS juris,
       r.p ->> 'Routes'    AS routes,
       r.p ->> 'Shelter'   AS shelter,
       r.geom
FROM homescope.raw_bus_stops r, homescope.study_area s
WHERE r.p ->> 'Status' = 'Active'
  AND ST_Intersects(r.geom, s.geom_1mi);

CREATE TABLE homescope.schools AS
SELECT r.p ->> 'SchoolName'   AS school_name,
       r.p ->> 'GradesServed' AS grades_served,
       r.p ->> 'SchoolClass'  AS school_class,
       r.p ->> 'PAddress'     AS paddress,
       r.p ->> 'PCity'        AS pcity,
       r.p ->> 'Status'       AS status,
       r.p ->> 'EntityType'   AS entity_type,
       r.geom
FROM homescope.raw_schools r, homescope.study_area s
WHERE r.p ->> 'Status' = 'Open'
  AND r.p ->> 'EntityType' = 'School'
  AND ST_Intersects(r.geom, s.geom_1mi);

CREATE TABLE homescope.hospitals AS
SELECT r.p ->> 'FACILITY_NAME' AS facility_name,
       r.p ->> 'SUBTYPE'       AS subtype,
       r.p ->> 'ADDRESS'       AS address,
       r.p ->> 'CITY'          AS city,
       r.p ->> 'Telephone'     AS telephone,
       r.geom
FROM homescope.raw_hospitals r, homescope.study_area s
WHERE ST_Intersects(r.geom, s.geom_1mi);

CREATE TABLE homescope.grocery_stores AS
SELECT r.p ->> 'EmpName'            AS emp_name,
       (r.p ->> 'Employees')::int   AS employees,
       r.p ->> 'Jurisdiction'       AS jurisdiction,
       r.geom
FROM homescope.raw_grocery_stores r, homescope.study_area s
WHERE ST_Intersects(r.geom, s.geom_1mi);

CREATE TABLE homescope.parks AS
SELECT r.p ->> 'ParkName'    AS park_name,
       r.p ->> 'ParkClass'   AS park_class,
       r.p ->> 'ParkAddress' AS park_address,
       r.p ->> 'Days'        AS days,
       r.p ->> 'Hours'       AS hours,
       r.p ->> 'Website'     AS website,
       ST_MakeValid(r.geom)  AS geom
FROM homescope.raw_parks r, homescope.study_area s
WHERE ST_Intersects(r.geom, s.geom_1mi);


CREATE INDEX ON homescope.block_groups   USING GIST (geom);
CREATE INDEX ON homescope.rail_stations  USING GIST (geom);
CREATE INDEX ON homescope.bus_stops      USING GIST (geom);
CREATE INDEX ON homescope.schools        USING GIST (geom);
CREATE INDEX ON homescope.hospitals      USING GIST (geom);
CREATE INDEX ON homescope.grocery_stores USING GIST (geom);
CREATE INDEX ON homescope.parks          USING GIST (geom);

ALTER TABLE homescope.block_groups
    ADD COLUMN near_rail       int,
    ADD COLUMN near_bus        int,
    ADD COLUMN near_transit    int,
    ADD COLUMN near_schools    int,
    ADD COLUMN near_groceries  int,
    ADD COLUMN near_healthcare int,
    ADD COLUMN near_parks      int;

UPDATE homescope.block_groups b SET
    near_rail = (SELECT count(*) FROM homescope.rail_stations x
                 WHERE ST_DWithin(x.geom::geography, ST_Centroid(b.geom)::geography, 1609.344)),
    near_bus = (SELECT count(*) FROM homescope.bus_stops x
                WHERE ST_DWithin(x.geom::geography, ST_Centroid(b.geom)::geography, 1609.344)),
    near_schools = (SELECT count(*) FROM homescope.schools x
                    WHERE ST_DWithin(x.geom::geography, ST_Centroid(b.geom)::geography, 1609.344)),
    near_groceries = (SELECT count(*) FROM homescope.grocery_stores x
                      WHERE ST_DWithin(x.geom::geography, ST_Centroid(b.geom)::geography, 1609.344)),
    near_healthcare = (SELECT count(*) FROM homescope.hospitals x
                       WHERE ST_DWithin(x.geom::geography, ST_Centroid(b.geom)::geography, 1609.344)),
    near_parks = (SELECT count(*) FROM homescope.parks x
                  WHERE ST_DWithin(x.geom::geography, ST_Centroid(b.geom)::geography, 1609.344));

-- Transit = rail stations + bus stops
UPDATE homescope.block_groups
SET near_transit = near_rail + near_bus;

SELECT 'block_groups' AS layer,  (SELECT count(*) FROM homescope.raw_block_groups)   AS before, (SELECT count(*) FROM homescope.block_groups)   AS after
UNION ALL SELECT 'rail_stations',  (SELECT count(*) FROM homescope.raw_rail_stations),  (SELECT count(*) FROM homescope.rail_stations)
UNION ALL SELECT 'bus_stops',      (SELECT count(*) FROM homescope.raw_bus_stops),      (SELECT count(*) FROM homescope.bus_stops)
UNION ALL SELECT 'schools',        (SELECT count(*) FROM homescope.raw_schools),        (SELECT count(*) FROM homescope.schools)
UNION ALL SELECT 'hospitals',      (SELECT count(*) FROM homescope.raw_hospitals),      (SELECT count(*) FROM homescope.hospitals)
UNION ALL SELECT 'grocery_stores', (SELECT count(*) FROM homescope.raw_grocery_stores), (SELECT count(*) FROM homescope.grocery_stores)
UNION ALL SELECT 'parks',          (SELECT count(*) FROM homescope.raw_parks),          (SELECT count(*) FROM homescope.parks);

SELECT geoid, total_pop, med_monthly_rent, med_home_value, med_hh_income
FROM homescope.block_groups
WHERE med_monthly_rent IS NULL OR med_home_value IS NULL OR med_hh_income IS NULL
ORDER BY geoid;

SELECT geoid, near_transit, near_rail, near_bus, near_schools,
       near_groceries, near_healthcare, near_parks
FROM homescope.block_groups
ORDER BY geoid;

-- block groups
SELECT json_build_object(
    'type', 'FeatureCollection',
    'features', json_agg(json_build_object(
        'type', 'Feature',
        'geometry', ST_AsGeoJSON(geom, 6)::json,
        'properties', json_build_object(
            'GEOID', geoid,
            'NAME', name,
            'TotalPop', total_pop,
            'MedianAge', median_age,
            'TotOwnerRenter', tot_owner_renter,
            'TotHomeOwners', tot_home_owners,
            'PctHomeOwners', pct_home_owners,
            'TotHomeRenters', tot_home_renters,
            'PctHomeRenters', pct_home_renters,
            'MedMonthlyRent', med_monthly_rent,
            'MedHomeValue', med_home_value,
            'MedHHIncome', med_hh_income,
            'Acres', acres,
            'PctUnder18', pct_under18,
            'Pop18to39', pop_18to39,
            'Pct18to39', pct_18to39,
            'Pop40to64', pop_40to64,
            'Pct40to64', pct_40to64,
            'Pop65Plus', pop_65plus,
            'Pct65Plus', pct_65plus,
            'NearTransit', near_transit,
            'NearRail', near_rail,
            'NearBus', near_bus,
            'NearSchools', near_schools,
            'NearGroceries', near_groceries,
            'NearHealthcare', near_healthcare,
            'NearParks', near_parks
        )
    ))
)
FROM homescope.block_groups;

-- rail stations
SELECT json_build_object(
    'type', 'FeatureCollection',
    'features', json_agg(json_build_object(
        'type', 'Feature',
        'geometry', ST_AsGeoJSON(geom, 6)::json,
        'properties', json_build_object('name', name, 'city', city, 'service', service)
    ))
)
FROM homescope.rail_stations;

-- bus stops
SELECT json_build_object(
    'type', 'FeatureCollection',
    'features', json_agg(json_build_object(
        'type', 'Feature',
        'geometry', ST_AsGeoJSON(geom, 6)::json,
        'properties', json_build_object('stop_id', stop_id, 'stop_name', stop_name,
                                        'Juris', juris, 'Routes', routes, 'Shelter', shelter)
    ))
)
FROM homescope.bus_stops;

-- schools
SELECT json_build_object(
    'type', 'FeatureCollection',
    'features', json_agg(json_build_object(
        'type', 'Feature',
        'geometry', ST_AsGeoJSON(geom, 6)::json,
        'properties', json_build_object('SchoolName', school_name, 'GradesServed', grades_served,
                                        'SchoolClass', school_class, 'PAddress', paddress,
                                        'PCity', pcity, 'Status', status, 'EntityType', entity_type)
    ))
)
FROM homescope.schools;

-- hospitals
SELECT json_build_object(
    'type', 'FeatureCollection',
    'features', json_agg(json_build_object(
        'type', 'Feature',
        'geometry', ST_AsGeoJSON(geom, 6)::json,
        'properties', json_build_object('FACILITY_NAME', facility_name, 'SUBTYPE', subtype,
                                        'ADDRESS', address, 'CITY', city, 'Telephone', telephone)
    ))
)
FROM homescope.hospitals;

-- grocery_stores
SELECT json_build_object(
    'type', 'FeatureCollection',
    'features', json_agg(json_build_object(
        'type', 'Feature',
        'geometry', ST_AsGeoJSON(geom, 6)::json,
        'properties', json_build_object('EmpName', emp_name, 'Employees', employees,
                                        'Jurisdiction', jurisdiction)
    ))
)
FROM homescope.grocery_stores;

-- parks
SELECT json_build_object(
    'type', 'FeatureCollection',
    'features', json_agg(json_build_object(
        'type', 'Feature',
        'geometry', ST_AsGeoJSON(geom, 6)::json,
        'properties', json_build_object('ParkName', park_name, 'ParkClass', park_class,
                                        'ParkAddress', park_address, 'Days', days,
                                        'Hours', hours, 'Website', website)
    ))
)
FROM homescope.parks;