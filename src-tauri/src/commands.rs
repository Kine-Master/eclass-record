use crate::compute::compute_student_grade;
use crate::db::DbState;
use crate::models::*;
use rusqlite::{params, OptionalExtension};
use std::collections::HashMap;
use tauri::State;
use uuid::Uuid;

type CmdResult<T> = Result<T, String>;
fn e<T: std::fmt::Display>(err: T) -> String {
    err.to_string()
}

// ---------- PRESETS ----------

#[tauri::command]
pub fn list_presets(state: State<DbState>) -> CmdResult<Vec<PresetWithCategories>> {
    let conn = state.0.lock().map_err(e)?;
    let mut stmt = conn
        .prepare("SELECT id, name, is_default FROM grading_presets ORDER BY is_default DESC, name ASC")
        .map_err(e)?;
    let presets: Vec<GradingPreset> = stmt
        .query_map([], |row| {
            Ok(GradingPreset {
                id: row.get(0)?,
                name: row.get(1)?,
                is_default: row.get::<_, i64>(2)? != 0,
            })
        })
        .map_err(e)?
        .filter_map(|r| r.ok())
        .collect();

    let mut result = Vec::new();
    for preset in presets {
        let mut cstmt = conn
            .prepare("SELECT id, preset_id, name, weight, is_critical, position FROM preset_categories WHERE preset_id = ?1 ORDER BY position ASC")
            .map_err(e)?;
        let categories: Vec<PresetCategory> = cstmt
            .query_map(params![preset.id], |row| {
                Ok(PresetCategory {
                    id: row.get(0)?,
                    preset_id: row.get(1)?,
                    name: row.get(2)?,
                    weight: row.get(3)?,
                    is_critical: row.get::<_, i64>(4)? != 0,
                    position: row.get(5)?,
                })
            })
            .map_err(e)?
            .filter_map(|r| r.ok())
            .collect();
        result.push(PresetWithCategories { preset, categories });
    }
    Ok(result)
}

#[tauri::command]
pub fn save_preset(
    state: State<DbState>,
    id: Option<String>,
    name: String,
    categories: Vec<NewCategoryInput>,
) -> CmdResult<String> {
    let total: f64 = categories.iter().map(|c| c.weight).sum();
    if (total - 100.0).abs() > 0.01 {
        return Err(format!("Category weights must total 100% (currently {:.2}%)", total));
    }

    let mut conn = state.0.lock().map_err(e)?;
    let tx = conn.transaction().map_err(e)?;

    let preset_id = id.unwrap_or_else(|| format!("preset-{}", Uuid::new_v4()));
    tx.execute(
        "INSERT INTO grading_presets (id, name) VALUES (?1, ?2)
         ON CONFLICT(id) DO UPDATE SET name = excluded.name, updated_at = datetime('now')",
        params![preset_id, name],
    )
    .map_err(e)?;

    // Remove categories that were deleted client-side
    let keep_ids: Vec<String> = categories.iter().filter_map(|c| c.id.clone()).collect();
    if keep_ids.is_empty() {
        tx.execute("DELETE FROM preset_categories WHERE preset_id = ?1", params![preset_id])
            .map_err(e)?;
    } else {
        let placeholders = keep_ids.iter().map(|_| "?").collect::<Vec<_>>().join(",");
        let sql = format!(
            "DELETE FROM preset_categories WHERE preset_id = ? AND id NOT IN ({})",
            placeholders
        );
        let mut bind: Vec<&dyn rusqlite::ToSql> = vec![&preset_id];
        for id in &keep_ids {
            bind.push(id);
        }
        tx.execute(&sql, bind.as_slice()).map_err(e)?;
    }

    for (idx, cat) in categories.iter().enumerate() {
        let cat_id = cat.id.clone().unwrap_or_else(|| format!("cat-{}", Uuid::new_v4()));
        tx.execute(
            "INSERT INTO preset_categories (id, preset_id, name, weight, is_critical, position)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)
             ON CONFLICT(id) DO UPDATE SET name=excluded.name, weight=excluded.weight,
                is_critical=excluded.is_critical, position=excluded.position",
            params![cat_id, preset_id, cat.name, cat.weight, cat.is_critical as i64, idx as i64],
        )
        .map_err(e)?;
    }

    tx.commit().map_err(e)?;
    Ok(preset_id)
}

#[tauri::command]
pub fn delete_preset(state: State<DbState>, id: String) -> CmdResult<()> {
    let conn = state.0.lock().map_err(e)?;
    let in_use: i64 = conn
        .query_row("SELECT COUNT(*) FROM classes WHERE preset_id = ?1", params![id], |r| r.get(0))
        .map_err(e)?;
    if in_use > 0 {
        return Err("Cannot delete a preset that is used by existing classes.".into());
    }
    conn.execute("DELETE FROM grading_presets WHERE id = ?1 AND is_default = 0", params![id])
        .map_err(e)?;
    Ok(())
}

// ---------- CLASSES ----------

fn row_to_class(row: &rusqlite::Row, student_count: i64) -> rusqlite::Result<Class> {
    Ok(Class {
        id: row.get(0)?,
        name: row.get(1)?,
        code: row.get(2)?,
        subject: row.get(3)?,
        department: row.get(4)?,
        semester: row.get(5)?,
        school_year: row.get(6)?,
        schedule: row.get(7)?,
        preset_id: row.get(8)?,
        status: row.get(9)?,
        student_count,
    })
}

#[tauri::command]
pub fn list_classes(state: State<DbState>, status: String) -> CmdResult<Vec<Class>> {
    let conn = state.0.lock().map_err(e)?;
    let mut stmt = conn
        .prepare(
            "SELECT c.id, c.name, c.code, c.subject, c.department, c.semester, c.school_year, c.schedule, c.preset_id, c.status,
                    (SELECT COUNT(*) FROM students s WHERE s.class_id = c.id) as student_count
             FROM classes c WHERE c.status = ?1 ORDER BY c.updated_at DESC",
        )
        .map_err(e)?;
    let rows = stmt
        .query_map(params![status], |row| {
            let count: i64 = row.get(10)?;
            row_to_class(row, count)
        })
        .map_err(e)?
        .filter_map(|r| r.ok())
        .collect();
    Ok(rows)
}

#[tauri::command]
pub fn create_class(state: State<DbState>, input: NewClassInput) -> CmdResult<String> {
    let conn = state.0.lock().map_err(e)?;
    let id = format!("class-{}", Uuid::new_v4());
    conn.execute(
        "INSERT INTO classes (id, name, code, subject, department, semester, school_year, schedule, preset_id)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
        params![id, input.name, input.code, input.subject, input.department, input.semester, input.school_year, input.schedule, input.preset_id],
    ).map_err(e)?;
    Ok(id)
}

#[tauri::command]
pub fn update_class(state: State<DbState>, id: String, input: NewClassInput) -> CmdResult<()> {
    let conn = state.0.lock().map_err(e)?;
    conn.execute(
        "UPDATE classes SET name=?1, code=?2, subject=?3, department=?4, semester=?5, school_year=?6, schedule=?7, preset_id=?8, updated_at=datetime('now')
         WHERE id = ?9",
        params![input.name, input.code, input.subject, input.department, input.semester, input.school_year, input.schedule, input.preset_id, id],
    ).map_err(e)?;
    Ok(())
}

#[tauri::command]
pub fn set_class_status(state: State<DbState>, id: String, status: String) -> CmdResult<()> {
    let conn = state.0.lock().map_err(e)?;
    conn.execute(
        "UPDATE classes SET status = ?1, updated_at = datetime('now') WHERE id = ?2",
        params![status, id],
    )
    .map_err(e)?;
    Ok(())
}

#[tauri::command]
pub fn delete_class(state: State<DbState>, id: String) -> CmdResult<()> {
    let conn = state.0.lock().map_err(e)?;
    conn.execute("DELETE FROM classes WHERE id = ?1", params![id]).map_err(e)?;
    Ok(())
}

// ---------- STUDENTS ----------

#[tauri::command]
pub fn list_students(state: State<DbState>, class_id: String) -> CmdResult<Vec<Student>> {
    let conn = state.0.lock().map_err(e)?;
    let mut stmt = conn
        .prepare("SELECT id, class_id, student_number, last_name, first_name, middle_name FROM students WHERE class_id = ?1")
        .map_err(e)?;
    let rows = stmt
        .query_map(params![class_id], |row| {
            Ok(Student {
                id: row.get(0)?,
                class_id: row.get(1)?,
                student_number: row.get(2)?,
                last_name: row.get(3)?,
                first_name: row.get(4)?,
                middle_name: row.get(5)?,
            })
        })
        .map_err(e)?
        .filter_map(|r| r.ok())
        .collect();
    Ok(rows)
}

/// Add or edit a student. If input.id is Some, updates in place; otherwise inserts.
#[tauri::command]
pub fn save_student(state: State<DbState>, class_id: String, input: NewStudentInput) -> CmdResult<String> {
    let conn = state.0.lock().map_err(e)?;
    match input.id {
        Some(sid) => {
            conn.execute(
                "UPDATE students SET student_number=?1, last_name=?2, first_name=?3, middle_name=?4 WHERE id=?5",
                params![input.student_number, input.last_name, input.first_name, input.middle_name, sid],
            ).map_err(e)?;
            Ok(sid)
        }
        None => {
            let id = format!("student-{}", Uuid::new_v4());
            conn.execute(
                "INSERT INTO students (id, class_id, student_number, last_name, first_name, middle_name) VALUES (?1,?2,?3,?4,?5,?6)",
                params![id, class_id, input.student_number, input.last_name, input.first_name, input.middle_name],
            ).map_err(e)?;
            Ok(id)
        }
    }
}

#[tauri::command]
pub fn delete_student(state: State<DbState>, id: String) -> CmdResult<()> {
    let conn = state.0.lock().map_err(e)?;
    conn.execute("DELETE FROM students WHERE id = ?1", params![id]).map_err(e)?;
    Ok(())
}

// ---------- ASSESSMENTS (dynamic columns) ----------

#[tauri::command]
pub fn list_assessments(state: State<DbState>, class_id: String) -> CmdResult<Vec<Assessment>> {
    let conn = state.0.lock().map_err(e)?;
    let mut stmt = conn
        .prepare("SELECT id, class_id, category_id, name, total_items, position FROM assessments WHERE class_id = ?1 ORDER BY position ASC")
        .map_err(e)?;
    let rows = stmt
        .query_map(params![class_id], |row| {
            Ok(Assessment {
                id: row.get(0)?,
                class_id: row.get(1)?,
                category_id: row.get(2)?,
                name: row.get(3)?,
                total_items: row.get(4)?,
                position: row.get(5)?,
            })
        })
        .map_err(e)?
        .filter_map(|r| r.ok())
        .collect();
    Ok(rows)
}

/// Add or edit an assessment column (name / total item count / category).
#[tauri::command]
pub fn save_assessment(state: State<DbState>, class_id: String, input: NewAssessmentInput) -> CmdResult<String> {
    let conn = state.0.lock().map_err(e)?;
    match input.id {
        Some(aid) => {
            conn.execute(
                "UPDATE assessments SET category_id=?1, name=?2, total_items=?3 WHERE id=?4",
                params![input.category_id, input.name, input.total_items, aid],
            ).map_err(e)?;
            Ok(aid)
        }
        None => {
            let id = format!("assessment-{}", Uuid::new_v4());
            let next_pos: i64 = conn
                .query_row("SELECT COALESCE(MAX(position), -1) + 1 FROM assessments WHERE class_id = ?1", params![class_id], |r| r.get(0))
                .map_err(e)?;
            conn.execute(
                "INSERT INTO assessments (id, class_id, category_id, name, total_items, position) VALUES (?1,?2,?3,?4,?5,?6)",
                params![id, class_id, input.category_id, input.name, input.total_items, next_pos],
            ).map_err(e)?;
            Ok(id)
        }
    }
}

#[tauri::command]
pub fn delete_assessment(state: State<DbState>, id: String) -> CmdResult<()> {
    let conn = state.0.lock().map_err(e)?;
    conn.execute("DELETE FROM assessments WHERE id = ?1", params![id]).map_err(e)?;
    Ok(())
}

// ---------- SCORES ----------

#[tauri::command]
pub fn save_score(state: State<DbState>, input: ScoreInput) -> CmdResult<()> {
    let conn = state.0.lock().map_err(e)?;
    match input.score {
        Some(v) => {
            conn.execute(
                "INSERT INTO student_scores (id, student_id, assessment_id, score) VALUES (?1,?2,?3,?4)
                 ON CONFLICT(student_id, assessment_id) DO UPDATE SET score = excluded.score",
                params![format!("score-{}", Uuid::new_v4()), input.student_id, input.assessment_id, v],
            ).map_err(e)?;
        }
        None => {
            conn.execute(
                "DELETE FROM student_scores WHERE student_id = ?1 AND assessment_id = ?2",
                params![input.student_id, input.assessment_id],
            ).map_err(e)?;
        }
    }
    Ok(())
}

// ---------- GRADEBOOK (aggregate fetch + compute) ----------

#[tauri::command]
pub fn get_gradebook(state: State<DbState>, class_id: String) -> CmdResult<GradebookData> {
    let conn = state.0.lock().map_err(e)?;

    let class_row = conn.query_row(
        "SELECT c.id, c.name, c.code, c.subject, c.department, c.semester, c.school_year, c.schedule, c.preset_id, c.status,
                (SELECT COUNT(*) FROM students s WHERE s.class_id = c.id)
         FROM classes c WHERE c.id = ?1",
        params![class_id],
        |row| {
            let count: i64 = row.get(10)?;
            row_to_class(row, count)
        },
    ).optional().map_err(e)?;

    let class = class_row.ok_or("Class not found")?;

    let mut cstmt = conn.prepare("SELECT id, preset_id, name, weight, is_critical, position FROM preset_categories WHERE preset_id = ?1 ORDER BY position ASC").map_err(e)?;
    let categories: Vec<PresetCategory> = cstmt.query_map(params![class.preset_id], |row| {
        Ok(PresetCategory {
            id: row.get(0)?, preset_id: row.get(1)?, name: row.get(2)?,
            weight: row.get(3)?, is_critical: row.get::<_, i64>(4)? != 0, position: row.get(5)?,
        })
    }).map_err(e)?.filter_map(|r| r.ok()).collect();

    let mut astmt = conn.prepare("SELECT id, class_id, category_id, name, total_items, position FROM assessments WHERE class_id = ?1 ORDER BY position ASC").map_err(e)?;
    let assessments: Vec<Assessment> = astmt.query_map(params![class_id], |row| {
        Ok(Assessment {
            id: row.get(0)?, class_id: row.get(1)?, category_id: row.get(2)?,
            name: row.get(3)?, total_items: row.get(4)?, position: row.get(5)?,
        })
    }).map_err(e)?.filter_map(|r| r.ok()).collect();

    let mut sstmt = conn.prepare("SELECT id, class_id, student_number, last_name, first_name, middle_name FROM students WHERE class_id = ?1").map_err(e)?;
    let students: Vec<Student> = sstmt.query_map(params![class_id], |row| {
        Ok(Student {
            id: row.get(0)?, class_id: row.get(1)?, student_number: row.get(2)?,
            last_name: row.get(3)?, first_name: row.get(4)?, middle_name: row.get(5)?,
        })
    }).map_err(e)?.filter_map(|r| r.ok()).collect();

    let mut scstmt = conn.prepare(
        "SELECT ss.student_id, ss.assessment_id, ss.score FROM student_scores ss
         JOIN assessments a ON a.id = ss.assessment_id WHERE a.class_id = ?1"
    ).map_err(e)?;
    let scores: Vec<ScoreInput> = scstmt.query_map(params![class_id], |row| {
        Ok(ScoreInput { student_id: row.get(0)?, assessment_id: row.get(1)?, score: row.get(2)? })
    }).map_err(e)?.filter_map(|r| r.ok()).collect();

    // Build per-student score maps and compute results
    let mut by_student: HashMap<String, HashMap<String, Option<f64>>> = HashMap::new();
    for st in &students {
        by_student.insert(st.id.clone(), HashMap::new());
    }
    for sc in &scores {
        by_student.entry(sc.student_id.clone()).or_default().insert(sc.assessment_id.clone(), sc.score);
    }

    let mut results = Vec::new();
    for st in &students {
        let empty = HashMap::new();
        let map = by_student.get(&st.id).unwrap_or(&empty);
        results.push(compute_student_grade(&st.id, &categories, &assessments, map));
    }

    Ok(GradebookData { class, categories, assessments, students, scores, results })
}
