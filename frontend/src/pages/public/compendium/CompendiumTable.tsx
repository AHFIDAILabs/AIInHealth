import type { ReactNode } from 'react';

// The flat, black-header, zebra-striped table used throughout the reference
// compendium PDF (publication particulars, award citations, author/
// institution/keyword indexes) — square corners on purpose, distinct from
// the rounded-2xl tables used elsewhere on the site, to match that print
// document's own squared-off look.
export const CompendiumTable = ({ columns, rows }: { columns: string[]; rows: ReactNode[][] }) => (
  <div className="overflow-x-auto border border-compendium-ink/10">
    <table className="w-full min-w-[480px] border-collapse text-left text-sm">
      <thead>
        <tr className="bg-compendium-ink">
          {columns.map((c) => (
            <th key={c} className="border-l border-white/10 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-white first:border-l-0">
              {c}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i} className={i % 2 === 0 ? 'bg-compendium-cream/60' : 'bg-white'}>
            {row.map((cell, j) => (
              <td key={j} className="border-t border-compendium-ink/10 px-4 py-2.5 align-top text-compendium-ink">
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);
