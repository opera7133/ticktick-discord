/**
 * エントリーポイント
 *
 * CLI引数で動作モードを切り替える:
 *   --auth             OAuth2 認証フローを実行し .token.json を生成
 *   --list-projects    プロジェクト一覧を表示（TICKTICK_PROJECT_ID の確認用）
 *   --notify           今すぐタスク通知を実行（テスト用）
 *   (引数なし)         スケジューラーを起動
 */

import "dotenv/config";
import { authorize } from "./src/auth.js";
import { getProjects } from "./src/ticktick.js";
import { startScheduler, runNotification } from "./src/scheduler.js";

const args = process.argv.slice(2);

async function main(): Promise<void> {
  if (args.includes("--auth")) {
    // OAuth2 認証フロー
    await authorize();
    return;
  }

  if (args.includes("--list-projects")) {
    // プロジェクト一覧表示
    console.log("📂 TickTick プロジェクト一覧を取得中...\n");
    const projects = await getProjects();
    if (projects.length === 0) {
      console.log("プロジェクトが見つかりません。");
      return;
    }
    console.log("ID\t\t\t\t\t名前");
    console.log("-".repeat(60));
    for (const p of projects) {
      console.log(`${p.id}\t${p.name}`);
    }
    console.log(`\n合計 ${projects.length} 件`);
    console.log(
      "\n👉 .env の TICKTICK_PROJECT_ID に使用するプロジェクトの ID を設定してください。"
    );
    return;
  }

  if (args.includes("--notify")) {
    // 即時通知（テスト用）
    await runNotification();
    return;
  }

  // デフォルト: スケジューラー起動
  startScheduler();
}

main().catch((err) => {
  console.error("❌ エラーが発生しました:", err);
  process.exit(1);
});
