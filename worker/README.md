# Miami Nights World High Scores

Cloudflare Worker + D1 backend for the permanent worldwide Miami Nights Top 20.

This intentionally reuses the existing `orbit_board` D1 database, but stores Miami Nights scores in its own `pinball_entries` table.

## Deploy

From this `worker` directory:

```bash
npm install
npm run db:init:remote
npm run deploy
```

The frontend is already pointed at:

```text
https://miami-nights-board-api.rich-gothic.workers.dev/api/board
```

## Routes

- `GET /api/board` — returns the worldwide Top 20.
- `POST /api/board` — accepts `initials`, `score`, and `build`, validates/clamps the payload, inserts a qualifying score, prunes the table back to 20, and returns the refreshed board.

The world board is cloud-only. Browser storage is used only to remember the player's last initials.
