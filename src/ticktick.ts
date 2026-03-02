/**
 * TickTick API クライアント
 */

import { getAccessToken } from "./auth.js";

const BASE_URL = "https://api.ticktick.com/open/v1";

export interface Project {
  id: string;
  name: string;
  color?: string;
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  content?: string;       // タスクの説明
  dueDate?: string;       // ISO 8601
  priority?: number;      // 0=なし, 1=低, 3=中, 5=高
  status?: number;        // 0=未完了, 2=完了
  tags?: string[];
}

export interface ClassifiedTasks {
  overdue: Task[];
  today: Task[];
  tomorrow: Task[];
}

async function apiFetch<T>(path: string): Promise<T> {
  const token = await getAccessToken();
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    throw new Error(`TickTick API エラー: ${res.status} ${await res.text()}`);
  }

  return res.json() as Promise<T>;
}

/**
 * プロジェクト一覧を取得する
 */
export async function getProjects(): Promise<Project[]> {
  return apiFetch<Project[]>("/project");
}

/**
 * 指定プロジェクトのタスクを全件取得する
 */
export async function getTasksByProject(projectId: string): Promise<Task[]> {
  const data = await apiFetch<{ tasks: Task[] }>(
    `/project/${projectId}/data`
  );
  return data.tasks ?? [];
}

/**
 * タスクを「期限切れ」「今日」「明日」に分類する
 * ステータスが完了（2）のタスクは除外する
 */
// JST は UTC+9
const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

/** Date を JST に換算した YYYY-MM-DD 文字列を返す */
function toJSTDateStr(d: Date): string {
  return new Date(d.getTime() + JST_OFFSET_MS).toISOString().slice(0, 10);
}

export function filterTasks(tasks: Task[]): ClassifiedTasks {
  const now = new Date();

  // today / tomorrow をJSTで計算
  const todayStr = toJSTDateStr(now);
  const tomorrowStr = toJSTDateStr(new Date(now.getTime() + 24 * 60 * 60 * 1000));

  const overdue: Task[] = [];
  const today: Task[] = [];
  const tomorrow_tasks: Task[] = [];

  for (const task of tasks) {
    // 完了済みを除外
    if (task.status === 2) continue;
    // 期限なしを除外
    if (!task.dueDate) continue;

    // dueDate は UTC 文字列なので JST に変換してから日付を比較
    const dueDateStr = toJSTDateStr(new Date(task.dueDate));

    if (dueDateStr < todayStr) {
      overdue.push(task);
    } else if (dueDateStr === todayStr) {
      today.push(task);
    } else if (dueDateStr === tomorrowStr) {
      tomorrow_tasks.push(task);
    }
  }

  // 期限の昇順にソート
  const byDueDate = (a: Task, b: Task) =>
    (a.dueDate ?? "").localeCompare(b.dueDate ?? "");

  return {
    overdue: overdue.sort(byDueDate),
    today: today.sort(byDueDate),
    tomorrow: tomorrow_tasks.sort(byDueDate),
  };
}
