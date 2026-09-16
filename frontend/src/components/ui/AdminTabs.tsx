// Rounded-full pill nav — the same visual language as the status-filter pills
// already used across admin list pages (e.g. the old AbstractsPage), just
// repurposed here as page-level sub-navigation instead of a data filter. No
// tab component existed anywhere in this app before the Abstracts & Reviews
// page needed one; built for reuse by any future multi-tab admin page.
export interface AdminTab {
  key: string;
  label: string;
}

interface AdminTabsProps {
  tabs: AdminTab[];
  active: string;
  onChange: (key: string) => void;
}

export const AdminTabs = ({ tabs, active, onChange }: AdminTabsProps) => (
  <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-4">
    {tabs.map((tab) => (
      <button
        key={tab.key}
        onClick={() => onChange(tab.key)}
        className={`rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
          active === tab.key
            ? 'border-orange bg-orange text-white'
            : 'border-slate-200 text-slate-600 hover:border-orange/40'
        }`}
      >
        {tab.label}
      </button>
    ))}
  </div>
);
