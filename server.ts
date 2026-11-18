import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { AMAZON_MARKETPLACES } from './src/constants/marketplaces.ts';
import {
  formatApiError,
  getGameSuggestions,
  verifyBatchOnAmazonAppstore,
  verifyGameOnAmazonAppstore,
} from './src/server/appstoreService.ts';
import type { MarketplaceCode } from './src/types.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;

async function startServer() {
  const app = express();
  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      runtime: 'node-express',
      marketplaces: AMAZON_MARKETPLACES.length,
    });
  });

  app.get('/api/games/suggest', async (req, res) => {
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const marketplaceCode =
      typeof req.query.marketplace === 'string' ? req.query.marketplace : 'com';

    if (q.length < 2) {
      res.json({ suggestions: [], amazonKeywords: [] });
      return;
    }

    try {
      const result = await getGameSuggestions(q, marketplaceCode);
      res.json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error al buscar sugerencias';
      res.status(500).json({ error: message, suggestions: [], amazonKeywords: [] });
    }
  });

  app.post('/api/appstore/check', async (req, res) => {
    const { query, developer, marketplace } = req.body as {
      query?: string;
      developer?: string;
      marketplace?: MarketplaceCode;
    };

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      res.status(400).json({ error: 'Debes indicar el nombre de un juego para comprobar.' });
      return;
    }

    try {
      const result = await verifyGameOnAmazonAppstore({
        query,
        developer,
        marketplaceCode: marketplace,
      });
      res.json(result);
    } catch (error) {
      console.error('Error checking Amazon Appstore:', error);
      const formatted = formatApiError(error);
      res.status(formatted.statusCode).json({ error: formatted.message });
    }
  });

  app.post('/api/appstore/batch', async (req, res) => {
    const { games, marketplace } = req.body as {
      games?: string[];
      marketplace?: MarketplaceCode;
    };

    if (!Array.isArray(games) || games.length === 0) {
      res.status(400).json({ error: 'Proporciona al menos un juego para verificar por lotes.' });
      return;
    }

    const hasValidGames = games.some(
      (g) => typeof g === 'string' && g.trim().length > 0
    );
    if (!hasValidGames) {
      res.status(400).json({ error: 'La lista de juegos está vacía.' });
      return;
    }

    try {
      const results = await verifyBatchOnAmazonAppstore({
        games,
        marketplaceCode: marketplace,
      });
      res.json({ results });
    } catch (error) {
      console.error('Error in batch check:', error);
      const formatted = formatApiError(error);
      res.status(formatted.statusCode).json({ error: formatted.message });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`AppstoreRadar server listening on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
