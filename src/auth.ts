/**
 * TickTick OAuth2 認証モジュール
 *
 * 使い方:
 *   bun run index.ts --auth  → ブラウザ認証フローを開始し .token.json を生成
 */

import { existsSync, readFileSync, writeFileSync } from "fs";
import { createServer } from "http";
import { URL } from "url";

const TOKEN_FILE = ".token.json";
const TICKTICK_AUTHORIZE_URL = "https://ticktick.com/oauth/authorize";
const TICKTICK_TOKEN_URL = "https://ticktick.com/oauth/token";

interface TokenData {
  access_token: string;
  refresh_token: string;
  expires_at: number; // Unix timestamp (ms)
}

function loadToken(): TokenData | null {
  if (!existsSync(TOKEN_FILE)) return null;
  try {
    return JSON.parse(readFileSync(TOKEN_FILE, "utf-8")) as TokenData;
  } catch {
    return null;
  }
}

function saveToken(data: TokenData): void {
  writeFileSync(TOKEN_FILE, JSON.stringify(data, null, 2), "utf-8");
}

async function refreshToken(
  clientId: string,
  clientSecret: string,
  refreshToken: string
): Promise<TokenData> {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });

  const res = await fetch(TICKTICK_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization:
        "Basic " +
        Buffer.from(`${clientId}:${clientSecret}`).toString("base64"),
    },
    body: body.toString(),
  });

  if (!res.ok) {
    throw new Error(
      `Token refresh failed: ${res.status} ${await res.text()}`
    );
  }

  const json = (await res.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };

  const tokenData: TokenData = {
    access_token: json.access_token,
    refresh_token: json.refresh_token ?? refreshToken,
    expires_at: Date.now() + json.expires_in * 1000,
  };

  saveToken(tokenData);
  return tokenData;
}

/**
 * 有効なアクセストークンを返す。
 * 期限切れの場合はリフレッシュを試みる。
 */
export async function getAccessToken(): Promise<string> {
  const clientId = process.env.TICKTICK_CLIENT_ID!;
  const clientSecret = process.env.TICKTICK_CLIENT_SECRET!;

  const token = loadToken();
  if (!token) {
    throw new Error(
      ".token.json が見つかりません。まず `bun run index.ts --auth` を実行してください。"
    );
  }

  // 5分のバッファを持って期限チェック
  if (Date.now() < token.expires_at - 5 * 60 * 1000) {
    return token.access_token;
  }

  console.log("🔄 アクセストークンをリフレッシュ中...");
  const refreshed = await refreshToken(clientId, clientSecret, token.refresh_token);
  return refreshed.access_token;
}

/**
 * OAuth2 ブラウザ認証フローを開始する。
 * ローカルサーバーでコールバックを受け取り .token.json を生成する。
 */
export async function authorize(): Promise<void> {
  const clientId = process.env.TICKTICK_CLIENT_ID!;
  const clientSecret = process.env.TICKTICK_CLIENT_SECRET!;
  const redirectUri = process.env.TICKTICK_REDIRECT_URI!;

  const state = Math.random().toString(36).slice(2);

  const authUrl = new URL(TICKTICK_AUTHORIZE_URL);
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("scope", "tasks:read tasks:write");
  authUrl.searchParams.set("state", state);

  console.log("\n🔑 以下のURLをブラウザで開いて認証してください:\n");
  console.log(authUrl.toString());
  console.log("\nコールバックを待機中... (Ctrl+C で終了)\n");

  await new Promise<void>((resolve, reject) => {
    const redirectUrl = new URL(redirectUri);
    const port = Number(redirectUrl.port) || 3000;

    const server = createServer(async (req, res) => {
      if (!req.url) return;

      const reqUrl = new URL(req.url, `http://localhost:${port}`);
      if (reqUrl.pathname !== redirectUrl.pathname) {
        res.writeHead(404);
        res.end("Not found");
        return;
      }

      const code = reqUrl.searchParams.get("code");
      const returnedState = reqUrl.searchParams.get("state");

      if (!code) {
        res.writeHead(400);
        res.end("認証コードが見つかりません");
        reject(new Error("code パラメータが見つかりません"));
        server.close();
        return;
      }

      if (returnedState !== state) {
        res.writeHead(400);
        res.end("State mismatch");
        reject(new Error("state パラメータが一致しません"));
        server.close();
        return;
      }

      try {
        const body = new URLSearchParams({
          grant_type: "authorization_code",
          code,
          redirect_uri: redirectUri,
        });

        const tokenRes = await fetch(TICKTICK_TOKEN_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Authorization:
              "Basic " +
              Buffer.from(`${clientId}:${clientSecret}`).toString("base64"),
          },
          body: body.toString(),
        });

        if (!tokenRes.ok) {
          throw new Error(
            `トークン取得失敗: ${tokenRes.status} ${await tokenRes.text()}`
          );
        }

        const json = (await tokenRes.json()) as {
          access_token: string;
          refresh_token: string;
          expires_in: number;
        };

        const tokenData: TokenData = {
          access_token: json.access_token,
          refresh_token: json.refresh_token,
          expires_at: Date.now() + json.expires_in * 1000,
        };

        saveToken(tokenData);

        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(
          "<html><body><h1>✅ 認証成功！</h1><p>このウィンドウを閉じてください。</p></body></html>"
        );

        console.log("✅ 認証成功！ .token.json を保存しました。");
        server.close();
        resolve();
      } catch (err) {
        res.writeHead(500);
        res.end("エラーが発生しました");
        reject(err);
        server.close();
      }
    });

    server.listen(port, () => {
      console.log(`📡 ローカルサーバー起動中 http://localhost:${port}`);
    });

    server.on("error", reject);
  });
}
