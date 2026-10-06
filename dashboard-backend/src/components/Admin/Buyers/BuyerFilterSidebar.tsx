"use client";

import { ActiveFilters } from "@/hooks/admin/useBuyers";

interface FilterOption {
  value: string;
  label: string;
  count?: number;
}

interface FilterSectionProps {
  title: string;
  options: FilterOption[];
  selected: Set<string>;
  onChange: (values: Set<string>) => void;
}

function FilterSection({ title, options, selected, onChange }: FilterSectionProps) {
  const toggleValue = (value: string) => {
    const newSet = new Set(selected);
    if (newSet.has(value)) {
      newSet.delete(value);
    } else {
      newSet.add(value);
    }
    onChange(newSet);
  };

  return (
    <div className="filter-section mb-4">
      <h5 className="filter-title mb-3">{title}</h5>
      <div className="filter-options">
        {options.map((option) => (
          <label key={option.value} className="filter-option d-flex align-items-center mb-2">
            <input
              type="checkbox"
              className="form-check-input me-2"
              checked={selected.has(option.value)}
              onChange={() => toggleValue(option.value)}
            />
            <span className="flex-grow-1">{option.label}</span>
            {option.count !== undefined && (
              <span className="badge bg-secondary rounded-pill">{option.count}</span>
            )}
          </label>
        ))}
      </div>
    </div>
  );
}

interface BuyerFilterSidebarProps {
  filters: ActiveFilters;
  onChange: (filters: ActiveFilters) => void;
}

// Filter options
const STATUS_OPTIONS = [
  { value: "verified", label: "Verified", count: 15 },
  { value: "unverified", label: "Unverified", count: 12 },
  { value: "pending", label: "Pending", count: 8 },
  { value: "blocked", label: "Blocked", count: 3 },
];

const COUNTRY_OPTIONS = [
  { value: "Canada", label: "Canada" },
  { value: "United States", label: "United States" },
  { value: "United Kingdom", label: "United Kingdom" },
  { value: "Australia", label: "Australia" },
  { value: "Germany", label: "Germany" },
  { value: "France", label: "France" },
  { value: "India", label: "India" },
  { value: "China", label: "China" },
];

const INDUSTRY_OPTIONS = [
  { value: "Healthcare", label: "Healthcare" },
  { value: "Medical", label: "Medical" },
  { value: "Pharmacy", label: "Pharmacy" },
  { value: "Dental", label: "Dental" },
  { value: "Physiotherapy", label: "Physiotherapy" },
  { value: "Chiropractic", label: "Chiropractic" },
  { value: "Optometry", label: "Optometry" },
  { value: "Other", label: "Other" },
];

const INVESTMENT_OPTIONS = [
  { value: "Under $500K", label: "Under $500K" },
  { value: "$500K - $1M", label: "$500K - $1M" },
  { value: "$1M - $5M", label: "$1M - $5M" },
  { value: "$5M+", label: "$5M+" },
];

export default function BuyerFilterSidebar({ filters, onChange }: BuyerFilterSidebarProps) {
  const handleClearAll = () => {
    onChange({
      statuses: new Set(),
      countries: new Set(),
      industries: new Set(),
      investmentRanges: new Set(),
    });
  };

  const hasActiveFilters = 
    filters.statuses.size > 0 ||
    filters.countries.size > 0 ||
    filters.industries.size > 0 ||
    filters.investmentRanges.size > 0;

  return (
    <div className="buyer-filter-sidebar">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h4 className="mb-0">Filters</h4>
        {hasActiveFilters && (
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary"
            onClick={handleClearAll}
          >
            Clear All
          </button>
        )}
      </div>

      <FilterSection
        title="Status"
        options={STATUS_OPTIONS}
        selected={filters.statuses}
        onChange={(statuses) => onChange({ ...filters, statuses })}
      />

      <hr />

      <FilterSection
        title="Country"
        options={COUNTRY_OPTIONS}
        selected={filters.countries}
        onChange={(countries) => onChange({ ...filters, countries })}
      />

      <hr />

      <FilterSection
        title="Industry"
        options={INDUSTRY_OPTIONS}
        selected={filters.industries}
        onChange={(industries) => onChange({ ...filters, industries })}
      />

      <hr />

      <FilterSection
        title="Investment Range"
        options={INVESTMENT_OPTIONS}
        selected={filters.investmentRanges}
        onChange={(investmentRanges) => onChange({ ...filters, investmentRanges })}
      />
    </div>
  );
}