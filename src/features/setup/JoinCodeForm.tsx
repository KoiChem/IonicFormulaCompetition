import { appPath } from '../../web/routing';
"use client";
import { useCallback, useState } from "react";
import { isValidJoinCode, normalizeJoinCode } from "./join-code";

import { JoinQrScanner } from "./JoinQrScanner";
import type { JoinQrTarget } from "./join-qr";

export function JoinCodeForm() {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [scanning, setScanning] = useState(false);
  const [notice, setNotice] = useState("");
  const closeScanner = useCallback(() => setScanning(false), []);
  const readQr = useCallback((target: JoinQrTarget) => {
    setScanning(false); setError("");
    if ('code' in target) { setCode(target.code); setNotice("参加コードを読み取りました。「参加する」を押してください。"); }
    else window.location.assign(appPath(`/join/${encodeURIComponent(target.roomId)}`));
  }, []);
  return <form className="join-form" onSubmit={event => {
    event.preventDefault();
    if (!isValidJoinCode(code)) { setError("参加コードは6文字で入力してください"); return; }
    window.location.assign(appPath(`/join?code=${encodeURIComponent(normalizeJoinCode(code))}`));
  }}>
    <label htmlFor="code">参加コード</label>
    <div className="join-row"><div className="join-entry"><button type="button" className="qr-button" aria-label="カメラで参加用QRコードを読み取る" title="QRコードを読み取る" onClick={() => { setNotice(""); setScanning(true); }}><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M8 5l2-2h4l2 2h4v15H4V5h4Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/><circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.8"/></svg></button><input id="code" name="code" inputMode="text" autoComplete="off" value={code} onChange={event => { setCode(event.target.value); setError(""); setNotice(""); }} required /></div><button type="submit">参加する</button></div>
    {notice && <p role="status" className="qr-notice">{notice}</p>}
    {scanning && <JoinQrScanner onRead={readQr} onClose={closeScanner} />}
    {error && <p role="alert" className="error">{error}</p>}
  </form>;
}
