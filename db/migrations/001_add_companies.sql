-- 旧25テーブル・単一企業のDB専用。運営用接続で実行する。
-- 全既存データの所属先を確認してから company_code/company_name と
-- confirm_single_company=yes をpsql変数として指定する。混在データには実行しない。
-- 適用中はアプリとワーカーを停止し、事前にバックアップする。
\set ON_ERROR_STOP on
\if :{?company_code}
\else
  DO $$ BEGIN RAISE EXCEPTION 'company_code is required'; END; $$;
\endif
\if :{?company_name}
\else
  DO $$ BEGIN RAISE EXCEPTION 'company_name is required'; END; $$;
\endif
\if :{?confirm_single_company}
\else
  DO $$ BEGIN RAISE EXCEPTION 'confirm_single_company=yes is required after checking ownership'; END; $$;
\endif

BEGIN;
SET LOCAL search_path TO public;
SET LOCAL lock_timeout TO '10s';

CREATE TEMP TABLE migration_input (
    code VARCHAR(40) NOT NULL CHECK (btrim(code) <> ''),
    name VARCHAR(100) NOT NULL CHECK (btrim(name) <> ''),
    confirmed TEXT NOT NULL CHECK (confirmed = 'yes')
) ON COMMIT DROP;
INSERT INTO migration_input VALUES (:'company_code', :'company_name', :'confirm_single_company');

DO $$
BEGIN
    IF to_regclass('public.companies') IS NOT NULL
       OR (SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE') <> 25
       OR (SELECT count(*) FROM information_schema.columns WHERE table_schema = 'public') <> 185
       OR (SELECT count(*) FROM pg_constraint WHERE contype = 'f' AND connamespace = 'public'::regnamespace) <> 41 THEN
        RAISE EXCEPTION 'Expected the original 25-table schema; migration is not repeatable';
    END IF;
END;
$$;


LOCK TABLE public.staff, public.openings, public.surveys, public.staff_openings, public.rule_versions, public.survey_versions, public.mail_templates, public.survey_drafts, public.rule_items, public.survey_routes, public.questions, public.survey_mail_versions, public.question_options, public.responses, public.answers, public.applications, public.operation_logs, public.submissions, public.documents, public.mail_deliveries, public.analysis_jobs, public.extracted_fields, public.evaluations, public.evaluation_items, public.decisions IN ACCESS EXCLUSIVE MODE;


CREATE TABLE companies (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code VARCHAR(40) NOT NULL,
    name VARCHAR(100) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL,
    UNIQUE (code)
);
COMMENT ON TABLE companies IS '企業テーブル';
COMMENT ON COLUMN companies.id IS '企業ID: GENERATED ALWAYS AS IDENTITY で自動採番。企業の識別子。';
COMMENT ON COLUMN companies.code IS '企業コード: UNIQUE (code)。 システム全体で一意の業務用コード。初期登録スクリプトで指定する。';
COMMENT ON COLUMN companies.name IS '企業名: 画面表示・メール差し込みに使用する企業名。';
COMMENT ON COLUMN companies.is_active IS '有効フラグ: FALSEの場合は所属担当者のログイン・既存セッションでの操作、公開受付・応募編集、新規メール送信・解析実行を停止する。';
COMMENT ON COLUMN companies.created_at IS '登録日時: 企業登録スクリプトで登録時刻を設定する。企業と初期リーダーを同一トランザクションで作成する。';

INSERT INTO companies (code, name, created_at) SELECT code, name, CURRENT_TIMESTAMP FROM migration_input;


ALTER TABLE staff ADD COLUMN company_id BIGINT;
UPDATE staff SET company_id = (SELECT id FROM companies);
ALTER TABLE staff ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE staff ADD CONSTRAINT staff_company_id_fkey
    FOREIGN KEY (company_id) REFERENCES companies (id) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE staff ADD CONSTRAINT staff_company_id_id_key UNIQUE (company_id, id);

ALTER TABLE openings ADD COLUMN company_id BIGINT;
UPDATE openings SET company_id = (SELECT id FROM companies);
ALTER TABLE openings ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE openings ADD CONSTRAINT openings_company_id_fkey
    FOREIGN KEY (company_id) REFERENCES companies (id) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE openings ADD CONSTRAINT openings_company_id_id_key UNIQUE (company_id, id);

ALTER TABLE surveys ADD COLUMN company_id BIGINT;
UPDATE surveys SET company_id = (SELECT id FROM companies);
ALTER TABLE surveys ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE surveys ADD CONSTRAINT surveys_company_id_fkey
    FOREIGN KEY (company_id) REFERENCES companies (id) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE surveys ADD CONSTRAINT surveys_company_id_id_key UNIQUE (company_id, id);

ALTER TABLE staff_openings ADD COLUMN company_id BIGINT;
UPDATE staff_openings SET company_id = (SELECT id FROM companies);
ALTER TABLE staff_openings ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE staff_openings ADD CONSTRAINT staff_openings_company_id_fkey
    FOREIGN KEY (company_id) REFERENCES companies (id) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE staff_openings ADD CONSTRAINT staff_openings_company_id_id_key UNIQUE (company_id, id);

ALTER TABLE rule_versions ADD COLUMN company_id BIGINT;
UPDATE rule_versions SET company_id = (SELECT id FROM companies);
ALTER TABLE rule_versions ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE rule_versions ADD CONSTRAINT rule_versions_company_id_fkey
    FOREIGN KEY (company_id) REFERENCES companies (id) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE rule_versions ADD CONSTRAINT rule_versions_company_id_id_key UNIQUE (company_id, id);

ALTER TABLE survey_versions ADD COLUMN company_id BIGINT;
UPDATE survey_versions SET company_id = (SELECT id FROM companies);
ALTER TABLE survey_versions ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE survey_versions ADD CONSTRAINT survey_versions_company_id_fkey
    FOREIGN KEY (company_id) REFERENCES companies (id) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE survey_versions ADD CONSTRAINT survey_versions_company_id_id_key UNIQUE (company_id, id);

ALTER TABLE mail_templates ADD COLUMN company_id BIGINT;
UPDATE mail_templates SET company_id = (SELECT id FROM companies);
ALTER TABLE mail_templates ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE mail_templates ADD CONSTRAINT mail_templates_company_id_fkey
    FOREIGN KEY (company_id) REFERENCES companies (id) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE mail_templates ADD CONSTRAINT mail_templates_company_id_id_key UNIQUE (company_id, id);

ALTER TABLE survey_drafts ADD COLUMN company_id BIGINT;
UPDATE survey_drafts SET company_id = (SELECT id FROM companies);
ALTER TABLE survey_drafts ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE survey_drafts ADD CONSTRAINT survey_drafts_company_id_fkey
    FOREIGN KEY (company_id) REFERENCES companies (id) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE survey_drafts ADD CONSTRAINT survey_drafts_company_id_id_key UNIQUE (company_id, id);

ALTER TABLE rule_items ADD COLUMN company_id BIGINT;
UPDATE rule_items SET company_id = (SELECT id FROM companies);
ALTER TABLE rule_items ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE rule_items ADD CONSTRAINT rule_items_company_id_fkey
    FOREIGN KEY (company_id) REFERENCES companies (id) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE rule_items ADD CONSTRAINT rule_items_company_id_id_key UNIQUE (company_id, id);

ALTER TABLE survey_routes ADD COLUMN company_id BIGINT;
UPDATE survey_routes SET company_id = (SELECT id FROM companies);
ALTER TABLE survey_routes ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE survey_routes ADD CONSTRAINT survey_routes_company_id_fkey
    FOREIGN KEY (company_id) REFERENCES companies (id) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE survey_routes ADD CONSTRAINT survey_routes_company_id_id_key UNIQUE (company_id, id);

ALTER TABLE questions ADD COLUMN company_id BIGINT;
UPDATE questions SET company_id = (SELECT id FROM companies);
ALTER TABLE questions ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE questions ADD CONSTRAINT questions_company_id_fkey
    FOREIGN KEY (company_id) REFERENCES companies (id) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE questions ADD CONSTRAINT questions_company_id_id_key UNIQUE (company_id, id);

ALTER TABLE survey_mail_versions ADD COLUMN company_id BIGINT;
UPDATE survey_mail_versions SET company_id = (SELECT id FROM companies);
ALTER TABLE survey_mail_versions ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE survey_mail_versions ADD CONSTRAINT survey_mail_versions_company_id_fkey
    FOREIGN KEY (company_id) REFERENCES companies (id) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE survey_mail_versions ADD CONSTRAINT survey_mail_versions_company_id_id_key UNIQUE (company_id, id);

ALTER TABLE question_options ADD COLUMN company_id BIGINT;
UPDATE question_options SET company_id = (SELECT id FROM companies);
ALTER TABLE question_options ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE question_options ADD CONSTRAINT question_options_company_id_fkey
    FOREIGN KEY (company_id) REFERENCES companies (id) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE question_options ADD CONSTRAINT question_options_company_id_id_key UNIQUE (company_id, id);

ALTER TABLE responses ADD COLUMN company_id BIGINT;
UPDATE responses SET company_id = (SELECT id FROM companies);
ALTER TABLE responses ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE responses ADD CONSTRAINT responses_company_id_fkey
    FOREIGN KEY (company_id) REFERENCES companies (id) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE responses ADD CONSTRAINT responses_company_id_id_key UNIQUE (company_id, id);

ALTER TABLE answers ADD COLUMN company_id BIGINT;
UPDATE answers SET company_id = (SELECT id FROM companies);
ALTER TABLE answers ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE answers ADD CONSTRAINT answers_company_id_fkey
    FOREIGN KEY (company_id) REFERENCES companies (id) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE answers ADD CONSTRAINT answers_company_id_id_key UNIQUE (company_id, id);

ALTER TABLE applications ADD COLUMN company_id BIGINT;
UPDATE applications SET company_id = (SELECT id FROM companies);
ALTER TABLE applications ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE applications ADD CONSTRAINT applications_company_id_fkey
    FOREIGN KEY (company_id) REFERENCES companies (id) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE applications ADD CONSTRAINT applications_company_id_id_key UNIQUE (company_id, id);

ALTER TABLE operation_logs ADD COLUMN company_id BIGINT;
UPDATE operation_logs SET company_id = (SELECT id FROM companies);
ALTER TABLE operation_logs ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE operation_logs ADD CONSTRAINT operation_logs_company_id_fkey
    FOREIGN KEY (company_id) REFERENCES companies (id) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE operation_logs ADD CONSTRAINT operation_logs_company_id_id_key UNIQUE (company_id, id);

ALTER TABLE submissions ADD COLUMN company_id BIGINT;
UPDATE submissions SET company_id = (SELECT id FROM companies);
ALTER TABLE submissions ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE submissions ADD CONSTRAINT submissions_company_id_fkey
    FOREIGN KEY (company_id) REFERENCES companies (id) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE submissions ADD CONSTRAINT submissions_company_id_id_key UNIQUE (company_id, id);

ALTER TABLE documents ADD COLUMN company_id BIGINT;
UPDATE documents SET company_id = (SELECT id FROM companies);
ALTER TABLE documents ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE documents ADD CONSTRAINT documents_company_id_fkey
    FOREIGN KEY (company_id) REFERENCES companies (id) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE documents ADD CONSTRAINT documents_company_id_id_key UNIQUE (company_id, id);

ALTER TABLE mail_deliveries ADD COLUMN company_id BIGINT;
UPDATE mail_deliveries SET company_id = (SELECT id FROM companies);
ALTER TABLE mail_deliveries ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE mail_deliveries ADD CONSTRAINT mail_deliveries_company_id_fkey
    FOREIGN KEY (company_id) REFERENCES companies (id) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE mail_deliveries ADD CONSTRAINT mail_deliveries_company_id_id_key UNIQUE (company_id, id);

ALTER TABLE analysis_jobs ADD COLUMN company_id BIGINT;
UPDATE analysis_jobs SET company_id = (SELECT id FROM companies);
ALTER TABLE analysis_jobs ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE analysis_jobs ADD CONSTRAINT analysis_jobs_company_id_fkey
    FOREIGN KEY (company_id) REFERENCES companies (id) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE analysis_jobs ADD CONSTRAINT analysis_jobs_company_id_id_key UNIQUE (company_id, id);

ALTER TABLE extracted_fields ADD COLUMN company_id BIGINT;
UPDATE extracted_fields SET company_id = (SELECT id FROM companies);
ALTER TABLE extracted_fields ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE extracted_fields ADD CONSTRAINT extracted_fields_company_id_fkey
    FOREIGN KEY (company_id) REFERENCES companies (id) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE extracted_fields ADD CONSTRAINT extracted_fields_company_id_id_key UNIQUE (company_id, id);

ALTER TABLE evaluations ADD COLUMN company_id BIGINT;
UPDATE evaluations SET company_id = (SELECT id FROM companies);
ALTER TABLE evaluations ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE evaluations ADD CONSTRAINT evaluations_company_id_fkey
    FOREIGN KEY (company_id) REFERENCES companies (id) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE evaluations ADD CONSTRAINT evaluations_company_id_id_key UNIQUE (company_id, id);

ALTER TABLE evaluation_items ADD COLUMN company_id BIGINT;
UPDATE evaluation_items SET company_id = (SELECT id FROM companies);
ALTER TABLE evaluation_items ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE evaluation_items ADD CONSTRAINT evaluation_items_company_id_fkey
    FOREIGN KEY (company_id) REFERENCES companies (id) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE evaluation_items ADD CONSTRAINT evaluation_items_company_id_id_key UNIQUE (company_id, id);

ALTER TABLE decisions ADD COLUMN company_id BIGINT;
UPDATE decisions SET company_id = (SELECT id FROM companies);
ALTER TABLE decisions ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE decisions ADD CONSTRAINT decisions_company_id_fkey
    FOREIGN KEY (company_id) REFERENCES companies (id) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE decisions ADD CONSTRAINT decisions_company_id_id_key UNIQUE (company_id, id);

ALTER TABLE staff_openings DROP CONSTRAINT staff_openings_staff_id_fkey;
ALTER TABLE staff_openings ADD CONSTRAINT staff_openings_staff_id_fkey
    FOREIGN KEY (company_id, staff_id) REFERENCES staff (company_id, id)
    MATCH SIMPLE ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE staff_openings DROP CONSTRAINT staff_openings_opening_id_fkey;
ALTER TABLE staff_openings ADD CONSTRAINT staff_openings_opening_id_fkey
    FOREIGN KEY (company_id, opening_id) REFERENCES openings (company_id, id)
    MATCH SIMPLE ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE rule_versions DROP CONSTRAINT rule_versions_opening_id_fkey;
ALTER TABLE rule_versions ADD CONSTRAINT rule_versions_opening_id_fkey
    FOREIGN KEY (company_id, opening_id) REFERENCES openings (company_id, id)
    MATCH SIMPLE ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE rule_versions DROP CONSTRAINT rule_versions_saved_by_fkey;
ALTER TABLE rule_versions ADD CONSTRAINT rule_versions_saved_by_fkey
    FOREIGN KEY (company_id, saved_by) REFERENCES staff (company_id, id)
    MATCH SIMPLE ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE survey_versions DROP CONSTRAINT survey_versions_survey_id_fkey;
ALTER TABLE survey_versions ADD CONSTRAINT survey_versions_survey_id_fkey
    FOREIGN KEY (company_id, survey_id) REFERENCES surveys (company_id, id)
    MATCH SIMPLE ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE survey_versions DROP CONSTRAINT survey_versions_saved_by_fkey;
ALTER TABLE survey_versions ADD CONSTRAINT survey_versions_saved_by_fkey
    FOREIGN KEY (company_id, saved_by) REFERENCES staff (company_id, id)
    MATCH SIMPLE ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE mail_templates DROP CONSTRAINT mail_templates_saved_by_fkey;
ALTER TABLE mail_templates ADD CONSTRAINT mail_templates_saved_by_fkey
    FOREIGN KEY (company_id, saved_by) REFERENCES staff (company_id, id)
    MATCH SIMPLE ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE survey_drafts DROP CONSTRAINT survey_drafts_survey_id_fkey;
ALTER TABLE survey_drafts ADD CONSTRAINT survey_drafts_survey_id_fkey
    FOREIGN KEY (company_id, survey_id) REFERENCES surveys (company_id, id)
    MATCH SIMPLE ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE survey_drafts DROP CONSTRAINT survey_drafts_saved_by_fkey;
ALTER TABLE survey_drafts ADD CONSTRAINT survey_drafts_saved_by_fkey
    FOREIGN KEY (company_id, saved_by) REFERENCES staff (company_id, id)
    MATCH SIMPLE ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE rule_items DROP CONSTRAINT rule_items_rule_version_id_fkey;
ALTER TABLE rule_items ADD CONSTRAINT rule_items_rule_version_id_fkey
    FOREIGN KEY (company_id, rule_version_id) REFERENCES rule_versions (company_id, id)
    MATCH SIMPLE ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE survey_routes DROP CONSTRAINT survey_routes_survey_version_id_fkey;
ALTER TABLE survey_routes ADD CONSTRAINT survey_routes_survey_version_id_fkey
    FOREIGN KEY (company_id, survey_version_id) REFERENCES survey_versions (company_id, id)
    MATCH SIMPLE ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE survey_routes DROP CONSTRAINT survey_routes_opening_id_fkey;
ALTER TABLE survey_routes ADD CONSTRAINT survey_routes_opening_id_fkey
    FOREIGN KEY (company_id, opening_id) REFERENCES openings (company_id, id)
    MATCH SIMPLE ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE questions DROP CONSTRAINT questions_survey_version_id_fkey;
ALTER TABLE questions ADD CONSTRAINT questions_survey_version_id_fkey
    FOREIGN KEY (company_id, survey_version_id) REFERENCES survey_versions (company_id, id)
    MATCH SIMPLE ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE survey_mail_versions DROP CONSTRAINT survey_mail_versions_survey_id_fkey;
ALTER TABLE survey_mail_versions ADD CONSTRAINT survey_mail_versions_survey_id_fkey
    FOREIGN KEY (company_id, survey_id) REFERENCES surveys (company_id, id)
    MATCH SIMPLE ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE survey_mail_versions DROP CONSTRAINT survey_mail_versions_source_template_id_fkey;
ALTER TABLE survey_mail_versions ADD CONSTRAINT survey_mail_versions_source_template_id_fkey
    FOREIGN KEY (company_id, source_template_id) REFERENCES mail_templates (company_id, id)
    MATCH SIMPLE ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE survey_mail_versions DROP CONSTRAINT survey_mail_versions_saved_by_fkey;
ALTER TABLE survey_mail_versions ADD CONSTRAINT survey_mail_versions_saved_by_fkey
    FOREIGN KEY (company_id, saved_by) REFERENCES staff (company_id, id)
    MATCH SIMPLE ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE question_options DROP CONSTRAINT question_options_question_id_fkey;
ALTER TABLE question_options ADD CONSTRAINT question_options_question_id_fkey
    FOREIGN KEY (company_id, question_id) REFERENCES questions (company_id, id)
    MATCH SIMPLE ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE responses DROP CONSTRAINT responses_route_id_fkey;
ALTER TABLE responses ADD CONSTRAINT responses_route_id_fkey
    FOREIGN KEY (company_id, route_id) REFERENCES survey_routes (company_id, id)
    MATCH SIMPLE ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE answers DROP CONSTRAINT answers_response_id_fkey;
ALTER TABLE answers ADD CONSTRAINT answers_response_id_fkey
    FOREIGN KEY (company_id, response_id) REFERENCES responses (company_id, id)
    MATCH SIMPLE ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE answers DROP CONSTRAINT answers_question_id_fkey;
ALTER TABLE answers ADD CONSTRAINT answers_question_id_fkey
    FOREIGN KEY (company_id, question_id) REFERENCES questions (company_id, id)
    MATCH SIMPLE ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE answers DROP CONSTRAINT answers_option_id_fkey;
ALTER TABLE answers ADD CONSTRAINT answers_option_id_fkey
    FOREIGN KEY (company_id, option_id) REFERENCES question_options (company_id, id)
    MATCH SIMPLE ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE applications DROP CONSTRAINT applications_response_id_fkey;
ALTER TABLE applications ADD CONSTRAINT applications_response_id_fkey
    FOREIGN KEY (company_id, response_id) REFERENCES responses (company_id, id)
    MATCH SIMPLE ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE operation_logs DROP CONSTRAINT operation_logs_actor_id_fkey;
ALTER TABLE operation_logs ADD CONSTRAINT operation_logs_actor_id_fkey
    FOREIGN KEY (company_id, actor_id) REFERENCES staff (company_id, id)
    MATCH SIMPLE ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE operation_logs DROP CONSTRAINT operation_logs_response_id_fkey;
ALTER TABLE operation_logs ADD CONSTRAINT operation_logs_response_id_fkey
    FOREIGN KEY (company_id, response_id) REFERENCES responses (company_id, id)
    MATCH SIMPLE ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE submissions DROP CONSTRAINT submissions_application_id_fkey;
ALTER TABLE submissions ADD CONSTRAINT submissions_application_id_fkey
    FOREIGN KEY (company_id, application_id) REFERENCES applications (company_id, id)
    MATCH SIMPLE ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE documents DROP CONSTRAINT documents_submission_id_fkey;
ALTER TABLE documents ADD CONSTRAINT documents_submission_id_fkey
    FOREIGN KEY (company_id, submission_id) REFERENCES submissions (company_id, id)
    MATCH SIMPLE ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE mail_deliveries DROP CONSTRAINT mail_deliveries_response_id_fkey;
ALTER TABLE mail_deliveries ADD CONSTRAINT mail_deliveries_response_id_fkey
    FOREIGN KEY (company_id, response_id) REFERENCES responses (company_id, id)
    MATCH SIMPLE ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE mail_deliveries DROP CONSTRAINT mail_deliveries_submission_id_fkey;
ALTER TABLE mail_deliveries ADD CONSTRAINT mail_deliveries_submission_id_fkey
    FOREIGN KEY (company_id, submission_id) REFERENCES submissions (company_id, id)
    MATCH SIMPLE ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE mail_deliveries DROP CONSTRAINT mail_deliveries_survey_mail_version_id_fkey;
ALTER TABLE mail_deliveries ADD CONSTRAINT mail_deliveries_survey_mail_version_id_fkey
    FOREIGN KEY (company_id, survey_mail_version_id) REFERENCES survey_mail_versions (company_id, id)
    MATCH SIMPLE ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE analysis_jobs DROP CONSTRAINT analysis_jobs_submission_id_fkey;
ALTER TABLE analysis_jobs ADD CONSTRAINT analysis_jobs_submission_id_fkey
    FOREIGN KEY (company_id, submission_id) REFERENCES submissions (company_id, id)
    MATCH SIMPLE ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE extracted_fields DROP CONSTRAINT extracted_fields_submission_id_fkey;
ALTER TABLE extracted_fields ADD CONSTRAINT extracted_fields_submission_id_fkey
    FOREIGN KEY (company_id, submission_id) REFERENCES submissions (company_id, id)
    MATCH SIMPLE ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE extracted_fields DROP CONSTRAINT extracted_fields_document_id_fkey;
ALTER TABLE extracted_fields ADD CONSTRAINT extracted_fields_document_id_fkey
    FOREIGN KEY (company_id, document_id) REFERENCES documents (company_id, id)
    MATCH SIMPLE ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE extracted_fields DROP CONSTRAINT extracted_fields_reviewed_by_fkey;
ALTER TABLE extracted_fields ADD CONSTRAINT extracted_fields_reviewed_by_fkey
    FOREIGN KEY (company_id, reviewed_by) REFERENCES staff (company_id, id)
    MATCH SIMPLE ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE evaluations DROP CONSTRAINT evaluations_job_id_fkey;
ALTER TABLE evaluations ADD CONSTRAINT evaluations_job_id_fkey
    FOREIGN KEY (company_id, job_id) REFERENCES analysis_jobs (company_id, id)
    MATCH SIMPLE ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE evaluations DROP CONSTRAINT evaluations_rule_version_id_fkey;
ALTER TABLE evaluations ADD CONSTRAINT evaluations_rule_version_id_fkey
    FOREIGN KEY (company_id, rule_version_id) REFERENCES rule_versions (company_id, id)
    MATCH SIMPLE ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE evaluation_items DROP CONSTRAINT evaluation_items_evaluation_id_fkey;
ALTER TABLE evaluation_items ADD CONSTRAINT evaluation_items_evaluation_id_fkey
    FOREIGN KEY (company_id, evaluation_id) REFERENCES evaluations (company_id, id)
    MATCH SIMPLE ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE evaluation_items DROP CONSTRAINT evaluation_items_rule_item_id_fkey;
ALTER TABLE evaluation_items ADD CONSTRAINT evaluation_items_rule_item_id_fkey
    FOREIGN KEY (company_id, rule_item_id) REFERENCES rule_items (company_id, id)
    MATCH SIMPLE ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE evaluation_items DROP CONSTRAINT evaluation_items_document_id_fkey;
ALTER TABLE evaluation_items ADD CONSTRAINT evaluation_items_document_id_fkey
    FOREIGN KEY (company_id, document_id) REFERENCES documents (company_id, id)
    MATCH SIMPLE ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE decisions DROP CONSTRAINT decisions_application_id_fkey;
ALTER TABLE decisions ADD CONSTRAINT decisions_application_id_fkey
    FOREIGN KEY (company_id, application_id) REFERENCES applications (company_id, id)
    MATCH SIMPLE ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE decisions DROP CONSTRAINT decisions_evaluation_id_fkey;
ALTER TABLE decisions ADD CONSTRAINT decisions_evaluation_id_fkey
    FOREIGN KEY (company_id, evaluation_id) REFERENCES evaluations (company_id, id)
    MATCH SIMPLE ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE decisions DROP CONSTRAINT decisions_decided_by_fkey;
ALTER TABLE decisions ADD CONSTRAINT decisions_decided_by_fkey
    FOREIGN KEY (company_id, decided_by) REFERENCES staff (company_id, id)
    MATCH SIMPLE ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE openings DROP CONSTRAINT openings_code_key;
ALTER TABLE openings ADD CONSTRAINT openings_company_id_code_key UNIQUE (company_id, code);
ALTER TABLE mail_templates DROP CONSTRAINT mail_templates_hire_type_version_no_key;
ALTER TABLE mail_templates ADD CONSTRAINT mail_templates_company_id_hire_type_version_no_key
    UNIQUE (company_id, hire_type, version_no);

DROP INDEX idx_staff_openings_opening_id;

DROP INDEX idx_rule_versions_saved_by;

DROP INDEX idx_survey_versions_saved_by;

DROP INDEX idx_mail_templates_saved_by;

DROP INDEX idx_survey_drafts_saved_by;

DROP INDEX idx_survey_routes_opening_id;

DROP INDEX idx_survey_mail_versions_source_template_id;

DROP INDEX idx_survey_mail_versions_saved_by;

DROP INDEX idx_responses_route_id;

DROP INDEX idx_answers_question_id;

DROP INDEX idx_answers_option_id;

DROP INDEX idx_operation_logs_actor_id;

DROP INDEX idx_operation_logs_response_id;

DROP INDEX idx_mail_deliveries_survey_mail_version_id;

DROP INDEX idx_analysis_jobs_submission_id;

DROP INDEX idx_extracted_fields_document_id;

DROP INDEX idx_extracted_fields_reviewed_by;

DROP INDEX idx_evaluations_rule_version_id;

DROP INDEX idx_evaluation_items_rule_item_id;

DROP INDEX idx_evaluation_items_document_id;

DROP INDEX idx_decisions_application_id;

DROP INDEX idx_decisions_evaluation_id;

DROP INDEX idx_decisions_decided_by;

CREATE INDEX idx_staff_openings_company_staff_id ON staff_openings (company_id, staff_id);

CREATE INDEX idx_staff_openings_company_opening_id ON staff_openings (company_id, opening_id);

CREATE INDEX idx_rule_versions_company_opening_id ON rule_versions (company_id, opening_id);

CREATE INDEX idx_rule_versions_company_saved_by ON rule_versions (company_id, saved_by);

CREATE INDEX idx_survey_versions_company_survey_id ON survey_versions (company_id, survey_id);

CREATE INDEX idx_survey_versions_company_saved_by ON survey_versions (company_id, saved_by);

CREATE INDEX idx_mail_templates_company_saved_by ON mail_templates (company_id, saved_by);

CREATE INDEX idx_survey_drafts_company_survey_id ON survey_drafts (company_id, survey_id);

CREATE INDEX idx_survey_drafts_company_saved_by ON survey_drafts (company_id, saved_by);

CREATE INDEX idx_rule_items_company_rule_version_id ON rule_items (company_id, rule_version_id);

CREATE INDEX idx_survey_routes_company_survey_version_id ON survey_routes (company_id, survey_version_id);

CREATE INDEX idx_survey_routes_company_opening_id ON survey_routes (company_id, opening_id);

CREATE INDEX idx_questions_company_survey_version_id ON questions (company_id, survey_version_id);

CREATE INDEX idx_survey_mail_versions_company_survey_id ON survey_mail_versions (company_id, survey_id);

CREATE INDEX idx_survey_mail_versions_company_source_template_id ON survey_mail_versions (company_id, source_template_id);

CREATE INDEX idx_survey_mail_versions_company_saved_by ON survey_mail_versions (company_id, saved_by);

CREATE INDEX idx_question_options_company_question_id ON question_options (company_id, question_id);

CREATE INDEX idx_responses_company_route_id ON responses (company_id, route_id);

CREATE INDEX idx_answers_company_response_id ON answers (company_id, response_id);

CREATE INDEX idx_answers_company_question_id ON answers (company_id, question_id);

CREATE INDEX idx_answers_company_option_id ON answers (company_id, option_id);

CREATE INDEX idx_applications_company_response_id ON applications (company_id, response_id);

CREATE INDEX idx_operation_logs_company_actor_id ON operation_logs (company_id, actor_id);

CREATE INDEX idx_operation_logs_company_response_id ON operation_logs (company_id, response_id);

CREATE INDEX idx_submissions_company_application_id ON submissions (company_id, application_id);

CREATE INDEX idx_documents_company_submission_id ON documents (company_id, submission_id);

CREATE INDEX idx_mail_deliveries_company_response_id ON mail_deliveries (company_id, response_id);

CREATE INDEX idx_mail_deliveries_company_submission_id ON mail_deliveries (company_id, submission_id);

CREATE INDEX idx_mail_deliveries_company_survey_mail_version_id ON mail_deliveries (company_id, survey_mail_version_id);

CREATE INDEX idx_analysis_jobs_company_submission_id ON analysis_jobs (company_id, submission_id);

CREATE INDEX idx_extracted_fields_company_submission_id ON extracted_fields (company_id, submission_id);

CREATE INDEX idx_extracted_fields_company_document_id ON extracted_fields (company_id, document_id);

CREATE INDEX idx_extracted_fields_company_reviewed_by ON extracted_fields (company_id, reviewed_by);

CREATE INDEX idx_evaluations_company_job_id ON evaluations (company_id, job_id);

CREATE INDEX idx_evaluations_company_rule_version_id ON evaluations (company_id, rule_version_id);

CREATE INDEX idx_evaluation_items_company_evaluation_id ON evaluation_items (company_id, evaluation_id);

CREATE INDEX idx_evaluation_items_company_rule_item_id ON evaluation_items (company_id, rule_item_id);

CREATE INDEX idx_evaluation_items_company_document_id ON evaluation_items (company_id, document_id);

CREATE INDEX idx_decisions_company_application_id ON decisions (company_id, application_id);

CREATE INDEX idx_decisions_company_evaluation_id ON decisions (company_id, evaluation_id);

CREATE INDEX idx_decisions_company_decided_by ON decisions (company_id, decided_by);

COMMENT ON TABLE companies IS '企業テーブル';
COMMENT ON COLUMN companies.id IS '企業ID: GENERATED ALWAYS AS IDENTITY で自動採番。企業の識別子。';
COMMENT ON COLUMN companies.code IS '企業コード: UNIQUE (code)。 システム全体で一意の業務用コード。初期登録スクリプトで指定する。';
COMMENT ON COLUMN companies.name IS '企業名: 画面表示・メール差し込みに使用する企業名。';
COMMENT ON COLUMN companies.is_active IS '有効フラグ: FALSEの場合は所属担当者のログイン・既存セッションでの操作、公開受付・応募編集、新規メール送信・解析実行を停止する。';
COMMENT ON COLUMN companies.created_at IS '登録日時: 企業登録スクリプトで登録時刻を設定する。企業と初期リーダーを同一トランザクションで作成する。';
COMMENT ON TABLE staff IS '採用担当者テーブル';
COMMENT ON COLUMN staff.id IS '担当者ID: GENERATED ALWAYS AS IDENTITY で自動採番。 複合参照用：UNIQUE (company_id, id)。';
COMMENT ON COLUMN staff.name IS '担当者名';
COMMENT ON COLUMN staff.email IS 'メールアドレス: システム全体で一意。1アカウントは1企業に所属。登録・ログイン時の表記正規化を統一する。';
COMMENT ON COLUMN staff.password_hash IS 'パスワードハッシュ: ソルトを含むハッシュ文字列を保存する。初期発行スクリプトもアプリと同じ方式で生成し、平文パスワードを保存・記録しない。';
COMMENT ON COLUMN staff.role IS '権限: admin＝自社の採用担当者リーダー、recruiter＝採用担当者、viewer＝閲覧のみ。権限は所属企業内に限定。初期リーダーは運営スクリプトで作成。';
COMMENT ON COLUMN staff.is_active IS '有効フラグ: 無効時はログイン・認証済み操作を不可とする。companies.is_activeも併せて確認。退任後も履歴の参照先を残す。';
COMMENT ON COLUMN staff.company_id IS '企業ID: 外部キー：企業テーブル｜companies.id 所属企業。NOT NULL。登録後の変更は禁止。';
COMMENT ON TABLE openings IS '募集テーブル';
COMMENT ON COLUMN openings.id IS '募集ID: GENERATED ALWAYS AS IDENTITY で自動採番。 複合参照用：UNIQUE (company_id, id)。';
COMMENT ON COLUMN openings.code IS '募集コード: UNIQUE (company_id, code)。企業内で一意の業務用コード。他社との重複は許可する。';
COMMENT ON COLUMN openings.job_title IS '募集職種: 応募画面・候補者一覧に表示する職種名。';
COMMENT ON COLUMN openings.hire_type IS '採用区分: graduate＝新卒、career＝中途。募集ごとに固定。';
COMMENT ON COLUMN openings.contact_info IS '問い合わせ先: 期間外に応募リンクを開いた場合の案内先。';
COMMENT ON COLUMN openings.status IS '募集状態: open＝募集中、closed＝募集終了。CHECKでこの2値に限定。募集一覧の状態表示に使用。初期値はclosedとし、募集開始・終了時に更新する。';
COMMENT ON COLUMN openings.recruitment_year IS '募集年度: 採用対象の年度を西暦4桁で保存（例：2026）。CHECK：1000～9999。登録年から自動決定せず、募集ごとに指定。採用区分・職種名と組み合わせて表示する。';
COMMENT ON COLUMN openings.company_id IS '企業ID: 外部キー：企業テーブル｜companies.id 所属企業。NOT NULL。登録後の変更は禁止。';
COMMENT ON TABLE surveys IS 'アンケートテーブル';
COMMENT ON COLUMN surveys.id IS 'アンケートID: GENERATED ALWAYS AS IDENTITY で自動採番。初回一時保存でも発行し、未完成入力はsurvey_draftsで保持。 複合参照用：UNIQUE (company_id, id)。';
COMMENT ON COLUMN surveys.public_code IS '公開コード: 発行時に設定する一意のコード。再表示時も同じURLを使用。';
COMMENT ON COLUMN surveys.published_at IS '初回発行日時: 未発行時はNULL。設問編集では更新しない。';
COMMENT ON COLUMN surveys.is_open IS '公開状態: 初回FALSE。内容と対象区分のメールが揃ったリンク発行時に公開する。回答時は公開状態と最新確定版の期間を確認。';
COMMENT ON COLUMN surveys.company_id IS '企業ID: 外部キー：企業テーブル｜companies.id 所属企業。NOT NULL。登録後の変更は禁止。';
COMMENT ON TABLE staff_openings IS '担当募集テーブル';
COMMENT ON COLUMN staff_openings.id IS '割当ID: GENERATED ALWAYS AS IDENTITY で自動採番。 複合参照用：UNIQUE (company_id, id)。';
COMMENT ON COLUMN staff_openings.staff_id IS '担当者ID: 複合FK：(company_id, staff_id) → staff (company_id, id)。 担当者IDと募集IDの組合せは一意。';
COMMENT ON COLUMN staff_openings.opening_id IS '募集ID: 複合FK：(company_id, opening_id) → openings (company_id, id)。 操作の可否は担当者の権限と合わせて判定。';
COMMENT ON COLUMN staff_openings.company_id IS '企業ID: 外部キー：企業テーブル｜companies.id 所属企業。NOT NULL。登録後の変更は禁止。';
COMMENT ON TABLE rule_versions IS '評価基準版テーブル';
COMMENT ON COLUMN rule_versions.id IS '基準版ID: GENERATED ALWAYS AS IDENTITY で自動採番。 複合参照用：UNIQUE (company_id, id)。';
COMMENT ON COLUMN rule_versions.opening_id IS '募集ID: 複合FK：(company_id, opening_id) → openings (company_id, id)。';
COMMENT ON COLUMN rule_versions.version_no IS '版番号: 募集内で一意の正整数。新規保存時に繰り上げる。';
COMMENT ON COLUMN rule_versions.version_label IS '版表示名: 画面に表示する版。例 v1.2。';
COMMENT ON COLUMN rule_versions.requirements IS '募集要項: 基準保存時の募集要項。AI適合度の評価にも使用。';
COMMENT ON COLUMN rule_versions.saved_by IS '保存者ID: 複合FK：(company_id, saved_by) → staff (company_id, id)。';
COMMENT ON COLUMN rule_versions.saved_at IS '保存日時: 同じ募集の保存済み最新版を以降の評価に適用。';
COMMENT ON COLUMN rule_versions.company_id IS '企業ID: 外部キー：企業テーブル｜companies.id 所属企業。NOT NULL。登録後の変更は禁止。';
COMMENT ON TABLE survey_versions IS 'アンケート設定版テーブル';
COMMENT ON COLUMN survey_versions.id IS '設定版ID: GENERATED ALWAYS AS IDENTITY で自動採番。 複合参照用：UNIQUE (company_id, id)。';
COMMENT ON COLUMN survey_versions.survey_id IS 'アンケートID: 複合FK：(company_id, survey_id) → surveys (company_id, id)。';
COMMENT ON COLUMN survey_versions.version_no IS '版番号: アンケート内で一意。編集保存時に新しい版を追加。';
COMMENT ON COLUMN survey_versions.title IS 'アンケート名: 画面S28・S47の上限案。';
COMMENT ON COLUMN survey_versions.starts_at IS '申込開始日時: 日本時間で受付を開始する日時。';
COMMENT ON COLUMN survey_versions.ends_at IS '申込終了日時: 開始日時より後。同じアンケートの最新設定版の期限を、既回答者・既応募者にも適用する。';
COMMENT ON COLUMN survey_versions.intent_default IS '希望欄の初期選択: 回答画面の初期表示。未選択でも回答できる。';
COMMENT ON COLUMN survey_versions.saved_by IS '保存者ID: 複合FK：(company_id, saved_by) → staff (company_id, id)。';
COMMENT ON COLUMN survey_versions.saved_at IS '保存日時';
COMMENT ON COLUMN survey_versions.company_id IS '企業ID: 外部キー：企業テーブル｜companies.id 所属企業。NOT NULL。登録後の変更は禁止。';
COMMENT ON TABLE mail_templates IS '案内メール雛形版テーブル';
COMMENT ON COLUMN mail_templates.id IS '雛形版ID: GENERATED ALWAYS AS IDENTITY で自動採番。 複合参照用：UNIQUE (company_id, id)。';
COMMENT ON COLUMN mail_templates.hire_type IS '採用区分: graduate＝新卒、career＝中途。';
COMMENT ON COLUMN mail_templates.version_no IS '版番号: UNIQUE (company_id, hire_type, version_no)。企業・採用区分ごとの版番号。アンケート別メール作成時にコピーする再利用テンプレート。実送信の文面として直接参照しない。';
COMMENT ON COLUMN mail_templates.subject IS '件名: 画面S32・S33の上限案。';
COMMENT ON COLUMN mail_templates.body IS '本文: {{申込期限}}・{{応募リンク}}を含む差し込み前の文章。日時選択は表示確認用で、選択日時を固定値として保存しない。';
COMMENT ON COLUMN mail_templates.saved_by IS '保存者ID: 複合FK：(company_id, saved_by) → staff (company_id, id)。';
COMMENT ON COLUMN mail_templates.saved_at IS '保存日時';
COMMENT ON COLUMN mail_templates.company_id IS '企業ID: 外部キー：企業テーブル｜companies.id 所属企業。NOT NULL。登録後の変更は禁止。';
COMMENT ON TABLE survey_drafts IS 'アンケート下書きテーブル';
COMMENT ON COLUMN survey_drafts.id IS '下書きID: GENERATED ALWAYS AS IDENTITY で自動採番。 複合参照用：UNIQUE (company_id, id)。';
COMMENT ON COLUMN survey_drafts.survey_id IS 'アンケートID: 複合FK：(company_id, survey_id) → surveys (company_id, id)。 一意。アンケートごとに1行。初回一時保存で未公開のsurveys行を作成。';
COMMENT ON COLUMN survey_drafts.content IS '入力途中の内容: 基本設定・固定項目・対応募集・質問・選択肢、区分別メールの入力と元テンプレート版IDを保持。未入力・形式不備を許容。対象部分のみ更新し、他の下書きを保持。 JSON内の募集ID・元テンプレート版IDも保存・確定時に自社所属を検証する。';
COMMENT ON COLUMN survey_drafts.saved_by IS '保存者ID: 複合FK：(company_id, saved_by) → staff (company_id, id)。';
COMMENT ON COLUMN survey_drafts.saved_at IS '保存日時: 確定保存した部分のみ下書きから除去。空なら行を削除。公開・受付・送信には使わない。';
COMMENT ON COLUMN survey_drafts.company_id IS '企業ID: 外部キー：企業テーブル｜companies.id 所属企業。NOT NULL。登録後の変更は禁止。';
COMMENT ON TABLE rule_items IS '評価基準項目テーブル';
COMMENT ON COLUMN rule_items.id IS '基準項目ID: GENERATED ALWAYS AS IDENTITY で自動採番。 複合参照用：UNIQUE (company_id, id)。';
COMMENT ON COLUMN rule_items.rule_version_id IS '基準版ID: 複合FK：(company_id, rule_version_id) → rule_versions (company_id, id)。';
COMMENT ON COLUMN rule_items.item_code IS '項目コード: 基準版内で一意。例 skill、experience、qualification、ai_fit。';
COMMENT ON COLUMN rule_items.item_name IS '項目名: 例「必要経験年数」「必須資格」「スキル一致」。';
COMMENT ON COLUMN rule_items.item_type IS '項目区分: required＝必須条件、score＝加点項目。';
COMMENT ON COLUMN rule_items.condition_text IS '判定条件: 判定に用いる条件・尺度。必須条件には入力値を保存。';
COMMENT ON COLUMN rule_items.max_points IS '最大配点: 加点項目のみ必須。0～100の整数。版内の合計は100。';
COMMENT ON COLUMN rule_items.sort_order IS '表示順: 版内の掲載順。1から始める。';
COMMENT ON COLUMN rule_items.company_id IS '企業ID: 外部キー：企業テーブル｜companies.id 所属企業。NOT NULL。登録後の変更は禁止。';
COMMENT ON TABLE survey_routes IS 'アンケート対象募集テーブル';
COMMENT ON COLUMN survey_routes.id IS '対象募集ID: GENERATED ALWAYS AS IDENTITY で自動採番。 複合参照用：UNIQUE (company_id, id)。';
COMMENT ON COLUMN survey_routes.survey_version_id IS '設定版ID: 複合FK：(company_id, survey_version_id) → survey_versions (company_id, id)。';
COMMENT ON COLUMN survey_routes.opening_id IS '募集ID: 複合FK：(company_id, opening_id) → openings (company_id, id)。 同じ設定版で同一採用区分の募集は1件まで。区分は募集から取得。';
COMMENT ON COLUMN survey_routes.company_id IS '企業ID: 外部キー：企業テーブル｜companies.id 所属企業。NOT NULL。登録後の変更は禁止。';
COMMENT ON TABLE questions IS 'アンケート設問テーブル';
COMMENT ON COLUMN questions.id IS '設問ID: GENERATED ALWAYS AS IDENTITY で自動採番。 複合参照用：UNIQUE (company_id, id)。';
COMMENT ON COLUMN questions.survey_version_id IS '設定版ID: 複合FK：(company_id, survey_version_id) → survey_versions (company_id, id)。';
COMMENT ON COLUMN questions.prompt IS '設問文: 編集時は新しい版に設問を登録し、以前の設問を残す。';
COMMENT ON COLUMN questions.answer_type IS '回答形式: text＝記述式、choice＝単一選択式。';
COMMENT ON COLUMN questions.is_required IS '回答必須: TRUEは送信時に回答が必要。';
COMMENT ON COLUMN questions.sort_order IS '表示順: 同じ設定版内で一意。1から始める。';
COMMENT ON COLUMN questions.company_id IS '企業ID: 外部キー：企業テーブル｜companies.id 所属企業。NOT NULL。登録後の変更は禁止。';
COMMENT ON TABLE survey_mail_versions IS 'アンケート別メール版テーブル';
COMMENT ON COLUMN survey_mail_versions.id IS '送信用メール版ID: GENERATED ALWAYS AS IDENTITY で自動採番。 複合参照用：UNIQUE (company_id, id)。';
COMMENT ON COLUMN survey_mail_versions.survey_id IS 'アンケートID: 複合FK：(company_id, survey_id) → surveys (company_id, id)。';
COMMENT ON COLUMN survey_mail_versions.hire_type IS '採用区分: graduate＝新卒、career＝中途。対象アンケートの対応募集の区分に限定。';
COMMENT ON COLUMN survey_mail_versions.version_no IS '版番号: (survey_id, hire_type, version_no)で一意。確定保存ごとに追加。実送信は同じアンケート・区分の最新確定版。';
COMMENT ON COLUMN survey_mail_versions.source_template_id IS '元テンプレート版ID: 複合FK：(company_id, source_template_id) → mail_templates (company_id, id)。 コピー元の版。直接入力時はNULL。コピー後の変更は連動しない。';
COMMENT ON COLUMN survey_mail_versions.subject IS '件名: アンケート別に編集した確定件名。';
COMMENT ON COLUMN survey_mail_versions.body IS '本文: {{申込期限}}・{{応募リンク}}を含む差し込み前の確定本文。実送信で対象アンケートの最新期限と回答者用URLを差し込む。';
COMMENT ON COLUMN survey_mail_versions.saved_by IS '保存者ID: 複合FK：(company_id, saved_by) → staff (company_id, id)。';
COMMENT ON COLUMN survey_mail_versions.saved_at IS '保存日時';
COMMENT ON COLUMN survey_mail_versions.company_id IS '企業ID: 外部キー：企業テーブル｜companies.id 所属企業。NOT NULL。登録後の変更は禁止。';
COMMENT ON TABLE question_options IS '設問選択肢テーブル';
COMMENT ON COLUMN question_options.id IS '選択肢ID: GENERATED ALWAYS AS IDENTITY で自動採番。 複合参照用：UNIQUE (company_id, id)。';
COMMENT ON COLUMN question_options.question_id IS '設問ID: 複合FK：(company_id, question_id) → questions (company_id, id)。 選択式の設問のみ登録できる。';
COMMENT ON COLUMN question_options.label IS '選択肢名: 空欄不可。';
COMMENT ON COLUMN question_options.sort_order IS '表示順: 同じ設問内で一意。1から始める。';
COMMENT ON COLUMN question_options.company_id IS '企業ID: 外部キー：企業テーブル｜companies.id 所属企業。NOT NULL。登録後の変更は禁止。';
COMMENT ON TABLE responses IS 'アンケート回答テーブル';
COMMENT ON COLUMN responses.id IS '回答ID: GENERATED ALWAYS AS IDENTITY で自動採番。 複合参照用：UNIQUE (company_id, id)。';
COMMENT ON COLUMN responses.route_id IS '対象募集ID: 複合FK：(company_id, route_id) → survey_routes (company_id, id)。 回答時の設問版・募集・採用区分を特定。期間判定は同じアンケートの最新設定版を参照。';
COMMENT ON COLUMN responses.email IS '回答メールアドレス: 回答時の値を保存。応募情報の編集とは独立。';
COMMENT ON COLUMN responses.wants_selection IS '選考希望: 回答者の最終選択を明示保存。TRUEの場合のみ応募案内の対象。';
COMMENT ON COLUMN responses.answered_at IS '回答日時: 送信時に期間内であることを再確認。';
COMMENT ON COLUMN responses.request_key IS '送信識別子: 一意。同じ操作の再送は既存の回答を返す。';
COMMENT ON COLUMN responses.entry_key IS '応募リンク識別子: 選考希望者に発行する一意の不透明な識別子。対象募集を固定。';
COMMENT ON COLUMN responses.company_id IS '企業ID: 外部キー：企業テーブル｜companies.id 所属企業。NOT NULL。登録後の変更は禁止。';
COMMENT ON TABLE answers IS 'アンケート回答明細テーブル';
COMMENT ON COLUMN answers.id IS '回答明細ID: GENERATED ALWAYS AS IDENTITY で自動採番。 複合参照用：UNIQUE (company_id, id)。';
COMMENT ON COLUMN answers.response_id IS '回答ID: 複合FK：(company_id, response_id) → responses (company_id, id)。 回答IDと設問IDの組合せは一意。';
COMMENT ON COLUMN answers.question_id IS '設問ID: 複合FK：(company_id, question_id) → questions (company_id, id)。 回答と同じ設定版の設問に限定。';
COMMENT ON COLUMN answers.text_value IS '記述回答: 記述式はこの列に保存。任意質問の未回答は行を作らない。';
COMMENT ON COLUMN answers.option_id IS '選択肢ID: 複合FK：(company_id, option_id) → question_options (company_id, id)。 選択式はこの列に保存。同じ設問の選択肢に限定。';
COMMENT ON COLUMN answers.company_id IS '企業ID: 外部キー：企業テーブル｜companies.id 所属企業。NOT NULL。登録後の変更は禁止。';
COMMENT ON TABLE applications IS '応募テーブル';
COMMENT ON COLUMN applications.id IS '応募ID: GENERATED ALWAYS AS IDENTITY で自動採番。 複合参照用：UNIQUE (company_id, id)。';
COMMENT ON COLUMN applications.response_id IS '回答ID: 複合FK：(company_id, response_id) → responses (company_id, id)。 一意。1回答につき1応募。見送り時は対応する回答・回答明細も破棄する。';
COMMENT ON COLUMN applications.receipt_no IS '受付番号: システム全体で一意。例 APP-024。再送信後も同じ番号を使用。企業別の連番には変更しない。';
COMMENT ON COLUMN applications.consented_at IS '初回同意日時: 書類の選考利用に同意した初回受付時に記録。';
COMMENT ON COLUMN applications.access_hash IS '受付確認キーのハッシュ: 一意。受付内容の閲覧・編集リンクを照合するために使用。';
COMMENT ON COLUMN applications.created_at IS '初回受付日時: 候補者詳細の応募日として表示。';
COMMENT ON COLUMN applications.purge_status IS '破棄状態: active＝利用中、deleting＝破棄中。見送り確定時に切替。削除失敗時は再試行し、完了時は応募行も物理削除。';
COMMENT ON COLUMN applications.company_id IS '企業ID: 外部キー：企業テーブル｜companies.id 所属企業。NOT NULL。登録後の変更は禁止。';
COMMENT ON TABLE operation_logs IS '操作・処理ログテーブル';
COMMENT ON COLUMN operation_logs.id IS 'ログID: GENERATED ALWAYS AS IDENTITY で自動採番。 複合参照用：UNIQUE (company_id, id)。';
COMMENT ON COLUMN operation_logs.logged_at IS '記録日時: 操作・処理を実行した時刻。';
COMMENT ON COLUMN operation_logs.actor_id IS '操作者ID: 複合FK：(company_id, actor_id) → staff (company_id, id)。 担当者操作の場合に設定。自動処理はNULL。';
COMMENT ON COLUMN operation_logs.event_name IS '操作・処理名: 例 staff.disable、analysis.retry、mail.failed。';
COMMENT ON COLUMN operation_logs.target_type IS '対象種別: 対象テーブルの物理名称。対象IDと組み合わせる。';
COMMENT ON COLUMN operation_logs.target_id IS '対象ID: 対象レコードの主キー。複数種類を指す論理参照。target_typeと組み合わせて同じ企業の対象であることをアプリで検証する。';
COMMENT ON COLUMN operation_logs.outcome IS '結果: success＝成功、failure＝失敗、skipped＝見送り。';
COMMENT ON COLUMN operation_logs.detail IS '記録内容: 変更内容や失敗段階・理由。パスワードや書類本文は記録しない。';
COMMENT ON COLUMN operation_logs.response_id IS '対象回答ID: 複合FK：(company_id, response_id) → responses (company_id, id)。 応募・書類・解析・メール等の関連ログに付与。対象者の破棄時にこのIDで一括削除。';
COMMENT ON COLUMN operation_logs.company_id IS '企業ID: 外部キー：企業テーブル｜companies.id 所属企業。NOT NULL。登録後の変更は禁止。';
COMMENT ON TABLE submissions IS '応募版テーブル';
COMMENT ON COLUMN submissions.id IS '応募版ID: GENERATED ALWAYS AS IDENTITY で自動採番。 複合参照用：UNIQUE (company_id, id)。';
COMMENT ON COLUMN submissions.application_id IS '応募ID: 複合FK：(company_id, application_id) → applications (company_id, id)。';
COMMENT ON COLUMN submissions.version_no IS '版番号: 応募内で一意。最大の版番号が最新。';
COMMENT ON COLUMN submissions.full_name IS '応募者氏名: 画面S10・S22。送信時は必須。';
COMMENT ON COLUMN submissions.email IS '応募メールアドレス: 初回は入口の入力値を引き継ぐ。再送信時は変更可。';
COMMENT ON COLUMN submissions.phone IS '電話番号: 数字とハイフン。先頭の0を保持。';
COMMENT ON COLUMN submissions.submitted_at IS '送信日時: 最新版の値が最終送信日時。確認や編集開始では更新しない。';
COMMENT ON COLUMN submissions.request_key IS '送信識別子: 一意。同じ送信の再試行で版・予約を追加しない。';
COMMENT ON COLUMN submissions.company_id IS '企業ID: 外部キー：企業テーブル｜companies.id 所属企業。NOT NULL。登録後の変更は禁止。';
COMMENT ON TABLE documents IS '提出書類テーブル';
COMMENT ON COLUMN documents.id IS '書類ID: GENERATED ALWAYS AS IDENTITY で自動採番。 複合参照用：UNIQUE (company_id, id)。';
COMMENT ON COLUMN documents.submission_id IS '応募版ID: 複合FK：(company_id, submission_id) → submissions (company_id, id)。 応募版と書類種別の組合せは一意。';
COMMENT ON COLUMN documents.doc_type IS '書類種別: resume＝履歴書、career＝職務経歴書。中途は両方必須。';
COMMENT ON COLUMN documents.file_name IS '元ファイル名: 提出者が選択したファイル名。';
COMMENT ON COLUMN documents.storage_key IS '保存先キー: 原本の保存先。companies/{company_id}/applications/{application_id}/... の形式で企業別に分離する。取得・削除時も所属企業と権限を照合する。見送り確定時は全応募版の原本・プレビュー・一時ファイルも削除する。';
COMMENT ON COLUMN documents.size_bytes IS 'ファイルサイズ: バイト数。各PDFは10MB以下、読取可能なことを受付時に確認。';
COMMENT ON COLUMN documents.content_type IS '形式: application/pdf。新卒の職務経歴書は未提出可。';
COMMENT ON COLUMN documents.company_id IS '企業ID: 外部キー：企業テーブル｜companies.id 所属企業。NOT NULL。登録後の変更は禁止。';
COMMENT ON TABLE mail_deliveries IS 'メール送信履歴テーブル';
COMMENT ON COLUMN mail_deliveries.id IS '送信ID: GENERATED ALWAYS AS IDENTITY で自動採番。 複合参照用：UNIQUE (company_id, id)。';
COMMENT ON COLUMN mail_deliveries.mail_type IS 'メール種別: guide＝応募案内、receipt＝初回または更新受付。';
COMMENT ON COLUMN mail_deliveries.response_id IS '回答ID: 複合FK：(company_id, response_id) → responses (company_id, id)。 案内時のみ必須。1回答に案内1件。希望なしは送信行を作らない。';
COMMENT ON COLUMN mail_deliveries.submission_id IS '応募版ID: 複合FK：(company_id, submission_id) → submissions (company_id, id)。 受付時のみ必須。受付メールは1応募版に1件。';
COMMENT ON COLUMN mail_deliveries.survey_mail_version_id IS '送信用メール版ID: 複合FK：(company_id, survey_mail_version_id) → survey_mail_versions (company_id, id)。 案内の使用版。回答元と同じアンケート・区分に限定。設定不備で保留中はNULL可。受付メールはNULL。';
COMMENT ON COLUMN mail_deliveries.recipient IS '宛先: 案内は回答メール、受付は該当応募版のメール。';
COMMENT ON COLUMN mail_deliveries.subject IS '確定件名: 差し込み完了後の件名を送信前に保存。';
COMMENT ON COLUMN mail_deliveries.body IS '確定本文: 差し込み後の本文。送信時点のURL・期限を保持。';
COMMENT ON COLUMN mail_deliveries.deadline_at IS '案内した期限: 送信した本文の期限を履歴として保持。受付の可否はアンケートの最新期限で判定。再送時は最新期限で差し込み直す。';
COMMENT ON COLUMN mail_deliveries.status IS '送信状態: queued＝待機、held＝保留、sent＝成功、failed＝失敗。';
COMMENT ON COLUMN mail_deliveries.attempts IS '試行回数: 再送時は同じ送信IDで加算。';
COMMENT ON COLUMN mail_deliveries.attempted_at IS '最終試行日時';
COMMENT ON COLUMN mail_deliveries.sent_at IS '送信成功日時: 送信成功時に設定。成功済みは再送しない。';
COMMENT ON COLUMN mail_deliveries.error_reason IS '失敗理由: 変数未解決、送信サービス障害などを記録。';
COMMENT ON COLUMN mail_deliveries.company_id IS '企業ID: 外部キー：企業テーブル｜companies.id 所属企業。NOT NULL。登録後の変更は禁止。';
COMMENT ON TABLE analysis_jobs IS '解析処理テーブル';
COMMENT ON COLUMN analysis_jobs.id IS '処理ID: GENERATED ALWAYS AS IDENTITY で自動採番。 複合参照用：UNIQUE (company_id, id)。';
COMMENT ON COLUMN analysis_jobs.submission_id IS '応募版ID: 複合FK：(company_id, submission_id) → submissions (company_id, id)。';
COMMENT ON COLUMN analysis_jobs.job_type IS '処理種別: analyze＝送信後解析、recalc＝担当者修正後の再計算。';
COMMENT ON COLUMN analysis_jobs.input_revision IS '対象抽出世代: 初回は0。修正時は確認済みの抽出世代を指定。';
COMMENT ON COLUMN analysis_jobs.run_after IS '実行予定日時: 送信後解析は送信成功の2時間後。担当者の修正は即時。';
COMMENT ON COLUMN analysis_jobs.status IS '状態: queued＝予約、running＝実行中、done＝完了、failed＝失敗、obsolete＝旧版。';
COMMENT ON COLUMN analysis_jobs.attempts IS '試行回数: 同じ処理の再実行ごとに加算。';
COMMENT ON COLUMN analysis_jobs.last_run_at IS '最終実行日時';
COMMENT ON COLUMN analysis_jobs.finished_at IS '終了日時';
COMMENT ON COLUMN analysis_jobs.error_reason IS '失敗理由: OCR失敗、APIタイムアウトなど。各試行は操作・処理ログに記録。';
COMMENT ON COLUMN analysis_jobs.company_id IS '企業ID: 外部キー：企業テーブル｜companies.id 所属企業。NOT NULL。登録後の変更は禁止。';
COMMENT ON TABLE extracted_fields IS '抽出項目履歴テーブル';
COMMENT ON COLUMN extracted_fields.id IS '抽出履歴ID: GENERATED ALWAYS AS IDENTITY で自動採番。 複合参照用：UNIQUE (company_id, id)。';
COMMENT ON COLUMN extracted_fields.submission_id IS '応募版ID: 複合FK：(company_id, submission_id) → submissions (company_id, id)。';
COMMENT ON COLUMN extracted_fields.field_key IS '項目識別子: 同一項目の追跡用。例 skill_1、qualification_1、qualification_1_date。';
COMMENT ON COLUMN extracted_fields.revision_no IS '抽出世代: 初回0。応募版内の修正ごとに加算。応募版・項目識別子・世代で一意。';
COMMENT ON COLUMN extracted_fields.field_type IS '項目種別: 学歴、経験年数、資格、取得年月、スキル、自由記述など。';
COMMENT ON COLUMN extracted_fields.document_id IS '書類ID: 複合FK：(company_id, document_id) → documents (company_id, id)。 根拠があるときは同じ応募版の原本を指定。';
COMMENT ON COLUMN extracted_fields.page_no IS '根拠ページ: 原本の先頭を1ページとする。';
COMMENT ON COLUMN extracted_fields.source_quote IS '根拠文章: 確認位置を特定できる原文。';
COMMENT ON COLUMN extracted_fields.field_value IS '項目値: 自動抽出値または修正値。記載なし・読取不能はNULL。';
COMMENT ON COLUMN extracted_fields.read_status IS '読取状態: read＝読取済、absent＝記載なし、unreadable＝読取不能。';
COMMENT ON COLUMN extracted_fields.review_status IS '確認状態: pending＝未確認、check＝要確認、verified＝確認済み。';
COMMENT ON COLUMN extracted_fields.reviewed_by IS '確認者ID: 複合FK：(company_id, reviewed_by) → staff (company_id, id)。 原本を確認した担当者。確認済みでは必須。';
COMMENT ON COLUMN extracted_fields.recorded_at IS '記録日時: 確認済みの行は維持し、修正は履歴を追加。';
COMMENT ON COLUMN extracted_fields.company_id IS '企業ID: 外部キー：企業テーブル｜companies.id 所属企業。NOT NULL。登録後の変更は禁止。';
COMMENT ON TABLE evaluations IS '評価結果テーブル';
COMMENT ON COLUMN evaluations.id IS '評価ID: GENERATED ALWAYS AS IDENTITY で自動採番。 複合参照用：UNIQUE (company_id, id)。';
COMMENT ON COLUMN evaluations.job_id IS '処理ID: 複合FK：(company_id, job_id) → analysis_jobs (company_id, id)。 一意。対象の応募版・抽出世代を処理から取得。';
COMMENT ON COLUMN evaluations.rule_version_id IS '基準版ID: 複合FK：(company_id, rule_version_id) → rule_versions (company_id, id)。 対象応募と同じ募集の基準版に限定。';
COMMENT ON COLUMN evaluations.status IS '評価状態: complete＝得点確定、incomplete＝未評価の項目あり。';
COMMENT ON COLUMN evaluations.total_score IS '総合得点: 全加点項目の得点合計。0.00～100.00。未評価があればNULL。';
COMMENT ON COLUMN evaluations.ai_summary IS 'AI要約: 書類内の自己PR・職務内容等の要約。';
COMMENT ON COLUMN evaluations.keywords IS 'キーワード: 評価時に得た表示用キーワード。';
COMMENT ON COLUMN evaluations.ai_status IS '自由記述解析状態: evaluated＝解析済、absent＝記載なし、unverified＝根拠不足。';
COMMENT ON COLUMN evaluations.calculated_at IS '算出日時: 応募版・抽出世代が一致するときに明細と一括確定。';
COMMENT ON COLUMN evaluations.company_id IS '企業ID: 外部キー：企業テーブル｜companies.id 所属企業。NOT NULL。登録後の変更は禁止。';
COMMENT ON TABLE evaluation_items IS '評価結果明細テーブル';
COMMENT ON COLUMN evaluation_items.id IS '評価明細ID: GENERATED ALWAYS AS IDENTITY で自動採番。 複合参照用：UNIQUE (company_id, id)。';
COMMENT ON COLUMN evaluation_items.evaluation_id IS '評価ID: 複合FK：(company_id, evaluation_id) → evaluations (company_id, id)。 評価IDと基準項目IDの組合せは一意。';
COMMENT ON COLUMN evaluation_items.rule_item_id IS '基準項目ID: 複合FK：(company_id, rule_item_id) → rule_items (company_id, id)。 評価結果と同じ基準版の項目を参照。';
COMMENT ON COLUMN evaluation_items.grade IS '評価段階: 加点項目の0～4。未評価時はNULL。0は有効な段階。';
COMMENT ON COLUMN evaluation_items.points IS '項目得点: 最大配点×段階÷4。未評価・必須条件の行はNULL。';
COMMENT ON COLUMN evaluation_items.verdict IS '必須条件の判定: 必須条件のみ。yes＝充足、no＝未充足、unknown＝要確認。';
COMMENT ON COLUMN evaluation_items.reason IS '評価理由: 判定の理由。根拠不足・矛盾の場合も理由を記録。';
COMMENT ON COLUMN evaluation_items.document_id IS '根拠書類ID: 複合FK：(company_id, document_id) → documents (company_id, id)。 対象応募版と一致する原本。';
COMMENT ON COLUMN evaluation_items.source_pages IS '根拠ページ: 例 1–2。原本上の位置を記録。';
COMMENT ON COLUMN evaluation_items.source_quote IS '根拠文章: 使用した原文。根拠が未確認なら評価を確定しない。';
COMMENT ON COLUMN evaluation_items.company_id IS '企業ID: 外部キー：企業テーブル｜companies.id 所属企業。NOT NULL。登録後の変更は禁止。';
COMMENT ON TABLE decisions IS '選考判断履歴テーブル';
COMMENT ON COLUMN decisions.id IS '判断ID: GENERATED ALWAYS AS IDENTITY で自動採番。 複合参照用：UNIQUE (company_id, id)。';
COMMENT ON COLUMN decisions.application_id IS '応募ID: 複合FK：(company_id, application_id) → applications (company_id, id)。 同一応募の編集・判断登録を直列化する単位。';
COMMENT ON COLUMN decisions.evaluation_id IS '評価ID: 複合FK：(company_id, evaluation_id) → evaluations (company_id, id)。 最新の有効な評価に限定。判断時の応募版・基準版を追跡。';
COMMENT ON COLUMN decisions.decision IS '判断区分: advance＝次選考へ、hold＝保留、reject＝見送り。見送りの確定時に対象者の情報の破棄を開始。';
COMMENT ON COLUMN decisions.reason IS '判断理由: 担当者の入力が必須。画面S02の上限。';
COMMENT ON COLUMN decisions.reviewed IS '確認済み: 原本・抽出情報・スコアを確認した場合のみTRUEで登録。';
COMMENT ON COLUMN decisions.decided_by IS '登録者ID: 複合FK：(company_id, decided_by) → staff (company_id, id)。 最終判断を確定した採用担当者。';
COMMENT ON COLUMN decisions.decided_at IS '登録日時: 保留を含む最初の登録以降は応募者による編集・再送信を禁止。';
COMMENT ON COLUMN decisions.company_id IS '企業ID: 外部キー：企業テーブル｜companies.id 所属企業。NOT NULL。登録後の変更は禁止。';

\ir ../init/shared/tenant_security.sql

COMMIT;
