import Editor from "@monaco-editor/react";
import { invoke } from "@tauri-apps/api/core";
import { useState, useEffect, useRef, type ChangeEvent } from "react";
import mermaid from "mermaid";
import { fsrs, createEmptyCard, Rating, State } from "ts-fsrs";
import "./App.css";

// 主题 key 列表与类型
const THEME_KEYS = ["wasteland", "forest", "ocean", "classic", "matrix"] as const;
type ThemeKey = (typeof THEME_KEYS)[number];

const THEME_STORAGE_KEY = "algo_theme";

// 主题强调色（Mermaid 图表节点描边需要字面量颜色，不能用 CSS 变量）
const THEME_ACCENT: Record<ThemeKey, string> = {
  wasteland: "#c95a36",
  forest: "#4c9a5e",
  ocean: "#2d8cb8",
  classic: "#111111",
  matrix: "#00ff41",
};

// 主题外观选项（设置弹窗「主题外观」Tab 使用）
const THEME_OPTIONS: { key: ThemeKey; label: string }[] = [
  { key: "wasteland", label: "🏜️ 废土" },
  { key: "forest", label: "🌲 森林" },
  { key: "ocean", label: "🌊 海洋" },
  { key: "classic", label: "⬜ 经典黑白" },
  { key: "matrix", label: "🟢 黑客帝国" },
];

// Mermaid 节点 / 连线的主题配色（字面量，随主题切换，保证黑白主题下可读）
const THEME_MERMAID: Record<ThemeKey, { nodeBg: string; nodeText: string; edge: string; sig: string }> = {
  wasteland: { nodeBg: "#34332b", nodeText: "#d4c4a8", edge: "#7f8c8d", sig: "#9a8f79" },
  forest: { nodeBg: "#222d21", nodeText: "#b3cbb5", edge: "#7f9c82", sig: "#7f9c82" },
  ocean: { nodeBg: "#16283e", nodeText: "#a0c4d9", edge: "#6e94ad", sig: "#6e94ad" },
  classic: { nodeBg: "#f7f7f5", nodeText: "#111111", edge: "#9b9b9b", sig: "#6b6b6b" },
  matrix: { nodeBg: "#0a0a0a", nodeText: "#00ff41", edge: "#0f7a2f", sig: "#00c838" },
};

// 读取持久化的主题（避免经典黑白主题下页面闪烁深色）
function getInitialTheme(): ThemeKey {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved && (THEME_KEYS as readonly string[]).includes(saved)) {
      return saved as ThemeKey;
    }
  } catch {
    /* ignore */
  }
  return "wasteland";
}

// 帮助弹窗：核心使用流程（Mermaid 流程图）
const HELP_FLOW = `graph LR
  A[写题] --> B[运行]
  B --> C[复盘]
  C --> D[保存]
  D --> E[复习]
  E -.->|重复练习| A`;

// 帮助弹窗：新手使用指南步骤
const GUIDE_STEPS = [
  { emoji: "✍️", title: "第一步：写代码", body: "点击左侧顶部的「＋ 新建」创建一道题目，然后在中间的代码编辑器里写出你的解法。" },
  { emoji: "▶️", title: "第二步：运行测试", body: "点「▶ 运行」验证代码；有测试用例会自动跑全部用例，否则运行输入框里的样例。" },
  { emoji: "✨", title: "第三步：AI 复盘", body: "点「✨ AI 复盘」让 AI 帮你梳理思路、复杂度、易错点与相似题。" },
  { emoji: "💾", title: "第四步：保存与复习", body: "点「💾 保存题目」后，系统按 FSRS 间隔重复算法安排复习；「📅 今日待复习」显示今天待复习的卡片数。" },
];

// 将 Date 格式化为与后端 Local::now().to_rfc3339() 一致的本地时区 RFC3339 字符串，
// 保证 cards.next_review 与 get_due_cards 里的 now 可以正确按字符串比较。
function toLocalRfc3339(date: Date): string {
  const pad = (n: number, len = 2) => String(n).padStart(len, "0");
  const y = date.getFullYear();
  const mo = pad(date.getMonth() + 1);
  const d = pad(date.getDate());
  const h = pad(date.getHours());
  const mi = pad(date.getMinutes());
  const s = pad(date.getSeconds());
  const ms = pad(date.getMilliseconds(), 3);
  const offsetMinutes = -date.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const abs = Math.abs(offsetMinutes);
  const oh = pad(Math.floor(abs / 60));
  const om = pad(abs % 60);
  return `${y}-${mo}-${d}T${h}:${mi}:${s}.${ms}${sign}${oh}:${om}`;
}

// 判断后端报错是否为缺少 C++ 编译器（g++）
function isGccMissingError(e: unknown): boolean {
  return String(e).includes("无法调用 g++");
}

function App() {
  useEffect(() => {
    invoke("init_db").catch(console.error);
    loadProblems();
    loadDueCount();
  }, []);

  const [code, setCode] = useState(
    `#include <iostream>
#include <vector>
using namespace std;

// 交换两个元素
void swap(int& a, int& b) {
    int temp = a;
    a = b;
    b = temp;
}

// 分区函数
int partition(vector<int>& arr, int low, int high) {
    int pivot = arr[high];
    int i = low - 1;
    for (int j = low; j < high; j++) {
        if (arr[j] < pivot) {
            i++;
            swap(arr[i], arr[j]);
        }
    }
    swap(arr[i + 1], arr[high]);
    return i + 1;
}

// 核心排序函数
void quickSort(vector<int>& arr, int low, int high) {
    if (low < high) {
        int pi = partition(arr, low, high);
        quickSort(arr, low, pi - 1);
        quickSort(arr, pi + 1, high);
    }
}

int main() {
    vector<int> arr = {10, 7, 8, 9, 1, 5};
    quickSort(arr, 0, arr.size() - 1);
    for (int x : arr) cout << x << " ";
    cout << endl;
    return 0;
}`
  );
  const [stdin, setStdin] = useState("3 5");
  const [output, setOutput] = useState("");
  const [running, setRunning] = useState(false);

  // AI 模型配置（Base URL / 模型名称 / API Key）与题目描述、AI 复盘结果
  const [apiBaseUrl, setApiBaseUrl] = useState(() => localStorage.getItem("ai_base_url") ?? "https://api.deepseek.com");
  const [modelName, setModelName] = useState(() => localStorage.getItem("ai_model_name") ?? "deepseek-chat");
  const [apiKey, setApiKey] = useState(() => localStorage.getItem("ai_api_key") ?? "");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [problem, setProblem] = useState("实现快速排序：给定一个整数数组，使用快速排序算法将其升序排列并输出。");
  const [aiResult, setAiResult] = useState("");
  const [aiParsed, setAiParsed] = useState<any>(null);
  const [aiLoading, setAiLoading] = useState(false);

  // 持久化 AI 配置到 localStorage
  useEffect(() => {
    localStorage.setItem("ai_base_url", apiBaseUrl);
    localStorage.setItem("ai_model_name", modelName);
    localStorage.setItem("ai_api_key", apiKey);
  }, [apiBaseUrl, modelName, apiKey]);

  // 题库侧边栏状态
  const [problems, setProblems] = useState<any[]>([]);
  const [currentProblemId, setCurrentProblemId] = useState<number | null>(null);

  // 可编辑的分类与笔记（用户修改后覆盖保存）
  const [userCategory, setUserCategory] = useState<string[]>([]);
  const [userNotes, setUserNotes] = useState("");
  const [categoryInput, setCategoryInput] = useState("");

  // 复习模式状态
  const [reviewMode, setReviewMode] = useState(false);
  const [dueCards, setDueCards] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showBack, setShowBack] = useState(false);
  const [userAnswer, setUserAnswer] = useState("");

  // 调用图状态
  const [showCallGraph, setShowCallGraph] = useState(false);
  const [graphLoading, setGraphLoading] = useState(false);
  const [mermaidCode, setMermaidCode] = useState("");
  const [graphError, setGraphError] = useState("");
  const graphRef = useRef<HTMLDivElement>(null);
  const helpGraphRef = useRef<HTMLDivElement>(null);

  // 导入/导出题库状态
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [importing, setImporting] = useState(false);
  // 设置弹窗当前 Tab：AI 配置 / 主题外观 / 数据管理
  const [settingsTab, setSettingsTab] = useState<"ai" | "theme" | "data">("ai");
  // 帮助弹窗
  const [helpOpen, setHelpOpen] = useState(false);

  // 测试用例（样例输入/输出 + 多个测试点）
  const [testcases, setTestcases] = useState<{ input: string; output: string }[]>([]);
  const [judging, setJudging] = useState(false);

  // C++ 编译器环境安装状态（下载 MinGW 期间显示弹窗）
  const [installingGcc, setInstallingGcc] = useState(false);

  // 右侧分页视图 + 题目难度
  const [rightTab, setRightTab] = useState<"problem" | "ai">("problem");
  // 左侧输入区（stdin / 测试用例）展开状态
  const [inputOpen, setInputOpen] = useState(true);
  const [difficulty, setDifficulty] = useState("中等");

  // 左侧题库筛选（难度 / 类型 / 搜索）
  const [difficultyFilter, setDifficultyFilter] = useState("全部");
  const [typeFilter, setTypeFilter] = useState("全部");
  const [search, setSearch] = useState("");

  // 左侧边栏：全部题库折叠状态 + 今日任务待复习数量
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [dueCount, setDueCount] = useState(0);

  // 当前主题：废土 / 森林 / 海洋 / 经典黑白 / 黑客帝国
  const [currentTheme, setCurrentTheme] = useState<ThemeKey>(getInitialTheme);

  // 主题切换时：同步到 <html>（让 body 背景跟随主题）、持久化，并更新 Mermaid 主题
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", currentTheme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, currentTheme);
    } catch {
      /* ignore */
    }
    mermaid.initialize({
      startOnLoad: false,
      theme: currentTheme === "classic" ? "base" : "dark",
      securityLevel: "strict",
      maxTextSize: 500000,
    });
  }, [currentTheme]);

  // 监听 mermaidCode 的变化，渲染图表
  useEffect(() => {
    if (!mermaidCode || !graphRef.current) return;
    const run = async () => {
      try {
        const { svg } = await mermaid.render("callGraphSvg-" + Date.now(), mermaidCode);
        if (graphRef.current) {
          const styledSvg = svg.replace(
            '<svg ',
            '<svg style="max-width: none; height: auto; display: block; margin: 0 auto; background: var(--bg-deep);" '
          );
          graphRef.current.innerHTML = styledSvg;
        }
      } catch (err) {
        console.error("Mermaid 渲染失败", err);
        const msg = err instanceof Error ? err.message : String(err);
        setGraphError("图表渲染失败：" + msg);
        if (graphRef.current) {
          graphRef.current.innerHTML =
            '<div style="color:var(--danger-color);padding:20px;text-align:center;">⚠️ 图表渲染失败，可能是代码里含有 Mermaid 无法解析的字符。</div>';
        }
      }
    };
    run();
  }, [mermaidCode, graphLoading, currentTheme]);

  // 帮助弹窗打开时渲染核心流程图（固定深色底，保证任意主题下可读）
  useEffect(() => {
    if (!helpOpen || !helpGraphRef.current) return;
    let cancelled = false;
    const run = async () => {
      try {
        const { svg } = await mermaid.render("helpFlowSvg-" + Date.now(), HELP_FLOW);
        if (!cancelled && helpGraphRef.current) {
          helpGraphRef.current.innerHTML = svg.replace(
            "<svg ",
            '<svg style="max-width: 100%; height: auto; display: block; margin: 0 auto;" '
          );
        }
      } catch (err) {
        console.error("帮助流程图渲染失败", err);
        if (!cancelled && helpGraphRef.current) {
          helpGraphRef.current.innerHTML =
            '<div style="color:var(--danger-color);padding:12px;text-align:center;">⚠️ 流程图渲染失败</div>';
        }
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [helpOpen, currentTheme]);

  // 一键配置 C++ 编译环境：调用后端下载并解压 MinGW，返回是否成功
  async function installGcc(): Promise<boolean> {
    if (installingGcc) return false;
    setInstallingGcc(true);
    let ok = false;
    let msg = "";
    try {
      msg = await invoke<string>("check_and_install_gcc");
      ok = true;
    } catch (e) {
      msg = String(e);
    }
    setInstallingGcc(false);
    if (ok) {
      alert("✅ " + msg);
    } else {
      alert("❌ 配置 C++ 环境失败：" + msg);
    }
    return ok;
  }

  // 本地运行 C++
  async function runCode() {
    setRunning(true);
    setOutput("编译运行中...");
    try {
      const result = await invoke<string>("run_cpp", { code, stdin });
      setOutput(result);
    } catch (e) {
      if (isGccMissingError(e)) {
        setOutput("未找到 C++ 编译器（g++），正在为你自动配置环境…");
        await installGcc();
      } else {
        setOutput("调用失败：" + String(e));
      }
    } finally {
      setRunning(false);
    }
  }

  // 合并运行：有测试用例则跑全部测试，否则运行单个输入
  async function runAll() {
    if (testcases.length > 0) {
      await runTestcases();
    } else {
      await runCode();
    }
  }

  // 调用 AI 复盘
  async function runAiReview() {
    if (!apiKey.trim()) {
      alert("请先在 ⚙️ 设置 中填写 API Key。");
      setSettingsOpen(true);
      return;
    }
    setAiLoading(true);
    setAiResult("AI 正在分析中...");
    setAiParsed(null);
    try {
      const result = await invoke<string>("ai_review", { baseUrl: apiBaseUrl, modelName, apiKey, problem, code });
      setAiResult(result);
      try {
        const parsed = JSON.parse(result);
        setAiParsed(parsed);
        setUserCategory(parsed.category ?? []);
        setUserNotes(parsed.hint ?? "");
      } catch {
        setAiParsed(null);
        setUserCategory([]);
        setUserNotes("");
      }
    } catch (e) {
      setAiResult("调用失败：" + String(e));
    } finally {
      setAiLoading(false);
    }
  }

  // 读取题库列表
  async function loadProblems() {
    try {
      const list = await invoke<any[]>("list_problems");
      setProblems(list);
    } catch (e) {
      console.error("读取题库失败", e);
    }
  }

  // 读取今日待复习卡片数量
  async function loadDueCount() {
    try {
      const cards = await invoke<any[]>("get_due_cards");
      setDueCount(cards.length);
    } catch (e) {
      console.error("读取今日任务失败", e);
    }
  }

  // 打开某道题目，加载详情回编辑器/展示区
  async function openProblem(id: number) {
    try {
      const detail = await invoke<any>("get_problem_detail", { id });
      setCurrentProblemId(id);
      setCode(detail.code || "");
      setProblem(detail.statement || "");
      setStdin("");
      setOutput("");
      setAiResult(detail.ai_notes || "");
      if (detail.ai_notes) {
        try {
          setAiParsed(JSON.parse(detail.ai_notes));
        } catch {
          setAiParsed(null);
        }
      } else {
        setAiParsed(null);
      }
      setUserCategory(Array.isArray(detail.category) ? detail.category : []);
      setUserNotes(detail.notes || "");
      setTestcases(Array.isArray(detail.testcases) ? detail.testcases : []);
      setDifficulty(detail.difficulty || "中等");
      setRightTab("problem");
      setCategoryInput("");
    } catch (e) {
      alert("加载题目失败：" + String(e));
    }
  }

  // 新建题目：清空编辑器状态
  function newProblem() {
    setCurrentProblemId(null);
    setCode("");
    setProblem("");
    setStdin("");
    setOutput("");
    setAiResult("");
    setAiParsed(null);
    setUserCategory([]);
    setUserNotes("");
    setTestcases([]);
    setDifficulty("中等");
    setRightTab("problem");
    setCategoryInput("");
  }

  // 添加分类标签
  function addCategory() {
    const tag = categoryInput.trim();
    if (!tag) return;
    if (!userCategory.includes(tag)) {
      setUserCategory([...userCategory, tag]);
    }
    setCategoryInput("");
  }

  // 删除分类标签
  function removeCategory(tag: string) {
    setUserCategory(userCategory.filter((t) => t !== tag));
  }

  // 保存题目（新建或更新）+ 新建时生成三张卡片
  async function saveCard() {
    try {
      const aiCategory = aiParsed?.category ?? [];

      const savedId = await invoke<number>("save_problem", {
        id: currentProblemId,
        title: problem.substring(0, 30),
        statement: problem,
        code: code,
        aiCategory: aiCategory,
        category: userCategory,
        aiNotes: aiResult,
        notes: userNotes,
        testcases: testcases,
        difficulty: difficulty,
      });
      setCurrentProblemId(savedId);
      await loadProblems();
      loadDueCount();
      alert("已保存");
    } catch (e) {
      alert("保存失败：" + String(e));
    }
  }

  // 导出题库：后端返回纯 JSON 文本，前端复制到剪贴板并触发浏览器下载
  async function exportProblems() {
    try {
      const json = await invoke<string>("export_problems");
      let copied = true;
      try {
        await navigator.clipboard.writeText(json);
      } catch {
        copied = false;
      }
      const blob = new Blob([json], { type: "application/json;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const date = new Date().toISOString().slice(0, 10);
      a.download = `algorecall-题库-${date}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      alert(
        copied
          ? "已导出题库：JSON 已复制到剪贴板，并触发文件下载。"
          : "已导出题库：已触发文件下载（剪贴板不可用）。"
      );
    } catch (e) {
      alert("导出失败：" + String(e));
    }
  }

  // 从本地文件读取分享的 JSON 文本到导入框
  function readImportFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setImportText(String(reader.result ?? ""));
    reader.onerror = () => alert("读取文件失败");
    reader.readAsText(file);
  }

  // 执行导入：后端严格解析并去重，返回新增/跳过数量
  async function doImport() {
    const data = importText.trim();
    if (!data) {
      alert("请先粘贴或读取要导入的 JSON 数据。");
      return;
    }
    setImporting(true);
    try {
      const res = await invoke<{ inserted: number; skipped: number }>("import_problems", { data });
      setImportOpen(false);
      setImportText("");
      await loadProblems();
      alert(`导入完成：新增 ${res.inserted} 道，跳过重复 ${res.skipped} 道。`);
    } catch (e) {
      alert("导入失败：" + String(e));
    } finally {
      setImporting(false);
    }
  }

  // 删除题目（连带卡片与复习记录）
  async function deleteProblem(id: number) {
    if (!confirm("确定删除这道题吗？将同时删除对应的复习卡片与复习历史。")) return;
    try {
      await invoke("delete_problem", { id });
      if (currentProblemId === id) {
        newProblem();
      }
      await loadProblems();
      loadDueCount();
    } catch (e) {
      alert("删除失败：" + String(e));
    }
  }

  // 添加 / 修改 / 删除测试用例
  function addTestcase() {
    setTestcases([...testcases, { input: "", output: "" }]);
  }
  function updateTestcase(i: number, field: "input" | "output", value: string) {
    setTestcases(testcases.map((tc, idx) => (idx === i ? { ...tc, [field]: value } : tc)));
  }
  function removeTestcase(i: number) {
    setTestcases(testcases.filter((_, idx) => idx !== i));
  }

  // 运行所有测试用例并判题
  async function runTestcases() {
    if (!testcases.length) {
      alert("请先添加至少一个测试用例。");
      return;
    }
    setJudging(true);
    setOutput("正在编译并运行所有测试用例…");
    try {
      const result = await invoke<string>("run_testcases", { code, testcases });
      setOutput(result);
    } catch (e) {
      if (isGccMissingError(e)) {
        setOutput("未找到 C++ 编译器（g++），正在为你自动配置环境…");
        await installGcc();
      } else {
        setOutput("判题失败：" + String(e));
      }
    } finally {
      setJudging(false);
    }
  }

  // 进入复习模式
  async function startReview() {
    try {
      const cards = await invoke<any[]>("get_due_cards");
      if (cards.length === 0) {
        alert("当前没有到期的卡片。");
        return;
      }
      setDueCards(cards);
      setCurrentIndex(0);
      setShowBack(false);
      setUserAnswer("");
      setReviewMode(true);
    } catch (e) {
      alert("读取失败：" + String(e));
    }
  }

  // 全部重排：把所有卡片复习时间重置为现在，然后直接进入复习模式
  async function startImmediateReview() {
    if (!window.confirm("警告：这将重置所有卡片的复习时间，确定要继续吗？")) {
      return;
    }
    try {
      await invoke("reset_reviews");
      await startReview();
    } catch (e) {
      alert("重置失败：" + String(e));
    }
  }

  // 提交一张卡的评分
  async function submitReview(rating: number) {
    const card = dueCards[currentIndex];
    if (!card) return;

    const score = rating === 0 ? 0.0 : rating === 1 ? 0.5 : 1.0;

    // 使用 ts-fsrs 根据卡片当前的 stability / difficulty 计算下一次复习时间与新的记忆状态。
    // 0=忘了→Again, 1=模糊→Hard, 2=记得→Good。
    const f = fsrs({ enable_short_term: false });
    const now = new Date();

    const baseCard = createEmptyCard();
    baseCard.due = new Date(card.next_review);
    baseCard.stability = Number(card.stability ?? 0);
    baseCard.difficulty = Number(card.difficulty ?? 0);
    // stability 为 0 视为新卡，否则视为复习中的卡片
    baseCard.state = baseCard.stability > 0 ? State.Review : State.New;
    baseCard.reps = baseCard.stability > 0 ? 1 : 0;

    const scheduling = f.repeat(baseCard, now);
    const nextItem =
      rating === 0
        ? scheduling[Rating.Again]
        : rating === 1
        ? scheduling[Rating.Hard]
        : scheduling[Rating.Good];

    const nextReview = toLocalRfc3339(nextItem.card.due);
    const stability = nextItem.card.stability;
    const difficulty = nextItem.card.difficulty;

    try {
      await invoke("record_review", {
        cardId: card.card_id,
        rating,
        answer: userAnswer,
        score,
        nextReview,
        stability,
        difficulty,
      });
    } catch (e) {
      console.error("记录失败", e);
    }

    if (currentIndex + 1 < dueCards.length) {
      setCurrentIndex(currentIndex + 1);
      setShowBack(false);
      setUserAnswer("");
    } else {
      setReviewMode(false);
      alert("今日复习完成！");
    }
    loadDueCount();
  }

  // 生成函数调用图
  async function loadCallGraph() {
    setGraphLoading(true);
    setShowCallGraph(true);
    setMermaidCode("");
    setGraphError("");
    try {
      const result = await invoke<string>("build_call_graph", { code });
      const graph = JSON.parse(result);

      // 节点内 HTML 内容转义（防注入、防 Mermaid 解析错乱）
      const escHtml = (s: string) =>
        (s || "")
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;");

      // 边 label：先做完整 HTML 转义（含 < > &，防注入），再去掉会破坏 |"..."| 语法的字符
      const escEdge = (s: string) =>
        (s || "")
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "'")
          .replace(/`/g, "'")
          .replace(/\s+/g, " ")
          .trim();

      // flowchart TD + 主题配色（随 currentTheme 变化的字面量，保证黑白主题下可读）
      const mc = THEME_MERMAID[currentTheme] ?? THEME_MERMAID.wasteland;
      let mmd = "flowchart TD\n";
      mmd += "  classDef fnNode fill:" + mc.nodeBg + ",stroke:" + (THEME_ACCENT[currentTheme] || mc.edge) + ",stroke-width:2px,color:" + mc.nodeText + ";\n";
      mmd += "  linkStyle default stroke:" + mc.edge + ",stroke-width:1.5px,fill:none;\n";

      graph.nodes.forEach((n: any) => {
        const sig = n.signature
          ? `<br/><span style='color:${mc.sig};font-size:11px'>${escHtml(n.signature)}</span>`
          : "";
        mmd += `  ${n.id}["<b>${escHtml(n.label)}</b>${sig}"]\n`;
        mmd += `  class ${n.id} fnNode;\n`;
      });

      graph.edges.forEach((e: any) => {
        const lbl = escEdge(e.label || "");
        if (lbl) {
          mmd += `  ${e.from} -->|"${lbl}"| ${e.to}\n`;
        } else {
          mmd += `  ${e.from} --> ${e.to}\n`;
        }
      });

      setMermaidCode(mmd);
    } catch (e) {
      setGraphError("生成调用图失败：" + String(e));
    } finally {
      setGraphLoading(false);
    }
  }

  // 派生数据：去重后的题目类型、筛选后的题库列表（按难度/类型/搜索过滤）
  const allTypes = Array.from(
    new Set(problems.flatMap((p) => (Array.isArray(p.category) ? (p.category as string[]) : [])))
  ).sort();
  const filteredProblems = problems.filter((p) => {
    const diff = (p.difficulty as string) || "中等";
    if (difficultyFilter !== "全部" && diff !== difficultyFilter) return false;
    const cats = Array.isArray(p.category) ? (p.category as string[]) : [];
    if (typeFilter !== "全部" && !cats.includes(typeFilter)) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const hay = `${p.title} ${cats.join(" ")}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  return (
    <div data-theme={currentTheme} style={{ display: "flex", flexDirection: "column", height: "100vh", margin: 0 }}>
      {/* 顶部栏 */}
      <div
        style={{
          padding: "12px 14px",
          background: "var(--bg-panel)",
          borderBottom: "1px solid var(--border-color)",
          display: "flex",
          gap: "12px",
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <strong>AlgoRecall</strong>
        <button
          onClick={runAll}
          disabled={running || judging}
          title={testcases.length > 0 ? "有测试用例，将运行全部测试" : "无测试用例，运行输入框中的样例"}
          style={{ padding: "8px 20px", cursor: "pointer", background: "var(--accent-color)", color: "var(--on-accent)", border: "1px solid var(--accent-color)", borderRadius: "var(--radius)", fontSize: 14, fontWeight: 700, boxShadow: "0 2px 6px var(--accent-soft)" }}
        >
          {running || judging ? "运行中..." : "▶ 运行"}
        </button>
        <button
          onClick={runAiReview}
          disabled={aiLoading}
          style={{ padding: "8px 16px", cursor: "pointer", background: "transparent", color: "var(--accent-color)", border: "1px solid var(--accent-color)", borderRadius: "var(--radius)" }}
        >
          {aiLoading ? "AI 分析中..." : "✨ AI 复盘"}
        </button>
        <button
          onClick={saveCard}
          style={{ padding: "8px 16px", cursor: "pointer", background: "transparent", color: "var(--accent-color)", border: "1px solid var(--accent-color)", borderRadius: "var(--radius)" }}
        >
          💾 保存题目
        </button>
        <button
          onClick={loadCallGraph}
          style={{ padding: "8px 16px", cursor: "pointer", background: "transparent", color: "var(--accent-color)", border: "1px solid var(--accent-color)", borderRadius: "var(--radius)" }}
        >
          🔗 调用图
        </button>
        <button
          onClick={() => setHelpOpen(true)}
          style={{ marginLeft: "auto", padding: "8px 16px", cursor: "pointer", background: "transparent", color: "var(--text-muted)", border: "1px solid var(--border-color)", borderRadius: "var(--radius)" }}
        >
          ❓ 帮助
        </button>
        <button
          onClick={() => setSettingsOpen(true)}
          style={{ padding: "8px 16px", cursor: "pointer", background: "transparent", color: "var(--accent-color)", border: "1px solid var(--accent-color)", borderRadius: "var(--radius)" }}
        >
          ⚙️ 设置
        </button>
      </div>

      {/* 复习面板 */}
      {reviewMode && dueCards[currentIndex] && (
        <ReviewPanel
          card={dueCards[currentIndex]}
          index={currentIndex}
          total={dueCards.length}
          showBack={showBack}
          onShowBack={() => setShowBack(true)}
          userAnswer={userAnswer}
          setUserAnswer={setUserAnswer}
          onSubmit={submitReview}
          onExit={() => setReviewMode(false)}
          theme={currentTheme}
          installGcc={installGcc}
        />
      )}

      {/* 主体区域（复习时隐藏） */}
      {!reviewMode && (
        <div style={{ display: "flex", flex: 1, overflow: "hidden", position: "relative" }}>
          
          {/* 调用图面板浮层 */}
          {showCallGraph && (
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, background: "var(--bg-deep)", zIndex: 10, padding: 20, overflow: "auto" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12, color: "var(--text-color)" }}>
                <strong>🔗 函数调用图</strong>
                <button onClick={() => setShowCallGraph(false)} style={{ cursor: "pointer", padding: "4px 10px" }}>关闭</button>
              </div>
              {graphLoading ? (
                <div style={{ color: "var(--text-color)" }}>正在解析代码结构并生成图表…</div>
              ) : graphError ? (
                <div style={{ padding: 20, background: "var(--danger-soft)", border: "1px solid var(--danger-color)", borderRadius: "var(--radius)", color: "var(--danger-text)" }}>
                  ⚠️ {graphError}
                </div>
              ) : (
                <div 
                  ref={graphRef} 
                  style={{ 
                    width: "100%", 
                    height: "85vh",
                    overflow: "auto",
                    background: "var(--bg-deep)",
                    border: "1px solid var(--border-color)",
                    borderRadius: "var(--radius)",
                    padding: "20px",
                    boxSizing: "border-box",
                    display: "flex",
                    justifyContent: "center"
                  }} 
                />
              )}
            </div>
          )}

          {/* 左侧：新建 + 今日待复习 + 可折叠的题库侧边栏 */}
          <div style={{ width: 260, minWidth: 260, background: "var(--bg-panel)", borderRight: "1px solid var(--border-color)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
            {/* ＋ 新建：固定在侧边栏最顶部 */}
            <div style={{ padding: "10px", borderBottom: "1px solid var(--border-color)" }}>
              <button
                onClick={newProblem}
                style={{ width: "100%", padding: "10px 12px", cursor: "pointer", background: "var(--success-color)", color: "var(--on-accent)", border: "none", borderRadius: "var(--radius-sm)", fontSize: 14, fontWeight: 700, boxShadow: "0 2px 6px var(--accent-soft)" }}
              >
                ＋ 新建
              </button>
            </div>

            {/* 今日待复习 */}
            <button
              onClick={startReview}
              style={{ padding: "12px 14px", cursor: "pointer", background: "transparent", border: "none", borderBottom: "1px solid var(--border-color)", display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", fontSize: 14, fontWeight: 600, color: "var(--text-color)" }}
            >
              <span>📅 今日待复习</span>
              <span style={{ background: "var(--accent-color)", color: "var(--on-accent)", borderRadius: "var(--radius-lg)", padding: "2px 10px", fontSize: 12 }}>{dueCount}</span>
            </button>

            {/* 全部题库（默认折叠） */}
            <button
              onClick={() => setLibraryOpen(!libraryOpen)}
              style={{ padding: "12px 14px", cursor: "pointer", background: "transparent", border: "none", borderBottom: "1px solid var(--border-color)", display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", fontSize: 14, fontWeight: 600, color: "var(--text-color)" }}
            >
              <span>📚 全部题库</span>
              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{libraryOpen ? "▲" : "▼"}</span>
            </button>

            {libraryOpen && (
              <>
                <div style={{ padding: "10px", borderBottom: "1px solid var(--border-color)", display: "flex", flexDirection: "column", gap: 8 }}>
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="🔍 搜索标题 / 类型"
                    style={{ width: "100%", boxSizing: "border-box", padding: "8px 10px", fontSize: 12, border: "1px solid var(--border-color)", borderRadius: "var(--radius-sm)" }}
                  />
                  <div style={{ display: "flex", gap: 8 }}>
                    <select
                      value={difficultyFilter}
                      onChange={(e) => setDifficultyFilter(e.target.value)}
                      style={{ flex: 1, padding: "8px 6px", fontSize: 12, border: "1px solid var(--border-color)", borderRadius: "var(--radius-sm)", background: "var(--bg-panel-2)" }}
                    >
                      <option value="全部">全部难度</option>
                      <option value="简单">简单</option>
                      <option value="中等">中等</option>
                      <option value="困难">困难</option>
                    </select>
                    <select
                      value={typeFilter}
                      onChange={(e) => setTypeFilter(e.target.value)}
                      style={{ flex: 1, padding: "8px 6px", fontSize: 12, border: "1px solid var(--border-color)", borderRadius: "var(--radius-sm)", background: "var(--bg-panel-2)" }}
                    >
                      <option value="全部">全部类型</option>
                      {allTypes.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                </div>
            <div style={{ flex: 1, overflow: "auto" }}>
              {problems.length === 0 ? (
                <div style={{ padding: 12, color: "var(--text-muted)", fontSize: 13 }}>暂无题目</div>
              ) : filteredProblems.length === 0 ? (
                <div style={{ padding: 12, color: "var(--text-muted)", fontSize: 13 }}>无匹配结果</div>
              ) : (
                filteredProblems.map((p) => {
                  const cats = Array.isArray(p.category) ? (p.category as string[]) : [];
                  const diff = (p.difficulty as string) || "中等";
                  const diffColor =
                    diff === "简单" ? "var(--success-color)" : diff === "困难" ? "var(--danger-color)" : "var(--warning-color)";
                  return (
                    <div
                      key={p.id}
                      onClick={() => openProblem(p.id)}
                      style={{
                        padding: "10px 12px",
                        cursor: "pointer",
                        borderBottom: "1px solid var(--border-soft)",
                        background: currentProblemId === p.id ? "var(--accent-soft)" : "transparent",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 4 }}>
                        <div style={{ fontWeight: 600, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                          {p.title}
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteProblem(p.id);
                          }}
                          title="删除这道题"
                          style={{ cursor: "pointer", background: "transparent", border: "none", fontSize: 13, padding: 0, color: "var(--text-muted)" }}
                        >
                          🗑️
                        </button>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 3, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 11, padding: "1px 6px", borderRadius: "var(--radius)", background: diffColor, color: "var(--on-accent)" }}>{diff}</span>
                        {cats.slice(0, 3).map((t) => (
                          <span key={t} style={{ fontSize: 11, padding: "1px 6px", borderRadius: "var(--radius)", background: "var(--bg-panel-2)", color: "var(--text-muted)" }}>{t}</span>
                        ))}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 2 }}>{p.created_at}</div>
                    </div>
                  );
                })
              )}
            </div>
              </>
            )}

            {/* 底部：全部重排 */}
            <div style={{ borderTop: "1px solid var(--border-color)", padding: "10px", display: "flex", flexDirection: "column", gap: 8 }}>
              <button
                onClick={startImmediateReview}
                style={{ padding: "8px 10px", cursor: "pointer", background: "transparent", color: "var(--text-muted)", border: "1px solid var(--border-color)", borderRadius: "var(--radius-sm)", fontSize: 13 }}
              >
                🔄 全部重排
              </button>
            </div>
          </div>

          {/* 左侧：输入区 + 编辑器 + 运行结果 */}
          <div style={{ flex: 2, minWidth: 0, borderRight: "1px solid var(--border-color)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
            {/* 输入区（可折叠）：stdin 输入 + 测试用例 */}
            <div style={{ borderBottom: "1px solid var(--border-color)", background: "var(--bg-panel)" }}>
              <button
                onClick={() => setInputOpen(!inputOpen)}
                style={{ width: "100%", padding: "6px 12px", cursor: "pointer", background: "transparent", color: "var(--text-muted)", border: "none", fontSize: 12, textAlign: "left", display: "flex", alignItems: "center", gap: 6 }}
              >
                <span>⌨️ 输入 / 测试用例</span>
                <span style={{ marginLeft: "auto" }}>{inputOpen ? "▲ 收起" : "▼ 展开"}</span>
              </button>
              {inputOpen && (
                <div style={{ padding: "8px", display: "flex", flexDirection: "column", gap: 8, maxHeight: 240, overflow: "auto" }}>
                  <div>
                    <div style={{ fontSize: 12, marginBottom: 4, color: "var(--text-muted)" }}>输入</div>
                    <textarea
                      value={stdin}
                      onChange={(e) => setStdin(e.target.value)}
                      style={{ width: "100%", height: 60, boxSizing: "border-box", background: "var(--bg-panel-2)", color: "var(--text-color)", border: "1px solid var(--border-color)", padding: 6, fontFamily: "monospace", fontSize: 12, borderRadius: "var(--radius-sm)" }}
                    />
                  </div>
                  <div>
                    <div style={{ fontSize: 12, marginBottom: 4, color: "var(--text-muted)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span>🧪 测试用例（样例输入/输出）</span>
                      <span style={{ display: "flex", gap: 6 }}>
                        <button onClick={addTestcase} style={{ padding: "6px 10px", cursor: "pointer", background: "var(--accent-color)", color: "var(--on-accent)", border: "none", borderRadius: "var(--radius-sm)", fontSize: 12 }}>
                          ＋ 添加
                        </button>
                      </span>
                    </div>
                    {testcases.length === 0 ? (
                      <div style={{ fontSize: 12, color: "var(--text-faint)", padding: "4px 0" }}>暂无测试用例，点击「＋ 添加」补充样例输入与期望输出。</div>
                    ) : (
                      testcases.map((tc, i) => (
                        <div key={i} style={{ marginBottom: 8, padding: 8, background: "var(--bg-panel-2)", border: "1px solid var(--border-color)", borderRadius: "var(--radius-sm)" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{i === 0 ? "测试用例 1（样例）" : `测试用例 ${i + 1}`}</span>
                            <span onClick={() => removeTestcase(i)} style={{ cursor: "pointer", color: "var(--danger-color)", fontSize: 14 }}>×</span>
                          </div>
                          <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 2 }}>输入</div>
                          <textarea
                            value={tc.input}
                            onChange={(e) => updateTestcase(i, "input", e.target.value)}
                            style={{ width: "100%", height: 44, boxSizing: "border-box", background: "var(--bg-deep)", color: "var(--text-color)", border: "1px solid var(--border-color)", padding: 4, fontFamily: "monospace", fontSize: 12, marginBottom: 4 }}
                          />
                          <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 2 }}>期望输出</div>
                          <textarea
                            value={tc.output}
                            onChange={(e) => updateTestcase(i, "output", e.target.value)}
                            style={{ width: "100%", height: 44, boxSizing: "border-box", background: "var(--bg-deep)", color: "var(--text-color)", border: "1px solid var(--border-color)", padding: 4, fontFamily: "monospace", fontSize: 12 }}
                          />
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* 编辑器 */}
            <div style={{ flex: 1, minHeight: 0 }}>
              <Editor
                height="100%"
                defaultLanguage="cpp"
                value={code}
                onChange={(v) => setCode(v || "")}
                theme={currentTheme === "classic" ? "light" : "vs-dark"}
                options={{ fontSize: 16, minimap: { enabled: false }, scrollBeyondLastLine: false }}
              />
            </div>

            {/* 运行结果 */}
            <div style={{ height: 150, borderTop: "1px solid var(--border-color)", background: "var(--bg-panel)", display: "flex", flexDirection: "column" }}>
              <div style={{ padding: "6px 12px", borderBottom: "1px solid var(--border-soft)", fontSize: 12, color: "var(--text-muted)" }}>运行结果</div>
              <pre style={{ flex: 1, overflow: "auto", whiteSpace: "pre-wrap", fontFamily: "monospace", fontSize: 12, margin: 0, padding: "8px 12px", color: "var(--text-color)" }}>{output || "（暂无输出，运行后在此查看结果）"}</pre>
            </div>
          </div>

          {/* 右侧：题目描述 / AI复盘与笔记 */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "var(--bg-deep)", color: "var(--text-color)", overflow: "hidden" }}>
            <div style={{ display: "flex", borderBottom: "1px solid var(--border-color)" }}>
              {([
                { key: "problem", label: "📄 题目描述" },
                { key: "ai", label: "✨ AI复盘与笔记" },
              ] as const).map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setRightTab(tab.key)}
                  style={{
                    flex: 1,
                    padding: "8px 4px",
                    cursor: "pointer",
                    background: rightTab === tab.key ? "var(--bg-panel-2)" : "transparent",
                    color: rightTab === tab.key ? "var(--text-color)" : "var(--text-muted)",
                    border: "none",
                    borderBottom: rightTab === tab.key ? "2px solid var(--accent-color)" : "2px solid transparent",
                    fontSize: 13,
                    whiteSpace: "nowrap",
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div style={{ flex: 1, overflow: "auto" }}>
              {rightTab === "problem" && (
                <div>
                  <div style={{ padding: "8px", borderBottom: "1px solid var(--border-color)" }}>
                    <div style={{ fontSize: 12, marginBottom: 4, color: "var(--text-muted)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span>题目描述</span>
                      <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--text-muted)" }}>
                        难度
                        <select
                          value={difficulty}
                          onChange={(e) => setDifficulty(e.target.value)}
                          style={{ background: "var(--bg-panel-2)", color: "var(--text-color)", border: "1px solid var(--border-color)", borderRadius: "var(--radius-sm)", padding: "2px 4px", fontSize: 12 }}
                        >
                          <option value="简单">简单</option>
                          <option value="中等">中等</option>
                          <option value="困难">困难</option>
                        </select>
                      </label>
                    </div>
                    <textarea
                      value={problem}
                      onChange={(e) => setProblem(e.target.value)}
                      style={{ width: "100%", height: 220, background: "var(--bg-panel-2)", color: "var(--text-color)", border: "1px solid var(--border-color)", padding: 6, fontFamily: "monospace", fontSize: 12 }}
                    />
                  </div>

                </div>
              )}

              {rightTab === "ai" && (
                <div>
            <div style={{ padding: "8px", flex: 1, overflow: "auto" }}>
              <div style={{ fontSize: 12, marginBottom: 4, color: "var(--text-muted)" }}>✨ AI 复盘</div>

              {aiParsed && (
                <div style={{ fontSize: 13, lineHeight: 1.6, marginBottom: 12 }}>
                  <div><strong>模式：</strong>{aiParsed.pattern}</div>
                  <div><strong>算法：</strong>{aiParsed.algorithm}</div>
                  <div><strong>数据结构：</strong>{(aiParsed.data_structures || []).join("、")}</div>
                  <div><strong>不变量：</strong>{aiParsed.invariant}</div>
                  <div><strong>复杂度：</strong>时间 {aiParsed.time_complexity}，空间 {aiParsed.space_complexity}</div>
                  <div style={{ marginTop: 6 }}><strong>步骤：</strong></div>
                  <ol style={{ margin: "4px 0 4px 20px", padding: 0 }}>
                    {(aiParsed.steps || []).map((s: string, i: number) => <li key={i}>{s}</li>)}
                  </ol>
                  <div><strong>易错点：</strong></div>
                  <ul style={{ margin: "4px 0 4px 20px", padding: 0 }}>
                    {(aiParsed.pitfalls || []).map((p: string, i: number) => <li key={i}>{p}</li>)}
                  </ul>
                  <div><strong>相似题：</strong>{(aiParsed.similar_problems || []).join("、")}</div>
                  <div style={{ marginTop: 6, padding: 8, background: "var(--info-soft)", color: "var(--info-text)", borderRadius: "var(--radius-sm)" }}>
                    <strong>💡 AI 提示：</strong>{aiParsed.hint}
                  </div>
                </div>
              )}

              {!aiParsed && aiResult && (
                <pre style={{ whiteSpace: "pre-wrap", fontFamily: "sans-serif", fontSize: 13, margin: "0 0 12px" }}>{aiResult}</pre>
              )}

              {/* 可编辑：分类标签 */}
              <div style={{ fontSize: 12, marginBottom: 4, color: "var(--text-muted)" }}>分类标签</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 6 }}>
                {userCategory.map((tag) => (
                  <span
                    key={tag}
                    style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "var(--accent-color)", color: "var(--on-accent)", padding: "2px 8px", borderRadius: "var(--radius-lg)", fontSize: 12 }}
                  >
                    {tag}
                    <span onClick={() => removeCategory(tag)} style={{ cursor: "pointer", fontWeight: "bold" }}>×</span>
                  </span>
                ))}
              </div>
              <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
                <input
                  value={categoryInput}
                  onChange={(e) => setCategoryInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addCategory();
                    }
                  }}
                  placeholder="添加分类，回车确认"
                  style={{ flex: 1, background: "var(--bg-panel-2)", color: "var(--text-color)", border: "1px solid var(--border-color)", padding: 4, fontSize: 12, borderRadius: "var(--radius-sm)" }}
                />
                <button
                  onClick={addCategory}
                  style={{ padding: "4px 10px", cursor: "pointer", background: "var(--accent-color)", color: "var(--on-accent)", border: "none", borderRadius: "var(--radius-sm)", fontSize: 12 }}
                >
                  添加
                </button>
              </div>

              {/* 可编辑：笔记 */}
              <div style={{ fontSize: 12, marginBottom: 4, color: "var(--text-muted)" }}>📝 笔记</div>
              <textarea
                value={userNotes}
                onChange={(e) => setUserNotes(e.target.value)}
                placeholder="记录你的思路、易错点、总结…"
                style={{ width: "100%", height: 120, background: "var(--bg-panel-2)", color: "var(--text-color)", border: "1px solid var(--border-color)", padding: 6, fontFamily: "sans-serif", fontSize: 13, borderRadius: "var(--radius-sm)", boxSizing: "border-box" }}
              />
            </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 导入题库弹窗 */}
      {importOpen && (
        <div style={{ position: "fixed", inset: 0, background: "var(--overlay)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "var(--bg-panel)", width: 560, maxWidth: "90vw", maxHeight: "80vh", borderRadius: "var(--radius)", padding: 20, display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <strong>📥 导入题库</strong>
              <button onClick={() => setImportOpen(false)} style={{ cursor: "pointer", padding: "4px 10px" }}>关闭</button>
            </div>
            <div style={{ fontSize: 13, color: "var(--info-text)", background: "var(--info-soft)", padding: "8px 10px", borderRadius: "var(--radius-sm)", marginBottom: 10 }}>
              📌 请粘贴分享的 JSON 数据。软件会自动识别并去重，不会覆盖你已有的题目。
            </div>
            <textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder='{"version":1,"problems":[{...}]}'
              style={{ width: "100%", height: 220, boxSizing: "border-box", fontFamily: "monospace", fontSize: 12, padding: 8, border: "1px solid var(--border-color)", borderRadius: "var(--radius-sm)" }}
            />
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 12 }}>
              <input type="file" accept=".json,application/json,text/plain" onChange={readImportFile} />
              <div style={{ flex: 1 }} />
              <button onClick={doImport} disabled={importing} style={{ padding: "6px 16px", cursor: "pointer", background: "var(--success-color)", color: "var(--on-accent)", border: "none", borderRadius: "var(--radius-sm)" }}>
                {importing ? "导入中..." : "开始导入"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 设置弹窗：AI 配置 / 主题外观 / 数据管理 */}
      {settingsOpen && (
        <div style={{ position: "fixed", inset: 0, background: "var(--overlay)", zIndex: 120, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "var(--bg-panel)", width: 520, maxWidth: "92vw", borderRadius: "var(--radius)", padding: 20, display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <strong>⚙️ 设置</strong>
              <button onClick={() => setSettingsOpen(false)} style={{ cursor: "pointer", padding: "4px 10px" }}>关闭</button>
            </div>

            {/* 三个 Tab */}
            <div style={{ display: "flex", gap: 4, borderBottom: "1px solid var(--border-color)", marginBottom: 16 }}>
              {([
                { key: "ai", label: "AI 配置" },
                { key: "theme", label: "主题外观" },
                { key: "data", label: "数据管理" },
              ] as const).map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setSettingsTab(tab.key)}
                  style={{
                    padding: "8px 14px",
                    cursor: "pointer",
                    background: settingsTab === tab.key ? "var(--bg-panel-2)" : "transparent",
                    color: settingsTab === tab.key ? "var(--text-color)" : "var(--text-muted)",
                    border: "none",
                    borderBottom: settingsTab === tab.key ? "2px solid var(--accent-color)" : "2px solid transparent",
                    fontSize: 13,
                    whiteSpace: "nowrap",
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {settingsTab === "ai" && (
              <div style={{ display: "flex", flexDirection: "column" }}>
                <label style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 4 }}>API Key</label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-..."
                  style={{ width: "100%", boxSizing: "border-box", padding: "6px 8px", fontSize: 13, marginBottom: 12, fontFamily: "monospace" }}
                />

                <details style={{ marginBottom: 12 }}>
                  <summary style={{ cursor: "pointer", color: "var(--accent-color)", fontSize: 13, userSelect: "none" }}>
                    高级设置（Base URL / 模型名称）
                  </summary>
                  <div style={{ marginTop: 12, display: "flex", flexDirection: "column" }}>
                    <label style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 4 }}>API Base URL</label>
                    <input
                      value={apiBaseUrl}
                      onChange={(e) => setApiBaseUrl(e.target.value)}
                      placeholder="https://api.deepseek.com"
                      style={{ width: "100%", boxSizing: "border-box", padding: "6px 8px", fontSize: 13, marginBottom: 12, fontFamily: "monospace" }}
                    />
                    <label style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 4 }}>模型名称</label>
                    <input
                      value={modelName}
                      onChange={(e) => setModelName(e.target.value)}
                      placeholder="deepseek-chat"
                      style={{ width: "100%", boxSizing: "border-box", padding: "6px 8px", fontSize: 13, marginBottom: 4, fontFamily: "monospace" }}
                    />
                  </div>
                </details>

                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <button
                    onClick={() => setSettingsOpen(false)}
                    style={{ padding: "6px 16px", cursor: "pointer", background: "var(--success-color)", color: "var(--on-accent)", border: "none", borderRadius: "var(--radius-sm)" }}
                  >
                    完成
                  </button>
                </div>
                <div style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 10, textAlign: "right" }}>
                  💡 配置修改后将自动保存，关闭窗口即可生效。
                </div>
              </div>
            )}

            {settingsTab === "theme" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 4 }}>选择主题，界面配色会即时切换。</div>
                {THEME_OPTIONS.map((t) => (
                  <button
                    key={t.key}
                    onClick={() => setCurrentTheme(t.key)}
                    style={{
                      padding: "10px 12px",
                      cursor: "pointer",
                      background: currentTheme === t.key ? "var(--accent-color)" : "transparent",
                      color: currentTheme === t.key ? "var(--on-accent)" : "var(--text-color)",
                      border: "1px solid " + (currentTheme === t.key ? "var(--accent-color)" : "var(--border-color)"),
                      borderRadius: "var(--radius)",
                      fontSize: 14,
                      textAlign: "left",
                    }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            )}

            {settingsTab === "data" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ fontSize: 13, color: "var(--text-muted)" }}>题库数据的备份与迁移。</div>
                <button
                  onClick={exportProblems}
                  style={{ padding: "10px 12px", cursor: "pointer", background: "transparent", color: "var(--text-color)", border: "1px solid var(--border-color)", borderRadius: "var(--radius-sm)", fontSize: 13, textAlign: "left" }}
                >
                  📤 导出题库
                </button>
                <button
                  onClick={() => setImportOpen(true)}
                  style={{ padding: "10px 12px", cursor: "pointer", background: "transparent", color: "var(--text-color)", border: "1px solid var(--border-color)", borderRadius: "var(--radius-sm)", fontSize: 13, textAlign: "left" }}
                >
                  📥 导入题库
                </button>

                <div style={{ height: 1, background: "var(--border-color)", margin: "6px 0" }} />
                <div style={{ fontSize: 13, color: "var(--text-muted)" }}>C++ 编译环境：本地运行 / 测试代码需要 g++ 编译器。</div>
                <button
                  onClick={installGcc}
                  disabled={installingGcc}
                  style={{ padding: "10px 12px", cursor: "pointer", background: "transparent", color: "var(--accent-color)", border: "1px solid var(--accent-color)", borderRadius: "var(--radius-sm)", fontSize: 13, textAlign: "left" }}
                >
                  {installingGcc ? "🔧 配置中…" : "🔧 一键配置 C++ 环境"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* C++ 环境安装中的提示弹窗 */}
      {installingGcc && (
        <div style={{ position: "fixed", inset: 0, background: "var(--overlay)", zIndex: 140, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "var(--bg-panel)", width: 420, maxWidth: "90vw", borderRadius: "var(--radius)", padding: 24, display: "flex", flexDirection: "column", alignItems: "center", gap: 16, textAlign: "center" }}>
            <div className="gcc-spinner" />
            <strong>正在配置 C++ 编译环境</strong>
            <div style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.6 }}>
              正在为你自动下载 C++ 编译器环境（MinGW），大概需要 1-2 分钟，请耐心等待...
            </div>
          </div>
        </div>
      )}

      {/* 帮助弹窗：新手使用指南 + 核心流程图 */}
      {helpOpen && (
        <div style={{ position: "fixed", inset: 0, background: "var(--overlay)", zIndex: 130, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "var(--bg-panel)", width: 660, maxWidth: "92vw", maxHeight: "86vh", borderRadius: "var(--radius)", padding: 20, display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <strong>❓ 新手使用指南</strong>
              <button onClick={() => setHelpOpen(false)} style={{ cursor: "pointer", padding: "4px 10px" }}>关闭</button>
            </div>
            <div style={{ overflow: "auto", flex: 1, paddingRight: 4 }}>
              {/* 核心使用流程（Mermaid 渲染） */}
              <div ref={helpGraphRef} style={{ background: "var(--bg-deep)", borderRadius: "var(--radius)", padding: 14, marginBottom: 16, minHeight: 140 }} />

              {/* 分步指南 */}
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {GUIDE_STEPS.map((s) => (
                  <div key={s.title} style={{ display: "flex", gap: 12 }}>
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: "50%",
                        background: "var(--accent-soft)",
                        color: "var(--accent-color)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        fontSize: 16,
                      }}
                    >
                      {s.emoji}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, marginBottom: 2 }}>{s.title}</div>
                      <div style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.6 }}>{s.body}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// ============ 复习面板组件 ============
function ReviewPanel({
  card,
  index,
  total,
  showBack,
  onShowBack,
  userAnswer,
  setUserAnswer,
  onSubmit,
  onExit,
  theme,
  installGcc,
}: {
  card: any;
  index: number;
  total: number;
  showBack: boolean;
  onShowBack: () => void;
  userAnswer: string;
  setUserAnswer: (s: string) => void;
  onSubmit: (rating: number) => void;
  onExit: () => void;
  theme: string;
  installGcc: () => Promise<boolean>;
}) {
  const typeLabel =
    card.card_type === "write"
      ? "默写卡（只看题面，写出核心代码）"
      : card.card_type === "hint"
      ? "看提示写（允许参考算法标签与不变量）"
      : "复述卡（用自己的话讲思路）";

  const typeColor =
    card.card_type === "write"
      ? "var(--danger-color)"
      : card.card_type === "hint"
      ? "var(--warning-color)"
      : "var(--accent-color)";

  const [testResult, setTestResult] = useState("");
  const [testing, setTesting] = useState(false);

  // 运行用户默写的代码，方便自测
  async function runTest() {
    if (!userAnswer.trim()) {
      setTestResult("【提示】请先输入代码。");
      return;
    }
    setTesting(true);
    setTestResult("编译运行中…");
    try {
      const result = await invoke<string>("run_cpp", { code: userAnswer, stdin: "" });
      setTestResult(result);
    } catch (e) {
      if (isGccMissingError(e)) {
        setTestResult("未找到 C++ 编译器（g++），正在为你自动配置环境…");
        await installGcc();
      } else {
        setTestResult("运行失败：" + String(e));
      }
    } finally {
      setTesting(false);
    }
  }

  return (
    <div style={{ flex: 1, padding: 20, background: "var(--bg-deep)", overflow: "auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12, alignItems: "center" }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ background: typeColor, color: "var(--on-accent)", padding: "2px 8px", borderRadius: "var(--radius-sm)", fontSize: 12 }}>
            {card.card_type}
          </span>
          <strong>{typeLabel}</strong>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
            {index + 1} / {total}
          </span>
          <button onClick={onExit} style={{ cursor: "pointer", padding: "4px 10px" }}>
            退出复习
          </button>
        </div>
      </div>

      {/* 正面 */}
      <div style={{ background: "var(--bg-panel)", padding: 16, borderRadius: "var(--radius)", marginBottom: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.1)" }}>
        <div style={{ fontSize: 12, color: "var(--text-faint)", marginBottom: 4 }}>题目</div>
        <div style={{ fontWeight: "bold", marginBottom: 8 }}>{card.title}</div>
        <div style={{ whiteSpace: "pre-wrap", fontSize: 14 }}>{card.statement}</div>

        {card.card_type === "hint" && (
          <div style={{ marginTop: 12, padding: 8, background: "var(--info-soft)", borderRadius: "var(--radius-sm)", fontSize: 13 }}>
            <div style={{ color: "var(--warning-color)", marginBottom: 4 }}>💡 提示（参考 AI 笔记）</div>
            <div style={{ whiteSpace: "pre-wrap" }}>{card.ai_notes || "（暂无提示）"}</div>
          </div>
        )}
      </div>

      {/* 背面 */}
      {!showBack ? (
        <button
          onClick={onShowBack}
          style={{ padding: "8px 16px", cursor: "pointer", background: "var(--accent-color)", color: "var(--on-accent)", border: "none", borderRadius: "var(--radius-sm)" }}
        >
          显示答案 / 开始作答
        </button>
      ) : (
        <div style={{ background: "var(--bg-panel)", padding: 16, borderRadius: "var(--radius)", boxShadow: "0 1px 4px rgba(0,0,0,0.1)" }}>
          {card.card_type === "recall" ? (
            <>
              <div style={{ fontSize: 12, color: "var(--text-faint)", marginBottom: 4 }}>你的复述</div>
              <textarea
                value={userAnswer}
                onChange={(e) => setUserAnswer(e.target.value)}
                style={{ width: "100%", height: 120, fontFamily: "monospace", padding: 8, border: "1px solid var(--border-color)", borderRadius: "var(--radius-sm)" }}
                placeholder="用自己的话写出思路步骤…"
              />
              <details style={{ marginTop: 12 }}>
                <summary style={{ cursor: "pointer", color: "var(--accent-color)" }}>对照参考答案</summary>
                <pre style={{ whiteSpace: "pre-wrap", fontSize: 13, marginTop: 8 }}>{card.ai_notes}</pre>
              </details>
            </>
          ) : (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <div style={{ fontSize: 12, color: "var(--text-faint)" }}>默写你的 C++ 代码</div>
                <button
                  onClick={runTest}
                  disabled={testing}
                  style={{ padding: "4px 10px", cursor: "pointer", background: "var(--accent-color)", color: "var(--on-accent)", border: "none", borderRadius: "var(--radius-sm)", fontSize: 12 }}
                >
                  {testing ? "运行中…" : "▶ 运行测试"}
                </button>
              </div>
              <Editor
                height="260px"
                defaultLanguage="cpp"
                language="cpp"
                value={userAnswer}
                onChange={(v) => setUserAnswer(v ?? "")}
                theme={theme === "classic" ? "light" : "vs-dark"}
                options={{ minimap: { enabled: false }, fontSize: 14, automaticLayout: true }}
              />
              {testResult && (
                <pre style={{ marginTop: 8, padding: 8, background: "var(--bg-deep)", color: "var(--text-color)", borderRadius: "var(--radius-sm)", whiteSpace: "pre-wrap", fontSize: 12, maxHeight: 160, overflow: "auto" }}>
                  {testResult}
                </pre>
              )}
              <details style={{ marginTop: 12 }}>
                <summary style={{ cursor: "pointer", color: "var(--accent-color)" }}>查看参考答案 / AI 笔记</summary>
                <pre style={{ whiteSpace: "pre-wrap", fontSize: 13, marginTop: 8 }}>{card.ai_notes}</pre>
              </details>
            </>
          )}

          <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
            <button
              onClick={() => onSubmit(0)}
              style={{ padding: "6px 14px", cursor: "pointer", background: "var(--danger-color)", color: "var(--on-accent)", border: "none", borderRadius: "var(--radius-sm)" }}
            >
              😰 忘了
            </button>
            <button
              onClick={() => onSubmit(1)}
              style={{ padding: "6px 14px", cursor: "pointer", background: "var(--warning-color)", color: "var(--on-accent)", border: "none", borderRadius: "var(--radius-sm)" }}
            >
              😐 模糊
            </button>
            <button
              onClick={() => onSubmit(2)}
              style={{ padding: "6px 14px", cursor: "pointer", background: "var(--success-color)", color: "var(--on-accent)", border: "none", borderRadius: "var(--radius-sm)" }}
            >
              😎 记得
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;