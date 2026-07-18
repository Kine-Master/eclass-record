use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct GradingPreset {
    pub id: String,
    pub name: String,
    pub is_default: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PresetCategory {
    pub id: String,
    pub preset_id: String,
    pub name: String,
    pub weight: f64,
    pub is_critical: bool,
    pub position: i64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PresetWithCategories {
    pub preset: GradingPreset,
    pub categories: Vec<PresetCategory>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct NewCategoryInput {
    pub id: Option<String>, // present when editing an existing category
    pub name: String,
    pub weight: f64,
    pub is_critical: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Class {
    pub id: String,
    pub name: String,
    pub code: Option<String>,
    pub subject: Option<String>,
    pub department: Option<String>,
    pub semester: Option<String>,
    pub school_year: Option<String>,
    pub schedule: Option<String>,
    pub preset_id: String,
    pub status: String,
    pub student_count: i64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct NewClassInput {
    pub name: String,
    pub code: Option<String>,
    pub subject: Option<String>,
    pub department: Option<String>,
    pub semester: Option<String>,
    pub school_year: Option<String>,
    pub schedule: Option<String>,
    pub preset_id: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Student {
    pub id: String,
    pub class_id: String,
    pub student_number: Option<String>,
    pub last_name: String,
    pub first_name: String,
    pub middle_name: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct NewStudentInput {
    pub id: Option<String>, // present when editing
    pub student_number: Option<String>,
    pub last_name: String,
    pub first_name: String,
    pub middle_name: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Assessment {
    pub id: String,
    pub class_id: String,
    pub category_id: String,
    pub name: String,
    pub total_items: f64,
    pub position: i64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct NewAssessmentInput {
    pub id: Option<String>, // present when editing
    pub category_id: String,
    pub name: String,
    pub total_items: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ScoreInput {
    pub student_id: String,
    pub assessment_id: String,
    pub score: Option<f64>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CategoryResult {
    pub category_id: String,
    pub category_name: String,
    pub weight: f64,
    pub earned: f64,
    pub total: f64,
    pub weighted_score: f64,
    pub is_critical: bool,
    pub missing_critical: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct StudentGradeResult {
    pub student_id: String,
    pub categories: Vec<CategoryResult>,
    pub raw_percentage: f64, // 0-100
    pub points_equivalent: f64,
    pub semester_grade: f64, // 5.0 - 1.0 scale
    pub letter_equivalent: String,
    pub remarks: String, // "Passed" | "Failed" | "INC"
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct GradebookData {
    pub class: Class,
    pub categories: Vec<PresetCategory>,
    pub assessments: Vec<Assessment>,
    pub students: Vec<Student>,
    pub scores: Vec<ScoreInput>,
    pub results: Vec<StudentGradeResult>,
}
