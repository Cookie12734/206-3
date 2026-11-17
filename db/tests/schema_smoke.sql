-- 使い捨ての開発DBで実行する。データはROLLBACKするが、採番値は進む。
\set ON_ERROR_STOP on
BEGIN;

CREATE FUNCTION pg_temp.expect_error(statement TEXT, expected_state TEXT)
RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE actual_state TEXT;
BEGIN
    BEGIN
        EXECUTE statement;
    EXCEPTION WHEN OTHERS THEN
        GET STACKED DIAGNOSTICS actual_state = RETURNED_SQLSTATE;
        IF actual_state = ANY(string_to_array(expected_state, ',')) THEN
            RETURN;
        END IF;
        RAISE EXCEPTION 'Expected SQLSTATE %, got %: %', expected_state, actual_state, statement;
    END;
    RAISE EXCEPTION 'Expected SQLSTATE %, but statement succeeded: %', expected_state, statement;
END;
$$;

CREATE FUNCTION pg_temp.seed_company(label TEXT)
RETURNS JSONB LANGUAGE plpgsql AS $$
DECLARE
    company_key BIGINT;
    staff_key BIGINT;
    opening_key BIGINT;
    rule_key BIGINT;
    item_key BIGINT;
    survey_key BIGINT;
    version_key BIGINT;
    route_key BIGINT;
    question_key BIGINT;
    option_key BIGINT;
    response_key BIGINT;
    template_key BIGINT;
    mail_version_key BIGINT;
    application_key BIGINT;
    submission_key BIGINT;
    document_key BIGINT;
    job_key BIGINT;
    evaluation_key BIGINT;
    guide_key BIGINT;
    token TEXT := 'smoke-' || label || '-' || txid_current()::text;
    ids JSONB;
    table_name TEXT;
    row_id BIGINT;
BEGIN
    INSERT INTO companies (code, name, created_at) VALUES (token, '検証企業', now()) RETURNING id INTO company_key;
    PERFORM set_config('test.company_id', company_key::text, true);
    -- アンケートから応募、解析、判断までの外部キーをつないで保存できること。
    INSERT INTO staff (company_id, name, email, password_hash)
        VALUES (company_key, '検証担当者', token || '@example.invalid', 'test-only-not-a-login-hash') RETURNING id INTO staff_key;
    IF NOT EXISTS (SELECT FROM staff WHERE id = staff_key AND role = 'recruiter' AND is_active) THEN
        RAISE EXCEPTION 'staff defaults are incorrect';
    END IF;
    INSERT INTO openings (company_id, code, job_title, hire_type, contact_info, recruitment_year)
        VALUES (company_key, token, '検証用募集', 'graduate', 'test@example.invalid', 2026) RETURNING id INTO opening_key;
    IF (SELECT status FROM openings WHERE id = opening_key) <> 'closed' THEN
        RAISE EXCEPTION 'opening must default to closed';
    END IF;
    INSERT INTO staff_openings (company_id, staff_id, opening_id) VALUES (company_key, staff_key, opening_key);
    INSERT INTO rule_versions (company_id, opening_id, version_no, version_label, requirements, saved_by, saved_at)
        VALUES (company_key, opening_key, 1, 'v1', '検証用要項', staff_key, now()) RETURNING id INTO rule_key;
    INSERT INTO rule_items (company_id, rule_version_id, item_code, item_name, item_type, condition_text, max_points, sort_order)
        VALUES (company_key, rule_key, 'skill', 'スキル', 'score', '検証用条件', 100, 1) RETURNING id INTO item_key;
    INSERT INTO surveys (company_id) VALUES (company_key) RETURNING id INTO survey_key;
    INSERT INTO surveys (company_id) VALUES (company_key); -- 未発行のNULL公開コードは複数許容。
    INSERT INTO survey_drafts (company_id, survey_id, saved_by, saved_at) VALUES (company_key, survey_key, staff_key, now());
    IF (SELECT content FROM survey_drafts WHERE survey_id = survey_key) <> '{}'::jsonb THEN
        RAISE EXCEPTION 'draft default is incorrect';
    END IF;
    INSERT INTO survey_versions (company_id, survey_id, version_no, title, starts_at, ends_at, saved_by, saved_at)
        VALUES (company_key, survey_key, 1, '検証アンケート', now() - interval '1 day', now() + interval '1 day', staff_key, now()) RETURNING id INTO version_key;
    INSERT INTO survey_routes (company_id, survey_version_id, opening_id) VALUES (company_key, version_key, opening_key) RETURNING id INTO route_key;
    INSERT INTO questions (company_id, survey_version_id, prompt, answer_type, sort_order)
        VALUES (company_key, version_key, '検証設問', 'choice', 1) RETURNING id INTO question_key;
    INSERT INTO question_options (company_id, question_id, label, sort_order) VALUES (company_key, question_key, '選択肢', 1) RETURNING id INTO option_key;
    INSERT INTO responses (company_id, route_id, email, wants_selection, answered_at, request_key, entry_key)
        VALUES (company_key, route_key, 'applicant@example.invalid', true, now(), token, token) RETURNING id INTO response_key;
    INSERT INTO answers (company_id, response_id, question_id, option_id) VALUES (company_key, response_key, question_key, option_key);
    INSERT INTO mail_templates (company_id, hire_type, version_no, subject, body, saved_by, saved_at)
        VALUES (company_key, 'graduate', 2147483647, '検証件名', '{{応募リンク}} {{申込期限}}', staff_key, now()) RETURNING id INTO template_key;
    INSERT INTO survey_mail_versions (company_id, survey_id, hire_type, version_no, source_template_id, subject, body, saved_by, saved_at)
        VALUES (company_key, survey_key, 'graduate', 1, template_key, '検証件名', '{{応募リンク}} {{申込期限}}', staff_key, now()) RETURNING id INTO mail_version_key;
    INSERT INTO applications (company_id, response_id, receipt_no, consented_at, access_hash, created_at)
        VALUES (company_key, response_key, token, now(), lpad(token, 64, '0'), now()) RETURNING id INTO application_key;
    INSERT INTO submissions (company_id, application_id, version_no, full_name, email, phone, submitted_at, request_key)
        VALUES (company_key, application_key, 1, '検証応募者', 'applicant@example.invalid', '090-0000-0000', now(), token) RETURNING id INTO submission_key;
    INSERT INTO documents (company_id, submission_id, doc_type, file_name, storage_key, size_bytes, content_type)
        VALUES (company_key, submission_key, 'resume', 'test.pdf', 'companies/' || company_key || '/applications/' || application_key || '/test.pdf', 10485760, 'application/pdf') RETURNING id INTO document_key;
    INSERT INTO mail_deliveries (company_id, mail_type, response_id, recipient, status)
        VALUES (company_key, 'guide', response_key, 'applicant@example.invalid', 'held') RETURNING id INTO guide_key;
    UPDATE mail_deliveries SET survey_mail_version_id = mail_version_key, subject = '検証件名', body = '検証本文',
        deadline_at = now() + interval '1 day', status = 'sent', attempts = 1, attempted_at = now(), sent_at = now()
        WHERE id = guide_key;
    INSERT INTO mail_deliveries (company_id, mail_type, submission_id, recipient) VALUES (company_key, 'receipt', submission_key, 'applicant@example.invalid');
    INSERT INTO analysis_jobs (company_id, submission_id, job_type, run_after)
        VALUES (company_key, submission_key, 'analyze', now() + interval '2 hours') RETURNING id INTO job_key;
    INSERT INTO extracted_fields (company_id, submission_id, field_key, revision_no, field_type, document_id, page_no, field_value, read_status, review_status, reviewed_by, recorded_at)
        VALUES (company_key, submission_key, 'skill_1', 0, 'スキル', document_key, 1, '検証値', 'read', 'verified', staff_key, now());
    INSERT INTO evaluations (company_id, job_id, rule_version_id, status, total_score, ai_status, calculated_at)
        VALUES (company_key, job_key, rule_key, 'complete', 0, 'evaluated', now()) RETURNING id INTO evaluation_key;
    INSERT INTO evaluation_items (company_id, evaluation_id, rule_item_id, grade, points, reason, document_id)
        VALUES (company_key, evaluation_key, item_key, 0, 0, 'ゼロ点も有効な評価', document_key);
    INSERT INTO decisions (company_id, application_id, evaluation_id, decision, reason, reviewed, decided_by, decided_at)
        VALUES (company_key, application_key, evaluation_key, 'hold', '検証用理由', true, staff_key, now());
    INSERT INTO operation_logs (company_id, logged_at, actor_id, event_name, target_type, target_id, outcome, response_id)
        VALUES (company_key, now(), staff_key, 'test.hold', 'applications', application_key, 'success', response_key);

    -- 不正な状態・上限超過・重複・参照切れをDBが拒否すること。
    PERFORM pg_temp.expect_error(format('UPDATE openings SET status = %L WHERE id = %s', 'invalid', opening_key), '23514');
    PERFORM pg_temp.expect_error(format('UPDATE openings SET recruitment_year = 10000 WHERE id = %s', opening_key), '23514');
    PERFORM pg_temp.expect_error(format('UPDATE staff SET name = NULL WHERE id = %s', staff_key), '23502');
    PERFORM pg_temp.expect_error(format('INSERT INTO staff_openings (company_id, staff_id, opening_id) VALUES (current_setting(''test.company_id'')::bigint, -1, %s)', opening_key), '23503');
    PERFORM pg_temp.expect_error(format('INSERT INTO staff_openings (company_id, staff_id, opening_id) VALUES (current_setting(''test.company_id'')::bigint, %s, %s)', staff_key, opening_key), '23505');
    PERFORM pg_temp.expect_error(format('UPDATE survey_versions SET ends_at = starts_at WHERE id = %s', version_key), '23514');
    PERFORM pg_temp.expect_error(format('INSERT INTO survey_drafts (company_id, survey_id, saved_by, saved_at) VALUES (current_setting(''test.company_id'')::bigint, %s, %s, now())', survey_key, staff_key), '23505');
    PERFORM pg_temp.expect_error(format('UPDATE answers SET text_value = %L WHERE response_id = %s', '二重回答', response_key), '23514');
    PERFORM pg_temp.expect_error(format('INSERT INTO responses (company_id, route_id, email, wants_selection, answered_at, request_key) VALUES (current_setting(''test.company_id'')::bigint, %s, %L, false, now(), %L)', route_key, 'test@example.invalid', token), '23505');
    PERFORM pg_temp.expect_error(format('UPDATE documents SET size_bytes = 10485761 WHERE id = %s', document_key), '23514');
    PERFORM pg_temp.expect_error(format('UPDATE mail_deliveries SET sent_at = NULL WHERE id = %s', guide_key), '23514');
    PERFORM pg_temp.expect_error(format('UPDATE mail_deliveries SET submission_id = %s WHERE id = %s', submission_key, guide_key), '23514');
    PERFORM pg_temp.expect_error(format('INSERT INTO mail_deliveries (company_id, mail_type, response_id, recipient) VALUES (current_setting(''test.company_id'')::bigint, %L, %s, %L)', 'guide', response_key, 'test@example.invalid'), '23505');
    PERFORM pg_temp.expect_error(format('UPDATE evaluations SET status = %L WHERE id = %s', 'incomplete', evaluation_key), '23514');
    PERFORM pg_temp.expect_error(format('UPDATE evaluation_items SET grade = 5 WHERE evaluation_id = %s', evaluation_key), '23514');
    PERFORM pg_temp.expect_error(format('UPDATE extracted_fields SET reviewed_by = NULL WHERE submission_id = %s', submission_key), '23514');
    PERFORM pg_temp.expect_error(format('UPDATE decisions SET reviewed = false WHERE application_id = %s', application_key), '23514');
    PERFORM pg_temp.expect_error(format('DELETE FROM applications WHERE id = %s', application_key), '23503');
    UPDATE surveys SET public_code = token WHERE id = survey_key;
    ids := jsonb_build_object('companies', company_key);
    FOR table_name IN SELECT c.table_name::text FROM information_schema.columns c
        WHERE c.table_schema = 'public' AND c.column_name = 'company_id'
    LOOP
        EXECUTE format('SELECT min(id) FROM public.%I WHERE company_id = $1', table_name)
            INTO row_id USING company_key;
        ids := ids || jsonb_build_object(table_name, row_id);
    END LOOP;
    RAISE NOTICE 'PASS: company %, all 26 tables, defaults, nullable keys and 18 business rejection checks', label;
    RETURN ids;
END;
$$;

DO $$
BEGIN
    PERFORM set_config('test.company_a', pg_temp.seed_company('a')::text, true);
    PERFORM set_config('test.company_b', pg_temp.seed_company('b')::text, true);
END;
$$;
\ir tenant_isolation.sql

ROLLBACK;

-- 同じ接続を再利用しても、直前の企業Contextが持ち越されないこと。
SET ROLE salt_app;
DO $$
BEGIN
    IF app.current_company_id() IS NOT NULL OR EXISTS (SELECT FROM public.staff) THEN
        RAISE EXCEPTION 'Tenant context leaked beyond the transaction';
    END IF;
    RAISE NOTICE 'PASS: tenant context cleared after ROLLBACK';
END;
$$;
RESET ROLE;

BEGIN;
SET LOCAL ROLE salt_app;
DO $$ BEGIN PERFORM set_config('app.company_id', '1', true); END; $$;
COMMIT;
SET ROLE salt_app;
DO $$
BEGIN
    IF app.current_company_id() IS NOT NULL OR EXISTS (SELECT FROM public.staff) THEN
        RAISE EXCEPTION 'Tenant context leaked after COMMIT';
    END IF;
    RAISE NOTICE 'PASS: tenant context cleared after COMMIT';
END;
$$;
RESET ROLE;
