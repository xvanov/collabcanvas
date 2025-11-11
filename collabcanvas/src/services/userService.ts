/**
 * User lookup service
 * Handles finding users by email for project sharing
 */

import { auth } from '../services/firebase';

/**
 * Lookup user by email
 * Note: Firebase Auth doesn't provide a direct way to search users by email from client
 * This would typically require a Cloud Function or Admin SDK
 * For now, we'll use a placeholder that validates email format
 * 
 * In production, this should call a Cloud Function that uses Firebase Admin SDK
 * to search for users by email and return their UID
 */
export async function lookupUserByEmail(email: string): Promise<string | null> {
  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    throw new Error('Invalid email format');
  }

  // TODO: Implement actual user lookup via Cloud Function
  // For now, return null to indicate user not found
  // In production, this would call:
  // const lookupUserFn = httpsCallable(functions, 'lookupUserByEmail');
  // const result = await lookupUserFn({ email: email.trim() });
  // return result.data.uid;
  
  // Placeholder: For MVP, we'll use email as userId temporarily
  // This is NOT secure for production - users must be looked up properly
  console.warn('User lookup by email not fully implemented. Using email as placeholder userId.');
  return email.trim();
}

/**
 * Check if current user is authenticated
 */
export function isAuthenticated(): boolean {
  return auth.currentUser !== null;
}





