import { useMemo, useState } from 'react';
import { ArrowUpRight, Search, Trash2 } from 'lucide-react';
import type { VerificationResult, VerificationStatus } from '../types.ts';
import { StatusIndicator } from './StatusIndicator.tsx';

interface HistoryTableProps {
  history: VerificationResult[];
  onInspectResult: (result: VerificationResult) => void;
  onClearHistory: () => void;
  onGoToSearch: () => void;
}

type StatusFilter = 'all' | VerificationStatus;

const FILTER_TABS: Array<{ id: StatusFilter; label: string }> = [
  { id: 'all', label: 'Todos' },
  { id: 'published', label: 'Publicados' },
  { id: 'different_edition', label: 'Parciales' },
  { id: 'not_published', label: 'No publicados' },
];

export function HistoryTable({
  history,
  onInspectResult,
  onClearHistory,
  onGoToSearch,
}: HistoryTableProps) {
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [textFilter, setTextFilter] = useState('');

  const filtered = useMemo(() => {
    const q = textFilter.trim().toLowerCase();
    return history.filter((item) => {
      if (filter !== 'all' && item.status !== filter) return false;
      if (!q) return true;
      return (
        item.gameTitle.toLowerCase().includes(q) ||
        item.requestedQuery.toLowerCase().includes(q) ||
        (item.developer?.toLowerCase().includes(q) ?? false) ||
        (item.asin?.toLowerCase().includes(q) ?? false) ||
        item.marketplace.domain.toLowerCase().includes(q)
      );
    });
  }, [history, filter, textFilter]);

  if (history.length === 0) {
    return (
      <section className="bg-white border border-slate-200 rounded-xl p-8 text-center">
        <h2 className="text-lg font-semibold text-slate-900">
          Todavía no hay comprobaciones guardadas
        </h2>
        <p className="text-sm text-slate-600 mt-1.5 max-w-md mx-auto">
          Cada juego que compruebes en el buscador o por lotes aparecerá aquí para que puedas comparar tiendas, revisar su ASIN o exportarlo a CSV.
        </p>
        <button
          type="button"
          onClick={onGoToSearch}
          className="mt-5 inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors whitespace-nowrap"
        >
          <Search className="w-4 h-4" aria-hidden="true" />
          <span>Ir al buscador</span>
        </button>
      </section>
    );
  }

  return (
    <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="p-5 sm:p-6 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-slate-900">
            Historial de comprobaciones ({history.length})
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Haz clic en cualquier fila para abrir el informe completo con sus fuentes verificadas.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search
              className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="search"
              value={textFilter}
              onChange={(e) => setTextFilter(e.target.value)}
              placeholder="Filtrar por juego, ASIN o tienda..."
              aria-label="Filtrar historial"
              className="pl-9 pr-3 py-1.5 text-sm border border-slate-300 rounded-lg bg-white text-slate-900 placeholder:text-slate-400 focus:border-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-600/20"
            />
          </div>

          <div
            role="tablist"
            aria-label="Filtrar por estado"
            className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg"
          >
            {FILTER_TABS.map((tab) => {
              const active = filter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setFilter(tab.id)}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    active
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={onClearHistory}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Limpiar</span>
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
              <th className="py-2.5 px-4">Juego</th>
              <th className="py-2.5 px-4">Estado</th>
              <th className="py-2.5 px-4">Tienda</th>
              <th className="py-2.5 px-4">Desarrollador</th>
              <th className="py-2.5 px-4 text-right">ASIN</th>
              <th className="py-2.5 px-4 text-right">Precio</th>
              <th className="py-2.5 px-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-sm">
            {filtered.map((item) => (
              <tr
                key={item.id}
                className="hover:bg-slate-50 transition-colors"
              >
                <td className="py-2.5 px-4 font-medium text-slate-900">
                  <button
                    type="button"
                    onClick={() => onInspectResult(item)}
                    className="text-left hover:text-amber-700 transition-colors"
                  >
                    {item.officialAppTitle || item.gameTitle}
                  </button>
                </td>
                <td className="py-2.5 px-4">
                  <StatusIndicator status={item.status} compact />
                </td>
                <td className="py-2.5 px-4 font-mono text-xs text-slate-600">
                  {item.marketplace.domain}
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
                      Abrir informe
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
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="py-8 px-4 text-center text-sm text-slate-500"
                >
                  Ninguna comprobación coincide con el filtro actual.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
