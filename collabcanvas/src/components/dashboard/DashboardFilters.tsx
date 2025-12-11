import type { ProjectStatus } from '../../types/project';

interface DashboardFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  statusFilter: ProjectStatus | 'all';
  onStatusChange: (status: ProjectStatus | 'all') => void;
  sortBy: 'newest' | 'oldest' | 'value';
  onSortChange: (sort: 'newest' | 'oldest' | 'value') => void;
}

/**
 * DashboardFilters - Search bar and filter dropdowns with glass styling.
 */
export function DashboardFilters({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusChange,
  sortBy,
  onSortChange,
}: DashboardFiltersProps) {
  return (
    <div className="flex flex-col md:flex-row gap-4 mb-6">
      {/* Search Bar */}
      <div className="flex-1">
        <div className="relative">
          <svg
            className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-truecost-text-muted"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="glass-input w-full pl-12"
          />
        </div>
      </div>

      {/* Status Filter */}
      <div className="w-full md:w-48">
        <select
          value={statusFilter}
          onChange={(e) => onStatusChange(e.target.value as ProjectStatus | 'all')}
          className="glass-input w-full appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27rgba(255,255,255,0.55)%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3e%3cpolyline points=%276 9 12 15 18 9%27%3e%3c/polyline%3e%3c/svg%3e')] bg-[length:1.25rem] bg-[right_0.75rem_center] bg-no-repeat pr-10"
        >
          <option value="all">All Status</option>
          <option value="estimating">Estimating</option>
          <option value="bid-ready">Bid Ready</option>
          <option value="bid-lost">Bid Lost</option>
          <option value="executing">Executing</option>
          <option value="completed-profitable">Completed (Profitable)</option>
          <option value="completed-unprofitable">Completed (Unprofitable)</option>
          <option value="completed-unknown">Completed (Unknown)</option>
        </select>
      </div>

      {/* Sort Dropdown */}
      <div className="w-full md:w-48">
        <select
          value={sortBy}
          onChange={(e) => onSortChange(e.target.value as 'newest' | 'oldest' | 'value')}
          className="glass-input w-full appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27rgba(255,255,255,0.55)%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3e%3cpolyline points=%276 9 12 15 18 9%27%3e%3c/polyline%3e%3c/svg%3e')] bg-[length:1.25rem] bg-[right_0.75rem_center] bg-no-repeat pr-10"
        >
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
          <option value="value">By Value</option>
        </select>
      </div>
    </div>
  );
}

