-- Drop archived projects with odd widgets
SELECT delete_project(project_uid) FROM projects WHERE project_uid IN (4998);

-- Update Stats widgets
UPDATE project_widgets
SET widget = jsonb_build_object(
    'type', 'statistics',
    'name', widget->'name',
    'layout', widget->'layout'
)
WHERE widget->'properties'->>0 = 'getStats';

-- Update Elevation widgets
UPDATE project_widgets
SET widget = jsonb_build_object(
    'type', 'imageElevation',
    'name', widget->'name',
    'layout', widget->'layout',
    'basemapId', widget->'basemapId',
    'eeType', 'Image',
    'assetName', widget->>'ImageAsset',
    'visParams', widget->'visParams'
)
WHERE widget->>'ImageAsset' is not null
    AND widget->>'ImageAsset' = 'USGS/SRTMGL1_003';

-- Update Image Asset widgets
UPDATE project_widgets
SET widget = jsonb_build_object(
    'type', 'imageAsset',
    'name', widget->'name',
    'layout', widget->'layout',
    'basemapId', widget->'basemapId',
    'eeType', 'Image',
    'assetName', widget->>'ImageAsset',
    'visParams', widget->'visParams'
)
WHERE widget->>'ImageAsset' is not null
    AND widget->>'ImageAsset' <> 'USGS/SRTMGL1_003';

-- Update Degradation widgets
UPDATE project_widgets
SET widget = jsonb_build_object(
    'type', 'degradationTool',
    'name', widget->'name',
    'layout', widget->'layout',
    'basemapId', widget->'basemapId',
    'graphBand', widget->'graphBand',
    'startDate', widget->'startDate',
    'endDate', widget->'endDate'
)
WHERE widget->'properties'->>0 = 'DegradationTool';

-- Update Polygon widgets
UPDATE project_widgets
SET widget = jsonb_build_object(
    'type', 'polygonCompare',
    'name', widget->'name',
    'layout', widget->'layout',
    'basemapId', widget->'basemapId',
    'assetName', widget->>'featureCollection',
    'field', widget->'field',
    'visParams', widget->'visParams'
)
WHERE widget->'properties'->>0 = 'featureCollection';

-- Update Time Series widgets
UPDATE project_widgets
SET widget = jsonb_build_object(
    'type', 'timeSeries',
    'name', widget->'name',
    'layout', widget->'layout',
    'indexName', widget->'properties'->4,
    'assetName', widget->'properties'->1,
    'graphBand', widget->'graphBand',
    'graphReducer', widget->'graphReducer',
    'startTime', TRIM(widget->'properties'->>2),
    'endTime', TRIM(widget->'properties'->>3)
)
WHERE widget->'properties'->>0 ilike '%timeseries%';

-- Clean up missing basemapId
-- FIXME, set to OSM
UPDATE project_widgets
SET widget = widget - 'basemapId'
WHERE widget->>'basemapId' IS NULL;

-- Change name -> title to match
UPDATE project_widgets
SET widget = jsonb_set(widget, '{"title"}', widget->'name') - 'name';
