import type { MarketplaceCode, MarketplaceInfo } from '../types.ts';

export const AMAZON_MARKETPLACES: MarketplaceInfo[] = [
  {
    code: 'com',
    domain: 'amazon.com',
    label: 'Amazon.com (EE. UU.)',
    country: 'Estados Unidos',
    mid: 'ATVPDKIKX0DER',
  },
  {
    code: 'es',
    domain: 'amazon.es',
    label: 'Amazon.es (España)',
    country: 'España',
    mid: 'A1RKKUPIHCS9HS',
  },
  {
    code: 'com.mx',
    domain: 'amazon.com.mx',
    label: 'Amazon.com.mx (México)',
    country: 'México',
    mid: 'A1AM78C64UM0Y8',
  },
  {
    code: 'co.uk',
    domain: 'amazon.co.uk',
    label: 'Amazon.co.uk (Reino Unido)',
    country: 'Reino Unido',
    mid: 'A1F83G8C2ARO7P',
  },
  {
    code: 'de',
    domain: 'amazon.de',
    label: 'Amazon.de (Alemania)',
    country: 'Alemania',
    mid: 'A1PA6795UKMFR9',
  },
  {
    code: 'fr',
    domain: 'amazon.fr',
    label: 'Amazon.fr (Francia)',
    country: 'Francia',
    mid: 'A13V1IB3VIYZZH',
  },
  {
    code: 'ca',
    domain: 'amazon.ca',
    label: 'Amazon.ca (Canadá)',
    country: 'Canadá',
    mid: 'A2EUQ1WTGCTBG2',
  },
  {
    code: 'co.jp',
    domain: 'amazon.co.jp',
    label: 'Amazon.co.jp (Japón)',
    country: 'Japón',
    mid: 'A1VC38T7YXB528',
  },
];

export function getMarketplace(code?: string): MarketplaceInfo {
  const found = AMAZON_MARKETPLACES.find((m) => m.code === code);
  return found ?? AMAZON_MARKETPLACES[0];
}

export const QUICK_GAME_PRESETS: Array<{ title: string; developer: string }> = [
  { title: 'Minecraft', developer: 'Mojang' },
  { title: 'Roblox', developer: 'Roblox Corporation' },
  { title: 'Brawl Stars', developer: 'Supercell' },
  { title: 'Geometry Dash', developer: 'RobTop Games' },
  { title: 'Stardew Valley', developer: 'ConcernedApe' },
  { title: 'Genshin Impact', developer: 'COGNOSPHERE' },
];

export function buildAmazonAppstoreSearchUrl(
  query: string,
  marketplaceCode: MarketplaceCode
): string {
  const m = getMarketplace(marketplaceCode);
  return `https://www.${m.domain}/s?k=${encodeURIComponent(query)}&i=mobile-apps`;
}
