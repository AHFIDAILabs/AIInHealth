const RULES: { test: (v: string) => boolean; label: string }[] = [
  { test: (v) => v.length >= 10, label: 'At least 10 characters' },
  { test: (v) => /[a-z]/.test(v) && /[A-Z]/.test(v), label: 'Upper & lowercase letters' },
  { test: (v) => /[0-9]/.test(v), label: 'A number' },
  { test: (v) => /[^A-Za-z0-9]/.test(v), label: 'A symbol' },
];

const BAR_COLORS = ['bg-danger', 'bg-danger', 'bg-warning', 'bg-warning', 'bg-success'];
const LABELS = ['Very weak', 'Weak', 'Fair', 'Good', 'Strong'];

export const PasswordStrengthMeter = ({ password }: { password: string }) => {
  const passed = RULES.filter((r) => r.test(password)).length;
  const score = password.length === 0 ? 0 : passed;

  return (
    <div className="mt-2">
      <div className="flex gap-1.5">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={`h-1.5 flex-1 rounded-full ${i < score ? BAR_COLORS[score] : 'bg-slate-700'}`} />
        ))}
      </div>
      {password.length > 0 && <p className="mt-1.5 text-xs font-semibold text-slate-400">{LABELS[score]}</p>}
      <ul className="mt-2 space-y-1">
        {RULES.map((rule) => {
          const ok = rule.test(password);
          return (
            <li key={rule.label} className={`text-xs ${ok ? 'text-success' : 'text-slate-500'}`}>
              {ok ? '✓' : '·'} {rule.label}
            </li>
          );
        })}
      </ul>
    </div>
  );
};
