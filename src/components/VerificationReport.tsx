import {
  AlertCircle,
  ArrowUpRight,
  ExternalLink,
  RefreshCw,
  Search,
} from 'lucide-react';
import {
  AMAZON_MARKETPLACES,
  buildAmazonAppstoreSearchUrl,
} from '../constants/marketplaces.ts';
import type { MarketplaceCode, VerificationResult } from '../types.ts';
import { StatusIndicator } from './StatusIndicator.tsx';

interface VerificationReportProps {
  result: VerificationResult | null;
  isLoading: boolean;
  loadingQuery: string;
  loadingMarketplaceDomain: string;
  error: string | null;
  onRetry: () => void;
  onRecheckMarketplace: (query: string, marketplace: MarketplaceCode, developer?: string) => void;
  onRunSample: () => void;
}

function formatDateTime(iso: string): string {
  try {
    return new Intl.DateTimeFormat('es-ES', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function VerificationReport({
  result,
  isLoading,
  loadingQuery,
  loadingMarketplaceDomain,
  error,
  onRetry,
  onRecheckMarketplace,
  onRunSample,
}: VerificationReportProps) {
  if (isLoading) {
    return (
      <section
        aria-live="polite"
        aria-label="Comprobando disponibilidad en Amazon Appstore"
        className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8"
      >
        <div className="flex flex-col gap-2 pb-6 border-b border-slate-200">
          <div className="h-4 w-56 bg-slate-200 rounded animate-pulse" />
          <div className="h-7 w-72 bg-slate-200 rounded animate-pulse mt-1" />
          <p className="text-sm text-slate-600 mt-1">
            Comprobando <span className="font-semibold text-slate-900">{loadingQuery}</span> en{' '}
            <span className="font-mono text-slate-800">{loadingMarketplaceDomain}</span>...
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-6">
          <div className="lg:col-span-7 space-y-4">
            <div className="h-4 w-full bg-slate-100 rounded animate-pulse" />
            <div className="h-4 w-11/12 bg-slate-100 rounded animate-pulse" />
            <div className="h-4 w-4/5 bg-slate-100 rounded animate-pulse" />
            <div className="h-20 w-full bg-slate-50 rounded animate-pulse mt-4" />
          </div>
          <div className="lg:col-span-5 space-y-3">
            <div className="h-4 w-40 bg-slate-100 rounded animate-pulse" />
            <div className="h-10 w-full bg-slate-100 rounded animate-pulse" />
            <div className="h-10 w-full bg-slate-100 rounded animate-pulse" />
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    const manualSearchUrl = buildAmazonAppstoreSearchUrl(
      loadingQuery || 'games',
      AMAZON_MARKETPLACES.find((m) => m.domain === loadingMarketplaceDomain)?.code ?? 'com'
    );

    return (
      <section
        role="alert"
        className="bg-white border border-red-200 rounded-xl p-6 sm:p-8"
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" aria-hidden="true" />
            <div className="space-y-1">
              <h2 className="text-base font-semibold text-slate-900">
                No se pudo completar la verificación
              </h2>
              <p className="text-sm text-slate-600">{error}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <a
              href={manualSearchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              <span>Buscar en {loadingMarketplaceDomain}</span>
              <ExternalLink className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            </a>
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              <RefreshCw className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>Reintentar</span>
            </button>
          </div>
        </div>
      </section>
    );
  }

  if (!result) {
    return (
      <section className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-2xl">
            <h2 className="text-lg font-semibold text-slate-900">
              Listo para verificar cualquier videojuego
            </h2>
            <p className="text-sm text-slate-600 mt-1.5 leading-relaxed">
              Escribe el título de un juego en el buscador superior o selecciona una sugerencia para comprobar en tiempo real su ficha oficial, ASIN, desarrollador y compatibilidad con Fire Tablet, Fire TV y Android en Amazon Appstore.
            </p>
          </div>
          <button
            type="button"
            onClick={onRunSample}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:ring-offset-2"
          >
            <Search className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>Comprobar Minecraft</span>
          </button>
        </div>
      </section>
    );
  }

  const fallbackSearchUrl = buildAmazonAppstoreSearchUrl(
    result.gameTitle || result.requestedQuery,
    result.marketplace.code
  );

  return (
    <section
      aria-label="Resultado de la verificación"
      className="bg-white border border-slate-200 rounded-xl overflow-hidden"
    >
      <div className="p-6 sm:p-8 border-b border-slate-200">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
          <div className="space-y-2 min-w-0">
            <StatusIndicator status={result.status} />

            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              {result.officialAppTitle || result.gameTitle}
            </h2>

            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs sm:text-sm text-slate-600">
              <span>
                Búsqueda: <strong className="font-medium text-slate-900">{result.requestedQuery}</strong>
              </span>
              <span aria-hidden="true" className="text-slate-300">·</span>
              <span>
                Desarrollador:{' '}
                <strong className="font-medium text-slate-900">
                  {result.developer || 'No especificado'}
                </strong>
              </span>
              <span aria-hidden="true" className="text-slate-300">·</span>
              <span>
                ASIN:{' '}
                <span className="font-mono tabular-nums font-medium text-slate-900">
                  {result.asin || 'No disponible'}
                </span>
              </span>
              {result.bundleId && (
                <>
                  <span aria-hidden="true" className="text-slate-300">·</span>
                  <span>
                    Paquete:{' '}
                    <span className="font-mono font-medium text-slate-900">
                      {result.bundleId}
                    </span>
                  </span>
                </>
              )}
              <span aria-hidden="true" className="text-slate-300">·</span>
              <span>
                Precio:{' '}
                <span className="tabular-nums font-medium text-slate-900">
                  {result.price || 'Sin confirmar'}
                </span>
              </span>
              <span aria-hidden="true" className="text-slate-300">·</span>
              <span>
                Tienda:{' '}
                <span className="font-mono font-medium text-slate-900">
                  {result.marketplace.domain}
                </span>
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {result.amazonUrl && (
              <a
                href={result.amazonUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:ring-offset-2"
              >
                <span>Abrir en Amazon</span>
                <ArrowUpRight className="w-4 h-4 shrink-0" aria-hidden="true" />
              </a>
            )}
            <a
              href={fallbackSearchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              <span>Buscar en {result.marketplace.domain}</span>
              <ExternalLink className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            </a>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
        <div className="lg:col-span-7 p-6 sm:p-8 space-y-6">
          <div>
            <h3 className="text-xs font-semibold tracking-wide text-slate-500 mb-2">
              Resumen de verificación
            </h3>
            <p className="text-[15px] leading-relaxed text-slate-700">
              {result.summary}
            </p>
          </div>

          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-5 border-t border-slate-100 text-sm">
            <div>
              <dt className="text-xs font-medium text-slate-500">
                Dispositivos compatibles detectados
              </dt>
              <dd className="mt-1 font-medium text-slate-900">
                {result.supportedDevices.length > 0
                  ? result.supportedDevices.join(' · ')
                  : 'No confirmados en la ficha'}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-slate-500">
                Última comprobación
              </dt>
              <dd className="mt-1 font-mono text-xs sm:text-sm tabular-nums text-slate-900">
                {formatDateTime(result.checkedAt)}
              </dd>
            </div>
          </dl>

          <div className="pt-5 border-t border-slate-100">
            <h3 className="text-xs font-semibold text-slate-500 mb-2">
              Autocompletado oficial en {result.marketplace.domain} (Apps y Juegos)
            </h3>
            {result.amazonAutocompleteHints.length > 0 ? (
              <p className="text-sm text-slate-700">
                {result.amazonAutocompleteHints.join(' · ')}
              </p>
            ) : (
              <p className="text-sm text-slate-500">
                Sin coincidencias directas en el autocompletado móvil de Amazon para esta búsqueda.
              </p>
            )}
          </div>

          <div className="pt-5 border-t border-slate-100">
            <h3 className="text-xs font-semibold text-slate-500 mb-2.5">
              Comprobar este juego en otra tienda regional
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {AMAZON_MARKETPLACES.map((mp) => {
                const isCurrent = mp.code === result.marketplace.code;
                return (
                  <button
                    key={mp.code}
                    type="button"
                    disabled={isCurrent}
                    onClick={() =>
                      onRecheckMarketplace(
                        result.requestedQuery,
                        mp.code,
                        result.developer ?? undefined
                      )
                    }
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                      isCurrent
                        ? 'bg-slate-900 text-white cursor-default'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {mp.domain}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="lg:col-span-5 p-6 sm:p-8 space-y-6 bg-slate-50/60">
          <div>
            <h3 className="text-xs font-semibold text-slate-500 mb-3">
              Fuentes web consultadas ({result.sources.length})
            </h3>
            {result.sources.length > 0 ? (
              <ul className="divide-y divide-slate-200 border-y border-slate-200">
                {result.sources.slice(0, 6).map((src, idx) => (
                  <li key={`${src.url}-${idx}`}>
                    <a
                      href={src.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-start justify-between gap-3 py-3 text-sm hover:text-amber-700 transition-colors group"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-slate-900 group-hover:text-amber-700 truncate">
                          {src.title}
                        </p>
                        <p className="text-xs text-slate-500 truncate mt-0.5">
                          {src.isAmazon ? 'Sitio oficial de Amazon' : 'Referencia web externa'}
                        </p>
                      </div>
                      <ExternalLink
                        className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-600 shrink-0 mt-1"
                        aria-hidden="true"
                      />
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500">
                No se devolvieron enlaces externos indexados para esta consulta.
              </p>
            )}
          </div>

          {result.searchQueriesUsed.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-slate-500 mb-2">
                Consultas ejecutadas
              </h3>
              <ul className="space-y-1.5">
                {result.searchQueriesUsed.slice(0, 4).map((q, idx) => (
                  <li
                    key={`${q}-${idx}`}
                    className="font-mono text-xs text-slate-600 break-words"
                  >
                    {q}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
