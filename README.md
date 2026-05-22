# AddAI (ADHD Cognitive Focus Graph)

An ADHD/ADD-optimized context management system and cognitive buffer. It transforms rapid track switching from a context destroyer into an associative knowledge graph, eliminating task re-entry friction.

## The ADHD Problem & Cognitive Solution
- **The LIFO Stack Myth:** Linear stacks (First-In, Last-Out) do not match how ADHD brains jump tracks. Forcing a stack structure creates anxiety, cognitive debt, and task avoidance.
- **The Lane Graph:** Your focus is structured as a named-lane graph. Warp anywhere, anytime.
- **Explicit Snapshots:** No automated AI classifiers trying to guess when you change topics. Use a single explicit command: `/snap <lane-name>`.
- **Cognitive Landing Pads:** Re-entering a paused task is the highest-friction point of the ADHD workday. AddAI bypasses this by rendering a 2-phrase summary of exactly where you left off:
  - **Context:** what the task was (noun phrase, max 5 words)
  - **Blocker:** what is stuck or next (noun phrase, max 8 words)

## Core Files
- `nexus-memory.js`: The context graph CLI and local API.
- `index.html` / `mobile.html`: Mobile PWA layout optimized for high-contrast, thumb-friendly interactions.

## CLI Usage (`nexus-memory.js`)
```bash
# Save current context and warp to 'rivaldrop'
node nexus-memory.js snap rivaldrop "eval loop" "composite below trigger"

# List all named lanes and active landing pads
node nexus-memory.js list

# Warm-boot / resume a named lane (renders its landing pad ONLY)
node nexus-memory.js resume neighborhoodos
```

## Mobile PWA Integration
The `index.html` serves as a standalone client-side PWA. When loaded (e.g. over a Tailscale proxy link to your local action server):
- **Inbox tab:** Check off pending todos instantly.
- **Lanes tab:** Displays your active context lane and its landing pad.
- **Drop tab:** Stream photos, receipts, or PDFs directly to your computer's inbox folder.
