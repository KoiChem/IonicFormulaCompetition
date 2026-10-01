import { appPath } from '../../src/web/routing';
"use client";
import { rememberHistoryRoom } from "../../src/features/results/history-index";
import { useEffect, useState } from "react";
import { CompetitionSettingsForm, DEFAULT_SETTINGS } from "../../src/features/setup/CompetitionSettingsForm";
import { postJson } from "../../src/features/play/useRoomSync";
import { ReturnHomeButton } from "../../src/features/setup/ReturnHomeButton";

import { MateAvailabilityPanel } from "./MateAvailabilityPanel";
import { TeacherAccessPanel } from "./TeacherAccessPanel";

const DRAFT_KEY = "ionic-formula-competition:class-create-request";
export function TeacherClient() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS); const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [pendingDraft, setPendingDraft] = useState(false);
  useEffect(() => { try { const draft = JSON.parse(localStorage.getItem(DRAFT_KEY) ?? "null"); if (draft?.settings) { setSettings(draft.settings); setPendingDraft(true); } } catch {} }, []);
  const create = async () => { setBusy(true); setError(""); const fresh = { requestId: crypto.randomUUID(), settings }; let draft: typeof fresh; try { draft = JSON.parse(localStorage.getItem(DRAFT_KEY) ?? "null") ?? fresh; } catch { draft = fresh; } localStorage.setItem(DRAFT_KEY, JSON.stringify(draft)); try { const body = await postJson("/api/class-rooms", draft); const id = body.room.id; localStorage.setItem(`ionic-formula-competition:meta:${id}`, JSON.stringify({ joinCode: body.room.joinCode })); rememberHistoryRoom(localStorage, { roomId: id, role: "teacher", kind: "class", createdAtMs: Date.now(), settings: draft.settings }); localStorage.removeItem(DRAFT_KEY); location.href = appPath(`/rooms/${encodeURIComponent(id)}`); } catch (e: any) { if (e.status && e.status < 500 && e.code !== "database_conflict") { localStorage.removeItem(DRAFT_KEY); setPendingDraft(false); } else { setSettings(draft.settings); setPendingDraft(true); } setError(e.message); setBusy(false); } };
  return <main className="page-shell"><section className="panel wide"><p className="eyebrow">TEACHER</p><h1>クラスコンペを作る</h1><p>Googleで確認済みの教員アカウントと、サイトの許可設定が必要です。</p>{pendingDraft && <p className="notice">前回の作成結果を確認します。設定は変更できません。</p>}<CompetitionSettingsForm value={settings} onChange={setSettings} disabled={busy || pendingDraft}/><button className="primary-action" disabled={busy} onClick={create}>{busy ? "作成を確認中…" : pendingDraft ? "作成結果を再確認" : "クラスルームを作る"}</button><ReturnHomeButton disabled={busy}/>{error ? <p role="alert" className="error">{error}</p> : null}</section><TeacherAccessPanel /><MateAvailabilityPanel /></main>;
}
