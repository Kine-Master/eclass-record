use crate::commands::get_gradebook;
use crate::db::DbState;
use rust_xlsxwriter::{Format, Workbook};
use tauri::State;

type CmdResult<T> = Result<T, String>;
fn e<T: std::fmt::Display>(err: T) -> String {
    err.to_string()
}

fn student_display(s: &crate::models::Student) -> (String, String, String, String) {
    (
        s.student_number.clone().unwrap_or_default(),
        s.last_name.clone(),
        s.first_name.clone(),
        s.middle_name.clone().unwrap_or_default(),
    )
}

/// Export the class record to an .xlsx workbook at the given destination path.
#[tauri::command]
pub fn export_class_xlsx(state: State<DbState>, class_id: String, dest_path: String) -> CmdResult<String> {
    let data = get_gradebook(state, class_id)?;

    let mut workbook = Workbook::new();
    let sheet = workbook.add_worksheet().set_name("Class Record").map_err(e)?;

    let header_fmt = Format::new().set_bold().set_background_color("#89B4FA");
    let title_fmt = Format::new().set_bold().set_font_size(14.0);

    sheet.write_string_with_format(0, 0, &data.class.name, &title_fmt).map_err(e)?;
    let meta = format!(
        "Code: {}   Subject: {}   Dept: {}   {} {}   Sched: {}",
        data.class.code.clone().unwrap_or_default(),
        data.class.subject.clone().unwrap_or_default(),
        data.class.department.clone().unwrap_or_default(),
        data.class.semester.clone().unwrap_or_default(),
        data.class.school_year.clone().unwrap_or_default(),
        data.class.schedule.clone().unwrap_or_default(),
    );
    sheet.write_string(1, 0, &meta).map_err(e)?;

    let header_row = 3u32;
    let mut col = 0u16;
    let fixed_headers = ["Student No.", "Last Name", "First Name", "Middle Name"];
    for h in fixed_headers {
        sheet.write_string_with_format(header_row, col, h, &header_fmt).map_err(e)?;
        col += 1;
    }
    let mut assessment_cols = Vec::new();
    for a in &data.assessments {
        sheet
            .write_string_with_format(header_row, col, &format!("{} ({})", a.name, a.total_items), &header_fmt)
            .map_err(e)?;
        assessment_cols.push((a.id.clone(), col));
        col += 1;
    }
    for label in ["Points", "Semester Grade", "Letter", "Remarks"] {
        sheet.write_string_with_format(header_row, col, label, &header_fmt).map_err(e)?;
        col += 1;
    }

    let mut sorted_students = data.students.clone();
    sorted_students.sort_by(|a, b| a.last_name.to_lowercase().cmp(&b.last_name.to_lowercase()));

    for (i, st) in sorted_students.iter().enumerate() {
        let row = header_row + 1 + i as u32;
        let (num, last, first, mid) = student_display(st);
        sheet.write_string(row, 0, &num).map_err(e)?;
        sheet.write_string(row, 1, &last).map_err(e)?;
        sheet.write_string(row, 2, &first).map_err(e)?;
        sheet.write_string(row, 3, &mid).map_err(e)?;

        for (aid, c) in &assessment_cols {
            if let Some(sc) = data.scores.iter().find(|s| &s.student_id == &st.id && &s.assessment_id == aid) {
                if let Some(v) = sc.score {
                    sheet.write_number(row, *c, v).map_err(e)?;
                }
            }
        }

        if let Some(result) = data.results.iter().find(|r| r.student_id == st.id) {
            let mut c = col - 4;
            sheet.write_number(row, c, result.points_equivalent).map_err(e)?;
            c += 1;
            sheet.write_number(row, c, result.semester_grade).map_err(e)?;
            c += 1;
            sheet.write_string(row, c, &result.letter_equivalent).map_err(e)?;
            c += 1;
            sheet.write_string(row, c, &result.remarks).map_err(e)?;
        }
    }

    sheet.autofit();
    workbook.save(&dest_path).map_err(e)?;
    Ok(dest_path)
}

/// Export the class record to a simple PDF table at the given destination path.
#[tauri::command]
pub fn export_class_pdf(state: State<DbState>, class_id: String, dest_path: String) -> CmdResult<String> {
    use printpdf::*;

    let data = get_gradebook(state, class_id)?;

    let (doc, page1, layer1) = PdfDocument::new(&data.class.name, Mm(297.0), Mm(210.0), "Layer 1");
    let font = doc.add_builtin_font(BuiltinFont::Helvetica).map_err(e)?;
    let font_bold = doc.add_builtin_font(BuiltinFont::HelveticaBold).map_err(e)?;
    let mut layer = doc.get_page(page1).get_layer(layer1);

    let mut y = 200.0;
    layer.use_text(&data.class.name, 16.0, Mm(10.0), Mm(y), &font_bold);
    y -= 7.0;
    let meta = format!(
        "Code: {}  Subject: {}  Dept: {}  {} {}",
        data.class.code.clone().unwrap_or_default(),
        data.class.subject.clone().unwrap_or_default(),
        data.class.department.clone().unwrap_or_default(),
        data.class.semester.clone().unwrap_or_default(),
        data.class.school_year.clone().unwrap_or_default(),
    );
    layer.use_text(&meta, 10.0, Mm(10.0), Mm(y), &font);
    y -= 10.0;

    let mut sorted_students = data.students.clone();
    sorted_students.sort_by(|a, b| a.last_name.to_lowercase().cmp(&b.last_name.to_lowercase()));

    let header = "No. | Last Name, First Name MI | Points | Sem. Grade | Letter | Remarks";
    layer.use_text(header, 9.0, Mm(10.0), Mm(y), &font_bold);
    y -= 6.0;

    let mut page_layer = layer;
    let mut current_page = page1;

    for st in &sorted_students {
        if y < 15.0 {
            let (new_page, new_layer) = doc.add_page(Mm(297.0), Mm(210.0), "Layer 1");
            current_page = new_page;
            page_layer = doc.get_page(current_page).get_layer(new_layer);
            y = 200.0;
        }
        let name = format!(
            "{}, {} {}",
            st.last_name,
            st.first_name,
            st.middle_name.clone().unwrap_or_default()
        );
        let result = data.results.iter().find(|r| r.student_id == st.id);
        let line = match result {
            Some(r) => format!(
                "{} | {} | {:.1} | {:.2} | {} | {}",
                st.student_number.clone().unwrap_or_default(),
                name,
                r.points_equivalent,
                r.semester_grade,
                r.letter_equivalent,
                r.remarks
            ),
            None => format!("{} | {} | -- | -- | -- | --", st.student_number.clone().unwrap_or_default(), name),
        };
        page_layer.use_text(&line, 9.0, Mm(10.0), Mm(y), &font);
        y -= 6.0;
    }

    let bytes = doc.save_to_bytes().map_err(e)?;
    std::fs::write(&dest_path, bytes).map_err(e)?;
    Ok(dest_path)
}
