import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import {
  fetchMyAssignments,
  fetchReviewerRubric,
  submitReviewScores,
  ABSTRACT_DECISIONS,
  type MyAssignment,
  type RubricCriterion,
  type AbstractDecision,
} from '../../services/reviewer.service';
import { Button } from '../../components/ui/Button';
import { Banner } from '../../components/ui/Banner';
import { Skeleton } from '../../components/ui/Skeleton';
import { getApiErrorMessage } from '../../services/api';

const SCALE = [
  { value: 5, label: 'Excellent' },
  { value: 4, label: 'Good' },
  { value: 3, label: 'Fair' },
  { value: 2, label: 'Weak' },
  { value: 1, label: 'Poor' },
];

const RECOMMENDATION_LABEL: Record<AbstractDecision, string> = {
  accepted_oral: 'Accept – Oral Presentation',
  accepted_poster: 'Accept – Poster Presentation',
  rejected: 'Reject',
  waitlisted: 'Waitlist',
};

export const ReviewerScoreForm = () => {
  const { id: reviewId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [assignment, setAssignment] = useState<MyAssignment | null>(null);
  const [criteria, setCriteria] = useState<RubricCriterion[] | null>(null);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [recommendation, setRecommendation] = useState<AbstractDecision | null>(null);
  const [loadError, setLoadError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ weightedScore: number } | null>(null);

  useEffect(() => {
    if (!reviewId) return;
    Promise.all([fetchMyAssignments(), fetchReviewerRubric()])
      .then(([assignments, rubricCriteria]) => {
        const match = assignments.find((a) => a.reviewId === reviewId);
        if (!match) {
          setLoadError('This review assignment was not found. It may have been removed.');
          return;
        }
        // Scoring is only ever open to an accepted assignment — the backend
        // enforces this too (submitScores rejects anything else), this is
        // just the friendlier front-of-house version of that same rule.
        if (match.reviewerStatus !== 'accepted') {
          setLoadError(
            match.reviewerStatus === 'declined'
              ? "You've declined this assignment, so it can't be opened."
              : 'Accept this assignment from your dashboard before opening it.'
          );
          return;
        }
        setAssignment(match);
        setCriteria(rubricCriteria);
        setScores(Object.fromEntries(match.scores.map((s) => [s.criterionId, s.score])));
        setRecommendation(match.recommendation ?? null);
      })
      .catch((err) => setLoadError(getApiErrorMessage(err)));
  }, [reviewId]);

  const onSubmit = async () => {
    if (!reviewId || !criteria || !recommendation) return;
    setSubmitError('');
    setSubmitting(true);
    try {
      const payload = criteria.map((c) => ({ criterionId: c._id, score: scores[c._id] }));
      const res = await submitReviewScores(reviewId, payload, recommendation);
      setResult({ weightedScore: res.weightedScore });
    } catch (err) {
      setSubmitError(getApiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (loadError) {
    return (
      <div>
        <Banner variant="error">{loadError}</Banner>
        <Link to="/review" className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-orange hover:text-orange-hover">
          <ArrowLeft size={14} /> Back to your assignments
        </Link>
      </div>
    );
  }

  if (!assignment || !criteria) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
    );
  }

  if (result) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
        <CheckCircle2 size={36} className="mx-auto text-success" />
        <h1 className="mt-4 font-display text-lg font-semibold text-navy">Review submitted</h1>
        <p className="mt-2 text-sm text-slate-500">
          Your weighted score for &ldquo;{assignment.abstract.title}&rdquo; is <strong>{result.weightedScore}/100</strong>.
        </p>
        <Button variant="primary" className="mt-6" onClick={() => navigate('/review')}>
          Back to your assignments
        </Button>
      </div>
    );
  }

  const allScored = criteria.every((c) => scores[c._id]);
  const canSubmit = allScored && !!recommendation;

  return (
    <div>
      <Link to="/review" className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-navy">
        <ArrowLeft size={14} /> Back to your assignments
      </Link>

      <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-6">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{assignment.abstract.track}</p>
        <h1 className="mt-1 font-display text-lg font-semibold text-navy">{assignment.abstract.title}</h1>
        <p className="mt-1 text-sm text-slate-500">by {assignment.abstract.authorName}</p>
        <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-slate-600">{assignment.abstract.abstractText}</p>
      </div>

      <div className="mt-6 space-y-4">
        {criteria.map((c) => (
          <div key={c._id} className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="font-display text-sm font-semibold text-navy">{c.label}</h3>
              <span className="shrink-0 text-xs font-medium text-slate-400">{c.weight}% weight</span>
            </div>
            {c.description && <p className="mt-1 text-sm text-slate-500">{c.description}</p>}
            <div className="mt-3 flex flex-wrap gap-2">
              {SCALE.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setScores((prev) => ({ ...prev, [c._id]: s.value }))}
                  className={`rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
                    scores[c._id] === s.value
                      ? 'border-orange bg-orange text-white'
                      : 'border-slate-200 text-slate-600 hover:border-orange/40'
                  }`}
                >
                  {s.value} &middot; {s.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
        <h3 className="font-display text-sm font-semibold text-navy">Your Recommendation</h3>
        <p className="mt-1 text-sm text-slate-500">Your overall recommendation for this abstract.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {ABSTRACT_DECISIONS.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setRecommendation(d)}
              className={`rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
                recommendation === d ? 'border-orange bg-orange text-white' : 'border-slate-200 text-slate-600 hover:border-orange/40'
              }`}
            >
              {RECOMMENDATION_LABEL[d]}
            </button>
          ))}
        </div>
      </div>

      {submitError && (
        <div className="mt-4">
          <Banner variant="error">{submitError}</Banner>
        </div>
      )}

      <Button variant="primary" className="mt-6 w-full justify-center" loading={submitting} disabled={!canSubmit} onClick={onSubmit}>
        {assignment.status === 'completed' ? 'Update Scores' : 'Submit Review'}
      </Button>
      {!canSubmit && <p className="mt-2 text-center text-xs text-slate-400">Score every criterion and pick a recommendation to submit.</p>}
    </div>
  );
};
