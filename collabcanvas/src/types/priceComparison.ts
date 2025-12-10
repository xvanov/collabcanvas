/**
 * Price Comparison Types for Multi-Retailer Price Intelligence
 * Epic: Price Intelligence Module
 * Story: PC-1
 */

/**
 * Supported retailers for price comparison
 */
export type Retailer = 'homeDepot' | 'lowes' | 'aceHardware';

/**
 * Product data returned from retailer search
 */
export interface RetailerProduct {
  id: string;
  name: string;
  brand: string | null;
  price: number;
  priceReduced?: number | null;
  currency: string;
  url: string;
  imageUrl?: string;
  rating?: number | null;
  totalReviews?: number | null;
  inStock?: boolean;
  retailer: Retailer;
}

/**
 * Result of matching a product at a single retailer
 */
export interface MatchResult {
  selectedProduct: RetailerProduct | null;
  confidence: number;
  reasoning: string;
  searchResultsCount: number;
}

/**
 * Complete comparison result for a single product across all retailers
 */
export interface ComparisonResult {
  originalProductName: string;
  matches: Record<Retailer, MatchResult>;
  bestPrice: {
    retailer: Retailer;
    product: RetailerProduct;
    savings: number;
  } | null;
  comparedAt: number;
  cached: boolean;
}

/**
 * Request payload for price comparison
 */
export interface CompareRequest {
  projectId: string;              // Required - which project to save results to
  productNames: string[];
  forceRefresh?: boolean;         // If true, skip saved results and re-fetch
  storeNumber?: string;
  zipCode?: string;
}

/**
 * Status of the comparison process
 */
export type ComparisonStatus = 'idle' | 'processing' | 'complete' | 'error';

/**
 * Real-time progress tracked in Firestore
 * Frontend subscribes to this document for live updates
 */
export interface ComparisonProgress {
  status: ComparisonStatus;
  totalProducts: number;
  completedProducts: number;
  results: ComparisonResult[];
  startedAt: number;
  completedAt?: number;
  error?: string;
}
