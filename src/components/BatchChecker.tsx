import { useState } from 'react';
import { ArrowUpRight, ListChecks, Loader2 } from 'lucide-react';
import { AMAZON_MARKETPLACES } from '../constants/marketplaces.ts';
import type { MarketplaceCode, VerificationResult } from '../types.ts';
import { StatusIndicator } from './StatusIndicator.tsx';

interface BatchCheckerProps {
  selectedMarketplace: MarketplaceCode;
  onMarketplaceChange: (code: MarketplaceCode) => void;
  onBatchComplete: (results: VerificationResult[]) => void;
  onInspectResult: (result: VerificationResult) => void;
}

const SAMPLE_BATCH_LIST = [
  'Minecraft',
  'Roblox',
  'Brawl Stars',
  'Geometry Dash',
  'Genshin Impact',
].join('\n');

export function BatchChecker({
  selectedMarketplace,
  onMarketplaceChange,
  onBatchComplete,
  onInspectResult,
}: BatchCheckerProps) {
  const [rawInput, setRawInput] = useState(SAMPLE_BATCH_LIST);
  const [results, setResults] = useState<VerificationResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parsedGames = Array.from(
    new Set(
      rawInput
        .split(/[\n,;]+/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
    )
  ).slice(0, 8);

  async function handleRunBatch(e: React.FormEvent) {
    e.preventDefault();
    if (parsedGames.length === 0) {
      setError('Introduce al menos un título de videojuego.');
      return;
    }
    setError(null);
    setIsRunning(true);

    try {
      const response = await fetch('/api/appstore/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          games: parsedGames,
          marketplace: selectedMarketplace,
        }),
      });
      const data = (await response.json()) as {
        results?: VerificationResult[];
        error?: string;
      };
      if (!response.ok) {
        throw new Error(data.error || 'Error al comprobar la lista de juegos.');
      }
      const nextResults = data.results ?? [];
      setResults(nextResults);
      onBatchComplete(nextResults);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Error inesperado al ejecutar la verificación por lotes.'
      );
    } finally {
      setIsRunning(false);
    }
  }

  return (
    <section className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              Verificación por lotes
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              Introduce hasta 8 videojuegos (uno por línea o separados por coma) para comprobar automáticamente cuáles están en Amazon Appstore.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setRawInput(SAMPLE_BATCH_LIST)}
            className="text-xs font-medium text-amber-700 hover:text-amber-800 underline underline-offset-4 whitespace-nowrap shrink-0 self-start sm:self-center"
          >
            Cargar lista de ejemplo
          </button>
        </div>

        <form onSubmit={handleRunBatch} className="mt-5 space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-8">
              <label
                htmlFor="batch-games-input"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Lista de juegos ({parsedGames.length}/8 detectados)
              </label>
              <textarea
                id="batch-games-input"
                rows={5}
                value={rawInput}
                onChange={(e) => setRawInput(e.target.value)}
                placeholder={'Minecraft\nRoblox\nBrawl Stars\nStardew Valley'}
                className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-600/20"
              />
            </div>

            <div className="lg:col-span-4 flex flex-col justify-between gap-4">
              <div>
                <label
                  htmlFor="batch-marketplace"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  Tienda Amazon objetivo
                </label>
                <select
                  id="batch-marketplace"
                  value={selectedMarketplace}
                  onChange={(e) =>
                    onMarketplaceChange(e.target.value as MarketplaceCode)
                  }
                  className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-600/20"
                >
                  {AMAZON_MARKETPLACES.map((mp) => (
                    <option key={mp.code} value={mp.code}>
                      {mp.label}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                disabled={isRunning || parsedGames.length === 0}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700 disabled:bg-slate-200 disabled:text-slate-400 rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                {isRunning ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin shrink-0" aria-hidden="true" />
                    <span>Comprobando {parsedGames.length} juegos...</span>
                  </>
                ) : (
                  <>
                    <ListChecks className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span>Comprobar lista ({parsedGames.length})</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {error && (
            <p role="alert" className="text-sm text-red-700 font-medium">
              {error}
            </p>
          )}
        </form>
      </div>

      {results.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
            <h3 className="text-sm font-semibold text-slate-900">
              Resultados del lote ({results.length})
            </h3>
            <span className="text-xs text-slate-500 tabular-nums">
              {results.filter((r) => r.status === 'published').length} publicados ·{' '}
              {results.filter((r) => r.status === 'different_edition').length} parciales ·{' '}
              {results.filter((r) => r.status === 'not_published').length} no publicados
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                  <th className="py-2.5 px-4">Juego</th>
                  <th className="py-2.5 px-4">Estado</th>
                  <th className="py-2.5 px-4">Desarrollador</th>
                  <th className="py-2.5 px-4 text-right">ASIN</th>
                  <th className="py-2.5 px-4 text-right">Precio</th>
                  <th className="py-2.5 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {results.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="py-2.5 px-4 font-medium text-slate-900">
                      {item.officialAppTitle || item.gameTitle}
                    </td>
                    <td className="py-2.5 px-4">
                      <StatusIndicator status={item.status} compact />
                    </td>
                    <td className="py-2.5 px-4 text-slate-600">
                      {item.developer || '—'}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-xs tabular-nums text-slate-700">
                      {item.asin || '—'}
                    </td>
                    <td className="py-2.5 px-4 text-right tabular-nums text-slate-700">
                      {item.price || '—'}
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <div className="inline-flex items-center justify-end gap-3">
                        <button
                          type="button"
                          onClick={() => onInspectResult(item)}
                          className="text-xs font-semibold text-amber-700 hover:text-amber-800 whitespace-nowrap"
                        >
                          Ver detalle
                        </button>
                        {item.amazonUrl && (
                          <a
                            href={item.amazonUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900 whitespace-nowrap"
                          >
                            <span>Amazon</span>
                            <ArrowUpRight className="w-3 h-3" aria-hidden="true" />
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
