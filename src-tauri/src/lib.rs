use std::io::Write;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::sync::atomic::{AtomicU64, Ordering};
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use tauri::command;
use rusqlite::{Connection, params};
use chrono::Local;
use directories::ProjectDirs;

// 临时目录守卫：唯一命名，Drop 时自动清理，保证任何 return 路径都不残留临时文件。
static TMP_SEQ: AtomicU64 = AtomicU64::new(0);

struct TempDir(PathBuf);

impl TempDir {
    fn new(tag: &str) -> Result<Self, String> {
        let nanos = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map_err(|e| e.to_string())?
            .as_nanos();
        let seq = TMP_SEQ.fetch_add(1, Ordering::Relaxed);
        let path = std::env::temp_dir().join(format!(
            "algorecall_{}_{}_{}",
            tag,
            std::process::id(),
            nanos ^ (seq as u128)
        ));
        std::fs::create_dir_all(&path).map_err(|e| e.to_string())?;
        Ok(Self(path))
    }

    fn path(&self) -> &Path {
        &self.0
    }
}

impl Drop for TempDir {
    fn drop(&mut self) {
        if let Err(e) = std::fs::remove_dir_all(&self.0) {
            eprintln!("清理临时目录 {} 失败: {}", self.0.display(), e);
        }
    }
}

// 检测点：一个测试点包含输入与期望输出
#[derive(serde::Serialize, serde::Deserialize)]
struct Testcase {
    #[serde(default)]
    input: String,
    #[serde(default)]
    output: String,
}

// 归一化输出：去除首尾空白与每行末尾空格，便于判题比较
fn normalize_output(s: &str) -> String {
    s.trim()
        .lines()
        .map(|l| l.trim_end())
        .collect::<Vec<_>>()
        .join("\n")
}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

// ============ C++ 工具链：检测 / 下载 / 解压 ============

// 工具链根目录：AppData/Local/AlgoRecall/toolchain
fn toolchain_dir() -> Result<PathBuf, String> {
    let base = std::env::var("LOCALAPPDATA")
        .map(PathBuf::from)
        .unwrap_or_else(|_| std::env::temp_dir());
    Ok(base.join("AlgoRecall").join("toolchain"))
}

// 在工具链目录中查找 bin/g++.exe（兼容解压后带一层 w64devkit 子目录的情况）
fn toolchain_gpp() -> Option<PathBuf> {
    let dir = toolchain_dir().ok()?;
    let direct = dir.join("bin").join("g++.exe");
    if direct.is_file() {
        return Some(direct);
    }
    if let Ok(entries) = std::fs::read_dir(&dir) {
        for entry in entries.flatten() {
            let p = entry.path().join("bin").join("g++.exe");
            if p.is_file() {
                return Some(p);
            }
        }
    }
    None
}

// 系统 PATH 中是否存在可用的 g++
fn system_gpp_available() -> bool {
    Command::new("g++")
        .arg("--version")
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false)
}

// 编译命令要使用的 g++ 位置：优先内置工具链，否则回退到 PATH 中的 g++
fn gpp_path() -> String {
    toolchain_gpp()
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_else(|| "g++".to_string())
}

// 候选下载源：主源 + 国内加速镜像（如需清华镜像等其它国内源，可在此替换 URL）
const TOOLCHAIN_URLS: [&str; 3] = [
    "https://github.com/skeeto/w64devkit/releases/download/v1.21.0/w64devkit-1.21.0.zip",
    "https://ghfast.top/https://github.com/skeeto/w64devkit/releases/download/v1.21.0/w64devkit-1.21.0.zip",
    "https://ghproxy.net/https://github.com/skeeto/w64devkit/releases/download/v1.21.0/w64devkit-1.21.0.zip",
];

async fn download_file(url: &str, dest: &Path) -> Result<(), String> {
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(30 * 60))
        .build()
        .map_err(|e| e.to_string())?;
    let resp = client
        .get(url)
        .send()
        .await
        .map_err(|e| e.to_string())?
        .error_for_status()
        .map_err(|e| format!("HTTP 错误: {}", e))?;
    let bytes = resp.bytes().await.map_err(|e| e.to_string())?;
    std::fs::write(dest, &bytes).map_err(|e| e.to_string())?;
    Ok(())
}

// 解压 zip（zip crate 内置 Zip Slip 防护，避免路径穿越）
fn extract_zip(zip_path: &Path, dest: &Path) -> Result<(), String> {
    let file = std::fs::File::open(zip_path).map_err(|e| e.to_string())?;
    let mut archive = zip::ZipArchive::new(file).map_err(|e| e.to_string())?;
    archive.extract(dest).map_err(|e| e.to_string())?;
    Ok(())
}

async fn install_toolchain() -> Result<(), String> {
    let dir = toolchain_dir()?;
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let zip_path = dir.join("w64devkit.zip");

    let mut downloaded = false;
    let mut last_err = String::new();
    for url in TOOLCHAIN_URLS {
        match download_file(url, &zip_path).await {
            Ok(()) => {
                downloaded = true;
                break;
            }
            Err(e) => {
                last_err = e;
                let _ = std::fs::remove_file(&zip_path);
            }
        }
    }
    if !downloaded {
        return Err(format!("下载 MinGW 失败：{}", last_err));
    }

    extract_zip(&zip_path, &dir)?;
    let _ = std::fs::remove_file(&zip_path);
    Ok(())
}

// 检测系统 g++；缺失时自动下载并配置精简版 MinGW（w64devkit）
#[tauri::command]
async fn check_and_install_gcc(app: tauri::AppHandle) -> Result<String, String> {
    // 1. 系统已有 g++，直接使用
    if system_gpp_available() {
        return Ok("g++ 已可用".to_string());
    }

    // 2. 之前已装好工具链
    if let Some(p) = toolchain_gpp() {
        return Ok(format!("使用内置工具链：{}", p.display()));
    }

    // 3. 需要安装：弹窗提示用户
    {
        use tauri_plugin_dialog::{DialogExt, MessageDialogBuilder, MessageDialogKind};
        let _ = MessageDialogBuilder::new(app.dialog().clone(), "提示", "正在为你自动配置 C++ 环境，请稍候")
            .kind(MessageDialogKind::Info)
            .show(|_| {});
    }

    // 4. 下载并解压
    install_toolchain().await?;

    // 5. 校验结果
    match toolchain_gpp() {
        Some(p) => Ok(format!("C++ 环境配置完成：{}", p.display())),
        None => Err("下载解压后未找到 g++.exe".to_string()),
    }
}


#[command]
fn run_cpp(code: String, stdin: String) -> Result<String, String> {
    // 1. 创建唯一临时目录（TempDir 在 Drop 时自动清理）
    let tmp = TempDir::new("cpp")?;
    let src_path = tmp.path().join("main.cpp");
    let exe_path = tmp.path().join("main.exe");

    // 2. 写入源码
    std::fs::write(&src_path, code.as_bytes()).map_err(|e| e.to_string())?;

    // 3. 编译：锁定工作目录，防止源码通过相对路径穿越访问系统文件
    let compile_output = Command::new(gpp_path())
        .current_dir(tmp.path())
        .args([
            src_path.to_str().unwrap(),
            "-o",
            exe_path.to_str().unwrap(),
            "-std=c++17",
            "-O2",
        ])
        .output()
        .map_err(|e| format!("无法调用 g++，请确认已安装并加入 PATH: {}", e))?;

    if !compile_output.status.success() {
        let err = String::from_utf8_lossy(&compile_output.stderr).to_string();
        return Ok(format!("【编译失败】\n{}", err));
    }

    // 4. 运行（带超时），同样锁定工作目录
    let mut child = Command::new(&exe_path)
        .current_dir(tmp.path())
        .stdin(std::process::Stdio::piped())
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped())
        .spawn()
        .map_err(|e| e.to_string())?;

    if let Some(mut stdin_handle) = child.stdin.take() {
        let _ = stdin_handle.write_all(stdin.as_bytes());
    }

    // 简单超时：5 秒
    let start = std::time::Instant::now();
    loop {
        match child.try_wait() {
            Ok(Some(_)) => break,
            Ok(None) => {
                if start.elapsed() > Duration::from_secs(5) {
                    let _ = child.kill();
                    let _ = child.wait();
                    return Ok("【运行超时】超过 5 秒未结束".to_string());
                }
                std::thread::sleep(Duration::from_millis(50));
            }
            Err(e) => {
                let _ = child.kill();
                return Err(e.to_string());
            }
        }
    }

    let output = child.wait_with_output().map_err(|e| e.to_string())?;
    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();

    let mut result = String::new();
    if !stdout.is_empty() {
        result.push_str("【输出】\n");
        result.push_str(&stdout);
    }
    if !stderr.is_empty() {
        result.push_str("\n【错误】\n");
        result.push_str(&stderr);
    }
    if result.is_empty() {
        result.push_str("【无输出】程序正常结束");
    }

    // 无需手动清理：TempDir 在 Drop 时自动 remove_dir_all
    Ok(result)
}

#[tauri::command]
async fn ai_review(base_url: String, model_name: String, api_key: String, problem: String, code: String) -> Result<String, String> {
    // 校验 base_url：仅允许 https，防止把携带 API Key 的请求发往任意地址（SSRF 型窃取）
    let parsed = reqwest::Url::parse(base_url.trim())
        .map_err(|_| "base_url 不是合法 URL".to_string())?;
    if parsed.scheme() != "https" || parsed.host_str().is_none() {
        return Err("base_url 必须是 https:// 且包含有效主机名".to_string());
    }

    let client = reqwest::Client::new();

    let system_prompt = "你是一个资深算法竞赛教练。请根据题目和 AC 代码，输出严格的 JSON。\n\
        只输出 JSON，不要任何解释，不要 markdown 代码块，不要前后缀。\n\
        JSON 格式如下：\n\
        {\n\
          \"pattern\": \"一句话模式，例如：前缀和 + 哈希表\",\n\
          \"category\": [\"标签1\", \"标签2\"],\n\
          \"data_structures\": [\"数组\", \"哈希表\"],\n\
          \"algorithm\": \"核心算法名\",\n\
          \"invariant\": \"关键不变量或状态定义\",\n\
          \"steps\": [\"步骤1\", \"步骤2\", \"步骤3\"],\n\
          \"time_complexity\": \"O(n)\",\n\
          \"space_complexity\": \"O(n)\",\n\
          \"pitfalls\": [\"易错点1\", \"易错点2\"],\n\
          \"similar_problems\": [\"LC 560\", \"LC 974\"],\n\
          \"hint\": \"一句简短的提示，不要太长，用于看提示写卡\"\n\
        }";

    let user_prompt = format!("题目：{}\n\n代码：\n{}", problem, code);

    let endpoint = format!("{}/chat/completions", base_url.trim_end_matches('/'));

    let body = serde_json::json!({
        "model": model_name,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ],
        "stream": false,
        "response_format": { "type": "json_object" }
    });

    let resp = client
        .post(&endpoint)
        .header("Authorization", format!("Bearer {}", api_key))
        .header("Content-Type", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("网络请求失败: {}", e))?;

    let json: serde_json::Value = resp
        .json()
        .await
        .map_err(|e| format!("解析响应失败: {}", e))?;

    if let Some(err) = json.get("error") {
        return Err(format!("API 报错: {}", err));
    }

    let content = json["choices"][0]["message"]["content"]
        .as_str()
        .unwrap_or("{}")
        .to_string();

    Ok(content)
}

// ============ 数据库路径 ============
fn get_db_path() -> Result<std::path::PathBuf, String> {
    let proj_dirs = ProjectDirs::from("com", "algo", "AlgoRecall")
        .ok_or("无法获取用户数据目录")?;
    let data_dir = proj_dirs.data_dir();
    std::fs::create_dir_all(data_dir).map_err(|e| e.to_string())?;
    Ok(data_dir.join("algorecall.db"))
}

// ============ 初始化：建三张表 ============
#[tauri::command]
fn init_db() -> Result<(), String> {
    let path = get_db_path()?;
    let conn = Connection::open(path).map_err(|e| e.to_string())?;

    conn.execute_batch(
        "
        PRAGMA foreign_keys = ON;

        CREATE TABLE IF NOT EXISTS problems (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            title         TEXT NOT NULL DEFAULT '',
            statement     TEXT NOT NULL DEFAULT '',
            source        TEXT NOT NULL DEFAULT '',
            ai_category   TEXT NOT NULL DEFAULT '[]',
            category      TEXT NOT NULL DEFAULT '[]',
            ai_notes      TEXT NOT NULL DEFAULT '',
            notes         TEXT NOT NULL DEFAULT '',
            code          TEXT NOT NULL DEFAULT '',
            testcases     TEXT NOT NULL DEFAULT '[]',
            created_at    TEXT NOT NULL,
            updated_at    TEXT NOT NULL,
            difficulty    TEXT NOT NULL DEFAULT '中等'
        );

        CREATE TABLE IF NOT EXISTS cards (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            problem_id    INTEGER NOT NULL,
            card_type     TEXT NOT NULL,
            weight        REAL NOT NULL DEFAULT 0.0,
            mastery       REAL NOT NULL DEFAULT 0.0,
            next_review   TEXT NOT NULL,
            stability     REAL NOT NULL DEFAULT 0.0,
            difficulty    REAL NOT NULL DEFAULT 0.0,
            review_count  INTEGER NOT NULL DEFAULT 0,
            created_at    TEXT NOT NULL,
            FOREIGN KEY (problem_id) REFERENCES problems(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS reviews (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            card_id       INTEGER NOT NULL,
            rating        INTEGER NOT NULL,
            answer        TEXT NOT NULL DEFAULT '',
            score         REAL NOT NULL DEFAULT 0.0,
            duration_ms   INTEGER NOT NULL DEFAULT 0,
            created_at    TEXT NOT NULL,
            FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_cards_next_review ON cards(next_review);
        CREATE INDEX IF NOT EXISTS idx_cards_problem ON cards(problem_id);
        CREATE INDEX IF NOT EXISTS idx_reviews_card ON reviews(card_id);
        "
    ).map_err(|e| e.to_string())?;

    // 迁移：为旧数据库补充 testcases 列（若不存在）
    {
        let mut stmt = conn.prepare("PRAGMA table_info(problems)").map_err(|e| e.to_string())?;
        let cols: Vec<String> = stmt
            .query_map([], |row| row.get::<_, String>(1))
            .map_err(|e| e.to_string())?
            .collect::<Result<_, _>>()
            .map_err(|e| e.to_string())?;
        if !cols.iter().any(|c| c == "testcases") {
            conn.execute(
                "ALTER TABLE problems ADD COLUMN testcases TEXT NOT NULL DEFAULT '[]'",
                [],
            ).map_err(|e| e.to_string())?;
        }
        if !cols.iter().any(|c| c == "difficulty") {
            conn.execute(
                "ALTER TABLE problems ADD COLUMN difficulty TEXT NOT NULL DEFAULT '中等'",
                [],
            ).map_err(|e| e.to_string())?;
        }
    }

    Ok(())
}

// ============ 保存题目（新建或更新）+ 生成默认卡片组 ============
#[tauri::command]
fn save_problem(
    id: Option<i64>,
    title: String,
    statement: String,
    code: String,
    ai_category: Vec<String>,
    category: Vec<String>,
    ai_notes: String,
    notes: String,
    testcases: Vec<Testcase>,
    difficulty: String,
) -> Result<i64, String> {
    let path = get_db_path()?;
    let conn = Connection::open(path).map_err(|e| e.to_string())?;
    let now = Local::now().to_rfc3339();

    let ai_cat_json = serde_json::to_string(&ai_category).map_err(|e| e.to_string())?;
    let cat_json = serde_json::to_string(&category).map_err(|e| e.to_string())?;
    let testcases_json = serde_json::to_string(&testcases).map_err(|e| e.to_string())?;

    // 传了 id 就更新已有题目，不重新生成卡片
    if let Some(problem_id) = id {
        conn.execute(
            "UPDATE problems
             SET title = ?1, statement = ?2, ai_category = ?3, category = ?4,
                 ai_notes = ?5, notes = ?6, code = ?7, testcases = ?8, difficulty = ?9, updated_at = ?10
             WHERE id = ?11",
            params![
                title,
                statement,
                ai_cat_json,
                cat_json,
                ai_notes,
                notes,
                code,
                testcases_json,
                difficulty,
                now,
                problem_id,
            ],
        ).map_err(|e| e.to_string())?;

        return Ok(problem_id);
    }

    // 未传 id：插入新题目
    conn.execute(
        "INSERT INTO problems
         (title, statement, source, ai_category, category, ai_notes, notes, code, testcases, difficulty, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?11)",
        params![
            title,
            statement,
            "",
            ai_cat_json,
            cat_json,
            ai_notes,
            notes,
            code,
            testcases_json,
            difficulty,
            now,
        ],
    ).map_err(|e| e.to_string())?;

    let problem_id = conn.last_insert_rowid();

    // 生成三张默认卡片：默写 0.5 / 看提示写 0.3 / 复述 0.2
    let default_cards = [
        ("write",  0.5),
        ("hint",   0.3),
        ("recall", 0.2),
    ];
    let next = now.clone();
    for (ctype, w) in default_cards.iter() {
        conn.execute(
            "INSERT INTO cards
             (problem_id, card_type, weight, mastery, next_review, stability, difficulty, review_count, created_at)
             VALUES (?1, ?2, ?3, 0.0, ?4, 0.0, 0.0, 0, ?5)",
            params![problem_id, ctype, w, next, now],
        ).map_err(|e| e.to_string())?;
    }

    Ok(problem_id)
}

// ============ 获取单个题目的完整详情 ============
#[tauri::command]
fn get_problem_detail(id: i64) -> Result<serde_json::Value, String> {
    let path = get_db_path()?;
    let conn = Connection::open(path).map_err(|e| e.to_string())?;

    let mut stmt = conn.prepare(
        "SELECT id, title, statement, source, ai_category, category, ai_notes, notes, code, testcases, created_at, updated_at, difficulty
         FROM problems WHERE id = ?1"
    ).map_err(|e| e.to_string())?;

    let mut rows = stmt.query_map(params![id], |row| {
        let ai_category: String = row.get(4)?;
        let category: String = row.get(5)?;
        let testcases: String = row.get(9)?;
        Ok(serde_json::json!({
            "id":          row.get::<_, i64>(0)?,
            "title":       row.get::<_, String>(1)?,
            "statement":   row.get::<_, String>(2)?,
            "source":      row.get::<_, String>(3)?,
            "ai_category": serde_json::from_str::<Vec<String>>(&ai_category).unwrap_or_default(),
            "category":    serde_json::from_str::<Vec<String>>(&category).unwrap_or_default(),
            "ai_notes":    row.get::<_, String>(6)?,
            "notes":       row.get::<_, String>(7)?,
            "code":        row.get::<_, String>(8)?,
            "testcases":   serde_json::from_str::<Vec<Testcase>>(&testcases).unwrap_or_default(),
            "created_at":  row.get::<_, String>(10)?,
            "updated_at":  row.get::<_, String>(11)?,
            "difficulty":  row.get::<_, String>(12)?,
        }))
    }).map_err(|e| e.to_string())?;

    if let Some(row) = rows.next() {
        row.map_err(|e| e.to_string())
    } else {
        Err(format!("未找到 id={} 的题目", id))
    }
}

// ============ 列出所有题目 ============
#[tauri::command]
fn list_problems() -> Result<Vec<serde_json::Value>, String> {
    let path = get_db_path()?;
    let conn = Connection::open(path).map_err(|e| e.to_string())?;

    let mut stmt = conn.prepare(
        "SELECT id, title, category, difficulty, created_at
         FROM problems ORDER BY created_at DESC"
    ).map_err(|e| e.to_string())?;

    let rows = stmt.query_map([], |row| {
        let category: String = row.get(2)?;
        Ok(serde_json::json!({
            "id":         row.get::<_, i64>(0)?,
            "title":      row.get::<_, String>(1)?,
            "category":   serde_json::from_str::<Vec<String>>(&category).unwrap_or_default(),
            "difficulty": row.get::<_, String>(3)?,
            "created_at": row.get::<_, String>(4)?,
        }))
    }).map_err(|e| e.to_string())?;

    let mut result = Vec::new();
    for r in rows {
        result.push(r.map_err(|e| e.to_string())?);
    }
    Ok(result)
}

// ============ 获取今天到期的卡片（联表查题目） ============
#[tauri::command]
fn get_due_cards() -> Result<Vec<serde_json::Value>, String> {
    let path = get_db_path()?;
    let conn = Connection::open(path).map_err(|e| e.to_string())?;
    let now = Local::now().to_rfc3339();

    let mut stmt = conn.prepare(
        "SELECT c.id, c.card_type, c.weight, c.mastery, c.next_review,
                c.stability, c.difficulty,
                p.id, p.title, p.statement, p.notes, p.ai_notes
         FROM cards c
         JOIN problems p ON p.id = c.problem_id
         WHERE c.next_review <= ?1
         ORDER BY c.next_review ASC"
    ).map_err(|e| e.to_string())?;

    let rows = stmt.query_map(params![now], |row| {
        let ai_notes_raw: String = row.get(11)?;
        // ai_notes 现在存的是 AI 原始 JSON，从中提取 hint 供复习卡展示
        let ai_notes = serde_json::from_str::<serde_json::Value>(&ai_notes_raw)
            .ok()
            .and_then(|v| v.get("hint").and_then(|h| h.as_str()).map(|s| s.to_string()))
            .unwrap_or(ai_notes_raw);

        Ok(serde_json::json!({
            "card_id":     row.get::<_, i64>(0)?,
            "card_type":   row.get::<_, String>(1)?,
            "weight":      row.get::<_, f64>(2)?,
            "mastery":     row.get::<_, f64>(3)?,
            "next_review": row.get::<_, String>(4)?,
            "stability":   row.get::<_, f64>(5)?,
            "difficulty":  row.get::<_, f64>(6)?,
            "problem_id":  row.get::<_, i64>(7)?,
            "title":       row.get::<_, String>(8)?,
            "statement":   row.get::<_, String>(9)?,
            "notes":       row.get::<_, String>(10)?,
            "ai_notes":    ai_notes,
        }))
    }).map_err(|e| e.to_string())?;

    let mut result = Vec::new();
    for r in rows {
        result.push(r.map_err(|e| e.to_string())?);
    }
    Ok(result)
}

#[tauri::command]
fn record_review(
    card_id: i64,
    rating: i64,
    answer: String,
    score: f64,
    next_review: String,
    stability: f64,
    difficulty: f64,
) -> Result<(), String> {
    let path = get_db_path()?;
    let conn = Connection::open(path).map_err(|e| e.to_string())?;
    let now = Local::now();

    conn.execute(
        "INSERT INTO reviews (card_id, rating, answer, score, duration_ms, created_at)
         VALUES (?1, ?2, ?3, ?4, 0, ?5)",
        params![card_id, rating, answer, score, now.to_rfc3339()],
    ).map_err(|e| e.to_string())?;

    conn.execute(
        "UPDATE cards
         SET review_count = review_count + 1,
             mastery = ?1,
             next_review = ?2,
             stability = ?3,
             difficulty = ?4
         WHERE id = ?5",
        params![score, next_review, stability, difficulty, card_id],
    ).map_err(|e| e.to_string())?;

    Ok(())
}

// ============ 导出题库（不含复习历史与 API Key） ============
#[tauri::command]
fn export_problems() -> Result<String, String> {
    let path = get_db_path()?;
    let conn = Connection::open(path).map_err(|e| e.to_string())?;

    let mut stmt = conn.prepare(
        "SELECT title, statement, source, ai_category, category, ai_notes, notes, code, testcases, difficulty
         FROM problems ORDER BY id ASC"
    ).map_err(|e| e.to_string())?;

    let rows = stmt.query_map([], |row| {
        let ai_category: String = row.get(3)?;
        let category: String = row.get(4)?;
        let testcases: String = row.get(8)?;
        Ok(serde_json::json!({
            "title":       row.get::<_, String>(0)?,
            "statement":   row.get::<_, String>(1)?,
            "source":      row.get::<_, String>(2)?,
            "ai_category": serde_json::from_str::<Vec<String>>(&ai_category).unwrap_or_default(),
            "category":    serde_json::from_str::<Vec<String>>(&category).unwrap_or_default(),
            "ai_notes":    row.get::<_, String>(5)?,
            "notes":       row.get::<_, String>(6)?,
            "code":        row.get::<_, String>(7)?,
            "testcases":   serde_json::from_str::<Vec<Testcase>>(&testcases).unwrap_or_default(),
            "difficulty":  row.get::<_, String>(9)?,
        }))
    }).map_err(|e| e.to_string())?;

    let mut problems = Vec::new();
    for r in rows {
        problems.push(r.map_err(|e| e.to_string())?);
    }

    let payload = serde_json::json!({ "version": 1, "problems": problems });
    serde_json::to_string_pretty(&payload).map_err(|e| e.to_string())
}

// 兼容两种分类字段：数组（导出格式）或 JSON 字符串（旧数据）
fn extract_string_list(value: Option<&serde_json::Value>) -> Vec<String> {
    match value {
        Some(serde_json::Value::Array(items)) => items
            .iter()
            .filter_map(|v| v.as_str().map(|s| s.to_string()))
            .collect(),
        Some(serde_json::Value::String(s)) => {
            serde_json::from_str::<Vec<String>>(s).unwrap_or_default()
        }
        _ => Vec::new(),
    }
}

// 兼容两种检测点字段：对象数组（导出格式）或 JSON 字符串（旧数据）
fn extract_testcases(value: Option<&serde_json::Value>) -> Vec<Testcase> {
    match value {
        Some(serde_json::Value::Array(items)) => items
            .iter()
            .map(|v| Testcase {
                input: v.get("input").and_then(|s| s.as_str()).unwrap_or("").to_string(),
                output: v.get("output").and_then(|s| s.as_str()).unwrap_or("").to_string(),
            })
            .collect(),
        Some(serde_json::Value::String(s)) => {
            serde_json::from_str::<Vec<Testcase>>(s).unwrap_or_default()
        }
        _ => Vec::new(),
    }
}

// 导入时插入新题目并自动生成三张复习卡片
fn insert_imported_problem(
    conn: &Connection,
    title: String,
    statement: String,
    source: String,
    ai_cat_json: String,
    cat_json: String,
    ai_notes: String,
    notes: String,
    code: String,
    testcases_json: String,
    difficulty: String,
    now: &str,
) -> Result<i64, String> {
    conn.execute(
        "INSERT INTO problems
         (title, statement, source, ai_category, category, ai_notes, notes, code, testcases, difficulty, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?11)",
        params![title, statement, source, ai_cat_json, cat_json, ai_notes, notes, code, testcases_json, difficulty, now],
    ).map_err(|e| e.to_string())?;

    let problem_id = conn.last_insert_rowid();

    let default_cards = [
        ("write", 0.5),
        ("hint", 0.3),
        ("recall", 0.2),
    ];
    for (ctype, w) in default_cards.iter() {
        conn.execute(
            "INSERT INTO cards
             (problem_id, card_type, weight, mastery, next_review, stability, difficulty, review_count, created_at)
             VALUES (?1, ?2, ?3, 0.0, ?4, 0.0, 0.0, 0, ?5)",
            params![problem_id, ctype, w, now, now],
        ).map_err(|e| e.to_string())?;
    }

    Ok(problem_id)
}

// ============ 导入题库（纯文本 JSON，去重 title+statement） ============
#[tauri::command]
fn import_problems(data: String) -> Result<serde_json::Value, String> {
    let path = get_db_path()?;
    let conn = Connection::open(path).map_err(|e| e.to_string())?;

    // 严格解析：只把输入当作 JSON 文本处理，绝不执行任何可执行代码
    let parsed: serde_json::Value = serde_json::from_str(&data)
        .map_err(|e| format!("JSON 格式错误：{}", e))?;

    // 支持整体对象 {"problems": [...]}，也支持裸数组 [...]
    let arr: Vec<serde_json::Value> = match parsed {
        serde_json::Value::Array(items) => items,
        serde_json::Value::Object(map) => match map.get("problems") {
            Some(serde_json::Value::Array(items)) => items.clone(),
            _ => return Err("JSON 结构错误：缺少 problems 数组".to_string()),
        },
        _ => return Err("JSON 结构错误：应为对象或数组".to_string()),
    };

    // 现有题目指纹：title + statement 直接比对
    let mut existing: std::collections::HashSet<(String, String)> = std::collections::HashSet::new();
    {
        let mut stmt = conn
            .prepare("SELECT title, statement FROM problems")
            .map_err(|e| e.to_string())?;
        let rows = stmt
            .query_map([], |row| {
                Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
            })
            .map_err(|e| e.to_string())?;
        for r in rows {
            existing.insert(r.map_err(|e| e.to_string())?);
        }
    }

    let now = Local::now().to_rfc3339();
    let mut inserted = 0i64;
    let mut skipped = 0i64;

    for item in arr {
        let title = item.get("title").and_then(|v| v.as_str()).unwrap_or("").to_string();
        let statement = item.get("statement").and_then(|v| v.as_str()).unwrap_or("").to_string();

        let key = (title.clone(), statement.clone());
        if existing.contains(&key) {
            skipped += 1;
            continue;
        }

        let source = item.get("source").and_then(|v| v.as_str()).unwrap_or("").to_string();
        let ai_notes = item.get("ai_notes").and_then(|v| v.as_str()).unwrap_or("").to_string();
        let notes = item.get("notes").and_then(|v| v.as_str()).unwrap_or("").to_string();
        let code = item.get("code").and_then(|v| v.as_str()).unwrap_or("").to_string();

        let ai_category = extract_string_list(item.get("ai_category"));
        let category = extract_string_list(item.get("category"));
        let testcases = extract_testcases(item.get("testcases"));

        let ai_cat_json = serde_json::to_string(&ai_category).map_err(|e| e.to_string())?;
        let cat_json = serde_json::to_string(&category).map_err(|e| e.to_string())?;
        let testcases_json = serde_json::to_string(&testcases).map_err(|e| e.to_string())?;
        let difficulty = item.get("difficulty").and_then(|v| v.as_str()).unwrap_or("中等").to_string();

        insert_imported_problem(
            &conn,
            title,
            statement,
            source,
            ai_cat_json,
            cat_json,
            ai_notes,
            notes,
            code,
            testcases_json,
            difficulty,
            &now,
        )?;

        existing.insert(key);
        inserted += 1;
    }

    Ok(serde_json::json!({ "inserted": inserted, "skipped": skipped }))
}

// ============ 删除题目（优先清理复习卡片，级联删除复习记录） ============
#[tauri::command]
fn delete_problem(id: i64) -> Result<(), String> {
    let path = get_db_path()?;
    let conn = Connection::open(path).map_err(|e| e.to_string())?;

    // SQLite 外键约束默认关闭，开启后 cards -> reviews 的 ON DELETE CASCADE 才会生效。
    conn.execute_batch("PRAGMA foreign_keys = ON;")
        .map_err(|e| e.to_string())?;

    // 优先删除该题目关联的复习卡片（cards）；reviews 会通过外键级联一并删除。
    conn.execute("DELETE FROM cards WHERE problem_id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    // 卡片清理完毕后再删除题目本身。
    conn.execute("DELETE FROM problems WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;

    Ok(())
}

// ============ 重置所有卡片复习时间（立即复习） ============
#[tauri::command]
fn reset_reviews() -> Result<(), String> {
    let path = get_db_path()?;
    let conn = Connection::open(path).map_err(|e| e.to_string())?;
    let now = Local::now();

    conn.execute(
        "UPDATE cards SET next_review = ?1",
        params![now.to_rfc3339()],
    ).map_err(|e| e.to_string())?;

    Ok(())
}

// ============ 运行多个检测点并判题 ============
#[tauri::command]
fn run_testcases(code: String, testcases: Vec<Testcase>) -> Result<String, String> {
    if testcases.is_empty() {
        return Err("没有可运行的检测点，请先添加检测点".to_string());
    }

    let tmp = TempDir::new("tc")?;
    let src_path = tmp.path().join("main.cpp");
    let exe_path = tmp.path().join("main.exe");
    std::fs::write(&src_path, code.as_bytes()).map_err(|e| e.to_string())?;

    let compile_output = Command::new(gpp_path())
        .current_dir(tmp.path())
        .args([
            src_path.to_str().unwrap(),
            "-o",
            exe_path.to_str().unwrap(),
            "-std=c++17",
            "-O2",
        ])
        .output()
        .map_err(|e| format!("无法调用 g++，请确认已安装并加入 PATH: {}", e))?;

    if !compile_output.status.success() {
        let err = String::from_utf8_lossy(&compile_output.stderr).to_string();
        return Ok(format!("【编译失败】\n{}", err));
    }

    let total = testcases.len();
    let mut passed = 0usize;
    let mut report = String::new();

    for (i, tc) in testcases.iter().enumerate() {
        let mut child = Command::new(&exe_path)
            .current_dir(tmp.path())
            .stdin(std::process::Stdio::piped())
            .stdout(std::process::Stdio::piped())
            .stderr(std::process::Stdio::piped())
            .spawn()
            .map_err(|e| e.to_string())?;

        if let Some(mut stdin_handle) = child.stdin.take() {
            let _ = stdin_handle.write_all(tc.input.as_bytes());
        }

        let start = std::time::Instant::now();
        let mut timed_out = false;
        loop {
            match child.try_wait() {
                Ok(Some(_)) => break,
                Ok(None) => {
                    if start.elapsed() > Duration::from_secs(5) {
                        let _ = child.kill();
                        timed_out = true;
                        break;
                    }
                    std::thread::sleep(Duration::from_millis(50));
                }
                Err(e) => {
                    let _ = child.kill();
                    return Err(e.to_string());
                }
            }
        }

        let output = child.wait_with_output().map_err(|e| e.to_string())?;
        let stdout = String::from_utf8_lossy(&output.stdout).to_string();
        let stderr = String::from_utf8_lossy(&output.stderr).to_string();

        let ok = !timed_out && normalize_output(&stdout) == normalize_output(&tc.output);
        if ok {
            passed += 1;
        }

        report.push_str(&format!("【检测点 {}】{}\n", i + 1, if ok { "✅ 通过" } else { "❌ 未通过" }));
        report.push_str(&format!("输入：\n{}\n", tc.input));
        report.push_str(&format!("期望输出：\n{}\n", tc.output));
        if timed_out {
            report.push_str("实际输出：\n【运行超时】超过 5 秒未结束\n");
        } else {
            report.push_str(&format!("实际输出：\n{}\n", stdout));
            if !stderr.is_empty() {
                report.push_str(&format!("【错误输出】\n{}\n", stderr));
            }
        }
        report.push('\n');
    }

    report.insert_str(
        0,
        &format!("共 {} 个检测点，通过 {} 个，未通过 {} 个。\n\n", total, passed, total - passed),
    );
    Ok(report)
}

// ============ 函数调用图 ============
#[tauri::command]
fn build_call_graph(code: String) -> Result<String, String> {
    let tmp = TempDir::new("cg")?;
    let src_path = tmp.path().join("main.cpp");
    std::fs::write(&src_path, code.as_bytes()).map_err(|e| e.to_string())?;

    let output = Command::new("clang++")
        .current_dir(tmp.path())
        .args(["-Xclang", "-ast-dump=json", "-fsyntax-only", src_path.to_str().unwrap()])
        .output()
        .map_err(|e| format!("无法调用 clang++: {}", e))?;

    if !output.status.success() {
        return Err("编译错误".to_string());
    }

    let ast_json: serde_json::Value = serde_json::from_slice(&output.stdout)
        .map_err(|e| format!("AST JSON 解析失败: {}", e))?;

    let mut user_fns = std::collections::HashSet::new();
    user_fns.insert("main".to_string());
    for line in code.lines() {
        let line = line.trim();
        if (line.starts_with("void ") || line.starts_with("int ") || line.starts_with("bool ") || line.starts_with("string ")) 
           && line.contains('(') && !line.contains("main(") {
            if let Some(start) = line.find(' ') {
                if let Some(end) = line.find('(') {
                    let name = line[start+1..end].trim();
                    if !name.is_empty() && !name.contains(' ') {
                        user_fns.insert(name.to_string());
                    }
                }
            }
        }
    }

    let mut nodes = Vec::new();
    let mut edges = Vec::new();
    let mut seen_fns = std::collections::HashSet::new();
    
    // 传入了 code 用于提取实参
    walk_ast_clean(&ast_json, &code, &mut nodes, &mut edges, &mut seen_fns, &user_fns, None, None);

    let result = serde_json::json!({ "nodes": nodes, "edges": edges });
    Ok(result.to_string())
}

fn walk_ast_clean(
    node: &serde_json::Value,
    source_code: &str,
    nodes: &mut Vec<serde_json::Value>,
    edges: &mut Vec<serde_json::Value>,
    seen_fns: &mut std::collections::HashSet<String>,
    user_fns: &std::collections::HashSet<String>,
    current_fn: Option<String>,
    current_cond: Option<String>,
) {
    let kind = node.get("kind").and_then(|v| v.as_str()).unwrap_or("");
    let mut new_current = current_fn.clone();

    if kind == "FunctionDecl" {
        if let Some(name) = node.get("name").and_then(|v| v.as_str()) {
            if user_fns.contains(name) {
                if !seen_fns.contains(name) {
                    seen_fns.insert(name.to_string());
                    nodes.push(serde_json::json!({
                        "id": format!("fn_{}", name),
                        "label": name,
                        "signature": extract_signature(node, source_code).unwrap_or_default(),
                    }));
                }
                new_current = Some(name.to_string());
            }
        }
    }

    if kind == "CallExpr" {
        if let Some(callee) = extract_callee_name(node) {
            if let Some(caller) = &new_current {
                // 保留白名单过滤；去掉 caller != callee 的限制，让自递归调用也能成边（递归展开）
                if user_fns.contains(&callee) {
                    let caller_id = format!("fn_{}", caller);
                    let callee_id = format!("fn_{}", callee);
                    
                    let args_str = extract_args_text(node, source_code);

                    // 普通调用：call(实参)；位于 if 分支内的调用：if 条件: call(实参)
                    let call_part = if args_str.is_empty() {
                        "call()".to_string()
                    } else {
                        format!("call{}", args_str)
                    };
                    let label = match &current_cond {
                        Some(cond) => format!("if {}: {}", cond, call_part),
                        None => call_part,
                    };

                    // 去重改为 from + to + label，保证不同实参的递归调用展开为多条边
                    let exists = edges.iter().any(|e| {
                        e.get("from").and_then(|v| v.as_str()) == Some(caller_id.as_str())
                            && e.get("to").and_then(|v| v.as_str()) == Some(callee_id.as_str())
                            && e.get("label").and_then(|v| v.as_str()) == Some(label.as_str())
                    });
                    if !exists {
                        edges.push(serde_json::json!({
                            "from": caller_id,
                            "to": callee_id,
                            "label": label,
                        }));
                    }
                }
            }
        }
    }

    // 递归处理子节点。IfStmt 的 inner[0] 是判断条件，条件表达式里的调用不应带上
    // "if 条件" 标签，只有 then/else 分支（inner[1..]）才继承当前条件。
    if let Some(inner) = node.get("inner").and_then(|v| v.as_array()) {
        let is_if = kind == "IfStmt";
        let if_cond = if is_if { extract_cond_text(node, source_code) } else { None };
        for (idx, child) in inner.iter().enumerate() {
            let child_cond = if is_if {
                if idx == 0 {
                    current_cond.clone()
                } else {
                    if_cond.clone().or_else(|| current_cond.clone())
                }
            } else {
                current_cond.clone()
            };
            walk_ast_clean(
                child,
                source_code,
                nodes,
                edges,
                seen_fns,
                user_fns,
                new_current.clone(),
                child_cond,
            );
        }
    }
}

// 提取 CallExpr 的实参文本，形如 "(arr, 0, pi - 1)"；无实参时返回空串。
fn extract_args_text(node: &serde_json::Value, source_code: &str) -> String {
    let mut args = Vec::new();
    if let Some(inner) = node.get("inner").and_then(|v| v.as_array()) {
        // CallExpr 的 inner 中，第 0 个是被调函数，后面的才是实参
        for i in 1..inner.len() {
            if let Some(range) = inner[i].get("range") {
                if let (Some(b), Some(e)) = (
                    range.get("begin").and_then(|v| v.get("offset")).and_then(|v| v.as_u64()),
                    range.get("end").and_then(|v| v.get("offset")).and_then(|v| v.as_u64()),
                ) {
                    if b <= e && e <= source_code.len() as u64 {
                        let arg_text = source_code[b as usize..e as usize].trim();
                        let collapsed = arg_text.split_whitespace().collect::<Vec<_>>().join(" ");
                        args.push(collapsed);
                    }
                }
            }
        }
    }
    if args.is_empty() {
        String::new()
    } else {
        format!("({})", args.join(", "))
    }
}

// 提取 IfStmt 的判断条件文本（inner[0] 即条件表达式）。
fn extract_cond_text(node: &serde_json::Value, source_code: &str) -> Option<String> {
    let inner = node.get("inner")?.as_array()?;
    let cond = inner.first()?;
    let range = cond.get("range")?;
    let b = range.get("begin")?.get("offset")?.as_u64()?;
    let e = range.get("end")?.get("offset")?.as_u64()?;
    if b > e || e > source_code.len() as u64 {
        return None;
    }
    let text = source_code[b as usize..e as usize].trim();
    if text.is_empty() {
        return None;
    }
    Some(text.split_whitespace().collect::<Vec<_>>().join(" "))
}

// 从 FunctionDecl 的源码范围截取函数签名（截到第一个 '{' 或 ';' 之前）。
fn extract_signature(node: &serde_json::Value, source_code: &str) -> Option<String> {
    let range = node.get("range")?;
    let b = range.get("begin")?.get("offset")?.as_u64()? as usize;
    let e = range.get("end")?.get("offset")?.as_u64()? as usize;
    if b >= e || e > source_code.len() {
        return None;
    }
    let slice = &source_code[b..e];
    let mut end = slice.len();
    for (i, ch) in slice.char_indices() {
        if ch == '{' || ch == ';' {
            end = i;
            break;
        }
    }
    let sig = slice[..end].trim();
    if sig.is_empty() || !sig.contains('(') {
        return None;
    }
    let sig = sig.split_whitespace().collect::<Vec<_>>().join(" ");
    if sig.chars().count() > 120 {
        let mut s: String = sig.chars().take(117).collect();
        s.push_str("...");
        Some(s)
    } else {
        Some(sig)
    }
}
fn extract_callee_name(node: &serde_json::Value) -> Option<String> {
    let inner = node.get("inner")?.as_array()?;
    for child in inner {
        if let Some(name) = find_decl_ref(child) {
            return Some(name);
        }
    }
    None
}

fn find_decl_ref(node: &serde_json::Value) -> Option<String> {
    let kind = node.get("kind").and_then(|v| v.as_str()).unwrap_or("");
    if kind == "DeclRefExpr" {
        if let Some(name) = node.get("referencedDecl").and_then(|v| v.get("name")).and_then(|v| v.as_str()) {
            return Some(name.to_string());
        }
    }
    if let Some(inner) = node.get("inner").and_then(|v| v.as_array()) {
        for child in inner {
            if let Some(n) = find_decl_ref(child) {
                return Some(n);
            }
        }
    }
    None
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            check_and_install_gcc,
            run_cpp,
            ai_review,
            init_db,
            save_problem,
            list_problems,
            get_problem_detail,
            get_due_cards,
            record_review,
            build_call_graph,
            export_problems,
            import_problems,
            delete_problem,
            reset_reviews,
            run_testcases
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}