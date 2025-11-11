/**
 * TypeScript types for Scope feature
 */

import type { FieldValue } from 'firebase/firestore';

export interface ScopeItem {
  scope: string;
  description: string;
}

export interface Scope {
  items: ScopeItem[];
  uploadedAt: number;
  uploadedBy: string;
}

export interface ScopeDocument {
  items: ScopeItem[];
  uploadedAt: FieldValue | number; // serverTimestamp or timestamp
  uploadedBy: string;
}

