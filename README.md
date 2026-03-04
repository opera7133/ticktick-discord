# ticktick-discord

A tool that automatically sends TickTick task notifications to Discord at specified times every day.  
Notifies overdue, today's, and tomorrow's tasks in Discord Embed format.

## Requirements

- [Bun](https://bun.sh)
- TickTick Developer account (`client_id` / `client_secret`)
- Discord Webhook URL

## Setup

### 1. Install dependencies

```bash
bun install
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` and fill in your credentials:

```env
TICKTICK_CLIENT_ID=your_client_id
TICKTICK_CLIENT_SECRET=your_client_secret
TICKTICK_REDIRECT_URI=http://localhost:3000/callback
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
TICKTICK_PROJECT_ID=   # set after step 4
```

### 3. Authenticate with OAuth2

```bash
bun run auth
```

Open the URL displayed in the console in your browser and authorize the app.  
A `.token.json` file will be created upon success (**do not commit this file**).

### 4. Find your Project ID

```bash
bun run list-projects
```

A list of your TickTick projects will be printed. Copy the ID of the project you want to monitor and set it as `TICKTICK_PROJECT_ID` in `.env`.

> [!NOTE]
> **To use your Inbox**, the inbox project is not returned by `list-projects`.  
> To find its ID, open TickTick in your browser, open DevTools (F12) → **Network** tab, and look for any task-related requests. Find the `projectId` field — the Inbox ID starts with `inbox`.

### 5. Test notifications

```bash
bun run notify
```

Sends a notification to Discord immediately for testing.

---

## Running

```bash
bun run start
```

Starts the scheduler, which sends notifications automatically at **07:00 and 21:00 (JST)** every day.  
For production use, consider running with a process manager such as `pm2`.

## Commands

| Command | Description |
|---|---|
| `bun run auth` | Run the OAuth2 flow and generate `.token.json` |
| `bun run list-projects` | List all TickTick projects |
| `bun run notify` | Send a notification immediately (for testing) |
| `bun run start` | Start the scheduler |

## Documentation

- [日本語 README](README.ja.md)
