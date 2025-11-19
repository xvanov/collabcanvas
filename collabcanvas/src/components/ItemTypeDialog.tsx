/**
 * Item Type Selection Dialog
 * Dialog for selecting item type when creating a bounding box
 */

import { useState } from 'react';

export type ItemType = 'window' | 'door' | 'stove' | 'sink' | 'toilet' | 'outlet' | 'other';

interface ItemTypeDialogProps {
  isOpen: boolean;
  onSelect: (itemType: ItemType, customType?: string) => void;
  onCancel: () => void;
}

const ITEM_TYPES: Array<{ value: ItemType; label: string }> = [
  { value: 'window', label: 'Window' },
  { value: 'door', label: 'Door' },
  { value: 'stove', label: 'Stove' },
  { value: 'sink', label: 'Sink' },
  { value: 'toilet', label: 'Toilet' },
  { value: 'outlet', label: 'Outlet' },
  { value: 'other', label: 'Other' },
];

export function ItemTypeDialog({ isOpen, onSelect, onCancel }: ItemTypeDialogProps) {
  const [customType, setCustomType] = useState('');
  const [selectedType, setSelectedType] = useState<ItemType | null>(null);

  if (!isOpen) return null;

  const handleSelect = () => {
    if (selectedType === 'other' && customType.trim()) {
      onSelect('other', customType.trim());
    } else if (selectedType) {
      onSelect(selectedType);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-96 max-w-md">
        <h2 className="text-xl font-semibold mb-4">Select Item Type</h2>
        <div className="space-y-2 mb-4">
          {ITEM_TYPES.map((item) => (
            <label key={item.value} className="flex items-center space-x-2 cursor-pointer">
              <input
                type="radio"
                name="itemType"
                value={item.value}
                checked={selectedType === item.value}
                onChange={() => setSelectedType(item.value)}
                className="w-4 h-4 text-blue-600"
              />
              <span className="text-gray-700">{item.label}</span>
            </label>
          ))}
        </div>
        {selectedType === 'other' && (
          <input
            type="text"
            placeholder="Enter custom item type"
            value={customType}
            onChange={(e) => setCustomType(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md mb-4"
            autoFocus
          />
        )}
        <div className="flex justify-end space-x-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
          >
            Cancel
          </button>
          <button
            onClick={handleSelect}
            disabled={!selectedType || (selectedType === 'other' && !customType.trim())}
            className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
}






