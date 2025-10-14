/**
 * Color utilities for user cursor assignment
 * Provides a consistent set of colors for user cursors
 */

/**
 * Predefined colors for user cursors
 * Colors are chosen to be distinct and accessible
 */
export const USER_COLORS = [
  '#3B82F6', // Blue (primary)
  '#EF4444', // Red
  '#10B981', // Green
  '#F59E0B', // Yellow
  '#8B5CF6', // Purple
  '#F97316', // Orange
  '#06B6D4', // Cyan
  '#84CC16', // Lime
  '#EC4899', // Pink
  '#6B7280', // Gray
] as const;

/**
 * Get a color for a user based on their ID
 * Uses a simple hash function to consistently assign colors
 */
export const getUserColor = (userId: string): string => {
  // Simple hash function to convert userId to a number
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    const char = userId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  // Use absolute value and modulo to get index
  const index = Math.abs(hash) % USER_COLORS.length;
  return USER_COLORS[index];
};

/**
 * Get all available colors
 */
export const getAllColors = (): readonly string[] => {
  return USER_COLORS;
};

/**
 * Check if a color is valid (exists in our color palette)
 */
export const isValidColor = (color: string): boolean => {
  return (USER_COLORS as readonly string[]).includes(color);
};
