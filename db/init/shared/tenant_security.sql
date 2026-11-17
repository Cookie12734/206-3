-- 初期化SQLと移行SQLから、呼出元のトランザクション内で読み込む。
-- このサブディレクトリはDockerの初期化で直接実行されない。
CREATE SCHEMA app;
REVOKE ALL ON SCHEMA app FROM PUBLIC;

DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'salt_app') THEN
        CREATE ROLE salt_app NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
    END IF;
    IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'salt_app'
               AND (rolsuper OR rolbypassrls OR rolcreatedb OR rolcreaterole OR rolreplication OR rolcanlogin))
       OR EXISTS (SELECT FROM pg_auth_members WHERE member = 'salt_app'::regrole) THEN
        RAISE EXCEPTION 'salt_app must be an unprivileged NOLOGIN role without inherited roles';
    END IF;
END;
$$;

CREATE FUNCTION app.current_company_id()
RETURNS BIGINT LANGUAGE sql STABLE PARALLEL SAFE
SET search_path = pg_catalog
AS $$ SELECT NULLIF(current_setting('app.company_id', true), '')::BIGINT $$;
COMMENT ON FUNCTION app.current_company_id() IS
    '信頼できるサーバーがトランザクション内に設定した企業ID。未設定・終了後の空文字はNULL。認証を行う関数ではない。';

CREATE FUNCTION app.prevent_company_change()
RETURNS TRIGGER LANGUAGE plpgsql
SET search_path = pg_catalog
AS $$
BEGIN
    IF NEW.company_id IS DISTINCT FROM OLD.company_id THEN
        RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'company_id cannot be changed after registration';
    END IF;
    RETURN NEW;
END;
$$;

REVOKE ALL ON ALL FUNCTIONS IN SCHEMA app FROM PUBLIC;
GRANT USAGE ON SCHEMA public, app TO salt_app;
GRANT EXECUTE ON FUNCTION app.current_company_id() TO salt_app;

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies FORCE ROW LEVEL SECURITY;
CREATE POLICY own_company ON companies FOR SELECT TO salt_app
    USING (id = app.current_company_id());
GRANT SELECT ON companies TO salt_app;

DO $$
DECLARE
    table_name TEXT;
BEGIN
    FOREACH table_name IN ARRAY ARRAY[
        'staff', 'openings', 'surveys', 'staff_openings', 'rule_versions',
        'survey_versions', 'mail_templates', 'survey_drafts', 'rule_items',
        'survey_routes', 'questions', 'survey_mail_versions', 'question_options',
        'responses', 'answers', 'applications', 'operation_logs', 'submissions',
        'documents', 'mail_deliveries', 'analysis_jobs', 'extracted_fields',
        'evaluations', 'evaluation_items', 'decisions'
    ] LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
        EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', table_name);
        EXECUTE format(
            'CREATE POLICY tenant_access ON public.%I FOR ALL TO salt_app
             USING (company_id = app.current_company_id()
                    AND EXISTS (SELECT FROM public.companies c WHERE c.id = company_id AND c.is_active))
             WITH CHECK (company_id = app.current_company_id()
                    AND EXISTS (SELECT FROM public.companies c WHERE c.id = company_id AND c.is_active))',
            table_name);
        EXECUTE format('CREATE TRIGGER company_id_immutable BEFORE UPDATE OF company_id ON public.%I
                        FOR EACH ROW EXECUTE FUNCTION app.prevent_company_change()', table_name);
        EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO salt_app', table_name);
        EXECUTE format('GRANT USAGE ON SEQUENCE %s TO salt_app',
                       pg_get_serial_sequence('public.' || table_name, 'id'));
    END LOOP;
END;
$$;

-- salt_appにはDDL、TRUNCATE、企業の登録・停止、companiesの採番権限を与えない。
-- 企業内のrole・担当募集・個別トークンの照合は、アプリの認可処理で追加する。
-- 企業IDをSQLで設定できるDB資格情報をブラウザーや契約企業へ配布しない。
