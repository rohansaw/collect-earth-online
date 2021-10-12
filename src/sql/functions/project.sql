-- NAMESPACE: project
-- REQUIRES: clear

--
--  MODIFY PROJECT FUNCTIONS
--

-- Create a project
CREATE OR REPLACE FUNCTION create_project(
    _institution_id         integer,
    _name                   text,
    _description            text,
    _privacy_level          text,
    _imagery_id             integer,
    _boundary               jsonb,
    _plot_distribution      text,
    _num_plots              integer,
    _plot_spacing           real,
    _plot_shape             text,
    _plot_size              real,
    _plot_file_name         varchar,
    _sample_distribution    text,
    _samples_per_plot       integer,
    _sample_resolution      real,
    _sample_file_name       varchar,
    _allow_drawn_samples    boolean,
    _survey_questions       jsonb,
    _survey_rules           jsonb,
    _token_key              text,
    _options                jsonb,
    _design_settings        jsonb
 ) RETURNS integer AS $$

    INSERT INTO projects (
        institution_rid,
        availability,
        name,
        description,
        privacy_level,
        imagery_rid,
        boundary,
        plot_distribution,
        num_plots,
        plot_spacing,
        plot_shape,
        plot_size,
        plot_file_name,
        sample_distribution,
        samples_per_plot,
        sample_resolution,
        sample_file_name,
        allow_drawn_samples,
        survey_questions,
        survey_rules,
        created_date,
        token_key,
        options,
        design_settings
    ) VALUES (
        _institution_id,
        'unpublished',
        _name,
        _description,
        _privacy_level,
        _imagery_id,
        ST_SetSRID(ST_GeomFromGeoJSON(_boundary), 4326),
        _plot_distribution,
        _num_plots,
        _plot_spacing,
        _plot_shape,
        _plot_size,
        _plot_file_name,
        _sample_distribution,
        _samples_per_plot,
        _sample_resolution,
        _sample_file_name,
        _allow_drawn_samples,
        _survey_questions,
        _survey_rules,
        now(),
        _token_key,
        _options,
        _design_settings
    )
    RETURNING project_uid

$$ LANGUAGE SQL;

-- Publish project
CREATE OR REPLACE FUNCTION publish_project(_project_id integer)
 RETURNS integer AS $$

    UPDATE projects
    SET availability = 'published',
        published_date = Now()
    WHERE project_uid = _project_id
    RETURNING _project_id

$$ LANGUAGE SQL;

-- Close project
CREATE OR REPLACE FUNCTION close_project(_project_id integer)
 RETURNS integer AS $$

    UPDATE projects
    SET availability = 'closed',
        closed_date = Now()
    WHERE project_uid = _project_id
    RETURNING _project_id

$$ LANGUAGE SQL;

-- Archive project
CREATE OR REPLACE FUNCTION archive_project(_project_id integer)
 RETURNS integer AS $$

    UPDATE projects
    SET availability = 'archived',
        archived_date = Now()
    WHERE project_uid = _project_id
    RETURNING _project_id

$$ LANGUAGE SQL;

-- Delete project items and external files, leave entry for reference
CREATE OR REPLACE FUNCTION deep_archive_project(_project_id integer)
 RETURNS void AS $$

 BEGIN
    DELETE FROM plots WHERE project_rid = _project_id;
    DELETE FROM project_widgets WHERE project_rid = _project_id;
    DELETE FROM project_imagery WHERE project_rid = _project_id;
 END

$$ LANGUAGE PLPGSQL;

-- Delete project and external files
CREATE OR REPLACE FUNCTION delete_project(_project_id integer)
 RETURNS void AS $$

 BEGIN
    -- Delete plots first for performance
    DELETE FROM plots WHERE project_rid = _project_id;
    DELETE FROM projects WHERE project_uid = _project_id;

 END

$$ LANGUAGE PLPGSQL;

-- Update select set of project fields
CREATE OR REPLACE FUNCTION update_project(
    _project_id             integer,
    _name                   text,
    _description            text,
    _privacy_level          text,
    _imagery_id             integer,
    _boundary               jsonb,
    _plot_distribution      text,
    _num_plots              integer,
    _plot_spacing           real,
    _plot_shape             text,
    _plot_size              real,
    _plot_file_name         varchar,
    _sample_distribution    text,
    _samples_per_plot       integer,
    _sample_resolution      real,
    _sample_file_name       varchar,
    _allow_drawn_samples    boolean,
    _survey_questions       jsonb,
    _survey_rules           jsonb,
    _options                jsonb,
    _design_settings        jsonb
 ) RETURNS void AS $$

    UPDATE projects
    SET name = _name,
        description = _description,
        privacy_level = _privacy_level,
        imagery_rid = _imagery_id,
        boundary = ST_SetSRID(ST_GeomFromGeoJSON(_boundary), 4326),
        plot_distribution = _plot_distribution,
        num_plots = _num_plots,
        plot_spacing = _plot_spacing,
        plot_shape = _plot_shape,
        plot_size = _plot_size,
        plot_file_name = _plot_file_name,
        sample_distribution = _sample_distribution,
        samples_per_plot = _samples_per_plot,
        sample_resolution = _sample_resolution,
        sample_file_name = _sample_file_name,
        allow_drawn_samples = _allow_drawn_samples,
        survey_questions = _survey_questions,
        survey_rules = _survey_rules,
        options = _options,
        design_settings = _design_settings
    WHERE project_uid = _project_id

$$ LANGUAGE SQL;

-- Update counts after plots are created
CREATE OR REPLACE FUNCTION update_project_counts(_project_id integer)
 RETURNS void AS $$

    WITH project_plots AS (
        SELECT project_uid, plot_uid, sample_uid
        FROM projects p
        INNER JOIN plots pl
            ON pl.project_rid = project_uid
        INNER JOIN samples s
            ON plot_uid = s.plot_rid
        WHERE project_uid = _project_id
    )

    UPDATE projects
    SET num_plots = plots,
        samples_per_plot = samples
    FROM (
        SELECT COUNT(DISTINCT plot_uid) AS plots,
            (CASE WHEN COUNT(DISTINCT plot_uid) = 0 THEN
                0
            ELSE
                COUNT(sample_uid) / COUNT(DISTINCT plot_uid)
            END) AS samples
        FROM project_plots
    ) a
    WHERE project_uid = _project_id

$$ LANGUAGE SQL;

-- Calculates boundary from for csv / shp data
CREATE OR REPLACE FUNCTION set_boundary(_project_id integer, _m_buffer real)
 RETURNS void AS $$

    UPDATE projects SET boundary = b
    FROM (
        SELECT ST_Envelope(ST_Buffer(ST_SetSRID(ST_Extent(plot_geom) , 4326)::geography , _m_buffer)::geometry) AS b
        FROM plots
        WHERE project_rid = _project_id
    ) bb
    WHERE project_uid = _project_id

$$ LANGUAGE SQL;

-- Copy plot data and sample data
CREATE OR REPLACE FUNCTION copy_project_plots_samples(_old_project_id integer, _new_project_id integer)
 RETURNS integer AS $$

    WITH project_plots AS (
        SELECT plot_geom,
            visible_id,
            extra_plot_info,
            plot_uid AS plid_old,
            row_number() OVER(order by plot_uid) AS rowid
        FROM projects p
        INNER JOIN plots pl
            ON project_rid = project_uid
            AND project_rid = _old_project_id
    ), inserting AS (
        INSERT INTO plots
            (project_rid, plot_geom, visible_id, extra_plot_info)
        SELECT _new_project_id, plot_geom, visible_id, extra_plot_info
        FROM project_plots
        RETURNING plot_uid AS plid
    ), new_ordered AS (
        SELECT plid, row_number() OVER(order by plid) AS rowid FROM inserting
    ), combined AS (
        SELECT * from new_ordered inner join project_plots USING (rowid)
    ), inserting_samples AS (
        INSERT INTO samples
            (plot_rid, sample_geom, visible_id, extra_sample_info)
        SELECT plid, sample_geom, visible_id, extra_sample_info
        FROM (
            SELECT plid, sample_geom, s.visible_id, extra_sample_info
            FROM combined c
            INNER JOIN samples s
                ON c.plid_old = s.plot_rid
        ) B
        RETURNING sample_uid
    )

    SELECT COUNT(1)::int FROM inserting_samples

$$ LANGUAGE SQL;

-- Copy other project fields that may not have been correctly passed from UI
CREATE OR REPLACE FUNCTION copy_project_plots_stats(_old_project_id integer, _new_project_id integer)
 RETURNS void AS $$

    UPDATE projects
    SET boundary = n.boundary,
        imagery_rid = n.imagery_rid,
        plot_distribution = n.plot_distribution,
        num_plots = n.num_plots,
        plot_spacing = n.plot_spacing,
        plot_shape = n.plot_shape,
        plot_size = n.plot_size,
        plot_file_name = n.plot_file_name,
        sample_distribution = n.sample_distribution,
        samples_per_plot = n.samples_per_plot,
        sample_resolution = n.sample_resolution,
        sample_file_name = n.sample_file_name
    FROM (SELECT
            boundary,
            imagery_rid,
            plot_distribution,
            num_plots,
            plot_spacing,
            plot_shape,
            plot_size,
            plot_file_name,
            sample_distribution,
            samples_per_plot,
            sample_resolution,
            sample_file_name
         FROM projects
         WHERE project_uid = _old_project_id) n
    WHERE
        project_uid = _new_project_id

$$ LANGUAGE SQL;

-- Combines individual functions needed to copy all plot and sample information
CREATE OR REPLACE FUNCTION copy_template_plots(_old_project_id integer, _new_project_id integer)
 RETURNS void AS $$

    SELECT * FROM copy_project_plots_samples(_old_project_id, _new_project_id);
    SELECT * FROM copy_project_plots_stats(_old_project_id, _new_project_id);

$$ LANGUAGE SQL;

-- Copy samples from external file backup
CREATE OR REPLACE FUNCTION copy_project_ext_samples(_project_id integer)
 RETURNS void AS $$

    INSERT INTO samples
        (plot_rid, sample_geom, visible_id, extra_sample_info)
    SELECT plot_rid, sample_geom, visible_id, extra_sample_info
    FROM (
        SELECT plot_rid, sample_geom, es.visible_id, extra_sample_info
        FROM ext_samples es
        INNER JOIN plots
            ON plot_uid = plot_rid
        WHERE project_rid = _project_id
    ) B

$$ LANGUAGE SQL;

-- VALIDATIONS

-- Check if a project was created where plots have no samples
-- This only checks plots with external data. It assumes that auto generated samples generate correctly
CREATE OR REPLACE FUNCTION plots_missing_samples(_project_id integer)
 RETURNS table (visible_id integer) AS $$

    SELECT pl.visible_id
    FROM projects p
    INNER JOIN plots pl
        ON pl.project_rid = project_uid
    LEFT JOIN samples s
        ON plot_uid = s.plot_rid
    WHERE project_uid = _project_id
        AND sample_uid IS NULL

$$ LANGUAGE SQL;

--
-- USING PROJECT FUNCTIONS
--

CREATE OR REPLACE FUNCTION valid_boundary(_boundary geometry)
 RETURNS boolean AS $$

    SELECT EXISTS(
        SELECT 1
        WHERE _boundary IS NOT NULL
            AND ST_Contains(ST_MakeEnvelope(-180, -90, 180, 90, 4326), _boundary)
            AND ST_XMax(_boundary) > ST_XMin(_boundary)
            AND ST_YMax(_boundary) > ST_YMin(_boundary)
    )

$$ LANGUAGE SQL;

CREATE OR REPLACE FUNCTION valid_project_boundary(_project_id integer)
 RETURNS boolean AS $$

    SELECT * FROM valid_boundary((SELECT boundary FROM projects WHERE project_uid = _project_id))

$$ LANGUAGE SQL;

-- Returns a row in projects by id
CREATE OR REPLACE FUNCTION select_project_by_id(_project_id integer)
 RETURNS table (
    project_id             integer,
    institution_id         integer,
    imagery_id             integer,
    availability           text,
    name                   text,
    description            text,
    privacy_level          text,
    boundary               text,
    plot_distribution      text,
    num_plots              integer,
    plot_spacing           real,
    plot_shape             text,
    plot_size              real,
    plot_file_name         varchar,
    sample_distribution    text,
    samples_per_plot       integer,
    sample_resolution      real,
    sample_file_name       varchar,
    allow_drawn_samples    boolean,
    survey_questions       jsonb,
    survey_rules           jsonb,
    options                jsonb,
    design_settings        jsonb,
    created_date           date,
    published_date         date,
    closed_date            date,
    has_geo_dash           boolean,
    token_key              text
 ) AS $$

    SELECT project_uid,
        institution_rid,
        imagery_rid,
        availability,
        name,
        description,
        privacy_level,
        ST_AsGeoJSON(boundary),
        plot_distribution,
        num_plots,
        plot_spacing,
        plot_shape,
        plot_size,
        plot_file_name,
        sample_distribution,
        samples_per_plot,
        sample_resolution,
        sample_file_name,
        allow_drawn_samples,
        survey_questions,
        survey_rules,
        options,
        design_settings,
        created_date,
        published_date,
        closed_date,
        count(widget_uid) > 1,
        token_key
    FROM projects
    LEFT JOIN project_widgets
        ON project_rid = project_uid
    WHERE project_uid = _project_id
        AND availability <> 'archived'
    GROUP BY project_uid

$$ LANGUAGE SQL;

CREATE OR REPLACE FUNCTION user_project(_user_id integer, _role_id integer, _privacy_level text, _availability text)
 RETURNS boolean AS $$

    SELECT (_role_id = 1 AND _availability <> 'archived')
            OR (_availability = 'published'
                AND (_privacy_level = 'public'
                    OR (_user_id > 0 AND _privacy_level = 'users')
                    OR (_role_id = 2 AND _privacy_level = 'institution')))

$$ LANGUAGE SQL STABLE;

-- Returns all projects the user can see. This is used only on the home page
CREATE OR REPLACE FUNCTION select_user_home_projects(_user_id integer)
 RETURNS table (
    project_id        integer,
    institution_id    integer,
    name              text,
    description       text,
    centroid          text,
    num_plots         integer,
    editable          boolean
 ) AS $$

    SELECT project_uid,
        p.institution_rid,
        name,
        description,
        ST_AsGeoJSON(ST_Centroid(boundary)),
        num_plots,
        (CASE WHEN role_rid IS NULL THEN FALSE ELSE role_rid = 1 END) AS editable
    FROM projects AS p
    LEFT JOIN institution_users iu
        ON user_rid = _user_id
        AND p.institution_rid = iu.institution_rid
    WHERE user_project(_user_id, role_rid, p.privacy_level, p.availability)
        AND valid_boundary(boundary) = TRUE
    ORDER BY project_uid

$$ LANGUAGE SQL;

-- Returns percent of plots collected.
CREATE OR REPLACE FUNCTION project_percent_complete(_project_id integer)
 RETURNS real AS $$

    SELECT (
        CASE WHEN count(plot_uid) > 0
        THEN (100.0 * count(user_plot_uid) / count(plot_uid)::real)
        ELSE 0
        END
    )::real
    FROM plots
    LEFT JOIN user_plots up
        ON plot_uid = up.plot_rid
    LEFT JOIN plot_assignments pa
        ON plot_uid = pa.plot_rid
        AND up.user_rid = pa.user_rid
    WHERE project_rid = _project_id

$$ LANGUAGE SQL;

-- Returns all rows in projects for a user_id and institution_rid with roles
CREATE OR REPLACE FUNCTION select_institution_projects(_user_id integer, _institution_id integer)
 RETURNS table (
    project_id       integer,
    name             text,
    num_plots        integer,
    privacy_level    text,
    pct_complete     real
 ) AS $$

    SELECT project_uid,
        name,
        num_plots,
        privacy_level,
        (SELECT project_percent_complete(project_uid))
    FROM projects AS p
    LEFT JOIN institution_users iu
        ON user_rid = _user_id
        AND p.institution_rid = iu.institution_rid
    WHERE p.institution_rid = _institution_id
        AND user_project(_user_id, role_rid, p.privacy_level, p.availability)
    ORDER BY project_uid

$$ LANGUAGE SQL;

-- Returns stats needed to display on the institution dashboard
CREATE OR REPLACE FUNCTION select_institution_project_stats(_project_id integer)
 RETURNS table (
    total_plots         integer,
    flagged_plots       integer,
    analyzed_plots      integer,
    partial_plots       integer,
    unanalyzed_plots    integer,
    plot_assignments    integer,
    contributors        integer,
    users_assigned      integer
 ) AS $$

    WITH users_count AS (
        SELECT count(DISTINCT up.user_rid)::int AS contributors,
            count(DISTINCT pa.user_rid)::int AS users_assigned
        FROM plots pl
        LEFT JOIN user_plots up
            ON up.plot_rid = plot_uid
        LEFT JOIN plot_assignments pa
            ON pa.plot_rid = plot_uid
        WHERE project_rid = _project_id
    ), plot_sum AS (
        SELECT plot_uid,
            coalesce(sum(flagged::int), 0) > 0 AS flagged,
            coalesce(count(user_plot_uid), 0) AS analyzed,
            coalesce(count(pa.user_rid), 0) AS assigned,
            greatest(coalesce(count(pa.user_rid), 0), 1) AS needed
        FROM users_count, plots pl
        LEFT JOIN plot_assignments AS pa
            ON pa.plot_rid = pl.plot_uid
        LEFT JOIN user_plots up
            ON up.plot_rid = pl.plot_uid
            AND (pa.user_rid = up.user_rid OR (SELECT users_assigned FROM users_count) = 0)
        GROUP BY project_rid, plot_uid
        HAVING project_rid = _project_id
    ), project_sum AS (
        SELECT count(*)::int AS total_plots,
            sum(ps.flagged::int)::int AS flagged_plots,
            sum((needed = analyzed)::int)::int AS analyzed_plots,
            sum((needed > analyzed and analyzed > 0)::int)::int AS partial_plots,
            sum((analyzed = 0)::int)::int AS unanalyzed_plots,
            sum(assigned)::int AS plot_assignments
        FROM plot_sum ps
    )

    SELECT total_plots,
        flagged_plots,
        analyzed_plots,
        partial_plots,
        unanalyzed_plots,
        plot_assignments,
        contributors,
        users_assigned
    FROM users_count, project_sum

$$ LANGUAGE SQL;

CREATE OR REPLACE FUNCTION select_institution_dash_projects(_user_id integer, _institution_id integer)
 RETURNS table (
    project_id    integer,
    name          text,
    stats         jsonb
 ) AS $$

    SELECT project_uid,
        name,
        row_to_json((SELECT select_institution_project_stats(project_uid)))::jsonb
    FROM projects AS p
    LEFT JOIN institution_users iu
        ON user_rid = _user_id
        AND p.institution_rid = iu.institution_rid
    WHERE p.institution_rid = _institution_id
        AND user_project(_user_id, role_rid, p.privacy_level, p.availability)
    ORDER BY project_uid

$$ LANGUAGE SQL;

CREATE OR REPLACE FUNCTION select_template_projects(_user_id integer)
 RETURNS table (
     project_id    integer,
     name          text
 ) AS $$

    SELECT project_uid, name
    FROM projects AS p
    LEFT JOIN institution_users iu
        ON user_rid = _user_id
        AND p.institution_rid = iu.institution_rid
    WHERE (role_rid = 1 AND p.availability <> 'archived')
        OR (role_rid = 2
            AND p.privacy_level IN ('public', 'institution', 'users')
            AND p.availability = 'published')
        OR (_user_id > 0
            AND p.privacy_level IN ('public', 'users')
            AND p.availability = 'published')
        OR (p.privacy_level IN ('public')
            AND p.availability = 'published')
    ORDER BY project_uid

$$ LANGUAGE SQL;

-- Returns project statistics for project dashboard
CREATE OR REPLACE FUNCTION select_project_statistics(_project_id integer)
 RETURNS table (
    total_plots         integer,
    flagged_plots       integer,
    analyzed_plots      integer,
    partial_plots       integer,
    unanalyzed_plots    integer,
    plot_assignments    integer,
    users_assigned      integer,
    created_date        date,
    published_date      date,
    closed_date         date,
    user_stats          jsonb
 ) AS $$

    WITH user_plot_times AS (
        SELECT plot_uid,
            (CASE WHEN collection_time IS NULL OR collection_start IS NULL THEN 0
                ELSE EXTRACT(EPOCH FROM (collection_time - collection_start)) END) AS seconds,
            (CASE WHEN collection_time IS NULL OR collection_start IS NULL THEN 0 ELSE 1 END) AS timed,
            u.email AS email
        FROM plots pl
        INNER JOIN user_plots up
            ON up.plot_rid = plot_uid
        INNER JOIN users u
            ON up.user_rid = user_uid
        WHERE project_rid = _project_id
    ), users_grouped AS (
        SELECT email,
            SUM(seconds)::int AS seconds,
            COUNT(plot_uid) AS plots,
            SUM(timed):: int AS timed_plots
        FROM user_plot_times
        GROUP BY email
        ORDER BY email DESC
    ), user_agg AS (
        SELECT format('[%s]', string_agg(row_to_json(ug)::text, ','))::jsonb AS user_stats
        FROM users_grouped ug
    ), users_count AS (
        SELECT count(DISTINCT pa.user_rid)::int AS users_assigned
        FROM plots pl
        LEFT JOIN plot_assignments pa
            ON pa.plot_rid = plot_uid
        WHERE project_rid = _project_id
    ), plot_sum AS (
        SELECT plot_uid,
            coalesce(sum(flagged::int), 0) > 0 AS flagged,
            coalesce(count(user_plot_uid), 0) AS analyzed,
            coalesce(count(pa.user_rid), 0) AS assigned,
            greatest(coalesce(count(pa.user_rid), 0), 1) AS needed
        FROM users_count, plots pl
        LEFT JOIN plot_assignments AS pa
            ON pa.plot_rid = pl.plot_uid
        LEFT JOIN user_plots up
            ON up.plot_rid = pl.plot_uid
            AND (pa.user_rid = up.user_rid OR (SELECT users_assigned FROM users_count) = 0)
        GROUP BY plot_uid
        HAVING project_rid = _project_id
    ), project_sum AS (
        SELECT count(*)::int AS total_plots,
            sum(ps.flagged::int)::int AS flagged_plots,
            sum((needed = analyzed)::int)::int AS analyzed_plots,
            sum((needed > analyzed and analyzed > 0)::int)::int AS partial_plots,
            sum((analyzed = 0)::int)::int AS unanalyzed_plots,
            sum(assigned)::int AS plot_assignments
        FROM plot_sum ps
    )

    SELECT total_plots,
        flagged_plots,
        analyzed_plots,
        partial_plots,
        unanalyzed_plots,
        plot_assignments,
        users_assigned,
        created_date,
        published_date,
        closed_date,
        user_stats
    FROM projects, project_sum, users_count, user_agg
    WHERE project_uid = _project_id

$$ LANGUAGE SQL;

-- Returns project user statistics for collection page
CREATE OR REPLACE FUNCTION select_project_user_stats(_project_id integer, _user_id integer)
 RETURNS table (
    total_plots       integer,
    flagged_plots     integer,
    analyzed_plots    integer,
    user_assigned     integer,
    user_stats        jsonb
 ) AS $$

    WITH user_plot_times AS (
        SELECT plot_uid,
            (CASE WHEN collection_time IS NULL OR collection_start IS NULL THEN 0
                ELSE EXTRACT(EPOCH FROM (collection_time - collection_start)) END) AS seconds,
            (CASE WHEN collection_time IS NULL OR collection_start IS NULL THEN 0 ELSE 1 END) AS timed,
            u.email AS email
        FROM plots pl
        INNER JOIN user_plots up
            ON up.plot_rid = plot_uid
        INNER JOIN users u
            ON up.user_rid = user_uid
        WHERE project_rid = _project_id
            AND user_rid = _user_id
    ), user_stats AS (
        SELECT jsonb_build_object(
            'seconds', SUM(seconds)::int,
            'plots', COUNT(plot_uid),
            'timed_plots', SUM(timed):: int
        ) as user_stats
        FROM user_plot_times
    ), user_count AS (
        SELECT count(pa.user_rid)::int AS user_assigned
        FROM plots pl
        LEFT JOIN plot_assignments pa
            ON pa.plot_rid = plot_uid
        WHERE project_rid = _project_id
            AND pa.user_rid = _user_id
    ), plot_sum AS (
        SELECT plot_uid,
            coalesce(flagged, false) as flagged,
            user_plot_uid IS NOT NULL AS analyzed
        FROM plots pl
        LEFT JOIN plot_assignments AS pa
            ON pa.plot_rid = pl.plot_uid
            AND pa.user_rid = _user_id
        LEFT JOIN user_plots up
            ON up.plot_rid = pl.plot_uid
            AND up.user_rid = _user_id
        WHERE project_rid = _project_id
    ), project_sum AS (
        SELECT count(*)::int as total_plots,
            sum(flagged::int)::int AS flagged_plots,
            sum(analyzed::int)::int AS analyzed_plots
        FROM plot_sum
    )

    SELECT total_plots,
        flagged_plots,
        analyzed_plots,
        user_assigned,
        user_stats
    FROM project_sum, user_stats, user_count

$$ LANGUAGE SQL;

--
--  AGGREGATE FUNCTIONS
--

-- Returns project aggregate data
CREATE OR REPLACE FUNCTION dump_project_plot_data(_project_id integer)
 RETURNS table (
    plot_id                    integer,
    center_lon                 double precision,
    center_lat                 double precision,
    size_m                     text,
    shape                      real,
    email                      text,
    flagged                    boolean,
    flagged_reason             text,
    confidence                 integer,
    collection_time            timestamp,
    analysis_duration          numeric,
    samples                    text,
    common_securewatch_date    text,
    total_securewatch_dates    integer,
    extra_plot_info            jsonb
 ) AS $$

    SELECT plot_uid,
        ST_X(ST_Centroid(plot_geom)) AS lon,
        ST_Y(ST_Centroid(plot_geom)) AS lat,
        plot_shape,
        plot_size,
        email,
        flagged,
        flagged_reason,
        confidence,
        collection_time,
        ROUND(EXTRACT(EPOCH FROM (collection_time - collection_start))::numeric, 1) AS analysis_duration,
        FORMAT('[%s]', STRING_AGG(
            (CASE WHEN saved_answers IS NULL THEN
                FORMAT('{"%s":"%s"}', 'id', sample_uid)
            ELSE
                FORMAT('{"%s":"%s", "%s":%s}', 'id', sample_uid, 'saved_answers', saved_answers)
            END),', '
        )) AS samples,
        MODE() WITHIN GROUP (ORDER BY imagery_attributes->>'imagerySecureWatchDate') AS common_securewatch_date,
        COUNT(DISTINCT(imagery_attributes->>'imagerySecureWatchDate'))::int AS total_securewatch_dates,
        extra_plot_info
    FROM projects p
    INNER JOIN plots pl
        ON project_uid = pl.project_rid
    INNER JOIN samples s
        ON s.plot_rid = pl.plot_uid
    LEFT JOIN user_plots up
        ON up.plot_rid = pl.plot_uid
    LEFT JOIN sample_values sv
        ON sv.sample_rid = s.sample_uid
        AND user_plot_uid = sv.user_plot_rid
    LEFT JOIN users u
        ON u.user_uid = up.user_rid
    WHERE project_rid = _project_id
    GROUP BY project_uid, plot_uid, user_plot_uid, email, extra_plot_info
    ORDER BY plot_uid

$$ LANGUAGE SQL;

-- Returns project aggregate QA/QC data
CREATE OR REPLACE FUNCTION dump_project_plot_qaqc_data(_project_id integer)
 RETURNS table (
    plot_id                    integer,
    center_lon                 double precision,
    center_lat                 double precision,
    shape                      text,
    size_m                     real,
    email                      text,
    flagged                    boolean,
    flagged_reason             text,
    confidence                 integer,
    collection_time            timestamp,
    analysis_duration          numeric,
    samples                    text,
    common_securewatch_date    text,
    total_securewatch_dates    integer,
    extra_plot_info            jsonb
 ) AS $$

    WITH assigned_count AS (
        SELECT pa.plot_rid AS plot_rid, count(pa.user_rid) users
        FROM plots, plot_assignments pa
        WHERE project_rid = _project_id
            AND plot_uid = pa.plot_rid
        GROUP BY pa.plot_rid
    )

    SELECT plot_uid,
        ST_X(ST_Centroid(plot_geom)) AS lon,
        ST_Y(ST_Centroid(plot_geom)) AS lat,
        plot_shape,
        plot_size,
        email,
        flagged,
        flagged_reason,
        confidence,
        collection_time,
        ROUND(EXTRACT(EPOCH FROM (collection_time - collection_start))::numeric, 1) AS analysis_duration,
        FORMAT('[%s]', STRING_AGG(
            (CASE WHEN saved_answers IS NULL THEN
                FORMAT('{"%s":"%s"}', 'id', sample_uid)
            ELSE
                FORMAT('{"%s":"%s", "%s":%s}', 'id', sample_uid, 'saved_answers', saved_answers)
            END),', '
        )) AS samples,
        MODE() WITHIN GROUP (ORDER BY imagery_attributes->>'imagerySecureWatchDate') AS common_securewatch_date,
        COUNT(DISTINCT(imagery_attributes->>'imagerySecureWatchDate'))::int AS total_securewatch_dates,
        extra_plot_info
    FROM projects p
    INNER JOIN plots pl
        ON project_uid = pl.project_rid
    INNER JOIN assigned_count ac
        ON pl.plot_uid = ac.plot_rid
    INNER JOIN samples s
        ON s.plot_rid = pl.plot_uid
    LEFT JOIN user_plots up
        ON up.plot_rid = pl.plot_uid
    LEFT JOIN sample_values sv
        ON sv.sample_rid = s.sample_uid
        AND user_plot_uid = sv.user_plot_rid
    LEFT JOIN users u
        ON u.user_uid = up.user_rid
    WHERE project_rid = _project_id
        AND ac.users > 1
    GROUP BY project_uid, plot_uid, user_plot_uid, email, extra_plot_info
    ORDER BY plot_uid

$$ LANGUAGE SQL;

-- Returns project raw data
CREATE OR REPLACE FUNCTION dump_project_sample_data(_project_id integer)
 RETURNS table (
        plot_id               integer,
        sample_id             integer,
        lon                   double precision,
        lat                   double precision,
        email                 text,
        flagged               boolean,
        collection_time       timestamp,
        analysis_duration     numeric,
        imagery_title         text,
        imagery_attributes    text,
        sample_geom           text,
        saved_answers         jsonb,
        extra_plot_info       jsonb,
        extra_sample_info     jsonb
 ) AS $$

    SELECT plot_uid,
        sample_uid,
        ST_X(ST_Centroid(sample_geom)) AS lon,
        ST_Y(ST_Centroid(sample_geom)) AS lat,
        email,
        flagged,
        collection_time,
        ROUND(EXTRACT(EPOCH FROM (collection_time - collection_start))::numeric, 1) AS analysis_duration,
        title AS imagery_title,
        imagery_attributes::text,
        ST_AsText(sample_geom),
        saved_answers,
        extra_plot_info,
        extra_sample_info
    FROM plots pl
    INNER JOIN samples s
        ON s.plot_rid = pl.plot_uid
    LEFT JOIN user_plots up
        ON up.plot_rid = pl.plot_uid
    LEFT JOIN sample_values sv
        ON sample_uid = sv.sample_rid
        AND user_plot_uid = sv.user_plot_rid
    LEFT JOIN imagery
        ON imagery_uid = sv.imagery_rid
    LEFT JOIN users u
        ON u.user_uid = up.user_rid
    WHERE pl.project_rid = _project_id
    ORDER BY plot_uid, sample_uid

$$ LANGUAGE SQL;
