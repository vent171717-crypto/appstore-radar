import { useEffect, useRef, useState } from 'react';
import { Gamepad2, Loader2, Search, X } from 'lucide-react';
import {
  AMAZON_MARKETPLACES,
  QUICK_GAME_PRESETS,
} from '../constants/marketplaces.ts';
import type { GameSuggestion, MarketplaceCode } from '../types.ts';

interface GameSearchBarProps {
  query: string;
  onQueryChange: (val: string) => void;
  marketplace: MarketplaceCode;
  onMarketplaceChange: (code: MarketplaceCode) => void;
  isLoading: boolean;
  onSearch: (gameTitle: string, developer?: string) => void;
}

export function GameSearchBar({
  query,
  onQueryChange,
  marketplace,
  onMarketplaceChange,
  isLoading,
  onSearch,
}: GameSearchBarProps) {
  const [suggestions, setSuggestions] = useState<GameSuggestion[]>([]);
  const [amazonKeywords, setAmazonKeywords] = useState<string[]>([]);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const skipNextFetchRef = useRef(false);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const trimmed = query.trim();
    if (skipNextFetchRef.current) {
      skipNextFetchRef.current = false;
      return;
    }
    if (trimmed.length < 2) {
      setSuggestions([]);
      setAmazonKeywords([]);
      setIsDropdownOpen(false);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setIsSuggesting(true);
      try {
        const res = await fetch(
          `/api/games/suggest?q=${encodeURIComponent(trimmed)}&marketplace=${encodeURIComponent(
            marketplace
          )}`,
          { signal: controller.signal }
        );
        if (!res.ok) return;
        const data = (await res.json()) as {
          suggestions?: GameSuggestion[];
          amazonKeywords?: string[];
        };
        setSuggestions(data.suggestions ?? []);
        setAmazonKeywords(data.amazonKeywords ?? []);
        if (
          (data.suggestions && data.suggestions.length > 0) ||
          (data.amazonKeywords && data.amazonKeywords.length > 0)
        ) {
          setIsDropdownOpen(true);
        }
      } catch {
        // Ignore aborted or transient suggest errors
      } finally {
        setIsSuggesting(false);
      }
    }, 260);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query, marketplace]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    setIsDropdownOpen(false);
    onSearch(trimmed);
  }

  function handleSelectSuggestion(title: string, developer?: string) {
    skipNextFetchRef.current = true;
    onQueryChange(title);
    setIsDropdownOpen(false);
    onSearch(title, developer);
  }

  return (
    <div ref={containerRef} className="space-y-3">
      <form
        onSubmit={handleSubmit}
        className="relative bg-white border border-slate-200 rounded-xl p-2 flex flex-col md:flex-row items-stretch md:items-center gap-2"
      >
        <div className="relative flex-1 flex items-center">
          <Search
            className="w-4 h-4 text-slate-400 ml-3 shrink-0 pointer-events-none"
            aria-hidden="true"
          />
          <input
            type="text"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            onFocus={() => {
              if (suggestions.length > 0 || amazonKeywords.length > 0) {
                setIsDropdownOpen(true);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setIsDropdownOpen(false);
              }
            }}
            placeholder="Buscar juego (ej. Minecraft, Roblox, Brawl Stars, Geometry Dash)..."
            aria-label="Nombre del videojuego"
            autoComplete="off"
            className="w-full min-h-[44px] px-3 py-2 text-sm sm:text-base text-slate-900 placeholder:text-slate-400 bg-transparent focus:outline-none"
          />
          {isSuggesting && (
            <Loader2
              className="w-4 h-4 text-slate-400 animate-spin mr-2 shrink-0"
              aria-hidden="true"
            />
          )}
          {query.length > 0 && (
            <button
              type="button"
              onClick={() => {
                onQueryChange('');
                setSuggestions([]);
                setAmazonKeywords([]);
                setIsDropdownOpen(false);
              }}
              aria-label="Limpiar búsqueda"
              className="p-2 text-slate-400 hover:text-slate-600 rounded-md transition-colors shrink-0"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          )}
        </div>

        <div className="h-px md:h-7 md:w-px bg-slate-200 shrink-0" aria-hidden="true" />

        <div className="flex items-center gap-2 shrink-0">
          <select
            value={marketplace}
            onChange={(e) => onMarketplaceChange(e.target.value as MarketplaceCode)}
            aria-label="Tienda regional de Amazon"
            className="min-h-[44px] px-3 py-2 text-sm font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg focus:border-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-600/20"
          >
            {AMAZON_MARKETPLACES.map((mp) => (
              <option key={mp.code} value={mp.code}>
                {mp.label}
              </option>
            ))}
          </select>

          <button
            type="submit"
            disabled={isLoading || query.trim().length === 0}
            className="min-h-[44px] px-5 py-2 text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:ring-offset-2"
          >
            {isLoading ? 'Comprobando...' : 'Comprobar'}
          </button>
        </div>

        {isDropdownOpen &&
          (suggestions.length > 0 || amazonKeywords.length > 0) && (
            <div
              role="listbox"
              aria-label="Sugerencias de videojuegos"
              className="absolute left-0 right-0 top-full mt-2 z-20 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden divide-y divide-slate-100"
            >
              {suggestions.length > 0 && (
                <div>
                  <div className="px-4 py-2 text-xs font-semibold text-slate-500 bg-slate-50">
                    Juegos encontrados en catálogos
                  </div>
                  <ul className="divide-y divide-slate-100">
                    {suggestions.map((item, idx) => (
                      <li key={`${item.title}-${item.source}-${idx}`}>
                        <button
                          type="button"
                          onClick={() =>
                            handleSelectSuggestion(
                              item.title,
                              item.source === 'itunes' ? item.developer : undefined
                            )
                          }
                          className="w-full px-4 py-2.5 text-left hover:bg-slate-50 flex items-center justify-between gap-4 transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <Gamepad2
                              className="w-4 h-4 text-slate-400 shrink-0"
                              aria-hidden="true"
                            />
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-slate-900 truncate">
                                {item.title}
                              </p>
                              <p className="text-xs text-slate-500 truncate">
                                {item.developer} · {item.genre}
                              </p>
                            </div>
                          </div>
                          <span className="text-xs font-medium text-amber-700 whitespace-nowrap shrink-0">
                            Comprobar
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {amazonKeywords.length > 0 && (
                <div className="px-4 py-3 bg-slate-50/70">
                  <p className="text-xs font-semibold text-slate-500 mb-2">
                    Autocompletado de Amazon Appstore
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {amazonKeywords.map((kw) => (
                      <button
                        key={kw}
                        type="button"
                        onClick={() => handleSelectSuggestion(kw)}
                        className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:border-amber-500 hover:text-amber-700 rounded-md transition-colors whitespace-nowrap"
                      >
                        {kw}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
      </form>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-slate-500 px-1">
        <span className="font-medium text-slate-600">Pruebas rápidas:</span>
        {QUICK_GAME_PRESETS.map((preset, idx) => (
          <span key={preset.title} className="inline-flex items-center gap-3">
            <button
              type="button"
              onClick={() =>
                handleSelectSuggestion(preset.title, preset.developer)
              }
              className="font-medium text-slate-700 hover:text-amber-700 hover:underline underline-offset-4 transition-colors whitespace-nowrap"
            >
              {preset.title}
            </button>
            {idx < QUICK_GAME_PRESETS.length - 1 && (
              <span aria-hidden="true" className="text-slate-300">
                ·
              </span>
            )}
          </span>
        ))}
      </div>
    </div>
  );
}
