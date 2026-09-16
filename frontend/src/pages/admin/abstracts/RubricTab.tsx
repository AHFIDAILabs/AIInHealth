import { useEffect, useState } from 'react';
import { ArrowUp, ArrowDown, Trash2, Plus, RotateCcw } from 'lucide-react';
import { fetchRubric, replaceRubric, restoreStandardRubric, type RubricCriterionInput } from '../../../services/rubric.service';
import { getApiErrorMessage } from '../../../services/api';
import { AdminInput, AdminTextarea } from '../../../components/ui/AdminField';
import { Banner } from '../../../components/ui/Banner';
import { Skeleton } from '../../../components/ui/Skeleton';
import { useToast } from '../../../contexts/ToastContext';
import { CARD_CLASS } from '../../../lib/adminUi';

// A locally-stable key for React list rendering — a new (unsaved) criterion
// has no _id yet, so this is generated client-side and never sent to the API.
type DraftCriterion = RubricCriterionInput & { key: string };

const newKey = () => `new-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

const slugify = (label: string) =>
  label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

export const RubricTab = () => {
  const toast = useToast();
  const [criteria, setCriteria] = useState<DraftCriterion[] | null>(null);
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () => {
    fetchRubric()
      .then((rubric) => setCriteria(rubric.criteria.map((c) => ({ ...c, key: c._id }))))
      .catch((err) => setLoadError(getApiErrorMessage(err)));
  };

  useEffect(load, []);

  const totalWeight = (criteria ?? []).reduce((sum, c) => sum + (Number.isFinite(c.weight) ? c.weight : 0), 0);

  const updateCriterion = (key: string, patch: Partial<DraftCriterion>) => {
    setCriteria((prev) => prev?.map((c) => (c.key === key ? { ...c, ...patch } : c)) ?? null);
  };

  const removeCriterion = (key: string) => {
    setCriteria((prev) => prev?.filter((c) => c.key !== key) ?? null);
  };

  const move = (index: number, direction: -1 | 1) => {
    setCriteria((prev) => {
      if (!prev) return prev;
      const next = [...prev];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const addCriterion = () => {
    setCriteria((prev) => [
      ...(prev ?? []),
      { key: newKey(), label: '', description: '', internalCode: '', weight: 0 },
    ]);
  };

  const save = async () => {
    if (!criteria) return;
    if (totalWeight !== 100) {
      toast('error', `Weights must sum to exactly 100 (currently ${totalWeight})`);
      return;
    }
    if (criteria.some((c) => !c.label.trim() || !c.internalCode.trim())) {
      toast('error', 'Every criterion needs a label and an internal code');
      return;
    }
    setSaving(true);
    try {
      const rubric = await replaceRubric(
        criteria.map((c) => ({
          _id: c._id?.startsWith('new-') ? undefined : c._id,
          label: c.label.trim(),
          description: c.description?.trim() || undefined,
          internalCode: c.internalCode.trim(),
          weight: c.weight,
        }))
      );
      setCriteria(rubric.criteria.map((c) => ({ ...c, key: c._id })));
      toast('success', 'Rubric saved');
    } catch (err) {
      toast('error', getApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const restoreStandard = async () => {
    setSaving(true);
    try {
      const rubric = await restoreStandardRubric();
      setCriteria(rubric.criteria.map((c) => ({ ...c, key: c._id })));
      toast('success', 'Restored the standard rubric');
    } catch (err) {
      toast('error', getApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (loadError) {
    return <Banner variant="error">{loadError}</Banner>;
  }

  if (!criteria) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_280px]">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-lg font-semibold text-navy">Rubric Criteria</h2>
            <p className="text-sm text-slate-500">Manage the criteria used by reviewers to score abstracts.</p>
          </div>
          <button
            onClick={restoreStandard}
            disabled={saving}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3.5 py-2 text-xs font-semibold text-navy hover:border-orange/40 disabled:opacity-50"
          >
            <RotateCcw size={13} /> Restore standard rubric
          </button>
        </div>

        {criteria.map((c, i) => (
          <div key={c.key} className={`p-5 ${CARD_CLASS}`}>
            <div className="flex items-start gap-3">
              <div className="flex flex-col gap-1 pt-8">
                <button onClick={() => move(i, -1)} disabled={i === 0} className="text-slate-400 hover:text-navy disabled:opacity-30">
                  <ArrowUp size={15} />
                </button>
                <button onClick={() => move(i, 1)} disabled={i === criteria.length - 1} className="text-slate-400 hover:text-navy disabled:opacity-30">
                  <ArrowDown size={15} />
                </button>
              </div>
              <div className="flex-1 space-y-3">
                <div className="flex gap-3">
                  <div className="flex-1">
                    <AdminInput
                      label="Label"
                      value={c.label}
                      onChange={(e) => updateCriterion(c.key, { label: e.target.value, internalCode: c.internalCode || slugify(e.target.value) })}
                    />
                  </div>
                  <div className="w-28">
                    <AdminInput
                      label="Weight"
                      type="number"
                      min={1}
                      max={100}
                      value={c.weight}
                      onChange={(e) => updateCriterion(c.key, { weight: Number(e.target.value) })}
                    />
                  </div>
                </div>
                <AdminTextarea
                  label="Description (Reviewer Consideration)"
                  value={c.description ?? ''}
                  onChange={(e) => updateCriterion(c.key, { description: e.target.value })}
                />
                <p className="text-xs text-slate-400">
                  Internal Code: <code className="rounded bg-offwhite px-1.5 py-0.5">{c.internalCode || slugify(c.label)}</code>
                </p>
              </div>
              <button onClick={() => removeCriterion(c.key)} className="text-slate-300 hover:text-danger">
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}

        <button
          onClick={addCriterion}
          className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-300 py-3 text-sm font-semibold text-slate-500 hover:border-orange/40 hover:text-orange"
        >
          <Plus size={15} /> Add Criterion
        </button>

        <button
          onClick={save}
          disabled={saving}
          className="w-full rounded-lg bg-orange py-2.5 text-sm font-semibold text-white hover:bg-orange-hover disabled:opacity-60"
        >
          Save Rubric
        </button>
      </div>

      <div className="space-y-4">
        <div className={`p-5 text-center ${CARD_CLASS}`}>
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Total Weight</p>
          <p className={`mt-2 font-display text-3xl font-extrabold ${totalWeight === 100 ? 'text-success' : 'text-danger'}`}>{totalWeight}</p>
        </div>

        <div className={`p-5 ${CARD_CLASS}`}>
          <p className="font-display text-sm font-semibold text-navy">1-5 Scale Reference</p>
          <div className="mt-3 space-y-2 text-xs">
            <p><strong className="text-navy">5 - Excellent</strong> <span className="text-slate-500">strongly meets the criterion</span></p>
            <p><strong className="text-navy">4 - Good</strong> <span className="text-slate-500">clearly meets the criterion with minor limitations</span></p>
            <p><strong className="text-navy">3 - Fair</strong> <span className="text-slate-500">adequately meets the criterion but has notable limitations</span></p>
            <p><strong className="text-navy">2 - Weak</strong> <span className="text-slate-500">partially meets the criterion with substantial limitations</span></p>
            <p><strong className="text-navy">1 - Poor</strong> <span className="text-slate-500">does not adequately meet the criterion</span></p>
          </div>
        </div>

        <div className={`p-5 ${CARD_CLASS}`}>
          <p className="font-display text-sm font-semibold text-navy">Score Bands Reference</p>
          <div className="mt-3 space-y-2 text-xs">
            <p><strong className="text-success">Strong Accept</strong> <span className="text-slate-500">80-100</span></p>
            <p><strong className="text-orange">Accept</strong> <span className="text-slate-500">70-79.99</span></p>
            <p><strong className="text-warning">Borderline</strong> <span className="text-slate-500">60-69.99 &mdash; requires committee moderation</span></p>
            <p><strong className="text-danger">Reject</strong> <span className="text-slate-500">0-59.99</span></p>
          </div>
        </div>
      </div>
    </div>
  );
};
