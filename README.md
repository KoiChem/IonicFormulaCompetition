# Ionic Formula Competition

[アプリを開く](https://koichem.github.io/IonicFormulaCompetition/)

イオン・化合物の式と名称を競う授業用アプリ。GitHub Pagesに画面を配信し、Supabaseで認証・競技データ・通知を扱います。ChatGPTの契約は不要です。

- 教員: Googleログインと許可リスト。マスター教員が教員登録を管理します。
- 生徒: コードまたはQR、ニックネームで参加。ホームの参加コード欄の左にあるカメラボタンからQRを読み取り、コードを反映できます。カメラの許可が必要です。匿名セッションをブラウザー内で再利用します。
- クラスコンペ: 最大42名。5/10/15問、問題毎判定とまとめて判定、中断・結果・復習。
- 通知: private Realtimeの制御通知とホスト向け集計通知。通信障害時はHTTPで再確認します。

## 開発

Node.js 24、pnpm 11。

```sh
pnpm install --frozen-lockfile
cp .env.example .env.local
pnpm dev
pnpm build
RUN_LOAD=1 pnpm test
```

`src/config/deployment-public.json`にはブラウザー配布用の公開キーだけを保存します。DB接続・サービスキー・教員メールは含めません。ローカルテストAPIは `tests/browser/local-server.mjs` にあり、本番には配信しません。

## Supabaseと公開

[運用・初期設定](docs/OPERATIONS.md)を参照してください。DBは `supabase/migrations`、APIは `pnpm edge:bundle` で生成します。GitHub mainへのpushでテスト・ビルド・Pages公開を実行します。Supabase APIの更新は別途公式CLIで行います。

Google OAuthには管理者による初期設定が必要です。設定前は教員ログインを完了できません。検証状況は [実装記録](docs/IMPLEMENTATION_PROGRESS.md) に分けて記載します。

元のChatGPT/Sites版は別フォルダーで管理しており、このリポジトリの更新では変更しません。
