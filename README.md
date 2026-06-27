# Zo Expert

Localhost proof of concept for an AI consultation proxy for SME owners.

Zo Expert lets a small business owner define business knowledge, tone, policies,
and escalation rules. Customers, prospects, or staff can ask questions through a
simple consultation interface. The app answers safe questions in the owner's
style, escalates risky questions, and generates an owner brief.

## Stack

- Vite + React + TypeScript
- TanStack Query
- Express local backend
- OpenAI API when `OPENAI_API_KEY` is configured
- Seed fallback responses when API keys are missing

## Run

```bash
npm install
npm run dev
```

Frontend: http://127.0.0.1:5173

Backend: http://localhost:8787

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

## Environment

Copy `.env.example` to `.env` if needed.

```bash
OPENAI_API_KEY=
EXA_API_KEY=
API_PORT=8787
VITE_API_BASE_URL=http://localhost:8787
```

OpenAI is optional for the demo path. Without keys, the backend returns
deterministic seed/fallback consultation answers and escalations.
