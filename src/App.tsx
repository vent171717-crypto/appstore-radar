import { useEffect, useState } from 'react';
import { BatchChecker } from './components/BatchChecker.tsx';
import { GameSearchBar } from './components/GameSearchBar.tsx';
import { HistoryTable } from './components/HistoryTable.tsx';
import { MarketplaceMatrix } from './components/MarketplaceMatrix.tsx';
import { TopNav, type AppSection } from './components/TopNav.tsx';
import { VerificationReport } from './components/VerificationReport.tsx';
import { getMarketplace } from './constants/marketplaces.ts';
import type { MarketplaceCode, VerificationResult } from './types.ts';

const HISTORY_STORAGE_KEY = 'appstoreradar_history_v1';

function loadSavedHistory(): VerificationResult[] {
  try {
    const raw = window.localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as VerificationResult[]) : [];
  } catch {
    return [];
  }
}

function escapeCsvCell(value: string): string {
  const safe = value.replace(/"/g, '""');
  return `"${safe}"`;
}

export default function App() {
  const [activeSection, setActiveSection] = useState<AppSection>('search');
  const [query, setQuery] = useState('');
  const [marketplace, setMarketplace] = useState<MarketplaceCode>('es');

  const [currentResult, setCurrentResult] = useState<VerificationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingQuery, setLoadingQuery] = useState('');
  const [loadingMarketplaceDomain, setLoadingMarketplaceDomain] = useState('amazon.es');
  const [error, setError] = useState<string | null>(null);

  const [history, setHistory] = useState<VerificationResult[]>(loadSavedHistory);
  const [lastAttempt, setLastAttempt] = useState<{
    query: string;
    marketplace: MarketplaceCode;
    developer?: string;
  } | null>(null);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        HISTORY_STORAGE_KEY,
        JSON.stringify(history.slice(0, 40))
      );
    } catch {
      // Ignore storage quota errors
    }
  }, [history]);

  function addResultsToHistory(newItems: VerificationResult[]) {
    setHistory((prev) => {
      const merged = [...newItems, ...prev];
      const seen = new Set<string>();
      const deduped: VerificationResult[] = [];
      for (const item of merged) {
        const key = `${item.requestedQuery.toLowerCase()}::${item.marketplace.code}`;
        if (!seen.has(key)) {
          seen.add(key);
          deduped.push(item);
        }
      }
      return deduped.slice(0, 40);
    });
  }

  async function runVerification(
    targetQuery: string,
    targetMarketplace: MarketplaceCode,
    developer?: string
  ) {
    const cleanQuery = targetQuery.trim();
    if (!cleanQuery) return;

    const mp = getMarketplace(targetMarketplace);
    setActiveSection('search');
    setQuery(cleanQuery);
    setMarketplace(targetMarketplace);
    setLastAttempt({ query: cleanQuery, marketplace: targetMarketplace, developer });
    setLoadingQuery(cleanQuery);
    setLoadingMarketplaceDomain(mp.domain);
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/appstore/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: cleanQuery,
          developer,
          marketplace: targetMarketplace,
        }),
      });
      const data = (await response.json()) as VerificationResult & { error?: string };
      if (!response.ok) {
        throw new Error(data.error || 'Error al verificar en Amazon Appstore.');
      }
      setCurrentResult(data);
      addResultsToHistory([data]);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudo completar la consulta con el servidor.'
      );
    } finally {
      setIsLoading(false);
    }
  }

  function handleExportCsv() {
    if (history.length === 0) return;

    const headers = [
      'Juego buscado',
      'Título en Amazon Appstore',
      'Estado',
      'Desarrollador',
      'ASIN',
      'Precio',
      'Tienda Amazon',
      'URL Amazon',
      'Dispositivos',
      'Fecha comprobación',
    ];

    const statusText: Record<VerificationResult['status'], string> = {
      published: 'Publicado',
      different_edition: 'Edición distinta / Parcial',
      not_published: 'No publicado',
    };

    const rows = history.map((item) => [
      item.requestedQuery,
      item.officialAppTitle || item.gameTitle,
      statusText[item.status],
      item.developer || '',
      item.asin || '',
      item.price || '',
      item.marketplace.domain,
      item.amazonUrl || '',
      item.supportedDevices.join('; '),
      item.checkedAt,
    ]);

    const csvContent =
      '\uFEFF' +
      [headers, ...rows]
        .map((row) => row.map((cell) => escapeCsvCell(String(cell))).join(','))
        .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `amazon-appstore-verificacion-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  const publishedCount = history.filter((h) => h.status === 'published').length;

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-[#0F172A]">
      <TopNav
        activeSection={activeSection}
        onSelectSection={setActiveSection}
        historyCount={history.length}
        onExportCsv={handleExportCsv}
      />

      <main className="flex-1 max-w-[1200px] w-full mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-8">
        <section id="buscador" className="space-y-5">
          <div className="max-w-3xl space-y-2">
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 text-balance">
              Comprueba si un juego está en Amazon Appstore
            </h1>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
              Busca cualquier videojuego móvil o multiplataforma para verificar automáticamente si cuenta con ficha oficial en Amazon Appstore (Fire Tablet, Fire TV y Android), su ASIN, precio y desarrollador.
            </p>
          </div>

          <GameSearchBar
            query={query}
            onQueryChange={setQuery}
            marketplace={marketplace}
            onMarketplaceChange={setMarketplace}
            isLoading={isLoading}
            onSearch={(title, dev) => runVerification(title, marketplace, dev)}
          />
        </section>

        {activeSection === 'search' && (
          <div className="space-y-8">
            <VerificationReport
              result={currentResult}
              isLoading={isLoading}
              loadingQuery={loadingQuery}
              loadingMarketplaceDomain={loadingMarketplaceDomain}
              error={error}
              onRetry={() => {
                if (lastAttempt) {
                  runVerification(
                    lastAttempt.query,
                    lastAttempt.marketplace,
                    lastAttempt.developer
                  );
                }
              }}
              onRecheckMarketplace={(q, mp, dev) =>
                runVerification(q, mp, dev)
              }
              onRunSample={() => runVerification('Minecraft', marketplace, 'Mojang')}
            />

            {history.length > 0 && (
              <HistoryTable
                history={history}
                onInspectResult={(item) => {
                  setCurrentResult(item);
                  setQuery(item.requestedQuery);
                  setMarketplace(item.marketplace.code);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                onClearHistory={() => setHistory([])}
                onGoToSearch={() => setActiveSection('search')}
              />
            )}
          </div>
        )}

        {activeSection === 'batch' && (
          <BatchChecker
            selectedMarketplace={marketplace}
            onMarketplaceChange={setMarketplace}
            onBatchComplete={(batchResults) => {
              addResultsToHistory(batchResults);
              if (batchResults.length > 0) {
                setCurrentResult(batchResults[0]);
              }
            }}
            onInspectResult={(item) => {
              setCurrentResult(item);
              setQuery(item.requestedQuery);
              setMarketplace(item.marketplace.code);
              setActiveSection('search');
            }}
          />
        )}

        {activeSection === 'history' && (
          <HistoryTable
            history={history}
            onInspectResult={(item) => {
              setCurrentResult(item);
              setQuery(item.requestedQuery);
              setMarketplace(item.marketplace.code);
              setActiveSection('search');
            }}
            onClearHistory={() => setHistory([])}
            onGoToSearch={() => setActiveSection('search')}
          />
        )}

        {activeSection === 'stores' && (
          <MarketplaceMatrix
            activeGameTitle={
              currentResult?.requestedQuery || query || 'Minecraft'
            }
            history={history}
            onCheckMarketplace={(q, mp) => runVerification(q, mp)}
          />
        )}
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-slate-500">
          <span>
            AppstoreRadar · Verificación de catálogo en tiendas Amazon Appstore
          </span>
          <span className="tabular-nums">
            {history.length > 0
              ? `${history.length} comprobaciones guardadas (${publishedCount} publicadas)`
              : 'Sin comprobaciones guardadas en esta sesión'}
          </span>
        </div>
      </footer>
    </div>
  );
}
