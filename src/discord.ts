/**
 * Discord Webhook 通知モジュール
 *
 * Discord の Embed メッセージでタスクを通知する。
 * 2000文字 / Embed 10個 制限に対応した分割送信を行う。
 */

import type { ClassifiedTasks, Task } from "./ticktick.js";

const DISCORD_EMBED_COLOR = {
  overdue: 0xe74c3c,  // 赤
  today: 0xf39c12,    // オレンジ
  tomorrow: 0x2ecc71, // 緑
} as const;

const PRIORITY_LABEL: Record<number, string> = {
  0: "",
  1: "🔵 低",
  3: "🟡 中",
  5: "🔴 高",
};

const MAX_EMBEDS_PER_MESSAGE = 10;
const MAX_FIELD_VALUE_LENGTH = 1024;
const MAX_DESCRIPTION_LENGTH = 4096;

interface DiscordEmbed {
  title: string;
  description?: string;
  color: number;
  fields?: { name: string; value: string; inline?: boolean }[];
  footer?: { text: string };
}

interface DiscordPayload {
  username?: string;
  embeds: DiscordEmbed[];
}

function truncate(str: string, max: number): string {
  if (str.length <= max) return str;
  return str.slice(0, max - 3) + "...";
}

function buildTaskEmbed(task: Task, color: number): DiscordEmbed {
  const fields: DiscordEmbed["fields"] = [];

  if (task.dueDate) {
    // YYYY-MM-DDThh:mm... → 日本語表示
    const dateStr = task.dueDate.slice(0, 16).replace("T", " ");
    fields.push({ name: "📅 期限", value: dateStr, inline: true });
  }

  const priority = task.priority ?? 0;
  if (priority > 0 && PRIORITY_LABEL[priority]) {
    fields.push({ name: "優先度", value: PRIORITY_LABEL[priority], inline: true });
  }

  if (task.tags && task.tags.length > 0) {
    fields.push({ name: "🏷️ タグ", value: task.tags.join(", "), inline: true });
  }

  const embed: DiscordEmbed = {
    title: truncate(task.title, 256),
    color,
  };

  if (task.content) {
    embed.description = truncate(task.content, MAX_DESCRIPTION_LENGTH);
  }

  if (fields.length > 0) {
    embed.fields = fields;
  }

  return embed;
}

function buildSectionEmbed(
  label: string,
  emoji: string,
  color: number,
  count: number
): DiscordEmbed {
  return {
    title: `${emoji} ${label}（${count}件）`,
    color,
  };
}

/**
 * Discord Webhook にペイロードを送信する
 */
async function sendWebhook(
  webhookUrl: string,
  payload: DiscordPayload
): Promise<void> {
  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(
      `Discord Webhook エラー: ${res.status} ${await res.text()}`
    );
  }

  // Discord のレート制限対策: 少し待機
  await new Promise((r) => setTimeout(r, 500));
}

/**
 * Embed リストを MAX_EMBEDS_PER_MESSAGE 個ずつに分割して順次送信する
 */
async function sendEmbeds(
  webhookUrl: string,
  embeds: DiscordEmbed[],
  username: string
): Promise<void> {
  if (embeds.length === 0) return;

  for (let i = 0; i < embeds.length; i += MAX_EMBEDS_PER_MESSAGE) {
    const chunk = embeds.slice(i, i + MAX_EMBEDS_PER_MESSAGE);
    await sendWebhook(webhookUrl, { username, embeds: chunk });
  }
}

/**
 * 分類済みタスクを Discord へ通知する
 */
export async function sendNotification(
  tasks: ClassifiedTasks
): Promise<void> {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) {
    throw new Error("DISCORD_WEBHOOK_URL が設定されていません");
  }

  const totalCount =
    tasks.overdue.length + tasks.today.length + tasks.tomorrow.length;

  if (totalCount === 0) {
    console.log("📭 通知するタスクはありません。");
    return;
  }

  const now = new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" });
  const username = "TickTick Bot";

  // ヘッダーメッセージ
  await sendWebhook(webhookUrl, {
    username,
    embeds: [
      {
        title: "📋 タスク通知",
        description: `**${now}** 時点のタスクをお知らせします。`,
        color: 0x5865f2,
        footer: { text: `合計 ${totalCount} 件` },
      },
    ],
  });

  // セクション別に送信
  const sections: {
    label: string;
    emoji: string;
    color: number;
    taskList: Task[];
  }[] = [
    {
      label: "期限切れ",
      emoji: "🚨",
      color: DISCORD_EMBED_COLOR.overdue,
      taskList: tasks.overdue,
    },
    {
      label: "今日",
      emoji: "📌",
      color: DISCORD_EMBED_COLOR.today,
      taskList: tasks.today,
    },
    {
      label: "明日",
      emoji: "🔜",
      color: DISCORD_EMBED_COLOR.tomorrow,
      taskList: tasks.tomorrow,
    },
  ];

  for (const section of sections) {
    if (section.taskList.length === 0) continue;

    const embeds: DiscordEmbed[] = [
      buildSectionEmbed(section.label, section.emoji, section.color, section.taskList.length),
      ...section.taskList.map((t) => buildTaskEmbed(t, section.color)),
    ];

    await sendEmbeds(webhookUrl, embeds, username);
  }

  console.log(`✅ Discord への通知が完了しました。（合計 ${totalCount} 件）`);
}
