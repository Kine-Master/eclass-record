-- E-Class Record System: initial schema
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS grading_presets (
    id            TEXT PRIMARY KEY,
    name          TEXT NOT NULL,
    is_default    INTEGER NOT NULL DEFAULT 0,
    created_at    TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS preset_categories (
    id            TEXT PRIMARY KEY,
    preset_id     TEXT NOT NULL REFERENCES grading_presets(id) ON DELETE CASCADE,
    name          TEXT NOT NULL,
    weight        REAL NOT NULL,           -- percentage points, e.g. 15 for 15%
    is_critical   INTEGER NOT NULL DEFAULT 0, -- 1 = missing assessment in this category forces INC
    position      INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS classes (
    id            TEXT PRIMARY KEY,
    name          TEXT NOT NULL,          -- e.g. "BSBA - 1A"
    code          TEXT,                   -- class code, e.g. 12230300
    subject       TEXT,                   -- e.g. "Ethics"
    department    TEXT,
    semester      TEXT,                   -- e.g. "First Sem"
    school_year   TEXT,                   -- e.g. "2026-2027"
    schedule      TEXT,                   -- e.g. "Mon-Wed-Thu"
    preset_id     TEXT NOT NULL REFERENCES grading_presets(id),
    status        TEXT NOT NULL DEFAULT 'ongoing', -- 'ongoing' | 'archived'
    created_at    TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS students (
    id              TEXT PRIMARY KEY,
    class_id        TEXT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    student_number  TEXT,
    last_name       TEXT NOT NULL,
    first_name      TEXT NOT NULL,
    middle_name     TEXT,
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS assessments (
    id            TEXT PRIMARY KEY,
    class_id      TEXT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    category_id   TEXT NOT NULL REFERENCES preset_categories(id),
    name          TEXT NOT NULL,          -- e.g. "Quiz 1"
    total_items   REAL NOT NULL,          -- perfect score for this item
    position      INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS student_scores (
    id             TEXT PRIMARY KEY,
    student_id     TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    assessment_id  TEXT NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
    score          REAL,                  -- NULL = not yet encoded ("missing")
    UNIQUE(student_id, assessment_id)
);

CREATE INDEX IF NOT EXISTS idx_students_class ON students(class_id);
CREATE INDEX IF NOT EXISTS idx_assessments_class ON assessments(class_id);
CREATE INDEX IF NOT EXISTS idx_scores_student ON student_scores(student_id);
CREATE INDEX IF NOT EXISTS idx_scores_assessment ON student_scores(assessment_id);

-- Seed the default university grading preset described in the PRD
INSERT OR IGNORE INTO grading_presets (id, name, is_default)
VALUES ('preset-default', 'University Default (Type 1)', 1);

INSERT OR IGNORE INTO preset_categories (id, preset_id, name, weight, is_critical, position) VALUES
    ('cat-written-output',   'preset-default', 'Written Output',    15, 0, 0),
    ('cat-performance-task', 'preset-default', 'Performance Tasks', 25, 0, 1),
    ('cat-midterm',          'preset-default', 'Midterm Exam',      20, 1, 2),
    ('cat-final-output',     'preset-default', 'Final Output',      10, 1, 3),
    ('cat-final-exam',       'preset-default', 'Final Exam',        25, 1, 4),
    ('cat-attendance',       'preset-default', 'Attendance',         5, 0, 5);
