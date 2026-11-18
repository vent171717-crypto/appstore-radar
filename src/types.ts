export type MarketplaceCode =
  | 'com'
  | 'es'
  | 'co.uk'
  | 'de'
  | 'fr'
  | 'com.mx'
  | 'ca'
  | 'co.jp';

export interface MarketplaceInfo {
  code: MarketplaceCode;
  domain: string;
  label: string;
  country: string;
  mid: string;
}

export type VerificationStatus =
  | 'published'
  | 'different_edition'
  | 'not_published';

export interface GameSuggestion {
  title: string;
  developer: string;
  genre: string;
  source: 'itunes' | 'steam' | 'amazon';
  iconUrl?: string;
  bundleOrAppId?: string;
}

export interface GroundingSource {
  title: string;
  url: string;
  isAmazon: boolean;
}

export interface VerificationResult {
  id: string;
  requestedQuery: string;
  gameTitle: string;
  marketplace: MarketplaceInfo;
  status: VerificationStatus;
  officialAppTitle: string | null;
  developer: string | null;
  asin: string | null;
  bundleId?: string | null;
  amazonUrl: string | null;
  price: string | null;
  supportedDevices: string[];
  summary: string;
  amazonAutocompleteHints: string[];
  sources: GroundingSource[];
  searchQueriesUsed: string[];
  checkedAt: string;
}
