import { appPath } from '../../web/routing';
"use client";
import { useState } from "react";
import { isValidJoinCode, normalizeJoinCode } from "./join-code";

export function JoinCodeForm() {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  return <form className="join-form" onSubmit={event => {
    event.preventDefault();
    if (!isValidJoinCode(code)) { setError("参加コードは6文字で入力してください"); return; }
    window.location.assign(appPath(`/join?code=${encodeURIComponent(normalizeJoinCode(code))}`));
  }}>
    <label htmlFor="code">参加コード</label>
    <div className="join-row"><input id="code" name="code" inputMode="text" autoComplete="off" value={code} onChange={event => { setCode(event.target.value); setError(""); }} required /><button type="submit">参加する</button></div>
    {error && <p role="alert" className="error">{error}</p>}
  </form>;
}
