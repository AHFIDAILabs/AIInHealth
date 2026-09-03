import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Loader2,
  Users2,
  Mic2,
  CalendarClock,
  Handshake,
  Lightbulb,
  FileText,
  MessageSquare,
  UserCog,
  UsersRound,
  type LucideIcon,
} from 'lucide-react';
import { globalSearch, type SearchGroup, type SearchResultItem } from '../../services/search.service';

const GROUP_ICON: Record<string, LucideIcon> = {
  registrations: Users2,
  speakers: Mic2,
  sessions: CalendarClock,
  partners: Handshake,
  innovations: Lightbulb,
  abstracts: FileText,
  inquiries: Handshake,
  messages: MessageSquare,
  users: UserCog,
  eventTeam: UsersRound,
};

export const GlobalSearch = () => {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [groups, setGroups] = useState<SearchGroup[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);

  // Cmd/Ctrl+K jumps here from anywhere in the admin — the topbar's kbd hint
  // promises this, so it has to actually work app-wide, not just while the input
  // already has focus.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setGroups([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const id = setTimeout(() => {
      globalSearch(trimmed)
        .then((res) => {
          setGroups(res.groups);
          setActiveIndex(res.groups.some((g) => g.results.length > 0) ? 0 : -1);
        })
        .catch(() => setGroups([]))
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(id);
  }, [query]);

  const flatResults = groups.flatMap((g) => g.results);
  const showPanel = open && query.trim().length >= 2;

  const selectResult = (item: SearchResultItem) => {
    navigate(item.path);
    setOpen(false);
    setQuery('');
    inputRef.current?.blur();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setOpen(false);
      inputRef.current?.blur();
      return;
    }
    if (!showPanel || flatResults.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, flatResults.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const item = flatResults[activeIndex] ?? flatResults[0];
      if (item) selectResult(item);
    }
  };

  let runningIndex = -1;

  return (
    <div className="relative hidden max-w-sm flex-1 sm:block">
      <Search size={15} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
      <input
        ref={inputRef}
        type="search"
        placeholder="Search anything..."
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        className="w-full rounded-full border-none bg-offwhite py-2.5 pl-10 pr-14 text-[13px] text-navy placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange/20"
      />
      {!query && (
        <kbd className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 rounded-md bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-400 shadow-sm">
          ⌘K
        </kbd>
      )}

      {showPanel && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full z-20 mt-2 w-full min-w-[22rem] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
            <div className="max-h-96 overflow-y-auto py-1.5">
              {loading && flatResults.length === 0 && (
                <p className="flex items-center justify-center gap-2 px-4 py-8 text-xs text-slate-400">
                  <Loader2 size={13} className="animate-spin" /> Searching…
                </p>
              )}
              {!loading && groups.length === 0 && (
                <p className="px-4 py-8 text-center text-xs text-slate-400">No results for &ldquo;{query.trim()}&rdquo;</p>
              )}
              {groups.map((group) => {
                const Icon = GROUP_ICON[group.key] ?? Search;
                return (
                  <div key={group.key} className="px-1.5 py-1">
                    <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">{group.label}</p>
                    {group.results.map((item) => {
                      runningIndex += 1;
                      const isActive = runningIndex === activeIndex;
                      return (
                        <button
                          key={item.id}
                          onClick={() => selectResult(item)}
                          onMouseEnter={() => setActiveIndex(runningIndex)}
                          className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left transition-colors ${
                            isActive ? 'bg-orange/10' : 'hover:bg-offwhite'
                          }`}
                        >
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-navy-secondary text-orange">
                            <Icon size={13} />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[13px] font-medium text-navy">{item.title}</span>
                            {item.subtitle && <span className="block truncate text-[11px] text-slate-400">{item.subtitle}</span>}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
            {flatResults.length > 0 && (
              <div className="flex items-center gap-3 border-t border-slate-100 px-3.5 py-2 text-[10px] text-slate-400">
                <span>↑↓ navigate</span>
                <span>↵ select</span>
                <span>esc close</span>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
