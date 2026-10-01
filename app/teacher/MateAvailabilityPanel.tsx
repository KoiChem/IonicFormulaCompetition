import { apiFetch } from '../../src/web/api';
"use client";
import { useEffect, useState } from "react";
import { patchJson } from "../../src/features/play/useRoomSync";
type Settings = { enabled: boolean; revision: number };
export function MateAvailabilityPanel() {
  const [master, setMaster] = useState(false);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const reload = async () => {
    const response = await apiFetch("/api/teacher/site-settings", { cache: "no-store" });
    if (!response.ok) throw new Error("設定を取得できませんでした");
    setSettings(await response.json() as Settings);
  };
  useEffect(() => {
    let active = true;
    void apiFetch("/api/teacher/session", { cache: "no-store" }).then(async response => await response.json() as { role?: string }).then(async session => {
      if (active && session.role === "master") { setMaster(true); await reload(); }
    }).catch(() => { if (active) setMessage("設定を取得できませんでした"); });
    return () => { active = false; };
  }, []);
  if (!master) return null;
  const update = async () => {
    if (!settings || busy) return;
    setBusy(true); setMessage("保存しています…");
    try { const next = await patchJson("/api/teacher/site-settings", { enabled: !settings.enabled, expectedRevision: settings.revision, requestId: crypto.randomUUID() }); setSettings(next); setMessage("設定を保存しました"); }
    catch (error) { setMessage(error instanceof Error ? error.message : "保存できませんでした"); try { await reload(); } catch { /* Show the original failure. */ } }
    finally { setBusy(false); }
  };
  return <section className="panel wide"><p className="eyebrow">MASTER TEACHER</p><h2>メイトマッチの作成</h2><p>既存のルームは設定をOFFにしても続行できます。</p><button type="button" role="switch" aria-checked={settings?.enabled ?? false} disabled={busy || !settings} onClick={() => void update()}>{settings?.enabled ? "新規作成を許可中（ON）" : "新規作成を停止中（OFF）"}</button>{message && <p role="status">{message}</p>}</section>;
}
