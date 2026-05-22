#!/usr/bin/env node
/**
 * nexus-memory.js
 * ADHD Lane-Graph Context Manager
 *
 * Treats context switching as a GRAPH not a stack.
 * Simon can warp between any named lane at any time.
 * Each lane holds a ultra-short Landing Pad (2 phrases max).
 * Track switches automatically record a synaptic edge for
 * Sunday dreaming cross-module synthesis.
 *
 * CLI:
 *   node tools/nexus-memory.js snap <lane-name> [landing-pad]
 *   node tools/nexus-memory.js resume <lane-name>
 *   node tools/nexus-memory.js list
 *   node tools/nexus-memory.js edge <from> <to> [note]
 *   node tools/nexus-memory.js status
 *   node tools/nexus-memory.js export
 *
 * Programmatic:
 *   const nexus = require('./nexus-memory');
 *   await nexus.snap('neighborhoodos', 'walk-in packet', 'Resend delivery staged');
 *   await nexus.resume('rivaldrop');
 *   const lanes = await nexus.list();
 */

const fs   = require('fs');
const path = require('path');
const os   = require('os');

const WORKSPACE   = process.env.OPENCLAW_WORKSPACE || __dirname;
const GRAPH_FILE  = path.join(WORKSPACE, 'logs', 'lane-graph.json');
const LEDGER_FILE = path.join(WORKSPACE, 'logs', 'associative-ledger.jsonl');

// ---------------------------------------------------------------------------
// Atomic write (NTFS safe)
// ---------------------------------------------------------------------------
function atomicWrite(filePath, data) {
  const tmp = `${filePath}.tmp.${process.pid}.${Date.now()}`;
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
  try { fs.renameSync(tmp, filePath); }
  catch (e) { try { fs.unlinkSync(tmp); } catch {} throw e; }
}

// ---------------------------------------------------------------------------
// Graph I/O
// ---------------------------------------------------------------------------
function readGraph() {
  if (!fs.existsSync(GRAPH_FILE)) return { active_lane: null, lanes: {} };
  try {
    const raw = JSON.parse(fs.readFileSync(GRAPH_FILE, 'utf8'));
    if (!raw.lanes) raw.lanes = {};
    return raw;
  } catch { return { active_lane: null, lanes: {} }; }
}

function writeGraph(g) { atomicWrite(GRAPH_FILE, g); }

// ---------------------------------------------------------------------------
// Append a synaptic edge to the associative ledger
// ---------------------------------------------------------------------------
function appendEdge(from, to, note) {
  if (!from || !to || from === to) return;
  const entry = {
    ts: new Date().toISOString(),
    from,
    to,
    note: note || null
  };
  fs.mkdirSync(path.dirname(LEDGER_FILE), { recursive: true });
  fs.appendFileSync(LEDGER_FILE, JSON.stringify(entry) + '\n', 'utf8');
}

// ---------------------------------------------------------------------------
// Core API
// ---------------------------------------------------------------------------

/**
 * Snapshot the current lane, then open/create the target lane.
 *
 * @param {string} targetLane    - Lane name to warp to (slug, auto-slugified)
 * @param {string} [context]     - 2-3 word "what was I doing" summary
 * @param {string} [blocker]     - 1 phrase blocker / next question
 * @param {string[]} [files]     - Active file paths to attach to this lane
 * @returns {{ from, to, landing_pad }}
 */
function snap(targetLane, context, blocker, files = []) {
  const slug = slugify(targetLane);
  const g = readGraph();

  const from = g.active_lane;

  // Save the landing pad into the current lane before switching
  if (from && from !== slug && g.lanes[from]) {
    // landing pad is already set; we just update the files list if provided
    if (files.length) g.lanes[from].files = files;
    g.lanes[from].updatedAt = new Date().toISOString();
  }

  // Create target lane if it doesn't exist
  if (!g.lanes[slug]) {
    g.lanes[slug] = {
      name: targetLane,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      files: files,
      landing_pad: {
        context: context || null,
        blocker: blocker || null
      },
      edges: {}
    };
  } else {
    // Update landing pad if provided
    g.lanes[slug].updatedAt = new Date().toISOString();
    if (context) g.lanes[slug].landing_pad.context = context;
    if (blocker) g.lanes[slug].landing_pad.blocker = blocker;
    if (files.length) g.lanes[slug].files = files;
  }

  // Record the edge (from -> to) before switching
  if (from && from !== slug) {
    appendEdge(from, slug);
    // Store edge note in graph too (for Sunday dreaming)
    if (!g.lanes[slug].edges) g.lanes[slug].edges = {};
    g.lanes[slug].edges[from] = g.lanes[slug].edges[from] || `Switched from ${from} at ${new Date().toLocaleString()}`;
  }

  g.active_lane = slug;
  writeGraph(g);

  return {
    from,
    to: slug,
    landing_pad: g.lanes[slug].landing_pad
  };
}

/**
 * Warm-boot a named lane, returning its ultra-short Landing Pad.
 * Does NOT wipe current lane - just switches focus.
 *
 * @param {string} laneName
 * @returns {{ lane, landing_pad, files, age }}
 */
function resume(laneName) {
  const slug = slugify(laneName);
  const g = readGraph();

  if (!g.lanes[slug]) {
    return { error: `Lane "${slug}" not found. Use /snap ${laneName} to create it.` };
  }

  const from = g.active_lane;
  if (from && from !== slug) appendEdge(from, slug);

  g.active_lane = slug;
  writeGraph(g);

  const lane = g.lanes[slug];
  const age  = timeAgo(lane.updatedAt);

  return {
    lane: slug,
    name: lane.name,
    landing_pad: lane.landing_pad,
    files: lane.files || [],
    age
  };
}

/**
 * List all lanes with their landing pads.
 * @returns {Array}
 */
function list() {
  const g = readGraph();
  return Object.entries(g.lanes).map(([slug, lane]) => ({
    slug,
    name: lane.name,
    active: g.active_lane === slug,
    landing_pad: lane.landing_pad,
    age: timeAgo(lane.updatedAt),
    edge_count: Object.keys(lane.edges || {}).length
  })).sort((a, b) => (b.active ? 1 : 0) - (a.active ? 1 : 0));
}

/**
 * Manually record an associative edge between two lanes.
 */
function edge(from, to, note) {
  appendEdge(slugify(from), slugify(to), note);
  const g = readGraph();
  if (g.lanes[slugify(from)]) {
    g.lanes[slugify(from)].edges = g.lanes[slugify(from)].edges || {};
    g.lanes[slugify(from)].edges[slugify(to)] = note || `manual edge ${new Date().toISOString()}`;
    writeGraph(g);
  }
}

/**
 * Export the full graph as a compact summary (for dreaming / memory-map injection).
 */
function exportGraph() {
  const g = readGraph();
  const lanes = Object.entries(g.lanes).map(([slug, lane]) => ({
    slug,
    name: lane.name,
    landing_pad: lane.landing_pad,
    edges: lane.edges || {}
  }));
  return { active_lane: g.active_lane, lane_count: lanes.length, lanes };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function timeAgo(iso) {
  if (!iso) return 'never';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------
function runCLI() {
  const [,, cmd, ...args] = process.argv;

  if (!cmd || cmd === 'status' || cmd === 'list') {
    const lanes = list();
    const g     = readGraph();
    console.log(`\n🪱  NEXUS MEMORY — Lane Graph`);
    console.log(`Active Lane: ${g.active_lane || '(none)'}\n`);
    if (lanes.length === 0) {
      console.log('  No lanes yet. Use: node tools/nexus-memory.js snap <lane-name>');
    } else {
      lanes.forEach(l => {
        const marker = l.active ? '▶' : ' ';
        const ctxt   = l.landing_pad?.context || '—';
        const blk    = l.landing_pad?.blocker  || '—';
        console.log(`  ${marker} [${l.slug}]  (${l.age})  edges: ${l.edge_count}`);
        console.log(`      Context: ${ctxt}`);
        console.log(`      Blocker: ${blk}`);
      });
    }
    console.log();
    return;
  }

  if (cmd === 'snap') {
    const [lane, context, blocker, ...fileParts] = args;
    if (!lane) { console.error('Usage: nexus-memory snap <lane-name> [context] [blocker]'); process.exit(1); }
    const result = snap(lane, context, blocker);
    console.log(`\n✅  Snapped to lane: [${result.to}]`);
    if (result.from) console.log(`   ↩  Was in:       [${result.from}]`);
    if (result.landing_pad.context) console.log(`   📍 Context: ${result.landing_pad.context}`);
    if (result.landing_pad.blocker) console.log(`   🚧 Blocker: ${result.landing_pad.blocker}`);
    console.log();
    return;
  }

  if (cmd === 'resume') {
    const [lane] = args;
    if (!lane) { console.error('Usage: nexus-memory resume <lane-name>'); process.exit(1); }
    const result = resume(lane);
    if (result.error) { console.error(result.error); process.exit(1); }
    console.log(`\n🔁  Resumed lane: [${result.lane}]  (last active: ${result.age})`);
    if (result.landing_pad?.context) console.log(`   📍 ${result.landing_pad.context}`);
    if (result.landing_pad?.blocker) console.log(`   🚧 ${result.landing_pad.blocker}`);
    if (result.files?.length) {
      console.log(`   📁 Files:`);
      result.files.forEach(f => console.log(`      ${f}`));
    }
    console.log();
    return;
  }

  if (cmd === 'edge') {
    const [from, to, ...noteParts] = args;
    if (!from || !to) { console.error('Usage: nexus-memory edge <from> <to> [note]'); process.exit(1); }
    edge(from, to, noteParts.join(' ') || null);
    console.log(`✅  Edge recorded: [${from}] → [${to}]`);
    return;
  }

  if (cmd === 'export') {
    const data = exportGraph();
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  console.error(`Unknown command: ${cmd}`);
  console.error('Commands: snap | resume | list | edge | export | status');
  process.exit(1);
}

if (require.main === module) runCLI();

module.exports = { snap, resume, list, edge, exportGraph, slugify, GRAPH_FILE, LEDGER_FILE };
