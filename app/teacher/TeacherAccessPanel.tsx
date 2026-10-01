import { apiFetch } from '../../src/web/api';
"use client";
import { useEffect, useState } from "react";
import { postJson } from "../../src/features/play/useRoomSync";

type Allowlist = { masterEmail: string; emails: string[]; revision: number };
export function TeacherAccessPanel() {
  const [isMaster, setIsMaster] = useState(false);
  const [list, setList] = useState<Allowlist | null>(null);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const refresh = async () => {
    const response = await apiFetch("/api/teacher/allowlist", { cache: "no-store" });
    const body = await response.json() as Allowlist & { error?: { message?: string } };
    if (!response.ok) throw new Error(body.error?.message ?? "一覧を取得できませんでした");
    setList(body);
  };
  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const response = await apiFetch("/api/teacher/session", { cache: "no-store" });
        const body = await response.json() as { role?: string };
        if (active && response.ok && body.role === "master") { setIsMaster(true); await refresh(); }
      } catch { if (active) setMessage("教員権限を確認できませんでした。画面を再読み込みしてください。"); }
    })();
    return () => { active = false; };
  }, []);
  const update = async (address: string, enabled: boolean) => {
    if (!list || busy) return;
    setBusy(true); setMessage("");
    try {
      const body = await postJson("/api/teacher/allowlist", { email: address, enabled, expectedRevision: list.revision, requestId: crypto.randomUUID() });
      setList(body);
      if (enabled) setEmail("");
      setMessage(enabled ? "教員を登録しました。" : "教員の許可を解除しました。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "更新できませんでした");
      try { await refresh(); } catch { /* Preserve the error and permit explicit refresh. */ }
    } finally { setBusy(false); }
  };
  if (!isMaster) return message ? <p role="status">{message}</p> : null;
  return <section className="panel wide" aria-labelledby="master-heading">
    <p className="eyebrow">MASTER TEACHER</p><h2 id="master-heading">許可教員の管理</h2>
    {list ? <>
      <p>マスター教員：{list.masterEmail}</p>
      <p>登録したメールアドレスのGoogleアカウントで、クラスコンペを作成できます。最大100件です。</p>
      <form onSubmit={event => { event.preventDefault(); void update(email, true); }}>
        <label htmlFor="teacher-email">許可する教員のメールアドレス</label>
        <input id="teacher-email" type="email" autoComplete="email" maxLength={254} required value={email} onChange={event => setEmail(event.target.value)} disabled={busy} style={{ width: "100%", boxSizing: "border-box", margin: "12px 0", padding: "12px" }}/>
        <button className="primary-action" disabled={busy}>教員を登録</button>
      </form>
      {list.emails.length ? <ul>{list.emails.map(address => <li key={address} style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "12px", margin: "12px 0", overflowWrap: "anywhere" }}><span style={{ flex: 1 }}>{address}</span><button disabled={busy} aria-label={`${address}の許可を解除`} onClick={() => { if (window.confirm(`${address} の教員権限を解除しますか？作成済みのルームも操作できなくなります。`)) void update(address, false); }}>許可を解除</button></li>)}</ul> : <p>許可教員はまだ登録されていません。</p>}
    </> : <p>一覧を取得中…</p>}
    <button disabled={busy} onClick={() => { setBusy(true); void refresh().catch(error => setMessage(error.message)).finally(() => setBusy(false)); }}>一覧を再読み込み</button>
    {message && <p role="status">{message}</p>}
  </section>;
}
