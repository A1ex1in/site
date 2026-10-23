-- Обновление существующей базы до версии завершённого backend MVP.
-- Скрипт идемпотентен и безопасен для повторного запуска.

BEGIN;

CREATE TABLE IF NOT EXISTS legal_consents (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id BIGINT NOT NULL,
    document_type VARCHAR(50) NOT NULL,
    document_version VARCHAR(50) NOT NULL,
    accepted_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ip_address INET,
    user_agent VARCHAR(500),

    CONSTRAINT fk_legal_consent_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT legal_consent_document_type_check
        CHECK (document_type IN ('privacy_policy', 'user_agreement')),

    CONSTRAINT legal_consent_unique
        UNIQUE (user_id, document_type, document_version)
);

CREATE INDEX IF NOT EXISTS users_role_status_idx
ON users (role, status);

CREATE INDEX IF NOT EXISTS legal_consents_user_idx
ON legal_consents (user_id, accepted_at DESC);

CREATE INDEX IF NOT EXISTS student_profiles_group_idx
ON student_profiles (group_id);

CREATE INDEX IF NOT EXISTS courses_teacher_idx
ON courses (teacher_id, is_active);

CREATE INDEX IF NOT EXISTS courses_group_idx
ON courses (group_id, is_active);

CREATE INDEX IF NOT EXISTS materials_course_idx
ON materials (course_id, is_published);

CREATE INDEX IF NOT EXISTS student_submissions_assignment_idx
ON student_submissions (assignment_id, status);

COMMIT;
