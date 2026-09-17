import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Search, Plus, Upload, X, Images, Pencil, Trash2, PlayCircle, Share2, Link2, Facebook, Linkedin, Instagram, Copy, Check, Star } from 'lucide-react';
import {
  adminListMedia,
  adminCreateMedia,
  adminUpdateMedia,
  adminDeleteMedia,
  type AdminMedia,
  type MediaInput,
  type MediaType,
  type MediaDay,
} from '../../services/media.service';
import { getApiErrorMessage } from '../../services/api';
import { Skeleton } from '../../components/ui/Skeleton';
import { Banner } from '../../components/ui/Banner';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { AdminTextarea, AdminInput, AdminSelect, AdminToggle } from '../../components/ui/AdminField';
import { MediaUploader } from '../../components/admin/MediaUploader';
import { BulkUploadModal } from '../../components/admin/BulkUploadModal';
import { useToast } from '../../contexts/ToastContext';
import { buildFacebookShareUrl, buildLinkedInShareUrl, buildXShareUrl, openShareWindow } from '../../utils/socialShare';
import type { UploadedMedia } from '../../services/upload.service';

const EMPTY_FORM: MediaInput = {
  type: 'photo',
  caption: '',
  url: '',
  thumbnailUrl: '',
  day: 'general',
  momentLabel: '',
  isFeatured: false,
  order: 0,
  isPublished: false,
};

const TYPE_FILTERS: { label: string; value: MediaType | '' }[] = [
  { label: 'All', value: '' },
  { label: 'Photos', value: 'photo' },
  { label: 'Videos', value: 'video' },
];

const DAY_FILTERS: { label: string; value: MediaDay | '' }[] = [
  { label: 'All Days', value: '' },
  { label: 'Day 1', value: 'day1' },
  { label: 'Day 2', value: 'day2' },
  { label: 'General', value: 'general' },
];

const DAY_LABEL: Record<MediaDay, string> = { day1: 'Day 1', day2: 'Day 2', general: 'General' };

// Share popover for one Media card — one-click native share windows for
// Facebook/LinkedIn/X (see utils/socialShare.ts for why there's no OAuth here),
// plus a copy-caption-and-open workaround for Instagram, which has no web share
// intent at all.
const ShareMenu = ({ item, onClose }: { item: AdminMedia; onClose: () => void }) => {
  const toast = useToast();
  const [copied, setCopied] = useState(false);

  const copyLink = async () => {
    await navigator.clipboard.writeText(item.url);
    toast('success', 'Link copied');
    onClose();
  };

  const copyForInstagram = async () => {
    await navigator.clipboard.writeText(item.caption || '');
    setCopied(true);
    window.open('https://www.instagram.com/', '_blank', 'noopener,noreferrer');
    setTimeout(() => {
      setCopied(false);
      onClose();
    }, 900);
  };

  return (
    <>
      <div className="fixed inset-0 z-10" onClick={onClose} />
      <div className="absolute right-0 top-full z-20 mt-1.5 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white py-1.5 shadow-lg">
        <button
          onClick={() => {
            openShareWindow(buildFacebookShareUrl(item.url));
            onClose();
          }}
          className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-[13px] font-medium text-slate-600 hover:bg-offwhite hover:text-navy"
        >
          <Facebook size={15} className="text-[#1877F2]" /> Share to Facebook
        </button>
        <button
          onClick={() => {
            openShareWindow(buildLinkedInShareUrl(item.url));
            onClose();
          }}
          className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-[13px] font-medium text-slate-600 hover:bg-offwhite hover:text-navy"
        >
          <Linkedin size={15} className="text-[#0A66C2]" /> Share to LinkedIn
        </button>
        <button
          onClick={() => {
            openShareWindow(buildXShareUrl(item.url, item.caption));
            onClose();
          }}
          className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-[13px] font-medium text-slate-600 hover:bg-offwhite hover:text-navy"
        >
          <X size={15} /> Share to X
        </button>
        <button
          onClick={copyForInstagram}
          title="Instagram has no web share link — this copies the caption and opens Instagram so you can paste it into a new post."
          className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-[13px] font-medium text-slate-600 hover:bg-offwhite hover:text-navy"
        >
          <Instagram size={15} className="text-[#E4405F]" /> {copied ? 'Caption copied — opening…' : 'Copy caption for Instagram'}
        </button>
        <div className="my-1 border-t border-slate-100" />
        <button onClick={copyLink} className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-[13px] font-medium text-slate-600 hover:bg-offwhite hover:text-navy">
          <Link2 size={15} /> Copy direct link
        </button>
      </div>
    </>
  );
};

export const MediaPage = () => {
  const toast = useToast();
  const [searchParams] = useSearchParams();
  const [items, setItems] = useState<AdminMedia[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [q, setQ] = useState(searchParams.get('q') ?? '');
  const [typeFilter, setTypeFilter] = useState<MediaType | ''>('');
  const [dayFilter, setDayFilter] = useState<MediaDay | ''>('');

  const [formOpen, setFormOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [editing, setEditing] = useState<AdminMedia | null>(null);
  const [form, setForm] = useState<MediaInput>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const [toDelete, setToDelete] = useState<AdminMedia | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [shareOpenId, setShareOpenId] = useState<string | null>(null);
  const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    adminListMedia({ q: q || undefined, type: typeFilter || undefined, day: dayFilter || undefined, limit: 100 })
      .then((res) => setItems(res.items))
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [q, typeFilter, dayFilter]);

  useEffect(() => {
    const id = setTimeout(load, q ? 350 : 0);
    return () => clearTimeout(id);
  }, [load, q]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setFormOpen(true);
  };

  const openEdit = (media: AdminMedia) => {
    setEditing(media);
    setForm({
      type: media.type,
      caption: media.caption ?? '',
      url: media.url,
      thumbnailUrl: media.thumbnailUrl ?? '',
      day: media.day,
      momentLabel: media.momentLabel ?? '',
      isFeatured: media.isFeatured,
      order: media.order,
      isPublished: media.isPublished,
    });
    setFormError('');
    setFormOpen(true);
  };

  const onUploaded = (uploaded: UploadedMedia | null) => {
    if (!uploaded) {
      setForm((f) => ({ ...f, url: '', thumbnailUrl: '' }));
      return;
    }
    setForm((f) => ({ ...f, type: uploaded.type, url: uploaded.url, thumbnailUrl: uploaded.thumbnailUrl }));
  };

  const submit = async () => {
    if (!form.url) {
      setFormError('Upload a photo or video first.');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      if (editing) {
        const updated = await adminUpdateMedia(editing._id, form);
        setItems((prev) => prev.map((i) => (i._id === editing._id ? updated : i)));
        toast('success', 'Media updated');
      } else {
        const created = await adminCreateMedia(form);
        setItems((prev) => [created, ...prev]);
        toast('success', 'Media added');
      }
      setFormOpen(false);
    } catch (err) {
      setFormError(getApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const togglePublish = async (media: AdminMedia) => {
    try {
      const updated = await adminUpdateMedia(media._id, { isPublished: !media.isPublished });
      setItems((prev) => prev.map((i) => (i._id === media._id ? updated : i)));
      toast('success', updated.isPublished ? 'Now live on the public Gallery' : 'Removed from the public Gallery');
    } catch (err) {
      toast('error', getApiErrorMessage(err));
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await adminDeleteMedia(toDelete._id);
      setItems((prev) => prev.filter((i) => i._id !== toDelete._id));
      toast('success', 'Media removed');
      setToDelete(null);
    } catch (err) {
      toast('error', getApiErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  };

  const copyLinkInline = async (item: AdminMedia) => {
    await navigator.clipboard.writeText(item.url);
    setCopiedLinkId(item._id);
    setTimeout(() => setCopiedLinkId((id) => (id === item._id ? null : id)), 1500);
  };

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-navy">Gallery</h1>
          <p className="text-sm text-slate-500">
            {items.length} item{items.length === 1 ? '' : 's'} &middot; published items appear on the public Gallery and Home page instantly
          </p>
        </div>
        <div className="flex gap-2.5">
          <button
            onClick={() => setBulkOpen(true)}
            className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-[13px] font-semibold text-navy hover:bg-offwhite"
          >
            <Upload size={16} /> Bulk Upload
          </button>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 rounded-xl bg-orange px-4 py-2.5 text-[13px] font-semibold text-white shadow-sm hover:bg-orange-hover"
          >
            <Plus size={16} /> Upload Media
          </button>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 sm:max-w-xs">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search captions..."
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-[13px] text-navy placeholder:text-slate-400 focus:border-orange/40 focus:outline-none"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {TYPE_FILTERS.map((t) => (
            <button
              key={t.label}
              onClick={() => setTypeFilter(t.value)}
              className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
                typeFilter === t.value ? 'border-orange bg-orange text-white' : 'border-slate-200 text-slate-600 hover:border-orange/40'
              }`}
            >
              {t.label}
            </button>
          ))}
          <span className="mx-0.5 w-px self-stretch bg-slate-200" />
          {DAY_FILTERS.map((d) => (
            <button
              key={d.label}
              onClick={() => setDayFilter(d.value)}
              className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
                dayFilter === d.value ? 'border-navy bg-navy text-white' : 'border-slate-200 text-slate-600 hover:border-navy/40'
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="mt-4">
          <Banner variant="error">{error}</Banner>
        </div>
      )}

      {loading ? (
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square rounded-2xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="mt-4 flex flex-col items-center justify-center rounded-2xl border border-slate-100 bg-white shadow-card transition-shadow hover:shadow-card-hover py-20 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-chart-blue/15 text-chart-blue">
            <Images size={22} />
          </span>
          <p className="mt-4 font-semibold text-navy">No media uploaded yet</p>
          <p className="mt-1 max-w-sm text-sm text-slate-500">
            Upload photos and video clips here as the event unfolds — publish one and it appears on the Gallery page and Home page right away.
          </p>
          <button onClick={openCreate} className="mt-4 rounded-xl bg-orange px-4 py-2 text-[13px] font-semibold text-white hover:bg-orange-hover">
            Upload Media
          </button>
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((item) => (
            <div key={item._id} className={`group relative rounded-2xl border border-slate-100 bg-white shadow-card transition-shadow hover:shadow-card-hover ${!item.isPublished ? 'opacity-70' : ''}`}>
              <div className="relative aspect-square overflow-hidden rounded-t-2xl bg-navy">
                <img src={item.thumbnailUrl || item.url} alt={item.caption || ''} className="h-full w-full object-cover" />
                {item.type === 'video' && (
                  <span className="absolute inset-0 flex items-center justify-center bg-navy/20">
                    <PlayCircle size={32} className="text-white drop-shadow" />
                  </span>
                )}
                <div className="absolute left-2 top-2 flex items-center gap-1">
                  <button
                    onClick={() => togglePublish(item)}
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold shadow ${
                      item.isPublished ? 'bg-success text-white' : 'bg-white/90 text-slate-500'
                    }`}
                  >
                    {item.isPublished ? 'Live' : 'Draft'}
                  </button>
                  {item.isFeatured && (
                    <span title="Featured on Home page" className="flex h-5 w-5 items-center justify-center rounded-full bg-orange text-white shadow">
                      <Star size={11} fill="currentColor" />
                    </span>
                  )}
                </div>
              </div>
              {/* Sits outside the image's own overflow-hidden (needed to clip the image to
                  the card's rounded corners) — nesting the Share dropdown in there clipped
                  its menu text. Always visible below sm — a hover-only reveal is unreachable
                  on a touchscreen, which has no hover state at all. */}
              <div className="absolute right-2 top-2 flex gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
                <div className="relative">
                  <button
                    onClick={() => setShareOpenId(shareOpenId === item._id ? null : item._id)}
                    title="Share"
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-white/95 text-slate-600 shadow hover:text-orange"
                  >
                    <Share2 size={13} />
                  </button>
                  {shareOpenId === item._id && <ShareMenu item={item} onClose={() => setShareOpenId(null)} />}
                </div>
                <button
                  onClick={() => copyLinkInline(item)}
                  title="Copy link"
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-white/95 text-slate-600 shadow hover:text-orange"
                >
                  {copiedLinkId === item._id ? <Check size={13} className="text-success" /> : <Copy size={13} />}
                </button>
                <button onClick={() => openEdit(item)} title="Edit" className="flex h-8 w-8 items-center justify-center rounded-full bg-white/95 text-slate-600 shadow hover:text-orange">
                  <Pencil size={13} />
                </button>
                <button onClick={() => setToDelete(item)} title="Delete" className="flex h-8 w-8 items-center justify-center rounded-full bg-white/95 text-slate-600 shadow hover:text-danger">
                  <Trash2 size={13} />
                </button>
              </div>
              <div className="px-3 py-2.5">
                {(item.day !== 'general' || item.momentLabel) && (
                  <p className="truncate text-[10px] font-semibold uppercase tracking-wide text-orange">
                    {item.day !== 'general' ? DAY_LABEL[item.day] : ''}
                    {item.day !== 'general' && item.momentLabel ? ' — ' : ''}
                    {item.momentLabel}
                  </p>
                )}
                {item.caption && <p className="mt-0.5 truncate text-xs text-slate-500">{item.caption}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit slide-over */}
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
                <p className="font-display text-lg font-semibold text-navy">{editing ? 'Edit Media' : 'Upload Media'}</p>
                <button onClick={() => setFormOpen(false)} className="text-slate-400 hover:text-navy">
                  <X size={18} />
                </button>
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
                {formError && <Banner variant="error">{formError}</Banner>}
                <MediaUploader
                  value={form.url ? { url: form.url, thumbnailUrl: form.thumbnailUrl, type: form.type } : null}
                  onChange={onUploaded}
                />
                <AdminTextarea
                  label="Caption"
                  maxLength={300}
                  value={form.caption}
                  onChange={(e) => setForm({ ...form, caption: e.target.value })}
                  placeholder="What's happening in this shot..."
                />
                <div className="grid grid-cols-2 gap-3">
                  <AdminSelect label="Day" value={form.day} onChange={(e) => setForm({ ...form, day: e.target.value as MediaDay })}>
                    <option value="general">General</option>
                    <option value="day1">Day 1</option>
                    <option value="day2">Day 2</option>
                  </AdminSelect>
                  <AdminInput
                    label="Moment"
                    value={form.momentLabel}
                    onChange={(e) => setForm({ ...form, momentLabel: e.target.value })}
                    placeholder="Opening Ceremony"
                  />
                </div>
                <AdminInput
                  label="Order"
                  type="number"
                  value={form.order}
                  onChange={(e) => setForm({ ...form, order: Number(e.target.value) })}
                />
                <AdminToggle
                  label="Featured on Home page"
                  checked={!!form.isFeatured}
                  onChange={(v) => setForm({ ...form, isFeatured: v })}
                />
                <AdminToggle label="Published" checked={!!form.isPublished} onChange={(v) => setForm({ ...form, isPublished: v })} />
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
                  {saving ? 'Saving…' : editing ? 'Save Changes' : 'Add to Gallery'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmDialog
        open={!!toDelete}
        title="Remove this media?"
        description="This will remove it from the public Gallery and Home page. This can't be undone."
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />

      <AnimatePresence>
        {bulkOpen && (
          <BulkUploadModal
            onClose={() => setBulkOpen(false)}
            onDone={(created) => {
              setItems((prev) => [...created, ...prev]);
              toast('success', `${created.length} item${created.length === 1 ? '' : 's'} uploaded`);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
