# Zo Expert

Localhost proof of concept for an AI consultation proxy for SME owners.

Zo Expert starts as a blank owner-expert template. The flow is intentionally simple:

- **Intro page:** `/intro` explains the concept and the expected user journey.
- **Builder:** `/` captures the owner's knowledge, tests the user-facing expert,
  and shows the owner brief in one screen.

The app answers safe questions in the owner's style, escalates risky questions,
and generates an owner brief. A renovation SME sample can be loaded explicitly
for demo purposes, but the default state is an empty reusable template.

## Flow

1. Fill the owner template with business identity, owner tone, knowledge, and
   escalation rules.
2. Ask a test question from the user portal panel.
3. Review answered questions, escalations, knowledge gaps, and suggested updates.

The user portal stays locked until the minimum owner template is complete.

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

Intro: http://127.0.0.1:5173/intro

Builder: http://127.0.0.1:5173

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

If your phone and Mac are on different networks, turn on Tailscale on both
devices and open the same Vite port through the Mac's Tailscale IP:

```text
http://<mac-tailscale-ip>:5173/intro
```

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
