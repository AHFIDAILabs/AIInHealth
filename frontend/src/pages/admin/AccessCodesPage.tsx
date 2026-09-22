import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Search, Plus, X, KeyRound, Copy, Ban, Check, Send, Mail } from 'lucide-react';
import {
  adminListAccessCodes,
  adminGenerateAccessCodes,
  adminRevokeAccessCode,
  adminSendAccessCode,
  ACCESS_CODE_TYPES,
  ACCESS_CODE_STATUSES,
  ACCESS_CODE_DISCOUNTS,
  type AdminAccessCode,
  type AccessCodeType,
  type AccessCodeStatus,
  type AccessCodeDiscount,
} from '../../services/accessCode.service';
import { getApiErrorMessage } from '../../services/api';
import { SkeletonRows } from '../../components/ui/Skeleton';
import { Banner } from '../../components/ui/Banner';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { AdminInput, AdminSelect, AdminTextarea } from '../../components/ui/AdminField';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';

const TYPE_LABEL: Record<AccessCodeType, string> = {
  volunteer: 'Volunteer',
  keynote_speaker: 'Keynote Speaker',
  complimentary: 'Complimentary',
  scholarship: 'Scholarship (Discount)',
};

const STATUS_STYLE: Record<AccessCodeStatus, string> = {
  unused: 'bg-info/10 text-info',
  used: 'bg-success/10 text-success',
  revoked: 'bg-danger/10 text-danger',
};

interface FormState {
  type: AccessCodeType;
  emailsText: string;
  expiresAt: string;
  discountPercent: AccessCodeDiscount | '';
}
const EMPTY_FORM: FormState = { type: ACCESS_CODE_TYPES[0], emailsText: '', expiresAt: '', discountPercent: '' };

export const AccessCodesPage = () => {
  const toast = useToast();
  const { user } = useAuth();
  // content_editor's Volunteers access is scoped to volunteer-type codes only —
  // the backend enforces this too, this just keeps the form from offering an
  // option that would only bounce back as a 403.
  const contentEditorOnly = user?.role === 'content_editor';

  const [items, setItems] = useState<AdminAccessCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [typeFilter, setTypeFilter] = useState<AccessCodeType | ''>(contentEditorOnly ? 'volunteer' : '');
  const [statusFilter, setStatusFilter] = useState<AccessCodeStatus | ''>('');

  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<FormState>({ ...EMPTY_FORM, type: contentEditorOnly ? 'volunteer' : EMPTY_FORM.type });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const [toRevoke, setToRevoke] = useState<AdminAccessCode | null>(null);
  const [revoking, setRevoking] = useState(false);
  const [sendingId, setSendingId] = useState<string | null>(null);

  const [copiedId, setCopiedId] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    adminListAccessCodes({ q: q || undefined, type: typeFilter || undefined, status: statusFilter || undefined, limit: 200 })
      .then((res) => setItems(res.items))
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [q, typeFilter, statusFilter]);

  useEffect(() => {
    const id = setTimeout(load, q ? 350 : 0);
    return () => clearTimeout(id);
  }, [load, q]);

  const openCreate = () => {
    setForm({ ...EMPTY_FORM, type: contentEditorOnly ? 'volunteer' : EMPTY_FORM.type });
    setFormError('');
    setFormOpen(true);
  };

  const parsedEmails = form.emailsText
    .split(/[\n,]/)
    .map((e) => e.trim())
    .filter(Boolean);

  const submit = async () => {
    if (parsedEmails.length === 0) {
      setFormError('Add at least one email — one per line.');
      return;
    }
    if (form.type === 'scholarship' && !form.discountPercent) {
      setFormError('Choose a discount tier for a scholarship code.');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      const created = await adminGenerateAccessCodes({
        type: form.type,
        emails: parsedEmails,
        expiresAt: form.expiresAt || undefined,
        discountPercent: form.type === 'scholarship' ? (form.discountPercent as AccessCodeDiscount) : undefined,
      });
      setItems((prev) => [...created, ...prev]);
      toast('success', `${created.length} code${created.length === 1 ? '' : 's'} generated and emailed`);
      setFormOpen(false);
    } catch (err) {
      setFormError(getApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const copyCode = async (item: AdminAccessCode) => {
    try {
      await navigator.clipboard.writeText(item.code);
      setCopiedId(item._id);
      setTimeout(() => setCopiedId((prev) => (prev === item._id ? null : prev)), 1500);
    } catch {
      toast('error', 'Could not copy — copy it manually.');
    }
  };

  const resend = async (item: AdminAccessCode) => {
    setSendingId(item._id);
    try {
      const { sentAt } = await adminSendAccessCode(item._id);
      setItems((prev) => prev.map((c) => (c._id === item._id ? { ...c, sentAt } : c)));
      toast('success', `Code resent to ${item.issuedTo}`);
    } catch (err) {
      toast('error', getApiErrorMessage(err));
    } finally {
      setSendingId(null);
    }
  };

  const confirmRevoke = async () => {
    if (!toRevoke) return;
    setRevoking(true);
    try {
      const updated = await adminRevokeAccessCode(toRevoke._id);
      setItems((prev) => prev.map((c) => (c._id === toRevoke._id ? updated : c)));
      toast('success', `${toRevoke.code} revoked`);
      setToRevoke(null);
    } catch (err) {
      toast('error', getApiErrorMessage(err));
    } finally {
      setRevoking(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-navy">{contentEditorOnly ? 'Volunteer Access Codes' : 'Access Codes'}</h1>
          <p className="text-sm text-slate-500">{items.length} code{items.length === 1 ? '' : 's'}</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 rounded-xl bg-orange px-4 py-2.5 text-[13px] font-semibold text-white shadow-sm hover:bg-orange-hover"
        >
          <Plus size={16} /> Generate Codes
        </button>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-xs">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by code or issued-to..."
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-[13px] text-navy placeholder:text-slate-400 focus:border-orange/40 focus:outline-none"
          />
        </div>
        {!contentEditorOnly && (
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as AccessCodeType | '')}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] text-navy focus:border-orange/40 focus:outline-none"
          >
            <option value="">All Types</option>
            {ACCESS_CODE_TYPES.map((t) => (
              <option key={t} value={t}>
                {TYPE_LABEL[t]}
              </option>
            ))}
          </select>
        )}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as AccessCodeStatus | '')}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] text-navy focus:border-orange/40 focus:outline-none"
        >
          <option value="">All Statuses</option>
          {ACCESS_CODE_STATUSES.map((s) => (
            <option key={s} value={s} className="capitalize">
              {s}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="mt-4">
          <Banner variant="error">{error}</Banner>
        </div>
      )}

      {loading ? (
        <div className="mt-4 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-card transition-shadow hover:shadow-card-hover">
          <SkeletonRows rows={6} cols={6} />
        </div>
      ) : items.length === 0 ? (
        <div className="mt-4 flex flex-col items-center justify-center rounded-2xl border border-slate-100 bg-white shadow-card transition-shadow hover:shadow-card-hover py-20 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-chart-amber/15 text-chart-amber">
            <KeyRound size={22} />
          </span>
          <p className="mt-4 font-semibold text-navy">No access codes yet</p>
          <button onClick={openCreate} className="mt-3 rounded-xl bg-orange px-4 py-2 text-[13px] font-semibold text-white hover:bg-orange-hover">
            Generate Codes
          </button>
        </div>
      ) : (
        <div className="mt-4 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-card transition-shadow hover:shadow-card-hover">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead className="border-b border-slate-100 bg-offwhite/60 text-[11px] uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-semibold">Code</th>
                  {!contentEditorOnly && <th className="px-3 py-3 font-semibold">Type</th>}
                  <th className="px-3 py-3 font-semibold">Issued To</th>
                  <th className="px-3 py-3 font-semibold">Status</th>
                  <th className="px-3 py-3 font-semibold">Expires</th>
                  <th className="px-3 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((c) => (
                  <tr key={c._id} className={c.status === 'revoked' ? 'opacity-60' : ''}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="rounded-md bg-navy px-2 py-1 font-mono text-xs font-semibold tracking-wider text-white">{c.code}</span>
                        <button
                          onClick={() => copyCode(c)}
                          className="rounded-md p-2 text-slate-400 hover:bg-offwhite hover:text-navy"
                          title="Copy code"
                        >
                          {copiedId === c._id ? <Check size={14} className="text-success" /> : <Copy size={14} />}
                        </button>
                      </div>
                    </td>
                    {!contentEditorOnly && (
                      <td className="px-3 py-3 text-slate-500">
                        {TYPE_LABEL[c.type]}
                        {c.type === 'scholarship' && c.discountPercent && (
                          <span className="ml-1.5 rounded-full bg-orange/10 px-2 py-0.5 text-[11px] font-semibold text-orange">
                            {c.discountPercent}%
                          </span>
                        )}
                      </td>
                    )}
                    <td className="px-3 py-3 text-slate-500">
                      {c.issuedTo}
                      {c.usedByRegistration ? (
                        <p className="text-xs text-slate-400">
                          Used by {c.usedByRegistration.fullName ?? c.usedByRegistration.email ?? c.usedByRegistration._id}
                        </p>
                      ) : c.sentAt ? (
                        <p className="flex items-center gap-1 text-xs text-slate-400">
                          <Mail size={11} /> Sent {new Date(c.sentAt).toLocaleDateString()}
                        </p>
                      ) : (
                        <p className="text-xs text-warning">Not yet sent</p>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize ${STATUS_STYLE[c.status]}`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-slate-500">
                      {c.expiresAt ? new Date(c.expiresAt).toLocaleDateString() : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => resend(c)}
                          disabled={c.status !== 'unused' || sendingId === c._id}
                          className="rounded-md p-2 text-slate-400 hover:bg-info/10 hover:text-info disabled:cursor-not-allowed disabled:opacity-30"
                          title={c.sentAt ? 'Resend code' : 'Send code'}
                        >
                          <Send size={15} />
                        </button>
                        <button
                          onClick={() => setToRevoke(c)}
                          disabled={c.status !== 'unused'}
                          className="rounded-md p-2 text-slate-400 hover:bg-danger/10 hover:text-danger disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-400"
                          title="Revoke code"
                        >
                          <Ban size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Generate slide-over */}
      <AnimatePresence>
        {formOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] bg-navy/50"
            onClick={() => setFormOpen(false)}
          >
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              onClick={(e) => e.stopPropagation()}
              className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-white shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                <p className="font-display text-lg font-semibold text-navy">Generate Access Codes</p>
                <button onClick={() => setFormOpen(false)} className="text-slate-400 hover:text-navy">
                  <X size={18} />
                </button>
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
                {formError && <Banner variant="error">{formError}</Banner>}
                {!contentEditorOnly && (
                  <AdminSelect
                    label="Type"
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value as AccessCodeType, discountPercent: '' })}
                  >
                    {ACCESS_CODE_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {TYPE_LABEL[t]}
                      </option>
                    ))}
                  </AdminSelect>
                )}
                {form.type === 'scholarship' && (
                  <div>
                    <AdminSelect
                      label="Discount"
                      value={form.discountPercent}
                      onChange={(e) => setForm({ ...form, discountPercent: (e.target.value ? Number(e.target.value) : '') as AccessCodeDiscount | '' })}
                    >
                      <option value="">Choose a tier…</option>
                      {ACCESS_CODE_DISCOUNTS.map((d) => (
                        <option key={d} value={d}>
                          {d}% off{d === 100 ? ' (fully covered)' : d === 10 ? ' (group rate, 5+ attendees)' : ''}
                        </option>
                      ))}
                    </AdminSelect>
                    <p className="mt-1.5 text-xs text-slate-400">
                      {form.discountPercent === 10
                        ? 'Group rate — the recipient must register as a Group with 5 or more attendees for this code to work. It will be rejected on an individual registration or a smaller group.'
                        : 'Applied automatically when the recipient enters this code on the Attendee registration form.'}
                    </p>
                  </div>
                )}
                <div>
                  <AdminTextarea
                    label="Recipient Emails"
                    value={form.emailsText}
                    onChange={(e) => setForm({ ...form, emailsText: e.target.value })}
                    placeholder={'One email per line —\nada@example.com\ntunde@example.com'}
                  />
                  <p className="mt-1.5 text-xs text-slate-400">
                    {parsedEmails.length} code{parsedEmails.length === 1 ? '' : 's'} will be generated, one per email — each is
                    only redeemable by that exact address.
                  </p>
                </div>
                <AdminInput
                  label="Expires On (optional)"
                  type="date"
                  value={form.expiresAt}
                  onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
                />
                <p className="-mt-2 flex items-start gap-1.5 text-xs text-slate-400">
                  <Mail size={13} className="mt-0.5 shrink-0" /> Codes are emailed automatically the moment they&rsquo;re generated.
                </p>
              </div>

              <div className="flex gap-2.5 border-t border-slate-100 px-5 py-4">
                <button onClick={() => setFormOpen(false)} className="flex-1 rounded-lg border border-slate-200 py-2.5 text-[13px] font-semibold text-navy hover:bg-offwhite">
                  Cancel
                </button>
                <button
                  onClick={submit}
                  disabled={saving}
                  className="flex-1 rounded-lg bg-orange py-2.5 text-[13px] font-semibold text-white hover:bg-orange-hover disabled:opacity-60"
                >
                  {saving ? 'Generating…' : `Generate & Send${parsedEmails.length ? ` (${parsedEmails.length})` : ''}`}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmDialog
        open={!!toRevoke}
        title={`Revoke ${toRevoke?.code}?`}
        description="A revoked code can no longer be used to complete registration. This can't be undone."
        loading={revoking}
        onConfirm={confirmRevoke}
        onCancel={() => setToRevoke(null)}
      />
    </div>
  );
};
