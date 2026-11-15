import { useEffect, useState } from 'react';

export const ROUTES = ['overview', 'explorer', 'coverage', 'gaps', 'materials'] as const;
export type Route = (typeof ROUTES)[number];
export const ROUTE_LABEL: Record<Route, string> = {
  overview: 'Overview', explorer: 'Explorer', coverage: 'Coverage', gaps: 'Gaps', materials: 'Materials',
};

export interface Location { route: Route; params: URLSearchParams }

// Hash routing (#/explorer?fuel=heptane): funciona en cualquier hosting estático sin reglas de servidor.
export function parseHash(hash: string): Location {
  const raw = hash.replace(/^#\/?/, '');
  const [path, query = ''] = raw.split('?');
  const route = (ROUTES as readonly string[]).includes(path) ? (path as Route) : 'overview';
  return { route, params: new URLSearchParams(query) };
}

export const hrefFor = (route: Route, params?: Record<string, string>): string => {
  const q = params ? `?${new URLSearchParams(params).toString()}` : '';
  return `#/${route}${q}`;
};

export function useLocation(): Location {
  const [loc, setLoc] = useState(() => parseHash(window.location.hash));
  useEffect(() => {
    const on = () => setLoc(parseHash(window.location.hash));
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return loc;
}
