use crate::models::*;
use std::collections::HashMap;

/// Points -> (Semester Grade, Letter, min points inclusive)
/// Standard PH-style college conversion table (editable later via presets).
const GRADE_SCALE: &[(f64, f64, &str)] = &[
    (99.0, 1.00, "A+"),
    (96.0, 1.25, "A"),
    (93.0, 1.50, "A-"),
    (90.0, 1.75, "B+"),
    (87.0, 2.00, "B"),
    (84.0, 2.25, "B-"),
    (81.0, 2.50, "C+"),
    (78.0, 2.75, "C"),
    (75.0, 3.00, "D"),
];

fn points_to_scale(points: f64) -> (f64, String) {
    for (min_points, sem_grade, letter) in GRADE_SCALE {
        if points >= *min_points {
            return (*sem_grade, letter.to_string());
        }
    }
    (5.00, "F".to_string())
}

/// Compute the grade for a single student given:
/// - categories: preset categories (with weight + is_critical)
/// - assessments: all assessments for the class, grouped implicitly by category_id
/// - scores: map of assessment_id -> Option<score> for THIS student (None/absent = missing)
pub fn compute_student_grade(
    student_id: &str,
    categories: &[PresetCategory],
    assessments: &[Assessment],
    scores: &HashMap<String, Option<f64>>,
) -> StudentGradeResult {
    let mut category_results = Vec::new();
    let mut total_weighted = 0.0;
    let mut has_inc = false;

    for cat in categories {
        let cat_assessments: Vec<&Assessment> =
            assessments.iter().filter(|a| a.category_id == cat.id).collect();

        let mut earned_sum = 0.0;
        let mut total_sum = 0.0;
        let mut missing_critical = false;

        for a in &cat_assessments {
            total_sum += a.total_items;
            match scores.get(&a.id) {
                Some(Some(v)) => earned_sum += v,
                Some(None) | None => {
                    // No score recorded at all for this assessment.
                    if cat.is_critical {
                        missing_critical = true;
                    }
                    // standard (non-critical) missing items simply contribute 0
                }
            }
        }

        let weighted_score = if total_sum > 0.0 {
            (earned_sum / total_sum) * cat.weight
        } else {
            0.0
        };

        if missing_critical {
            has_inc = true;
        } else {
            total_weighted += weighted_score;
        }

        category_results.push(CategoryResult {
            category_id: cat.id.clone(),
            category_name: cat.name.clone(),
            weight: cat.weight,
            earned: earned_sum,
            total: total_sum,
            weighted_score,
            is_critical: cat.is_critical,
            missing_critical,
        });
    }

    let raw_percentage = total_weighted; // already weighted out of 100
    let points_equivalent = if has_inc { 0.0 } else { raw_percentage };
    let (semester_grade, letter_equivalent) = if has_inc {
        (0.0, "--".to_string())
    } else {
        points_to_scale(points_equivalent)
    };

    let remarks = if has_inc {
        "INC".to_string()
    } else if points_equivalent >= 75.0 {
        "Passed".to_string()
    } else {
        "Failed".to_string()
    };

    StudentGradeResult {
        student_id: student_id.to_string(),
        categories: category_results,
        raw_percentage,
        points_equivalent,
        semester_grade,
        letter_equivalent,
        remarks,
    }
}
