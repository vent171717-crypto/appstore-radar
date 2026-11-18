import { ExternalLink, Search } from 'lucide-react';
import {
  AMAZON_MARKETPLACES,
  buildAmazonAppstoreSearchUrl,
} from '../constants/marketplaces.ts';
import type { MarketplaceCode, VerificationResult } from '../types.ts';
import { StatusIndicator } from './StatusIndicator.tsx';

interface MarketplaceMatrixProps {
  activeGameTitle: string;
  history: VerificationResult[];
  onCheckMarketplace: (query: string, marketplace: MarketplaceCode) => void;
}

export function MarketplaceMatrix({
  activeGameTitle,
  history,
  onCheckMarketplace,
}: MarketplaceMatrixProps) {
  const targetGame = activeGameTitle.trim() || 'Minecraft';

  return (
    <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="p-6 border-b border-slate-200">
        <h2 className="text-lg font-bold tracking-tight text-slate-900">
          Tiendas regionales de Amazon Appstore
        </h2>
        <p className="text-sm text-slate-600 mt-1">
          La disponibilidad de un videojuego puede variar según el país de la cuenta de Amazon. Comprueba{' '}
          <strong className="font-semibold text-slate-900">{targetGame}</strong> en cualquiera de estas tiendas oficiales:
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
              <th className="py-2.5 px-4">País</th>
              <th className="py-2.5 px-4">Dominio</th>
              <th className="py-2.5 px-4">Último estado para {targetGame}</th>
              <th className="py-2.5 px-4 text-right">ASIN</th>
              <th className="py-2.5 px-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-sm">
            {AMAZON_MARKETPLACES.map((mp) => {
              const latestForStore = history.find(
                (item) =>
                  item.marketplace.code === mp.code &&
                  (item.requestedQuery.toLowerCase() === targetGame.toLowerCase() ||
                    item.gameTitle.toLowerCase() === targetGame.toLowerCase())
              );

              return (
                <tr key={mp.code} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-4 font-medium text-slate-900">
                    {mp.country}
                  </td>
                  <td className="py-3 px-4 font-mono text-xs text-slate-700">
                    {mp.domain}
                  </td>
                  <td className="py-3 px-4">
                    {latestForStore ? (
                      <StatusIndicator status={latestForStore.status} compact />
                    ) : (
                      <span className="text-xs text-slate-400">Sin comprobar</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-xs tabular-nums text-slate-700">
                    {latestForStore?.asin || '—'}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="inline-flex items-center justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => onCheckMarketplace(targetGame, mp.code)}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 hover:text-amber-800 whitespace-nowrap"
                      >
                        <Search className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Comprobar</span>
                      </button>
                      <a
                        href={buildAmazonAppstoreSearchUrl(targetGame, mp.code)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900 whitespace-nowrap"
                      >
                        <span>Catálogo</span>
                        <ExternalLink className="w-3 h-3" aria-hidden="true" />
                      </a>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
