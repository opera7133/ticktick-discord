# ticktick-discord

[English README](README.md)

TickTickのタスクを毎日 **07:00 / 21:00（JST）** にDiscordへ通知するツールです。  
期限切れ・今日・明日のタスクをEmbed形式で通知します。

## 必要なもの

- [Bun](https://bun.sh)
- TickTick Developer アカウント（`client_id` / `client_secret`）
- Discord Webhook URL

## セットアップ

### 1. 依存パッケージのインストール

```bash
bun install
```

### 2. 環境変数の設定

```bash
cp .env.example .env
```

`.env` を編集して各値を設定してください。

```env
TICKTICK_CLIENT_ID=your_client_id
TICKTICK_CLIENT_SECRET=your_client_secret
TICKTICK_REDIRECT_URI=http://localhost:3000/callback
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
TICKTICK_PROJECT_ID=   # 後で設定
```

### 3. OAuth2 認証

```bash
bun run auth
```

コンソールに表示されるURLをブラウザで開き、認証します。  
成功すると `.token.json` が生成されます（**Gitにはコミットしないでください**）。

### 4. プロジェクトIDの確認

```bash
bun run list-projects
```

プロジェクト一覧が表示されるので、通知したいプロジェクトの ID を `.env` の `TICKTICK_PROJECT_ID` に設定してください。

> [!NOTE]
> **Inbox を使いたい場合**、InboxのプロジェクトはAPIの仕様上 `list-projects` では取得できません。  
> IDを確認するには、ブラウザでTickTickを開き、開発者ツール（F12）→ **Networkタブ** でタスク関連のリクエストを確認してください。レスポンス内の `projectId` フィールドを探すと、Inboxのプロジェクトは `inbox` から始まるIDになっています。

### 5. 通知テスト

```bash
bun run notify
```

Discordに今すぐ通知を送信してテストできます。

---

## 起動

```bash
bun run start
```

スケジューラーが起動し、毎日 **07:00 / 21:00（JST）** に自動で通知します。  
プロセスを常駐させるには `pm2` などのプロセスマネージャーの利用を推奨します。

## コマンド一覧

| コマンド | 説明 |
|---|---|
| `bun run auth` | OAuth2認証フローを実行し `.token.json` を生成 |
| `bun run list-projects` | プロジェクト一覧を表示 |
| `bun run notify` | 今すぐタスク通知を実行（テスト用） |
| `bun run start` | スケジューラーを起動 |
