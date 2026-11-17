-- schema_smoke.sqlの同一トランザクションから呼び出す。
DO $$
DECLARE
    a JSONB := current_setting('test.company_a')::jsonb;
    b JSONB := current_setting('test.company_b')::jsonb;
    t TEXT;
    c RECORD;
BEGIN
    IF (SELECT count(*) FROM information_schema.columns WHERE table_schema = 'public') <> 215
       OR (SELECT count(*) FROM pg_constraint WHERE connamespace = 'public'::regnamespace AND contype = 'f') <> 66
       OR (SELECT count(*) FROM pg_constraint WHERE connamespace = 'public'::regnamespace AND contype = 'f' AND cardinality(conkey) = 2) <> 41
       OR (SELECT count(*) FROM pg_class WHERE relnamespace = 'public'::regnamespace AND relkind = 'r' AND relrowsecurity AND relforcerowsecurity) <> 26 THEN
        RAISE EXCEPTION 'Schema/foreign key/RLS counts differ from the design';
    END IF;
    -- 他社なら同じ募集コード・雛形版番号を使える。
    UPDATE openings SET code = (SELECT code FROM openings WHERE id = (a->>'openings')::bigint)
        WHERE id = (b->>'openings')::bigint;
    PERFORM pg_temp.expect_error(format(
        'INSERT INTO openings (company_id, code, job_title, hire_type, contact_info, recruitment_year)
         SELECT company_id, code, job_title, hire_type, contact_info, recruitment_year FROM openings WHERE id = %s', a->>'openings'), '23505');
    PERFORM pg_temp.expect_error(format(
        'INSERT INTO mail_templates (company_id, hire_type, version_no, subject, body, saved_by, saved_at)
         SELECT company_id, hire_type, version_no, subject, body, saved_by, saved_at FROM mail_templates WHERE id = %s', a->>'mail_templates'), '23505');
    -- 企業を分けても全体一意を維持する8項目。
    FOR c IN SELECT * FROM (VALUES ('companies','code'), ('staff','email'), ('surveys','public_code'),
        ('applications','receipt_no'), ('applications','access_hash'), ('responses','entry_key'),
        ('responses','request_key'), ('submissions','request_key')) AS x(tbl,col)
    LOOP
        PERFORM pg_temp.expect_error(format('UPDATE %I SET %I = (SELECT %I FROM %I WHERE id = %s) WHERE id = %s',
            c.tbl, c.col, c.col, c.tbl, a->>c.tbl, b->>c.tbl), '23505');
    END LOOP;
    PERFORM pg_temp.expect_error('INSERT INTO surveys (company_id) VALUES (NULL)', '23502');
    PERFORM pg_temp.expect_error('INSERT INTO surveys (company_id) VALUES (-1)', '23503');
    PERFORM pg_temp.expect_error(format('DELETE FROM companies WHERE id = %s', a->>'companies'), '23503');
    FOR t IN SELECT table_name::text FROM information_schema.columns WHERE table_schema = 'public' AND column_name = 'company_id'
    LOOP
        PERFORM pg_temp.expect_error(format('UPDATE %I SET company_id = %s WHERE id = %s', t, b->>'companies', a->>t), '23514');
    END LOOP;
    RAISE NOTICE 'PASS: tenant/global unique keys, company FK, 25 immutable company IDs';
END;
$$;

SET LOCAL ROLE salt_app;
DO $$
DECLARE
    a JSONB := current_setting('test.company_a')::jsonb;
    b JSONB := current_setting('test.company_b')::jsonb;
    t TEXT;
    n BIGINT;
    c RECORD;
    fk_checks INT := 0;
    target_row BIGINT;
BEGIN
    -- 企業Context未設定は全テーブルで拒否する。
    PERFORM set_config('app.company_id', '', true);
    FOR t IN SELECT tablename::text FROM pg_tables WHERE schemaname = 'public'
    LOOP
        EXECUTE format('SELECT count(*) FROM public.%I', t) INTO n;
        IF n <> 0 THEN RAISE EXCEPTION 'Unscoped access: %', t; END IF;
    END LOOP;
    PERFORM pg_temp.expect_error(format('INSERT INTO surveys (company_id) VALUES (%s)', a->>'companies'), '42501');

    PERFORM set_config('app.company_id', a->>'companies', true);
    IF (SELECT count(*) FROM companies) <> 1 THEN RAISE EXCEPTION 'Company row isolation failed'; END IF;
    FOR t IN SELECT table_name::text FROM information_schema.columns WHERE table_schema = 'public' AND column_name = 'company_id'
    LOOP
        EXECUTE format('SELECT count(*) FROM %I', t) INTO n;
        IF n = 0 THEN RAISE EXCEPTION 'Own data unavailable: %', t; END IF;
        EXECUTE format('SELECT count(*) FROM %I WHERE company_id <> $1', t) INTO n USING (a->>'companies')::bigint;
        IF n <> 0 THEN RAISE EXCEPTION 'Other company visible: %', t; END IF;
        EXECUTE format('SELECT count(*) FROM %I WHERE id = $1', t) INTO n USING (b->>t)::bigint;
        IF n <> 0 THEN RAISE EXCEPTION 'Other company detail visible: %', t; END IF;
        EXECUTE format('UPDATE %I SET company_id = company_id WHERE id = $1', t) USING (b->>t)::bigint;
        GET DIAGNOSTICS n = ROW_COUNT;
        IF n <> 0 THEN RAISE EXCEPTION 'Other company updated: %', t; END IF;
        EXECUTE format('DELETE FROM %I WHERE id = $1', t) USING (b->>t)::bigint;
        GET DIAGNOSTICS n = ROW_COUNT;
        IF n <> 0 THEN RAISE EXCEPTION 'Other company deleted: %', t; END IF;
    END LOOP;
    -- USINGだけでなくWITH CHECK、および全41参照で企業越えを拒否することを検証。
    -- 参照IDが一意の関係では、FKより先に既存UNIQUEが重複を検出する場合がある。
    PERFORM pg_temp.expect_error(format('INSERT INTO surveys (company_id) VALUES (%s)', b->>'companies'), '42501');
    FOR c IN SELECT child.relname AS tbl, parent.relname AS parent, attr.attname AS col
        FROM pg_constraint fk JOIN pg_class child ON child.oid = fk.conrelid
        JOIN pg_class parent ON parent.oid = fk.confrelid
        JOIN pg_attribute attr ON attr.attrelid = child.oid AND attr.attnum = fk.conkey[2]
        WHERE fk.connamespace = 'public'::regnamespace AND fk.contype = 'f' AND cardinality(fk.conkey) = 2
    LOOP
        EXECUTE format('SELECT min(id) FROM %I WHERE %I IS NOT NULL', c.tbl, c.col) INTO target_row;
        IF target_row IS NULL THEN RAISE EXCEPTION 'Missing FK fixture: %.%', c.tbl, c.col; END IF;
        PERFORM pg_temp.expect_error(format('UPDATE %I SET %I = %s WHERE id = %s', c.tbl, c.col, b->>c.parent, target_row), '23503,23505');
        fk_checks := fk_checks + 1;
    END LOOP;
    IF fk_checks <> 41 THEN RAISE EXCEPTION 'Missing cross-company FK tests'; END IF;
    -- 自社の正常な操作と、任意参照のNULLは許可する。
    INSERT INTO surveys (company_id) VALUES ((a->>'companies')::bigint);
    UPDATE operation_logs SET actor_id = NULL, response_id = NULL WHERE id = (a->>'operation_logs')::bigint;
    UPDATE staff SET name = '自社更新確認' WHERE id = (a->>'staff')::bigint;
    PERFORM pg_temp.expect_error('TRUNCATE surveys', '42501');
    PERFORM pg_temp.expect_error('ALTER TABLE surveys DISABLE ROW LEVEL SECURITY', '42501');
    PERFORM pg_temp.expect_error(format('UPDATE companies SET is_active = false WHERE id = %s', a->>'companies'), '42501');
    PERFORM pg_temp.expect_error('INSERT INTO companies (code, name, created_at) VALUES (''unauthorized'', ''不許可'', now())', '42501');
    -- 信頼済みサーバーが同じ接続をB社のトランザクションContextに切り替えた場合。
    PERFORM set_config('app.company_id', b->>'companies', true);
    IF (SELECT count(*) FROM staff) <> 1 OR NOT EXISTS (SELECT FROM staff WHERE id = (b->>'staff')::bigint) THEN
        RAISE EXCEPTION 'Company B context failed';
    END IF;
    RAISE NOTICE 'PASS: all 25 tenant tables isolated, 41 cross-company references rejected, app privileges restricted';
END;
$$;
RESET ROLE;

UPDATE companies SET is_active = FALSE WHERE id = (current_setting('test.company_a')::jsonb->>'companies')::bigint;
SET LOCAL ROLE salt_app;
DO $$
DECLARE
    a JSONB := current_setting('test.company_a')::jsonb;
    t TEXT;
    n BIGINT;
BEGIN
    PERFORM set_config('app.company_id', a->>'companies', true);
    IF NOT EXISTS (SELECT FROM companies WHERE NOT is_active) THEN RAISE EXCEPTION 'Own company status unavailable'; END IF;
    FOR t IN SELECT table_name::text FROM information_schema.columns WHERE table_schema = 'public' AND column_name = 'company_id'
    LOOP
        EXECUTE format('SELECT count(*) FROM %I', t) INTO n;
        IF n <> 0 THEN RAISE EXCEPTION 'Inactive company data visible: %', t; END IF;
        EXECUTE format('UPDATE %I SET company_id = company_id WHERE id = $1', t) USING (a->>t)::bigint;
        GET DIAGNOSTICS n = ROW_COUNT;
        IF n <> 0 THEN RAISE EXCEPTION 'Inactive company updated: %', t; END IF;
        EXECUTE format('DELETE FROM %I WHERE id = $1', t) USING (a->>t)::bigint;
        GET DIAGNOSTICS n = ROW_COUNT;
        IF n <> 0 THEN RAISE EXCEPTION 'Inactive company deleted: %', t; END IF;
    END LOOP;
    PERFORM pg_temp.expect_error(format('INSERT INTO surveys (company_id) VALUES (%s)', a->>'companies'), '42501');
    RAISE NOTICE 'PASS: inactive company blocked on all 25 business tables';
END;
$$;
RESET ROLE;
DO $$
DECLARE
    a JSONB := current_setting('test.company_a')::jsonb;
    t TEXT;
    n BIGINT;
BEGIN
    -- 利用停止ではデータは消えず、運営接続で必要な破棄を継続できる。
    FOR t IN SELECT table_name::text FROM information_schema.columns WHERE table_schema = 'public' AND column_name = 'company_id'
    LOOP
        EXECUTE format('SELECT count(*) FROM %I WHERE company_id = $1', t) INTO n USING (a->>'companies')::bigint;
        IF n = 0 THEN RAISE EXCEPTION 'Data lost on company stop: %', t; END IF;
    END LOOP;
    DELETE FROM surveys WHERE company_id = (a->>'companies')::bigint AND id <> (a->>'surveys')::bigint;
    GET DIAGNOSTICS n = ROW_COUNT;
    IF n = 0 THEN RAISE EXCEPTION 'Operator maintenance blocked'; END IF;
    RAISE NOTICE 'PASS: stopped data retained; operator maintenance allowed';
END;
$$;
