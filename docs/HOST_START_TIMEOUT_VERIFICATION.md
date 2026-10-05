# クラス参加・開始のタイムアウト対策検証

2026-10-05。承認仕様: `superpowers/specs/2026-10-05-host-start-timeout-design.md`。

## 変更

- QR参加の応答が失われても、保存済み資格で登録を確認して入室する。
- 開始要求をroom/ownerごとに保存。同じrequestIdとrevisionで照会・必要時一回だけ再送。応答不明を失敗と断定しない。開始成功後の画面更新だけの失敗も再取得する。
- host-only開始結果APIを独立したread-only repeatable-read接続で実行。quotaは短い別transaction。room mutex/通知送信とは分離。
- 各参加タブの状態取得・時計・Realtime購読をProviderで共有。初期待機は時計の三重取得を行わず、通知中に取得が進んでいれば後続取得を保証。
- 通知payloadは5個の無内容の更新メタデータだけ。過去のoutbox行も送信直前に再構築。claim/send/ackを分離し、外部HTTP中に接続/transaction/lockを保持しない。eventId/leaseが一致した行だけackし、差し替え通知を消さない。
- receiptを問題生成前に確認。問題はbind済みJSONから一括INSERT。準備期限/カウントダウンは後段の時刻を採用。通常stateの名簿比較・noop書き込み・topics重複取得を削減。
- 補助テーブルの保持期間清掃はforeground request/room lock外のbackground transaction。採点・保存期間・人数上限・共有教員認証の契約は維持。

## 検証

- `RUN_LOAD=1 vitest run`:511件成功。開始再送の早期receipt/v1-v2回帰、準備期限29.9/30.0/30.1秒を含む。型検査/build/Edge bundle/diff check成功。既存の500kB chunk警告は残る。
- Playwright: start POST commit後の応答を11.5秒保持し、通常stateを503にした。1POST/1status、誤ったdialogゼロ、pending draft消去、参加者は第1問。開始取消→再開始を確認。テストAuth/PGliteでのHTTP fallback検証であり、Google/Realtime本番を代替しない。
- 最初の取消/再開始操作にDOM removeChild例外が1件記録されたが、続けた取消/再開始は例外ゼロで正常に完了。公開production buildで改めて操作確認する。
- 独立レビューの取消後の操作無効化とclaim差替え競合をRED回帰テストで再現し修正。
- 実PostgreSQL17.11/postgres.js3.4、使い捨てlocalhost DB、ssl=false。運用runtimeはssl=require、pool max1×command/inspect各1。Auth検証は固定fixture、追加遅延200ms、SQL追加遅延10ms/query、通知flushは負荷測定から除外。Edge/Supavisor/Google/物理端末の実測とは異なる。
- 実PostgreSQL競合: 未コミットroom更新＋room advisory lock中に開始statusを22msで取得し、旧revisionを確認。外部通知3秒保持中、使用したbackendの開いたtransactionは0、別room transaction＋statusは4ms。制約違反後の全体rollbackを確認。

## 負荷測定

20人・42人それぞれ30回、15問/immediateの独立した新規classroom。最終join確定後にhost＋各参加タブ相当のstateを一斉要求し、その後ろにstartを投入する。同じprocessのmax1 command poolという厳しい条件。各試行でreceipt照会、同じstartの再送がgeneration1のままであること、manifest→ready→COUNTDOWNを確認。

初回20人の開始6.3秒は目標未達。stateの不要なDB往復を削減した後に全試行を取り直した。最終測定値:

| 人数 | 開始POST p95 / 最大 | manifest取得から全員ready p95 / 最大 |
| --- | --- | --- |
| 20 | 4.161秒 / 4.188秒 | 7.308秒 / 7.341秒 |
| 42 | 7.824秒 / 7.832秒 | 15.240秒 / 15.243秒 |

全60試行の開始/lock時間切れゼロ。readyの計測は開始確認と同一要求のreceipt再送確認後に開始した区間であり、開始POSTの待ち時間は含まない。開始POST・receipt照会・再送確認まで含む保守的な合計は20人約12.3秒、42人約23.8秒。時計/IndexedDB実保存/実Realtimeを含む物理端末の同時計測値ではない。後続の使い捨てDB matrixでは20/42人・5/15問・immediate/deferredの全8組を確認。

## 公開

未公開。Edge先行、Pages後続で反映し、公開asset/実Auth/API/開始照会とmateの参加・開始を検証する。rollback base: `1ac37a427ec5ee06e415c51345ed408f89487181`（既存試合を消去しない）。

本番の学校回線で20台/42台を同時に使う試験は未実施。
