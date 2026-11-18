import { Download } from 'lucide-react';

export type AppSection = 'search' | 'batch' | 'history' | 'stores';

interface TopNavProps {
  activeSection: AppSection;
  onSelectSection: (section: AppSection) => void;
  historyCount: number;
  onExportCsv: () => void;
}

const NAV_ITEMS: Array<{ id: AppSection; label: string }> = [
  { id: 'search', label: 'Buscador' },
  { id: 'batch', label: 'Por lotes' },
  { id: 'history', label: 'Historial' },
  { id: 'stores', label: 'Tiendas' },
];

export function TopNav({
  activeSection,
  onSelectSection,
  historyCount,
  onExportCsv,
}: TopNavProps) {
  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
        <a
          href="#buscador"
          onClick={(e) => {
            e.preventDefault();
            onSelectSection('search');
          }}
          className="text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 rounded"
        >
          AppstoreRadar
        </a>

        <nav
          aria-label="Navegación principal"
          className="hidden md:flex items-center gap-6"
        >
          {NAV_ITEMS.map((item) => {
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectSection(item.id)}
                className={`relative py-5 text-sm font-medium transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 rounded ${
                  isActive
                    ? 'text-slate-900'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {item.label}
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 bottom-0 h-0.5 bg-amber-600"
                  />
                )}
              </button>
            );
          })}
        </nav>

        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={onExportCsv}
            disabled={historyCount === 0}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:ring-offset-2"
          >
            <Download className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>Exportar CSV</span>
          </button>
        </div>
      </div>

      <nav
        aria-label="Navegación móvil"
        className="flex md:hidden items-center gap-4 px-4 border-t border-slate-100 overflow-x-auto"
      >
        {NAV_ITEMS.map((item) => {
          const isActive = activeSection === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectSection(item.id)}
              className={`py-2.5 text-xs font-medium border-b-2 whitespace-nowrap shrink-0 transition-colors ${
                isActive
                  ? 'border-amber-600 text-slate-900'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </nav>
    </header>
  );
}
