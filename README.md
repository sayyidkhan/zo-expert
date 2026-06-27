# Zo Expert

Localhost proof of concept for an AI consultation proxy for SME owners.

Zo Expert starts as a blank owner-expert template. The app has two main parts:

- **Admin workspace:** the business owner defines business context, tone,
  services, FAQs, policies, and escalation rules.
- **User portal:** customers, prospects, or staff ask questions through a simple
  portal once the admin setup is complete.

The app answers safe questions in the owner's style, escalates risky questions,
and generates an owner brief. A renovation SME sample can be loaded explicitly
for demo purposes, but the default state is an empty reusable template.

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
