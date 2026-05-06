<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>The Library — Workflow Console</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/dist/tabler-icons.min.css">
<style>
  :root {
    --bg-canvas: #0d0f14;
    --bg-surface: #161922;
    --bg-surface-2: #1c2030;
    --bg-elevated: #232838;
    --border: rgba(255,255,255,0.08);
    --border-strong: rgba(255,255,255,0.18);
    --text-primary: #e8eaf0;
    --text-secondary: #9aa0b4;
    --text-tertiary: #5d6478;
    --accent: #6b8aff;
    --accent-bg: rgba(107,138,255,0.12);
    --success: #4ade80;
    --success-bg: rgba(74,222,128,0.12);
    --warning: #fbbf24;
    --warning-bg: rgba(251,191,36,0.12);
    --danger: #f87171;
    --danger-bg: rgba(248,113,113,0.12);
 
    --c-workflow: #c084fc;
    --c-sizing: #6b8aff;
    --c-risk: #fbbf24;
    --c-compliance: #f87171;
    --c-data: #4ade80;
    --c-validation: #fb923c;
    --c-market: #22d3ee;
    --c-execution: #f472b6;
 
    --dimmed-opacity: 0.18;
  }
 
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { height: 100%; overflow: hidden; }
 
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif;
    background: var(--bg-canvas);
    color: var(--text-primary);
    font-size: 13px;
    line-height: 1.5;
  }
 
  .app { display: flex; flex-direction: column; height: 100vh; }
 
  /* TOP STATUS BAR */
  .status-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 20px;
    background: var(--bg-surface);
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
    z-index: 10;
  }
 
  .status-left { display: flex; align-items: center; gap: 24px; font-size: 12px; color: var(--text-secondary); }
 
  .status-brand {
    font-size: 13px;
    font-weight: 500;
    color: var(--text-primary);
    letter-spacing: 0.3px;
    display: flex;
    align-items: center;
    gap: 8px;
  }
 
  .status-brand .ti { font-size: 16px; color: var(--accent); }
 
  .status-item { display: flex; align-items: center; gap: 6px; }
  .status-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--success); }
  .status-value { color: var(--text-primary); font-weight: 500; }
  .status-value.warn { color: var(--warning); }
  .status-right { font-size: 12px; color: var(--text-tertiary); font-variant-numeric: tabular-nums; }
 
  /* MAIN GRID */
  .main {
    display: grid;
    grid-template-columns: 320px 1fr 360px;
    gap: 1px;
    background: var(--border);
    flex: 1;
    overflow: hidden;
    transition: grid-template-columns 0.3s ease;
  }
 
  .main.graph-mode { grid-template-columns: 0 1fr 0; }
  .main.graph-mode .pane.left, .main.graph-mode .pane.right { display: none; }
 
  .pane { background: var(--bg-canvas); overflow-y: auto; overflow-x: hidden; }
 
  .pane-section { padding: 14px 16px; border-bottom: 1px solid var(--border); }
  .pane-section:last-child { border-bottom: none; }
 
  .pane-label {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.8px;
    color: var(--text-tertiary);
    font-weight: 500;
    margin-bottom: 12px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
 
  .badge {
    background: var(--warning-bg);
    color: var(--warning);
    padding: 2px 8px;
    border-radius: 10px;
    font-size: 10px;
    font-weight: 500;
    letter-spacing: 0;
    text-transform: none;
  }
 
  /* WORKFLOW CARDS */
  .wf-card {
    background: var(--bg-surface);
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 10px 12px;
    margin-bottom: 8px;
    cursor: pointer;
    transition: all 0.15s;
  }
 
  .wf-card:hover { border-color: var(--border-strong); }
 
  .wf-card.active {
    background: var(--accent-bg);
    border-color: var(--accent);
  }
 
  .wf-card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
  .wf-card-title { font-size: 12px; font-weight: 500; }
  .wf-card-desk { font-size: 10px; color: var(--text-tertiary); font-family: ui-monospace, monospace; }
  .wf-card-sub { font-size: 11px; color: var(--text-secondary); margin-bottom: 8px; }
  .wf-progress { display: flex; gap: 3px; margin-bottom: 6px; }
  .wf-pip { flex: 1; height: 3px; background: var(--border); border-radius: 2px; }
  .wf-pip.done { background: var(--text-secondary); }
  .wf-card.active .wf-pip.done { background: var(--accent); }
  .wf-pip.active { background: var(--accent); animation: pulse 1.4s infinite; }
  .wf-card-meta { font-size: 10px; color: var(--text-tertiary); font-variant-numeric: tabular-nums; }
  .wf-card.active .wf-card-meta { color: var(--accent); }
 
  /* DECISION QUEUE */
  .queue-item {
    border-left: 2px solid var(--warning);
    background: var(--warning-bg);
    padding: 8px 10px;
    border-radius: 0 6px 6px 0;
    margin-bottom: 8px;
    cursor: pointer;
  }
  .queue-item.danger { border-left-color: var(--danger); background: var(--danger-bg); }
  .queue-item-title { font-size: 12px; font-weight: 500; color: var(--warning); margin-bottom: 2px; }
  .queue-item.danger .queue-item-title { color: var(--danger); }
  .queue-item-sub { font-size: 11px; color: var(--text-secondary); margin-bottom: 4px; }
  .queue-item-quote { font-size: 11px; color: var(--text-secondary); font-style: italic; line-height: 1.45; }
 
  /* CENTER PANE */
  .center-pane {
    background: var(--bg-canvas);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    position: relative;
  }
 
  .center-header {
    padding: 14px 20px;
    border-bottom: 1px solid var(--border);
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-shrink: 0;
    z-index: 5;
    background: var(--bg-canvas);
  }
 
  .center-header-left { display: flex; flex-direction: column; gap: 2px; }
  .center-title { font-size: 14px; font-weight: 500; }
  .center-title-sub { font-size: 11px; color: var(--text-tertiary); font-variant-numeric: tabular-nums; }
 
  .center-controls { display: flex; align-items: center; gap: 16px; }
 
  .view-toggle {
    display: flex;
    background: var(--bg-surface);
    border: 1px solid var(--border);
    border-radius: 6px;
    overflow: hidden;
    height: 28px;
  }
 
  .view-toggle button {
    background: transparent;
    color: var(--text-secondary);
    border: none;
    padding: 0 12px;
    font-size: 11px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 6px;
    font-family: inherit;
    font-weight: 500;
    transition: all 0.12s;
  }
 
  .view-toggle button:hover { color: var(--text-primary); }
  .view-toggle button.active { background: var(--accent-bg); color: var(--accent); }
  .view-toggle button .ti { font-size: 13px; }
  .view-toggle button:not(:last-child) { border-right: 1px solid var(--border); }
 
  .header-meta { display: flex; align-items: center; gap: 12px; font-size: 11px; color: var(--text-tertiary); }
  .live-indicator { display: flex; align-items: center; gap: 6px; color: var(--success); }
  .live-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--success); animation: pulse 1.4s infinite; }
 
  /* VIEW CONTAINER */
  .view-container {
    flex: 1;
    position: relative;
    overflow: hidden;
  }
 
  .view {
    position: absolute;
    inset: 0;
  }
 
  .view.hidden {
    visibility: hidden;
    pointer-events: none;
  }
 
  /* TRAIL VIEW — vertical timeline */
  .trail-view {
    overflow-y: auto;
    padding: 24px 32px 80px;
  }
 
  .trail {
    position: relative;
    padding-left: 28px;
    max-width: 720px;
  }
 
  .trail::before {
    content: '';
    position: absolute;
    left: 7px;
    top: 8px;
    bottom: 8px;
    width: 1px;
    background: var(--border-strong);
  }
 
  .step {
    position: relative;
    margin-bottom: 18px;
    cursor: pointer;
  }
 
  .step-marker {
    position: absolute;
    left: -28px;
    top: 4px;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: var(--bg-canvas);
    border: 2px solid var(--success);
    z-index: 1;
  }
 
  .step.active .step-marker {
    border-color: var(--accent);
    background: var(--accent);
    animation: pulse-marker 1.6s infinite;
  }
 
  .step.queued .step-marker {
    border-color: var(--text-tertiary);
    border-style: dashed;
  }
 
  .step.mandatory .step-marker {
    box-shadow: 0 0 0 3px rgba(251,191,36,0.18);
  }
 
  .step-card {
    background: var(--bg-surface);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 12px 14px;
    transition: all 0.15s;
  }
 
  .step:hover .step-card { border-color: var(--border-strong); }
 
  .step.active .step-card {
    border-color: var(--accent);
    background: var(--accent-bg);
  }
 
  .step.queued .step-card {
    background: transparent;
    border-style: dashed;
    opacity: 0.55;
  }
 
  .step.mandatory .step-card {
    border-left: 2px solid var(--warning);
  }
 
  .step-header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin-bottom: 4px;
  }
 
  .step-title {
    font-size: 13px;
    font-weight: 500;
    display: flex;
    align-items: center;
    gap: 8px;
  }
 
  .step.active .step-title { color: var(--accent); }
  .step.queued .step-title { color: var(--text-tertiary); }
 
  .step-tag {
    font-size: 9px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    padding: 1px 6px;
    border-radius: 8px;
    font-weight: 500;
    font-family: ui-monospace, monospace;
  }
 
  .step-tag.mandatory-tag { background: var(--warning-bg); color: var(--warning); }
  .step-tag.subagent-tag { background: var(--accent-bg); color: var(--accent); }
  .step-tag.parallel-tag { background: rgba(192,132,252,0.12); color: var(--c-workflow); }
 
  .step-runtime {
    font-size: 11px;
    color: var(--text-tertiary);
    font-variant-numeric: tabular-nums;
  }
 
  .step.active .step-runtime { color: var(--accent); }
 
  .step-prose {
    font-size: 12px;
    color: var(--text-secondary);
    line-height: 1.55;
  }
 
  .step.active .step-prose { color: var(--text-primary); opacity: 0.9; }
  .step.queued .step-prose { color: var(--text-tertiary); }
 
  /* Sub-step indicator (for nested subagents like vol-regime inside sizing) */
  .step-substep {
    margin-top: 8px;
    padding-top: 8px;
    border-top: 1px solid var(--border);
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 11px;
    color: var(--text-tertiary);
  }
 
  .step-substep .ti { font-size: 13px; color: var(--accent); }
 
  /* GRAPH VIEW */
  .graph-view { background: var(--bg-canvas); }
  #graph-svg { position: absolute; inset: 0; width: 100%; height: 100%; cursor: grab; display: block; }
  #graph-svg:active { cursor: grabbing; }
 
  .gnode { cursor: pointer; transition: opacity 0.3s; }
  .gnode circle { stroke-width: 1.5; transition: all 0.2s; }
  .gnode-label {
    fill: var(--text-secondary);
    font-size: 9px;
    pointer-events: none;
    text-anchor: middle;
    font-family: -apple-system, BlinkMacSystemFont, sans-serif;
    transition: all 0.2s;
  }
  .gnode.visited circle { stroke-width: 2; filter: brightness(1.3); }
  .gnode.visited .gnode-label { fill: var(--text-primary); font-size: 10px; font-weight: 500; }
  .gnode.gactive circle { stroke-width: 2.5; }
  .gnode.gactive .gnode-label { fill: var(--text-primary); font-size: 11px; font-weight: 500; }
  .gnode.gactive .pulse-ring { animation: pulse-ring 1.6s ease-out infinite; }
  .traversal-active .gnode:not(.visited):not(.gactive) { opacity: var(--dimmed-opacity); }
  .traversal-active .gnode:not(.visited):not(.gactive) .gnode-label { opacity: 0.6; }
  .gnode:hover circle { stroke-width: 2; }
  .gnode:hover .gnode-label { fill: var(--text-primary); font-size: 11px; }
 
  .glink { stroke: rgba(255,255,255,0.08); stroke-width: 0.8; fill: none; transition: all 0.3s; }
  .glink.mandatory-link { stroke: rgba(251,191,36,0.18); stroke-dasharray: 3 2; }
  .glink.traversed { stroke: var(--accent); stroke-width: 2; stroke-opacity: 0.85; }
  .glink.traversed.mandatory-link { stroke: var(--warning); stroke-dasharray: 4 2; }
  .glink.glink-active {
    stroke: var(--accent);
    stroke-width: 2.4;
    stroke-dasharray: 5 3;
    animation: dash-flow 1s linear infinite;
  }
  .traversal-active .glink:not(.traversed):not(.glink-active) { opacity: var(--dimmed-opacity); }
 
  .graph-legend {
    position: absolute;
    top: 16px;
    left: 16px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    z-index: 5;
  }
 
  .legend-card {
    background: rgba(22,25,34,0.92);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 10px 12px;
    backdrop-filter: blur(8px);
    min-width: 200px;
  }
 
  .legend-label {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.6px;
    color: var(--text-tertiary);
    margin-bottom: 8px;
    font-weight: 500;
  }
 
  .legend-row {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 4px;
    font-size: 11px;
    color: var(--text-secondary);
  }
 
  .legend-row:last-child { margin-bottom: 0; }
  .legend-dot { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; }
  .legend-line { width: 18px; height: 1px; flex-shrink: 0; }
  .legend-line.dashed {
    background-image: linear-gradient(to right, currentColor 50%, transparent 50%);
    background-size: 4px 1px;
  }
 
  /* DETAIL DRAWER */
  .detail-drawer {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    background: var(--bg-surface);
    border-top: 1px solid var(--border-strong);
    padding: 14px 20px 16px;
    transform: translateY(100%);
    transition: transform 0.2s ease-out;
    max-height: 50%;
    overflow-y: auto;
    z-index: 8;
  }
 
  .detail-drawer.open { transform: translateY(0); }
 
  .detail-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; }
  .detail-title { font-size: 14px; font-weight: 500; }
  .detail-meta { font-size: 11px; color: var(--text-tertiary); margin-top: 2px; }
  .detail-close {
    background: none;
    border: none;
    color: var(--text-tertiary);
    cursor: pointer;
    font-size: 18px;
    padding: 0 4px;
  }
  .detail-close:hover { color: var(--text-primary); }
 
  .detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  .detail-section { font-size: 12px; }
  .detail-section-title {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.6px;
    color: var(--text-tertiary);
    margin-bottom: 6px;
    font-weight: 500;
  }
  .detail-kv {
    display: flex;
    justify-content: space-between;
    padding: 4px 0;
    font-size: 12px;
    border-bottom: 1px solid var(--border);
    gap: 12px;
  }
  .detail-kv:last-child { border-bottom: none; }
  .detail-kv-key { color: var(--text-secondary); flex-shrink: 0; }
  .detail-kv-value { color: var(--text-primary); font-variant-numeric: tabular-nums; text-align: right; }
  .detail-prose { color: var(--text-secondary); font-size: 12px; line-height: 1.6; }
  .detail-code {
    background: var(--bg-canvas);
    border: 1px solid var(--border);
    border-radius: 4px;
    padding: 8px 10px;
    font-family: ui-monospace, monospace;
    font-size: 11px;
    line-height: 1.5;
    color: var(--text-secondary);
    margin-top: 4px;
    overflow-x: auto;
  }
 
  /* HOVER POPOVER (graph view) */
  .gpopover {
    position: absolute;
    background: rgba(22,25,34,0.98);
    border: 1px solid var(--border-strong);
    border-radius: 8px;
    padding: 12px 14px;
    min-width: 240px;
    max-width: 320px;
    backdrop-filter: blur(8px);
    pointer-events: none;
    z-index: 6;
    opacity: 0;
    transition: opacity 0.15s;
  }
  .gpopover.visible { opacity: 1; }
  .gpopover-header { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 6px; }
  .gpopover-title { font-size: 13px; font-weight: 500; }
  .gpopover-tag {
    font-size: 9px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--text-tertiary);
    font-family: ui-monospace, monospace;
  }
  .gpopover-prose { font-size: 11px; color: var(--text-secondary); line-height: 1.5; margin-bottom: 8px; }
  .gpopover-meta {
    font-size: 10px;
    color: var(--text-tertiary);
    border-top: 1px solid var(--border);
    padding-top: 6px;
    display: flex;
    justify-content: space-between;
  }
  .gpopover-runtime { color: var(--accent); font-weight: 500; }
 
  /* RIGHT PANE */
  .insight-card { background: var(--bg-surface); border-radius: 6px; padding: 10px 12px; margin-bottom: 8px; }
  .insight-title { font-size: 12px; font-weight: 500; margin-bottom: 4px; display: flex; align-items: center; gap: 6px; }
  .insight-title .ti { font-size: 13px; color: var(--accent); }
  .insight-body { font-size: 11px; color: var(--text-secondary); line-height: 1.5; }
  .insight-trend { font-size: 10px; color: var(--warning); margin-top: 4px; font-family: ui-monospace, monospace; }
 
  .ticket {
    background: var(--bg-canvas);
    border: 1px solid var(--border-strong);
    border-radius: 4px;
    padding: 10px 12px;
    font-family: ui-monospace, monospace;
    font-size: 11px;
  }
  .ticket-header {
    font-family: -apple-system, sans-serif;
    display: flex;
    justify-content: space-between;
    margin-bottom: 8px;
    padding-bottom: 8px;
    border-bottom: 1px solid var(--border);
  }
  .ticket-title { font-weight: 500; font-size: 12px; }
  .ticket-status { color: var(--text-tertiary); font-size: 10px; }
  .ticket-row { display: flex; padding: 2px 0; }
  .ticket-key { color: var(--text-tertiary); width: 50px; }
  .ticket-value { color: var(--text-primary); }
 
  .validation-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 6px 0;
    font-size: 12px;
  }
  .validation-row .ti { font-size: 14px; }
  .validation-row.pass .ti { color: var(--success); }
  .validation-row.queued .ti { color: var(--text-tertiary); }
  .validation-row.queued { color: var(--text-tertiary); }
  .validation-model { color: var(--text-tertiary); font-size: 10px; font-family: ui-monospace, monospace; }
 
  /* ANIMATIONS */
  @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.45; } }
  @keyframes pulse-marker {
    0%, 100% { box-shadow: 0 0 0 0 rgba(107,138,255,0.5); }
    50% { box-shadow: 0 0 0 6px rgba(107,138,255,0); }
  }
  @keyframes dash-flow { to { stroke-dashoffset: -12; } }
  @keyframes pulse-ring {
    0% { r: 11; stroke-opacity: 0.7; }
    100% { r: 28; stroke-opacity: 0; }
  }
 
  ::-webkit-scrollbar { width: 8px; height: 8px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 4px; }
  ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.15); }
</style>
</head>
<body>
 
<div class="app">
 
  <div class="status-bar">
    <div class="status-left">
      <div class="status-brand"><i class="ti ti-binary-tree-2"></i>The Library</div>
      <div class="status-item"><span class="status-dot"></span>Harness healthy</div>
      <div class="status-item">Active workflows: <span class="status-value">3</span></div>
      <div class="status-item">Decisions pending: <span class="status-value warn">2</span></div>
      <div class="status-item">Validation pass rate (24h): <span class="status-value">94.2%</span></div>
      <div class="status-item">Skills indexed: <span class="status-value">47</span></div>
      <div class="status-item">Memory pages: <span class="status-value">183</span></div>
    </div>
    <div class="status-right" id="clock">15:42:18 ET · 18m to close</div>
  </div>
 
  <div class="main" id="mainGrid">
 
    <div class="pane left">
      <div class="pane-section">
        <div class="pane-label">Active workflows</div>
        <div class="wf-card active">
          <div class="wf-card-header">
            <div class="wf-card-title">Trade gen · AAPL</div>
            <div class="wf-card-desk">desk-α</div>
          </div>
          <div class="wf-card-sub">Buy 100bps · Growth Fund</div>
          <div class="wf-progress">
            <div class="wf-pip done"></div><div class="wf-pip done"></div><div class="wf-pip done"></div>
            <div class="wf-pip active"></div><div class="wf-pip"></div>
          </div>
          <div class="wf-card-meta">Sizing → compliance · 5.6s</div>
        </div>
        <div class="wf-card">
          <div class="wf-card-header">
            <div class="wf-card-title">Rebalance · EM equity</div>
            <div class="wf-card-desk">desk-β</div>
          </div>
          <div class="wf-card-sub">Quarterly · 14 positions</div>
          <div class="wf-progress">
            <div class="wf-pip done"></div><div class="wf-pip done"></div>
            <div class="wf-pip"></div><div class="wf-pip"></div><div class="wf-pip"></div>
          </div>
          <div class="wf-card-meta">Concentration check · 22.4s</div>
        </div>
        <div class="wf-card">
          <div class="wf-card-header">
            <div class="wf-card-title">Risk report · LO book</div>
            <div class="wf-card-desk">desk-α</div>
          </div>
          <div class="wf-card-sub">EOD · scheduled</div>
          <div class="wf-progress">
            <div class="wf-pip done"></div>
            <div class="wf-pip"></div><div class="wf-pip"></div><div class="wf-pip"></div><div class="wf-pip"></div>
          </div>
          <div class="wf-card-meta">VaR decomp · 3.1s</div>
        </div>
      </div>
 
      <div class="pane-section">
        <div class="pane-label">Decision queue<span class="badge">2</span></div>
        <div class="queue-item">
          <div class="queue-item-title">Sizing override flagged</div>
          <div class="queue-item-sub">Rebalance · EM · KOSPI exposure</div>
          <div class="queue-item-quote">"Kelly output of 180bps exceeds desk soft cap of 150bps. Rationale unclear."</div>
        </div>
        <div class="queue-item danger">
          <div class="queue-item-title">Red-team escalation</div>
          <div class="queue-item-sub">Trade gen · NVDA · 250bps proposed</div>
          <div class="queue-item-quote">"Concentration in semis approaching 18% NAV; correlation to existing book elevated."</div>
        </div>
      </div>
    </div>
 
    <div class="center-pane">
      <div class="center-header">
        <div class="center-header-left">
          <div class="center-title">Trade generation · AAPL 100bps · Growth Fund</div>
          <div class="center-title-sub">run_a3f2c1 · started 15:41:54 · <span id="elapsed">5.6s</span> elapsed · <span id="tokens">18.4k</span> tokens · $0.27</div>
        </div>
        <div class="center-controls">
          <div class="view-toggle">
            <button id="trailBtn" class="active"><i class="ti ti-list-details"></i>Trail</button>
            <button id="graphBtn"><i class="ti ti-binary-tree-2"></i>Graph</button>
          </div>
          <div class="header-meta">
            <div class="live-indicator"><div class="live-dot"></div>live</div>
            <span>·</span>
            <span>Opus 4.7</span>
          </div>
        </div>
      </div>
 
      <div class="view-container">
 
        <!-- TRAIL VIEW — vertical timeline -->
        <div class="view trail-view" id="trailView">
          <div class="trail">
 
            <div class="step" data-node="trade-generation">
              <div class="step-marker"></div>
              <div class="step-card">
                <div class="step-header">
                  <div class="step-title">trade-generation <span class="step-tag" style="background:rgba(192,132,252,0.12);color:var(--c-workflow)">workflow root</span></div>
                  <div class="step-runtime">0.0s</div>
                </div>
                <div class="step-prose">Workflow entered. Reading PM trade intent. Will orchestrate intent parsing, portfolio gathering, sizing, mandatory red-team, compliance, and order formatting.</div>
              </div>
            </div>
 
            <div class="step" data-node="intent-parsing">
              <div class="step-marker"></div>
              <div class="step-card">
                <div class="step-header">
                  <div class="step-title">intent-parsing</div>
                  <div class="step-runtime">0.4s · inline</div>
                </div>
                <div class="step-prose">Parsed: instrument=AAPL, side=buy, size=100bps, fund=Growth-A. Resolved fund alias "growth fund" to canonical Growth-A.</div>
              </div>
            </div>
 
            <div class="step" data-node="portfolio-state">
              <div class="step-marker"></div>
              <div class="step-card">
                <div class="step-header">
                  <div class="step-title">portfolio-state <span class="step-tag parallel-tag">∥ parallel</span></div>
                  <div class="step-runtime">0.6s · subagent</div>
                </div>
                <div class="step-prose">Fetched Growth-A holdings: 14 positions, $2.4B AUM. Current AAPL exposure: 0bps. Top sectors: tech 22%, financials 18%.</div>
              </div>
            </div>
 
            <div class="step" data-node="mandate-check">
              <div class="step-marker"></div>
              <div class="step-card">
                <div class="step-header">
                  <div class="step-title">mandate-check <span class="step-tag parallel-tag">∥ parallel</span></div>
                  <div class="step-runtime">0.9s · subagent</div>
                </div>
                <div class="step-prose">AAPL is permissible under Growth-A IMA. Long-only mandate, tech sector permitted, market cap threshold met. No restrictions.</div>
              </div>
            </div>
 
            <div class="step" data-node="position-sizing">
              <div class="step-marker"></div>
              <div class="step-card">
                <div class="step-header">
                  <div class="step-title">position-sizing <span class="step-tag subagent-tag">subagent</span></div>
                  <div class="step-runtime">2.1s</div>
                </div>
                <div class="step-prose">Kelly fraction at 112bps. Vol regime returned low-vol via nested subagent — no cap reduction applied. Correlation to top-3 holdings is 0.41, below 0.6 threshold so no concentration adjustment. PM intent of 100bps falls within Kelly bounds. Recommended: 100bps with binding constraint = PM intent.</div>
                <div class="step-substep">
                  <i class="ti ti-corner-down-right"></i>
                  <span>nested · vol-regime returned in 0.7s · low-vol detected</span>
                </div>
              </div>
            </div>
 
            <div class="step mandatory" data-node="_validation/sizing-coherence">
              <div class="step-marker"></div>
              <div class="step-card">
                <div class="step-header">
                  <div class="step-title">_validation/sizing-coherence <span class="step-tag mandatory-tag">⚑ mandatory · GPT-5</span></div>
                  <div class="step-runtime">0.6s · pass</div>
                </div>
                <div class="step-prose">Cross-checked sizing artifact against skill prose. Kelly logic applied correctly. Vol regime correctly interpreted. Binding constraint correctly identified as PM intent. Coherence score: 0.96. No flags.</div>
              </div>
            </div>
 
            <div class="step mandatory" data-node="red-team">
              <div class="step-marker"></div>
              <div class="step-card">
                <div class="step-header">
                  <div class="step-title">red-team <span class="step-tag mandatory-tag">⚑ mandatory · GPT-5</span></div>
                  <div class="step-runtime">1.4s · pass</div>
                </div>
                <div class="step-prose">Adversarial review of sizing decision. Considered PM behavioral patterns (no override pattern on AAPL specifically), regime alignment (low-vol matches conservative sizing), mandate alignment, concentration risk (sector at 22%, not approaching limits). No concerns raised.</div>
              </div>
            </div>
 
            <div class="step active mandatory" data-node="compliance-check">
              <div class="step-marker"></div>
              <div class="step-card">
                <div class="step-header">
                  <div class="step-title">compliance-check <span class="step-tag mandatory-tag">⚑ mandatory · running</span></div>
                  <div class="step-runtime">0.8s elapsed</div>
                </div>
                <div class="step-prose">Currently running. Checking restricted list, conflicts of interest, pre-trade thresholds, regulatory disclosures.</div>
              </div>
            </div>
 
            <div class="step queued" data-node="order-format">
              <div class="step-marker"></div>
              <div class="step-card">
                <div class="step-header">
                  <div class="step-title">order-format</div>
                  <div class="step-runtime">queued</div>
                </div>
                <div class="step-prose">Will format the validated order for OMS submission once compliance passes.</div>
              </div>
            </div>
 
          </div>
        </div>
 
        <!-- GRAPH VIEW -->
        <div class="view graph-view hidden" id="graphView">
          <svg id="graph-svg"></svg>
          <div class="graph-legend">
            <div class="legend-card">
              <div class="legend-label">Skill domains</div>
              <div class="legend-row"><div class="legend-dot" style="background:#c084fc"></div>Workflow entry</div>
              <div class="legend-row"><div class="legend-dot" style="background:#6b8aff"></div>Sizing &amp; allocation</div>
              <div class="legend-row"><div class="legend-dot" style="background:#fbbf24"></div>Risk</div>
              <div class="legend-row"><div class="legend-dot" style="background:#f87171"></div>Compliance</div>
              <div class="legend-row"><div class="legend-dot" style="background:#4ade80"></div>Portfolio &amp; data</div>
              <div class="legend-row"><div class="legend-dot" style="background:#fb923c"></div>Validation &amp; red-team</div>
              <div class="legend-row"><div class="legend-dot" style="background:#22d3ee"></div>Market &amp; regime</div>
              <div class="legend-row"><div class="legend-dot" style="background:#f472b6"></div>Execution &amp; format</div>
            </div>
            <div class="legend-card">
              <div class="legend-label">Edges</div>
              <div class="legend-row"><div class="legend-line" style="background:rgba(255,255,255,0.3)"></div>Wikilink</div>
              <div class="legend-row"><div class="legend-line dashed" style="color:rgba(251,191,36,0.5)"></div>Mandatory</div>
              <div class="legend-row"><div class="legend-line" style="background:#6b8aff"></div>Active traversal</div>
            </div>
          </div>
          <div class="gpopover" id="gpopover">
            <div class="gpopover-header">
              <div class="gpopover-title" id="gpop-title">node</div>
              <div class="gpopover-tag" id="gpop-tag">tag</div>
            </div>
            <div class="gpopover-prose" id="gpop-prose">prose</div>
            <div class="gpopover-meta">
              <span id="gpop-meta-left">domain</span>
              <span class="gpopover-runtime" id="gpop-meta-right"></span>
            </div>
          </div>
        </div>
 
      </div>
 
      <div class="detail-drawer" id="drawer">
        <div class="detail-header">
          <div>
            <div class="detail-title" id="drawer-title">node</div>
            <div class="detail-meta" id="drawer-meta">meta</div>
          </div>
          <button class="detail-close" onclick="closeDrawer()">✕</button>
        </div>
        <div class="detail-grid" id="drawer-body"></div>
      </div>
    </div>
 
    <div class="pane right">
      <div class="pane-section">
        <div class="pane-label">Memory insights</div>
        <div class="insight-card">
          <div class="insight-title"><i class="ti ti-trending-up"></i>AAPL-MSFT correlation drifting</div>
          <div class="insight-body">0.41 → 0.58 over 6 weeks. Tech sector beta consolidating.</div>
          <div class="insight-trend">+41% · 6w trend</div>
        </div>
        <div class="insight-card">
          <div class="insight-title"><i class="ti ti-user-circle"></i>Desk-α PM upward Kelly bias</div>
          <div class="insight-body">3 of last 5 sizing decisions exceeded Kelly. Pattern on momentum names.</div>
          <div class="insight-trend">3/5 · last 30d</div>
        </div>
        <div class="insight-card">
          <div class="insight-title"><i class="ti ti-chart-pie"></i>Semis concentration trend</div>
          <div class="insight-body">Approaching 18% NAV across LO book. Soft limit at 20%.</div>
          <div class="insight-trend">17.8% · soft limit 20%</div>
        </div>
      </div>
 
      <div class="pane-section">
        <div class="pane-label">Pending artifact</div>
        <div class="ticket">
          <div class="ticket-header">
            <div class="ticket-title">Order ticket · draft</div>
            <div class="ticket-status">awaiting compliance</div>
          </div>
          <div class="ticket-row"><span class="ticket-key">SYM</span><span class="ticket-value">AAPL</span></div>
          <div class="ticket-row"><span class="ticket-key">SIDE</span><span class="ticket-value">BUY</span></div>
          <div class="ticket-row"><span class="ticket-key">SIZE</span><span class="ticket-value">100 bps</span></div>
          <div class="ticket-row"><span class="ticket-key">FUND</span><span class="ticket-value">Growth-A</span></div>
          <div class="ticket-row"><span class="ticket-key">TIF</span><span class="ticket-value">DAY</span></div>
          <div class="ticket-row"><span class="ticket-key">ALGO</span><span class="ticket-value">VWAP-pct20</span></div>
          <div class="ticket-row"><span class="ticket-key">REF</span><span class="ticket-value">run_a3f2c1</span></div>
        </div>
      </div>
 
      <div class="pane-section">
        <div class="pane-label">Validation cascade</div>
        <div class="validation-row pass"><span><i class="ti ti-check"></i>&nbsp;Sizing coherence</span><span class="validation-model">GPT-5</span></div>
        <div class="validation-row pass"><span><i class="ti ti-check"></i>&nbsp;Red-team review</span><span class="validation-model">GPT-5</span></div>
        <div class="validation-row queued"><span><i class="ti ti-clock"></i>&nbsp;Compliance coherence</span><span class="validation-model">queued</span></div>
        <div class="validation-row queued"><span><i class="ti ti-clock"></i>&nbsp;Final output review</span><span class="validation-model">queued</span></div>
      </div>
    </div>
 
  </div>
</div>
 
<script src="https://cdnjs.cloudflare.com/ajax/libs/d3/7.8.5/d3.min.js"></script>
<script>
// ============================================================
// SHARED NODE DETAIL DATA
// ============================================================
const nodeDetails = {
  'trade-generation': {
    title: 'trade-generation', meta: 'workflow root · 5.6s elapsed', domain: 'workflow',
    desc: 'Generate orders from PM trade intents.',
    inputs: [['request', 'Buy 100bps AAPL'], ['fund', 'Growth-A'], ['desk', 'long-only-equity']],
    reasoning: 'Workflow entry. Reads PM trade intent and orchestrates the full pipeline. Invokes intent-parsing, gathers portfolio and mandate context in parallel, sizes the position, runs mandatory red-team and compliance, then formats the order.',
    skill: '## Trade Generation\nFirst parse via [[intent-parsing]]. Then check [[portfolio-state]] and [[mandate-check]] independently. Size via [[position-sizing]]. Compliance is non-negotiable.',
    artifact: '{ "workflow_status": "running", "current_node": "compliance-check", "depth": 1 }'
  },
  'intent-parsing': {
    title: 'intent-parsing', meta: 'inline walk · 0.4s', domain: 'data',
    desc: 'Normalize PM language to structured intent.',
    inputs: [['request', '"Buy 100bps AAPL for the growth fund"']],
    reasoning: 'Parsed natural-language intent into structured fields. Resolved fund alias "growth fund" to Growth-A. No ambiguity flags raised.',
    skill: '## Intent Parsing\nNormalize PM trade requests into {instrument, side, size, fund, urgency}.',
    artifact: '{ "instrument": "AAPL", "side": "buy", "size_bps": 100, "fund": "Growth-A" }'
  },
  'portfolio-state': {
    title: 'portfolio-state', meta: 'subagent · parallel · 0.6s', domain: 'data',
    desc: 'Current holdings, exposures, P&L.',
    inputs: [['fund', 'Growth-A']],
    reasoning: 'Fetched current Growth-A holdings via fetch_portfolio. 14 positions, $2.4B AUM. Current AAPL: 0bps. Top exposures: tech 22%, financials 18%.',
    skill: '## Portfolio State\nFetch current holdings, compute exposures and concentrations.',
    artifact: '{ "fund": "Growth-A", "aum": 2400000000, "current_aapl_bps": 0 }'
  },
  'mandate-check': {
    title: 'mandate-check', meta: 'subagent · parallel · 0.9s', domain: 'data',
    desc: 'IMA constraint validation.',
    inputs: [['fund', 'Growth-A'], ['instrument', 'AAPL']],
    reasoning: 'Verified AAPL is permissible under Growth-A IMA. Long-only mandate, tech sector permitted, market cap >$10B threshold met.',
    skill: '## Mandate Check\nValidate proposed instrument against IMA constraints.',
    artifact: '{ "permissible": true, "violations": [] }'
  },
  'position-sizing': {
    title: 'position-sizing', meta: 'subagent · 2.1s · Opus 4.7', domain: 'sizing',
    desc: 'Kelly-adjusted position sizing.',
    inputs: [['instrument', 'AAPL'], ['target_size', '100 bps'], ['portfolio_summary', '14 holdings · $2.4B AUM']],
    reasoning: 'Kelly fraction computed at 112bps. Vol regime returned low-vol via nested subagent; no cap reduction applied. Correlation to top-3 holdings is 0.41 — below 0.6 threshold so no concentration adjustment. PM intent of 100bps falls within Kelly bounds.',
    skill: '## Position Sizing\nStart with Kelly-optimal fraction. Adjust for [[vol-regime]]. Check [[correlation-check]] against book.',
    artifact: '{ "size_bps": 100, "binding_constraint": "pm_intent", "kelly_fraction": 112, "regime": "low-vol" }'
  },
  'vol-regime': {
    title: 'vol-regime', meta: 'subagent · depth 2 · 0.7s', domain: 'market',
    desc: 'Classify current vol regime via VIX.',
    inputs: [['lookback_days', '20'], ['vix_level', '14.2']],
    reasoning: 'VIX at 14.2 is in 32nd percentile of trailing 1Y. Realized vol on AAPL 18% annualized. Classification: low-vol regime.',
    skill: '## Vol Regime\nClassify regime via VIX percentile and realized vol on instrument.',
    artifact: '{ "regime": "low-vol", "vix_pctile": 32, "cap_applied_bps": null }'
  },
  'red-team': {
    title: 'red-team', meta: 'mandatory · GPT-5 · 1.4s', domain: 'validation',
    desc: 'Adversarial review of proposed actions.',
    inputs: [['proposed_action', 'Buy AAPL 100bps'], ['sizing_finding', '{size:100, binding:pm_intent}']],
    reasoning: 'Adversarial review of sizing decision. Considered PM patterns, regime alignment, mandate, concentration risk. No concerns raised.',
    skill: '## Red Team\nAdversarially review the proposed action against PM patterns, regime, mandate, concentration.',
    artifact: '{ "verdict": "pass", "concerns": [], "model": "gpt-5" }'
  },
  'compliance-check': {
    title: 'compliance-check', meta: 'mandatory · running · 0.8s elapsed', domain: 'compliance',
    desc: 'Restricted list, conflicts, regs.',
    inputs: [['order', '{sym:AAPL, size:100bps, fund:Growth-A}']],
    reasoning: 'Currently running. Checking restricted list, conflicts of interest, pre-trade thresholds, regulatory disclosures.',
    skill: '## Compliance Check\nVerify against restricted list, conflicts, regulatory thresholds. Non-negotiable.',
    artifact: '(in progress)'
  },
  'order-format': {
    title: 'order-format', meta: 'queued', domain: 'execution',
    desc: 'Format order for OMS submission.',
    inputs: [['(awaiting compliance)', '']],
    reasoning: 'Will format the validated order for OMS submission once compliance passes.',
    skill: '## Order Format\nFormat trade ticket per OMS schema with VWAP/TWAP routing.',
    artifact: '(pending)'
  },
  '_validation/sizing-coherence': {
    title: '_validation/sizing-coherence', meta: 'mandatory · GPT-5 · 0.6s · pass', domain: 'validation',
    desc: 'Sizing artifact validation.',
    inputs: [['skill_prose', 'position-sizing.md'], ['artifact', 'sizing finding']],
    reasoning: 'Cross-checked sizing artifact against skill prose guidance. Kelly logic applied correctly. Vol regime correctly interpreted.',
    skill: '## Validation: Sizing Coherence\nVerify the artifact is coherent with the skill\'s stated logic.',
    artifact: '{ "verdict": "pass", "coherence_score": 0.96, "flags": [] }'
  }
};
 
function getNodeDetail(id, domain, desc) {
  if (nodeDetails[id]) return nodeDetails[id];
  return {
    title: id, meta: `${domain} · not visited in this run`, domain,
    desc: desc || 'Skill in the graph but not invoked for this trade.',
    inputs: [['(not invoked)', '—']],
    reasoning: 'This skill was available via wikilink from one or more visited skills, but the model judged it not relevant for the current request.',
    skill: `## ${id}\n(skill content)`,
    artifact: '(not produced)'
  };
}
 
function openDrawer(id, domain, desc) {
  const d = getNodeDetail(id, domain, desc);
  document.getElementById('drawer-title').textContent = d.title;
  document.getElementById('drawer-meta').textContent = d.meta;
  document.getElementById('drawer-body').innerHTML = `
    <div class="detail-section">
      <div class="detail-section-title">Inputs received</div>
      ${d.inputs.map(([k,v]) => `<div class="detail-kv"><span class="detail-kv-key">${k}</span><span class="detail-kv-value">${v}</span></div>`).join('')}
    </div>
    <div class="detail-section">
      <div class="detail-section-title">Reasoning</div>
      <div class="detail-prose">${d.reasoning}</div>
    </div>
    <div class="detail-section">
      <div class="detail-section-title">Skill prose</div>
      <div class="detail-code">${d.skill.replace(/\n/g,'<br/>')}</div>
    </div>
    <div class="detail-section">
      <div class="detail-section-title">Output artifact</div>
      <div class="detail-code">${d.artifact.replace(/\n/g,'<br/>')}</div>
    </div>
  `;
  document.getElementById('drawer').classList.add('open');
}
 
function closeDrawer() {
  document.getElementById('drawer').classList.remove('open');
}
 
// Wire trail step clicks
document.querySelectorAll('.trail .step').forEach(step => {
  step.addEventListener('click', () => {
    const id = step.getAttribute('data-node');
    openDrawer(id);
  });
});
 
// ============================================================
// VIEW TOGGLE
// ============================================================
const trailBtn = document.getElementById('trailBtn');
const graphBtn = document.getElementById('graphBtn');
const trailView = document.getElementById('trailView');
const graphView = document.getElementById('graphView');
const mainGrid = document.getElementById('mainGrid');
let graphInitialized = false;
 
trailBtn.addEventListener('click', () => {
  trailBtn.classList.add('active');
  graphBtn.classList.remove('active');
  trailView.classList.remove('hidden');
  graphView.classList.add('hidden');
  mainGrid.classList.remove('graph-mode');
  closeDrawer();
});
 
graphBtn.addEventListener('click', () => {
  graphBtn.classList.add('active');
  trailBtn.classList.remove('active');
  trailView.classList.add('hidden');
  graphView.classList.remove('hidden');
  mainGrid.classList.add('graph-mode');
  closeDrawer();
 
  // Wait for layout to settle before measuring or initializing
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      if (!graphInitialized) {
        initGraph();
        graphInitialized = true;
      } else {
        resizeGraph();
      }
    });
  });
});
 
// ============================================================
// LIVE TIMERS
// ============================================================
let elapsed = 5.6;
setInterval(() => {
  elapsed += 0.1;
  const t = `${(18.4 + elapsed * 0.2).toFixed(1)}k`;
  document.getElementById('elapsed').textContent = `${elapsed.toFixed(1)}s`;
  document.getElementById('tokens').textContent = t;
}, 100);
 
function updateClock() {
  const close = new Date();
  close.setHours(16, 0, 0, 0);
  const now = new Date();
  const minsToClose = Math.max(0, Math.floor((close - now) / 60000));
  const time = now.toLocaleTimeString('en-US', {hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false});
  document.getElementById('clock').textContent = `${time} ET · ${minsToClose}m to close`;
}
updateClock();
setInterval(updateClock, 1000);
 
document.querySelectorAll('.wf-card').forEach(c => {
  c.addEventListener('click', () => {
    document.querySelectorAll('.wf-card').forEach(x => x.classList.remove('active'));
    c.classList.add('active');
  });
});
 
// ============================================================
// GRAPH VIEW
// ============================================================
let graphSim, graphSvg, graphG, graphZoom;
let graphSkills, graphLinks;
 
function resizeGraph() {
  if (!graphSvg) return;
  const container = document.getElementById('graphView');
  const W = container.clientWidth;
  const H = container.clientHeight;
  if (W === 0 || H === 0) return;
  graphSvg.attr('viewBox', `0 0 ${W} ${H}`);
  if (graphSim) {
    graphSim.force('center', d3.forceCenter(W/2, H/2).strength(0.02));
    graphSim.alpha(0.1).restart();
  }
}
 
function initGraph() {
  const skills = [
    { id: 'trade-generation', domain: 'workflow', desc: 'Generate orders from PM trade intents.' },
    { id: 'portfolio-rebalance', domain: 'workflow', desc: 'Rebalance portfolio to target weights.' },
    { id: 'risk-report', domain: 'workflow', desc: 'EOD risk analytics across the book.' },
    { id: 'intent-parsing', domain: 'data', desc: 'Normalize PM language to structured intent.' },
    { id: 'portfolio-state', domain: 'data', desc: 'Current holdings, exposures, P&L.' },
    { id: 'mandate-check', domain: 'data', desc: 'IMA constraint validation.' },
    { id: 'fund-lookup', domain: 'data', desc: 'Resolve fund aliases.' },
    { id: 'pm-history', domain: 'data', desc: 'Trader behavioral patterns from memory.' },
    { id: 'position-sizing', domain: 'sizing', desc: 'Kelly-adjusted position sizing.' },
    { id: 'kelly-fraction', domain: 'sizing', desc: 'Compute Kelly-optimal fraction.' },
    { id: 'correlation-check', domain: 'sizing', desc: 'Pairwise correlation against book.' },
    { id: 'concentration-check', domain: 'sizing', desc: 'Sector/geography concentration limits.' },
    { id: 'liquidity-check', domain: 'sizing', desc: 'ADV-based size cap.' },
    { id: 'sizing-override', domain: 'sizing', desc: 'PM override handling.' },
    { id: 'vol-regime', domain: 'market', desc: 'Classify current vol regime.' },
    { id: 'vix-percentile', domain: 'market', desc: 'Trailing VIX percentile.' },
    { id: 'realized-vol', domain: 'market', desc: 'Realized vol on instrument.' },
    { id: 'sector-rotation', domain: 'market', desc: 'Detect rotation signals.' },
    { id: 'macro-regime', domain: 'market', desc: 'Macro regime classification.' },
    { id: 'rates-curve', domain: 'market', desc: 'Yield curve state.' },
    { id: 'risk-limits', domain: 'risk', desc: 'Gross, net, single-name limits.' },
    { id: 'var-decomp', domain: 'risk', desc: 'VaR decomposition by factor.' },
    { id: 'stress-test', domain: 'risk', desc: 'Run scenario stress tests.' },
    { id: 'beta-exposure', domain: 'risk', desc: 'Net beta to benchmark.' },
    { id: 'fx-exposure', domain: 'risk', desc: 'Currency exposure netting.' },
    { id: 'currency-hedge', domain: 'risk', desc: 'FX hedging policy.' },
    { id: 'compliance-check', domain: 'compliance', desc: 'Restricted list, conflicts, regs.' },
    { id: 'restricted-list', domain: 'compliance', desc: 'Pre-trade restricted lookup.' },
    { id: 'conflict-check', domain: 'compliance', desc: 'IB/research conflict screening.' },
    { id: 'reg-thresholds', domain: 'compliance', desc: 'Regulatory threshold checks.' },
    { id: 'disclosure', domain: 'compliance', desc: 'Position disclosure requirements.' },
    { id: 'cross-trade', domain: 'compliance', desc: 'Cross-trade authorization.' },
    { id: 'red-team', domain: 'validation', desc: 'Adversarial review.' },
    { id: '_validation/sizing-coherence', domain: 'validation', desc: 'Sizing artifact validation.' },
    { id: '_validation/compliance-coherence', domain: 'validation', desc: 'Compliance artifact validation.' },
    { id: '_validation/integration', domain: 'validation', desc: 'Cross-skill integration check.' },
    { id: '_validation/final-output', domain: 'validation', desc: 'End-to-end output review.' },
    { id: 'second-opinion', domain: 'validation', desc: 'Cross-model second opinion.' },
    { id: 'order-format', domain: 'execution', desc: 'Format order for OMS.' },
    { id: 'algo-selection', domain: 'execution', desc: 'Pick execution algo.' },
    { id: 'venue-routing', domain: 'execution', desc: 'Route to optimal venues.' },
    { id: 'tif-policy', domain: 'execution', desc: 'Time-in-force selection.' },
    { id: 'multi-leg', domain: 'execution', desc: 'Multi-leg coordination.' },
    { id: 'execution-routing', domain: 'execution', desc: 'Smart routing by liquidity.' },
    { id: 'tca', domain: 'execution', desc: 'Transaction cost analysis.' },
    { id: 'oms-submit', domain: 'execution', desc: 'Submit ticket to OMS.' },
    { id: 'order-modify', domain: 'execution', desc: 'In-flight modifications.' },
  ];
 
  const links = [
    { source: 'trade-generation', target: 'intent-parsing' },
    { source: 'trade-generation', target: 'portfolio-state' },
    { source: 'trade-generation', target: 'mandate-check' },
    { source: 'trade-generation', target: 'position-sizing' },
    { source: 'trade-generation', target: 'risk-limits' },
    { source: 'trade-generation', target: 'compliance-check', mandatory: true },
    { source: 'trade-generation', target: 'order-format' },
    { source: 'trade-generation', target: 'red-team', mandatory: true },
    { source: 'portfolio-rebalance', target: 'portfolio-state' },
    { source: 'portfolio-rebalance', target: 'mandate-check' },
    { source: 'portfolio-rebalance', target: 'position-sizing' },
    { source: 'portfolio-rebalance', target: 'risk-limits' },
    { source: 'portfolio-rebalance', target: 'compliance-check', mandatory: true },
    { source: 'portfolio-rebalance', target: 'concentration-check' },
    { source: 'portfolio-rebalance', target: 'multi-leg' },
    { source: 'portfolio-rebalance', target: 'tca' },
    { source: 'risk-report', target: 'portfolio-state' },
    { source: 'risk-report', target: 'var-decomp' },
    { source: 'risk-report', target: 'stress-test' },
    { source: 'risk-report', target: 'beta-exposure' },
    { source: 'risk-report', target: 'fx-exposure' },
    { source: 'intent-parsing', target: 'fund-lookup' },
    { source: 'intent-parsing', target: 'pm-history' },
    { source: 'portfolio-state', target: 'fx-exposure' },
    { source: 'portfolio-state', target: 'beta-exposure' },
    { source: 'position-sizing', target: 'kelly-fraction' },
    { source: 'position-sizing', target: 'vol-regime' },
    { source: 'position-sizing', target: 'correlation-check' },
    { source: 'position-sizing', target: 'concentration-check' },
    { source: 'position-sizing', target: 'liquidity-check' },
    { source: 'position-sizing', target: 'pm-history' },
    { source: 'position-sizing', target: 'sizing-override' },
    { source: 'position-sizing', target: 'red-team', mandatory: true },
    { source: 'position-sizing', target: '_validation/sizing-coherence', mandatory: true },
    { source: 'kelly-fraction', target: 'realized-vol' },
    { source: 'correlation-check', target: 'portfolio-state' },
    { source: 'concentration-check', target: 'portfolio-state' },
    { source: 'sizing-override', target: 'pm-history' },
    { source: 'vol-regime', target: 'vix-percentile' },
    { source: 'vol-regime', target: 'realized-vol' },
    { source: 'vol-regime', target: 'macro-regime' },
    { source: 'sector-rotation', target: 'macro-regime' },
    { source: 'macro-regime', target: 'rates-curve' },
    { source: 'rates-curve', target: 'realized-vol' },
    { source: 'risk-limits', target: 'concentration-check' },
    { source: 'risk-limits', target: 'beta-exposure' },
    { source: 'risk-limits', target: 'var-decomp' },
    { source: 'risk-limits', target: 'red-team', mandatory: true },
    { source: 'var-decomp', target: 'beta-exposure' },
    { source: 'var-decomp', target: 'fx-exposure' },
    { source: 'stress-test', target: 'macro-regime' },
    { source: 'stress-test', target: 'beta-exposure' },
    { source: 'fx-exposure', target: 'currency-hedge' },
    { source: 'beta-exposure', target: 'sector-rotation' },
    { source: 'compliance-check', target: 'restricted-list' },
    { source: 'compliance-check', target: 'conflict-check' },
    { source: 'compliance-check', target: 'reg-thresholds' },
    { source: 'compliance-check', target: 'disclosure' },
    { source: 'compliance-check', target: 'cross-trade' },
    { source: 'compliance-check', target: '_validation/compliance-coherence', mandatory: true },
    { source: 'red-team', target: 'second-opinion' },
    { source: '_validation/sizing-coherence', target: 'second-opinion' },
    { source: '_validation/compliance-coherence', target: 'second-opinion' },
    { source: '_validation/integration', target: 'red-team' },
    { source: '_validation/final-output', target: '_validation/integration' },
    { source: '_validation/final-output', target: 'red-team' },
    { source: 'order-format', target: 'algo-selection' },
    { source: 'order-format', target: 'tif-policy' },
    { source: 'order-format', target: 'venue-routing' },
    { source: 'order-format', target: 'oms-submit' },
    { source: 'algo-selection', target: 'liquidity-check' },
    { source: 'algo-selection', target: 'execution-routing' },
    { source: 'venue-routing', target: 'execution-routing' },
    { source: 'multi-leg', target: 'order-format' },
    { source: 'multi-leg', target: 'tca' },
    { source: 'oms-submit', target: 'order-modify' },
    { source: 'tca', target: 'execution-routing' },
    { source: 'execution-routing', target: 'liquidity-check' },
    { source: 'currency-hedge', target: 'multi-leg' },
    { source: 'mandate-check', target: 'restricted-list' },
    { source: 'mandate-check', target: 'fund-lookup' },
    { source: 'compliance-check', target: 'mandate-check' },
    { source: 'pm-history', target: 'sizing-override' },
  ];
 
  graphSkills = skills;
  graphLinks = links;
 
  const traversalSequence = [
    { node: 'trade-generation', via: null, runtime: '0.0s', step: 1 },
    { node: 'intent-parsing',   via: 'trade-generation', runtime: '0.4s', step: 2 },
    { node: 'portfolio-state',  via: 'trade-generation', runtime: '0.6s', step: 3 },
    { node: 'mandate-check',    via: 'trade-generation', runtime: '0.9s', step: 3 },
    { node: 'position-sizing',  via: 'trade-generation', runtime: '2.1s', step: 4 },
    { node: 'vol-regime',       via: 'position-sizing',  runtime: '0.7s', step: 5 },
    { node: 'red-team',         via: 'position-sizing',  runtime: '1.4s', step: 6 },
    { node: '_validation/sizing-coherence', via: 'position-sizing', runtime: '0.6s', step: 6 },
    { node: 'compliance-check', via: 'trade-generation', runtime: '0.8s', step: 7, active: true },
  ];
 
  const visitedNodeIds = new Set(traversalSequence.map(t => t.node));
  const activeNodeId = traversalSequence.find(t => t.active).node;
  const traversedEdgeKeys = new Set(traversalSequence.filter(t => t.via).map(t => `${t.via}->${t.node}`));
  const lastT = traversalSequence[traversalSequence.length - 1];
  const activeEdgeKey = lastT.via ? `${lastT.via}->${lastT.node}` : null;
 
  const domainColors = {
    workflow: '#c084fc', sizing: '#6b8aff', risk: '#fbbf24',
    compliance: '#f87171', data: '#4ade80', validation: '#fb923c',
    market: '#22d3ee', execution: '#f472b6',
  };
 
  const container = document.getElementById('graphView');
  let W = container.clientWidth;
  let H = container.clientHeight;
  // Defensive — if container is somehow zero, use sensible defaults
  if (W < 100) W = 800;
  if (H < 100) H = 600;
 
  graphSvg = d3.select('#graph-svg');
  graphSvg.selectAll('*').remove();
  graphSvg.attr('viewBox', `0 0 ${W} ${H}`);
 
  graphG = graphSvg.append('g');
  graphZoom = d3.zoom().scaleExtent([0.3, 3]).on('zoom', (e) => graphG.attr('transform', e.transform));
  graphSvg.call(graphZoom);
  graphSvg.call(graphZoom.transform, d3.zoomIdentity.translate(W/2, H/2).scale(0.85).translate(-W/2, -H/2));
 
  const domainAnchors = {
    workflow:   { x: W * 0.5,  y: H * 0.30 },
    data:       { x: W * 0.28, y: H * 0.28 },
    sizing:     { x: W * 0.40, y: H * 0.55 },
    market:     { x: W * 0.24, y: H * 0.66 },
    risk:       { x: W * 0.62, y: H * 0.70 },
    compliance: { x: W * 0.76, y: H * 0.46 },
    validation: { x: W * 0.80, y: H * 0.66 },
    execution:  { x: W * 0.62, y: H * 0.32 },
  };
 
  skills.forEach(s => {
    const a = domainAnchors[s.domain];
    s.x = a.x + (Math.random() - 0.5) * 80;
    s.y = a.y + (Math.random() - 0.5) * 80;
  });
 
  graphSim = d3.forceSimulation(skills)
    .force('link', d3.forceLink(links).id(d => d.id).distance(70).strength(0.4))
    .force('charge', d3.forceManyBody().strength(-180))
    .force('collide', d3.forceCollide(20))
    .force('x', d3.forceX(d => domainAnchors[d.domain].x).strength(0.18))
    .force('y', d3.forceY(d => domainAnchors[d.domain].y).strength(0.18))
    .force('center', d3.forceCenter(W/2, H/2).strength(0.02));
 
  // Pre-tick to settle layout
  for (let i = 0; i < 300; i++) graphSim.tick();
  graphSim.alpha(0.05).alphaDecay(0.05);
 
  const linkSel = graphG.append('g').selectAll('path')
    .data(links).join('path')
    .attr('class', d => {
      const k = `${d.source.id||d.source}->${d.target.id||d.target}`;
      let c = 'glink';
      if (d.mandatory) c += ' mandatory-link';
      if (traversedEdgeKeys.has(k)) c += ' traversed';
      if (k === activeEdgeKey) c += ' glink-active';
      return c;
    });
 
  const nodeSel = graphG.append('g').selectAll('g')
    .data(skills).join('g')
    .attr('class', d => {
      let c = 'gnode';
      if (visitedNodeIds.has(d.id)) c += ' visited';
      if (d.id === activeNodeId) c += ' gactive';
      return c;
    });
 
  nodeSel.filter(d => d.id === activeNodeId)
    .append('circle')
    .attr('class', 'pulse-ring')
    .attr('r', 11)
    .attr('fill', 'none')
    .attr('stroke', d => domainColors[d.domain])
    .attr('stroke-width', 2);
 
  nodeSel.append('circle')
    .attr('r', d => d.id === activeNodeId ? 11 : (visitedNodeIds.has(d.id) ? 8 : (d.domain === 'workflow' ? 9 : 7)))
    .attr('fill', d => domainColors[d.domain])
    .attr('stroke', d => visitedNodeIds.has(d.id) ? '#fff' : 'rgba(255,255,255,0.4)')
    .attr('fill-opacity', d => visitedNodeIds.has(d.id) ? 1 : 0.7);
 
  nodeSel.append('text')
    .attr('class', 'gnode-label')
    .attr('dy', d => {
      const r = d.id === activeNodeId ? 11 : (visitedNodeIds.has(d.id) ? 8 : 7);
      return r + 12;
    })
    .text(d => d.id.replace('_validation/', '~/'));
 
  graphSvg.classed('traversal-active', true);
 
  graphSim.on('tick', () => {
    linkSel.attr('d', d => {
      const dx = d.target.x - d.source.x;
      const dy = d.target.y - d.source.y;
      const dr = Math.sqrt(dx*dx + dy*dy) * 1.6;
      return `M${d.source.x},${d.source.y} A${dr},${dr} 0 0,1 ${d.target.x},${d.target.y}`;
    });
    nodeSel.attr('transform', d => `translate(${d.x},${d.y})`);
  });
 
  nodeSel.call(d3.drag()
    .on('start', (e, d) => { if (!e.active) graphSim.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
    .on('drag', (e, d) => { d.fx = e.x; d.fy = e.y; })
    .on('end', (e, d) => { if (!e.active) graphSim.alphaTarget(0); d.fx = null; d.fy = null; })
  );
 
  const popover = d3.select('#gpopover');
  nodeSel.on('mouseenter', function(e, d) {
    const t = traversalSequence.find(x => x.node === d.id);
    d3.select('#gpop-title').text(d.id);
    d3.select('#gpop-tag').text(d.domain);
    d3.select('#gpop-prose').text(d.desc);
    d3.select('#gpop-meta-left').text(`${links.filter(l => (l.source.id||l.source) === d.id || (l.target.id||l.target) === d.id).length} wikilinks`);
    d3.select('#gpop-meta-right').text(t ? `step ${t.step} · ${t.runtime}` : '');
    const rect = container.getBoundingClientRect();
    const node = this.getBoundingClientRect();
    popover.style('left', `${node.left - rect.left + 18}px`)
           .style('top', `${node.top - rect.top + 18}px`)
           .classed('visible', true);
  })
  .on('mouseleave', () => popover.classed('visible', false))
  .on('click', (e, d) => openDrawer(d.id, d.domain, d.desc));
}
 
// Resize on window resize too
window.addEventListener('resize', () => {
  if (graphInitialized) resizeGraph();
});
</script>
 
</body>
</html>
