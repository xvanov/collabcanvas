interface BreakdownTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const tabs = [
  { id: 'overview', label: 'Overview' },
  { id: 'by-trade', label: 'By Trade' },
  { id: 'materials', label: 'Materials' },
  { id: 'labor', label: 'Labor' },
  { id: 'equipment', label: 'Equipment' },
];

/**
 * BreakdownTabs - tab navigation for breakdown sections.
 */
export function BreakdownTabs({ activeTab, onTabChange }: BreakdownTabsProps) {
  return (
    <div className="flex gap-2 mb-6 overflow-x-auto">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`
            px-6 py-3 rounded-pill font-body text-body font-medium transition-all duration-200
            ${
              activeTab === tab.id
                ? 'bg-gradient-to-br from-truecost-cyan to-truecost-teal text-truecost-bg-primary'
                : 'glass-panel text-truecost-text-secondary hover:text-truecost-text-primary hover:border-truecost-cyan/50'
            }
          `}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

