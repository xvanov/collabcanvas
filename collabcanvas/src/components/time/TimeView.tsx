/**
 * Time View Component - Placeholder
 * CPM visualization will be implemented in Story 1.4
 */

import { FloatingAIChat } from '../shared/FloatingAIChat';

export function TimeView() {
  return (
    <div className="flex h-full items-center justify-center bg-gray-50">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Time View</h2>
        <p className="text-gray-600">Critical Path Method (CPM) visualization will be implemented in Story 1.4</p>
      </div>
      
      {/* Floating AI Chat Button */}
      <FloatingAIChat />
    </div>
  );
}



