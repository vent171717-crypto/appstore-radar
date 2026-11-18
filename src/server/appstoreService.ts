import { getMarketplace } from '../constants/marketplaces.ts';
import type {
  GameSuggestion,
  GroundingSource,
  MarketplaceCode,
  MarketplaceInfo,
  VerificationResult,
  VerificationStatus,
} from '../types.ts';

const verificationCache = new Map<
  string,
  { result: VerificationResult; expiresAt: number }
>();
const CACHE_TTL_MS = 15 * 60 * 1000;

const BROWSER_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9,es;q=0.8',
};

function decodeHtmlEntities(input: string): string {
  return input
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;|&#34;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeText(input: string): string {
  return decodeHtmlEntities(input)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanSearchQuery(input: string): string {
  return input
    .replace(/[:\-–—!?™®©]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function fetchAmazonMobileAppSuggestions(
  query: string,
  marketplace: MarketplaceInfo
): Promise<string[]> {
  try {
    const url = `https://completion.${marketplace.domain}/api/2017/suggestions?mid=${encodeURIComponent(
      marketplace.mid
    )}&alias=mobile-apps&prefix=${encodeURIComponent(query)}`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; AppstoreRadar/1.0)',
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(3500),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as {
      suggestions?: Array<{ value?: string }>;
    };
    const values = (data.suggestions ?? [])
      .map((s) => s.value?.trim())
      .filter((v): v is string => Boolean(v));
    return Array.from(new Set(values)).slice(0, 6);
  } catch {
    return [];
  }
}

export async function fetchItunesGameSuggestions(query: string): Promise<GameSuggestion[]> {
  try {
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(
      query
    )}&entity=software&limit=8`;
    const res = await fetch(url, {
      signal: AbortSignal.timeout(3500),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as {
      results?: Array<{
        trackName?: string;
        artistName?: string;
        primaryGenreName?: string;
        bundleId?: string;
      }>;
    };
    const results = data.results ?? [];
    const gamesFirst = results.sort((a, b) => {
      const aIsGame = a.primaryGenreName === 'Games' ? 0 : 1;
      const bIsGame = b.primaryGenreName === 'Games' ? 0 : 1;
      return aIsGame - bIsGame;
    });
    return gamesFirst
      .filter((r) => Boolean(r.trackName))
      .slice(0, 5)
      .map((r) => ({
        title: r.trackName!,
        developer: r.artistName ?? 'Desarrollador desconocido',
        genre: r.primaryGenreName ?? 'Juego',
        source: 'itunes' as const,
        bundleOrAppId: r.bundleId,
      }));
  } catch {
    return [];
  }
}

export async function fetchSteamGameSuggestions(query: string): Promise<GameSuggestion[]> {
  try {
    const url = `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(
      query
    )}&l=spanish&cc=us`;
    const res = await fetch(url, {
      signal: AbortSignal.timeout(3500),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as {
      items?: Array<{
        id?: number;
        name?: string;
      }>;
    };
    return (data.items ?? [])
      .filter((item) => Boolean(item.name))
      .slice(0, 4)
      .map((item) => ({
        title: item.name!,
        developer: 'Catálogo Steam / Multiplataforma',
        genre: 'Videojuego',
        source: 'steam' as const,
        bundleOrAppId: item.id ? String(item.id) : undefined,
      }));
  } catch {
    return [];
  }
}

export async function getGameSuggestions(
  query: string,
  marketplaceCode?: string
): Promise<{ suggestions: GameSuggestion[]; amazonKeywords: string[] }> {
  const marketplace = getMarketplace(marketplaceCode);
  const [amazonKeywords, itunesGames, steamGames] = await Promise.all([
    fetchAmazonMobileAppSuggestions(query, marketplace),
    fetchItunesGameSuggestions(query),
    fetchSteamGameSuggestions(query),
  ]);

  const merged: GameSuggestion[] = [];
  const seenTitles = new Set<string>();

  for (const item of [...itunesGames, ...steamGames]) {
    const key = item.title.toLowerCase();
    if (!seenTitles.has(key)) {
      seenTitles.add(key);
      merged.push(item);
    }
  }

  return {
    suggestions: merged.slice(0, 8),
    amazonKeywords,
  };
}

interface ParsedSearchCard {
  asin: string;
  title: string;
  priceText: string | null;
}

function parseAmazonMobileAppCards(html: string): ParsedSearchCard[] {
  const chunks = html.split(/role="listitem"/).slice(1);
  const results: ParsedSearchCard[] = [];
  const seen = new Set<string>();

  for (const chunk of chunks) {
    const asin = chunk.match(/data-asin="(B0[A-Z0-9]{8})"/)?.[1];
    if (!asin || seen.has(asin)) continue;

    const h2 = chunk.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i)?.[1];
    if (!h2) continue;
    const title = decodeHtmlEntities(h2.replace(/<[^>]+>/g, ' '));
    if (!title) continue;

    const plain = decodeHtmlEntities(
      chunk
        .replace(/<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
    );

    const isAppCard =
      (/\bApp\b/.test(plain) || /Appstore for Android/i.test(plain)) &&
      !/\bKindle\b|\bMP3 Music\b|\bAudible\b|\bPaperback\b|\bHardcover\b/i.test(plain);

    if (!isAppCard) continue;

    const priceMatch =
      plain.match(/\bUSD\s*0\.00\b/i)
        ? 'Gratis'
        : plain.match(/\b(?:USD|\$|€|£|¥)\s*\d+(?:[.,]\d{1,2})?\b/)?.[0] ?? null;

    seen.add(asin);
    results.push({ asin, title, priceText: priceMatch });
  }

  return results;
}

async function fetchAmazonCatalogSearch(
  domain: string,
  searchTerm: string,
  useEnglishParam: boolean
): Promise<{ ok: boolean; cards: ParsedSearchCard[]; searchUrl: string }> {
  const langParam = useEnglishParam ? '&language=en_US' : '';
  const searchUrl = `https://www.${domain}/s?k=${encodeURIComponent(
    searchTerm
  )}&i=mobile-apps${langParam}`;

  try {
    const res = await fetch(searchUrl, {
      headers: BROWSER_HEADERS,
      signal: AbortSignal.timeout(5500),
    });
    if (!res.ok) {
      return { ok: false, cards: [], searchUrl };
    }
    const html = await res.text();
    const isBlocked =
      html.length < 15000 ||
      /api-services-support@amazon\.com|Enter the characters you see below/i.test(html);
    if (isBlocked) {
      return { ok: false, cards: [], searchUrl };
    }
    return { ok: true, cards: parseAmazonMobileAppCards(html), searchUrl };
  } catch {
    return { ok: false, cards: [], searchUrl };
  }
}

interface ProductPageDetails {
  isAppstoreListing: boolean;
  officialTitle: string | null;
  developer: string | null;
  bundleId: string | null;
  price: string | null;
  supportedDevices: string[];
  dpUrl: string;
}

async function fetchAmazonAppProductDetails(
  domain: string,
  asin: string
): Promise<ProductPageDetails | null> {
  const dpUrl = `https://www.${domain}/dp/${asin}?language=en_US`;
  try {
    const res = await fetch(dpUrl, {
      headers: BROWSER_HEADERS,
      signal: AbortSignal.timeout(5500),
    });
    if (!res.ok) return null;
    const html = await res.text();
    if (
      html.length < 15000 ||
      /api-services-support@amazon\.com|Enter the characters you see below/i.test(html)
    ) {
      return null;
    }

    const storeId = html.match(
      /<meta[^>]+name="appstore:store_id"[^>]+content="([^"]*)"/i
    )?.[1];
    const bundleId =
      html.match(
        /<meta[^>]+name="appstore:bundle_id"[^>]+content="([^"]*)"/i
      )?.[1] ?? null;
    const isAppstoreListing =
      Boolean(storeId) || /Appstore for Android|mas-atf-product-title/i.test(html);

    if (!isAppstoreListing) {
      return {
        isAppstoreListing: false,
        officialTitle: null,
        developer: null,
        bundleId: null,
        price: null,
        supportedDevices: [],
        dpUrl,
      };
    }

    const rawTitle =
      html.match(/id="productTitle"[^>]*>([\s\S]*?)<\/span>/i)?.[1] ??
      html.match(/<meta[^>]+property="og:title"[^>]+content="([^"]*)"/i)?.[1] ??
      null;
    const officialTitle = rawTitle
      ? decodeHtmlEntities(rawTitle.replace(/<[^>]+>/g, ' '))
      : null;

    const rawBrand = html.match(
      /<a[^>]+id="brand"[^>]*>([\s\S]*?)<\/a>/i
    )?.[1];
    const developer = rawBrand
      ? decodeHtmlEntities(rawBrand.replace(/<[^>]+>/g, ' '))
      : null;

    const rawPrice =
      html.match(/id="actualPriceValue"[^>]*>([\s\S]*?)<\/span>/i)?.[1] ??
      html.match(
        /class="a-price[^"]*"[^>]*>[\s\S]*?<span class="a-offscreen">([\s\S]*?)<\/span>/i
      )?.[1] ??
      null;
    let price: string | null = rawPrice
      ? decodeHtmlEntities(rawPrice.replace(/<[^>]+>/g, ' '))
      : null;
    if (price && /free|gratis|0\.00|¥0\b/i.test(price)) {
      price = 'Gratis';
    }

    const devices: string[] = [];
    if (/Fire Tablet|Kindle Fire/i.test(html)) devices.push('Fire Tablet');
    if (/Fire TV/i.test(html)) devices.push('Fire TV');
    if (/Appstore for Android|Android/i.test(html)) devices.push('Android');
    if (devices.length === 0) devices.push('Android', 'Fire Tablet');

    return {
      isAppstoreListing: true,
      officialTitle,
      developer,
      bundleId: bundleId ? decodeHtmlEntities(bundleId) : null,
      price,
      supportedDevices: devices,
      dpUrl,
    };
  } catch {
    return null;
  }
}

const CLONE_OR_COMPANION_WORDS = [
  'mods for',
  'mod for',
  'addons for',
  'addon for',
  'guide for',
  'guides for',
  'cheats for',
  'tips for',
  'walkthrough',
  'tutorial',
  'papercraft',
  'skin for',
  'skins for',
  'wallpaper',
  'unofficial',
  'stat tracker',
  'stats and tools',
  'installer',
  'helper for',
  'arena heroes for',
  'original',
];

function isLikelySpamOrCloneTitle(appTitle: string, query: string): boolean {
  const normApp = normalizeText(appTitle);
  const normQuery = normalizeText(query);
  if (normApp === normQuery) return false;

  for (const spam of CLONE_OR_COMPANION_WORDS) {
    if (normApp.includes(spam) && !normQuery.includes(spam)) {
      return true;
    }
  }
  if (/^(free|new)\s+/.test(normApp) && !/^(free|new)\s+/.test(normQuery)) {
    return true;
  }
  return false;
}

function scoreTitleMatch(appTitle: string, query: string): number {
  const normApp = normalizeText(appTitle);
  const normQuery = normalizeText(query);
  if (!normApp || !normQuery) return 0;
  if (normApp === normQuery) return 100;

  if (isLikelySpamOrCloneTitle(appTitle, query)) return 5;

  const baseQuery = normQuery.split(/\s+/)[0];
  if (
    normApp.startsWith(normQuery + ' ') &&
    /(edition|lite|pocket|for fire|tv|classic|remastered|mobile)/i.test(
      normApp.slice(normQuery.length)
    )
  ) {
    return 80;
  }

  if (normApp.startsWith(normQuery + ' ')) return 65;

  const queryWords = normQuery.split(' ').filter((w) => w.length >= 2);
  const appWords = new Set(normApp.split(' '));
  const matchedWords = queryWords.filter((w) => appWords.has(w)).length;
  if (queryWords.length > 0 && matchedWords === queryWords.length) {
    return Math.max(35, 60 - Math.abs(normApp.length - normQuery.length));
  }
  if (baseQuery && normApp.includes(baseQuery) && matchedWords >= 1) {
    return 25;
  }
  return 10;
}

function developersAreCompatible(
  amazonDev: string | null,
  referenceDev: string | null
): boolean {
  if (!amazonDev || !referenceDev) return true;
  const a = normalizeText(amazonDev);
  const b = normalizeText(referenceDev);
  if (!a || !b) return true;
  if (a.includes(b) || b.includes(a)) return true;
  const aFirst = a.split(' ')[0];
  const bFirst = b.split(' ')[0];
  return aFirst.length >= 4 && aFirst === bFirst;
}

export async function verifyGameOnAmazonAppstore(params: {
  query: string;
  developer?: string;
  marketplaceCode?: MarketplaceCode;
}): Promise<VerificationResult> {
  const marketplace = getMarketplace(params.marketplaceCode);
  const query = params.query.trim();
  const cleanQuery = cleanSearchQuery(query);
  const developerHint = params.developer?.trim() || null;

  const cacheKey = `${query.toLowerCase()}::${(developerHint ?? '').toLowerCase()}::${marketplace.code}`;
  const cached = verificationCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return {
      ...cached.result,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    };
  }

  const [amazonAutocompleteHints, itunesRefs, regionalSearch] = await Promise.all([
    fetchAmazonMobileAppSuggestions(cleanQuery, marketplace),
    developerHint ? Promise.resolve([]) : fetchItunesGameSuggestions(cleanQuery),
    fetchAmazonCatalogSearch(marketplace.domain, cleanQuery, false),
  ]);

  const referenceDeveloper =
    developerHint ??
    itunesRefs.find(
      (r) =>
        normalizeText(r.title) === normalizeText(query) ||
        normalizeText(r.title).startsWith(normalizeText(cleanQuery))
    )?.developer ??
    null;

  let activeDomain = marketplace.domain;
  let searchResult = regionalSearch;
  const usedGlobalFallback = !regionalSearch.ok && marketplace.code !== 'co.jp';

  if (usedGlobalFallback) {
    activeDomain = 'amazon.co.jp';
    searchResult = await fetchAmazonCatalogSearch('amazon.co.jp', cleanQuery, true);
  }

  // If the full title with subtitle returned 0 cards, try the base title before ":"
  if (searchResult.ok && searchResult.cards.length === 0 && query.includes(':')) {
    const basePart = cleanSearchQuery(query.split(':')[0]);
    if (basePart.length >= 3 && basePart.toLowerCase() !== cleanQuery.toLowerCase()) {
      const retrySearch = await fetchAmazonCatalogSearch(
        activeDomain,
        basePart,
        activeDomain === 'amazon.co.jp'
      );
      if (retrySearch.ok && retrySearch.cards.length > 0) {
        searchResult = retrySearch;
      }
    }
  }

  if (!searchResult.ok) {
    throw new Error(
      `No se pudo acceder al catálogo público de Amazon en este momento (${marketplace.domain}). Inténtalo de nuevo en unos segundos.`
    );
  }

  const ranked = searchResult.cards
    .map((card) => ({
      card,
      score: scoreTitleMatch(card.title, query),
    }))
    .sort((a, b) => b.score - a.score);

  const topCandidate = ranked[0];
  let productDetails: ProductPageDetails | null = null;

  if (topCandidate && topCandidate.score >= 30) {
    productDetails = await fetchAmazonAppProductDetails(
      activeDomain,
      topCandidate.card.asin
    );
  }

  const resolvedTitle = productDetails?.officialTitle || topCandidate?.card.title || null;
  const resolvedDeveloper = productDetails?.developer || null;
  const devMatches = developersAreCompatible(resolvedDeveloper, referenceDeveloper);

  let status: VerificationStatus = 'not_published';
  if (
    topCandidate &&
    productDetails?.isAppstoreListing &&
    topCandidate.score >= 85 &&
    devMatches
  ) {
    status = 'published';
  } else if (
    topCandidate &&
    productDetails?.isAppstoreListing &&
    topCandidate.score >= 55 &&
    devMatches
  ) {
    status = 'different_edition';
  } else {
    status = 'not_published';
  }

  const asin = status === 'not_published' ? null : topCandidate?.card.asin ?? null;
  const amazonUrl = asin ? `https://www.${marketplace.domain}/dp/${asin}` : null;
  const price =
    status === 'not_published'
      ? null
      : productDetails?.price ?? topCandidate?.card.priceText ?? null;

  const sources: GroundingSource[] = [];
  if (asin) {
    sources.push({
      title: `${resolvedTitle ?? query} — Ficha en ${marketplace.domain}`,
      url: `https://www.${marketplace.domain}/dp/${asin}`,
      isAmazon: true,
    });
    if (activeDomain !== marketplace.domain) {
      sources.push({
        title: `${resolvedTitle ?? query} — Ficha verificada (${activeDomain})`,
        url: `https://www.${activeDomain}/dp/${asin}?language=en_US`,
        isAmazon: true,
      });
    }
  }
  sources.push({
    title: `Resultados de Apps y Juegos en ${marketplace.domain}`,
    url: `https://www.${marketplace.domain}/s?k=${encodeURIComponent(cleanQuery)}&i=mobile-apps`,
    isAmazon: true,
  });

  let summary: string;
  if (status === 'published') {
    summary = `Se encontró la ficha oficial "${resolvedTitle}" (ASIN ${asin}) en la categoría Apps y Juegos de Amazon Appstore${
      resolvedDeveloper ? `, publicada por ${resolvedDeveloper}` : ''
    }${
      productDetails?.bundleId ? ` con paquete ${productDetails.bundleId}` : ''
    }. ${
      usedGlobalFallback
        ? `Verificado en el catálogo global de Amazon Appstore (${activeDomain}) porque ${marketplace.domain} bloqueó la consulta directa desde servidor; el ASIN es compatible con el enlace en ${marketplace.domain}.`
        : `Comprobado directamente en ${marketplace.domain}.`
    }`;
  } else if (status === 'different_edition') {
    summary = `No apareció el título exacto "${query}", pero sí una edición o variante relacionada en Amazon Appstore: "${resolvedTitle}" (ASIN ${asin})${
      resolvedDeveloper ? ` de ${resolvedDeveloper}` : ''
    }. Revisa la ficha para confirmar si corresponde a la edición que buscas.`;
  } else if (ranked.length > 0) {
    const sampleTitles = ranked
      .slice(0, 2)
      .map((r) => `"${r.card.title}"`)
      .join(' y ');
    summary = `No se encontró una publicación oficial de "${query}"${
      referenceDeveloper ? ` (${referenceDeveloper})` : ''
    } en Amazon Appstore. Solo aparecieron aplicaciones de terceros, clones o complementos relacionados como ${sampleTitles}.`;
  } else {
    summary = `No se encontraron aplicaciones para "${query}" en el catálogo móvil de Amazon Appstore (${activeDomain}). Es probable que este juego solo esté disponible en Google Play, Apple App Store u otras plataformas.`;
  }

  const result: VerificationResult = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    requestedQuery: query,
    gameTitle: status === 'not_published' ? query : resolvedTitle ?? query,
    marketplace,
    status,
    officialAppTitle: status === 'not_published' ? null : resolvedTitle,
    developer:
      status === 'not_published'
        ? referenceDeveloper
        : resolvedDeveloper ?? referenceDeveloper,
    asin,
    bundleId: status === 'not_published' ? null : productDetails?.bundleId ?? null,
    amazonUrl,
    price,
    supportedDevices:
      status === 'not_published' ? [] : productDetails?.supportedDevices ?? [],
    summary,
    amazonAutocompleteHints,
    sources,
    searchQueriesUsed: [cleanQuery],
    checkedAt: new Date().toISOString(),
  };

  verificationCache.set(cacheKey, {
    result,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });

  return result;
}

export async function verifyBatchOnAmazonAppstore(params: {
  games: string[];
  marketplaceCode?: MarketplaceCode;
}): Promise<VerificationResult[]> {
  const cleaned = Array.from(
    new Set(
      params.games
        .map((g) => (typeof g === 'string' ? g.trim() : ''))
        .filter((g) => g.length > 0)
    )
  ).slice(0, 8);

  const results: VerificationResult[] = [];
  const concurrency = 2;
  for (let i = 0; i < cleaned.length; i += concurrency) {
    const slice = cleaned.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      slice.map((title) =>
        verifyGameOnAmazonAppstore({
          query: title,
          marketplaceCode: params.marketplaceCode,
        })
      )
    );
    results.push(...batchResults);
  }
  return results;
}

export function formatApiError(error: unknown): { statusCode: number; message: string } {
  const raw = error instanceof Error ? error.message : String(error);
  return {
    statusCode: 500,
    message:
      raw.length > 220
        ? 'Error al consultar el catálogo de Amazon Appstore. Inténtalo de nuevo.'
        : raw,
  };
}
