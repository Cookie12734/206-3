-- 運営用接続で実行する。値はpsql変数として渡す（docs/database.md参照）。
-- password_hashはアプリと同じ方式で事前に生成したハッシュ。平文パスワードを渡さない。
\set ON_ERROR_STOP on
BEGIN;

CREATE TEMP TABLE company_admin_input (
    company_code TEXT NOT NULL CHECK (btrim(company_code) <> ''),
    company_name TEXT NOT NULL CHECK (btrim(company_name) <> ''),
    leader_name TEXT NOT NULL CHECK (btrim(leader_name) <> ''),
    leader_email TEXT NOT NULL CHECK (btrim(leader_email) <> ''),
    password_hash TEXT NOT NULL CHECK (btrim(password_hash) <> '')
) ON COMMIT DROP;
INSERT INTO company_admin_input VALUES
    (:'company_code', :'company_name', :'leader_name', :'leader_email', :'password_hash');

WITH new_company AS (
    INSERT INTO public.companies (code, name, created_at)
    SELECT company_code, company_name, CURRENT_TIMESTAMP FROM company_admin_input
    RETURNING id
)
INSERT INTO public.staff (company_id, name, email, password_hash, role, is_active)
SELECT c.id, i.leader_name, i.leader_email, i.password_hash, 'admin', TRUE
FROM new_company c CROSS JOIN company_admin_input i
RETURNING company_id, id AS leader_id;

-- 重複・入力不備は全体をロールバックする。既存アカウントを更新しない。
COMMIT;
