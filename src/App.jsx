import { useState, useEffect, useRef } from 'react'
import { supabase } from './supabase.js'
import Pipeline from './Pipeline.jsx'
import ScoringEngine from './ScoringEngine.jsx'
import ContractCreation from './ContractCreation.jsx'
import DueDiligence from './DueDiligence.jsx'
import Valuation from './Valuation.jsx'
import CorporateNumberSearch from './CorporateNumberSearch.jsx'

// レスポンシブCSS注入
if (!document.getElementById('sd-responsive')) {
  const s = document.createElement('style');
  s.id = 'sd-responsive';
  s.textContent = `
    *, *::before, *::after { box-sizing: border-box; }
    body { margin: 0; -webkit-text-size-adjust: 100%; }
    @media (max-width: 767px) {
      input, select, textarea { font-size: 16px !important; }
      table { display: block; overflow-x: auto; -webkit-overflow-scrolling: touch; }
      .sd-grid-2 { grid-template-columns: 1fr !important; }
    }
  `;
  document.head.appendChild(s);
}

const API = import.meta.env.VITE_API_URL || 'https://synapsedeal-production.up.railway.app'

// ==================== 一貫ダミーデータ（全ページ共通）====================
const DEMO_DEAL = {
  id: 'demo-001',
  deal_name: '株式会社さくら製作所 M&A案件',
  company_name: '株式会社さくら製作所',
  industry: '製造業',
  scheme: '株式譲渡',
  phase: 'dd',
  advisor_mode: 'senior',
  seller_name: '田中 義雄',
  seller_address: '愛知県名古屋市中区錦2-14-19',
  buyer_corp_name: 'SynapseDeal株式会社',
  business: '自動車部品の精密加工・組立。主要取引先はトヨタ系Tier1サプライヤー3社。従業員85名、平均勤続12年。',
  ma_strategy: '後継者不在による事業承継。オーナー社長（68歳）の引退意向。買収後も現経営陣を5年間継続。',
  sales: 850000000, operating_profit: 68000000, ebitda: 95000000,
  net_assets: 320000000, interest_bearing_debt: 120000000, cash: 45000000,
  purchase_price: 480000000, transaction_amount: '4億8,000万円',
  created_at: '2026-01-15T09:00:00Z',
}
const DEMO_MEETINGS = [
  { id:'m001', date:'2026-03-10', company:'株式会社さくら製作所', contact:'田中 義雄（代表取締役）', phase:'初回面談', result:'関心あり・検討中', bant:{budget:'5億円程度を想定',authority:'オーナー社長が最終決定',need:'後継者不在・体力的に引退希望',timeline:'2年以内にクロージング希望'}, issues:['後継者問題が喫緊の課題','従業員の雇用継続への強い要望','株価評価への不安'], next_action:'財務資料の提供依頼・NDA締結' },
  { id:'m002', date:'2026-03-24', company:'株式会社さくら製作所', contact:'田中 義雄（代表）・山本 部長（経理）', phase:'NDA締結・財務開示', result:'NDA締結完了・3期決算書受領', bant:{budget:'未確定',authority:'田中社長',need:'企業価値算定の早期実施',timeline:'4月中にIM完成希望'}, issues:['直近期の売上減少（前期比7%減）への説明要求','主要取引先の依存度（1社60%）リスク'], next_action:'IM作成・財務DD計画策定' },
  { id:'m003', date:'2026-04-07', company:'株式会社さくら製作所', contact:'田中 義雄・顧問弁護士 佐々木氏', phase:'IM提示・条件交渉', result:'買収条件の概算提示・継続交渉', bant:{budget:'4〜5億円希望',authority:'田中社長＋弁護士確認',need:'株価・役員退職金の税務設計',timeline:'6月MOU締結目標'}, issues:['役員退職金の水準交渉（1億円要求）','従業員持株会の扱い','DD期間の短縮要求'], next_action:'DD実施・MOU草案作成' },
]

// ==================== 数値フォーマット（3桁カンマ）====================
const fmtNum = (v) => {
  if (v === null || v === undefined || v === '') return '';
  const n = Number(String(v).replace(/,/g, ''));
  if (isNaN(n)) return String(v);
  return n.toLocaleString('ja-JP');
};
const fmtYen = (v) => {
  if (!v && v !== 0) return '';
  const n = Number(String(v).replace(/,/g, ''));
  if (isNaN(n)) return String(v);
  if (n >= 100000000) return `${(n/100000000).toFixed(2).replace(/\.?0+$/, '')}億円`;
  if (n >= 10000) return `${(n/10000).toFixed(0)}万円`;
  return `${n.toLocaleString('ja-JP')}円`;
};

const TABS = [
  { key: 'dashboard',   label: 'ダッシュボード',         enabled: true },
  { key: 'pipeline',    label: '営業パイプライン',         enabled: true },
  { key: 'advisory',    label: 'アドバイザリー契約',       enabled: true },
  { key: 'gekiraku_im', label: 'ゲキラクIM',              enabled: true },
  { key: 'deals',       label: '案件管理パイプライン',     enabled: true },
  { key: 'scoring',     label: '候補先選定',              enabled: true },
  { key: 'contract',    label: '契約書作成',              enabled: true },
  { key: 'dd',          label: 'DD支援',                  enabled: true },
  { key: 'valuation',   label: 'バリュエーション',         enabled: true },
  { key: 'company',     label: '設定',                    enabled: true },
]

const PHASES = [
  { key: 'sourcing', label: 'ソーシング' },
  { key: 'im', label: 'IM作成' },
  { key: 'dd_plan', label: 'DD準備' },
  { key: 'dd_exec', label: 'DD実行' },
  { key: 'spa_draft', label: 'SPA起草' },
  { key: 'closing', label: 'クロージング' },
]

const DOCUMENTS = [
  { key: 'financial', label: '財務諸表（BS・PL・SS）', period: '3〜5期分', required: true },
  { key: 'ledger_detail', label: '勘定科目内訳', period: '3〜5期分', required: true },
  { key: 'tax', label: '法人税申告書', period: '3〜5期分', required: true },
  { key: 'registry', label: '登記簿謄本', period: '最新版', required: false },
  { key: 'articles', label: '定款', period: '最新版', required: false },
  { key: 'general_ledger', label: '総勘定元帳', period: '3〜5期分', required: false },
  { key: 'customers', label: '売上先一覧（上位10〜30先）', period: '', required: false },
  { key: 'suppliers', label: '仕入先の取引先一覧（上位10〜30先）', period: '', required: false },
  { key: 'kpi', label: '顧客データ・KPI資料', period: '', required: false },
  { key: 'loans', label: '借入金融機関一覧・返済スケジュール', period: '', required: false },
  { key: 'contracts', label: '重要な契約書一覧', period: '', required: false },
  { key: 'meeting', label: 'TOP面談・ヒアリング議事録', period: 'あれば', required: false },
  { key: 'other', label: 'その他資料', period: '', required: false },
]

const FONT = "'Noto Sans JP', 'Hiragino Sans', 'Yu Gothic', sans-serif"

const C = {
  bg: '#FEFCE8',
  bgCard: '#FFFFFF',
  bgHeader: '#1E3A5F',
  bgSub: '#F7F5E6',
  navy: '#1E3A5F',
  navyLight: '#2D4160',
  cream: '#FEFCE8',
  gold: '#C8A951',
  text: '#1A1A2A',
  textMuted: '#4A4A5A',
  textLight: '#7A7A8A',
  border: '#E4E0CE',
  borderDark: '#C8C4B0',
  danger: '#8B2020',
  dangerBg: '#FDF2F2',
  success: '#1A4A2A',
  successBg: '#F2FAF4',
  warning: '#6B4A10',
  warningBg: '#FDF8F0',
}

const inp = {
  width: '100%',
  border: '1px solid ' + C.border,
  borderRadius: 4,
  padding: '9px 12px',
  fontSize: 13,
  outline: 'none',
  boxSizing: 'border-box',
  background: '#FDFCF5',
  fontFamily: FONT,
  color: C.text,
  letterSpacing: '0.01em',
}

const btn = {
  primary: {
    background: C.navy,
    color: '#FEFCE8',
    border: 'none',
    borderRadius: 3,
    padding: '10px 24px',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    letterSpacing: '0',
    fontFamily: FONT,
  },
  secondary: {
    background: 'transparent',
    color: C.navy,
    border: '1px solid ' + C.navy,
    borderRadius: 3,
    padding: '9px 22px',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    letterSpacing: '0',
    fontFamily: FONT,
  },
  ghost: {
    background: 'transparent',
    color: C.textMuted,
    border: '1px solid ' + C.border,
    borderRadius: 3,
    padding: '9px 20px',
    fontSize: 13,
    cursor: 'pointer',
    fontFamily: FONT,
  },
}

const USERS_KEY = 'synapsedeal_users'
const IM_FORMAT_KEY = 'synapsedeal_im_format'
const TICKETS_KEY = 'synapsedeal_tickets'

function loadJSON(key, fallback) {
  try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : fallback }
  catch { return fallback }
}

// ==================== 共通コンポーネント ====================
function Divider({ label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, margin: '24px 0' }}>
      <div style={{ flex: 1, height: 1, background: C.border }} />
      {label && <span style={{ fontSize: 11, color: C.textLight, letterSpacing: '0.01em', textTransform: 'none' }}>{label}</span>}
      <div style={{ flex: 1, height: 1, background: C.border }} />
    </div>
  )
}

function Card({ children, style = {} }) {
  return (
    <div style={{
      background: C.bgCard,
      border: '1px solid ' + C.border,
      borderRadius: 4,
      padding: '24px 28px',
      marginBottom: 16,
      ...style,
    }}>
      {children}
    </div>
  )
}

function CardHeader({ title, subtitle, action }) {
  return (
    <div style={{ marginBottom: 20, paddingBottom: 14, borderBottom: '1px solid ' + C.border, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
      <div>
        <div style={{ fontSize: 14, fontWeight: 700, color: C.text, letterSpacing: '0.02em' }}>{title}</div>
        {subtitle && <div style={{ fontSize: 12, color: C.textLight, marginTop: 3 }}>{subtitle}</div>}
      </div>
      {action}
    </div>
  )
}

function Badge({ children, variant = 'default' }) {
  const styles = {
    default: { background: C.bgSub, color: C.textMuted, border: '1px solid ' + C.border },
    navy: { background: C.navy, color: C.cream },
    danger: { background: C.dangerBg, color: C.danger, border: '1px solid #E8C0C0' },
    success: { background: C.successBg, color: C.success, border: '1px solid #B0D8BC' },
    warning: { background: C.warningBg, color: C.warning, border: '1px solid #E0CCAA' },
  }
  return (
    <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', padding: '2px 8px', borderRadius: 2, ...styles[variant] }}>
      {children}
    </span>
  )
}

function StepIndicator({ current, labels }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 32 }}>
      {labels.map((label, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', flex: i < labels.length - 1 ? 1 : 'none' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, fontSize: 12,
              background: i < current ? C.navy : i === current ? C.gold : C.bgSub,
              color: i <= current ? (i < current ? '#fff' : C.navy) : C.textLight,
              border: i === current ? '2px solid ' + C.gold : 'none',
            }}>
              {i < current ? '✓' : i + 1}
            </div>
            <div style={{ fontSize: 10, marginTop: 5, color: i === current ? C.navy : C.textLight, fontWeight: i === current ? 700 : 400, whiteSpace: 'nowrap', letterSpacing: '0.03em' }}>{label}</div>
          </div>
          {i < labels.length - 1 && <div style={{ flex: 1, height: 1, background: i < current ? C.navy : C.border, margin: '0 8px', marginBottom: 18 }} />}
        </div>
      ))}
    </div>
  )
}

function DropZone({ docKey, onFiles, files, isShared, onSharedChange, driveUploading, driveUploaded }) {
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef()
  const uploaded = files[docKey] || []
  return (
    <div style={{ marginTop: 8 }}>
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, cursor: 'pointer', fontSize: 12, color: C.textMuted }}>
        <input type="checkbox" checked={!!isShared[docKey]} onChange={e => onSharedChange(docKey, e.target.checked)} />
        <span>共有フォルダ・GoogleDrive経由で提供済み</span>
      </label>
      {!isShared[docKey] && (
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => { e.preventDefault(); setDragging(false); onFiles(docKey, Array.from(e.dataTransfer.files)) }}
          onClick={() => inputRef.current.click()}
          style={{ border: '1px dashed ' + (dragging ? C.navy : C.borderDark), borderRadius: 4, padding: '14px 16px', textAlign: 'center', background: dragging ? '#F0EDD8' : C.bgSub, cursor: 'pointer' }}>
          <input ref={inputRef} type="file" multiple style={{ display: 'none' }} onChange={e => onFiles(docKey, Array.from(e.target.files))} />
          <div style={{ fontSize: 12, color: C.textLight, letterSpacing: '0.02em' }}>クリックまたはドラッグでアップロード</div>
          {driveUploading && <div style={{ fontSize: 11, color: C.textMuted, marginTop: 4 }}>⏳ Google Driveにアップロード中...</div>}
          {uploaded.length > 0 && uploaded.map((f, i) => {
            const ok = driveUploaded && driveUploaded.includes(f.name)
            return <div key={i} style={{ fontSize: 11, color: ok ? C.success : C.textMuted, background: ok ? C.successBg : C.bgSub, borderRadius: 2, padding: '2px 8px', marginTop: 4, display: 'inline-block' }}>{ok ? '✓ ' : '📎 '}{f.name}</div>
          })}
        </div>
      )}
      {isShared[docKey] && <div style={{ fontSize: 12, color: C.success, background: C.successBg, border: '1px solid #B0D8BC', borderRadius: 4, padding: '8px 12px' }}>提供済みとして登録しました</div>}
    </div>
  )
}

function SimpleDropZone({ label, onFile, fileName }) {
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef()
  return (
    <div
      onDragOver={e => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={e => { e.preventDefault(); setDragging(false); if (e.dataTransfer.files[0]) onFile(e.dataTransfer.files[0]) }}
      onClick={() => inputRef.current.click()}
      style={{ border: '1px dashed ' + (dragging ? C.navy : C.borderDark), borderRadius: 4, padding: '24px', textAlign: 'center', background: dragging ? '#F0EDD8' : C.bgSub, cursor: 'pointer' }}>
      <input ref={inputRef} type="file" style={{ display: 'none' }} onChange={e => { if (e.target.files[0]) onFile(e.target.files[0]) }} />
      <div style={{ fontSize: 12, color: C.textLight, marginBottom: 4, letterSpacing: '0.02em' }}>{label}</div>
      {fileName && <div style={{ fontSize: 12, color: C.success, marginTop: 8 }}>{fileName}</div>}
    </div>
  )
}

// ==================== AUTH SCREEN ====================
function AuthScreen() {
  const [authMode, setAuthMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [signupDone, setSignupDone] = useState(false)

  async function handleLogin() {
    if (!email.trim() || !password.trim()) { setError('メールアドレスとパスワードを入力してください'); return }
    setLoading(true); setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError('メールアドレスまたはパスワードが正しくありません')
    setLoading(false)
  }

  async function handleSignup() {
    if (!email.trim() || !password.trim()) { setError('メールアドレスとパスワードを入力してください'); return }
    if (password.length < 6) { setError('パスワードは6文字以上で入力してください'); return }
    if (password !== confirmPassword) { setError('パスワードが一致しません'); return }
    setLoading(true); setError('')
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) setError(error.message)
    else setSignupDone(true)
    setLoading(false)
  }

  async function handleGoogleLogin() {
    await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } })
  }

  async function handleForgotPassword() {
    if (!email.trim()) { alert('メールアドレスを入力してください'); return }
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + '/reset-password' })
    if (error) alert('エラー: ' + error.message)
    else alert('パスワードリセットメールを送信しました。')
  }

  const fieldStyle = { ...inp, padding: '11px 14px', fontSize: 14 }

  if (signupDone) return (
    <div style={{ minHeight: '100vh', background: C.navy, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT }}>
      <div style={{ background: C.cream, borderRadius: 4, padding: '56px 52px', width: 440, textAlign: 'center' }}>
        <div style={{ width: 48, height: 48, borderRadius: '50%', border: '2px solid ' + C.navy, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: 20, color: C.navy }}>✓</div>
        <div style={{ fontSize: 20, fontWeight: 700, color: C.navy, marginBottom: 12, letterSpacing: '-0.02em' }}>確認メールを送信しました</div>
        <div style={{ fontSize: 13, color: C.textMuted, lineHeight: 1.9, marginBottom: 32 }}>
          <strong>{email}</strong> にメールを送信しました。<br />メール内のリンクよりアカウントを有効化してください。
        </div>
        <button onClick={() => { setAuthMode('login'); setSignupDone(false); setPassword(''); setConfirmPassword('') }} style={{ ...btn.primary, width: '100%', padding: '13px' }}>
          ログイン画面へ
        </button>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: C.navy, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT }}>
      <div style={{ background: C.cream, borderRadius: 4, padding: '52px 52px', width: 460 }}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <img src="/logo.png" alt="SynapseDeal" style={{ height: 42, marginBottom: 16 }} onError={e => e.target.style.display = 'none'} />
          <div style={{ fontSize: 22, fontWeight: 700, color: C.navy, letterSpacing: '-0.03em' }}>SynapseDeal</div>
          <div style={{ fontSize: 12, color: C.textLight, marginTop: 5, letterSpacing: '0.06em' }}>M&A Agent Platform</div>
        </div>

        <div style={{ display: 'flex', marginBottom: 28, borderBottom: '2px solid ' + C.border }}>
          {['login', 'signup'].map((mode, i) => (
            <button key={mode} onClick={() => { setAuthMode(mode); setError('') }}
              style={{ flex: 1, padding: '10px', fontSize: 13, fontWeight: 700, border: 'none', background: 'none', cursor: 'pointer', color: authMode === mode ? C.navy : C.textLight, borderBottom: authMode === mode ? '2px solid ' + C.navy : '2px solid transparent', marginBottom: -2, fontFamily: FONT }}>
              {i === 0 ? 'ログイン' : '新規登録'}
            </button>
          ))}
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, marginBottom: 6, color: C.textMuted }}>メールアドレス</label>
          <input style={fieldStyle} type="email" placeholder="email@example.com" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && (authMode === 'login' ? handleLogin() : handleSignup())} />
        </div>
        <div style={{ marginBottom: authMode === 'signup' ? 16 : 8 }}>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, marginBottom: 6, color: C.textMuted }}>パスワード{authMode === 'signup' ? '（6文字以上）' : ''}</label>
          <input style={fieldStyle} type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && (authMode === 'login' ? handleLogin() : handleSignup())} />
        </div>
        {authMode === 'login' && (
          <div style={{ textAlign: 'right', marginBottom: 20 }}>
            <button onClick={handleForgotPassword} style={{ fontSize: 11, color: C.textLight, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', fontFamily: FONT }}>
              パスワードをお忘れの方
            </button>
          </div>
        )}
        {authMode === 'signup' && (
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, marginBottom: 6, color: C.textMuted }}>パスワード確認</label>
            <input style={fieldStyle} type="password" placeholder="••••••••" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSignup()} />
          </div>
        )}

        {error && <div style={{ fontSize: 12, color: C.danger, background: C.dangerBg, border: '1px solid #E8C0C0', borderRadius: 4, padding: '10px 14px', marginBottom: 16 }}>{error}</div>}

        <button onClick={authMode === 'login' ? handleLogin : handleSignup} disabled={loading}
          style={{ ...btn.primary, width: '100%', padding: '13px', fontSize: 14, opacity: loading ? 0.6 : 1 }}>
          {loading ? '処理中...' : authMode === 'login' ? 'ログイン' : 'アカウントを作成する'}
        </button>

        <Divider label="または" />

        <button onClick={handleGoogleLogin} style={{ ...btn.secondary, width: '100%', padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
          <svg width="16" height="16" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
          </svg>
          Googleでログイン / 登録
        </button>
      </div>
    </div>
  )
}

// ==================== RESET PASSWORD ====================
function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleReset() {
    if (password.length < 6) { setError('パスワードは6文字以上'); return }
    if (password !== confirm) { setError('パスワードが一致しません'); return }
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    if (error) setError(error.message)
    else setDone(true)
    setLoading(false)
  }

  const fieldStyle = { ...inp, padding: '11px 14px', fontSize: 14 }

  if (done) return (
    <div style={{ minHeight: '100vh', background: C.navy, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT }}>
      <div style={{ background: C.cream, borderRadius: 4, padding: '52px', width: 420, textAlign: 'center' }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: C.navy, marginBottom: 20 }}>パスワードを設定しました</div>
        <button onClick={() => window.location.href = '/'} style={{ ...btn.primary, width: '100%', padding: '13px' }}>ログイン画面へ</button>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: C.navy, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT }}>
      <div style={{ background: C.cream, borderRadius: 4, padding: '52px', width: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <img src="/logo.png" alt="SynapseDeal" style={{ height: 38, marginBottom: 14 }} onError={e => e.target.style.display = 'none'} />
          <div style={{ fontSize: 18, fontWeight: 700, color: C.navy }}>新しいパスワードを設定</div>
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, marginBottom: 6, color: C.textMuted }}>新しいパスワード</label>
          <input type="password" style={fieldStyle} placeholder="6文字以上" value={password} onChange={e => setPassword(e.target.value)} />
        </div>
        <div style={{ marginBottom: 24 }}>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, marginBottom: 6, color: C.textMuted }}>パスワード確認</label>
          <input type="password" style={fieldStyle} placeholder="もう一度入力" value={confirm} onChange={e => setConfirm(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleReset()} />
        </div>
        {error && <div style={{ fontSize: 12, color: C.danger, background: C.dangerBg, borderRadius: 4, padding: '10px 14px', marginBottom: 16 }}>{error}</div>}
        <button onClick={handleReset} disabled={loading} style={{ ...btn.primary, width: '100%', padding: '13px', opacity: loading ? 0.6 : 1 }}>
          {loading ? '設定中...' : '設定する'}
        </button>
      </div>
    </div>
  )
}

// ==================== DOMAIN NOT ALLOWED ====================
function DomainNotAllowedScreen({ email, onLogout }) {
  const domain = email?.split('@')[1] || ''
  return (
    <div style={{ minHeight: '100vh', background: C.navy, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT }}>
      <div style={{ background: C.cream, borderRadius: 4, padding: '56px 52px', width: 500, textAlign: 'center' }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: C.navy, marginBottom: 12 }}>アクセスが制限されています</div>
        <div style={{ fontSize: 13, color: C.textMuted, lineHeight: 2, marginBottom: 28 }}>
          <strong>@{domain}</strong> はSynapseDealの利用が許可されていません。<br />ご利用をご希望の場合は、こちらよりお申し込みください。
        </div>
        <div style={{ background: '#F8F6E8', border: '1px solid ' + C.borderDark, borderRadius: 4, padding: '20px 24px', marginBottom: 28, textAlign: 'left' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.navy, marginBottom: 12 }}>ご利用申請について</div>
          <div style={{ fontSize: 13, color: C.textMuted, lineHeight: 2 }}>
            法人向けエンタープライズプランのみご提供<br />
            お問い合わせ後、審査の上ご連絡いたします<br />
            info@synapsedeal.co.jp
          </div>
        </div>
        <a href="mailto:info@synapsedeal.co.jp?subject=SynapseDeal利用申請"
          style={{ display: 'block', ...btn.primary, textDecoration: 'none', padding: '13px', marginBottom: 10 }}>
          利用申請メールを送る
        </a>
        <button onClick={onLogout} style={{ ...btn.ghost, width: '100%', padding: '11px' }}>ログアウト</button>
      </div>
    </div>
  )
}

// ==================== ONBOARDING ====================
function OnboardingScreen({ session, onComplete }) {
  const [companyName, setCompanyName] = useState('')
  const [contactName, setContactName] = useState('')
  const [tel, setTel] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSave() {
    if (!companyName.trim() || !contactName.trim()) { setError('会社名と担当者名は必須です'); return }
    setLoading(true)
    const { error } = await supabase.from('company_profiles').upsert({ user_id: session.user.id, company_name: companyName, contact_name: contactName, email: session.user.email, tel })
    if (error) { setError('保存に失敗しました: ' + error.message); setLoading(false); return }
    localStorage.setItem(USERS_KEY, JSON.stringify([{ id: '1', name: contactName, email: session.user.email, role: 'admin' }]))
    setLoading(false)
    onComplete({ companyName, contactName })
  }

  const fieldStyle = { ...inp, padding: '11px 14px', fontSize: 14 }
  const labelStyle = { display: 'block', fontSize: 11, fontWeight: 700, marginBottom: 6, color: C.textMuted }

  return (
    <div style={{ minHeight: '100vh', background: C.navy, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT }}>
      <div style={{ background: C.cream, borderRadius: 4, padding: '52px', width: 500 }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <img src="/logo.png" alt="SynapseDeal" style={{ height: 40, marginBottom: 16 }} onError={e => e.target.style.display = 'none'} />
          <div style={{ fontSize: 20, fontWeight: 700, color: C.navy }}>ようこそ、SynapseDealへ</div>
          <div style={{ fontSize: 12, color: C.textLight, marginTop: 8, lineHeight: 1.7 }}>まず会社の基本情報を登録してください</div>
        </div>
        <div style={{ marginBottom: 18 }}>
          <label style={labelStyle}>会社名 <span style={{ color: C.danger }}>*</span></label>
          <input style={fieldStyle} placeholder="株式会社〇〇" value={companyName} onChange={e => setCompanyName(e.target.value)} />
        </div>
        <div style={{ marginBottom: 18 }}>
          <label style={labelStyle}>担当者名 <span style={{ color: C.danger }}>*</span></label>
          <input style={fieldStyle} placeholder="山田 太郎" value={contactName} onChange={e => setContactName(e.target.value)} />
        </div>
        <div style={{ marginBottom: 18 }}>
          <label style={labelStyle}>メールアドレス</label>
          <input style={{ ...fieldStyle, background: C.bgSub, color: C.textLight }} value={session.user.email} disabled />
        </div>
        <div style={{ marginBottom: 32 }}>
          <label style={labelStyle}>電話番号（任意）</label>
          <input style={fieldStyle} placeholder="03-0000-0000" value={tel} onChange={e => setTel(e.target.value)} />
        </div>
        {error && <div style={{ fontSize: 12, color: C.danger, background: C.dangerBg, borderRadius: 4, padding: '10px 14px', marginBottom: 16 }}>{error}</div>}
        <button onClick={handleSave} disabled={loading} style={{ ...btn.primary, width: '100%', padding: '14px', fontSize: 14, opacity: loading ? 0.6 : 1 }}>
          {loading ? '登録中...' : '登録して始める'}
        </button>
      </div>
    </div>
  )
}

// ==================== DASHBOARD ====================
function Dashboard({ session, deals, tickets, companyName, onNavigate }) {
  const activeDeals = deals.filter(d => d.phase !== 'closing')
  const closingDeals = deals.filter(d => d.phase === 'closing')
  const phaseLabel = (key) => PHASES.find(p => p.key === key)?.label || key

  const kpis = [
    { label: 'ゲキラクIMチケット', value: tickets, unit: '枚', sub: 'チケット残数', onClick: () => onNavigate('gekiraku_im') },
    { label: '進行中案件', value: activeDeals.length, unit: '件', sub: 'クロージング前', onClick: () => onNavigate('deals') },
    { label: 'クロージング', value: closingDeals.length, unit: '件', sub: '最終フェーズ', onClick: () => onNavigate('deals') },
    { label: '総案件数', value: deals.length, unit: '件', sub: '全フェーズ合計', onClick: () => onNavigate('deals') },
  ]

  const services = [
    { key: 'pipeline', title: '営業パイプライン', desc: '売り手候補の発掘・接触・アドバイザリー契約締結後管理', available: true },
    { key: 'gekiraku_im', title: 'ゲキラクIM', desc: 'M&A案件概要書（IM）の作成支援サービス', available: true },
    { key: 'deals', title: '案件管理', desc: '進行案件の進捗管理・DDサポート', available: true },
    { key: 'scoring', title: '候補先選定', desc: 'AI候補先生成・6軸スコアリング・Comps比較', available: true },
    { key: 'contract', title: '契約書作成', desc: 'NDA・LOI・SPA・アドバイザリー契約をAI自動生成', available: true },
    { key: 'dd', title: 'DD支援', desc: '財務DDの計画策定・論点抽出・レポート生成', available: true },
    { key: 'valuation', title: 'バリュエーション', desc: 'DCF・倍率法・修正純資産法で企業価値を算定', available: true },
  ]

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '36px 32px', fontFamily: FONT }}>
      <div style={{ marginBottom: 32, paddingBottom: 20, borderBottom: '2px solid ' + C.navy, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.gold, letterSpacing: '0.1em', marginBottom: 6 }}>DASHBOARD</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: C.navy, letterSpacing: '-0.03em' }}>{companyName || 'SynapseDeal'}</div>
          <div style={{ fontSize: 13, color: C.textMuted, marginTop: 4 }}>{session?.user?.email}</div>
        </div>
        <div style={{ fontSize: 12, color: C.textLight }}>{new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })}</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginBottom: 32 }}>
        {kpis.map((kpi, i) => (
          <div key={i} onClick={kpi.onClick}
            style={{ background: i === 0 ? 'linear-gradient(135deg, ' + C.navy + ' 0%, #2D4160 100%)' : C.bgCard, borderRadius: 12, padding: '22px 22px', cursor: 'pointer', border: i === 0 ? 'none' : '1px solid ' + C.border, boxShadow: i === 0 ? '0 4px 20px rgba(27,43,75,0.18)' : '0 1px 4px rgba(0,0,0,0.04)', transition: 'transform 0.15s, box-shadow 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = i === 0 ? '0 8px 28px rgba(27,43,75,0.25)' : '0 4px 12px rgba(0,0,0,0.08)' }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = i === 0 ? '0 4px 20px rgba(27,43,75,0.18)' : '0 1px 4px rgba(0,0,0,0.04)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: i === 0 ? C.gold : C.textMuted, letterSpacing: '0.06em', marginBottom: 10 }}>{kpi.label}</div>
            <div style={{ fontSize: 40, fontWeight: 800, color: i === 0 ? (kpi.value > 0 ? C.cream : '#FF6B6B') : C.navy, lineHeight: 1, marginBottom: 6, fontFamily: 'monospace' }}>
              {fmtNum(kpi.value)}<span style={{ fontSize: 14, marginLeft: 4, fontWeight: 400, color: i === 0 ? 'rgba(255,255,255,0.5)' : C.textMuted }}>{kpi.unit}</span>
            </div>
            <div style={{ fontSize: 11, color: i === 0 ? 'rgba(255,255,255,0.5)' : C.textLight }}>{kpi.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, marginBottom: 32 }}>
        <div style={{ background: 'linear-gradient(135deg, ' + C.navy + ' 0%, #1E3A5F 100%)', borderRadius: 12, padding: '28px 32px', boxShadow: '0 4px 20px rgba(27,43,75,0.15)', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', right: -20, top: -20, width: 120, height: 120, borderRadius: '50%', background: 'rgba(201,168,76,0.08)' }} />
          <div style={{ fontSize: 11, fontWeight: 700, color: C.gold, letterSpacing: '0.12em', marginBottom: 10 }}>GEKIRAKU IM</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: C.cream, marginBottom: 10, lineHeight: 1.4 }}>案件概要書（IM）の作成を<br/>支援する</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 16px', display: 'flex', alignItems: 'baseline', gap: 4 }}>
              <span style={{ fontSize: 24, fontWeight: 800, color: tickets > 0 ? C.gold : '#FF6B6B', fontFamily: 'monospace' }}>{tickets}</span>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>枚残</span>
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>チケット残数</div>
          </div>
          <button onClick={() => onNavigate('gekiraku_im')}
            style={{ background: C.gold, color: '#fff', border: 'none', borderRadius: 8, padding: '10px 24px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            📋 IM作成を依頼する
          </button>
        </div>

        <div style={{ background: C.bgCard, border: '1px solid ' + C.border, borderRadius: 12, padding: '22px 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.navy }}>📁 最近の案件</div>
            <button onClick={() => onNavigate('deals')} style={{ fontSize: 11, color: C.textMuted, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', fontFamily: FONT }}>すべて見る →</button>
          </div>
          {deals.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 0', color: C.textLight, fontSize: 13 }}>
              案件がありません
              <div style={{ marginTop: 10 }}>
                <button onClick={() => onNavigate('deals')} style={{ ...btn.secondary, padding: '7px 16px', fontSize: 12 }}>新規案件を作成</button>
              </div>
            </div>
          ) : (
            deals.slice(0, 4).map((deal, i) => (
              <div key={deal.id} onClick={() => onNavigate('deals')}
                style={{ padding: '9px 0', borderBottom: i < Math.min(deals.length, 4) - 1 ? '1px solid ' + C.border : 'none', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                onMouseEnter={e => e.currentTarget.style.opacity = '0.7'}
                onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{deal.deal_name}</div>
                  <div style={{ fontSize: 11, color: C.textLight, marginTop: 2 }}>{deal.industry || '—'}</div>
                </div>
                <Badge>{phaseLabel(deal.phase)}</Badge>
              </div>
            ))
          )}
        </div>
      </div>

      <div>
        <div style={{ fontSize: 12, fontWeight: 700, color: C.textMuted, letterSpacing: '0.08em', marginBottom: 14 }}>利用可能なサービス</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 12 }}>
          {services.map((s, i) => (
            <div key={i} onClick={() => s.available && s.key && onNavigate(s.key)}
              style={{ background: s.available ? C.bgCard : C.bgSub, borderRadius: 6, padding: '18px 22px', cursor: s.available ? 'pointer' : 'default', border: '2px solid ' + C.border, opacity: s.available ? 1 : 0.45, transition: 'all 0.15s' }}
              onMouseEnter={e => { if (s.available) { e.currentTarget.style.borderColor = C.navy; e.currentTarget.style.background = C.bgSub } }}
              onMouseLeave={e => { if (s.available) { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.background = C.bgCard } }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.navy, marginBottom: 5 }}>{s.title}</div>
              <div style={{ fontSize: 12, color: C.textMuted, lineHeight: 1.6 }}>{s.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ==================== GEKIRAKU IM ====================

function TicketPurchaseModal({ onClose }) {
  const API = import.meta.env.VITE_API_URL || 'https://synapsedeal-production.up.railway.app'
  const [selected, setSelected] = useState(null)
  const [sending, setSending] = useState(false)
  const [done, setDone] = useState(false)

  const plans = [
    { id: 'trial', name: 'トライアルプラン', tickets: 3, price: 500000, label: '50万円', desc: 'まずはお試し' },
    { id: 'basic', name: 'ベーシック', tickets: 10, price: 2000000, label: '200万円', desc: '標準のプラン' },
    { id: 'pro', name: 'プロ', tickets: 50, price: 7500000, label: '750万円', desc: '頻繁に利用される方向け' },
    { id: 'enterprise', name: 'エンタープライズ', tickets: 100, price: 10000000, label: '1,000万円', desc: '大量・法人向け' },
  ]

  async function handlePurchase() {
    if (!selected) return
    setSending(true)
    const plan = plans.find(p => p.id === selected)
    try {
      await fetch(API + '/notify-slack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: ':ticket: *チケット購入申請*\n' +
            '> プラン: ' + plan.name + '（' + plan.tickets + '枚）\n' +
            '> 金額: ' + plan.label + '（税抜）\n' +
            '> 申請日時: ' + new Date().toLocaleString('ja-JP')
        })
      })
      setDone(true)
    } catch(e) { alert('送信に失敗しました: ' + e.message) }
    setSending(false)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: '40px 36px', maxWidth: 680, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        {done ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✓</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: C.navy, marginBottom: 8 }}>申請を受け付けました</div>
            <div style={{ fontSize: 14, color: C.textMuted, marginBottom: 24 }}>担当よりご連絡いたします。</div>
            <button onClick={onClose} style={{ ...btn.primary, padding: '10px 32px' }}>閉じる</button>
          </div>
        ) : (
          <>
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.gold, letterSpacing: '0.1em', marginBottom: 6 }}>TICKET PURCHASE</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: C.navy }}>チケット購入</div>
              <div style={{ fontSize: 13, color: C.textMuted, marginTop: 6 }}>プランを選択して申請してください。担当よりご連絡いたします（費用はすべて税抜）。</div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 28 }}>
              {plans.map(plan => (
                <div key={plan.id} onClick={() => setSelected(plan.id)}
                  style={{ border: '2px solid ' + (selected === plan.id ? C.navy : C.border), borderRadius: 10, padding: '18px 20px', cursor: 'pointer', background: selected === plan.id ? C.navy : '#fff', transition: 'all 0.15s' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: selected === plan.id ? C.gold : C.textMuted, letterSpacing: '0.06em', marginBottom: 6 }}>{plan.name}</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 4 }}>
                    <span style={{ fontSize: 32, fontWeight: 800, color: selected === plan.id ? '#fff' : C.navy, fontFamily: 'monospace' }}>{plan.tickets}</span>
                    <span style={{ fontSize: 14, color: selected === plan.id ? 'rgba(255,255,255,0.7)' : C.textMuted }}>枚</span>
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: selected === plan.id ? C.gold : C.navy }}>{plan.label}</div>
                  <div style={{ fontSize: 11, color: selected === plan.id ? 'rgba(255,255,255,0.6)' : C.textLight, marginTop: 4 }}>{plan.desc}</div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button onClick={onClose} style={{ ...btn.secondary, padding: '10px 24px' }}>キャンセル</button>
              <button onClick={handlePurchase} disabled={!selected || sending}
                style={{ ...btn.primary, padding: '10px 32px', opacity: (!selected || sending) ? 0.4 : 1, cursor: (!selected || sending) ? 'not-allowed' : 'pointer' }}>
                {sending ? '送信中...' : '🎫 チケット購入を申請する'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function GekirakuMenu({ users, tickets, selectedUserId, onSelectUser, onOrder }) {
  const selectedUser = users.find(u => u.id === selectedUserId)
  const [showTicketModal, setShowTicketModal] = useState(false)
  const isMobile = window.innerWidth < 768
  return (
    <>
    {showTicketModal && <TicketPurchaseModal onClose={() => setShowTicketModal(false)} />}
    <div style={{ maxWidth: 860, margin: '0 auto', padding: isMobile ? '16px' : '40px 32px', fontFamily: FONT }}>
      <div style={{ marginBottom: 32, paddingBottom: 20, borderBottom: '2px solid ' + C.navy }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: C.gold, letterSpacing: '0.1em', marginBottom: 6 }}>GEKIRAKU IM</div>
        <div style={{ fontSize: 28, fontWeight: 700, color: C.navy, letterSpacing: '-0.03em' }}>IM作成支援</div>
        <div style={{ fontSize: 14, color: C.textMuted, marginTop: 8, lineHeight: 1.7 }}>SynapseDealチームにIM（案件概要書）の作成を支援します。<br/>担当者を選択して依頼ボタンを押してください。</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, marginBottom: 32 }}>
        <div style={{ background: 'linear-gradient(135deg, ' + C.navy + ' 0%, #2D4160 100%)', borderRadius: 12, padding: '32px 28px', boxShadow: '0 4px 20px rgba(27,43,75,0.18)' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.gold, letterSpacing: '0.08em', marginBottom: 12 }}>🎫 チケット残数</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 64, fontWeight: 800, color: tickets > 0 ? C.cream : '#FF6B6B', lineHeight: 1, fontFamily: 'monospace' }}>{tickets}</span>
            <span style={{ fontSize: 20, color: '#A8B8C8', fontWeight: 400 }}>枚</span>
          </div>
          <div style={{ height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 2, marginBottom: 12 }}>
            <div style={{ height: '100%', width: Math.min(tickets * 20, 100) + '%', background: tickets > 0 ? C.gold : '#FF6B6B', borderRadius: 2, transition: 'width 0.5s' }} />
          </div>
          {tickets === 0
            ? <div style={{ fontSize: 12, color: '#FF9999', fontWeight: 600 }}>⚠ チケット残数なし</div>
            : <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>あと {tickets} 回IM作成できます</div>
          }
          <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
            <button onClick={() => setShowTicketModal(true)} style={{ width: '100%', padding: '8px 0', background: C.gold, border: 'none', borderRadius: 6, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>🎫 チケット購入はこちら</button>
          </div>
        </div>

        <div style={{ background: C.bgCard, border: '2px solid ' + C.border, borderRadius: 12, padding: '28px 32px' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.navy, marginBottom: 16 }}>👤 担当アドバイザーを選択</div>
          {users.length === 0 ? (
            <div style={{ fontSize: 13, color: C.danger, background: C.dangerBg, padding: '12px 16px', borderRadius: 8, border: '1px solid #E8C0C0', display: 'flex', alignItems: 'center', gap: 8 }}>
              ⚠ 設定タブでユーザーを登録してください
            </div>
          ) : (
            <select style={{ ...inp, fontSize: 14, padding: '10px 14px', borderRadius: 8, borderColor: selectedUserId ? C.navy : C.border, borderWidth: 2 }} value={selectedUserId} onChange={e => onSelectUser(e.target.value)}>
              <option value="">━━ 担当者を選択してください ━━</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.name}（{u.email}）</option>)}
            </select>
          )}
          {selectedUser && (
            <div style={{ marginTop: 14, padding: '12px 16px', background: C.successBg, border: '1px solid #B0D8BC', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: C.navy, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.cream, fontSize: 16, fontWeight: 700, flexShrink: 0 }}>
                {selectedUser.name.charAt(0)}
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.navy }}>{selectedUser.name}</div>
                <div style={{ fontSize: 12, color: C.textMuted }}>{selectedUser.email} · {selectedUser.role === 'admin' ? '管理者' : 'アドバイザー'}</div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <button onClick={onOrder} disabled={!selectedUserId || tickets === 0}
          style={{ ...btn.primary, padding: '14px 48px', fontSize: 15, fontWeight: 700, borderRadius: 8, opacity: (!selectedUserId || tickets === 0) ? 0.4 : 1, cursor: (!selectedUserId || tickets === 0) ? 'not-allowed' : 'pointer', boxShadow: selectedUserId && tickets > 0 ? '0 4px 14px rgba(27,43,75,0.25)' : 'none', transition: 'all 0.2s' }}>
          📋 IM作成を依頼する
        </button>
        {!selectedUserId && <div style={{ fontSize: 13, color: C.textMuted }}>← 担当者を選択してください</div>}
        {selectedUserId && tickets === 0 && <div style={{ fontSize: 13, color: C.danger, fontWeight: 600 }}>← チケットが不足しています</div>}
      </div>
    </div>
    </>
  )
}

function GekirakuOrder({ selectedUser, imFormatFile, onComplete, onBack }) {
  const isMobile = window.innerWidth < 768
  const [step, setStep] = useState(0)
  const [imFiles, setImFiles] = useState({})
  const [imShared, setImShared] = useState({})
  const [dealName, setDealName] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [industry, setIndustry] = useState('')
  const [scheme, setScheme] = useState('株式譲渡')
  const [fiscalYearEnd, setFiscalYearEnd] = useState('')
  const [specialNotes, setSpecialNotes] = useState('')
  const [showConfirm, setShowConfirm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  const [driveUploading, setDriveUploading] = useState({})
  const [driveUploaded, setDriveUploaded] = useState({})

  async function handleFiles(key, newFiles) {
    setImFiles(prev => ({ ...prev, [key]: [...(prev[key] || []), ...newFiles] }))
    if (newFiles.length === 0) return
    setDriveUploading(prev => ({ ...prev, [key]: true }))
    try {
      const formData = new FormData()
      formData.append('deal_name', companyName || dealName || '未設定案件')
      newFiles.forEach(f => formData.append('files', f))
      const res = await fetch(API + '/drive/upload', { method: 'POST', body: formData })
      const data = await res.json()
      if (data.status === 'ok') setDriveUploaded(prev => ({ ...prev, [key]: [...(prev[key] || []), ...data.uploaded] }))
    } catch(e) { console.error('Drive upload error:', e) }
    setDriveUploading(prev => ({ ...prev, [key]: false }))
  }
  function handleShared(key, checked) { setImShared(prev => ({ ...prev, [key]: checked })); if (checked) setImFiles(prev => ({ ...prev, [key]: [] })) }

  async function submit() {
    setSubmitting(true); setShowConfirm(false)
    const fileNames = {}
    Object.keys(imFiles).forEach(k => { fileNames[k] = imFiles[k].map(f => f.name) })
    try {
      const res = await fetch(API + '/gekiraku-im', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ advisor_name: selectedUser?.name || '', advisor_email: selectedUser?.email || '', deal_name: dealName, company_name: companyName, industry, scheme, fiscal_year_end: fiscalYearEnd, special_notes: specialNotes, im_format_file: imFormatFile || '', uploaded_files: fileNames, shared_files: Object.keys(imShared).filter(k => imShared[k]) }) })
      const data = await res.json()
      if (data.status === 'ok') setDone(true)
      else alert('送信に失敗しました')
    } catch { alert('送信エラーが発生しました') }
    setSubmitting(false)
  }

  const labelStyle = { display: 'block', fontSize: 11, fontWeight: 700, marginBottom: 6, color: C.textMuted }

  if (done) return (
    <div style={{ maxWidth: 600, margin: '80px auto', padding: '0 32px', fontFamily: FONT }}>
      <div style={{ background: C.bgCard, borderRadius: 4, border: '1px solid ' + C.border, padding: '56px 40px', textAlign: 'center' }}>
        <div style={{ width: 52, height: 52, borderRadius: '50%', border: '2px solid ' + C.navy, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: 22, color: C.navy }}>✓</div>
        <div style={{ fontSize: 22, fontWeight: 700, color: C.navy, marginBottom: 12 }}>発注が完了しました</div>
        <div style={{ fontSize: 13, color: C.textMuted, marginBottom: 32, lineHeight: 1.8 }}>SynapseDealチームに連絡しました。<br />担当よりご連絡いたします。</div>
        <button onClick={onComplete} style={{ ...btn.secondary, padding: '11px 32px' }}>メニューに戻る</button>
      </div>
    </div>
  )

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: isMobile ? '16px' : '40px 32px', fontFamily: FONT }}>
      {showConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
          <div style={{ background: C.cream, borderRadius: 4, padding: '40px 44px', width: 440, textAlign: 'center' }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: C.navy, marginBottom: 12 }}>ゲキラクIMを発注しますか？</div>
            <div style={{ fontSize: 13, color: C.textMuted, lineHeight: 1.8, marginBottom: 28 }}>入力内容をSynapseDealチームに送信します。<br />発注後のキャンセルはできません。</div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button onClick={() => setShowConfirm(false)} style={{ ...btn.ghost, padding: '10px 28px' }}>キャンセル</button>
              <button onClick={submit} disabled={submitting} style={{ ...btn.primary, padding: '10px 32px', opacity: submitting ? 0.6 : 1 }}>{submitting ? '送信中...' : '発注する'}</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
        <button onClick={onBack} style={{ ...btn.ghost, padding: '7px 14px', fontSize: 12 }}>← メニューへ</button>
        <span style={{ color: C.border }}>/</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>IM作成依頼</span>
        <span style={{ marginLeft: 'auto', fontSize: 12, color: C.textLight, background: C.bgSub, padding: '4px 10px', borderRadius: 3 }}>担当：{selectedUser?.name}</span>
      </div>

      <StepIndicator current={step} labels={['案件情報（任意）', '資料準備', '確認・送信']} />

      {step === 0 && (
        <div>
          <Card>
            <CardHeader title="案件・対象情報（任意）" subtitle="以下の情報は任意です。入力がなくてもIM作成は可能です。" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {[
                { label: '案件名', key: 'v_dealName', val: dealName, set: setDealName, ph: '例：製造業A社M&A案件' },
                { label: '対象会社名', key: 'v_comp', val: companyName, set: setCompanyName, ph: '例：株式会社〇〇' },
                { label: '業種', key: 'v_ind', val: industry, set: setIndustry, ph: '例：製造業・IT' },
                { label: '決算期', key: 'v_fy', val: fiscalYearEnd, set: setFiscalYearEnd, ph: '例：3月末' },
              ].map(f => (
                <div key={f.key}>
                  <label style={labelStyle}>{f.label}</label>
                  <input style={inp} placeholder={f.ph} value={f.val} onChange={e => f.set(e.target.value)} />
                </div>
              ))}
            </div>
            <div style={{ marginTop: 16 }}>
              <label style={labelStyle}>スキーム</label>
              <select style={inp} value={scheme} onChange={e => setScheme(e.target.value)}>
                <option>株式譲渡</option><option>事業譲渡</option><option>合併</option><option>会社分割</option>
              </select>
            </div>
          </Card>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={() => setStep(1)} style={{ ...btn.primary, padding: '11px 32px' }}>次へ</button>
          </div>
        </div>
      )}

      {step === 1 && (
        <div>
          <Card>
            <CardHeader title="資料のご準備" />
            <div style={{ background: '#FDF8F0', border: '1px solid #E0CCAA', borderRadius: 4, padding: '12px 16px', marginBottom: 20, fontSize: 13, color: C.warning, lineHeight: 1.7 }}>
              直接またはBOX・GoogleDrive経由でSynapseDeal担当をご招待いただくか、以下の資料を直接アップロードしてください。
            </div>
            {DOCUMENTS.map(doc => (
              <div key={doc.key} style={{ borderBottom: '1px solid ' + C.border, padding: '14px 0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  {doc.required && <Badge variant="danger">必須</Badge>}
                  <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{doc.label}</span>
                  {doc.period && <span style={{ fontSize: 11, color: C.textLight }}>（{doc.period}）</span>}
                </div>
                <DropZone docKey={doc.key} onFiles={handleFiles} files={imFiles} isShared={imShared} onSharedChange={handleShared} driveUploading={driveUploading[doc.key]} driveUploaded={driveUploaded[doc.key]} />
              </div>
            ))}
          </Card>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <button onClick={() => setStep(0)} style={{ ...btn.ghost, padding: '10px 24px' }}>← 戻る</button>
            <button onClick={() => setStep(2)} style={{ ...btn.primary, padding: '11px 32px' }}>次へ</button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div>
          <Card>
            <CardHeader title="特記事項" />
            <textarea style={{ ...inp, minHeight: 110, resize: 'vertical' }} placeholder="特殊事情・リスク情報など" value={specialNotes} onChange={e => setSpecialNotes(e.target.value)} />
          </Card>
          <Card>
            <CardHeader title="発注内容の確認" />
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              {[
                ['担当者', `${selectedUser?.name}（${selectedUser?.email}）`],
                ['対象会社', companyName || '未入力'],
                ['業種', industry || '未入力'],
                ['スキーム', scheme],
                ['決算期', fiscalYearEnd || '未入力'],
                ['準備資料', `${Object.keys(imFiles).filter(k => imFiles[k]?.length > 0).length + Object.keys(imShared).filter(k => imShared[k]).length}件`],
              ].map(([k, v]) => (
                <tr key={k} style={{ borderBottom: '1px solid ' + C.border }}>
                  <td style={{ padding: '10px 0', width: 120, color: C.textLight, fontSize: 12, fontWeight: 700 }}>{k}</td>
                  <td style={{ padding: '10px 0', color: C.text }}>{v}</td>
                </tr>
              ))}
            </table>
          </Card>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <button onClick={() => setStep(1)} style={{ ...btn.ghost, padding: '10px 24px' }}>← 戻る</button>
            <button onClick={() => setShowConfirm(true)} style={{ ...btn.primary, padding: '12px 36px', fontSize: 14 }}>ゲキラクIMを発注する</button>
          </div>
        </div>
      )}
    </div>
  )
}

// ==================== MAIN APP ====================
export default function App() {
  const [session, setSession] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [domainAllowed, setDomainAllowed] = useState(null)
  const [onboardingDone, setOnboardingDone] = useState(null)
  const [checkingAccess, setCheckingAccess] = useState(false)
  const [companyName, setCompanyName] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => { setSession(session); setAuthLoading(false) })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => { setSession(session) })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => { if (session) checkAccess() }, [session])

  async function checkAccess() {
    setCheckingAccess(true)
    const domain = session.user.email.split('@')[1]
    const { data: domainData } = await supabase.from('allowed_domains').select('domain').eq('domain', domain).eq('is_active', true).single()
    if (!domainData) { setDomainAllowed(false); setCheckingAccess(false); return }
    setDomainAllowed(true)
    const { data: profileData } = await supabase.from('company_profiles').select('id, company_name').eq('user_id', session.user.id).single()
    setOnboardingDone(!!profileData)
    if (profileData?.company_name) setCompanyName(profileData.company_name)
    setCheckingAccess(false)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    setDomainAllowed(null); setOnboardingDone(null)
  }

  const [activeTab, setActiveTab] = useState('dashboard')
  const [scoringDeal, setScoringDeal] = useState(null)

  function startScoring(deal) {
    setScoringDeal(deal)
    setActiveTab('scoring')
  }
  const [deals, setDeals] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [selectedDeal, setSelectedDeal] = useState(null)
  const [ddResult, setDdResult] = useState(null)
  const [ddLoading, setDdLoading] = useState(false)
  const [additionalInfo, setAdditionalInfo] = useState('')
  const [form, setForm] = useState({ deal_name: '', industry: '', scheme: '株式譲渡', ma_strategy: '', advisor_mode: 'junior', corporate_number: '', seller_address: '' })
  const [users, setUsers] = useState(() => loadJSON(USERS_KEY, [{ id: '1', name: '', email: '', role: 'advisor' }]))
  const [companySaved, setCompanySaved] = useState(false)
  const [imFormatFile, setImFormatFile] = useState(() => localStorage.getItem(IM_FORMAT_KEY) || '')
  const [tickets] = useState(() => loadJSON(TICKETS_KEY, 3))
  const [imView, setImView] = useState('menu')
  const [selectedUserId, setSelectedUserId] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [hoveredMenu, setHoveredMenu] = useState(null)
  const hoverTimer = useRef(null)
  const setHoveredMenuDelayed = (key) => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current)
    if (key) {
      setHoveredMenu(key)
    } else {
      hoverTimer.current = setTimeout(() => setHoveredMenu(null), 120)
    }
  }

  useEffect(() => { if (session && onboardingDone) fetchDeals() }, [session, onboardingDone])

  async function fetchDeals() {
    setLoading(true)
    try { const res = await fetch(API + '/deals'); const data = await res.json(); setDeals(data.deals || []) }
    catch { setDeals([]) }
    setLoading(false)
  }

  async function createDeal() {
    if (!form.deal_name.trim()) return alert('案件名を入力してください')
    try {
      await fetch(API + '/deals', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      setShowModal(false); setForm({ deal_name: '', industry: '', scheme: '株式譲渡', ma_strategy: '', advisor_mode: 'junior' }); fetchDeals()
    } catch { alert('エラーが発生しました') }
  }

  const [editingDeal, setEditingDeal] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [deletingDeal, setDeletingDeal] = useState(null)

  async function deleteDeal(id) {
    try {
      await fetch(API + '/deals/' + id, { method: 'DELETE' })
      setDeletingDeal(null)
      fetchDeals()
    } catch { alert('削除エラーが発生しました') }
  }

  async function updateDeal() {
    try {
      await fetch(API + '/deals/' + editingDeal.id, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      })
      setEditingDeal(null)
      fetchDeals()
    } catch { alert('更新エラーが発生しました') }
  }

  async function runDDPrep() {
    setDdLoading(true); setDdResult(null)
    try {
      const res = await fetch(API + '/deals/' + selectedDeal.id + '/dd-prep', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ additional_info: additionalInfo }) })
      const data = await res.json(); setDdResult(data.result)
    } catch { alert('AIエラーが発生しました') }
    setDdLoading(false)
  }

  function saveSettings() {
    localStorage.setItem(USERS_KEY, JSON.stringify(users.map((u, i) => ({ ...u, id: u.id || String(i + 1) }))))
    localStorage.setItem(IM_FORMAT_KEY, imFormatFile)
    setCompanySaved(true); setTimeout(() => setCompanySaved(false), 3000)
  }

  const phaseLabel = (key) => PHASES.find(p => p.key === key)?.label || key
  const selectedUser = users.find(u => u.id === selectedUserId)

  const labelStyle = { display: 'block', fontSize: 11, fontWeight: 700, marginBottom: 6, color: C.textMuted }

  // dealsをコンポーネント用に整形
  const dealsForComponents = [
    // ダミーデータ（常に先頭に表示）
    { id: DEMO_DEAL.id, company_name: DEMO_DEAL.company_name, seller_name: DEMO_DEAL.seller_name,
      industry: DEMO_DEAL.industry, business: DEMO_DEAL.business, ma_strategy: DEMO_DEAL.ma_strategy,
      annual_revenue: DEMO_DEAL.sales, transaction_amount: DEMO_DEAL.transaction_amount,
      deal_name: DEMO_DEAL.deal_name },
    // 実データ
    ...deals.map(d => ({
      id: d.id, company_name: d.deal_name, seller_name: d.deal_name,
      industry: d.industry, business: d.ma_strategy, annual_revenue: '', transaction_amount: '',
    }))
  ]

  if (window.location.pathname === '/reset-password') return <ResetPasswordPage />
  if (authLoading || checkingAccess) return (
    <div style={{ minHeight: '100vh', background: C.cream, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT }}>
      <div style={{ fontSize: 13, color: C.textLight }}>読み込み中...</div>
    </div>
  )
  if (!session) return <AuthScreen />
  if (domainAllowed === false) return <DomainNotAllowedScreen email={session.user.email} onLogout={handleLogout} />
  if (onboardingDone === false) return <OnboardingScreen session={session} onComplete={({ companyName: cn }) => { setCompanyName(cn); setOnboardingDone(true); fetchDeals() }} />

  // レスポンシブ判定
  const isMobile = window.innerWidth < 768;

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: FONT, display: 'flex', flexDirection: 'column' }}>

      {/* ヘッダー */}
      <header style={{ background: '#FFFFFF', color: C.text, padding: '0 16px', height: 52, borderBottom: '1px solid ' + C.border, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* モバイル：ハンバーガーボタン */}
          {isMobile && (
            <button onClick={() => setSidebarOpen(v => !v)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px', display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ display: 'block', width: 18, height: 2, background: C.navy, borderRadius: 1, transition: 'all 0.2s', transform: sidebarOpen ? 'rotate(45deg) translate(4px,4px)' : 'none' }}/>
              <span style={{ display: 'block', width: 18, height: 2, background: C.navy, borderRadius: 1, transition: 'all 0.2s', opacity: sidebarOpen ? 0 : 1 }}/>
              <span style={{ display: 'block', width: 18, height: 2, background: C.navy, borderRadius: 1, transition: 'all 0.2s', transform: sidebarOpen ? 'rotate(-45deg) translate(4px,-4px)' : 'none' }}/>
            </button>
          )}
          <img src="/logo.png" alt="SYNAPSE DEAL" style={{ height: isMobile ? 22 : 28 }} onError={e => { e.target.style.display="none" }} />
          <span style={{ fontSize: isMobile ? 13 : 15, fontWeight: 700, color: C.navy, letterSpacing: '-0.02em' }}>SYNAPSE DEAL</span>
          {!isMobile && <><span style={{ width: 1, height: 16, background: C.border }} /><span style={{ fontSize: 11, color: C.textMuted }}>M&A Agent Platform</span></>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 20 }}>
          {!isMobile && <span style={{ fontSize: 12, color: C.textMuted }}>{companyName}</span>}
          {!isMobile && <span style={{ fontSize: 12, color: C.textMuted }}>{session?.user?.email}</span>}
          <button onClick={handleLogout} style={{ fontSize: 11, color: C.textMuted, background: 'none', border: '1px solid ' + C.border, borderRadius: 3, padding: '4px 10px', cursor: 'pointer', fontFamily: FONT }}>ログアウト</button>
        </div>
      </header>

      {/* メインレイアウト */}
      <div style={{ display: 'flex', flex: 1, marginTop: 52 }}>

        {/* 左端センサー（PCのみ） */}
        {!isMobile && !sidebarOpen && (
          <div onMouseEnter={() => setSidebarOpen(true)}
            style={{ position: 'fixed', top: 52, left: 0, bottom: 0, width: 6, zIndex: 150 }} />
        )}

        {/* モバイル：オーバーレイ */}
        {isMobile && sidebarOpen && (
          <div onClick={() => { setSidebarOpen(false); setHoveredMenu(null) }}
            style={{ position: 'fixed', inset: 0, top: 52, zIndex: 95, background: 'rgba(0,0,0,0.4)' }} />
        )}

        {/* ==================== 左サイドバー ==================== */}
        <aside
          onMouseLeave={() => { if (!isMobile) { setSidebarOpen(false); setHoveredMenuDelayed(null) } }}
          style={{
            width: 200, minWidth: 200,
            background: '#fff',
            borderRight: '1px solid ' + C.border,
            boxShadow: sidebarOpen ? '4px 0 16px rgba(0,0,0,0.10)' : 'none',
            position: 'fixed', top: 52, bottom: 0,
            zIndex: 100,
            transform: sidebarOpen ? 'translateX(0)' : 'translateX(-200px)',
            transition: 'transform 0.18s ease, box-shadow 0.18s ease',
            overflow: 'visible',
          }}
        >
          <nav style={{ width: 200, padding: '8px 0' }}>
            {[
              { key: 'dashboard', label: 'ダッシュボード', children: [] },
              { key: '_deals', label: '案件管理', children: [
                { key: 'nda', label: 'NDA締結', contractType: 'NDA' },
                { key: 'pipeline', label: '営業パイプライン' },
                { key: 'advisory', label: 'アドバイザリー契約支援', contractType: 'Advisory' },
                { key: 'deals', label: '案件管理パイプライン' },
                { key: 'scoring', label: '候補先選定' },
                { key: 'loi', label: 'LOI作成支援', contractType: 'LOI' },
                { key: 'mou', label: 'MOU作成支援', contractType: 'MOU' },
              ]},
              { key: 'gekiraku_im', label: 'IM作成支援', children: [] },
              { key: 'valuation', label: '企業価値算定', children: [] },
              { key: 'dd', label: 'デューデリジェンス支援', children: [] },
              { key: '_final', label: '最終契約支援', children: [
                { key: 'da', label: 'DA作成支援', contractType: 'DA' },
                { key: 'pre_closing', label: 'プレクロージング資料' },
                { key: 'post_closing', label: 'ポストクロージング資料' },
              ]},
              { key: 'company', label: '設定', children: [] },
            ].map(item => {
              const hasChildren = item.children && item.children.length > 0
              const isGroupActive = item.children?.some(c => activeTab === c.key || activeTab === 'contract_' + c.contractType)
              const isActive = activeTab === item.key || isGroupActive
              const isHovered = hoveredMenu === item.key

              return (
                <div key={item.key} style={{ position: 'relative' }}
                  onMouseEnter={() => setHoveredMenuDelayed(hasChildren ? item.key : null)}
                  onMouseLeave={() => setHoveredMenuDelayed(null)}
                >
                  <button
                    onClick={() => { if (!hasChildren) { setActiveTab(item.key); setImView('menu'); setSidebarOpen(false); setHoveredMenu(null) }}}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      width: '100%', padding: '10px 16px',
                      fontSize: 13, fontWeight: isActive ? 700 : 500,
                      border: 'none',
                      background: isHovered ? '#EEF2F7' : isActive ? '#EEF2F7' : 'none',
                      color: isActive || isHovered ? C.navy : C.text,
                      cursor: hasChildren ? 'default' : 'pointer', textAlign: 'left',
                      borderLeft: isActive ? '3px solid ' + C.navy : '3px solid transparent',
                      fontFamily: FONT, whiteSpace: 'nowrap',
                    }}
                    onMouseEnter={e => { if (!isActive && !hasChildren) e.currentTarget.style.background = '#f8fafc' }}
                    onMouseLeave={e => { if (!isActive && !hasChildren) e.currentTarget.style.background = 'none' }}
                  >
                    <span>{item.label}</span>
                    {hasChildren && <span style={{ fontSize: 11, color: '#94a3b8' }}>›</span>}
                  </button>

                  {/* フライアウトサブメニュー */}
                  {hasChildren && isHovered && (
                    <div
                      onMouseEnter={() => setHoveredMenuDelayed(item.key)}
                      onMouseLeave={() => setHoveredMenuDelayed(null)}
                      style={{
                        position: 'fixed', left: 200,
                        background: '#fff', border: '1px solid ' + C.border,
                        borderRadius: '0 8px 8px 0',
                        boxShadow: '6px 4px 20px rgba(0,0,0,0.12)',
                        minWidth: 210, zIndex: 300, padding: '6px 0',
                        marginLeft: -1,
                      }}
                    >
                      <div style={{ padding: '6px 14px 6px', fontSize: 10, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.1em', textTransform: 'uppercase', borderBottom: '1px solid #f1f5f9', marginBottom: 4 }}>
                        {item.label}
                      </div>
                      {item.children.map(child => {
                        const childActive = activeTab === child.key || activeTab === 'contract_' + child.contractType
                        return (
                          <button key={child.key}
                            onClick={() => {
                              if (child.contractType) setActiveTab('contract_' + child.contractType)
                              else { setActiveTab(child.key); setImView('menu') }
                              setSidebarOpen(false); setHoveredMenu(null)
                            }}
                            style={{
                              display: 'block', width: '100%', padding: '9px 18px',
                              fontSize: 13, fontWeight: childActive ? 700 : 400,
                              border: 'none', background: childActive ? '#EEF2F7' : 'none',
                              color: childActive ? C.navy : C.text,
                              cursor: 'pointer', textAlign: 'left',
                              borderLeft: childActive ? '3px solid ' + C.navy : '3px solid transparent',
                              fontFamily: FONT, whiteSpace: 'nowrap',
                            }}
                            onMouseEnter={e => { if (!childActive) e.currentTarget.style.background = '#f8fafc' }}
                            onMouseLeave={e => { if (!childActive) e.currentTarget.style.background = 'none' }}
                          >
                            {child.label}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </nav>
        </aside>

        {/* ==================== メインコンテンツ ==================== */}
        <main style={{ flex: 1, marginLeft: 0, minHeight: 'calc(100vh - 52px)', background: C.bg, overflowY: 'auto' }}>

          {/* ダッシュボード */}
          {activeTab === 'dashboard' && (
            <Dashboard session={session} deals={deals} tickets={tickets} companyName={companyName}
              onNavigate={key => { setActiveTab(key); setImView('menu') }} />
          )}

          {/* 営業パイプライン */}
          {activeTab === 'pipeline' && <Pipeline onStartScoring={startScoring} />}

          {/* 候補先選定 */}
          {activeTab === 'scoring' && <ScoringEngine initialTab={scoringDeal ? '候補先選定' : '案件管理'} initialDeal={scoringDeal} />}

          {/* 契約書系（contractType別） */}
          {activeTab === 'contract_NDA' && (
            <div style={{ maxWidth: 1100, margin: '0 auto', padding: isMobile ? '16px' : '32px 32px' }}>
              <ContractCreation deals={dealsForComponents} defaultType="NDA" />
            </div>
          )}
          {activeTab === 'contract_Advisory' && (
            <div style={{ maxWidth: 1100, margin: '0 auto', padding: isMobile ? '16px' : '32px 32px' }}>
              <ContractCreation deals={dealsForComponents} defaultType="Advisory" />
            </div>
          )}
          {activeTab === 'contract_LOI' && (
            <div style={{ maxWidth: 1100, margin: '0 auto', padding: isMobile ? '16px' : '32px 32px' }}>
              <ContractCreation deals={dealsForComponents} defaultType="LOI" />
            </div>
          )}
          {activeTab === 'contract_MOU' && (
            <div style={{ maxWidth: 1100, margin: '0 auto', padding: isMobile ? '16px' : '32px 32px' }}>
              <ContractCreation deals={dealsForComponents} defaultType="MOU" />
            </div>
          )}
          {activeTab === 'contract_DA' && (
            <div style={{ maxWidth: 1100, margin: '0 auto', padding: isMobile ? '16px' : '32px 32px' }}>
              <ContractCreation deals={dealsForComponents} defaultType="DA" />
            </div>
          )}
          {/* 旧キーとの後方互換 */}
          {activeTab === 'nda'      && <div style={{ maxWidth: 1100, margin: '0 auto', padding: isMobile ? '16px' : '32px 32px' }}><ContractCreation deals={dealsForComponents} defaultType="NDA" /></div>}
          {activeTab === 'advisory' && <div style={{ maxWidth: 1100, margin: '0 auto', padding: isMobile ? '16px' : '32px 32px' }}><ContractCreation deals={dealsForComponents} defaultType="Advisory" /></div>}
          {activeTab === 'loi'      && <div style={{ maxWidth: 1100, margin: '0 auto', padding: isMobile ? '16px' : '32px 32px' }}><ContractCreation deals={dealsForComponents} defaultType="LOI" /></div>}
          {activeTab === 'mou'      && <div style={{ maxWidth: 1100, margin: '0 auto', padding: isMobile ? '16px' : '32px 32px' }}><ContractCreation deals={dealsForComponents} defaultType="MOU" /></div>}
          {activeTab === 'da'       && <div style={{ maxWidth: 1100, margin: '0 auto', padding: isMobile ? '16px' : '32px 32px' }}><ContractCreation deals={dealsForComponents} defaultType="DA" /></div>}
          {activeTab === 'contract' && <div style={{ maxWidth: 1100, margin: '0 auto', padding: isMobile ? '16px' : '32px 32px' }}><ContractCreation deals={dealsForComponents} /></div>}

          {/* プレ/ポストクロージング */}
          {(activeTab === 'pre_closing' || activeTab === 'post_closing') && (
            <div style={{ maxWidth: 1100, margin: '0 auto', padding: isMobile ? '16px' : '32px 32px' }}>
              <div style={{ background: '#fff', border: '1px solid ' + C.border, borderRadius: 12, padding: 32 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.gold, letterSpacing: '0.1em', marginBottom: 8 }}>
                  {activeTab === 'pre_closing' ? 'PRE-CLOSING' : 'POST-CLOSING'}
                </div>
                <h2 style={{ fontSize: 22, fontWeight: 700, color: C.navy, marginBottom: 12 }}>
                  {activeTab === 'pre_closing' ? '📦 プレクロージング資料作成' : '🏁 ポストクロージング資料作成'}
                </h2>
                <p style={{ color: C.textMuted, fontSize: 14, lineHeight: 1.8, marginBottom: 24 }}>
                  {activeTab === 'pre_closing'
                    ? 'クロージング前に必要な書類（株主名簿・株券・各種同意書・官公庁届出等）の作成支援です。'
                    : 'クロージング後に必要な書類（登記申請・役員変更届・取引先通知等）の作成支援です。'}
                </p>
                <div style={{ padding: '16px 20px', background: C.bgSub, borderRadius: 8, border: '1px solid ' + C.border, fontSize: 13, color: C.textMuted }}>
                  🚧 この機能は準備中です。SynapseDeal BPOサービスにてサポートします。
                </div>
                <div style={{ marginTop: 20 }}>
                  <BPOButton context={activeTab === 'pre_closing' ? 'プレクロージング資料作成' : 'ポストクロージング資料作成'} />
                </div>
              </div>
            </div>
          )}

          {/* IM作成支援 */}
          {activeTab === 'gekiraku_im' && imView === 'menu' && (
            <GekirakuMenu users={users.filter(u => u.name && u.email)} tickets={tickets} selectedUserId={selectedUserId} onSelectUser={setSelectedUserId} onOrder={() => setImView('order')} />
          )}
          {activeTab === 'gekiraku_im' && imView === 'order' && (
            <GekirakuOrder selectedUser={selectedUser} imFormatFile={imFormatFile} onComplete={() => setImView('menu')} onBack={() => setImView('menu')} />
          )}

          {/* 企業価値算定 */}
          {activeTab === 'valuation' && (
            <div style={{ maxWidth: 1100, margin: '0 auto', padding: isMobile ? '16px' : '32px 32px' }}>
              <Valuation deals={dealsForComponents} />
            </div>
          )}

          {/* DD支援 */}
          {activeTab === 'dd' && (
            <div style={{ maxWidth: 1100, margin: '0 auto', padding: isMobile ? '16px' : '32px 32px' }}>
              <DueDiligence deals={dealsForComponents} />
            </div>
          )}

          {/* 案件管理パイプライン */}
          {activeTab === 'deals' && !selectedDeal && (
            <div style={{ maxWidth: 1100, margin: '0 auto', padding: isMobile ? '16px' : '32px 32px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 28, paddingBottom: 16, borderBottom: '1px solid ' + C.border }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.textLight, letterSpacing: '0.1em', marginBottom: 6 }}>案件管理パイプライン</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: C.navy }}>案件一覧</div>
                </div>
                <button onClick={() => setShowModal(true)} style={{ ...btn.primary, padding: '10px 24px' }}>新規案件を作成</button>
              </div>
              {/* エクスポートボタン */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
                <ExportExcelButton
                  filename="案件管理パイプライン"
                  sheets={[{ name: '案件一覧', rows: deals.map(d => ({
                    案件名: d.deal_name, 業種: d.industry||'', スキーム: d.scheme,
                    フェーズ: phaseLabel(d.phase), アドバイザーモード: d.advisor_mode==='junior'?'新人':'ベテラン',
                    'MA戦略': d.ma_strategy||'', 登録日: new Date(d.created_at).toLocaleDateString('ja-JP'),
                  })) }]}
                />
              </div>
              {loading ? (
                <div style={{ textAlign: 'center', padding: 80, color: C.textLight, fontSize: 13 }}>読み込み中...</div>
              ) : deals.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '80px 0', color: C.textLight }}>
                  <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8, color: C.text }}>案件がありません</div>
                  <button onClick={() => setShowModal(true)} style={{ ...btn.secondary }}>新規案件を作成</button>
                </div>
              ) : (
                <div style={{ border: '1px solid ' + C.border, borderRadius: 4, overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: C.bgSub }}>
                        {['案件名', '業種', 'スキーム', 'フェーズ', 'モード', '登録日', '操作'].map(h => (
                          <th key={h} style={{ padding: '11px 16px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: C.textLight, letterSpacing: '0.06em', borderBottom: '1px solid ' + C.border }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {deals.map((deal) => (
                        <tr key={deal.id} onClick={() => setSelectedDeal(deal)}
                          style={{ borderBottom: '1px solid ' + C.border, cursor: 'pointer', transition: 'background 0.1s' }}
                          onMouseEnter={e => e.currentTarget.style.background = C.bgSub}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                          <td style={{ padding: '13px 16px', fontWeight: 700, color: C.navy }}>{deal.deal_name}</td>
                          <td style={{ padding: '13px 16px', color: C.textMuted }}>{deal.industry || '—'}</td>
                          <td style={{ padding: '13px 16px', color: C.textMuted }}>{deal.scheme}</td>
                          <td style={{ padding: '13px 16px' }}><Badge>{phaseLabel(deal.phase)}</Badge></td>
                          <td style={{ padding: '13px 16px' }}><Badge variant={deal.advisor_mode === 'junior' ? 'warning' : 'success'}>{deal.advisor_mode === 'junior' ? '新人' : 'ベテラン'}</Badge></td>
                          <td style={{ padding: '13px 16px', color: C.textLight, fontSize: 12 }}>{new Date(deal.created_at).toLocaleDateString('ja-JP')}</td>
                          <td style={{ padding: '8px 16px' }} onClick={e => e.stopPropagation()}>
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button onClick={e => { e.stopPropagation(); setEditForm({ deal_name: deal.deal_name, industry: deal.industry, scheme: deal.scheme, phase: deal.phase, ma_strategy: deal.ma_strategy, advisor_mode: deal.advisor_mode }); setEditingDeal(deal) }}
                                style={{ padding: '4px 10px', fontSize: 11, fontWeight: 600, border: '1px solid ' + C.navy, borderRadius: 4, background: 'white', color: C.navy, cursor: 'pointer' }}>編集</button>
                              <button onClick={e => { e.stopPropagation(); setDeletingDeal(deal) }}
                                style={{ padding: '4px 10px', fontSize: 11, fontWeight: 600, border: '1px solid #E53E3E', borderRadius: 4, background: 'white', color: '#E53E3E', cursor: 'pointer' }}>削除</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'deals' && selectedDeal && (
            <div style={{ maxWidth: 900, margin: '0 auto', padding: isMobile ? '16px' : '32px 32px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
                <button onClick={() => { setSelectedDeal(null); setDdResult(null) }} style={{ ...btn.ghost, padding: '7px 14px', fontSize: 12 }}>← 案件一覧</button>
                <span style={{ color: C.border }}>/</span>
                <span style={{ fontSize: 13, color: C.textMuted }}>{selectedDeal.deal_name}</span>
              </div>
              <Card>
                <div style={{ fontSize: 22, fontWeight: 700, color: C.navy, marginBottom: 8 }}>{selectedDeal.deal_name}</div>
                <div style={{ display: 'flex', gap: 16, marginBottom: 20, fontSize: 12, color: C.textMuted }}>
                  {selectedDeal.industry && <span>{selectedDeal.industry}</span>}
                  <span>{selectedDeal.scheme}</span>
                </div>
                {selectedDeal.ma_strategy && (
                  <div style={{ borderLeft: '3px solid ' + C.navy, paddingLeft: 16, marginBottom: 20, fontSize: 13, color: C.textMuted, lineHeight: 1.7 }}>{selectedDeal.ma_strategy}</div>
                )}
                <label style={labelStyle}>補足情報（任意）</label>
                <textarea style={{ ...inp, minHeight: 90, resize: 'vertical', marginBottom: 16 }} placeholder="売主へのヒアリング情報" value={additionalInfo} onChange={e => setAdditionalInfo(e.target.value)} />
                <button onClick={runDDPrep} disabled={ddLoading}
                  style={{ ...btn.primary, opacity: ddLoading ? 0.6 : 1, cursor: ddLoading ? 'not-allowed' : 'pointer' }}>
                  {ddLoading ? '生成中...' : 'DDサポートを作成'}
                </button>
              </Card>
              {ddLoading && <div style={{ textAlign: 'center', padding: 48, color: C.textLight, fontSize: 13 }}>Claudeが思考中です...</div>}
              {ddResult && (
                <div>
                  <Card><CardHeader title="DDの全体観" /><div style={{ fontSize: 14, lineHeight: 1.9, color: C.textMuted }}>{ddResult.overview}</div></Card>
                </div>
              )}
            </div>
          )}

          {/* 設定 */}
          {activeTab === 'company' && (
            <div style={{ maxWidth: 800, margin: '0 auto', padding: isMobile ? '16px' : '32px 32px' }}>
              <div style={{ marginBottom: 28, paddingBottom: 16, borderBottom: '1px solid ' + C.border }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: C.navy }}>設定</div>
              </div>
              <Card>
                <CardHeader title="ユーザー管理" subtitle="ゲキラクIMは会社単位で全ユーザーが利用可能です。" />
                {users.map((user, i) => (
                  <div key={user.id} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto auto', gap: 10, marginBottom: 10, alignItems: 'center' }}>
                    <input style={inp} placeholder="氏名" value={user.name} onChange={e => { const u = [...users]; u[i] = { ...u[i], name: e.target.value }; setUsers(u) }} />
                    <input style={inp} placeholder="メールアドレス" value={user.email} onChange={e => { const u = [...users]; u[i] = { ...u[i], email: e.target.value }; setUsers(u) }} />
                    <select style={{ ...inp, width: 'auto' }} value={user.role} onChange={e => { const u = [...users]; u[i] = { ...u[i], role: e.target.value }; setUsers(u) }}>
                      <option value="admin">管理者</option><option value="advisor">アドバイザー</option><option value="viewer">閲覧のみ</option>
                    </select>
                    {users.length > 1 && <button onClick={() => setUsers(users.filter((_, j) => j !== i))} style={{ ...btn.ghost, padding: '8px 12px', fontSize: 12, color: C.danger, borderColor: '#E8C0C0' }}>削除</button>}
                  </div>
                ))}
                <button onClick={() => setUsers(u => [...u, { id: String(Date.now()), name: '', email: '', role: 'advisor' }])}
                  style={{ ...btn.secondary, padding: '8px 18px', fontSize: 12, marginTop: 8 }}>
                  ユーザーを追加
                </button>
              </Card>
              <Card>
                <CardHeader title="IMフォーマット設定" />
                <SimpleDropZone label="IMフォーマットをアップロード（Word / Excel / PDF）" onFile={f => setImFormatFile(f.name)} fileName={imFormatFile} />
              </Card>
              {companySaved && <div style={{ fontSize: 12, color: C.success, background: C.successBg, border: '1px solid #B0D8BC', borderRadius: 4, padding: '10px 16px', marginBottom: 16 }}>保存しました</div>}
              <button onClick={saveSettings} style={{ ...btn.primary, padding: '11px 32px' }}>保存する</button>
            </div>
          )}

        </main>
      </div>

      {/* ==================== モーダル群 ==================== */}

      {/* 案件編集 */}
      {editingDeal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: '36px 32px', maxWidth: 520, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: C.navy, marginBottom: 24 }}>案件を編集</div>
            <CorporateNumberSearch compact onResult={(data) => setEditForm(f => ({ ...f, corporate_number: data.number || '', seller_address: data.address || '' }))} />
            {[{ label: '案件名', key: 'deal_name' }, { label: '業種', key: 'industry' }, { label: 'M&A戦略メモ', key: 'ma_strategy' }].map(({ label, key }) => (
              <div key={key} style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: C.textMuted, marginBottom: 6 }}>{label}</label>
                <input value={editForm[key] || ''} onChange={e => setEditForm(f => ({ ...f, [key]: e.target.value }))} style={{ ...inp, width: '100%', boxSizing: 'border-box' }} />
              </div>
            ))}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: C.textMuted, marginBottom: 6 }}>スキーム</label>
              <select value={editForm.scheme || '株式譲渡'} onChange={e => setEditForm(f => ({ ...f, scheme: e.target.value }))} style={{ ...inp, width: '100%', boxSizing: 'border-box' }}>
                {['株式譲渡', '事業譲渡', '合併', '株式交換', '第三者割当増資'].map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: C.textMuted, marginBottom: 6 }}>フェーズ</label>
              <select value={editForm.phase || 'sourcing'} onChange={e => setEditForm(f => ({ ...f, phase: e.target.value }))} style={{ ...inp, width: '100%', boxSizing: 'border-box' }}>
                {PHASES.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button onClick={() => setEditingDeal(null)} style={{ ...btn.secondary, padding: '10px 24px' }}>キャンセル</button>
              <button onClick={updateDeal} style={{ ...btn.primary, padding: '10px 28px' }}>保存</button>
            </div>
          </div>
        </div>
      )}

      {/* 案件削除確認 */}
      {deletingDeal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: '36px 32px', maxWidth: 440, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>🗑</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: C.navy, marginBottom: 10 }}>案件を削除しますか？</div>
            <div style={{ fontSize: 13, color: C.textMuted, marginBottom: 28 }}>この操作は取り消せません。</div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button onClick={() => setDeletingDeal(null)} style={{ ...btn.secondary, padding: '10px 24px' }}>キャンセル</button>
              <button onClick={() => deleteDeal(deletingDeal.id)} style={{ padding: '10px 28px', background: '#E53E3E', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>削除する</button>
            </div>
          </div>
        </div>
      )}

      {/* 新規案件作成モーダル */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowModal(false)}>
          <div style={{ background: C.cream, borderRadius: 4, padding: '36px 40px', width: 520, maxWidth: '92vw', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 18, fontWeight: 700, color: C.navy, marginBottom: 24, paddingBottom: 16, borderBottom: '1px solid ' + C.border }}>新規案件を作成</div>
            <CorporateNumberSearch compact onResult={(data) => setForm(fm => ({ ...fm, deal_name: fm.deal_name || data.name, corporate_number: data.number || '', seller_address: data.address || '' }))} />
            {[
              { label: '案件名', key: 'deal_name', placeholder: '例：株式会社〇〇 M&A案件', required: true },
              { label: '業種', key: 'industry', placeholder: '例：製造業・IT・医療' },
              { label: '戦略目的・背景', key: 'ma_strategy', placeholder: '例：後継者拡大・シナジー創出' },
            ].map(f => (
              <div key={f.key} style={{ marginBottom: 16 }}>
                <label style={labelStyle}>{f.label}{f.required && ' *'}</label>
                <input style={inp} placeholder={f.placeholder} value={form[f.key]} onChange={e => setForm(fm => ({ ...fm, [f.key]: e.target.value }))} />
              </div>
            ))}
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>スキーム</label>
              <select style={inp} value={form.scheme} onChange={e => setForm(fm => ({ ...fm, scheme: e.target.value }))}>
                <option>株式譲渡</option><option>事業譲渡</option><option>合併</option><option>会社分割</option>
              </select>
            </div>
            <div style={{ marginBottom: 28 }}>
              <label style={labelStyle}>アドバイザーモード</label>
              <select style={inp} value={form.advisor_mode} onChange={e => setForm(fm => ({ ...fm, advisor_mode: e.target.value }))}>
                <option value="junior">新人モード（丁寧なサジェスト）</option>
                <option value="senior">ベテランモード（要点・契約条件重視）</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowModal(false)} style={{ ...btn.ghost, padding: '10px 22px' }}>キャンセル</button>
              <button onClick={createDeal} style={{ ...btn.primary, padding: '10px 24px' }}>作成する</button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

// BPOボタン（App内共通）
function BPOButton({ context }) {
  const [sent, setSent] = useState(false)
  const handleClick = async () => {
    const API = import.meta.env.VITE_API_URL || 'https://synapsedeal-production.up.railway.app'
    try {
      await fetch(API + '/notify-slack', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: `🤝 *BPO相談リクエスト*\n> 場面：${context}\n> 日時：${new Date().toLocaleString('ja-JP')}` })
      })
      setSent(true)
    } catch(e) { alert('送信エラー: ' + e.message) }
  }
  return (
    <button onClick={handleClick} disabled={sent}
      style={{ padding: '10px 24px', background: sent ? '#10b981' : '#C8A951', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
      {sent ? '✅ 送信しました' : '💬 SYNAPSE DEALに相談する'}
    </button>
  )
}

// ==================== 共通Excelエクスポート ====================
export function ExportExcelButton({ data, filename = 'synapsedeal_export', label = '📥 Excelエクスポート', sheets }) {
  const handleExport = () => {
    try {
      const XLSX = window.XLSX || require('xlsx')
      const wb = XLSX.utils.book_new()

      if (sheets && sheets.length > 0) {
        // 複数シート
        sheets.forEach(({ name, rows }) => {
          if (!rows || rows.length === 0) return
          const ws = XLSX.utils.json_to_sheet(rows)
          // 列幅自動調整
          const cols = Object.keys(rows[0] || {}).map(k => ({ wch: Math.max(k.length * 2, 12) }))
          ws['!cols'] = cols
          XLSX.utils.book_append_sheet(wb, ws, name.slice(0, 31))
        })
      } else if (data && data.length > 0) {
        // 単一シート
        const ws = XLSX.utils.json_to_sheet(data)
        const cols = Object.keys(data[0] || {}).map(k => ({ wch: Math.max(k.length * 2, 12) }))
        ws['!cols'] = cols
        XLSX.utils.book_append_sheet(wb, ws, 'データ')
      } else {
        alert('エクスポートするデータがありません')
        return
      }

      const d = new Date()
      const dateStr = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`
      XLSX.writeFile(wb, `${filename}_${dateStr}.xlsx`)
    } catch(e) {
      // XLSXが読み込めない場合はCSVフォールバック
      const rows = sheets ? sheets.flatMap(s => s.rows) : (data || [])
      if (!rows.length) return
      const headers = Object.keys(rows[0])
      const csv = [headers.join(','), ...rows.map(r => headers.map(h => `"${String(r[h]||'').replace(/"/g,'""')}"`).join(','))].join('\n')
      const blob = new Blob(['\uFEFF'+csv], { type: 'text/csv;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = url; a.download = filename + '.csv'; a.click()
      URL.revokeObjectURL(url)
    }
  }

  return (
    <button onClick={handleExport}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 18px', background: '#1e7e34', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
      {label}
    </button>
  )
}
