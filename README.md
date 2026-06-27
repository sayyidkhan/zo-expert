# Zo Expert

Zo Expert is an AI consultation proxy for SME owners. It lets an owner turn
their business knowledge, voice, services, and escalation rules into a safe
customer-facing expert that can answer routine questions and route risky or
underspecified questions back to the owner.

Private Zo handle: https://zo-expert-sayyidkhan.zo.computer

Public submission URL: pending until the `zo-expert` Zo Hosting site is switched
to public. As of 2026-06-27, the private Zo handle redirects to Zo login, and
`https://zo-expert-sayyidkhan.zocomputer.io` returns 404.

## Hackathon Submission Links

| Field | Link |
| --- | --- |
| Code repository | https://github.com/sayyidkhan/zo-expert |
| Live website | https://zo-expert-sayyidkhan.zo.computer |
| Demo video | https://youtu.be/-3agQEJ7Jg8 |
| Pitch deck | https://docs.google.com/presentation/d/1p4Nb6a9IFjZT81-wD27nXmyMUbWeUl1e/edit?slide=id.p1#slide=id.p1 |
| Instagram post | https://www.instagram.com/p/DaFSaYHkwPC/?img_index=1 |

## Product Flow

1. Owner fills the template with business identity, tone, services, knowledge,
   FAQs, policies, and escalation rules.
2. Zo Expert builds an owner profile from that knowledge.
3. A user asks a customer-facing question in the Ask tab.
4. The app either answers safely from the supplied owner knowledge or escalates
   to the owner with a suggested action.
5. The Owner Brief tab summarizes answered questions, escalations, knowledge
   gaps, and suggested updates.

The user portal stays locked until the minimum owner template is complete.

## Stack

| Layer | Tech |
| --- | --- |
| Frontend | Vite, React, TypeScript |
| State/data | TanStack Query |
| Backend | Express |
| AI | OpenAI API |
| Optional enrichment | Exa API placeholder |
| Deployment | Zo Computer Hosting |

## Local Run

```bash
npm install
npm run dev
```

Local URLs:

```text
Intro:   http://127.0.0.1:5173/intro
Builder: http://127.0.0.1:5173
API:     http://localhost:8787
```

## Run On Phone Without Deploying

Put your Mac and phone on the same Wi-Fi network, then run:

```bash
npm run dev:lan
```

Vite will print a `Network` URL such as:

```text
http://192.168.x.x:5173/
```

Open that URL from your phone browser. If the page does not load, check macOS
Firewall or make sure both devices are on the same network/VPN state.

If your phone and Mac are on different networks, turn on Tailscale on both
devices and open the same Vite port through the Mac's Tailscale IP:

```text
http://<mac-tailscale-ip>:5173/intro
```

## Environment

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Required for live AI behavior:

```bash
OPENAI_API_KEY=
```

Optional:

```bash
EXA_API_KEY=
OPENAI_MODEL=gpt-4.1-mini
```

Local backend defaults:

```bash
API_PORT=8787
VITE_API_BASE_URL=http://localhost:8787
```

For production on Zo Computer, leave `VITE_API_BASE_URL` empty so the frontend
calls the same deployed origin as `/api/*`.

## Production Build

```bash
npm run build
npm run start
```

`npm run start` serves both:

```text
/        Built Vite frontend from dist/
/api/*   Express API routes
```

Zo Computer should inject `PORT`. The server falls back to `API_PORT`, then
`8787` for local runs.

## Zo Computer Deployment

Expected workspace layout:

```text
/home/workspace/hackathon/suphackathon2026/
|-- zo-relationship-mapper/
`-- zo-expert/
```

`zo-expert` app directory:

```text
/home/workspace/hackathon/suphackathon2026/zo-expert
```

Zo Hosting service command:

```bash
cd /home/workspace/hackathon/suphackathon2026/zo-expert
PORT=8000 bash scripts/zo-deploy.sh
```

The deploy script:

- pulls the latest `main` from GitHub
- checks that `.env` exists
- installs dependencies with `npm ci`
- clears `VITE_API_BASE_URL` for same-origin production calls
- builds the frontend
- starts the Express server

## Sync Deploy From Zo Terminal

Use this helper when the service is already created and you want to pull, build,
and restart from the Zo terminal:

```bash
cd /home/workspace/hackathon/suphackathon2026/zo-expert
bash scripts/zo-restart.sh
```

Logs are written to:

```text
logs/zo-deploy.log
```

To watch logs:

```bash
tail -f logs/zo-deploy.log
```

To only sync and build without starting:

```bash
ZO_SYNC_ONLY=1 bash scripts/zo-deploy.sh
```

## Health Check

Local:

```bash
curl http://localhost:8787/api/health
```

Production, after the Zo Hosting site is public:

```bash
curl https://<public-zo-expert-url>/api/health
```

Expected response shape:

```json
{
  "ok": true,
  "openaiConfigured": true,
  "exaConfigured": false
}
```

## Repository

GitHub: https://github.com/sayyidkhan/zo-expert

Set the GitHub homepage only after the public Zo Hosting URL is enabled:

```bash
gh repo edit sayyidkhan/zo-expert --homepage https://<public-zo-expert-url>
```
