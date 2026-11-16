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
        IF actual_state = expected_state THEN
            RETURN;
        END IF;
        RAISE EXCEPTION 'Expected SQLSTATE %, got %: %', expected_state, actual_state, statement;
    END;
    RAISE EXCEPTION 'Expected SQLSTATE %, but statement succeeded: %', expected_state, statement;
END;
$$;

DO $$
DECLARE
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
    token TEXT := 'smoke-' || txid_current()::text;
BEGIN
    -- アンケートから応募、解析、判断までの外部キーをつないで保存できること。
    INSERT INTO staff (name, email, password_hash)
        VALUES ('検証担当者', token || '@example.invalid', 'test-only-not-a-login-hash') RETURNING id INTO staff_key;
    IF NOT EXISTS (SELECT FROM staff WHERE id = staff_key AND role = 'recruiter' AND is_active) THEN
        RAISE EXCEPTION 'staff defaults are incorrect';
    END IF;
    INSERT INTO openings (code, job_title, hire_type, contact_info, recruitment_year)
        VALUES (token, '検証用募集', 'graduate', 'test@example.invalid', 2026) RETURNING id INTO opening_key;
    IF (SELECT status FROM openings WHERE id = opening_key) <> 'closed' THEN
        RAISE EXCEPTION 'opening must default to closed';
    END IF;
    INSERT INTO staff_openings (staff_id, opening_id) VALUES (staff_key, opening_key);
    INSERT INTO rule_versions (opening_id, version_no, version_label, requirements, saved_by, saved_at)
        VALUES (opening_key, 1, 'v1', '検証用要項', staff_key, now()) RETURNING id INTO rule_key;
    INSERT INTO rule_items (rule_version_id, item_code, item_name, item_type, condition_text, max_points, sort_order)
        VALUES (rule_key, 'skill', 'スキル', 'score', '検証用条件', 100, 1) RETURNING id INTO item_key;
    INSERT INTO surveys DEFAULT VALUES RETURNING id INTO survey_key;
    INSERT INTO surveys DEFAULT VALUES; -- 未発行のNULL公開コードは複数許容。
    INSERT INTO survey_drafts (survey_id, saved_by, saved_at) VALUES (survey_key, staff_key, now());
    IF (SELECT content FROM survey_drafts WHERE survey_id = survey_key) <> '{}'::jsonb THEN
        RAISE EXCEPTION 'draft default is incorrect';
    END IF;
    INSERT INTO survey_versions (survey_id, version_no, title, starts_at, ends_at, saved_by, saved_at)
        VALUES (survey_key, 1, '検証アンケート', now() - interval '1 day', now() + interval '1 day', staff_key, now()) RETURNING id INTO version_key;
    INSERT INTO survey_routes (survey_version_id, opening_id) VALUES (version_key, opening_key) RETURNING id INTO route_key;
    INSERT INTO questions (survey_version_id, prompt, answer_type, sort_order)
        VALUES (version_key, '検証設問', 'choice', 1) RETURNING id INTO question_key;
    INSERT INTO question_options (question_id, label, sort_order) VALUES (question_key, '選択肢', 1) RETURNING id INTO option_key;
    INSERT INTO responses (route_id, email, wants_selection, answered_at, request_key, entry_key)
        VALUES (route_key, 'applicant@example.invalid', true, now(), token, token) RETURNING id INTO response_key;
    INSERT INTO answers (response_id, question_id, option_id) VALUES (response_key, question_key, option_key);
    INSERT INTO mail_templates (hire_type, version_no, subject, body, saved_by, saved_at)
        VALUES ('graduate', 2147483647, '検証件名', '{{応募リンク}} {{申込期限}}', staff_key, now()) RETURNING id INTO template_key;
    INSERT INTO survey_mail_versions (survey_id, hire_type, version_no, source_template_id, subject, body, saved_by, saved_at)
        VALUES (survey_key, 'graduate', 1, template_key, '検証件名', '{{応募リンク}} {{申込期限}}', staff_key, now()) RETURNING id INTO mail_version_key;
    INSERT INTO applications (response_id, receipt_no, consented_at, access_hash, created_at)
        VALUES (response_key, token, now(), lpad(token, 64, '0'), now()) RETURNING id INTO application_key;
    INSERT INTO submissions (application_id, version_no, full_name, email, phone, submitted_at, request_key)
        VALUES (application_key, 1, '検証応募者', 'applicant@example.invalid', '090-0000-0000', now(), token) RETURNING id INTO submission_key;
    INSERT INTO documents (submission_id, doc_type, file_name, storage_key, size_bytes, content_type)
        VALUES (submission_key, 'resume', 'test.pdf', 'test/no-actual-file.pdf', 10485760, 'application/pdf') RETURNING id INTO document_key;
    INSERT INTO mail_deliveries (mail_type, response_id, recipient, status)
        VALUES ('guide', response_key, 'applicant@example.invalid', 'held') RETURNING id INTO guide_key;
    UPDATE mail_deliveries SET survey_mail_version_id = mail_version_key, subject = '検証件名', body = '検証本文',
        deadline_at = now() + interval '1 day', status = 'sent', attempts = 1, attempted_at = now(), sent_at = now()
        WHERE id = guide_key;
    INSERT INTO mail_deliveries (mail_type, submission_id, recipient) VALUES ('receipt', submission_key, 'applicant@example.invalid');
    INSERT INTO analysis_jobs (submission_id, job_type, run_after)
        VALUES (submission_key, 'analyze', now() + interval '2 hours') RETURNING id INTO job_key;
    INSERT INTO extracted_fields (submission_id, field_key, revision_no, field_type, document_id, page_no, field_value, read_status, review_status, reviewed_by, recorded_at)
        VALUES (submission_key, 'skill_1', 0, 'スキル', document_key, 1, '検証値', 'read', 'verified', staff_key, now());
    INSERT INTO evaluations (job_id, rule_version_id, status, total_score, ai_status, calculated_at)
        VALUES (job_key, rule_key, 'complete', 0, 'evaluated', now()) RETURNING id INTO evaluation_key;
    INSERT INTO evaluation_items (evaluation_id, rule_item_id, grade, points, reason, document_id)
        VALUES (evaluation_key, item_key, 0, 0, 'ゼロ点も有効な評価', document_key);
    INSERT INTO decisions (application_id, evaluation_id, decision, reason, reviewed, decided_by, decided_at)
        VALUES (application_key, evaluation_key, 'hold', '検証用理由', true, staff_key, now());
    INSERT INTO operation_logs (logged_at, actor_id, event_name, target_type, target_id, outcome, response_id)
        VALUES (now(), staff_key, 'test.hold', 'applications', application_key, 'success', response_key);

    -- 不正な状態・上限超過・重複・参照切れをDBが拒否すること。
    PERFORM pg_temp.expect_error(format('UPDATE openings SET status = %L WHERE id = %s', 'invalid', opening_key), '23514');
    PERFORM pg_temp.expect_error(format('UPDATE openings SET recruitment_year = 10000 WHERE id = %s', opening_key), '23514');
    PERFORM pg_temp.expect_error(format('UPDATE staff SET name = NULL WHERE id = %s', staff_key), '23502');
    PERFORM pg_temp.expect_error(format('INSERT INTO staff_openings (staff_id, opening_id) VALUES (-1, %s)', opening_key), '23503');
    PERFORM pg_temp.expect_error(format('INSERT INTO staff_openings (staff_id, opening_id) VALUES (%s, %s)', staff_key, opening_key), '23505');
    PERFORM pg_temp.expect_error(format('UPDATE survey_versions SET ends_at = starts_at WHERE id = %s', version_key), '23514');
    PERFORM pg_temp.expect_error(format('INSERT INTO survey_drafts (survey_id, saved_by, saved_at) VALUES (%s, %s, now())', survey_key, staff_key), '23505');
    PERFORM pg_temp.expect_error(format('UPDATE answers SET text_value = %L WHERE response_id = %s', '二重回答', response_key), '23514');
    PERFORM pg_temp.expect_error(format('INSERT INTO responses (route_id, email, wants_selection, answered_at, request_key) VALUES (%s, %L, false, now(), %L)', route_key, 'test@example.invalid', token), '23505');
    PERFORM pg_temp.expect_error(format('UPDATE documents SET size_bytes = 10485761 WHERE id = %s', document_key), '23514');
    PERFORM pg_temp.expect_error(format('UPDATE mail_deliveries SET sent_at = NULL WHERE id = %s', guide_key), '23514');
    PERFORM pg_temp.expect_error(format('UPDATE mail_deliveries SET submission_id = %s WHERE id = %s', submission_key, guide_key), '23514');
    PERFORM pg_temp.expect_error(format('INSERT INTO mail_deliveries (mail_type, response_id, recipient) VALUES (%L, %s, %L)', 'guide', response_key, 'test@example.invalid'), '23505');
    PERFORM pg_temp.expect_error(format('UPDATE evaluations SET status = %L WHERE id = %s', 'incomplete', evaluation_key), '23514');
    PERFORM pg_temp.expect_error(format('UPDATE evaluation_items SET grade = 5 WHERE evaluation_id = %s', evaluation_key), '23514');
    PERFORM pg_temp.expect_error(format('UPDATE extracted_fields SET reviewed_by = NULL WHERE submission_id = %s', submission_key), '23514');
    PERFORM pg_temp.expect_error(format('UPDATE decisions SET reviewed = false WHERE application_id = %s', application_key), '23514');
    PERFORM pg_temp.expect_error(format('DELETE FROM applications WHERE id = %s', application_key), '23503');
    RAISE NOTICE 'PASS: all 25 tables, valid zero score, defaults, nullable unique keys, and 18 rejection checks';
END;
$$;

ROLLBACK;
