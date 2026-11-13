# Obelle

Obelle is a web-based interview room with a human interviewer, candidate, and Abuchi, an AI interviewer. This repository is an early development scaffold: the video room, room chat, live transcript panel, interview context setup, AI worker, and interviewer-only recording path are in place. The client-rendered avatar is experimental and requires a compatible, browser-accessible GLB model.

## What's here so far

- **Web app** (`apps/web`): React and Vite lobby, role selection, interview domain and candidate context, company policy paste or text-file upload, LiveKit room, chat, transcript panel, interviewer recording controls, and Abuchi's local 3D avatar renderer.
- **API** (`apps/api`): Express health endpoint and LiveKit room token endpoint. Interviewer joins trigger dispatch of the `Abuchi` agent with the interview context.
- **Worker** (`apps/worker`): Python LiveKit agent. The current voice setup uses Groq for the LLM and OpenAI for speech-to-text and text-to-speech. Set both API keys in the worker environment.
- **Local infrastructure** (`infra/docker`): LiveKit SFU and Redis. Optional LiveKit Egress supports interviewer-only recording.
- **Shared contracts** (`packages/contracts`): TypeScript schemas and types shared by workspace apps.

The avatar is drawn separately in each browser using Abuchi's received audio; it is not a video track published back to the LiveKit room. Current local Docker infrastructure does not start Neo4j. Graph-backed features and production deployment still need configuration and implementation.

## Requirements

- Docker Desktop with Docker Compose
- Node.js 22 or later and Corepack
- Python 3.11 or later
- A Groq API key (Abuchi's LLM)
- An OpenAI API key (Abuchi's speech recognition and voice)

## First-time setup

From the repository root:

```sh
corepack pnpm install
cp apps/api/.env.example apps/api/.env
cp apps/worker/.env.example apps/worker/.env
```

Edit `apps/worker/.env` and set `OPENAI_API_KEY` and `GROQ_API_KEY`. The LiveKit values in both examples match `infra/docker/livekit.yaml` for local development. The examples contain development credentials only; never use them in a deployed environment.

Install the Python worker dependencies:

```sh
cd apps/worker
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -e ".[dev]"
cd ../..
```

## Start the app

Run each section in its own terminal from the repository root.

### 1. Start Docker services

```sh
docker compose -f infra/docker/docker-compose.dev.yml up -d
```

This starts Redis and LiveKit. Check them with:

```sh
docker compose -f infra/docker/docker-compose.dev.yml ps
```

### 2. Start the API

```sh
corepack pnpm --filter @obelle/api dev
```

The API listens at `http://localhost:4000`. Verify it at `http://localhost:4000/health`.

### 3. Start Abuchi's worker

```sh
cd apps/worker
source .venv/bin/activate
PYTHONPATH=src python -m obelle_worker.agent dev
```

Keep this terminal open. The worker must be running before an interviewer starts a room. An interviewer token request dispatches Abuchi; the candidate can then join using the same room ID.

### 4. Start the web UI

In another terminal, from the repository root:

```sh
corepack pnpm --filter @obelle/web dev
```

Open [http://localhost:5173](http://localhost:5173). Enter a name and room ID, choose interviewer or candidate, and join. Start as the interviewer first so the API dispatches Abuchi. The interviewer can provide company policy by pasting it or uploading a plain-text file.

## Optional: interviewer-only recording

Start the Egress service with the recording profile:

```sh
docker compose -f infra/docker/docker-compose.dev.yml --profile recording up -d
```

The interviewer can then use **Record me** in the room. The API requests an egress containing that interviewer's participant tracks; the recording output is written under `infra/docker/recordings/`. The candidate and Abuchi tracks are excluded. Local recording requires Egress to be running first.

## Useful commands

```sh
# Stop local infrastructure
docker compose -f infra/docker/docker-compose.dev.yml down

# Check TypeScript types
corepack pnpm --filter @obelle/web typecheck
corepack pnpm --filter @obelle/api typecheck

# Build the web app and API
corepack pnpm --filter @obelle/web build
corepack pnpm --filter @obelle/api build
```

## Configuration notes

- API settings are read from `apps/api/.env`; the template is `apps/api/.env.example`.
- Worker settings are read from `apps/worker/.env`; the template is `apps/worker/.env.example`.
- Set `VITE_API_URL` in the web environment only if the API is not at `http://localhost:4000`.
- Set `VITE_ABUCHI_AVATAR_MODEL_URL` to use a different GLB model. It must be reachable by the browser and compatible with TalkingHead's rig and facial blend-shape requirements.
- Docker LiveKit and the example credentials are for local development only. Use secure credentials, TLS, and appropriate storage and privacy controls before deploying or recording real interviews.
