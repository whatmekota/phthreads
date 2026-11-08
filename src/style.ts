/** The page's CSS. Only the app's CSS custom properties, so it follows the theme. */
export const CSS = `
.pht { display: flex; flex-direction: column; flex: 1; min-height: 0; gap: 10px; padding: 16px 20px; color: var(--text); font-size: 12.5px; }
.pht * { box-sizing: border-box; }
.pht-head { display: flex; align-items: flex-end; gap: 16px; flex-wrap: wrap; }
.pht-title { flex: 1; min-width: 240px; display: flex; flex-direction: column; gap: 3px; }
.pht-title b { font-size: 18px; font-weight: 600; letter-spacing: -0.02em; }
.pht-sub { color: var(--text-muted); font-size: 12px; }
.pht-actions { display: flex; gap: 6px; flex-wrap: wrap; }
.pht-btn { height: 30px; padding: 0 12px; border: 1px solid var(--border); border-radius: var(--radius-sm, 6px); background: var(--bg-850); color: var(--text); font: inherit; cursor: pointer; }
.pht-btn:hover:not(:disabled) { border-color: var(--border-strong); }
.pht-btn:disabled { opacity: .45; cursor: default; }
.pht-btn[hidden] { display: none; }
.pht-primary { background: var(--accent); border-color: var(--accent); color: #fff; }
.pht-bar { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.pht-search { width: 240px; height: 30px; padding: 0 12px; border-radius: 99px; border: 1px solid var(--border); background: var(--bg-850); color: var(--text); font: inherit; }
.pht-search:focus { outline: none; border-color: var(--accent); }
.pht-tabs { display: flex; gap: 2px; padding: 2px; border-radius: var(--radius-sm, 6px); background: var(--bg-850); }
.pht-tab { height: 26px; padding: 0 10px; border: 0; border-radius: 5px; background: none; color: var(--text-muted); font: inherit; font-size: 12px; cursor: pointer; }
.pht-tab[aria-pressed=true] { background: var(--bg-800); color: var(--text); }
.pht-status { min-height: 18px; color: var(--text-muted); font-size: 12px; }
.pht-status.is-bad { color: var(--danger); }
.pht-list { flex: 1; min-height: 0; overflow-y: auto; margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 6px; }
.pht-row { padding: 10px 12px; border: 1px solid var(--border); border-radius: var(--radius-md, 10px); background: var(--bg-900); display: flex; flex-direction: column; gap: 6px; }
.pht-top { display: flex; align-items: center; gap: 8px; min-width: 0; }
.pht-name { flex: 1; min-width: 0; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.pht-pill { flex: none; height: 18px; padding: 0 7px; border-radius: 99px; font-size: 10.5px; line-height: 18px; background: var(--bg-800); color: var(--text-muted); }
.pht-pill.is-ok { background: color-mix(in srgb, var(--ok, #22c55e) 16%, transparent); color: var(--ok, #22c55e); }
.pht-pill.is-warn { background: color-mix(in srgb, var(--warn, #f59e0b) 16%, transparent); color: var(--warn, #f59e0b); }
.pht-body { display: flex; flex-direction: column; gap: 6px; }
.pht-body:empty { display: none; }
.pht-thread a, .pht-cand a { color: var(--accent); text-decoration: none; }
.pht-thread a:hover, .pht-cand a:hover { text-decoration: underline; }
.pht-cand { display: flex; align-items: center; gap: 8px; min-width: 0; }
.pht-cand a { flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.pht-score { flex: none; color: var(--text-faint); font-size: 11px; font-variant-numeric: tabular-nums; }
.pht-tags { display: flex; gap: 4px; flex-wrap: wrap; }
.pht-chip { height: 20px; padding: 0 8px; border-radius: 99px; background: var(--bg-850); color: var(--text-muted); font-size: 11px; line-height: 20px; }
.pht-chip.is-have { color: var(--text-faint); }
.pht-chip.is-have::before { content: '✓ '; color: var(--ok, #22c55e); }
.pht-note { color: var(--warn, #f59e0b); font-size: 11.5px; }
.pht-row-acts, .pht-paste { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }
.pht-paste input { flex: 1; min-width: 180px; height: 26px; padding: 0 10px; border-radius: var(--radius-sm, 6px); border: 1px solid var(--border); background: var(--bg-850); color: var(--text); font: inherit; font-size: 12px; }
.pht-paste input.is-bad { border-color: var(--danger); }
.pht-small { height: 26px; padding: 0 10px; border: 1px solid var(--border); border-radius: var(--radius-sm, 6px); background: var(--bg-850); color: var(--text); font: inherit; font-size: 12px; cursor: pointer; }
.pht-small:hover:not(:disabled) { border-color: var(--border-strong); }
.pht-small:disabled { opacity: .45; cursor: default; }
.pht-small.is-quiet { border-color: transparent; background: none; color: var(--text-muted); }
.pht-more { padding: 8px 12px; color: var(--text-faint); font-size: 12px; }
`
