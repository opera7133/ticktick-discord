/**
 * cron スケジューラー
 *
 * 朝 07:00・夜 21:00 (JST) にタスク通知を実行する
 */

import cron from "node-cron";
import { getTasksByProject, filterTasks } from "./ticktick.js";
import { sendNotification } from "./discord.js";

async function runNotification(): Promise<void> {
  const projectId = process.env.TICKTICK_PROJECT_ID;
  if (!projectId) {
    throw new Error(
      "TICKTICK_PROJECT_ID が設定されていません。\n" +
        "`bun run index.ts --list-projects` でプロジェクト一覧を確認し、.env に設定してください。"
    );
  }

  console.log(`\n🔔 タスク通知を開始します... (project: ${projectId})`);

  const tasks = await getTasksByProject(projectId);
  const classified = filterTasks(tasks);

  console.log(
    `📊 取得: 期限切れ ${classified.overdue.length} 件 / 今日 ${classified.today.length} 件 / 明日 ${classified.tomorrow.length} 件`
  );

  await sendNotification(classified);
}

export function startScheduler(): void {
  // 朝 07:00 (Asia/Tokyo)
  cron.schedule(
    "0 7 * * *",
    async () => {
      console.log("⏰ [朝の通知] 実行開始");
      try {
        await runNotification();
      } catch (err) {
        console.error("❌ 朝の通知でエラーが発生しました:", err);
      }
    },
    { timezone: "Asia/Tokyo" }
  );

  // 夜 21:00 (Asia/Tokyo)
  cron.schedule(
    "0 21 * * *",
    async () => {
      console.log("⏰ [夜の通知] 実行開始");
      try {
        await runNotification();
      } catch (err) {
        console.error("❌ 夜の通知でエラーが発生しました:", err);
      }
    },
    { timezone: "Asia/Tokyo" }
  );

  console.log("✅ スケジューラーを起動しました。（毎日 07:00 / 21:00 JST）");
}

export { runNotification };
