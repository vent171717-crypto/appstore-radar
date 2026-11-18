import { AMAZON_MARKETPLACES } from './src/constants/marketplaces.ts';
import {
  formatApiError,
  getGameSuggestions,
  verifyBatchOnAmazonAppstore,
  verifyGameOnAmazonAppstore,
} from './src/server/appstoreService.ts';
import type { MarketplaceCode } from './src/types.ts';

interface AssetsBinding {
  fetch(request: Request): Promise<Response>;
}

export interface Env {
  ASSETS?: AssetsBinding;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
    },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const { pathname } = url;

    if (pathname === '/api/health' && request.method === 'GET') {
      return jsonResponse({
        ok: true,
        runtime: 'cloudflare-workers',
        marketplaces: AMAZON_MARKETPLACES.length,
      });
    }

    if (pathname === '/api/games/suggest' && request.method === 'GET') {
      const q = (url.searchParams.get('q') ?? '').trim();
      const marketplace = url.searchParams.get('marketplace') ?? 'com';

      if (q.length < 2) {
        return jsonResponse({ suggestions: [], amazonKeywords: [] });
      }

      try {
        const result = await getGameSuggestions(q, marketplace);
        return jsonResponse(result);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Error al buscar sugerencias';
        return jsonResponse({ error: message, suggestions: [], amazonKeywords: [] }, 500);
      }
    }

    if (pathname === '/api/appstore/check' && request.method === 'POST') {
      let body: { query?: string; developer?: string; marketplace?: MarketplaceCode };
      try {
        body = (await request.json()) as typeof body;
      } catch {
        return jsonResponse({ error: 'Cuerpo JSON inválido.' }, 400);
      }

      if (!body.query || typeof body.query !== 'string' || body.query.trim().length === 0) {
        return jsonResponse(
          { error: 'Debes indicar el nombre de un juego para comprobar.' },
          400
        );
      }

      try {
        const result = await verifyGameOnAmazonAppstore({
          query: body.query,
          developer: body.developer,
          marketplaceCode: body.marketplace,
        });
        return jsonResponse(result);
      } catch (error) {
        const formatted = formatApiError(error);
        return jsonResponse({ error: formatted.message }, formatted.statusCode);
      }
    }

    if (pathname === '/api/appstore/batch' && request.method === 'POST') {
      let body: { games?: string[]; marketplace?: MarketplaceCode };
      try {
        body = (await request.json()) as typeof body;
      } catch {
        return jsonResponse({ error: 'Cuerpo JSON inválido.' }, 400);
      }

      if (!Array.isArray(body.games) || body.games.length === 0) {
        return jsonResponse(
          { error: 'Proporciona al menos un juego para verificar por lotes.' },
          400
        );
      }

      const hasValidGames = body.games.some(
        (g) => typeof g === 'string' && g.trim().length > 0
      );
      if (!hasValidGames) {
        return jsonResponse({ error: 'La lista de juegos está vacía.' }, 400);
      }

      try {
        const results = await verifyBatchOnAmazonAppstore({
          games: body.games,
          marketplaceCode: body.marketplace,
        });
        return jsonResponse({ results });
      } catch (error) {
        const formatted = formatApiError(error);
        return jsonResponse({ error: formatted.message }, formatted.statusCode);
      }
    }

    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    return new Response('Not Found', { status: 404 });
  },
};
