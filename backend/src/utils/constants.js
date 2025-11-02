export const COMIC_CATEGORIES = [
  'superhero',
  'manga',
  'horror',
  'sci-fi',
  'fantasy',
  'indie',
  'webcomic',
  'other'
];

export const COMIC_GENRES = [
  'action',
  'adventure',
  'comedy',
  'drama',
  'fantasy',
  'horror',
  'mystery',
  'romance',
  'sci-fi',
  'thriller',
  'western'
];

export const EDITION_TYPES = [
  'standard',
  'limited',
  'rare',
  'ultra-rare',
  'one-of-one'
];

export const RARITY_LEVELS = [
  'common',
  'uncommon',
  'rare',
  'epic',
  'legendary'
];

export const LISTING_TYPES = ['fixed-price', 'auction'];

export const TRANSACTION_TYPES = ['sale', 'auction-win', 'mint', 'transfer'];

export const TRANSACTION_STATUS = ['pending', 'completed', 'failed', 'cancelled'];

export const USER_ROLES = ['user', 'creator', 'admin'];

export const COMIC_STATUS = ['draft', 'pending', 'published', 'sold-out', 'archived'];

export const LISTING_STATUS = ['active', 'sold', 'cancelled', 'expired'];

export const OFFER_STATUS = ['pending', 'accepted', 'rejected', 'expired'];

export const MAX_FILE_SIZE = 52428800; // 50MB

export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

export const PLATFORM_FEE_PERCENTAGE = 2.5;

export const DEFAULT_ROYALTY_PERCENTAGE = 10;

export default {
  COMIC_CATEGORIES,
  COMIC_GENRES,
  EDITION_TYPES,
  RARITY_LEVELS,
  LISTING_TYPES,
  TRANSACTION_TYPES,
  TRANSACTION_STATUS,
  USER_ROLES,
  COMIC_STATUS,
  LISTING_STATUS,
  OFFER_STATUS,
  MAX_FILE_SIZE,
  ALLOWED_IMAGE_TYPES,
  PLATFORM_FEE_PERCENTAGE,
  DEFAULT_ROYALTY_PERCENTAGE
};
