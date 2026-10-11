import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AI_ROWS, FIRMS_ROWS, HOURS, HOTSPOT_LABELS, HOTSPOTS, makeLog,
  NAV_ITEMS, NEIGHBOURS, SEED_ALERTS, WAVE_FILL_PATH, WAVE_LINE_PATH, WAYPOINTS,
  type AlertItem, type NavId,
} from './data';
import './aero-aqi.css';

function Icon({ id, size = 20 }: { id: string; size?: number }) {
  return (
    <svg width={size} height={size} aria-hidden="true">
      <use href={`#aero-${id}`} />
    </svg>
  );
}

function useISTClock(live: boolean) {
  const [now, setNow] = useState('--');
  useEffect(() => {
    if (!live) { setNow('LINK PAUSED'); return; }
    const tick = () => {
      try {
        setNow(new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' IST');
      } catch { setNow(new Date().toLocaleTimeString()); }
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [live]);
  return now;
}

interface Toast { id: number; msg: string; }

const MAIN_STATION = { region: 'New Delhi — Anand Vihar Terminal', name: 'Anand Vihar Terminal', aqi: 412, band: 'Severe +' as const };

export default function AeroAqi() {
  const [activeNav, setActiveNav] = useState<NavId>('dashboard');
  const [sel, setSel] = useState(3);
  const [aqi, setAqi] = useState(412);
  const [live, setLive] = useState(true);
  const [airborne, setAirborne] = useState(4);
  const [deployed, setDeployed] = useState(false);
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [confirmOff, setConfirmOff] = useState(false);
  const [alerts, setAlerts] = useState<AlertItem[]>(SEED_ALERTS);
  const [query, setQuery] = useState('');
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [tip, setTip] = useState<{ x: number; y: number; text: string } | null>(null);
  const [logs, setLogs] = useState(() => [makeLog(2), makeLog(1), makeLog(0)]);
  const [logPaused, setLogPaused] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [routing, setRouting] = useState(false);
  const [modelRun, setModelRun] = useState(false);
  const [aiRows, setAiRows] = useState(AI_ROWS);
  const [mainSel, setMainSel] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const clock = useISTClock(live);
  const toastId = useRef(0);

  const pushToast = (msg: string) => {
    const id = ++toastId.current;
    setToasts((t) => [...t.slice(-2), { id, msg }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3000);
  };

  // live AQI jitter
  useEffect(() => {
    if (!live) return;
    const t = setInterval(() => setAqi((v) => Math.round(Math.max(398, Math.min(426, v + (Math.random() * 6 - 3))))), 4000);
    return () => clearInterval(t);
  }, [live]);

  // telemetry log stream
  useEffect(() => {
    if (!live || logPaused) return;
    let n = 3;
    const t = setInterval(() => { setLogs((l) => [makeLog(n++), ...l].slice(0, 30)); }, 3000);
    return () => clearInterval(t);
  }, [live, logPaused]);

  useEffect(() => {
    if (!deployed) return;
    const t = setTimeout(() => setDeployed(false), 2600);
    return () => clearTimeout(t);
  }, [deployed]);

  useEffect(() => {
    if (searchOpen) setTimeout(() => searchRef.current?.focus(), 60);
  }, [searchOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setSearchOpen(false); setAlertsOpen(false); setProfileOpen(false); setConfirmOff(false); if (activeNav !== 'dashboard') setActiveNav('dashboard'); }
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT') { e.preventDefault(); setSearchOpen(true); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activeNav]);

  const unread = alerts.filter((a) => !a.read).length;
  const stations = useMemo(() => [
    { ...MAIN_STATION, tag: 'Main station' },
    ...NEIGHBOURS.map((n) => ({ region: n.region, name: n.name, aqi: n.aqi, band: n.band, tag: 'Neighbour node' })),
  ], []);
  const main = stations[mainSel] ?? stations[0];

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const pool = [
      ...stations.map((s, i) => ({ kind: 'Station', label: s.name, sub: `${s.aqi} AQI · ${s.region}`, go: () => { setMainSel(i); setSearchOpen(false); pushToast(`${s.name} focused on rail`); } })),
      ...HOTSPOT_LABELS.map((h) => ({ kind: 'Hotspot', label: h, sub: 'NCR plume belt', go: () => { setSearchOpen(false); setActiveNav('firms'); pushToast(`${h} highlighted in FIRMS`) } })),
      ...NAV_ITEMS.map((n) => ({ kind: 'Section', label: n.label, sub: n.hint, go: () => { setSearchOpen(false); setActiveNav(n.id); } })),
    ];
    if (!q) return pool.slice(0, 6);
    return pool.filter((r) => (r.label + r.sub + r.kind).toLowerCase().includes(q)).slice(0, 7);
  }, [query, stations]);

  const deploy = () => {
    if (!live) { pushToast('Link paused — reconnect first'); return; }
    setDeployed(true);
    setAirborne((a) => Math.min(6, a + 1));
    setLogs((l) => [{ id: Date.now(), t: 'now', msg: `Drone-05 dispatched · climb to 120 m · sector sweep`, aqi }, ...l].slice(0, 30));
    pushToast('UAV dispatched · sector sweep started');
  };

  const drawer = activeNav !== 'dashboard';
  const pipTop = activeNav === 'dashboard' ? 131 : activeNav === 'logs' ? 187 : activeNav === 'firms' ? 243 : activeNav === 'path' ? 299 : 355;

  return (
    <div className="aero-stage" role="main" aria-label="AERO-AQI — Autonomous Airborne Pollution Intelligence">
      <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
        <defs>
          <symbol id="aero-drone" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="5" cy="5" r="2.2" /><circle cx="19" cy="5" r="2.2" /><circle cx="5" cy="19" r="2.2" /><circle cx="19" cy="19" r="2.2" /><rect x="9" y="9" width="6" height="6" rx="1.5" fill="currentColor" stroke="none" /><path d="M6.5 6.5 9 9M17.5 6.5 15 9M6.5 17.5 9 15M17.5 17.5 15 15" /></symbol>
          <symbol id="aero-grid" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"><rect x="3.5" y="3.5" width="7" height="7" rx="2" /><rect x="13.5" y="3.5" width="7" height="7" rx="2" /><rect x="3.5" y="13.5" width="7" height="7" rx="2" /><rect x="13.5" y="13.5" width="7" height="7" rx="2" /></symbol>
          <symbol id="aero-chart" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"><path d="M4 20V10M10 20V4M16 20v-8M21 20H3" /></symbol>
          <symbol id="aero-cloud" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M7 18a4.5 4.5 0 1 1 .6-8.96A5.5 5.5 0 0 1 18.3 10.5 3.75 3.75 0 0 1 17.5 18H7Z" /><path d="M12 12v5M9.8 14.2 12 12l2.2 2.2" /></symbol>
          <symbol id="aero-pin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M12 21s7-6.1 7-11a7 7 0 1 0-14 0c0 4.9 7 11 7 11Z" /><circle cx="12" cy="10" r="2.6" /></symbol>
          <symbol id="aero-sensor" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"><path d="M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" /><path d="M8.5 16.5a5 5 0 0 1 0-9M15.5 7.5a5 5 0 0 1 0 9M5.6 19.4a9 9 0 0 1 0-14.8M18.4 4.6a9 9 0 0 1 0 14.8" /></symbol>
          <symbol id="aero-wind" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"><path d="M3 8h9.5a2.5 2.5 0 1 0-2.4-3.2M3 12h13.5a2.8 2.8 0 1 1-2.6 3.8M3 16h6" /></symbol>
          <symbol id="aero-drop" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round"><path d="M12 3s6 6.2 6 11a6 6 0 0 1-12 0c0-4.8 6-11 6-11Z" /></symbol>
          <symbol id="aero-warn" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3 2.5 20h19L12 3Z" /><path d="M12 9.5V14M12 17.2v.3" /></symbol>
          <symbol id="aero-bell" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9a6 6 0 1 1 12 0c0 5 2 6 2 6H4s2-1 2-6" /><path d="M10 20a2 2 0 0 0 4 0" /></symbol>
          <symbol id="aero-search" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4.5 4.5" /></symbol>
          <symbol id="aero-plus" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></symbol>
          <symbol id="aero-logout" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M14 4H6a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h8M10 12h11M18 8.5 21.5 12 18 15.5" /></symbol>
          <symbol id="aero-x" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18" /></symbol>
        </defs>
      </svg>

      {/* SIDEBAR */}
      <aside className="aero-sidebar" aria-label="Primary">
        <span className="aero-pip" style={{ top: `calc(${pipTop}*var(--u))`, transition: 'top .45s cubic-bezier(.16,1,.3,1)' }} />
        <button className="aero-logo" title="AERO-AQI · Dashboard" onClick={() => setActiveNav('dashboard')} aria-label="AERO-AQI home"><Icon id="drone" size={26} /></button>
        <nav className="aero-nav" aria-label="Sections">
          {NAV_ITEMS.map((n) => (
            <button key={n.id} className={activeNav === n.id ? 'active' : ''} aria-label={n.label} title={`${n.label} · ${n.hint}`} onClick={() => setActiveNav(n.id)}>
              <Icon id={n.icon} size={22} /><span className="tip">{n.label}</span>
            </button>
          ))}
        </nav>
        <div className="aero-side-foot">
          <button aria-label={live ? 'System Disconnect' : 'Reconnect telemetry'} title={live ? 'System Disconnect' : 'Reconnect'} onClick={() => (live ? setConfirmOff(true) : (setLive(true), pushToast('Telemetry link restored')))}><Icon id={live ? 'logout' : 'drone'} size={20} /></button>
          <small>{live ? <>System<br />Disconnect</> : <>Link paused<br />Reconnect</>}</small>
        </div>
      </aside>

      {/* HEADER */}
      <header className="aero-header">
        <div className="aero-loc">
          <small>{live ? 'UAV Telemetry Active' : 'UAV Telemetry Paused'}</small>
          <strong><span className="dot" style={live ? undefined : { background: '#f59e0b', boxShadow: '0 0 10px #f59e0b' }} /> Anand Vihar, New Delhi</strong>
        </div>
        <div className="aero-tools">
          <button className="aero-pill" onClick={deploy}><Icon id={deployed ? 'drone' : 'plus'} size={17} /> {deployed ? 'UAV Dispatched ✓' : 'Deploy UAV'}</button>
          <button className="aero-iconbtn" aria-label="Search Station" title="Search ( / )" onClick={() => { setSearchOpen((s) => !s); setAlertsOpen(false); setProfileOpen(false); }}><Icon id="search" size={19} /></button>
          <button className="aero-iconbtn" aria-label="Alert Center" title="Alert Center" onClick={() => { setAlertsOpen((s) => !s); setSearchOpen(false); setProfileOpen(false); }}><Icon id="bell" size={19} />{unread > 0 && <span className="n">{unread}</span>}</button>
          <button className="aero-avatarbtn" aria-label="Akshansh Pundir profile" title="Akshansh Pundir" onClick={() => { setProfileOpen((s) => !s); setAlertsOpen(false); setSearchOpen(false); }}>
            <img className="aero-avatar" src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=160&h=160&fit=crop&crop=faces&q=80&auto=format" alt="Akshansh Pundir" loading="eager" decoding="async" onError={(e) => (e.target as HTMLImageElement).remove()} />
          </button>
        </div>
      </header>

      {/* HERO */}
      <section className="aero-hero">
        <span className="aero-chip"><i /> CPCB &amp; NASA FIRMS Sync • Live Air Surveillance</span>
        <h1><span className="mask"><span>Severe Hazardous</span></span><span className="mask"><span>Smog &amp; AQI Plume</span></span></h1>
        <p className="aero-blurb">Aerial sensors onboard Anti-Gravity Drone-04 report micro-particle concentration spikes over Anand Vihar ISBT. Wind from NW at 14 km/h carrying agricultural thermal anomalies. Automated dispersal and public rerouting protocols initiated.</p>
        <div className="aero-hero-meta">
          <span className="aero-mini"><Icon id="drone" size={15} /> Drone-04 <b>&nbsp;· Airborne</b></span>
          <span className="aero-mini"><Icon id="warn" size={15} /> NW plume <b>&nbsp;14 km/h</b></span>
          <span className="aero-mini"><Icon id="cloud" size={15} /> FIRMS <b>&nbsp;6 hotspots</b></span>
        </div>
      </section>

      {/* FORECAST */}
      <section className="aero-forecast" aria-label="Telemetry and spatial wave chart">
        <div className="aero-fhead"><h2>Hourly PM2.5 / AQI Trend — NCR Belt</h2><span>IST • CPCB live feed</span></div>
        <div className="aero-hours">
          {HOURS.map((h, i) => (
            <button key={h.time} className={`hour${i === sel ? ' sel' : ''}`} onClick={() => { setSel(i); setAqi(h.aqi); }}>
              <time>{h.time}</time><b>{h.aqi}</b>
              <em className={h.band === 'Hazardous' ? 'haz' : 'sev'}>{h.band}</em>
            </button>
          ))}
        </div>
        <div className="aero-chart" ref={wrapRef}>
          {tip && <div id="aero-tip" style={{ left: tip.x, top: tip.y }}>{tip.text}</div>}
          <svg viewBox="0 0 835 230" preserveAspectRatio="none" role="img" aria-label="PM2.5 concentration curve across NCR hotspots">
            <defs>
              <linearGradient id="aeroFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#fff" stopOpacity=".42" /><stop offset=".6" stopColor="#ffb08a" stopOpacity=".18" /><stop offset="1" stopColor="#fff" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="aeroLine" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0" stopColor="#ffe9d6" /><stop offset=".45" stopColor="#fff" /><stop offset=".75" stopColor="#ff9d7a" /><stop offset="1" stopColor="#ff5a3c" />
              </linearGradient>
            </defs>
            <g stroke="rgba(255,255,255,.12)" strokeWidth="1">
              <line x1="0" y1="40" x2="835" y2="40" /><line x1="0" y1="90" x2="835" y2="90" />
              <line x1="0" y1="140" x2="835" y2="140" /><line x1="0" y1="190" x2="835" y2="190" />
            </g>
            <path className="wave-fill" d={WAVE_FILL_PATH} fill="url(#aeroFill)" />
            <path className="wave-line" pathLength={1} d={WAVE_LINE_PATH} stroke="url(#aeroLine)" />
            <g>
              {HOTSPOTS.map((p, i) => (
                <circle key={p.name} cx={p.x} cy={p.y} r={i === 3 ? 6 : 4.5} fill={i === 3 ? '#ff4a3c' : '#fff'}
                  stroke="rgba(0,0,0,.35)" strokeWidth={1.5} className="wave-dot"
                  style={{ animationDelay: `${1.6 + i * 0.15}s`, cursor: 'pointer' }}
                  onMouseEnter={() => {
                    const r = wrapRef.current?.querySelector('svg')?.getBoundingClientRect();
                    if (!r) return;
                    setTip({ x: (p.x / 835) * r.width, y: (p.y / 230) * r.height, text: `${p.name} · ${p.aqi} AQI` });
                  }}
                  onMouseLeave={() => setTip(null)}
                  onClick={() => { setAqi(p.aqi); pushToast(`${p.name} · ${p.aqi} AQI pinned`); }}
                />
              ))}
            </g>
          </svg>
        </div>
        <div className="aero-hotspots">
          {HOTSPOT_LABELS.map((n, i) => (
            <button key={n} className={`hs${i === 0 ? ' hot' : ''}`} onClick={() => { const h = HOTSPOTS[i]; if (h) { setAqi(h.aqi); pushToast(`${n} · ${h.aqi} AQI pinned`); } }}><i />{n}</button>
          ))}
        </div>
      </section>

      {/* RAIL */}
      <aside className="aero-rail" aria-label="Station cards">
        <article className="aero-card">
          <div className="aero-cardtop"><h3>{main.region}</h3><span className="live" style={live ? undefined : { background: 'rgba(120,90,10,.5)', borderColor: 'rgba(245,158,11,.5)' }}><i style={live ? undefined : { background: '#f59e0b' }} />{live ? 'Live' : 'Paused'}</span></div>
          <div className="aero-big"><b>{mainSel === 0 ? aqi : main.aqi}</b><small>AQI</small><span className="badge">{main.band}</span></div>
          <div className="aero-sub">
            <div><Icon id="wind" size={16} /><b>14 km/h</b><span>NW Wind</span></div>
            <div><Icon id="drop" size={16} /><b>88%</b><span>RH</span></div>
            <div><Icon id="sensor" size={16} /><b>385 µg/m³</b><span>PM2.5</span></div>
          </div>
        </article>
        {stations.slice(1).map((s, k) => (
          <button key={s.name} className={`aero-card aero-node${mainSel === k + 1 ? ' picked' : ''}`} onClick={() => { setMainSel(k + 1); pushToast(`${s.name} set as focus station`); }} title="Click to focus">
            <small>{s.region}</small><strong>{s.name}</strong>
            <div className="aero-noderow"><b>{s.aqi} <span>AQI</span></b><em className={s.band === 'Very Poor' ? 'vpoor' : 'sev'}>{s.band}</em></div>
          </button>
        ))}
      </aside>

      {/* DRAWER (sidebar sections) */}
      {drawer && (
        <section className="aero-drawer" role="dialog" aria-label={NAV_ITEMS.find((n) => n.id === activeNav)?.label}>
          <div className="aero-drawerhead">
            <div><small>{NAV_ITEMS.find((n) => n.id === activeNav)?.hint}</small><h2>{NAV_ITEMS.find((n) => n.id === activeNav)?.label}</h2></div>
            <button className="aero-x" aria-label="Close panel" onClick={() => setActiveNav('dashboard')}><Icon id="x" size={16} /></button>
          </div>
          {activeNav === 'logs' && (
            <>
              <div className="aero-rowbtns">
                <button onClick={() => setLogPaused((p) => !p)}>{logPaused ? 'Resume stream' : 'Pause stream'}</button>
                <button onClick={() => { setLogs([]); pushToast('Log buffer cleared'); }}>Clear</button>
              </div>
              <div className="aero-logs">{logs.length === 0 && <p className="dim">No entries — stream paused or cleared.</p>}
                {logs.map((l) => (<div key={l.id} className="aero-log"><span>{l.t}</span><p>{l.msg}</p><b>{l.aqi}</b></div>))}
              </div>
            </>
          )}
          {activeNav === 'firms' && (
            <>
              <div className="aero-rowbtns"><button onClick={() => { if (!live) { pushToast('Link paused — reconnect first'); return; } setSyncing(true); setTimeout(() => { setSyncing(false); pushToast('FIRMS sync complete · 6 hotspots'); }, 1200); }}>{syncing ? 'Syncing…' : 'Sync now'}</button></div>
              <div className="aero-table">{FIRMS_ROWS.map((f) => (<div key={f.site} className="aero-trow"><div><b>{f.site}</b><span>{f.dist}</span></div><em>{f.frp}</em><i>{f.conf}</i></div>))}</div>
            </>
          )}
          {activeNav === 'path' && (
            <>
              <div className="aero-progress"><i style={{ width: routing ? '100%' : '38%' }} /></div>
              <div className="aero-table">{WAYPOINTS.map((w, i) => (<div key={w.stop} className="aero-trow"><div><b>{i + 1}. {w.stop}</b><span>{w.eta}</span></div><em>{w.aqi} AQI</em></div>))}</div>
              <div className="aero-rowbtns"><button onClick={() => { setRouting(true); setTimeout(() => { setRouting(false); pushToast('Flight path rerouted around plume core'); }, 1400); }}>{routing ? 'Rerouting…' : 'Reroute around plume'}</button></div>
            </>
          )}
          {activeNav === 'ai' && (
            <>
              <div className="aero-table">{aiRows.map((r) => (<div key={r.at} className="aero-trow"><div><b>{r.at}</b><span>model v2.3</span></div><em>{r.aqi} AQI</em><i>{r.conf}%</i></div>))}</div>
              <div className="aero-rowbtns"><button onClick={() => { setModelRun(true); setTimeout(() => { setModelRun(false); setAiRows((rows) => rows.map((r) => ({ ...r, aqi: Math.max(240, Math.min(430, r.aqi + Math.round(Math.random() * 14 - 7))) }))); pushToast('AI forecast refreshed'); }, 1300); }}>{modelRun ? 'Running…' : 'Run model'}</button></div>
            </>
          )}
        </section>
      )}

      {/* SEARCH */}
      {searchOpen && (
        <div className="aero-pop aero-searchpop" role="dialog" aria-label="Search Station">
          <input ref={searchRef} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search station, hotspot, section…  ( / )" aria-label="Search stations" />
          <div className="aero-results">{results.length === 0 && <p className="dim">No matches for “{query}”.</p>}
            {results.map((r, i) => (<button key={i} onClick={r.go}><em>{r.kind}</em><b>{r.label}</b><span>{r.sub}</span></button>))}
          </div>
        </div>
      )}

      {/* ALERTS */}
      {alertsOpen && (
        <div className="aero-pop aero-alertspop" role="dialog" aria-label="Alert Center">
          <div className="aero-pophead"><h3>Alert Center</h3><button onClick={() => { setAlerts((a) => a.map((x) => ({ ...x, read: true }))); pushToast('All alerts marked read'); }}>Mark all read</button></div>
          {alerts.map((a) => (
            <button key={a.id} className={`aero-alert ${a.read ? 'read' : ''}`} onClick={() => setAlerts((l) => l.map((x) => (x.id === a.id ? { ...x, read: true } : x)))}>
              <i className={a.sev} /><div><b>{a.title}</b><span>{a.detail}</span><small>{a.time}</small></div>
            </button>
          ))}
        </div>
      )}

      {/* PROFILE */}
      {profileOpen && (
        <div className="aero-pop aero-profilepop" role="dialog" aria-label="User profile">
          <div className="aero-id"><img src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=160&h=160&fit=crop&crop=faces&q=80&auto=format" alt="Akshansh Pundir" onError={(e) => (e.target as HTMLImageElement).remove()} />
            <div><b>Akshansh Pundir</b><span>Class Lead / NSS Director</span><small>Drone-04 · NCR sector</small></div></div>
          <button onClick={() => { setProfileOpen(false); setActiveNav('path'); pushToast('My sorties opened'); }}>My sorties</button>
          <button onClick={() => { setProfileOpen(false); setActiveNav('logs'); pushToast('Preferences pinned to logs'); }}>Preferences</button>
          <button className="danger" onClick={() => { setProfileOpen(false); setConfirmOff(true); }}>Sign out / Disconnect</button>
        </div>
      )}

      {/* CONFIRM DISCONNECT */}
      {confirmOff && (
        <div className="aero-scrim" role="dialog" aria-label="Confirm disconnect" onClick={() => setConfirmOff(false)}>
          <div className="aero-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Suspend telemetry link?</h3>
            <p>Live AQI jitter, log stream and FIRMS sync pause. Cards stay visible but frozen.</p>
            <div className="aero-rowbtns"><button onClick={() => setConfirmOff(false)}>Keep live</button><button className="danger" onClick={() => { setLive(false); setConfirmOff(false); pushToast('Telemetry link suspended'); }}>Disconnect</button></div>
          </div>
        </div>
      )}

      {/* TOASTS */}
      <div className="aero-toasts" aria-live="polite">{toasts.map((t) => (<div key={t.id} className="aero-toast">{t.msg}</div>))}</div>

      <footer className="aero-footer">
        <div>Powered by <b>CPCB</b> Real-time Telemetry, <b>IMD</b> Weather API, and <b>NASA FIRMS</b> Thermal Anomaly Satellite Data.</div>
        <div className="aero-status"><span className="ok"><Icon id="drone" size={14} /> {airborne} UAVs airborne</span><span>{clock}</span></div>
      </footer>
    </div>
  );
}
