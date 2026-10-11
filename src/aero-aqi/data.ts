export interface HourPoint {
  time: string;
  aqi: number;
  band: 'Severe' | 'Hazardous';
}

export interface Hotspot {
  name: string;
  x: number;
  y: number;
  aqi: number;
}

export interface StationNode {
  region: string;
  name: string;
  aqi: number;
  band: 'Severe' | 'Very Poor' | 'Severe +';
}

export const HOURS: HourPoint[] = [
  { time: '08:00', aqi: 310, band: 'Severe' },
  { time: '10:00', aqi: 342, band: 'Severe' },
  { time: '12:00', aqi: 388, band: 'Severe' },
  { time: '14:00', aqi: 412, band: 'Hazardous' },
  { time: '16:00', aqi: 365, band: 'Severe' },
  { time: '18:00', aqi: 320, band: 'Severe' },
];

export const HOTSPOTS: Hotspot[] = [
  { name: 'Anand Vihar', x: 0, y: 168, aqi: 310 },
  { name: 'Punjabi Bagh', x: 165, y: 132, aqi: 342 },
  { name: 'RK Puram', x: 320, y: 74, aqi: 388 },
  { name: 'Sec-62 Noida', x: 480, y: 58, aqi: 412 },
  { name: 'Bulandshahr', x: 640, y: 138, aqi: 365 },
  { name: 'Meerut Cantt', x: 835, y: 118, aqi: 320 },
];

export const HOTSPOT_LABELS = [
  'Anand Vihar',
  'Punjabi Bagh',
  'RK Puram',
  'Sector 62 Noida',
  'Bulandshahr',
  'Meerut Cantt',
] as const;

export const NEIGHBOURS: StationNode[] = [
  {
    region: 'Uttar Pradesh / Meerut / Sector 3 Shastri Nagar',
    name: 'Shastri Nagar Node',
    aqi: 328,
    band: 'Severe',
  },
  {
    region: 'Haryana / Gurugram / Cyber City',
    name: 'Cyber City Node',
    aqi: 284,
    band: 'Very Poor',
  },
  {
    region: 'Uttar Pradesh / Greater Noida / Knowledge Park',
    name: 'Knowledge Park Node',
    aqi: 352,
    band: 'Severe',
  },
];

export const WAVE_LINE_PATH =
  'M0,168 C70,160 110,150 165,132 C220,114 260,96 320,74 C380,52 420,44 480,58 C540,72 580,120 640,138 C700,156 770,150 835,118';

export const WAVE_FILL_PATH = `${WAVE_LINE_PATH} L835,230 L0,230 Z`;

export type NavId = 'dashboard' | 'logs' | 'firms' | 'path' | 'ai';

export interface NavItem {
  id: NavId;
  icon: string;
  label: string;
  hint: string;
}

export const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', icon: 'grid', label: 'Dashboard', hint: 'Live overview' },
  { id: 'logs', icon: 'chart', label: 'Telemetry Logs', hint: 'Drone-04 stream' },
  { id: 'firms', icon: 'cloud', label: 'Satellite FIRMS', hint: 'Thermal anomalies' },
  { id: 'path', icon: 'pin', label: 'Flight Path', hint: 'Drone-04 route' },
  { id: 'ai', icon: 'sensor', label: 'AI Forecasting', hint: 'Next 24h model' },
];

export interface AlertItem {
  id: number;
  title: string;
  detail: string;
  time: string;
  sev: 'crit' | 'warn' | 'info';
  read: boolean;
}

export const SEED_ALERTS: AlertItem[] = [
  { id: 1, title: 'Severe plume over Anand Vihar', detail: 'PM2.5 385 µg/m³ · AQI 412 · dispersal protocol on', time: '2 min ago', sev: 'crit', read: false },
  { id: 2, title: 'Drone-04 battery 68%', detail: 'Endurance 42 min · return threshold 20%', time: '18 min ago', sev: 'warn', read: false },
  { id: 3, title: '6 FIRMS hotspots NW', detail: 'Agricultural burn · wind carrying plume to ISBT', time: '35 min ago', sev: 'info', read: false },
];

export interface FirmRow {
  site: string;
  frp: string;
  conf: string;
  dist: string;
}

export const FIRMS_ROWS: FirmRow[] = [
  { site: 'Meerut Cantt fringe', frp: '42.6 MW', conf: 'High', dist: '58 km NW' },
  { site: 'Bulandshahr belt', frp: '31.2 MW', conf: 'High', dist: '44 km SE' },
  { site: 'Baghpat stubble', frp: '24.8 MW', conf: 'Nominal', dist: '39 km N' },
  { site: 'Sonipat fringe', frp: '18.4 MW', conf: 'Nominal', dist: '33 km NW' },
  { site: 'Ghaziabad edge', frp: '12.1 MW', conf: 'Low', dist: '14 km E' },
  { site: 'Noida Sec-62', frp: '6.3 MW', conf: 'Low', dist: '9 km SE' },
];

export interface Waypoint {
  stop: string;
  eta: string;
  aqi: number;
}

export const WAYPOINTS: Waypoint[] = [
  { stop: 'Anand Vihar ISBT', eta: 'Hold · sampling', aqi: 412 },
  { stop: 'Punjabi Bagh', eta: 'ETA 12 min', aqi: 342 },
  { stop: 'RK Puram', eta: 'ETA 26 min', aqi: 388 },
  { stop: 'Sector 62 Noida', eta: 'ETA 41 min', aqi: 365 },
  { stop: 'Bulandshahr', eta: 'ETA 58 min', aqi: 320 },
  { stop: 'Meerut Cantt', eta: 'ETA 74 min', aqi: 328 },
];

export interface AiRow {
  at: string;
  aqi: number;
  conf: number;
}

export const AI_ROWS: AiRow[] = [
  { at: '+2h', aqi: 418, conf: 92 },
  { at: '+4h', aqi: 396, conf: 89 },
  { at: '+8h', aqi: 361, conf: 86 },
  { at: '+12h', aqi: 334, conf: 83 },
  { at: '+18h', aqi: 305, conf: 79 },
  { at: '+24h', aqi: 288, conf: 76 },
];

const LOG_SITES = ['Anand Vihar', 'Punjabi Bagh', 'RK Puram', 'Sec-62 Noida', 'Bulandshahr', 'Meerut Cantt'];

export function makeLog(n: number): { id: number; t: string; msg: string; aqi: number } {
  const site = LOG_SITES[n % LOG_SITES.length];
  const aqi = 300 + Math.round(40 * Math.sin(n / 3) + Math.random() * 60);
  const pm = Math.round(aqi * 0.93);
  return {
    id: n,
    t: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    msg: `Drone-04 · ${site} · PM2.5 ${pm} µg/m³`,
    aqi,
  };
}
