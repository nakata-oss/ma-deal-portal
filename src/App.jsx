import { useState, useEffect, useRef } from "react";
import * as XLSX from "xlsx";

// ============================================================
// MOCK DATA & CONSTANTS
// ============================================================
const DEMO_USERS = [
  { id: "u1", email: "demo@mediaca.co.jp", password: "demo1234", role: "intermediary", company: "メディカ仲介株式会社", contact: "山田太郎" },
  { id: "u2", email: "next@synapsedeal.co.jp", password: "admin1234", role: "admin", company: "SynapseDeal株式会社", contact: "中田龍三" },
];

const SPECIALTIES = ["内科", "外科", "整形外科", "小児科", "産婦人科", "眼科", "皮膚科", "精神科", "泌尿器科", "耳鼻咽喉科", "放射線科", "麻酔科", "救急科", "リハビリテーション科", "歯科", "その他"];
const PREFS = ["北海道","青森","岩手","宮城","秋田","山形","福島","茨城","栃木","群馬","埼玉","千葉","東京","神奈川","新潟","富山","石川","福井","山梨","長野","岐阜","静岡","愛知","三重","滋賀","京都","大阪","兵庫","奈良","和歌山","鳥取","島根","岡山","広島","山口","徳島","香川","愛媛","高知","福岡","佐賀","長崎","熊本","大分","宮崎","鹿児島","沖縄"];
const STAGES = ["情報収集中", "NDA締結", "TOP面談", "LOI提出", "MOU締結", "DA締結", "クロージング", "検討終了"];
const STAGE_COLORS = {
  "情報収集中": "#94a3b8", "NDA締結": "#60a5fa", "TOP面談": "#a78bfa",
  "LOI提出": "#f59e0b", "MOU締結": "#f97316", "DA締結": "#10b981",
  "クロージング": "#0056D6", "検討終了": "#ef4444"
};

const INIT_DEALS = [
  {
    id: "d1", userId: "u1", companyName: "医療法人社団 桜花会", specialty: "内科", prefecture: "東京",
    revenue: 320000, operatingProfit: 28000, ebitda: 52000, ebitdaReal: 61000,
    ownerSalary: 24000, cash: 18500, debt: 42000,
    hopedPrice: 200000, beds: 0, clinics: 1, doctorAge: 63, fullTimeDoctors: 3, partTimeDoctors: 2,
    insuranceRatio: 90, selfPayRatio: 10,
    patients3y: [{ year: 2021, total: 12000, new: 2400, cont: 9600 }, { year: 2022, total: 12800, new: 2300, cont: 10500 }, { year: 2023, total: 13200, new: 2500, cont: 10700 }],
    successorInfo: "後任医師候補あり（内科専門医）", competitorInfo: "徒歩圏内に2院あり",
    stage: "TOP面談", status: "active", submittedAt: "2024-11-15", introducedBy: "u1",
    files: [{ name: "IM_桜花会.pdf", type: "IM" }, { name: "決算書3期.pdf", type: "FS" }],
    nextAction: "TOP面談日程調整中", memo: "理事長は引退希望。後任医師の確保が鍵。",
    fdFee: null, successFee: null,
  },
  {
    id: "d2", userId: "u1", companyName: "医療法人 緑風会クリニック", specialty: "産婦人科", prefecture: "神奈川",
    revenue: 480000, operatingProfit: 56000, ebitda: 78000, ebitdaReal: 92000,
    ownerSalary: 36000, cash: 31000, debt: 15000,
    hopedPrice: 350000, beds: 0, clinics: 1, doctorAge: 58, fullTimeDoctors: 2, partTimeDoctors: 4,
    insuranceRatio: 60, selfPayRatio: 40,
    patients3y: [{ year: 2021, total: 8500, new: 1200, cont: 7300 }, { year: 2022, total: 9200, new: 1350, cont: 7850 }, { year: 2023, total: 9800, new: 1500, cont: 8300 }],
    successorInfo: "未定", competitorInfo: "NIPT実施施設として近隣に競合なし",
    stage: "NDA締結", status: "active", submittedAt: "2024-12-01", introducedBy: "u1",
    files: [{ name: "IM_緑風会.pdf", type: "IM" }],
    nextAction: "3期財務書類の提出待ち", memo: "NIPTの自由診療比率が高く収益性優秀。",
    fdFee: null, successFee: null,
  },
  // --- メール仮登録デモデータ ---
  {
    id: "p1", userId: "u2", companyName: "医療法人 青空会クリニック", specialty: "内科", prefecture: "東京",
    revenue: 280000, operatingProfit: 22000, ebitda: null, ebitdaReal: 48000,
    ownerSalary: 24000, cash: null, debt: null,
    hopedPrice: 150000, beds: 0, clinics: 1, doctorAge: 67, fullTimeDoctors: 2, partTimeDoctors: 1,
    insuranceRatio: null, selfPayRatio: null, patients3y: [], files: [],
    successorInfo: "", competitorInfo: "",
    stage: "情報収集中", status: "pending", source: "email",
    submittedAt: "2025-04-28", introducedBy: null,
    introducedByEmail: "yamada@mediaca.co.jp", introducedByName: "山田太郎", introducedByCompany: "メディカ仲介株式会社",
    emailSubject: "案件ご紹介：内科クリニック（東京都新宿区）",
    nextAction: "初回ヒアリング", memo: "理事長67歳、後継者なし。希望価格1.5億円程度。売上約2.8億円、役員報酬2,400万円/年。",
    fdFee: null, successFee: null,
  },
  {
    id: "p2", userId: "u2", companyName: "医療法人社団 誠和会", specialty: "整形外科", prefecture: "埼玉",
    revenue: 520000, operatingProfit: 61000, ebitda: null, ebitdaReal: 89000,
    ownerSalary: 30000, cash: null, debt: null,
    hopedPrice: 280000, beds: 19, clinics: 1, doctorAge: 61, fullTimeDoctors: 4, partTimeDoctors: 3,
    insuranceRatio: null, selfPayRatio: null, patients3y: [], files: [],
    successorInfo: "", competitorInfo: "",
    stage: "情報収集中", status: "pending", source: "email",
    submittedAt: "2025-04-29", introducedBy: null,
    introducedByEmail: "info@maadvisory.co.jp", introducedByName: "鈴木一郎", introducedByCompany: "MAアドバイザリー株式会社",
    emailSubject: "【案件情報】整形外科有床クリニック（埼玉県）承継案件",
    nextAction: "初回ヒアリング", memo: "有床19床。リハビリ充実。売上5.2億円、EBITDA実態約8,900万円。マルチプル約3.1x。",
    fdFee: null, successFee: null,
  },
  {
    id: "p3", userId: "u2", companyName: "（ノンネーム）眼科クリニック", specialty: "眼科", prefecture: "大阪",
    revenue: 190000, operatingProfit: 31000, ebitda: null, ebitdaReal: 42000,
    ownerSalary: 18000, cash: null, debt: null,
    hopedPrice: 120000, beds: 0, clinics: 1, doctorAge: 64, fullTimeDoctors: 1, partTimeDoctors: 2,
    insuranceRatio: null, selfPayRatio: null, patients3y: [], files: [],
    successorInfo: "", competitorInfo: "",
    stage: "情報収集中", status: "pending", source: "newsletter",
    submittedAt: "2025-04-30", introducedBy: null,
    introducedByEmail: "newsletter@ma-medical.jp", introducedByName: null, introducedByCompany: "メディカルM&A総研",
    emailSubject: "【案件メルマガ Vol.47】今週の医療法人承継案件一覧",
    nextAction: "初回ヒアリング", memo: "メルマガから自動抽出。白内障・眼底検査中心。マルチプル2.9x。要件フィルタ通過済み。",
    fdFee: null, successFee: null,
  },
];

// ============================================================
// 自社要件フィルタ設定（メルマガ自動抽出用）
// ============================================================
const DEFAULT_FILTER_CRITERIA = {
  specialties: ["内科", "外科", "整形外科", "産婦人科", "眼科", "皮膚科", "小児科"],
  prefectures: ["東京", "神奈川", "埼玉", "千葉", "大阪", "愛知", "福岡"],
  maxMultiple: 5.0,
  minRevenue: 100000,   // 千円
  minEbitda: 20000,     // 千円
  maxDoctorAge: 75,
};


// ============================================================
// UTILS
// ============================================================
const fmt = (n) => n == null ? "—" : Math.round(n).toLocaleString("ja-JP");
const fmtM = (n) => n == null ? "—" : `${(n / 1000).toFixed(1)}M`;
const pct = (n) => n == null ? "—" : `${n}%`;
const multiple = (price, ebitda) => (ebitda && ebitda > 0) ? `${(price / ebitda).toFixed(1)}x` : "—";

// ============================================================
// STYLE CONSTANTS
// ============================================================
const C = {
  blue: "#0056D6", blueLt: "#EBF2FF", blueHv: "#0044B0",
  gold: "#B8952A", goldLt: "#FDF6E3",
  bg: "#F8F9FC", white: "#FFFFFF",
  text: "#1a2035", textMd: "#4a5568", textSm: "#718096",
  border: "#E2E8F0", borderFocus: "#0056D6",
  danger: "#ef4444", success: "#10b981", warn: "#f59e0b",
  sidebar: "#0F1E3C",
};

const sty = {
  app: { fontFamily: "'Noto Sans JP', 'Hiragino Kaku Gothic Pro', sans-serif", background: C.bg, minHeight: "100vh", color: C.text },
  card: { background: C.white, borderRadius: 12, border: `1px solid ${C.border}`, padding: "24px", marginBottom: 16 },
  btn: (v = "primary", sm) => ({
    background: v === "primary" ? C.blue : v === "gold" ? C.gold : v === "danger" ? C.danger : "transparent",
    color: v === "ghost" ? C.blue : "#fff",
    border: v === "ghost" ? `1.5px solid ${C.blue}` : "none",
    borderRadius: 8, padding: sm ? "6px 14px" : "10px 20px",
    fontSize: sm ? 13 : 14, fontWeight: 600, cursor: "pointer",
    display: "inline-flex", alignItems: "center", gap: 6,
  }),
  input: { width: "100%", padding: "9px 12px", borderRadius: 8, border: `1.5px solid ${C.border}`, fontSize: 14, boxSizing: "border-box", outline: "none", background: C.white },
  label: { fontSize: 12, fontWeight: 600, color: C.textMd, marginBottom: 4, display: "block" },
  badge: (color) => ({ background: color + "22", color: color, borderRadius: 20, padding: "3px 10px", fontSize: 12, fontWeight: 700, whiteSpace: "nowrap" }),
};

// ============================================================
// COMPONENTS
// ============================================================

function KPICard({ label, value, sub, color = C.blue, icon }) {
  return (
    <div style={{ ...sty.card, padding: "20px", marginBottom: 0, borderTop: `3px solid ${color}` }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: C.textSm, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 800, color: C.text, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: C.textSm, marginTop: 6 }}>{sub}</div>}
    </div>
  );
}

function Tag({ label, color }) {
  return <span style={sty.badge(color || C.blue)}>{label}</span>;
}

function Pill({ label }) {
  return <span style={{ background: C.blueLt, color: C.blue, borderRadius: 20, padding: "2px 10px", fontSize: 12, fontWeight: 600 }}>{label}</span>;
}

// ============================================================
// AUTH SCREEN
// ============================================================
function AuthScreen({ onLogin }) {
  const [tab, setTab] = useState("login"); // login | signup
  const [form, setForm] = useState({ email: "", password: "", company: "", contact: "" });
  const [err, setErr] = useState("");
  const [users, setUsers] = useState(DEMO_USERS);

  const handleLogin = () => {
    const u = users.find(u => u.email === form.email && u.password === form.password);
    if (!u) { setErr("メールアドレスまたはパスワードが正しくありません"); return; }
    onLogin(u);
  };

  const handleSignup = () => {
    if (!form.email || !form.password || !form.company || !form.contact) { setErr("すべての項目を入力してください"); return; }
    const nu = { id: `u${Date.now()}`, ...form, role: "intermediary" };
    setUsers([...users, nu]);
    onLogin(nu);
  };

  return (
    <div style={{ minHeight: "100vh", background: `linear-gradient(135deg, ${C.sidebar} 0%, #1a3a6e 100%)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 440, background: C.white, borderRadius: 20, overflow: "hidden", boxShadow: "0 32px 80px rgba(0,0,0,0.3)" }}>
        <div style={{ background: `linear-gradient(135deg, ${C.blue}, #0044B0)`, padding: "32px 40px", textAlign: "center" }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: "rgba(255,255,255,0.6)", letterSpacing: 3, marginBottom: 8 }}>SYNAPSEDEAL</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#fff" }}>M&A 案件受付ポータル</div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", marginTop: 6 }}>Medical M&A Deal Submission Platform</div>
        </div>
        <div style={{ padding: "32px 40px" }}>
          <div style={{ display: "flex", gap: 0, marginBottom: 28, background: C.bg, borderRadius: 10, padding: 4 }}>
            {["login", "signup"].map(t => (
              <button key={t} onClick={() => { setTab(t); setErr(""); }} style={{ flex: 1, padding: "9px 0", borderRadius: 8, border: "none", fontWeight: 700, fontSize: 14, cursor: "pointer", background: tab === t ? C.white : "transparent", color: tab === t ? C.blue : C.textMd, boxShadow: tab === t ? "0 2px 8px rgba(0,0,0,0.08)" : "none", transition: "all 0.2s" }}>
                {t === "login" ? "ログイン" : "新規登録"}
              </button>
            ))}
          </div>

          {err && <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: C.danger, marginBottom: 16 }}>{err}</div>}

          {tab === "signup" && (
            <>
              <div style={{ marginBottom: 14 }}>
                <label style={sty.label}>会社名 <span style={{ color: C.danger }}>*</span></label>
                <input style={sty.input} placeholder="例：○○M&Aアドバイザリー株式会社" value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} />
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={sty.label}>担当者名 <span style={{ color: C.danger }}>*</span></label>
                <input style={sty.input} placeholder="例：山田 太郎" value={form.contact} onChange={e => setForm({ ...form, contact: e.target.value })} />
              </div>
            </>
          )}
          <div style={{ marginBottom: 14 }}>
            <label style={sty.label}>メールアドレス <span style={{ color: C.danger }}>*</span></label>
            <input style={sty.input} type="email" placeholder="email@example.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={sty.label}>パスワード <span style={{ color: C.danger }}>*</span></label>
            <input style={sty.input} type="password" placeholder="8文字以上" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
          </div>

          <button style={{ ...sty.btn("primary"), width: "100%", justifyContent: "center", padding: "13px 0", fontSize: 15 }}
            onClick={tab === "login" ? handleLogin : handleSignup}>
            {tab === "login" ? "ログイン →" : "アカウント作成 →"}
          </button>

          {tab === "login" && (
            <div style={{ marginTop: 20, padding: "14px", background: C.bg, borderRadius: 8, fontSize: 12, color: C.textSm, lineHeight: 1.7 }}>
              <strong>デモアカウント</strong><br />
              仲介会社: demo@mediaca.co.jp / demo1234<br />
              管理者: next@synapsedeal.co.jp / admin1234
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// INTERMEDIARY PORTAL
// ============================================================
function IntermediaryPortal({ user, deals, onAddDeal, onUpdateDeal, onLogout }) {
  const [view, setView] = useState("list"); // list | new | detail
  const [selected, setSelected] = useState(null);
  const myDeals = deals.filter(d => d.userId === user.id);

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      {/* Sidebar */}
      <div style={{ width: 240, background: C.sidebar, color: "#fff", display: "flex", flexDirection: "column", flexShrink: 0 }}>
        <div style={{ padding: "28px 24px 20px" }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: "rgba(255,255,255,0.4)", letterSpacing: 3, marginBottom: 6 }}>SYNAPSEDEAL</div>
          <div style={{ fontSize: 16, fontWeight: 800 }}>案件受付ポータル</div>
          <div style={{ marginTop: 16, padding: "10px 12px", background: "rgba(255,255,255,0.07)", borderRadius: 10 }}>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginBottom: 2 }}>ログイン中</div>
            <div style={{ fontSize: 13, fontWeight: 700 }}>{user.company}</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)" }}>{user.contact}</div>
          </div>
        </div>
        <nav style={{ flex: 1, padding: "0 12px" }}>
          {[
            { id: "list", icon: "📋", label: "案件一覧" },
            { id: "new", icon: "➕", label: "新規案件登録" },
          ].map(item => (
            <button key={item.id} onClick={() => setView(item.id)} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "11px 14px", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: 600, marginBottom: 4, background: view === item.id ? "rgba(0,86,214,0.3)" : "transparent", color: view === item.id ? "#fff" : "rgba(255,255,255,0.6)", transition: "all 0.15s" }}>
              <span>{item.icon}</span>{item.label}
            </button>
          ))}
        </nav>
        <button onClick={onLogout} style={{ margin: "12px 16px 24px", background: "rgba(255,255,255,0.06)", border: "none", borderRadius: 8, padding: "10px 0", color: "rgba(255,255,255,0.5)", fontSize: 13, cursor: "pointer" }}>
          ログアウト
        </button>
      </div>

      {/* Main */}
      <div style={{ flex: 1, padding: "32px 36px", overflow: "auto" }}>
        {view === "list" && (
          <DealList deals={myDeals} onSelect={(d) => { setSelected(d); setView("detail"); }} isAdmin={false} />
        )}
        {view === "new" && (
          <DealForm onSubmit={(d) => { onAddDeal({ ...d, userId: user.id, introducedBy: user.id, stage: "情報収集中", submittedAt: new Date().toISOString().slice(0, 10), files: [], status: "active", fdFee: null, successFee: null }); setView("list"); }} />
        )}
        {view === "detail" && selected && (
          <DealDetail deal={selected} isAdmin={false} onBack={() => setView("list")} onUpdate={(d) => { onUpdateDeal(d); setSelected(d); }} />
        )}
      </div>
    </div>
  );
}

// ============================================================
// ADMIN PORTAL
// ============================================================
function AdminPortal({ user, deals, users, onUpdateDeal, onBulkAdd, onLogout }) {
  const [view, setView] = useState("dashboard");
  const [selected, setSelected] = useState(null);

  const pendingCount = deals.filter(d => d.status === "pending").length;

  const navItems = [
    { id: "dashboard", icon: "📊", label: "ダッシュボード" },
    { id: "pending", icon: "📬", label: "要確認", badge: pendingCount },
    { id: "deals", icon: "📁", label: "案件一覧" },
    { id: "pipeline", icon: "🔄", label: "パイプライン" },
    { id: "newsletter", icon: "📰", label: "メルマガ抽出" },
    { id: "companies", icon: "🏢", label: "仲介会社管理" },
    { id: "import", icon: "📥", label: "Excelインポート" },
  ];

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <div style={{ width: 240, background: C.sidebar, color: "#fff", display: "flex", flexDirection: "column", flexShrink: 0 }}>
        <div style={{ padding: "28px 24px 20px" }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: "rgba(255,255,255,0.4)", letterSpacing: 3, marginBottom: 6 }}>SYNAPSEDEAL</div>
          <div style={{ fontSize: 16, fontWeight: 800 }}>管理者ダッシュボード</div>
          <div style={{ marginTop: 16, padding: "10px 12px", background: "rgba(0,86,214,0.25)", borderRadius: 10, border: "1px solid rgba(0,86,214,0.4)" }}>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginBottom: 2 }}>管理者</div>
            <div style={{ fontSize: 13, fontWeight: 700 }}>{user.contact}</div>
          </div>
        </div>
        <nav style={{ flex: 1, padding: "0 12px" }}>
          {navItems.map(item => (
            <button key={item.id} onClick={() => setView(item.id)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", padding: "11px 14px", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: 600, marginBottom: 4, background: view === item.id ? "rgba(0,86,214,0.3)" : "transparent", color: view === item.id ? "#fff" : "rgba(255,255,255,0.6)", transition: "all 0.15s" }}>
              <span style={{ display: "flex", alignItems: "center", gap: 10 }}><span>{item.icon}</span>{item.label}</span>
              {item.badge > 0 && <span style={{ background: C.danger, color: "#fff", borderRadius: 10, padding: "1px 7px", fontSize: 11, fontWeight: 800 }}>{item.badge}</span>}
            </button>
          ))}
        </nav>
        <button onClick={onLogout} style={{ margin: "12px 16px 24px", background: "rgba(255,255,255,0.06)", border: "none", borderRadius: 8, padding: "10px 0", color: "rgba(255,255,255,0.5)", fontSize: 13, cursor: "pointer" }}>
          ログアウト
        </button>
      </div>

      <div style={{ flex: 1, padding: "32px 36px", overflow: "auto" }}>
        {view === "dashboard" && <AdminDashboard deals={deals} users={users} onSelectDeal={(d) => { setSelected(d); setView("dealDetail"); }} onGoPending={() => setView("pending")} />}
        {view === "pending" && <PendingReview deals={deals} onUpdate={onUpdateDeal} onSelect={(d) => { setSelected(d); setView("dealDetail"); }} />}
        {view === "deals" && <DealList deals={deals} onSelect={(d) => { setSelected(d); setView("dealDetail"); }} isAdmin={true} users={users} />}
        {view === "pipeline" && <PipelineView deals={deals} onSelect={(d) => { setSelected(d); setView("dealDetail"); }} onUpdate={onUpdateDeal} />}
        {view === "companies" && <CompanyView deals={deals} users={users} onSelect={(d) => { setSelected(d); setView("dealDetail"); }} />}
        {view === "newsletter" && <NewsletterFilter onBulkAdd={(newDeals) => { onBulkAdd(newDeals); setView("pending"); }} />}
        {view === "import" && <ExcelImport deals={deals} onBulkAdd={(newDeals) => { onBulkAdd(newDeals); setView("deals"); }} />}
        {view === "dealDetail" && selected && (
          <DealDetail deal={selected} isAdmin={true} onBack={() => setView(selected.status === "pending" ? "pending" : "deals")} onUpdate={(d) => { onUpdateDeal(d); setSelected(d); }} users={users} />
        )}
      </div>
    </div>
  );
}

// ============================================================
// ADMIN DASHBOARD
// ============================================================
function AdminDashboard({ deals, users, onSelectDeal, onGoPending }) {
  const [selectedStage, setSelectedStage] = useState(null);

  const pending = deals.filter(d => d.status === "pending");
  const active = deals.filter(d => d.stage !== "検討終了" && d.status !== "pending");
  const stageMap = {};
  STAGES.forEach(s => stageMap[s] = deals.filter(d => d.stage === s && d.status !== "pending"));

  const displayDeals = selectedStage ? stageMap[selectedStage] : active;

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>ダッシュボード</h1>
        <p style={{ color: C.textSm, margin: "4px 0 0", fontSize: 14 }}>ステージをクリックすると案件一覧にフィルタされます</p>
      </div>

      {/* 要確認バナー */}
      {pending.length > 0 && (
        <div onClick={onGoPending} style={{ background: "#fff7ed", border: `1.5px solid ${C.warn}`, borderRadius: 12, padding: "14px 20px", marginBottom: 24, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 22 }}>📬</span>
            <div>
              <div style={{ fontWeight: 800, fontSize: 15, color: "#92400e" }}>メールから {pending.length}件 の仮登録案件があります</div>
              <div style={{ fontSize: 13, color: "#b45309", marginTop: 2 }}>確認・補完して本登録してください</div>
            </div>
          </div>
          <span style={{ ...sty.btn("ghost", true), borderColor: C.warn, color: C.warn }}>確認する →</span>
        </div>
      )}

      {/* Summary KPI */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 24 }}>
        <KPICard label="進行中案件数" value={active.length} sub="検討終了・仮登録を除く" color={C.blue} />
        <KPICard label="仲介会社数" value={users.filter(u => u.role === "intermediary").length} sub="登録済み" color={C.gold} />
        <KPICard label="検討終了" value={stageMap["検討終了"]?.length || 0} sub="累計" color={C.textSm} />
      </div>

      {/* Clickable stage cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 28 }}>
        {STAGES.filter(s => s !== "検討終了").map(s => {
          const count = stageMap[s]?.length || 0;
          const isActive = selectedStage === s;
          return (
            <div key={s}
              onClick={() => setSelectedStage(isActive ? null : s)}
              style={{
                background: isActive ? STAGE_COLORS[s] : C.white,
                border: `2px solid ${isActive ? STAGE_COLORS[s] : C.border}`,
                borderRadius: 12, padding: "16px 18px", cursor: "pointer",
                transition: "all 0.15s", boxShadow: isActive ? `0 4px 16px ${STAGE_COLORS[s]}44` : "none",
              }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: isActive ? "rgba(255,255,255,0.8)" : C.textSm, marginBottom: 6, letterSpacing: 0.5 }}>{s}</div>
              <div style={{ fontSize: 34, fontWeight: 900, color: isActive ? "#fff" : STAGE_COLORS[s], lineHeight: 1 }}>{count}</div>
              <div style={{ fontSize: 11, color: isActive ? "rgba(255,255,255,0.6)" : C.textSm, marginTop: 4 }}>件 {count > 0 ? "▸ クリックで表示" : ""}</div>
            </div>
          );
        })}
      </div>

      {/* Filtered deal list */}
      <div style={sty.card}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 15 }}>
            {selectedStage
              ? <><Tag label={selectedStage} color={STAGE_COLORS[selectedStage]} /> <span style={{ marginLeft: 8 }}>の案件 {displayDeals.length}件</span></>
              : `進行中案件 ${displayDeals.length}件`}
          </div>
          {selectedStage && (
            <button style={sty.btn("ghost", true)} onClick={() => setSelectedStage(null)}>✕ フィルタ解除</button>
          )}
        </div>
        {displayDeals.length === 0 ? (
          <div style={{ padding: "40px 0", textAlign: "center", color: C.textSm }}>該当案件なし</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${C.border}` }}>
                {["法人名", "診療科", "都道府県", "希望価格", "マルチプル", "ステージ", "Next Action"].map(h => (
                  <th key={h} style={{ textAlign: "left", padding: "8px 12px", fontSize: 12, color: C.textSm, fontWeight: 700 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayDeals.map(d => (
                <tr key={d.id} onClick={() => onSelectDeal(d)} style={{ borderBottom: `1px solid ${C.border}`, cursor: "pointer" }}
                  onMouseEnter={e => e.currentTarget.style.background = C.blueLt}
                  onMouseLeave={e => e.currentTarget.style.background = ""}>
                  <td style={{ padding: "10px 12px", fontWeight: 700, fontSize: 13 }}>{d.companyName}</td>
                  <td style={{ padding: "10px 12px", fontSize: 13 }}>{d.specialty}</td>
                  <td style={{ padding: "10px 12px", fontSize: 13 }}>{d.prefecture}</td>
                  <td style={{ padding: "10px 12px", fontSize: 13, fontFamily: "monospace" }}>{d.hopedPrice ? `¥${fmt(d.hopedPrice)}千` : "—"}</td>
                  <td style={{ padding: "10px 12px", fontSize: 13, fontWeight: 800, color: C.blue }}>{multiple(d.hopedPrice, d.ebitdaReal)}</td>
                  <td style={{ padding: "10px 12px" }}><Tag label={d.stage} color={STAGE_COLORS[d.stage]} /></td>
                  <td style={{ padding: "10px 12px", fontSize: 12, color: C.textMd }}>{d.nextAction || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ============================================================
// PENDING REVIEW（メール仮登録の確認画面）
// ============================================================
function PendingReview({ deals, onUpdate, onSelect }) {
  const pending = deals.filter(d => d.status === "pending");

  const approve = (d) => onUpdate({ ...d, status: "active" });
  const reject  = (d) => onUpdate({ ...d, status: "rejected" });

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>要確認案件 <span style={{ fontSize: 16, color: C.danger, fontWeight: 700 }}>({pending.length}件)</span></h1>
        <p style={{ color: C.textSm, fontSize: 14, margin: "4px 0 0" }}>メールから自動取込された仮登録案件です。内容を確認して本登録または却下してください。</p>
      </div>

      {pending.length === 0 ? (
        <div style={{ ...sty.card, textAlign: "center", padding: "60px 0", color: C.textSm }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
          <div style={{ fontWeight: 700 }}>要確認案件はありません</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {pending.map(d => (
            <div key={d.id} style={{ ...sty.card, borderLeft: `4px solid ${C.warn}` }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 18 }}>📬</span>
                    <span style={{ fontWeight: 800, fontSize: 16 }}>{d.companyName}</span>
                    <Tag label="仮登録" color={C.warn} />
                  </div>
                  <div style={{ fontSize: 13, color: C.textSm }}>
                    紹介元: {d.introducedByCompany || d.introducedByName || d.introducedByEmail || "—"}
                    {d.introducedByEmail && <span style={{ marginLeft: 8, color: C.blue }}>({d.introducedByEmail})</span>}
                  </div>
                  {d.emailSubject && <div style={{ fontSize: 12, color: C.textSm, marginTop: 2 }}>件名: {d.emailSubject}</div>}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button style={sty.btn("ghost", true)} onClick={() => onSelect(d)}>詳細・編集</button>
                  <button style={sty.btn("primary", true)} onClick={() => approve(d)}>✅ 本登録</button>
                  <button style={{ ...sty.btn("ghost", true), borderColor: C.danger, color: C.danger }} onClick={() => reject(d)}>✕ 却下</button>
                </div>
              </div>

              {/* 解析された情報のプレビュー */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12, padding: "12px 0", borderTop: `1px solid ${C.border}` }}>
                {[
                  ["診療科", d.specialty], ["都道府県", d.prefecture],
                  ["売上", d.revenue ? `¥${fmt(d.revenue)}千` : "—"],
                  ["希望価格", d.hopedPrice ? `¥${fmt(d.hopedPrice)}千` : "—"],
                  ["マルチプル", multiple(d.hopedPrice, d.ebitdaReal)],
                ].map(([k, v]) => (
                  <div key={k}>
                    <div style={{ fontSize: 11, color: C.textSm, fontWeight: 700, marginBottom: 2 }}>{k}</div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{v || "—"}</div>
                  </div>
                ))}
              </div>

              {d.memo && (
                <div style={{ marginTop: 10, padding: "10px 12px", background: C.bg, borderRadius: 8, fontSize: 13, color: C.textMd }}>
                  📝 {d.memo}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// DEAL LIST
// ============================================================
function DealList({ deals, onSelect, isAdmin, users }) {
  const [q, setQ] = useState("");
  const [stage, setStage] = useState("all");
  const [spec, setSpec] = useState("all");
  const filtered = deals.filter(d =>
    (stage === "all" || d.stage === stage) &&
    (spec === "all" || d.specialty === spec) &&
    (!q || d.companyName.includes(q) || d.specialty.includes(q) || d.prefecture.includes(q))
  );

  const exportCSV = () => {
    const headers = ["法人名", "診療科", "都道府県", "売上(千円)", "EBITDA実態(千円)", "希望価格(千円)", "マルチプル", "ステージ", "登録日"];
    const rows = filtered.map(d => [d.companyName, d.specialty, d.prefecture, d.revenue, d.ebitdaReal, d.hopedPrice, multiple(d.hopedPrice, d.ebitdaReal), d.stage, d.submittedAt]);
    const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "案件一覧.csv"; a.click();
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>案件一覧</h1>
        <button style={sty.btn("ghost", true)} onClick={exportCSV}>📥 CSV出力</button>
      </div>
      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        <input style={{ ...sty.input, width: 220 }} placeholder="法人名・診療科で検索" value={q} onChange={e => setQ(e.target.value)} />
        <select style={{ ...sty.input, width: 160 }} value={stage} onChange={e => setStage(e.target.value)}>
          <option value="all">全ステージ</option>
          {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select style={{ ...sty.input, width: 140 }} value={spec} onChange={e => setSpec(e.target.value)}>
          <option value="all">全診療科</option>
          {SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div style={sty.card}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: `2px solid ${C.border}` }}>
              {["法人名", "診療科", "都道府県", "売上", "EBITDA実態", "希望価格", "倍率", isAdmin ? "紹介元" : null, "ステージ", "登録日"].filter(Boolean).map(h => (
                <th key={h} style={{ textAlign: "left", padding: "8px 10px", fontSize: 12, color: C.textSm, fontWeight: 700 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={10} style={{ padding: "40px 0", textAlign: "center", color: C.textSm }}>案件がありません</td></tr>
            )}
            {filtered.map(d => {
              const intro = users?.find(u => u.id === d.introducedBy);
              return (
                <tr key={d.id} onClick={() => onSelect(d)} style={{ borderBottom: `1px solid ${C.border}`, cursor: "pointer" }}
                  onMouseEnter={e => e.currentTarget.style.background = C.blueLt}
                  onMouseLeave={e => e.currentTarget.style.background = ""}>
                  <td style={{ padding: "10px 10px", fontWeight: 700, fontSize: 13 }}>{d.companyName}</td>
                  <td style={{ padding: "10px 10px", fontSize: 13 }}>{d.specialty}</td>
                  <td style={{ padding: "10px 10px", fontSize: 13 }}>{d.prefecture}</td>
                  <td style={{ padding: "10px 10px", fontSize: 12, fontFamily: "monospace" }}>{fmt(d.revenue)}</td>
                  <td style={{ padding: "10px 10px", fontSize: 12, fontFamily: "monospace", fontWeight: 700 }}>{fmt(d.ebitdaReal)}</td>
                  <td style={{ padding: "10px 10px", fontSize: 12, fontFamily: "monospace" }}>{fmt(d.hopedPrice)}</td>
                  <td style={{ padding: "10px 10px", fontSize: 12, fontWeight: 800, color: C.blue }}>{multiple(d.hopedPrice, d.ebitdaReal)}</td>
                  {isAdmin && <td style={{ padding: "10px 10px", fontSize: 12 }}>{intro?.company || "—"}</td>}
                  <td style={{ padding: "10px 10px" }}><Tag label={d.stage} color={STAGE_COLORS[d.stage]} /></td>
                  <td style={{ padding: "10px 10px", fontSize: 12, color: C.textSm }}>{d.submittedAt}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================================
// PIPELINE VIEW (Kanban)
// ============================================================
function PipelineView({ deals, onSelect, onUpdate }) {
  const cols = STAGES.slice(0, 7); // exclude 検討終了 from main kanban

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>パイプライン</h1>
      <p style={{ color: C.textSm, marginBottom: 24, fontSize: 14 }}>ステージをドラッグで変更可能</p>
      <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 16 }}>
        {cols.map(stage => {
          const col = deals.filter(d => d.stage === stage);
          return (
            <div key={stage} style={{ minWidth: 200, flex: "0 0 200px" }}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { const id = e.dataTransfer.getData("dealId"); const d = deals.find(x => x.id === id); if (d) onUpdate({ ...d, stage }); }}>
              <div style={{ background: STAGE_COLORS[stage] + "20", borderRadius: 10, padding: "10px 14px", marginBottom: 10, borderTop: `3px solid ${STAGE_COLORS[stage]}` }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: STAGE_COLORS[stage] }}>{stage}</div>
                <div style={{ fontSize: 20, fontWeight: 800 }}>{col.length}</div>
              </div>
              {col.map(d => (
                <div key={d.id} draggable
                  onDragStart={e => e.dataTransfer.setData("dealId", d.id)}
                  onClick={() => onSelect(d)}
                  style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 8, padding: "12px 14px", marginBottom: 8, cursor: "grab", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
                  <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>{d.companyName}</div>
                  <div style={{ fontSize: 12, color: C.textSm }}>{d.specialty} / {d.prefecture}</div>
                  {d.ebitdaReal && <div style={{ fontSize: 12, color: C.blue, fontWeight: 700, marginTop: 6 }}>EBITDA: ¥{fmt(d.ebitdaReal)}千</div>}
                  {d.nextAction && <div style={{ fontSize: 11, color: C.textSm, marginTop: 4, borderTop: `1px solid ${C.border}`, paddingTop: 4 }}>▸ {d.nextAction}</div>}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================
// COMPANY VIEW
// ============================================================
function CompanyView({ deals, users, onSelect }) {
  const companies = users.filter(u => u.role === "intermediary");
  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 24 }}>仲介会社管理</h1>
      <div style={{ display: "grid", gap: 16 }}>
        {companies.map(c => {
          const cDeals = deals.filter(d => d.introducedBy === c.id);
          return (
            <div key={c.id} style={sty.card}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 4 }}>{c.company}</div>
                  <div style={{ fontSize: 13, color: C.textSm }}>担当: {c.contact} | {c.email}</div>
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <KPICard label="紹介案件数" value={cDeals.length} color={C.blue} />
                </div>
              </div>
              {cDeals.length > 0 && (
                <div style={{ marginTop: 16, display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {cDeals.map(d => (
                    <div key={d.id} onClick={() => onSelect(d)} style={{ background: C.blueLt, borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontSize: 13, fontWeight: 600, color: C.blue }}>
                      {d.companyName} <Tag label={d.stage} color={STAGE_COLORS[d.stage]} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================
// DEAL DETAIL
// ============================================================
function DealDetail({ deal, isAdmin, onBack, onUpdate, users }) {
  const [tab, setTab] = useState("overview");
  const [editStage, setEditStage] = useState(deal.stage);
  const [nextAction, setNextAction] = useState(deal.nextAction || "");
  const [memo, setMemo] = useState(deal.memo || "");
  const [fdFee, setFdFee] = useState(deal.fdFee || "");
  const [successFee, setSuccessFee] = useState(deal.successFee || "");

  const save = () => onUpdate({ ...deal, stage: editStage, nextAction, memo, fdFee: fdFee ? Number(fdFee) : null, successFee: successFee ? Number(successFee) : null });

  const netCash = (deal.cash || 0) - (deal.debt || 0);
  const adjPrice = deal.hopedPrice ? deal.hopedPrice + netCash : null;

  const tabs = [
    { id: "overview", label: "概要" },
    { id: "financial", label: "財務情報" },
    { id: "patients", label: "患者情報" },
    { id: "files", label: "ファイル" },
    ...(isAdmin ? [{ id: "admin", label: "管理情報" }] : []),
  ];

  return (
    <div>
      <button onClick={onBack} style={{ ...sty.btn("ghost", true), marginBottom: 20 }}>← 一覧に戻る</button>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 6px" }}>{deal.companyName}</h1>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Pill label={deal.specialty} /><Pill label={deal.prefecture} />
            <Tag label={deal.stage} color={STAGE_COLORS[deal.stage]} />
            <span style={{ fontSize: 13, color: C.textSm }}>登録: {deal.submittedAt}</span>
          </div>
        </div>
        {isAdmin && (
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <select style={{ ...sty.input, width: 160 }} value={editStage} onChange={e => setEditStage(e.target.value)}>
              {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <button style={sty.btn("primary", true)} onClick={save}>保存</button>
          </div>
        )}
      </div>

      {/* KPI Strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12, marginBottom: 24 }}>
        <KPICard label="売上" value={`¥${fmt(deal.revenue)}千`} color={C.blue} />
        <KPICard label="EBITDA（実態）" value={`¥${fmt(deal.ebitdaReal)}千`} color={C.gold} />
        <KPICard label="NetCash" value={`¥${fmt(netCash)}千`} color={netCash >= 0 ? C.success : C.danger} />
        <KPICard label="希望価格" value={`¥${fmt(deal.hopedPrice)}千`} color="#8b5cf6" />
        <KPICard label="マルチプル" value={multiple(adjPrice, deal.ebitdaReal)} sub="Net調整後" color="#f97316" />
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 0, borderBottom: `2px solid ${C.border}`, marginBottom: 24 }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: "10px 20px", border: "none", background: "none", cursor: "pointer", fontWeight: 700, fontSize: 14, color: tab === t.id ? C.blue : C.textSm, borderBottom: tab === t.id ? `2px solid ${C.blue}` : "2px solid transparent", marginBottom: -2 }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          <div style={sty.card}>
            <h3 style={{ margin: "0 0 16px", fontSize: 14, color: C.textSm, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>基本情報</h3>
            {[["診療科目", deal.specialty], ["所在地", deal.prefecture], ["理事長年齢", deal.doctorAge ? `${deal.doctorAge}歳` : "—"], ["常勤医師数", deal.fullTimeDoctors ? `${deal.fullTimeDoctors}名` : "—"], ["非常勤医師数", deal.partTimeDoctors ? `${deal.partTimeDoctors}名` : "—"], ["病床数", deal.beds || 0], ["拠点数", deal.clinics || 1], ["保険診療割合", pct(deal.insuranceRatio)], ["自由診療割合", pct(deal.selfPayRatio)]].map(([k, v]) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: `1px solid ${C.border}`, fontSize: 13 }}>
                <span style={{ color: C.textMd }}>{k}</span><span style={{ fontWeight: 600 }}>{v}</span>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={sty.card}>
              <h3 style={{ margin: "0 0 10px", fontSize: 14, color: C.textSm, fontWeight: 700 }}>後任医師情報</h3>
              <p style={{ fontSize: 13, color: C.text, margin: 0 }}>{deal.successorInfo || "—"}</p>
            </div>
            <div style={sty.card}>
              <h3 style={{ margin: "0 0 10px", fontSize: 14, color: C.textSm, fontWeight: 700 }}>競合情報</h3>
              <p style={{ fontSize: 13, color: C.text, margin: 0 }}>{deal.competitorInfo || "—"}</p>
            </div>
            {isAdmin && (
              <div style={sty.card}>
                <h3 style={{ margin: "0 0 10px", fontSize: 14, color: C.textSm, fontWeight: 700 }}>Next Action</h3>
                <input style={sty.input} value={nextAction} onChange={e => setNextAction(e.target.value)} placeholder="次のアクション" />
                <h3 style={{ margin: "14px 0 10px", fontSize: 14, color: C.textSm, fontWeight: 700 }}>メモ</h3>
                <textarea style={{ ...sty.input, height: 80, resize: "vertical" }} value={memo} onChange={e => setMemo(e.target.value)} />
                <button style={{ ...sty.btn("primary", true), marginTop: 10 }} onClick={save}>保存</button>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "financial" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          <div style={sty.card}>
            <h3 style={{ margin: "0 0 16px", fontSize: 14, fontWeight: 700, color: C.textSm, textTransform: "uppercase", letterSpacing: 1 }}>損益情報（千円）</h3>
            {[["売上高", deal.revenue], ["売上総利益", deal.grossProfit], ["営業利益", deal.operatingProfit], ["税前利益", deal.pretaxProfit], ["EBITDA", deal.ebitda], ["EBITDA（実態）", deal.ebitdaReal], ["役員報酬（総額）", deal.ownerSalary], ["減価償却費", deal.depreciation]].map(([k, v]) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: `1px solid ${C.border}`, fontSize: 13 }}>
                <span style={{ color: C.textMd }}>{k}</span>
                <span style={{ fontWeight: 700, fontFamily: "monospace" }}>{v != null ? `¥${fmt(v)}` : "—"}</span>
              </div>
            ))}
          </div>
          <div style={sty.card}>
            <h3 style={{ margin: "0 0 16px", fontSize: 14, fontWeight: 700, color: C.textSm, textTransform: "uppercase", letterSpacing: 1 }}>バランスシート・対価（千円）</h3>
            {[["総資産", deal.totalAssets], ["固定負債", deal.fixedLiabilities], ["純資産", deal.netAssets], ["現預金", deal.cash], ["有利子負債", deal.debt], ["NetCash / (Debt)", netCash], ["", null], ["希望価格", deal.hopedPrice], ["Net調整後価格", adjPrice], ["マルチプル(Net調整)", multiple(adjPrice, deal.ebitdaReal)]].map(([k, v]) => k ? (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: `1px solid ${C.border}`, fontSize: 13 }}>
                <span style={{ color: C.textMd }}>{k}</span>
                <span style={{ fontWeight: 700, fontFamily: "monospace", color: k.includes("マルチプル") ? C.blue : undefined }}>{typeof v === "string" ? v : v != null ? `¥${fmt(v)}` : "—"}</span>
              </div>
            ) : <div key="sep" style={{ height: 8 }} />)}
            {isAdmin && (
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: `2px solid ${C.border}` }}>
                <h4 style={{ margin: "0 0 10px", fontSize: 13, fontWeight: 700, color: C.gold }}>FD報酬（当社）</h4>
                <div style={{ display: "flex", gap: 10 }}>
                  <div style={{ flex: 1 }}>
                    <label style={sty.label}>FD業務委託報酬（千円）</label>
                    <input style={sty.input} type="number" value={fdFee} onChange={e => setFdFee(e.target.value)} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={sty.label}>FD成功報酬（千円）</label>
                    <input style={sty.input} type="number" value={successFee} onChange={e => setSuccessFee(e.target.value)} />
                  </div>
                </div>
                <button style={{ ...sty.btn("gold", true), marginTop: 10 }} onClick={save}>保存</button>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "patients" && (
        <div style={sty.card}>
          <h3 style={{ margin: "0 0 20px", fontSize: 14, fontWeight: 700, color: C.textSm, textTransform: "uppercase", letterSpacing: 1 }}>患者数推移（3年）</h3>
          {deal.patients3y?.length > 0 ? (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${C.border}` }}>
                  {["年度", "延べ患者数", "新規患者", "継続患者", "新規比率"].map(h => (
                    <th key={h} style={{ textAlign: "left", padding: "8px 12px", fontSize: 12, color: C.textSm, fontWeight: 700 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {deal.patients3y.map(row => (
                  <tr key={row.year} style={{ borderBottom: `1px solid ${C.border}` }}>
                    <td style={{ padding: "10px 12px", fontWeight: 700 }}>{row.year}年</td>
                    <td style={{ padding: "10px 12px", fontFamily: "monospace" }}>{fmt(row.total)}人</td>
                    <td style={{ padding: "10px 12px", fontFamily: "monospace", color: C.success }}>{fmt(row.new)}人</td>
                    <td style={{ padding: "10px 12px", fontFamily: "monospace" }}>{fmt(row.cont)}人</td>
                    <td style={{ padding: "10px 12px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ height: 8, borderRadius: 4, background: C.border, flex: 1 }}>
                          <div style={{ height: "100%", borderRadius: 4, background: C.success, width: `${((row.new / row.total) * 100).toFixed(0)}%` }} />
                        </div>
                        <span style={{ fontSize: 12 }}>{((row.new / row.total) * 100).toFixed(1)}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <p style={{ color: C.textSm }}>患者情報が登録されていません</p>}
        </div>
      )}

      {tab === "files" && (
        <div style={sty.card}>
          <h3 style={{ margin: "0 0 16px", fontSize: 14, fontWeight: 700, color: C.textSm, textTransform: "uppercase", letterSpacing: 1 }}>アップロードファイル</h3>
          {deal.files?.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {deal.files.map((f, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: C.bg, borderRadius: 8, border: `1px solid ${C.border}` }}>
                  <span style={{ fontSize: 22 }}>{f.type === "IM" ? "📄" : f.type === "FS" ? "📊" : "📁"}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{f.name}</div>
                    <div style={{ fontSize: 12, color: C.textSm }}><Tag label={f.type === "IM" ? "IM" : f.type === "FS" ? "財務諸表" : f.type === "TAX" ? "税務申告書" : f.type === "UKE" ? "UKEファイル" : f.type} color={f.type === "IM" ? C.blue : C.gold} /></div>
                  </div>
                  <button style={sty.btn("ghost", true)}>ダウンロード</button>
                </div>
              ))}
            </div>
          ) : <p style={{ color: C.textSm }}>ファイルが登録されていません</p>}
        </div>
      )}

      {tab === "admin" && isAdmin && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          <div style={sty.card}>
            <h3 style={{ margin: "0 0 16px", fontSize: 14, fontWeight: 700, color: C.textSm }}>管理情報</h3>
            {[["紹介元", users?.find(u => u.id === deal.introducedBy)?.company || "—"], ["ステータス", deal.stage], ["登録日", deal.submittedAt], ["FD業務委託報酬", deal.fdFee ? `¥${fmt(deal.fdFee)}千` : "未設定"], ["FD成功報酬", deal.successFee ? `¥${fmt(deal.successFee)}千` : "未設定"]].map(([k, v]) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: `1px solid ${C.border}`, fontSize: 13 }}>
                <span style={{ color: C.textMd }}>{k}</span><span style={{ fontWeight: 600 }}>{v}</span>
              </div>
            ))}
          </div>
          <div style={sty.card}>
            <h3 style={{ margin: "0 0 10px", fontSize: 14, fontWeight: 700, color: C.textSm }}>メモ・状況</h3>
            <textarea style={{ ...sty.input, height: 100, resize: "vertical", marginBottom: 10 }} value={memo} onChange={e => setMemo(e.target.value)} placeholder="内部メモ" />
            <h3 style={{ margin: "0 0 10px", fontSize: 14, fontWeight: 700, color: C.textSm }}>Next Action</h3>
            <input style={sty.input} value={nextAction} onChange={e => setNextAction(e.target.value)} placeholder="次のアクション" />
            <button style={{ ...sty.btn("primary", true), marginTop: 12 }} onClick={save}>保存</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// DEAL FORM (New Deal Registration)
// ============================================================
function DealForm({ onSubmit }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    companyName: "", specialty: "", prefecture: "", doctorAge: "", fullTimeDoctors: "", partTimeDoctors: "",
    beds: "", clinics: "1", insuranceRatio: "", selfPayRatio: "",
    revenue: "", operatingProfit: "", ebitda: "", ebitdaReal: "", ownerSalary: "", depreciation: "",
    cash: "", debt: "", hopedPrice: "", totalAssets: "", netAssets: "",
    successorInfo: "", competitorInfo: "", memo: "",
    patients3y: [
      { year: new Date().getFullYear() - 3, total: "", new: "", cont: "" },
      { year: new Date().getFullYear() - 2, total: "", new: "", cont: "" },
      { year: new Date().getFullYear() - 1, total: "", new: "", cont: "" },
    ],
    files: [],
  });
  const [fileInputs, setFileInputs] = useState([]);
  const fileRef = useRef();

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const num = v => v === "" ? null : Number(v);

  const handleSubmit = () => {
    if (!form.companyName || !form.specialty || !form.prefecture || !form.revenue) {
      alert("必須項目（法人名・診療科・都道府県・売上高）を入力してください"); return;
    }
    const fakeFiles = fileInputs.map(f => ({ name: f.name, type: f.name.toLowerCase().includes("im") ? "IM" : f.name.toLowerCase().includes("税") || f.name.toLowerCase().includes("tax") ? "TAX" : f.name.toLowerCase().includes("uke") ? "UKE" : "FS" }));
    onSubmit({
      ...form, id: `d${Date.now()}`,
      revenue: num(form.revenue), operatingProfit: num(form.operatingProfit),
      ebitda: num(form.ebitda), ebitdaReal: num(form.ebitdaReal),
      ownerSalary: num(form.ownerSalary), depreciation: num(form.depreciation),
      cash: num(form.cash), debt: num(form.debt), hopedPrice: num(form.hopedPrice),
      totalAssets: num(form.totalAssets), netAssets: num(form.netAssets),
      doctorAge: num(form.doctorAge), fullTimeDoctors: num(form.fullTimeDoctors), partTimeDoctors: num(form.partTimeDoctors),
      beds: num(form.beds), clinics: num(form.clinics) || 1,
      insuranceRatio: num(form.insuranceRatio), selfPayRatio: num(form.selfPayRatio),
      patients3y: form.patients3y.map(p => ({ year: p.year, total: num(p.total), new: num(p.new), cont: num(p.cont) })).filter(p => p.total),
      files: fakeFiles,
    });
  };

  const Field = ({ label, k, type = "text", required, placeholder }) => (
    <div style={{ marginBottom: 14 }}>
      <label style={sty.label}>{label}{required && <span style={{ color: C.danger }}> *</span>}</label>
      <input style={sty.input} type={type} placeholder={placeholder} value={form[k]} onChange={e => set(k, e.target.value)} />
    </div>
  );

  const steps = ["基本情報", "財務情報", "患者・競合情報", "ファイルアップロード"];

  return (
    <div style={{ maxWidth: 780 }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>新規案件登録</h1>
      <p style={{ color: C.textSm, fontSize: 14, marginBottom: 24 }}>必須項目（*）を必ずご入力ください</p>

      {/* Step indicator */}
      <div style={{ display: "flex", gap: 0, marginBottom: 32 }}>
        {steps.map((s, i) => (
          <div key={i} style={{ flex: 1, display: "flex", alignItems: "center" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, flex: 1 }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: step > i + 1 ? C.success : step === i + 1 ? C.blue : C.border, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, transition: "all 0.2s" }}>
                {step > i + 1 ? "✓" : i + 1}
              </div>
              <div style={{ fontSize: 11, fontWeight: 600, color: step === i + 1 ? C.blue : C.textSm, textAlign: "center" }}>{s}</div>
            </div>
            {i < steps.length - 1 && <div style={{ height: 2, flex: 1, background: step > i + 1 ? C.success : C.border, marginBottom: 22 }} />}
          </div>
        ))}
      </div>

      <div style={sty.card}>
        {step === 1 && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 20px" }}>
            <Field label="医療法人名" k="companyName" required placeholder="医療法人○○会" />
            <div style={{ marginBottom: 14 }}>
              <label style={sty.label}>診療科目 <span style={{ color: C.danger }}>*</span></label>
              <select style={sty.input} value={form.specialty} onChange={e => set("specialty", e.target.value)}>
                <option value="">選択してください</option>
                {SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={sty.label}>都道府県 <span style={{ color: C.danger }}>*</span></label>
              <select style={sty.input} value={form.prefecture} onChange={e => set("prefecture", e.target.value)}>
                <option value="">選択してください</option>
                {PREFS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <Field label="理事長年齢" k="doctorAge" type="number" placeholder="例: 63" />
            <Field label="常勤医師数" k="fullTimeDoctors" type="number" placeholder="例: 3" />
            <Field label="非常勤医師数" k="partTimeDoctors" type="number" placeholder="例: 2" />
            <Field label="病床数（有床の場合）" k="beds" type="number" placeholder="例: 19（無床: 0）" />
            <Field label="拠点数" k="clinics" type="number" placeholder="例: 1" />
            <Field label="保険診療割合（%）" k="insuranceRatio" type="number" placeholder="例: 90" />
            <Field label="自由診療割合（%）" k="selfPayRatio" type="number" placeholder="例: 10" />
          </div>
        )}

        {step === 2 && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 20px" }}>
            <Field label="売上高（千円）" k="revenue" type="number" required placeholder="例: 320000" />
            <Field label="営業利益（千円）" k="operatingProfit" type="number" placeholder="例: 28000" />
            <Field label="EBITDA（千円）" k="ebitda" type="number" placeholder="例: 52000" />
            <Field label="EBITDA実態（オーナーズコスト調整後、千円）" k="ebitdaReal" type="number" placeholder="例: 61000" />
            <Field label="役員報酬総額（千円）" k="ownerSalary" type="number" placeholder="例: 24000" />
            <Field label="減価償却費（千円）" k="depreciation" type="number" placeholder="例: 8000" />
            <Field label="現預金・現金同等物（千円）" k="cash" type="number" placeholder="例: 18500" />
            <Field label="有利子負債（千円）" k="debt" type="number" placeholder="例: 42000" />
            <Field label="総資産（千円）" k="totalAssets" type="number" placeholder="例: 150000" />
            <Field label="純資産（千円）" k="netAssets" type="number" placeholder="例: 60000" />
            <Field label="希望譲渡価格（千円）" k="hopedPrice" type="number" placeholder="例: 200000" />
          </div>
        )}

        {step === 3 && (
          <>
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14, color: C.textMd }}>患者数推移（3年分）</div>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: `2px solid ${C.border}` }}>
                    {["年度", "延べ患者数", "新規患者数", "継続患者数"].map(h => (
                      <th key={h} style={{ padding: "8px 10px", textAlign: "left", fontSize: 12, color: C.textSm, fontWeight: 700 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {form.patients3y.map((row, i) => (
                    <tr key={i} style={{ borderBottom: `1px solid ${C.border}` }}>
                      <td style={{ padding: "8px 10px", fontWeight: 700 }}>{row.year}年</td>
                      {["total", "new", "cont"].map(k => (
                        <td key={k} style={{ padding: "8px 10px" }}>
                          <input style={{ ...sty.input, width: 120 }} type="number" value={row[k]} onChange={e => {
                            const p = [...form.patients3y]; p[i] = { ...p[i], [k]: e.target.value }; set("patients3y", p);
                          }} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              <div>
                <label style={sty.label}>後任医師情報</label>
                <textarea style={{ ...sty.input, height: 80 }} value={form.successorInfo} onChange={e => set("successorInfo", e.target.value)} placeholder="後任医師の候補状況など" />
              </div>
              <div>
                <label style={sty.label}>競合情報</label>
                <textarea style={{ ...sty.input, height: 80 }} value={form.competitorInfo} onChange={e => set("competitorInfo", e.target.value)} placeholder="商圏内の競合施設情報など" />
              </div>
              <div style={{ gridColumn: "1/-1" }}>
                <label style={sty.label}>補足・備考</label>
                <textarea style={{ ...sty.input, height: 70 }} value={form.memo} onChange={e => set("memo", e.target.value)} placeholder="その他特記事項" />
              </div>
            </div>
          </>
        )}

        {step === 4 && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              {[
                { type: "IM", label: "案件概要書（IM）", required: true, icon: "📄", desc: "必須" },
                { type: "FS", label: "財務諸表（3期分）", required: true, icon: "📊", desc: "必須" },
                { type: "TAX", label: "税務申告書（3期分）", required: true, icon: "🧾", desc: "必須" },
                { type: "UKE", label: "UKEファイル", required: false, icon: "📁", desc: "任意" },
              ].map(item => {
                const uploaded = fileInputs.filter(f => {
                  const n = f.name.toLowerCase();
                  if (item.type === "IM") return n.includes("im") || n.includes("概要");
                  if (item.type === "FS") return n.includes("財務") || n.includes("決算");
                  if (item.type === "TAX") return n.includes("税務") || n.includes("申告");
                  if (item.type === "UKE") return n.includes("uke");
                  return false;
                });
                return (
                  <div key={item.type} style={{ border: `2px dashed ${uploaded.length > 0 ? C.success : C.border}`, borderRadius: 12, padding: "20px", textAlign: "center", background: uploaded.length > 0 ? "#f0fdf4" : C.bg }}>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>{uploaded.length > 0 ? "✅" : item.icon}</div>
                    <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{item.label}</div>
                    <div style={{ fontSize: 12, color: item.required ? C.danger : C.textSm, marginBottom: 12 }}>{item.desc}</div>
                    {uploaded.length > 0 ? (
                      <div style={{ fontSize: 12, color: C.success, fontWeight: 600 }}>{uploaded.map(f => f.name).join(", ")}</div>
                    ) : (
                      <label style={{ cursor: "pointer" }}>
                        <input type="file" style={{ display: "none" }} multiple onChange={e => setFileInputs(prev => [...prev, ...Array.from(e.target.files)])} />
                        <span style={sty.btn("ghost", true)}>ファイルを選択</span>
                      </label>
                    )}
                  </div>
                );
              })}
            </div>
            {fileInputs.length > 0 && (
              <div style={{ marginTop: 20, padding: "14px", background: C.bg, borderRadius: 8 }}>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>アップロード予定ファイル</div>
                {fileInputs.map((f, i) => (
                  <div key={i} style={{ fontSize: 13, padding: "4px 0", color: C.textMd }}>📎 {f.name}</div>
                ))}
              </div>
            )}
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 24, paddingTop: 20, borderTop: `1px solid ${C.border}` }}>
          <button style={step === 1 ? { visibility: "hidden" } : sty.btn("ghost")} onClick={() => setStep(s => s - 1)}>← 前へ</button>
          {step < 4 ? (
            <button style={sty.btn("primary")} onClick={() => setStep(s => s + 1)}>次へ →</button>
          ) : (
            <button style={sty.btn("gold")} onClick={handleSubmit}>✅ 案件を送信する</button>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// NEWSLETTER FILTER（メルマガ自動抽出・要件設定）
// ============================================================

// サンプルメルマガ本文（デモ用）
const SAMPLE_NEWSLETTER = `【医療法人承継案件メルマガ Vol.47】
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
本日は7件の案件情報をお届けします。
ご関心の案件がございましたらお問い合わせください。
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

【案件①】内科クリニック（東京都）
診療科：内科・消化器内科
所在地：東京都豊島区
売上高：約3.1億円
EBITDA（実態）：約5,800万円
EV/EBITDA：3.2x
理事長年齢：69歳
病床数：無床
希望価格：約1.85億円
備考：後継者なし。駅徒歩3分の好立地。

【案件②】整形外科クリニック（神奈川県）
診療科：整形外科・リハビリテーション科
所在地：神奈川県川崎市
売上高：約4.8億円
EBITDA（実態）：約9,200万円
EV/EBITDA：3.8x
理事長年齢：63歳
病床数：無床
希望価格：約3.5億円
備考：リハビリ室完備。スタッフ定着率高。

【案件③】精神科病院（北海道）
診療科：精神科
所在地：北海道札幌市
売上高：約12億円
EBITDA（実態）：約1.5億円
EV/EBITDA：6.2x
理事長年齢：71歳
病床数：150床
希望価格：約9.3億円
備考：大型病院。経営改善余地あり。

【案件④】眼科クリニック（大阪府）
診療科：眼科
所在地：大阪府大阪市
売上高：約2.2億円
EBITDA（実態）：約4,500万円
EV/EBITDA：2.7x
理事長年齢：62歳
病床数：無床
希望価格：約1.2億円
備考：白内障手術実績豊富。自由診療あり。

【案件⑤】皮膚科クリニック（福岡県）
診療科：皮膚科・美容皮膚科
所在地：福岡県福岡市
売上高：約1.8億円
EBITDA（実態）：約3,800万円
EV/EBITDA：4.9x
理事長年齢：55歳
病床数：無床
希望価格：約1.86億円
備考：自由診療30%。若い患者層。マルチプルやや高め。

【案件⑥】産婦人科クリニック（愛知県）
診療科：産婦人科・婦人科
所在地：愛知県名古屋市
売上高：約5.6億円
EBITDA（実態）：約1.1億円
EV/EBITDA：3.1x
理事長年齢：66歳
病床数：有床19床
希望価格：約3.4億円
備考：分娩件数年間400件超。地域シェア高。

【案件⑦】歯科クリニック（埼玉県）
診療科：歯科・矯正歯科
所在地：埼玉県さいたま市
売上高：約0.9億円
EBITDA（実態）：約1,800万円
EV/EBITDA：3.3x
理事長年齢：58歳
病床数：無床
希望価格：約0.6億円
備考：矯正専門医在籍。インビザライン取扱。売上規模小。
`;

function checkCriteria(deal, criteria) {
  const reasons = [];
  const passed = [];

  if (criteria.specialties.length > 0 && !criteria.specialties.some(s => (deal.specialty || "").includes(s))) {
    reasons.push(`診療科（${deal.specialty}）が対象外`);
  } else { passed.push("診療科 ✓"); }

  if (criteria.prefectures.length > 0 && !criteria.prefectures.some(p => (deal.prefecture || "").includes(p))) {
    reasons.push(`エリア（${deal.prefecture}）が対象外`);
  } else { passed.push("エリア ✓"); }

  const mult = deal.hopedPrice && deal.ebitdaReal ? deal.hopedPrice / deal.ebitdaReal : null;
  if (mult && mult > criteria.maxMultiple) {
    reasons.push(`マルチプル ${mult.toFixed(1)}x > 上限${criteria.maxMultiple}x`);
  } else if (mult) { passed.push(`マルチプル ${mult.toFixed(1)}x ✓`); }

  if (deal.revenue && deal.revenue < criteria.minRevenue) {
    reasons.push(`売上 ¥${fmt(deal.revenue)}千 < 下限¥${fmt(criteria.minRevenue)}千`);
  } else if (deal.revenue) { passed.push("売上規模 ✓"); }

  if (deal.ebitdaReal && deal.ebitdaReal < criteria.minEbitda) {
    reasons.push(`EBITDA ¥${fmt(deal.ebitdaReal)}千 < 下限¥${fmt(criteria.minEbitda)}千`);
  } else if (deal.ebitdaReal) { passed.push("EBITDA ✓"); }

  if (deal.doctorAge && deal.doctorAge > criteria.maxDoctorAge) {
    reasons.push(`理事長年齢 ${deal.doctorAge}歳 > 上限${criteria.maxDoctorAge}歳`);
  } else if (deal.doctorAge) { passed.push("年齢 ✓"); }

  return { ok: reasons.length === 0, reasons, passed };
}

function parseNewsletterText(text, criteria) {
  const blocks = text.split(/【案件[①②③④⑤⑥⑦⑧⑨⑩\d]+】/).filter(b => b.trim().length > 50);

  return blocks.map((block, i) => {
    const get = (patterns) => {
      for (const p of patterns) {
        const m = block.match(p);
        if (m) return m[1].trim();
      }
      return null;
    };
    const getNum = (patterns) => {
      const v = get(patterns);
      if (!v) return null;
      const n = v.replace(/[^0-9.]/g, "");
      if (!n) return null;
      const num = parseFloat(n);
      if (v.includes("億")) return Math.round(num * 100000);
      if (v.includes("万")) return Math.round(num * 1000);
      return Math.round(num * 1000);
    };

    const specialty = get([/診療科[目：:]\s*([^\n]+)/, /診療科\s*([^\n]+)/])?.split("・")[0] || "その他";
    const prefRaw = get([/所在地[：:]\s*([^\n]+)/, /エリア[：:]\s*([^\n]+)/]) || "";
    const prefecture = PREFS.find(p => prefRaw.includes(p)) || prefRaw.slice(0, 3);
    const revenue = getNum([/売上高[：:]\s*約?([\d.]+[億万]円?)/, /売上[：:]\s*約?([\d.]+[億万]円?)/]);
    const ebitdaReal = getNum([/EBITDA（実態）[：:]\s*約?([\d.]+[億万]円?)/, /EBITDA\（実態\）[：:]\s*約?([\d.]+[億万]円?)/]);
    const multRaw = get([/EV\/EBITDA[：:]\s*([\d.]+)x/, /マルチプル[：:]\s*([\d.]+)x/]);
    const mult = multRaw ? parseFloat(multRaw) : null;
    const hopedPrice = ebitdaReal && mult ? Math.round(ebitdaReal * mult) : getNum([/希望価格[：:]\s*約?([\d.]+[億万]円?)/]);
    const doctorAge = parseInt(get([/理事長年齢[：:]\s*(\d+)歳/]) || "0") || null;
    const bedsRaw = get([/病床数[：:]\s*([^\n]+)/]) || "";
    const beds = bedsRaw.includes("無床") ? 0 : parseInt(bedsRaw.replace(/[^0-9]/g, "")) || 0;
    const memo = get([/備考[：:]\s*([^\n]+)/]) || "";

    const deal = {
      id: `nl_${Date.now()}_${i}`,
      companyName: `（ノンネーム）${specialty}クリニック ${prefecture}`,
      specialty, prefecture, revenue, ebitdaReal, hopedPrice, doctorAge, beds,
      clinics: 1, memo, stage: "情報収集中", status: "pending", source: "newsletter",
      submittedAt: new Date().toISOString().slice(0, 10),
      introducedByEmail: "newsletter@source.jp", files: [], patients3y: [],
      nextAction: "初回ヒアリング", fdFee: null, successFee: null,
    };
    const check = checkCriteria(deal, criteria);
    return { ...deal, _check: check };
  });
}

function NewsletterFilter({ onBulkAdd }) {
  const [criteria, setCriteria] = useState(DEFAULT_FILTER_CRITERIA);
  const [text, setText] = useState("");
  const [parsed, setParsed] = useState(null);
  const [tab, setTab] = useState("settings"); // settings | parse

  const runParse = () => {
    const results = parseNewsletterText(text || SAMPLE_NEWSLETTER, criteria);
    setParsed(results);
    setTab("parse");
  };

  const passedDeals = parsed?.filter(d => d._check.ok) || [];
  const failedDeals = parsed?.filter(d => !d._check.ok) || [];

  const C2 = (k, v) => setCriteria(c => ({ ...c, [k]: v }));
  const toggleArr = (k, v) => setCriteria(c => ({
    ...c, [k]: c[k].includes(v) ? c[k].filter(x => x !== v) : [...c[k], v]
  }));

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>メルマガ案件フィルタ</h1>
        <p style={{ color: C.textSm, fontSize: 14, margin: "4px 0 0" }}>案件メルマガを貼り付けると自社要件に合致した案件を自動抽出します</p>
      </div>

      <div style={{ display: "flex", gap: 0, borderBottom: `2px solid ${C.border}`, marginBottom: 24 }}>
        {[{ id: "settings", label: "⚙️ 要件設定" }, { id: "parse", label: "📨 メルマガ解析" }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: "10px 24px", border: "none", background: "none", cursor: "pointer", fontWeight: 700, fontSize: 14, color: tab === t.id ? C.blue : C.textSm, borderBottom: tab === t.id ? `2px solid ${C.blue}` : "2px solid transparent", marginBottom: -2 }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "settings" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          <div style={sty.card}>
            <h3 style={{ margin: "0 0 14px", fontSize: 14, fontWeight: 700, color: C.textSm }}>対象診療科</h3>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {SPECIALTIES.map(s => (
                <button key={s} onClick={() => toggleArr("specialties", s)} style={{ padding: "6px 12px", borderRadius: 20, border: `1.5px solid ${criteria.specialties.includes(s) ? C.blue : C.border}`, background: criteria.specialties.includes(s) ? C.blueLt : C.white, color: criteria.specialties.includes(s) ? C.blue : C.textMd, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div style={sty.card}>
            <h3 style={{ margin: "0 0 14px", fontSize: 14, fontWeight: 700, color: C.textSm }}>対象エリア（都道府県）</h3>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, maxHeight: 200, overflowY: "auto" }}>
              {PREFS.map(p => (
                <button key={p} onClick={() => toggleArr("prefectures", p)} style={{ padding: "4px 10px", borderRadius: 16, border: `1.5px solid ${criteria.prefectures.includes(p) ? C.blue : C.border}`, background: criteria.prefectures.includes(p) ? C.blueLt : C.white, color: criteria.prefectures.includes(p) ? C.blue : C.textMd, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                  {p}
                </button>
              ))}
            </div>
          </div>
          <div style={sty.card}>
            <h3 style={{ margin: "0 0 14px", fontSize: 14, fontWeight: 700, color: C.textSm }}>財務・価格条件</h3>
            {[
              { label: "マルチプル上限", k: "maxMultiple", unit: "x", step: "0.1" },
              { label: "売上高下限（千円）", k: "minRevenue", unit: "千円", step: "10000" },
              { label: "EBITDA実態下限（千円）", k: "minEbitda", unit: "千円", step: "5000" },
            ].map(({ label, k, unit, step }) => (
              <div key={k} style={{ marginBottom: 14 }}>
                <label style={sty.label}>{label}</label>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input style={{ ...sty.input, width: 160 }} type="number" step={step} value={criteria[k]} onChange={e => C2(k, parseFloat(e.target.value))} />
                  <span style={{ fontSize: 13, color: C.textSm }}>{unit}</span>
                </div>
              </div>
            ))}
          </div>
          <div style={sty.card}>
            <h3 style={{ margin: "0 0 14px", fontSize: 14, fontWeight: 700, color: C.textSm }}>その他条件</h3>
            <div style={{ marginBottom: 14 }}>
              <label style={sty.label}>理事長年齢上限</label>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input style={{ ...sty.input, width: 100 }} type="number" value={criteria.maxDoctorAge} onChange={e => C2("maxDoctorAge", parseInt(e.target.value))} />
                <span style={{ fontSize: 13, color: C.textSm }}>歳以下</span>
              </div>
            </div>
            <div style={{ marginTop: 20, padding: "12px", background: C.blueLt, borderRadius: 8, fontSize: 13, color: C.blue }}>
              <strong>現在の要件サマリー</strong><br />
              診療科: {criteria.specialties.length}科目<br />
              エリア: {criteria.prefectures.length}都道府県<br />
              マルチプル: {criteria.maxMultiple}x以下<br />
              売上: ¥{fmt(criteria.minRevenue)}千以上
            </div>
          </div>
        </div>
      )}

      {tab === "settings" && (
        <div style={{ marginTop: 20, display: "flex", justifyContent: "flex-end" }}>
          <button style={sty.btn("primary")} onClick={() => setTab("parse")}>メルマガ解析へ →</button>
        </div>
      )}

      {tab === "parse" && (
        <div>
          <div style={sty.card}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10 }}>メルマガ本文を貼り付け</div>
            <textarea
              style={{ ...sty.input, height: 200, resize: "vertical", fontFamily: "monospace", fontSize: 12 }}
              placeholder="メルマガ本文をここに貼り付けてください..."
              value={text}
              onChange={e => setText(e.target.value)}
            />
            <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
              <button style={sty.btn("ghost", true)} onClick={() => { setText(SAMPLE_NEWSLETTER); }}>サンプルを使用</button>
              <button style={sty.btn("primary")} onClick={runParse}>🔍 解析実行</button>
            </div>
          </div>

          {parsed && (
            <div style={{ marginTop: 20 }}>
              <div style={{ display: "flex", gap: 16, marginBottom: 20 }}>
                <div style={{ ...sty.card, marginBottom: 0, flex: 1, borderTop: `3px solid ${C.success}`, textAlign: "center" }}>
                  <div style={{ fontSize: 11, color: C.textSm, fontWeight: 700, marginBottom: 4 }}>要件通過</div>
                  <div style={{ fontSize: 32, fontWeight: 900, color: C.success }}>{passedDeals.length}</div>
                  <div style={{ fontSize: 12, color: C.textSm }}>件 / {parsed.length}件中</div>
                </div>
                <div style={{ ...sty.card, marginBottom: 0, flex: 1, borderTop: `3px solid ${C.danger}`, textAlign: "center" }}>
                  <div style={{ fontSize: 11, color: C.textSm, fontWeight: 700, marginBottom: 4 }}>要件不適合</div>
                  <div style={{ fontSize: 32, fontWeight: 900, color: C.danger }}>{failedDeals.length}</div>
                  <div style={{ fontSize: 12, color: C.textSm }}>件（自動除外）</div>
                </div>
              </div>

              {passedDeals.length > 0 && (
                <div style={sty.card}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                    <div style={{ fontWeight: 700, fontSize: 15, color: C.success }}>✅ 要件通過案件（仮登録対象）</div>
                    <button style={sty.btn("primary")} onClick={() => onBulkAdd(passedDeals.map(({ _check, ...d }) => d))}>
                      {passedDeals.length}件を仮登録
                    </button>
                  </div>
                  {passedDeals.map(d => (
                    <div key={d.id} style={{ padding: "12px 0", borderBottom: `1px solid ${C.border}` }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 14 }}>{d.companyName}</div>
                          <div style={{ fontSize: 12, color: C.textSm, marginTop: 2 }}>{d.specialty} / {d.prefecture} / 理事長{d.doctorAge}歳</div>
                          <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                            {d._check.passed.map(p => <span key={p} style={sty.badge(C.success)}>{p}</span>)}
                          </div>
                        </div>
                        <div style={{ textAlign: "right", fontSize: 13 }}>
                          <div style={{ fontFamily: "monospace" }}>売上 ¥{fmt(d.revenue)}千</div>
                          <div style={{ fontFamily: "monospace", fontWeight: 700 }}>EBITDA ¥{fmt(d.ebitdaReal)}千</div>
                          <div style={{ fontWeight: 800, color: C.blue, fontSize: 15 }}>{multiple(d.hopedPrice, d.ebitdaReal)}</div>
                        </div>
                      </div>
                      {d.memo && <div style={{ fontSize: 12, color: C.textMd, marginTop: 6 }}>📝 {d.memo}</div>}
                    </div>
                  ))}
                </div>
              )}

              {failedDeals.length > 0 && (
                <div style={{ ...sty.card, marginTop: 16, opacity: 0.7 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: C.danger, marginBottom: 12 }}>✕ 要件不適合（除外）</div>
                  {failedDeals.map(d => (
                    <div key={d.id} style={{ padding: "10px 0", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{d.companyName}</div>
                        <div style={{ display: "flex", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
                          {d._check.reasons.map(r => <span key={r} style={sty.badge(C.danger)}>{r}</span>)}
                        </div>
                      </div>
                      <div style={{ fontSize: 12, color: C.textSm, textAlign: "right" }}>
                        {multiple(d.hopedPrice, d.ebitdaReal)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================
// EXCEL IMPORT
// ============================================================

// Column mapping: Excelヘッダー → アプリフィールド
const SHEET1_MAP = {
  "案件名称": "companyName",
  "都道": "prefecture",
  "診療科目": "specialty",
  "ステータス": "stage",
  "Next\nAction": "nextAction",
  "状況要約": "memo",
  "紹介元": "introducedByName",
  "仲介担当者": "intermediaryContact",
  "FD業務委託報酬\n（千円, stock）": "fdFee",
  "FD成功報酬\n（千円, flow）": "successFee",
  "EV/EBITDA(売手希望・売手認識)": "multipleAsked",
  "EV/EBITDA(試算時)": "multipleCalc",
  "年間収益(億円)": "revenueOku",
  "年間実態EBITDA(億円)": "ebitdaOku",
  "クロージング予定日": "closingDate",
  "紹介日": "submittedAt",
  "医師採用状況": "successorInfo",
};

const SHEET6_MAP = {
  "案件名称": "companyName",
  "所在\n都道府県": "prefecture",
  "メイン診療科": "specialty",
  "売上高": "revenue",
  "売上総利益": "grossProfit",
  "営業利益": "operatingProfit",
  "減価償却費": "depreciation",
  "税前利益": "pretaxProfit",
  "役員報酬（総額）": "ownerSalary",
  "EBITDA": "ebitda",
  "EBITDA（実態）": "ebitdaReal",
  "NetCash(千円)": "netCashRaw",
  "希望金額": "hopedPrice",
  "総資産": "totalAssets",
  "固定負債": "fixedLiabilities",
  "純資産": "netAssets",
  "病床規模": "beds",
  "理事長年齢": "doctorAge",
  "拠点数": "clinics",
  "常勤医師数": "fullTimeDoctors",
  "非常勤医師数": "partTimeDoctors",
  "検討終了背景": "closingReason",
  "備考": "notes",
};

// ステージ名の正規化
const normalizeStage = (s) => {
  if (!s) return "情報収集中";
  const map = {
    "NDA": "NDA締結", "TOP": "TOP面談", "LOI": "LOI提出",
    "MOU": "MOU締結", "DA": "DA締結", "CL": "クロージング",
    "クロージング": "クロージング", "終了": "検討終了", "検討終了": "検討終了",
  };
  for (const [k, v] of Object.entries(map)) { if (String(s).includes(k)) return v; }
  return STAGES.includes(s) ? s : "情報収集中";
};

function parseSheet(ws, mapping) {
  const rows = XLSX.utils.sheet_to_json(ws, { defval: null, raw: false });
  return rows.map(row => {
    const out = {};
    for (const [xlsCol, appField] of Object.entries(mapping)) {
      // ヘッダーの改行・スペースを正規化してマッチ
      const val = row[xlsCol] ?? row[xlsCol.replace(/\n/g, " ")] ?? row[xlsCol.replace(/\n/g, "")] ?? null;
      out[appField] = val;
    }
    return out;
  }).filter(r => r.companyName);
}

function mergeRows(sheet1Rows, sheet6Rows) {
  const map6 = {};
  sheet6Rows.forEach(r => { if (r.companyName) map6[r.companyName] = r; });

  return sheet1Rows.map(r1 => {
    const r6 = map6[r1.companyName] || {};
    const revenue = r6.revenue ? Math.round(parseFloat(r6.revenue)) : (r1.revenueOku ? Math.round(parseFloat(r1.revenueOku) * 100000) : null);
    const ebitdaReal = r6.ebitdaReal ? Math.round(parseFloat(r6.ebitdaReal)) : (r1.ebitdaOku ? Math.round(parseFloat(r1.ebitdaOku) * 100000) : null);
    const n = v => v != null && v !== "" ? Math.round(parseFloat(v)) || null : null;

    return {
      id: `imp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      userId: "u2", introducedBy: "u2", status: "active",
      companyName: r1.companyName || r6.companyName || "—",
      prefecture: r1.prefecture || r6.prefecture || "",
      specialty: r1.specialty || r6.specialty || "",
      stage: normalizeStage(r1.stage),
      nextAction: r1.nextAction || "",
      memo: r1.memo || r6.notes || "",
      introducedByName: r1.introducedByName || "",
      intermediaryContact: r1.intermediaryContact || "",
      fdFee: n(r1.fdFee),
      successFee: n(r1.successFee),
      submittedAt: r1.submittedAt ? String(r1.submittedAt).slice(0, 10) : new Date().toISOString().slice(0, 10),
      closingDate: r1.closingDate || null,
      successorInfo: r1.successorInfo || "",
      competitorInfo: "",
      revenue, ebitdaReal,
      grossProfit: n(r6.grossProfit),
      operatingProfit: n(r6.operatingProfit),
      depreciation: n(r6.depreciation),
      pretaxProfit: n(r6.pretaxProfit),
      ownerSalary: n(r6.ownerSalary),
      ebitda: n(r6.ebitda),
      cash: null, debt: null,
      hopedPrice: n(r6.hopedPrice),
      totalAssets: n(r6.totalAssets),
      netAssets: n(r6.netAssets),
      beds: n(r6.beds) || 0,
      doctorAge: n(r6.doctorAge),
      clinics: n(r6.clinics) || 1,
      fullTimeDoctors: n(r6.fullTimeDoctors),
      partTimeDoctors: n(r6.partTimeDoctors),
      insuranceRatio: null, selfPayRatio: null,
      patients3y: [], files: [],
    };
  });
}

function ExcelImport({ deals, onBulkAdd }) {
  const [parsed, setParsed] = useState(null);
  const [selected, setSelected] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const fileRef = useRef();

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLoading(true); setError(""); setParsed(null);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array", cellDates: true });

      // Sheet1 と Sheet6 を探す（名前が違う場合も想定）
      const ws1 = wb.Sheets["Sheet1"] || wb.Sheets[wb.SheetNames[0]];
      const ws6 = wb.Sheets["Sheet6"] || wb.Sheets[wb.SheetNames.find(n => n.includes("6") || n.includes("財務")) || wb.SheetNames[5]];

      const rows1 = ws1 ? parseSheet(ws1, SHEET1_MAP) : [];
      const rows6 = ws6 ? parseSheet(ws6, SHEET6_MAP) : [];

      const merged = mergeRows(rows1, rows6);
      if (merged.length === 0) { setError("案件データが見つかりませんでした。Sheet1の「案件名称」列を確認してください。"); setLoading(false); return; }

      // 既存案件との重複チェック
      const existingNames = new Set(deals.map(d => d.companyName));
      const withDup = merged.map(r => ({ ...r, _isDuplicate: existingNames.has(r.companyName) }));

      const sel = {};
      withDup.forEach(r => { sel[r.id] = !r._isDuplicate; });
      setParsed(withDup);
      setSelected(sel);
    } catch (err) {
      setError("ファイルの読み込みに失敗しました: " + err.message);
    }
    setLoading(false);
  };

  const handleImport = () => {
    const toImport = parsed.filter(r => selected[r.id]);
    if (toImport.length === 0) { setError("インポートする案件を選択してください"); return; }
    onBulkAdd(toImport);
    setDone(true);
  };

  const toggleAll = (v) => {
    const sel = {};
    parsed.forEach(r => { sel[r.id] = v; });
    setSelected(sel);
  };

  if (done) return (
    <div style={{ textAlign: "center", padding: "80px 0" }}>
      <div style={{ fontSize: 60, marginBottom: 16 }}>✅</div>
      <h2 style={{ fontSize: 22, fontWeight: 800 }}>インポート完了</h2>
      <p style={{ color: C.textSm }}>案件一覧に反映されました</p>
    </div>
  );

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>Excelインポート</h1>
        <p style={{ color: C.textSm, fontSize: 14, margin: "4px 0 0" }}>自社の案件管理Excelをアップロードすると、案件一覧に自動取り込みします</p>
      </div>

      {/* 対応フォーマット説明 */}
      <div style={{ ...sty.card, background: C.blueLt, border: `1px solid ${C.blue}30`, marginBottom: 24 }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: C.blue, marginBottom: 10 }}>📋 対応フォーマット</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, fontSize: 13, color: C.textMd }}>
          <div><strong>Sheet1（案件管理）</strong><br />案件名称、都道府県、診療科目、ステータス、Next Action、紹介元、FD報酬等</div>
          <div><strong>Sheet6（財務サマリー）</strong><br />売上高、EBITDA（実態）、役員報酬、NetCash、希望金額、理事長年齢等</div>
        </div>
        <div style={{ marginTop: 10, fontSize: 12, color: C.textSm }}>※ Sheet1とSheet6の「案件名称」を照合してデータを結合します</div>
      </div>

      {/* Upload area */}
      {!parsed && (
        <div
          style={{ border: `2px dashed ${C.border}`, borderRadius: 16, padding: "60px 0", textAlign: "center", cursor: "pointer", background: C.white, transition: "all 0.2s" }}
          onClick={() => fileRef.current?.click()}
          onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = C.blue; e.currentTarget.style.background = C.blueLt; }}
          onDragLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.background = C.white; }}
          onDrop={e => { e.preventDefault(); e.currentTarget.style.borderColor = C.border; e.currentTarget.style.background = C.white; const f = e.dataTransfer.files[0]; if (f) { const dt = new DataTransfer(); dt.items.add(f); fileRef.current.files = dt.files; handleFile({ target: { files: [f] } }); } }}>
          <input ref={fileRef} type="file" accept=".xlsx,.xls" style={{ display: "none" }} onChange={handleFile} />
          <div style={{ fontSize: 48, marginBottom: 12 }}>📊</div>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>Excelファイルをドロップ、またはクリックして選択</div>
          <div style={{ fontSize: 13, color: C.textSm }}>.xlsx / .xls 対応</div>
          {loading && <div style={{ marginTop: 16, color: C.blue, fontWeight: 600 }}>読み込み中...</div>}
          {error && <div style={{ marginTop: 16, color: C.danger, fontSize: 13 }}>{error}</div>}
        </div>
      )}

      {/* Preview table */}
      {parsed && (
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <div>
              <span style={{ fontWeight: 700 }}>{parsed.length}件</span>を検出
              <span style={{ marginLeft: 12, color: C.textSm, fontSize: 13 }}>（選択中: {Object.values(selected).filter(Boolean).length}件）</span>
              {parsed.some(r => r._isDuplicate) && (
                <span style={{ marginLeft: 12, ...sty.badge(C.warn) }}>⚠ 重複 {parsed.filter(r => r._isDuplicate).length}件（デフォルト未選択）</span>
              )}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button style={sty.btn("ghost", true)} onClick={() => toggleAll(true)}>全選択</button>
              <button style={sty.btn("ghost", true)} onClick={() => toggleAll(false)}>全解除</button>
              <button style={sty.btn("ghost", true)} onClick={() => { setParsed(null); setError(""); fileRef.current.value = ""; }}>やり直し</button>
              <button style={sty.btn("primary")} onClick={handleImport}>
                ✅ {Object.values(selected).filter(Boolean).length}件をインポート
              </button>
            </div>
          </div>

          {error && <div style={{ color: C.danger, fontSize: 13, marginBottom: 12 }}>{error}</div>}

          <div style={sty.card}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${C.border}` }}>
                  <th style={{ padding: "8px 10px", width: 40 }}>
                    <input type="checkbox" checked={Object.values(selected).every(Boolean)} onChange={e => toggleAll(e.target.checked)} />
                  </th>
                  {["法人名", "都道府県", "診療科", "ステージ", "売上(千円)", "EBITDA実態(千円)", "希望価格(千円)", "マルチプル", "状態"].map(h => (
                    <th key={h} style={{ textAlign: "left", padding: "8px 10px", color: C.textSm, fontWeight: 700 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {parsed.map(r => (
                  <tr key={r.id} style={{ borderBottom: `1px solid ${C.border}`, background: r._isDuplicate ? "#fffbeb" : selected[r.id] ? C.blueLt : "" }}>
                    <td style={{ padding: "9px 10px" }}>
                      <input type="checkbox" checked={!!selected[r.id]} onChange={e => setSelected(s => ({ ...s, [r.id]: e.target.checked }))} />
                    </td>
                    <td style={{ padding: "9px 10px", fontWeight: 700 }}>{r.companyName}</td>
                    <td style={{ padding: "9px 10px" }}>{r.prefecture || "—"}</td>
                    <td style={{ padding: "9px 10px" }}>{r.specialty || "—"}</td>
                    <td style={{ padding: "9px 10px" }}><Tag label={r.stage} color={STAGE_COLORS[r.stage] || C.textSm} /></td>
                    <td style={{ padding: "9px 10px", fontFamily: "monospace" }}>{fmt(r.revenue)}</td>
                    <td style={{ padding: "9px 10px", fontFamily: "monospace", fontWeight: 700 }}>{fmt(r.ebitdaReal)}</td>
                    <td style={{ padding: "9px 10px", fontFamily: "monospace" }}>{fmt(r.hopedPrice)}</td>
                    <td style={{ padding: "9px 10px", fontWeight: 800, color: C.blue }}>{multiple(r.hopedPrice, r.ebitdaReal)}</td>
                    <td style={{ padding: "9px 10px" }}>
                      {r._isDuplicate
                        ? <span style={sty.badge(C.warn)}>重複</span>
                        : <span style={sty.badge(C.success)}>新規</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}


export default function App() {
  const [user, setUser] = useState(null);
  const [deals, setDeals] = useState(INIT_DEALS);
  const [users, setUsers] = useState(DEMO_USERS);

  const handleLogin = (u) => {
    if (!users.find(x => x.id === u.id)) setUsers(prev => [...prev, u]);
    setUser(u);
  };

  const addDeal = (d) => setDeals(prev => [...prev, d]);
  const updateDeal = (d) => setDeals(prev => {
    const exists = prev.find(x => x.id === d.id);
    return exists ? prev.map(x => x.id === d.id ? d : x) : [...prev, d];
  });
  const bulkAdd = (newDeals) => setDeals(prev => {
    const existingIds = new Set(prev.map(x => x.id));
    const toAdd = newDeals.filter(d => !existingIds.has(d.id));
    return [...prev, ...toAdd];
  });

  if (!user) return <AuthScreen onLogin={handleLogin} />;

  if (user.role === "admin") return (
    <AdminPortal user={user} deals={deals} users={users} onUpdateDeal={updateDeal} onBulkAdd={bulkAdd} onLogout={() => setUser(null)} />
  );

  return (
    <IntermediaryPortal user={user} deals={deals} onAddDeal={addDeal} onUpdateDeal={updateDeal} onLogout={() => setUser(null)} />
  );
}
