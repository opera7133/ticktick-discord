/**
 * cron スケジューラー
 *
 * 環境変数 NOTIFICATION_CRON で指定された時間にタスク通知を実行する
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
  const cronConfig = process.env.NOTIFICATION_CRON || "0 20 * * *";
  const timezone = process.env.TIMEZONE || "Asia/Tokyo";

  // カンマ区切りで複数のスケジュールに対応
  const schedules = cronConfig.split(",").map((s) => s.trim());

  for (const schedule of schedules) {
    if (!cron.validate(schedule)) {
      console.error(`⚠️ 不正な cron 設定です: "${schedule}"`);
      continue;
    }

    cron.schedule(
      schedule,
      async () => {
        console.log(`⏰ [通知実行] 開始 (${schedule})`);
        try {
          await runNotification();
        } catch (err) {
          console.error(`❌ 通知実行中にエラーが発生しました (${schedule}):`, err);
        }
      },
      { timezone }
    );
  }

  console.log(
    `✅ スケジューラーを起動しました。\n   設定: ${schedules.join(
      ", "
    )}\n   タイムゾーン: ${timezone}`
  );
}

export { runNotification };
