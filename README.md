# Workflow System

## Architecture

This system uses a proper microservices architecture for background job processing:

### Components

1. **Next.js Frontend** - Web interface and API routes
2. **Workflow Worker** - Background job processor for workflow execution and cron scheduling
3. **Redis** - Queue storage and communication between services

### Architecture Diagram

```
┌─────────────────┐    ┌──────────────┐    ┌─────────────────┐
│   Next.js API   │    │    Redis     │    │  Worker Process │
│                 │    │              │    │                 │
│ • add(job)      │◄──►│ • Bull Queue  │◄──►│ • process(job)  │
│ • get stats     │    │ • Cron state  │    │ • cron.schedule │
│ • UI            │    │              │    │                 │
└─────────────────┘    └──────────────┘    └─────────────────┘
```

## Setup and Running

### Prerequisites

- Node.js 18+
- Redis server running on localhost:6379 (or set REDIS_URL env var)
- PostgreSQL database (configured in .env)

### Installation

```bash
npm install
```

### Running the System

**Terminal 1 - Worker Process:**
```bash
npm run worker
```

**Terminal 2 - Next.js App:**
```bash
npm run dev
```

### What Each Process Does

**Worker Process (`npm run worker`):**
- Processes workflow execution jobs from the queue
- Runs cron schedulers for active cron workflows
- Handles workflow execution logic
- Restores cron tasks on startup

**Next.js App (`npm run dev`):**
- Web interface for managing workflows
- API routes for CRUD operations
- Adds jobs to the queue (producer)
- Displays queue statistics

## Development Notes

- **Never run Bull queue processing in Next.js API routes** - they are serverless and don't maintain state
- **Cron schedulers must run in long-lived processes** - not in serverless functions
- **Use Redis for communication between processes** - not files or memory

## Troubleshooting

### Queue stats show 0

Make sure both processes are running:
```bash
# Terminal 1
npm run worker

# Terminal 2
npm run dev
```

### Cron workflows don't trigger

Cron schedulers run in the worker process. Check worker logs for cron activity.

### Redis connection issues

Make sure Redis is running:
```bash
redis-server
```

Or set `REDIS_URL` environment variable.