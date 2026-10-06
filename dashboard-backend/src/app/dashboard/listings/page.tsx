'use client';

import {
  useState, useRef, useCallback,
  ChangeEvent, FormEvent,
  useEffect,
} from 'react';
import { useSession } from 'next-auth/react';
import ExcelJS from 'exceljs';
import {
  useMyListings,
  MyDraftItem, MyLiveItem,
  MyListingsParams,
  SlotItem,
  SiteWindow,
  KNOWN_SITES,
  SiteSlug,
} from '@/hooks/useListings';
import { Editor } from '@tinymce/tinymce-react';
import { AddListingModal } from '@/app/(admin)/admin/AddListingModal';
import { toast, Toaster } from 'react-hot-toast';
import { listingFormSchema, zodErrorsToFormErrors } from '@/lib/validation/listing-form';


// ─── Types ────────────────────────────────────────────────────
type Mode = 'list' | 'create' | 'update';

/** One row in the slots builder UI */
interface SlotDraft {
  location: string;
  province: string;
  city: string;
  jobPay: string;       // string for input, parsed on submit
  jobVacancy: string;
  jobStartingTime: string;
  isActive: boolean;
  shifts: ShiftDraft[];
}

interface ShiftDraft {
  label: string;
  startTime: string;
  endTime: string;
  days: string[];
}

/** Per-site schedule window in the form */
interface SiteWindowDraft {
  site: SiteSlug | string;
  startAt: string;  // datetime-local string
  endAt: string;
}

interface FormState {
  title: string;
  companyName: string;
  overview: string;
  description: string;
  applyEmail: string;
  jobMode: string;
  jobType: string;
  highlights: string[];
  benefits: string[];
  categories: string[];
  jobBankId: string;
  slots: SlotDraft[];
  siteWindows: SiteWindowDraft[];
  campaignLabel: string;
}

const EMPTY_SLOT: SlotDraft = {
  location: '', province: '', city: '',
  jobPay: '', jobVacancy: '', jobStartingTime: '',
  isActive: true, shifts: [],
};

const EMPTY_SHIFT: ShiftDraft = {
  label: '', startTime: '', endTime: '', days: [],
};

const EMPTY_FORM: FormState = {
  title: '', companyName: '', overview: '', description: '', applyEmail: '',
  jobMode: '', jobType: '', jobBankId: '',
  highlights: [], benefits: [], categories: [],
  slots: [{ ...EMPTY_SLOT }],
  siteWindows: [],
  campaignLabel: 'Hiring Campaign',
};

type ToastFn = typeof toast;

const JOB_MODE_OPTIONS = ['Full-time', 'Part-time', 'Contract', 'Freelance', 'Internship', 'Remote'];
const JOB_TYPE_OPTIONS = ['On-site', 'Remote', 'Hybrid'];
const DRAFT_STATUS_OPTS = ['pending', 'scheduled', 'approved', 'rejected'];
const LIVE_STATUS_OPTS = ['approved'];
const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const SITE_LABELS: Record<string, string> = {
  'jobs-connect.vercel.app': 'Jobs Connect',
  'new-jobs-fawn.vercel.app': 'New in Canada Jobs',
  'jobsrefugee.ca': 'Jobs for Refugees',
  'vulnerableyouthsjobs.ca': 'Vulnerable Youths Jobs',
  'accesscareers.ca': 'Access Careers',
  'indigenouspeoplesjobs.ca': 'Indigenous Peoples Jobs',
};

const SITE_ABBR: Record<string, string> = {
  'jobs-connect.vercel.app': 'JC',
  'new-jobs-fawn.vercel.app': 'NIC',
  'jobsrefugee.ca': 'Ref',
  'vulnerableyouthsjobs.ca': 'VY',
  'accesscareers.ca': 'AC',
  'indigenouspeoplesjobs.ca': 'IP',
};
// ─── Helpers ──────────────────────────────────────────────────
// function nowPlusMinutes(mins: number) {
//   return toLocalDatetimeInput(new Date(Date.now() + mins * 60_000).toISOString());
// }


const TINYMCE_INIT = {
  height: 500,
  menubar: 'file edit view insert format tools table help',
  plugins: [
    'advlist', 'autolink', 'lists', 'link', 'image', 'charmap',
    'preview', 'anchor', 'searchreplace', 'visualblocks', 'code',
    'fullscreen', 'insertdatetime', 'media', 'table', 'help', 'wordcount',
    'codesample', 'emoticons', 'directionality', 'nonbreaking',
    'pagebreak', 'quickbars', 'visualchars',
  ],
  toolbar:
    'undo redo | blocks fontfamily fontsize | ' +
    'bold italic underline strikethrough forecolor backcolor | ' +
    'alignleft aligncenter alignright alignjustify | ' +
    'bullist numlist outdent indent | link image media table codesample | ' +
    'emoticons charmap | removeformat code fullscreen preview help',
  mobile: { toolbar_mode: 'scrolling' },
  content_style:
    'body { font-family: system-ui,-apple-system,sans-serif; font-size:14px; color:#212529; }',
};

/** First active slot from a listing item */
function primarySlot(item: MyDraftItem | MyLiveItem): SlotItem | null {
  return item.slots?.find(s => s.isActive) ?? item.slots?.[0] ?? null;
}

function slotDraftFromSlot(s: SlotItem): SlotDraft {
  return {
    location: s.location ?? '',
    province: s.province ?? '',
    city: s.city ?? '',
    jobPay: String(s.jobPay ?? ''),
    jobVacancy: s.jobVacancy ?? '',
    jobStartingTime: s.jobStartingTime ?? '',
    isActive: s.isActive !== false,
    shifts: (s.shifts ?? []).map(sh => ({
      label: sh.label ?? '',
      startTime: sh.startTime ?? '',
      endTime: sh.endTime ?? '',
      days: sh.days ?? [],
    })),
  };
}

function toLocalDatetimeInput(isoString: string): string {
  if (!isoString) return '';
  const d = new Date(isoString);
  // getFullYear/Month/etc. return LOCAL time values, not UTC
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}`
  );
}

function siteWindowDraftFromWindow(w: SiteWindow): SiteWindowDraft {
  return {
    site: w.site,
    startAt: toLocalDatetimeInput(w.startAt),
    endAt: toLocalDatetimeInput(w.endAt),
  };
}

// ─── Status badge ─────────────────────────────────────────────
// function StatusBadge({ status }: { status: string }) {
//   const map: Record<string, string> = {
//     pending: 'badge-pending',
//     scheduled: 'badge-scheduled',
//     approved: 'badge-approved',
//     rejected: 'badge-rejected',
//   };
//   return <span className={`ulp-badge ${map[status] || 'badge-default'}`}>{status}</span>;
// }

// ─── String-list builder (highlights / benefits) ──────────────
function StringListBuilder({
  label, items, placeholder, onChange,
}: {
  label: string;
  items: string[];
  placeholder: string;
  onChange: (items: string[]) => void;
}) {
  const [input, setInput] = useState('');
  const add = () => {
    if (!input.trim()) return;
    onChange([...items, input.trim()]);
    setInput('');
  };
  const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i));

  return (
    <div className="ulp-tagbuilder">
      <div className="ulp-tagbuilder__list">
        {items.map((h, i) => (
          <div key={i} className="ulp-tag-chip">
            <span>{h}</span>
            <button type="button" onClick={() => remove(i)} title={`Remove ${label}`}>×</button>
          </div>
        ))}
        {items.length === 0 && <p className="ulp-tagbuilder__empty">No {label.toLowerCase()} added yet.</p>}
      </div>
      <div className="ulp-tagbuilder__input-row">
        <input
          type="text" className="form-control form-control-sm"
          placeholder={placeholder}
          value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
        />
        <button type="button" className="ulp-btn ulp-btn--add" onClick={add}>
          <i className="ti ti-plus"></i> Add
        </button>
      </div>
    </div>
  );
}

// ─── Shift builder (inside a slot) ────────────────────────────
function ShiftBuilder({
  shifts, onChange,
}: { shifts: ShiftDraft[]; onChange: (s: ShiftDraft[]) => void }) {
  const addShift = () => onChange([...shifts, { ...EMPTY_SHIFT, label: `Shift ${shifts.length + 1}` }]);
  const removeShift = (i: number) => onChange(shifts.filter((_, idx) => idx !== i));
  const updateShift = (i: number, patch: Partial<ShiftDraft>) =>
    onChange(shifts.map((s, idx) => idx === i ? { ...s, ...patch } : s));
  const toggleDay = (i: number, day: string) => {
    const cur = shifts[i].days;
    const next = cur.includes(day) ? cur.filter(d => d !== day) : [...cur, day];
    updateShift(i, { days: next });
  };

  return (
    <div className="ulp-shifts">
      {shifts.map((sh, i) => (
        <div key={i} className="ulp-shift-card">
          <div className="ulp-shift-card__header">
            <input
              type="text" className="form-control form-control-sm ulp-input"
              placeholder="Shift label e.g. Morning"
              value={sh.label}
              onChange={e => updateShift(i, { label: e.target.value })}
            />
            <button type="button" className="ulp-btn ulp-btn--danger-sm" onClick={() => removeShift(i)}>
              <i className="ti ti-trash"></i>
            </button>
          </div>
          <div className="row g-2 mt-1">
            <div className="col-6">
              <label className="ulp-label-sm">Start time</label>
              <input type="time" className="form-control form-control-sm ulp-input"
                value={sh.startTime} onChange={e => updateShift(i, { startTime: e.target.value })} />
            </div>
            <div className="col-6">
              <label className="ulp-label-sm">End time</label>
              <input type="time" className="form-control form-control-sm ulp-input"
                value={sh.endTime} onChange={e => updateShift(i, { endTime: e.target.value })} />
            </div>
          </div>
          <div className="ulp-shift-days mt-2">
            {WEEK_DAYS.map(d => (
              <button
                key={d} type="button"
                className={`ulp-day-btn ${sh.days.includes(d) ? 'ulp-day-btn--active' : ''}`}
                onClick={() => toggleDay(i, d)}
              >{d}</button>
            ))}
          </div>
        </div>
      ))}
      <button type="button" className="ulp-btn ulp-btn--ghost-accent ulp-btn--sm" onClick={addShift}>
        <i className="ti ti-plus me-1"></i>Add shift
      </button>
    </div>
  );
}

// ─── Slots builder ────────────────────────────────────────────
function SlotsBuilder({
  slots, onChange,
}: { slots: SlotDraft[]; onChange: (s: SlotDraft[]) => void }) {
  const addSlot = () => onChange([...slots, { ...EMPTY_SLOT }]);
  const removeSlot = (i: number) => onChange(slots.filter((_, idx) => idx !== i));
  const updateSlot = (i: number, patch: Partial<SlotDraft>) =>
    onChange(slots.map((s, idx) => idx === i ? { ...s, ...patch } : s));

  return (
    <div className="ulp-slots">
      {slots.map((slot, i) => (
        <div key={i} className="ulp-slot-card">
          <div className="ulp-slot-card__header">
            <span className="ulp-slot-card__title">
              <i className="ti ti-map-pin me-1"></i>
              Location {i + 1}
            </span>
            {slots.length > 1 && (
              <button type="button" className="ulp-btn ulp-btn--danger-sm" onClick={() => removeSlot(i)}>
                <i className="ti ti-trash"></i>
              </button>
            )}
          </div>
          <div className="row g-3 mt-0">
            <div className="col-12">
              <label className="ulp-label">Full address / location <span className="ulp-label__req">*</span></label>
              <input type="text" className="form-control ulp-input" placeholder="e.g. 123 King St, Toronto"
                required value={slot.location} onChange={e => updateSlot(i, { location: e.target.value })} />
            </div>
            <div className="col-12 col-md-6">
              <label className="ulp-label">City <span className="ulp-label__req">*</span></label>
              <input type="text" className="form-control ulp-input" placeholder="Toronto"
                required value={slot.city} onChange={e => updateSlot(i, { city: e.target.value })} />
            </div>
            <div className="col-12 col-md-6">
              <label className="ulp-label">Province <span className="ulp-label__req">*</span></label>
              <input type="text" className="form-control ulp-input" placeholder="Ontario"
                required value={slot.province} onChange={e => updateSlot(i, { province: e.target.value })} />
            </div>
            <div className="col-12 col-md-6">
              <label className="ulp-label">Pay (hour) <span className="ulp-label__req">*</span></label>
              <div className="input-group">
                <span className="input-group-text ulp-input-prefix">$</span>
                <input type="number" className="form-control ulp-input" placeholder="75" min="0"
                  required value={slot.jobPay} onChange={e => updateSlot(i, { jobPay: e.target.value })} />
              </div>
            </div>
            <div className="col-12 col-md-6">
              <label className="ulp-label">Vacancy</label>
              <input type="text" className="form-control ulp-input" placeholder="e.g. 2 positions"
                value={slot.jobVacancy} onChange={e => updateSlot(i, { jobVacancy: e.target.value })} />
            </div>
            <div className="col-12 col-md-6">
              <label className="ulp-label">Starting time</label>
              <input type="text" className="form-control ulp-input" placeholder="e.g. Immediate"
                value={slot.jobStartingTime} onChange={e => updateSlot(i, { jobStartingTime: e.target.value })} />
            </div>
            <div className="col-12 col-md-6 d-flex align-items-end">
              <label className="ulp-toggle mb-2">
                <input type="checkbox" checked={slot.isActive}
                  onChange={e => updateSlot(i, { isActive: e.target.checked })} />
                <span className="ulp-toggle__track"></span>
                <span className="ulp-toggle__label">Location active</span>
              </label>
            </div>
            <div className="col-12">
              <label className="ulp-label">Shifts</label>
              <p className="ulp-hint">Define work shifts for this location.</p>
              <ShiftBuilder shifts={slot.shifts} onChange={sh => updateSlot(i, { shifts: sh })} />
            </div>
          </div>
        </div>
      ))}
      <button type="button" className="ulp-btn ulp-btn--ghost-accent mt-1" onClick={addSlot}>
        <i className="ti ti-plus me-1"></i>Add another location
      </button>
    </div>
  );
}

// ─── Site windows builder ─────────────────────────────────────
// function SiteWindowsBuilder({
//   windows, onChange,
// }: { windows: SiteWindowDraft[]; onChange: (w: SiteWindowDraft[]) => void }) {
//   const usedSites = new Set(windows.map(w => w.site));
//   const availableSites = KNOWN_SITES.filter(s => !usedSites.has(s));

//   const addWindow = () => {
//     if (!availableSites.length) return;
//     onChange([...windows, { site: availableSites[0], startAt: '', endAt: '' }]);
//   };
//   const removeWindow = (i: number) => onChange(windows.filter((_, idx) => idx !== i));
//   const updateWindow = (i: number, patch: Partial<SiteWindowDraft>) =>
//     onChange(windows.map((w, idx) => idx === i ? { ...w, ...patch } : w));

//   const minDT = nowPlusMinutes(2);

//   return (
//     <div className="ulp-site-windows">
//       {windows.length === 0 && (
//         <p className="ulp-hint">
//           No site windows added — the listing will stay <strong>pending</strong> until an admin schedules it.
//         </p>
//       )}
//       {windows.map((w, i) => (
//         <div key={i} className="ulp-site-window-card">
//           <div className="ulp-site-window-card__header">
//             <select
//               className="form-select ulp-input ulp-input--sm"
//               value={w.site}
//               onChange={e => updateWindow(i, { site: e.target.value as SiteSlug })}
//             >
//               {/* Always show the currently selected option */}
//               {w.site && <option value={w.site}>{SITE_LABELS[w.site] ?? w.site}</option>}
//               {availableSites
//                 .filter(s => s !== w.site)
//                 .map(s => <option key={s} value={s}>{SITE_LABELS[s]}</option>)}
//             </select>
//             <button type="button" className="ulp-btn ulp-btn--danger-sm" onClick={() => removeWindow(i)}>
//               <i className="ti ti-x"></i>
//             </button>
//           </div>
//           <div className="row g-2 mt-1">
//             <div className="col-12 col-md-6">
//               <label className="ulp-label-sm">Goes live at</label>
//               <input type="datetime-local" className="form-control ulp-input"
//                 min={minDT} value={toLocalDatetimeInput(w.startAt)}
//                 onChange={e => updateWindow(i, { startAt: e.target.value })}
//                 required={windows.length > 0} />
//             </div>
//             <div className="col-12 col-md-6">
//               <label className="ulp-label-sm">Expires at</label>
//               <input type="datetime-local" className="form-control ulp-input"
//                 min={w.startAt || minDT} value={toLocalDatetimeInput(w.endAt)}
//                 onChange={e => updateWindow(i, { endAt: e.target.value })}
//                 required={windows.length > 0} />
//             </div>
//           </div>
//         </div>
//       ))}
//       {availableSites.length > 0 && (
//         <button type="button" className="ulp-btn ulp-btn--ghost-accent ulp-btn--sm mt-1" onClick={addWindow}>
//           <i className="ti ti-plus me-1"></i>Add site window
//         </button>
//       )}
//     </div>
//   );
// }

function SiteWindowsBuilder({
  windows, onChange, isUpdate = false,
}: { windows: SiteWindowDraft[]; onChange: (w: SiteWindowDraft[]) => void; isUpdate?: boolean }) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const getDefaultStartAt = () => {
    const d = new Date(Date.now() + 60 * 1000);
    return toLocalDatetimeInput(d.toISOString());
  };

  const getDefaultEndAt = (startAt?: string) => {
    const base = startAt ? new Date(startAt) : new Date(Date.now() + 1 * 60 * 1000);
    const end = new Date(base);
    end.setMonth(end.getMonth() + 6);
    return toLocalDatetimeInput(end.toISOString());
  };

  const selectedSites = new Set(windows.map(w => w.site));

  const toggleSite = (site: string) => {
    if (selectedSites.has(site)) {
      onChange(windows.filter(w => w.site !== site));
    } else {
      const start = isUpdate
        ? toLocalDatetimeInput(new Date(Date.now() + 1 * 60 * 1000).toISOString())
        : getDefaultStartAt(); // 24h for new submissions
      onChange([...windows, {
        site: site as SiteSlug,
        startAt: start,
        endAt: getDefaultEndAt(start),
      }]);
    }
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const earliestStart = windows.length
    ? new Date(Math.min(...windows.map(w => new Date(w.startAt).getTime())))
    : isUpdate ? new Date() : new Date(Date.now() + 1 * 60 * 1000);

  const latestEnd = windows.length
    ? new Date(Math.max(...windows.map(w => new Date(w.endAt).getTime())))
    : (() => { const d = new Date(earliestStart); d.setMonth(d.getMonth() + 6); return d; })();

  const fmt = (d: Date) =>
    d.toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' });


  return (
    <div className="ulp-site-ms">
      {/* Schedule info banner */}
      <div className="ulp-site-schedule-banner">
        <div className="ulp-site-schedule-row">
          <div className="ulp-site-schedule-item">
            <i className="ti ti-calendar-event"></i>
            <div>
              <span className="ulp-site-schedule-label">Goes live</span>
              <span className="ulp-site-schedule-val">{fmt(earliestStart)}</span>
            </div>
          </div>
          <span className="ulp-site-schedule-arrow">→</span>
          <div className="ulp-site-schedule-item">
            <i className="ti ti-calendar-x"></i>
            <div>
              <span className="ulp-site-schedule-label">Expires</span>
              <span className="ulp-site-schedule-val">{fmt(latestEnd)}</span>
            </div>
          </div>
        </div>
        <p className="ulp-hint mb-0 mt-2">
          {isUpdate
            ? windows.length > 0
              ? <>Existing schedule will be preserved. Adding new sites starts them <strong>immediately</strong>.</>
              : <>Select sites — they will go live <strong>immediately</strong> upon admin approval.</>
            : <>Listings go live <strong>immediately after submission</strong> and stay active for <strong>6 months</strong>.</>
          }
        </p>
      </div>

      {/* Dropdown trigger */}
      <div className="ulp-site-ms-wrap" ref={dropdownRef}>
        <button
          type="button"
          className="ulp-site-ms-trigger"
          onClick={() => setOpen(o => !o)}
        >
          <i className="ti ti-world"></i>
          <span>
            {selectedSites.size === 0
              ? 'Select sites to publish on…'
              : `${selectedSites.size} site${selectedSites.size > 1 ? 's' : ''} selected`}
          </span>
          <i className={`ti ti-chevron-down ulp-site-ms-chevron${open ? ' open' : ''}`}></i>
        </button>

        {open && (
          <div className="ulp-site-ms-dropdown">
            {KNOWN_SITES.map(site => {
              const selected = selectedSites.has(site);
              return (
                <label
                  key={site}
                  className={`ulp-site-ms-option${selected ? ' ulp-site-ms-option--active' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => toggleSite(site)}
                    className="ulp-site-ms-checkbox"
                  />
                  <span className="ulp-site-ms-check">
                    {selected && <i className="ti ti-check"></i>}
                  </span>
                  <span className="ulp-site-ms-label">{SITE_LABELS[site] ?? site}</span>
                </label>
              );
            })}
          </div>
        )}
      </div>

      {/* Selected pills */}
      {selectedSites.size > 0 && (
        <div className="ulp-site-ms-pills">
          {[...selectedSites].map(site => (
            <span key={site} className="ulp-site-ms-pill">
              {SITE_LABELS[site] ?? site}
              <button type="button" onClick={() => toggleSite(site)} title="Remove">×</button>
            </span>
          ))}
        </div>
      )}

      {selectedSites.size === 0 && (
        <p className="ulp-hint mt-2">
          No sites selected — listing stays <strong>pending</strong> until an admin schedules it.
        </p>
      )}
    </div>
  );
}

// ─── Listing card ─────────────────────────────────────────────
// function ListingCard({
//   item, type, onEdit,
// }: {
//   item: MyDraftItem | MyLiveItem;
//   type: 'draft' | 'live';
//   onEdit: (item: MyDraftItem | MyLiveItem, type: 'draft' | 'live') => void;
// }) {
//   const isDraft = type === 'draft';
//   const draft = isDraft ? (item as MyDraftItem) : null;
//   const slot = primarySlot(item);

//   // Earliest siteWindow startAt for display
//   const nextPublish = item.siteWindows?.length
//     ? new Date(Math.min(...item.siteWindows.map(w => new Date(w.startAt).getTime())))
//     : null;

//   return (
//     <div className={`ulp-card ${item.updateRequested ? 'ulp-card--update' : ''}`}>
//       <div className="ulp-card__body">
//         <div className="ulp-card__top">
//           <div style={{ minWidth: 0 }}>
//             <div className="d-flex align-items-center gap-2 flex-wrap mb-1">
//               <span className="ulp-card__jobid">{item.jobId ?? '—'}</span>
//               {item.siteWindows?.map(w => (
//                 <span key={w.site} className="ulp-site-pill">{SITE_LABELS[w.site] ?? w.site}</span>
//               ))}
//             </div>
//             <h3 className="ulp-card__title">{item.title}</h3>
//             <p className="ulp-card__categories">
//               {(item.categories || []).join(', ')}
//             </p>
//             {slot && (
//               <p className="ulp-card__location">
//                 <i className="ti ti-map-pin me-1"></i>
//                 {slot.city}{slot.province ? `, ${slot.province}` : ''}
//                 {item.slots.length > 1 && (
//                   <span className="ulp-card__extra-slots"> +{item.slots.length - 1} more location{item.slots.length > 2 ? 's' : ''}</span>
//                 )}
//               </p>
//             )}
//           </div>
//           <div className="ulp-card__badges">
//             <StatusBadge status={item.status} />
//             {isDraft && draft!.status === 'scheduled' && nextPublish && (
//               <span className="ulp-badge badge-scheduled-time">
//                 <i className="ti ti-clock me-1"></i>
//                 {nextPublish.toLocaleDateString()}
//               </span>
//             )}
//             {item.updateRequested && (
//               <span className="ulp-badge badge-update-pending">Update pending</span>
//             )}
//           </div>
//         </div>

//         {/* ── Slot financials strip ── */}
//         {slot && (
//           <div className="ulp-card__financials">
//             <div className="ulp-card__stat">
//               <span className="ulp-card__stat-label">Mode</span>
//               <span className="ulp-card__stat-value">{item.jobMode || '—'}</span>
//             </div>
//             <div className="ulp-card__stat">
//               <span className="ulp-card__stat-label">Pay</span>
//               <span className="ulp-card__stat-value">
//                 {slot.jobPay != null ? `$${Number(slot.jobPay).toLocaleString()}` : '—'}
//               </span>
//             </div>
//             <div className="ulp-card__stat">
//               <span className="ulp-card__stat-label">Type</span>
//               <span className="ulp-card__stat-value">{item.jobType || '—'}</span>
//             </div>
//             <div className="ulp-card__stat">
//               <span className="ulp-card__stat-label">Vacancy</span>
//               <span className="ulp-card__stat-value">{slot.jobVacancy || '—'}</span>
//             </div>
//             {slot.jobStartingTime && (
//               <div className="ulp-card__stat">
//                 <span className="ulp-card__stat-label">Start</span>
//                 <span className="ulp-card__stat-value">{slot.jobStartingTime}</span>
//               </div>
//             )}
//             {slot.shifts?.length > 0 && (
//               <div className="ulp-card__stat">
//                 <span className="ulp-card__stat-label">Shifts</span>
//                 <span className="ulp-card__stat-value">{slot.shifts.length} defined</span>
//               </div>
//             )}
//           </div>
//         )}

//         {/* Site windows timeline */}
//         {item.siteWindows?.length > 0 && (
//           <div className="ulp-card__windows">
//             {item.siteWindows.map(w => (
//               <div key={w.site} className="ulp-window-row">
//                 <span className="ulp-window-site">{SITE_LABELS[w.site] ?? w.site}</span>
//                 <span className="ulp-window-range">
//                   {new Date(w.startAt).toLocaleDateString()} → {new Date(w.endAt).toLocaleDateString()}
//                   <span className="ulp-window-dur"> ({w.durationDays}d)</span>
//                 </span>
//               </div>
//             ))}
//           </div>
//         )}

//         <div className="ulp-card__footer">
//           <span className="ulp-card__date">
//             Submitted {new Date(item.createdAt).toLocaleDateString()}
//           </span>
//           <button
//             className="ulp-btn ulp-btn--edit"
//             onClick={() => onEdit(item, type)}
//             disabled={item.updateRequested}
//             title={item.updateRequested ? 'An update is pending review' : 'Changes Job Post'}
//           >
//             <i className="ti ti-edit me-1"></i>
//             {isDraft ? 'Changes Job Post' : 'Update Job Post'}
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// }

const SITE_SLUGS = [
  'jobs-connect.vercel.app',
  'new-jobs-fawn.vercel.app',
  'jobsrefugee.ca',
  'vulnerableyouthsjobs.ca',
  'accesscareers.ca',
  'indigenouspeoplesjobs.ca',
] as const;

function ActiveToggle({ active, onToggle }: { active: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      className={`lc-active-toggle${active ? ' lc-active-toggle--on' : ''}`}
      onClick={onToggle}
      title={active ? 'Listing is visible — click to hide' : 'Listing is hidden — click to show'}
    >
      <span className="lc-active-toggle__track">
        <span className="lc-active-toggle__thumb" />
      </span>
      {/* <span className="lc-active-toggle__label">{active ? '' : ''}</span> */}
    </button>
  );
}

function ListingCard({
  item, type, onEdit, index = 0, toast, onToggleActive,
}: {
  item: MyDraftItem | MyLiveItem;
  type: 'draft' | 'live';
  onEdit: (item: MyDraftItem | MyLiveItem, type: 'draft' | 'live') => void;
  index?: number;
  toast: ToastFn;
  onToggleActive?: (item: MyLiveItem) => void;
}) {
  const slot = primarySlot(item);
  const assignedSites = new Set(item.siteWindows?.map((w: any) => w.site) ?? []);

  const handleDownload = async () => {
    try {
      const tableParam = type === 'draft' ? 'drafts' : 'live';
      const res = await fetch(`/api/admin/listings/${item.id}/report?table=${tableParam}`);
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error || 'Failed to generate report');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `listing-report-${item.id}-${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Report downloaded');
    } catch (error: any) {
      toast.error('Download failed', error.message);
    }
  };

  return (
    <div className={[
      'lc-row',
      index % 2 !== 0 ? 'lc-row--alt' : '',
      item.updateRequested ? 'lc-row--update' : '',
    ].filter(Boolean).join(' ')}>

      {/* ── DESKTOP ROW (grid) ── */}

      {/* Col 1 — # */}
      <div className="lc-col lc-col--id">
        <span className="lc-jobid">{index + 1}</span>
      </div>

      {/* Col 2 — Title */}
      <div className="lc-col lc-col--title">
        <span className="lc-title">{item.title}</span>
        {item.categories?.length > 0 && (
          <span className="lc-cats">{item.categories.join(' · ')}</span>
        )}
      </div>

      {/* Col 3 — Company */}
      <div className="lc-col lc-col--company">
        {item.companyName ? (
          <span className="lc-company">
            <i className="ti ti-building" aria-hidden="true" />
            {item.companyName}
          </span>
        ) : (
          <span className="lc-muted">—</span>
        )}
      </div>

      {/* Col 4 — Location */}
      <div className="lc-col lc-col--location">
        {slot ? (
          <>
            <span className="lc-location">
              <i className="ti ti-map-pin" aria-hidden="true" />
              {slot.city}{slot.province ? `, ${slot.province}` : ''}
            </span>
            {item.slots.length > 1 && (
              <span className="lc-extra">+{item.slots.length - 1} more</span>
            )}
          </>
        ) : (
          <span className="lc-muted">—</span>
        )}
      </div>

      {/* Cols 5–10 — one per site (desktop only) */}
      {SITE_SLUGS.map(slug => (
        <div key={slug} className="lc-col lc-col--site">
          {assignedSites.has(slug)
            ? <span className="lc-site-live">Live</span>
            : <span className="lc-muted">—</span>
          }
        </div>
      ))}

      {/* Col 11 — Submitted */}
      <div className="lc-col lc-col--submitted">
        <span className="lc-date-val">
          {new Date(item.createdAt).toLocaleDateString('en-CA', {
            year: 'numeric', month: 'short', day: 'numeric',
          })}
        </span>
        <span className="lc-date-sub">
          {new Date(item.createdAt).toLocaleTimeString('en-CA', {
            hour: '2-digit', minute: '2-digit',
          })}
        </span>
      </div>

      {/* Col 12 — Action */}
      <div className="lc-col lc-col--action">
        {item.updateRequested && (
          <span className="lc-badge-warn" title="Update pending review">
            <i className="ti ti-alert-triangle" aria-hidden="true" />
          </span>
        )}
        {type === 'live' && (
          <ActiveToggle
            active={(item as MyLiveItem).isActive}
            onToggle={() => onToggleActive?.(item as MyLiveItem)}
          />
        )}
        <div>
          <button
            className="lc-edit-btn"
            onClick={() => onEdit(item, type)}
            disabled={item.updateRequested}
            title={item.updateRequested ? 'An update is pending review' : 'Edit listing'}
          >
            <i className="ti ti-edit" aria-hidden="true" />
          </button>
          <button className="lc-edit-btn" title="Download report" onClick={handleDownload}>
            <i className="ti ti-download" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* ── MOBILE CARD (flex column, shown only on small screens) ── */}
      <div className="lc-mobile-card">

        {/* Top strip — serial + update warning */}
        <div className="lc-mc-top">
          <span className="lc-jobid">#{index + 1}</span>
          {item.updateRequested && (
            <span className="lc-badge-warn" title="Update pending">
              <i className="ti ti-alert-triangle" /> Update pending
            </span>
          )}
          <div className="lc-mc-actions">
            {type === 'live' && (
              <ActiveToggle
                active={(item as MyLiveItem).isActive}
                onToggle={() => onToggleActive?.(item as MyLiveItem)}
              />
            )}
            <button
              className="lc-mc-btn"
              onClick={() => onEdit(item, type)}
              disabled={item.updateRequested}
              title="Edit listing"
            >
              <i className="ti ti-edit" /> Edit
            </button>
            <button
              className="lc-mc-btn lc-mc-btn--ghost"
              onClick={handleDownload}
              title="Download report"
            >
              <i className="ti ti-download" /> PDF
            </button>
          </div>
        </div>

        {/* Title + categories */}
        <div className="lc-mc-title">{item.title}</div>
        {item.categories?.length > 0 && (
          <div className="lc-cats">{item.categories.join(' · ')}</div>
        )}

        {/* Meta row — company + location */}
        <div className="lc-mc-meta">
          {item.companyName && (
            <span className="lc-mc-meta-item">
              <i className="ti ti-building" />
              {item.companyName}
            </span>
          )}
          {slot && (
            <span className="lc-mc-meta-item">
              <i className="ti ti-map-pin" />
              {slot.city}{slot.province ? `, ${slot.province}` : ''}
              {item.slots.length > 1 && (
                <span className="lc-extra"> +{item.slots.length - 1}</span>
              )}
            </span>
          )}
        </div>

        {/* Sites grid */}
        <div className="lc-mc-sites">
          {SITE_SLUGS.map(slug => (
            <span
              key={slug}
              className={`lc-mc-site${assignedSites.has(slug) ? ' lc-mc-site--live' : ' lc-mc-site--off'}`}
            >
              {SITE_ABBR[slug]}
              {assignedSites.has(slug)
                ? <i className="ti ti-check" />
                : <i className="ti ti-minus" />
              }
            </span>
          ))}
        </div>

        {/* Submitted date */}
        <div className="lc-mc-date">
          <i className="ti ti-clock" />
          {new Date(item.createdAt).toLocaleDateString('en-CA', {
            year: 'numeric', month: 'short', day: 'numeric',
          })}
          {' · '}
          {new Date(item.createdAt).toLocaleTimeString('en-CA', {
            hour: '2-digit', minute: '2-digit',
          })}
        </div>

      </div>
    </div>
  );
}

function CategoryPicker({
  categories,
  selected,
  onChange,
}: {
  categories: { value: string; label: string }[];
  selected: string[];
  onChange: (v: string[]) => void;
}) {
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState(false);
  const SHOW_MAX = 8;

  const filtered = categories.filter(c =>
    c.label.toLowerCase().includes(search.toLowerCase())
  );
  const visible = expanded || search ? filtered : filtered.slice(0, SHOW_MAX);
  const hiddenCount = filtered.length - SHOW_MAX;

  const toggle = (val: string) => {
    onChange(
      selected.includes(val)
        ? selected.filter(v => v !== val)
        : [...selected, val]
    );
  };

  return (
    <div className="cp-wrap">
      {/* Search bar */}
      <div className="cp-search">
        <i className="ti ti-search cp-search-icon" />
        <input
          type="text"
          className="cp-search-input"
          placeholder="Search categories…"
          value={search}
          onChange={e => { setSearch(e.target.value); setExpanded(false); }}
        />
        {search && (
          <button type="button" className="cp-search-clear" onClick={() => setSearch('')}>
            <i className="ti ti-x" />
          </button>
        )}
      </div>

      {/* Pills grid */}
      <div className="cp-pills">
        {visible.length === 0 && (
          <p className="ulp-hint mb-0">No categories match "{search}"</p>
        )}
        {visible.map(cat => {
          const isSelected = selected.includes(cat.value);
          return (
            <button
              key={cat.value}
              type="button"
              className={`cp-pill${isSelected ? ' cp-pill--active' : ''}`}
              onClick={() => toggle(cat.value)}
            >
              {isSelected && <i className="ti ti-check" style={{ fontSize: 10, marginRight: 4 }} />}
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Show more / less (only when not searching) */}
      {!search && hiddenCount > 0 && (
        <button
          type="button"
          className="cp-toggle"
          onClick={() => setExpanded(e => !e)}
        >
          {expanded
            ? <><i className="ti ti-chevron-up me-1" />Show less</>
            : <><i className="ti ti-chevron-down me-1" />Show {hiddenCount} more categories</>
          }
        </button>
      )}

      {/* Selected summary */}
      {selected.length > 0 && (
        <div className="cp-summary">
          <span className="cp-summary-text">
            {selected.length} selected: {selected.join(', ')}
          </span>
          <button
            type="button"
            className="cp-clear-btn"
            onClick={() => onChange([])}
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════
export default function MyListingsPage() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { data: session, status: sessionStatus } = useSession();

  // ── Filters ───────────────────────────────────────────────
  const [table, setTable] = useState<'all' | 'drafts' | 'live'>('all');
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [createdFrom, setCreatedFrom] = useState('');
  const [createdTo, setCreatedTo] = useState('');
  const [page, setPage] = useState(1);
  // const [editorContent, setEditorContent] = useState('');
  const editorRef = useRef<any>(null);
  const perPage = 10;

  const [showNoCreditsModal, setShowNoCreditsModal] = useState(false);
  const [availableCredits, setAvailableCredits] = useState<number | null>(null);
  const [checkingCredits, setCheckingCredits] = useState(false);

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const listingsParams: MyListingsParams = {
    table,
    search, status: filterStatus,
    createdFrom, createdTo, page, perPage,
  };

  const { data, total, totalPages, loading, error, refetch } = useMyListings(listingsParams);
  const [categories, setCategories] = useState<{ value: string; label: string }[]>([]);

  useEffect(() => {
    fetch('/api/services?status=published&isActive=true&perPage=100')
      .then(r => r.json())
      .then(json => {
        setCategories((json.data ?? []).map((s: any) => ({ value: s.title, label: s.title })));
      })
      .catch(() => { });
  }, []);

  // ── Mode & editing ────────────────────────────────────────
  const [mode, setMode] = useState<Mode>('list');
  const [editTarget, setEditTarget] = useState<{
    item: MyDraftItem | MyLiveItem;
    type: 'draft' | 'live';
  } | null>(null);

  // ── Form ──────────────────────────────────────────────────
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  // ── Import / export ───────────────────────────────────────
  // const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  // const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Open create ───────────────────────────────────────────
  const openCreate = useCallback(async () => {
    setCheckingCredits(true);
    try {
      const res = await fetch('/api/employer/credits/wallet', { cache: 'no-store' });
      const data = await res.json();
      const available = data.availableCredits ?? Math.max(
        (data.totalPurchased ?? 0) - (data.totalSpent ?? 0) - (data.totalExpired ?? 0),
        0
      );
      setAvailableCredits(available);
      if (available < 1) {
        setShowNoCreditsModal(true);
        return;
      }
    } catch {
      // If the credit check itself fails, don't block the user — the
      // server-side check in /api/listings/submit is still the source
      // of truth and will reject the submission if credits are missing.
    } finally {
      setCheckingCredits(false);
    }

    setForm({ ...EMPTY_FORM, slots: [{ ...EMPTY_SLOT }] });
    setSubmitError(null); setSubmitSuccess(null);
    setEditTarget(null);
    setMode('create');
  }, []);

  const handleToggleActive = useCallback(async (item: MyLiveItem) => {
    const next = !item.isActive;
    try {
      const res = await fetch(`/api/listings/${item.id}/toggle`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: next }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to update listing status');
      toast.success(next ? 'Listing is now live' : 'Listing hidden from sites');
      await refetch();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update listing status');
    }
  }, [refetch]);

  // ── Open update — pre-populate from existing item ─────────
  // ── Open update — pre-populate from existing item ─────────
  const openUpdate = useCallback(async (item: MyDraftItem | MyLiveItem, type: 'draft' | 'live') => {
    // Populate everything we already have immediately so the rest of the
    // form isn't blank while we fetch.
    setForm({
      title: item.title,
      companyName: item.companyName,
      overview: item.overview || '',
      description: item.description || '',
      applyEmail: item.applyEmail || '',
      jobMode: item.jobMode || '',
      jobType: item.jobType || '',
      highlights: item.highlights || [],
      benefits: item.benefits || [],
      jobBankId: item.jobBankId || '',
      categories: item.categories || [],
      slots: item.slots?.length ? item.slots.map(slotDraftFromSlot) : [{ ...EMPTY_SLOT }],
      siteWindows: item.siteWindows?.length ? item.siteWindows.map(siteWindowDraftFromWindow) : [],
      campaignLabel: (item as MyDraftItem).campaignWindow?.label || 'Hiring Campaign',
    });
    setEditTarget({ item, type });
    setSubmitError(null); setSubmitSuccess(null);
    setMode('update');

    // The list endpoint that feeds this table may not include the full
    // `overview` HTML (it's not shown in the table itself), so re-fetch
    // the single record to guarantee the editor gets the real content —
    // don't rely on whatever the list happened to hand us.
    try {
      const table = type === 'draft' ? 'drafts' : 'live';
      const res = await fetch(`/api/admin/listings/${item.id}?table=${table}`);
      if (res.ok) {
        const json = await res.json();
        const full = json.data ?? json;
        if (full.overview) {
          setForm(f => ({ ...f, overview: full.overview }));
          editorRef.current?.setContent(full.overview);
        }
      }
    } catch {
      // Non-fatal — form still has whatever the list item provided.
    }
  }, []);

  // ── Serialize form → FormData and POST/PUT ─────────────────
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(null);
    setFieldErrors({});

    if (form.siteWindows.length === 0) {
      toast.error('Please select at least one site to publish the listing on.');
      setSubmitting(false);
      return;
    }

    try {
      const fd = new FormData();

      const content = editorRef.current?.getContent() || '';

      const formValues = {
        ...form,
        overview: content, // TinyMCE content
        slots: form.slots.map(s => ({
          ...s,
          // Ensure jobPay stays as string for Zod validation
          shifts: s.shifts.map(sh => ({
            label: sh.label || 'Shift',
            startTime: sh.startTime || undefined,
            endTime: sh.endTime || undefined,
            days: sh.days,
          })),
        })),
        siteWindows: form.siteWindows.map(w => ({
          site: w.site,
          startAt: w.startAt,
          endAt: w.endAt,
        })),
      };

      const result = listingFormSchema.safeParse(formValues);
      if (!result.success) {
        const errors = zodErrorsToFormErrors(result.error);
        setFieldErrors(errors);
        const firstError = Object.values(errors)[0] || 'Validation failed';
        toast.error(`Please fix the form: ${firstError}`);
        setSubmitting(false);
        return;
      }

      fd.append('title', form.title);
      fd.append('companyName', form.companyName);
      fd.append('overview', content);
      fd.append('description', form.description);
      fd.append('applyEmail', form.applyEmail);
      fd.append('jobMode', form.jobMode);
      if (form.jobType) fd.append('jobType', form.jobType);
      fd.append('highlights', JSON.stringify(form.highlights));
      fd.append('jobBankId', form.jobBankId || "JobBankId ----");
      fd.append('benefits', JSON.stringify(form.benefits));
      fd.append('categories', JSON.stringify(form.categories));
      fd.append('campaignLabel', form.campaignLabel);

      // Serialize slots
      const slotsPayload = form.slots.map(s => ({
        location: s.location,
        province: s.province,
        city: s.city,
        jobPay: parseFloat(s.jobPay) || 0,
        jobVacancy: s.jobVacancy || undefined,
        jobStartingTime: s.jobStartingTime || undefined,
        isActive: s.isActive,
        shifts: s.shifts.map(sh => ({
          label: sh.label || 'Shift',
          startTime: sh.startTime || undefined,
          endTime: sh.endTime || undefined,
          days: sh.days,
        })),
      }));
      fd.append('slots', JSON.stringify(slotsPayload));

      // Serialize siteWindows
      if (form.siteWindows.length > 0) {
        const swPayload = form.siteWindows.map(w => ({
          site: w.site,
          startAt: new Date(w.startAt).toISOString(),
          endAt: new Date(w.endAt).toISOString(),
        }));
        fd.append('siteWindows', JSON.stringify(swPayload));
      }

      const isUpdate = mode === 'update';
      const url = isUpdate ? '/api/listings/update-request' : '/api/listings/submit';
      const method = isUpdate ? 'PUT' : 'POST';

      if (isUpdate) {
        fd.append('listingId', editTarget!.item.id);
        fd.append('listingType', editTarget!.type);
      }

      console.log(fd);

      const res = await fetch(url, { method, body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Submission failed');

      const successMsg = isUpdate
        ? 'Update Applied!'
        : `Listing submitted! Job ID: ${json.jobId ?? '—'}`;

      setSubmitSuccess(successMsg);
      toast.success(successMsg);

      await refetch();
      setTimeout(() => { setMode('list'); setSubmitSuccess(null); }, 3500);
    } catch (err: any) {
      setSubmitError(err.message);
      toast.error(err.message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Export ────────────────────────────────────────────────
  const handleExport = async () => {
    setExporting(true);
    try {
      const sp = new URLSearchParams({ table, page: '1', perPage: '10000' });
      if (search) sp.set('search', search);
      if (filterStatus) sp.set('status', filterStatus);
      const res = await fetch(`/api/listings/my?${sp}`, { cache: 'no-store' });
      const json = await res.json();
      const rows: (MyDraftItem | MyLiveItem)[] = json.data || [];

      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet('My Listings');

      ws.columns = [
        { header: 'ID', key: 'id', width: 28 },
        { header: 'Job ID', key: 'jobId', width: 20 },
        { header: 'Job Bank Id', key: 'jobBankId', width: 20 },
        { header: 'Title', key: 'title', width: 50 },
        { header: 'Company Name', key: 'companyName', width: 50 },
        { header: 'Overview', key: 'overview', width: 60 },
        { header: 'Description', key: 'description', width: 60 },
        { header: 'Apply Email', key: 'applyEmail', width: 60 },
        { header: 'Job Bank Id', key: 'jobBankId', width: 60 },
        { header: 'Highlights', key: 'highlights', width: 60 },
        { header: 'Benefits', key: 'benefits', width: 60 },
        { header: 'Categories', key: 'categories', width: 40 },
        { header: 'Job Mode', key: 'jobMode', width: 18 },
        { header: 'Job Type', key: 'jobType', width: 18 },
        { header: 'Status', key: 'status', width: 18 },
        // Primary slot fields
        { header: 'Location', key: 'location', width: 35 },
        { header: 'City', key: 'city', width: 20 },
        { header: 'Province', key: 'province', width: 20 },
        { header: 'Pay', key: 'jobPay', width: 15 },
        { header: 'Vacancy', key: 'jobVacancy', width: 18 },
        { header: 'Starting Time', key: 'jobStartingTime', width: 22 },
        { header: 'All Slots (JSON)', key: 'slotsJson', width: 60 },
        // Site windows
        { header: 'Sites', key: 'sites', width: 40 },
        { header: 'Site Windows (JSON)', key: 'siteWindowsJson', width: 80 },
        { header: 'Slug', key: 'slug', width: 50 },
        { header: 'Created At', key: 'createdAt', width: 25 },
        { header: 'Updated At', key: 'updatedAt', width: 25 },
      ];

      rows.forEach(r => {
        const slot = primarySlot(r);
        ws.addRow({
          id: r.id,
          jobId: r.jobId ?? '',
          title: r.title,
          companyNme: r.companyName,
          overview: r.overview ?? '',
          highlights: (r.highlights || []).join(' | '),
          benefits: (r.benefits || []).join(' | '),
          categories: (r.categories || []).join(' | '),
          jobBankId: r.jobBankId ?? '',
          jobMode: r.jobMode ?? '',
          jobType: r.jobType ?? '',
          status: r.status,
          location: slot?.location ?? '',
          city: slot?.city ?? '',
          province: slot?.province ?? '',
          jobPay: slot?.jobPay ?? '',
          jobVacancy: slot?.jobVacancy ?? '',
          jobStartingTime: slot?.jobStartingTime ?? '',
          slotsJson: JSON.stringify(r.slots ?? []),
          sites: (r.visibleOnSites || []).join(' | '),
          siteWindowsJson: JSON.stringify(r.siteWindows ?? []),
          slug: r.slug,
          createdAt: r.createdAt ? new Date(r.createdAt).toLocaleString() : '',
          updatedAt: r.updatedAt ? new Date(r.updatedAt).toLocaleString() : '',
        });
      });

      ws.getRow(1).font = { bold: true };
      ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };

      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const a = Object.assign(document.createElement('a'), {
        href: URL.createObjectURL(blob),
        download: `my_listings_${table}_${new Date().toISOString().slice(0, 10)}.xlsx`,
      });
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
    } catch (e: any) {
      alert(`Export failed: ${e.message}`);
    } finally {
      setExporting(false);
    }
  };

  // ── Import ────────────────────────────────────────────────
  // Supports both new format (slotsJson column) and legacy flat rows
  // const handleImport = async (e: ChangeEvent<HTMLInputElement>) => {
  //   const file = e.target.files?.[0];
  //   if (!file) return;
  //   setImporting(true);
  //   try {
  //     const buffer = await file.arrayBuffer();
  //     const wb = new ExcelJS.Workbook();
  //     await wb.xlsx.load(buffer);
  //     const ws = wb.getWorksheet(1);
  //     if (!ws) throw new Error('No worksheet found');

  //     const headers: string[] = [];
  //     ws.getRow(1).eachCell((cell, col) => {
  //       headers[col] = String(cell.value ?? '').toLowerCase().trim();
  //     });

  //     const fieldMap: Record<string, string> = {
  //       'title': 'title',
  //       "company name": "companyName",
  //       'overview': 'overview',
  //       'description': 'description',
  //       'applyEmail': 'applyEmail',
  //       'highlights': 'highlights',
  //       'benefits': 'benefits',
  //       'categories': 'categories',
  //       'job mode': 'jobMode',
  //       'job type': 'jobType',
  //       'slug': 'slug',
  //       'jobBankId': 'jobBankId',
  //       // primary slot (legacy / convenience)
  //       'location': 'location',
  //       'city': 'city',
  //       'province': 'province',
  //       'pay': 'jobPay',
  //       'job pay': 'jobPay',
  //       'vacancy': 'jobVacancy',
  //       'job vacancy': 'jobVacancy',
  //       'starting time': 'jobStartingTime',
  //       // new format
  //       'all slots (json)': 'slotsJson',
  //       'site windows (json)': 'siteWindowsJson',
  //       'sites': 'sites',
  //     };

  //     const items: any[] = [];
  //     ws.eachRow((row, rowNum) => {
  //       if (rowNum === 1) return;
  //       const item: any = {};
  //       row.eachCell((cell, col) => {
  //         const field = fieldMap[headers[col]];
  //         if (field) item[field] = String(cell.value ?? '').trim();
  //       });
  //       if (!item.title) return;

  //       // Expand slots
  //       if (item.slotsJson) {
  //         try { item.slots = JSON.parse(item.slotsJson); } catch { /**/ }
  //         delete item.slotsJson;
  //       } else if (item.location) {
  //         // Build a single slot from flat columns
  //         item.slots = [{
  //           location: item.location,
  //           city: item.city ?? '',
  //           province: item.province ?? '',
  //           jobPay: parseFloat(item.jobPay) || 0,
  //           jobVacancy: item.jobVacancy || undefined,
  //           jobStartingTime: item.jobStartingTime || undefined,
  //           isActive: true,
  //           shifts: [],
  //         }];
  //       }

  //       // Expand siteWindows
  //       if (item.siteWindowsJson) {
  //         try { item.siteWindows = JSON.parse(item.siteWindowsJson); } catch { /**/ }
  //         delete item.siteWindowsJson;
  //       } else if (item.sites) {
  //         item.visibleOnSites = item.sites.split('|').map((s: string) => s.trim()).filter(Boolean);
  //         delete item.sites;
  //       }

  //       // Parse pipe-separated arrays
  //       if (typeof item.highlights === 'string')
  //         item.highlights = item.highlights.split('|').map((s: string) => s.trim()).filter(Boolean);
  //       if (typeof item.benefits === 'string')
  //         item.benefits = item.benefits.split('|').map((s: string) => s.trim()).filter(Boolean);
  //       if (typeof item.categories === 'string')
  //         item.categories = item.categories.split('|').map((s: string) => s.trim()).filter(Boolean);

  //       items.push(item);
  //     });

  //     if (!items.length) { alert('No valid rows found in spreadsheet.'); return; }

  //     const res = await fetch('/api/listings/import', {
  //       method: 'POST',
  //       headers: { 'Content-Type': 'application/json' },
  //       body: JSON.stringify({ items }),
  //     });
  //     const result = await res.json();
  //     alert(
  //       `Import complete:\n• ${result.inserted} inserted\n• ${result.updated} updated\n• ${result.errors} errors`,
  //     );
  //     await refetch();
  //   } catch (err: any) {
  //     alert(`Import error: ${err.message}`);
  //   } finally {
  //     setImporting(false);
  //     if (fileInputRef.current) fileInputRef.current.value = '';
  //   }
  // };

  // ── Guards ────────────────────────────────────────────────
  if (sessionStatus === 'loading' || (mode === 'list' && loading && !data.length)) {
    return (
      <div className="ulp-loading">
        <div className="ulp-spinner ulp-spinner--dark mt-5"></div>
        <p>Loading your listings…</p>
      </div>
    );
  }
  if (!session) {
    return (
      <div className="ulp-gate">
        <i className="ti ti-lock"></i>
        <h2>Sign in to manage your listings</h2>
        <a href="/auth/sign-in" className="ulp-btn ulp-btn--primary">Sign in</a>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════
  // LIST VIEW
  // ════════════════════════════════════════════════════════════
  if (mode === 'list') {
    return (
      <section className="ulp container-md bg-transparent">
        <style>{ACTIVE_TOGGLE_STYLES}</style>
        <Toaster
          position="bottom-right"
          toastOptions={{ duration: 4000 }}
          containerStyle={{ zIndex: 100 }}
        />
        <div className="ulp__header">
          <div className="">
            <div className="ulp__header-inner">
              <div>
                <h1 className="ulp__heading">My Job Listings</h1>
                <p className="ulp__subtext">
                  {total} listing{total !== 1 ? 's' : ''} found
                </p>
              </div>
              <div className="d-flex gap-2 flex-wrap align-items-center">
                {/* <input
                  type="file" ref={fileInputRef} accept=".xlsx,.xls"
                  className="d-none" onChange={handleImport}
                />
                <button
                  className="ulp-btn ulp-btn--outline border-white"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={importing}
                >
                  {importing
                    ? <span className="text-white"><span className="ulp-spinner ulp-spinner--sm me-1"></span>Importing…</span>
                    : <span className="text-white"><i className="ti ti-file-import me-1"></i>Import</span>
                  }
                </button> */}
                <button
                  className="ulp-btn ulp-btn--outline border-white"
                  onClick={handleExport} disabled={exporting}
                >
                  {exporting
                    ? <span className="text-white"><span className="ulp-spinner ulp-spinner--sm me-1"></span>Exporting…</span>
                    : <span className="text-white"><i className="ti ti-file-spreadsheet me-1"></i>Export</span>
                  }
                </button>
                {/* <button className="ulp-btn bg-primary text-white ulp-btn--lg" onClick={openCreate}>
                  <i className="ti ti-plus me-2"></i>Submit new listing
                </button> */}
                <AddListingModal
                  onManualAdd={openCreate}
                  jobBankPath="/dashboard/job-bank"
                  triggerLabel="Add listing"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="ulp__body">
          {/* ── Filter bar ── */}
          <div className="ulp-filters bg-white rounded-3 p-2 border" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            {/* Mobile toggle */}
            <button
              className="btn btn-sm w-100 d-flex d-md-none align-items-center justify-content-between border-0 bg-transparent px-1 mb-0"
              style={{ fontSize: 13 }}
              onClick={() => setMobileOpen(o => !o)}
            >
              <span className="d-flex align-items-center gap-2 fw-semibold text-dark">
                <i className="ti ti-adjustments-horizontal" style={{ fontSize: 14 }}></i>Filters
              </span>
              <span className="d-flex align-items-center gap-2 text-secondary" style={{ fontSize: 12 }}>
                {[search, filterStatus, createdFrom, createdTo].filter(Boolean).length > 0 && (
                  <span className="badge rounded-pill" style={{ background: '#EEEDFE', color: '#3C3489', fontSize: 10 }}>
                    {[search, filterStatus, createdFrom, createdTo].filter(Boolean).length}
                  </span>
                )}
                <i className="ti ti-chevron-down" style={{ fontSize: 14, transition: 'transform 0.2s', transform: mobileOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}></i>
              </span>
            </button>

            {/* Desktop row */}
            <div className="d-none d-md-flex align-items-center flex-wrap gap-2">
              {/* Table toggle */}
              <div className="d-flex rounded-2 p-1 gap-1" style={{ background: '#f3f3f1' }}>
                {(['drafts', 'live'] as const).map(t => (
                  <button key={t}
                    className="btn btn-sm border-0 flex-fill d-flex align-items-center justify-content-center gap-1"
                    style={{
                      fontSize: 12, fontWeight: 500, height: 32, borderRadius: 5,
                      background: table === t ? '#fff' : 'transparent',
                      color: table === t ? '#534AB7' : '#888',
                      boxShadow: table === t ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                    }}
                    onClick={() => setTable(prev => prev === t ? 'all' : t)}
                  >
                    <i className={`ti ${t === 'drafts' ? 'ti-files' : 'ti-world'}`} style={{ fontSize: 12 }}></i>
                    {t === 'drafts' ? 'Submissions' : 'Live'}
                  </button>
                ))}
              </div>

              <div style={{ width: 1, height: 20, background: 'rgba(0,0,0,0.1)', flexShrink: 0 }}></div>

              <FilterInput icon="ti-search" placeholder="Search title, job ID…" value={search}
                onChange={v => { setSearch(v); setPage(1); }} width={170} />

              <MobileFilterSelect value={filterStatus} onChange={v => { setFilterStatus(v); setPage(1); }} icon="ti-circle-dot">
                <option value="">All statuses</option>
                {(table === 'all'
                  ? [...new Set([...DRAFT_STATUS_OPTS, ...LIVE_STATUS_OPTS])]
                  : table === 'drafts'
                    ? DRAFT_STATUS_OPTS
                    : LIVE_STATUS_OPTS
                ).map(s => <option key={s} value={s}>{s}</option>)}
              </MobileFilterSelect>

              {/* Date range */}
              <div className="d-flex align-items-center rounded-2 px-2 gap-1"
                style={{ height: 32, background: '#f3f3f1', border: '0.5px solid transparent' }}
                onFocusCapture={e => e.currentTarget.style.borderColor = '#534AB7'}
                onBlurCapture={e => e.currentTarget.style.borderColor = 'transparent'}
              >
                <i className="ti ti-calendar text-secondary" style={{ fontSize: 13 }}></i>
                <input type="date" className="border-0 bg-transparent p-0 shadow-none"
                  style={{ fontSize: 12, width: 110, outline: 'none', cursor: 'pointer' }}
                  value={createdFrom} onChange={e => { setCreatedFrom(e.target.value); setPage(1); }} />
                <span className="text-secondary" style={{ fontSize: 11 }}>—</span>
                <input type="date" className="border-0 bg-transparent p-0 shadow-none"
                  style={{ fontSize: 12, width: 110, outline: 'none', cursor: 'pointer' }}
                  value={createdTo} onChange={e => { setCreatedTo(e.target.value); setPage(1); }} />
              </div>

              {(search || filterStatus || createdFrom || createdTo) && (
                <button className="btn btn-sm border d-flex align-items-center gap-1 text-secondary"
                  style={{ fontSize: 12, height: 32, borderColor: 'rgba(0,0,0,0.12)', background: 'transparent', borderRadius: 6 }}
                  onClick={() => { setSearch(''); setFilterStatus(''); setCreatedFrom(''); setCreatedTo(''); setPage(1); }}
                >
                  <i className="ti ti-x" style={{ fontSize: 12 }}></i> Clear
                </button>
              )}
            </div>

            {/* Mobile panel */}
            <div className="d-md-none w-100 overflow-hidden"
              style={{ maxHeight: mobileOpen ? 480 : 0, transition: 'max-height 0.28s ease' }}
            >
              <div className="d-flex flex-column gap-2 pt-2 mt-1" style={{ borderTop: '0.5px solid rgba(0,0,0,0.1)' }}>
                <div className="d-flex rounded-2 p-1 gap-1" style={{ background: '#f3f3f1' }}>
                  {(['drafts', 'live'] as const).map(t => (
                    <button key={t}
                      className="btn btn-sm border-0 flex-fill d-flex align-items-center justify-content-center gap-1"
                      style={{
                        fontSize: 12, fontWeight: 500, height: 32, borderRadius: 5,
                        background: table === t ? '#fff' : 'transparent',
                        color: table === t ? '#534AB7' : '#888',
                        boxShadow: table === t ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                      }}
                      onClick={() => { setTable(t); setPage(1); setFilterStatus(''); }}
                    >
                      <i className={`ti ${t === 'drafts' ? 'ti-files' : 'ti-world'}`} style={{ fontSize: 12 }}></i>
                      {t === 'drafts' ? 'Submissions' : 'Live'}
                    </button>
                  ))}
                </div>
                <MobileFilterInput placeholder="Search title, job ID…" value={search} onChange={v => { setSearch(v); setPage(1); }} icon="ti-search" />
                <MobileFilterSelect value={filterStatus} onChange={v => { setFilterStatus(v); setPage(1); }} icon="ti-circle-dot">
                  <option value="">All statuses</option>
                  {(table === 'drafts' ? DRAFT_STATUS_OPTS : LIVE_STATUS_OPTS).map(s => <option key={s} value={s}>{s}</option>)}
                </MobileFilterSelect>
                <div className="d-flex align-items-center rounded-2 px-2 gap-1 w-100" style={{ height: 38, background: '#f3f3f1' }}>
                  <i className="ti ti-calendar text-secondary" style={{ fontSize: 13 }}></i>
                  <input type="date" className="border-0 bg-transparent p-0 shadow-none flex-fill" style={{ fontSize: 13, outline: 'none' }}
                    value={createdFrom} onChange={e => { setCreatedFrom(e.target.value); setPage(1); }} />
                  <span className="text-secondary" style={{ fontSize: 11 }}>—</span>
                  <input type="date" className="border-0 bg-transparent p-0 shadow-none flex-fill" style={{ fontSize: 13, outline: 'none' }}
                    value={createdTo} onChange={e => { setCreatedTo(e.target.value); setPage(1); }} />
                </div>
                {(search || filterStatus || createdFrom || createdTo) && (
                  <button className="btn btn-sm w-100 d-flex align-items-center justify-content-center gap-1 text-secondary border"
                    style={{ fontSize: 13, height: 38, borderColor: 'rgba(0,0,0,0.12)', background: 'transparent', borderRadius: 6 }}
                    onClick={() => { setSearch(''); setFilterStatus(''); setCreatedFrom(''); setCreatedTo(''); setPage(1); }}
                  >
                    <i className="ti ti-x" style={{ fontSize: 12 }}></i> Clear filters
                  </button>
                )}
              </div>
            </div>
          </div>

          {error && (
            <div className="ulp-alert ulp-alert--error mt-3">
              <i className="ti ti-alert-circle me-2"></i>{error}
              <button className="ulp-btn ulp-btn--ghost ms-2" onClick={refetch}>Retry</button>
            </div>
          )}

          {loading ? (
            <div className="d-flex justify-content-center py-5">
              <div className="ulp-spinner ulp-spinner--dark" style={{ width: 48, height: 48, borderWidth: 3 }}></div>
            </div>
            // <div className="ulp-list-loading mt-3">
            //   {Array.from({ length: 3 }).map((_, i) => (
            //     <div key={i} className="ulp-card ulp-card--skeleton">
            //       <div className="ulp-card__body" style={{ gap: '.75rem' }}>
            //         <div className="ulp-skel" style={{ height: 14, width: '30%', borderRadius: 6 }}></div>
            //         <div className="ulp-skel" style={{ height: 18, width: '60%', borderRadius: 6 }}></div>
            //         <div className="ulp-skel" style={{ height: 14, width: '40%', borderRadius: 6 }}></div>
            //         <div className="ulp-skel" style={{ height: 14, width: '80%', borderRadius: 6 }}></div>
            //       </div>
            //     </div>
            //   ))}
            // </div>
          ) : data.length === 0 ? (
            <div className="ulp-empty mt-3">
              <div className="ulp-empty__icon"><i className="ti ti-briefcase"></i></div>
              <h3>{search || filterStatus ? 'No listings match your filters' : 'No listings yet'}</h3>
              <p>{search || filterStatus ? 'Try adjusting your filters.' : 'Submit your first job listing and our team will review it shortly.'}</p>
              {!search && !filterStatus && (
                // <button className="ulp-btn ulp-btn--primary" onClick={openCreate}>Submit first listing</button>
                <AddListingModal
                  onManualAdd={openCreate}
                  jobBankPath="/dashboard/job-bank"
                  triggerLabel="Add listing"
                />
              )}
            </div>
          ) : (
            <>
              <div className="lc-table mt-3">
                {/* Header */}
                <div className="lc-header">
                  <div className="lc-header__col">#</div>
                  <div className="lc-header__col">Title</div>
                  <div className="lc-header__col">Company</div>
                  <div className="lc-header__col">Location</div>
                  <div className="lc-header__col">JC</div>
                  <div className="lc-header__col">NIC</div>
                  <div className="lc-header__col">REF</div>
                  <div className="lc-header__col">VY</div>
                  <div className="lc-header__col">AC</div>
                  <div className="lc-header__col">IP</div>
                  <div className="lc-header__col">Submitted</div>
                  <div className="lc-header__col">Action</div>
                </div>

                {data.map((item, i) => (
                  <ListingCard
                    key={item.id}
                    item={item}
                    type={
                      table === 'drafts' ? 'draft' :
                        table === 'live' ? 'live' :
                          (item as any)._source === 'draft' ? 'draft' : 'live'
                    }
                    onEdit={openUpdate}
                    index={i}
                    toast={toast}
                    onToggleActive={handleToggleActive}
                  />
                ))}
              </div>
              {totalPages > 1 && (
                <div className="ulp-pagination">
                  <button className="ulp-btn ulp-btn--secondary" onClick={() => setPage(p => p - 1)} disabled={page === 1}>
                    <i className="ti ti-chevron-left"></i>
                  </button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const p = totalPages <= 5 ? i + 1 : page <= 3 ? i + 1 : page >= totalPages - 2 ? totalPages - 4 + i : page - 2 + i;
                    return (
                      <button key={p} className={`ulp-btn ${page === p ? 'ulp-btn--primary' : 'ulp-btn--secondary'}`} onClick={() => setPage(p)}>{p}</button>
                    );
                  })}
                  <button className="ulp-btn ulp-btn--secondary" onClick={() => setPage(p => p + 1)} disabled={page === totalPages}>
                    <i className="ti ti-chevron-right"></i>
                  </button>
                  <span className="ulp-pagination__info">
                    Showing {Math.min((page - 1) * perPage + 1, total)}–{Math.min(page * perPage, total)} of {total}
                  </span>
                </div>
              )}
            </>
          )}
        </div>
        {showNoCreditsModal && (
          <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex={-1}>
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">
                    <i className="ti ti-alert-triangle me-2 text-warning"></i>
                    No credits available
                  </h5>
                  <button type="button" className="btn-close" onClick={() => setShowNoCreditsModal(false)}></button>
                </div>
                <div className="modal-body">
                  <p className="mb-2">
                    You need at least 1 credit to submit a new job listing, and your account currently has{' '}
                    <strong>{availableCredits ?? 0}</strong> available.
                  </p>
                  <p className="mb-0 text-muted" style={{ fontSize: 13 }}>
                    Buy a credit bundle to unlock new listing submissions.
                  </p>
                </div>
                <div className="modal-footer">
                  <button className="btn btn-secondary" onClick={() => setShowNoCreditsModal(false)}>
                    Cancel
                  </button>
                  <a href="/dashboard/wallet-payments/credits" className="btn btn-primary">
                    Buy credits
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>
    );
  }

  // ════════════════════════════════════════════════════════════
  // CREATE / UPDATE FORM
  // ════════════════════════════════════════════════════════════
  const isUpdate = mode === 'update';

  return (
    <section className="ulp">
      <Toaster
        position="bottom-right"
        toastOptions={{ duration: 4000 }}
        containerStyle={{ zIndex: 100 }}
      />
      <div className="ulp__header p-4 ulp__header--form">
        <div className="container">
          <button className="ulp-back bg-white rounded px-4 py-2 text-black" onClick={() => setMode('list')}>
            <i className="ti ti-arrow-left me-1"></i>Back To Listings
          </button>
          <h1 className="ulp__heading capitlize">
            {isUpdate ? 'Request Listing Update' : 'Submit New Job Listing'}
          </h1>
          <p className="ulp__subtext">
            {isUpdate
              ? 'Your changes will be reviewed by an admin before going live.'
              : 'Fill in the details below. Our team will review and publish your listing.'
            }
          </p>
        </div>
      </div>

      <div className="ulp__body">
        {submitSuccess && (
          <div className="ulp-alert ulp-alert--success">
            <i className="ti ti-circle-check me-2"></i>{submitSuccess}
          </div>
        )}
        {submitError && (
          <div className="ulp-alert ulp-alert--error">
            <i className="ti ti-alert-circle me-2"></i>{submitError}
          </div>
        )}
        <form onSubmit={handleSubmit} className="ulp-form">
          <style>{FORM_RESPONSIVE_STYLES}</style>
          <style>{ACTIVE_TOGGLE_STYLES}</style>
          <div className="row g-3 g-md-4">
            <div className="col-12">

              {/* ── Listing info ── */}
              <div className="ulp-section">
                <div className="ulp-section__header">
                  <i className="ti ti-file-description"></i>
                  <h2>Listing information</h2>
                </div>
                <div className="row g-3">

                  {/* Title */}
                  <div className="col-12 col-md-6">
                    <label className="ulp-label">
                      Title <span className="ulp-label__req">*</span>
                    </label>
                    <input
                      type="text" required className="form-control ulp-input"
                      placeholder="e.g. Senior Software Engineer at TechCorp"
                      value={form.title}
                      onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                    />
                    {fieldErrors['title'] && (
                      <p className="ulp-field-error">{fieldErrors['title']}</p>
                    )}
                  </div>

                  {/* Company */}
                  <div className="col-12 col-md-6">
                    <label className="ulp-label">
                      Company Name <span className="ulp-label__req">*</span>
                    </label>
                    <input
                      type="text" required className="form-control ulp-input"
                      placeholder="Enter the company name"
                      value={form.companyName}
                      onChange={e => setForm(f => ({ ...f, companyName: e.target.value }))}
                    />
                    {fieldErrors['companyName'] && (
                      <p className="ulp-field-error">{fieldErrors['companyName']}</p>
                    )}
                  </div>

                  {/* Categories */}
                  <div className="col-12">
                    <label className="ulp-label">Categories</label>
                    <p className="ulp-hint">Select the service categories this listing belongs to.</p>
                    {categories.length === 0 ? (
                      <p className="ulp-hint">No published categories available.</p>
                    ) : (
                      <CategoryPicker
                        categories={categories}
                        selected={form.categories}
                        onChange={cats => setForm(f => ({ ...f, categories: cats }))}
                      />
                    )}
                    {fieldErrors['categories'] && (
                      <p className="ulp-field-error">{fieldErrors['categories']}</p>
                    )}
                  </div>

                  {/* Job mode */}
                  <div className="col-12 col-sm-6">
                    <label className="ulp-label">
                      Job mode <span className="ulp-label__req">*</span>
                    </label>
                    <select
                      required className="form-select ulp-input"
                      value={form.jobMode}
                      onChange={e => setForm(f => ({ ...f, jobMode: e.target.value }))}
                    >
                      <option value="">Select mode…</option>
                      {JOB_MODE_OPTIONS.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                    {fieldErrors['jobMode'] && (
                      <p className="ulp-field-error">{fieldErrors['jobMode']}</p>
                    )}
                  </div>

                  {/* Job type */}
                  <div className="col-12 col-sm-6">
                    <label className="ulp-label">Job type</label>
                    <select
                      className="form-select ulp-input"
                      value={form.jobType}
                      onChange={e => setForm(f => ({ ...f, jobType: e.target.value }))}
                    >
                      <option value="">Select type…</option>
                      {JOB_TYPE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    {fieldErrors['jobType'] && (
                      <p className="ulp-field-error">{fieldErrors['jobType']}</p>
                    )}
                  </div>

                  {/* Overview (TinyMCE) */}
                  <div className="col-12">
                    <label className="ulp-label">
                      Overview <span className="ulp-label__req">*</span>
                    </label>
                    <div className="ulp-editor-wrap">
                      <Editor
                        key={isUpdate ? editTarget!.item.id : 'new'}
                        apiKey={process.env.NEXT_PUBLIC_TINYMCE_API_KEY}
                        initialValue={isUpdate ? (editTarget?.item.overview || '') : ''}
                        onInit={(_evt: any, editor: any) => {
                          editorRef.current = editor;
                        }}
                        init={TINYMCE_INIT}
                      />
                    </div>
                    {fieldErrors['overview'] && (
                      <p className="ulp-field-error">{fieldErrors['overview']}</p>
                    )}
                  </div>

                  {/* Description — full width on mobile */}
                  <div className="col-12 col-sm-6">
                    <label className="ulp-label">
                      Description <span className="ulp-label__req">*</span>
                    </label>
                    <input
                      type="text" required className="form-control ulp-input"
                      placeholder="Enter a short description"
                      value={form.description}
                      onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    />
                    {fieldErrors['description'] && (
                      <p className="ulp-field-error">{fieldErrors['description']}</p>
                    )}
                  </div>

                  {/* Apply email — full width on mobile */}
                  <div className="col-12 col-sm-6">
                    <label className="ulp-label">
                      Apply Email <span className="ulp-label__req">*</span>
                    </label>
                    <input
                      type="email" required className="form-control ulp-input"
                      placeholder="Candidates will apply to this email"
                      value={form.applyEmail}
                      onChange={e => setForm(f => ({ ...f, applyEmail: e.target.value }))}
                    />
                    {fieldErrors['applyEmail'] && (
                      <p className="ulp-field-error">{fieldErrors['applyEmail']}</p>
                    )}
                  </div>

                  {/* Highlights */}
                  <div className="col-12">
                    <label className="ulp-label">Key highlights</label>
                    <p className="ulp-hint">Bullet-point selling points shown on the listing card.</p>
                    <StringListBuilder
                      label="Highlights"
                      items={form.highlights}
                      placeholder="e.g. Competitive salary package"
                      onChange={h => setForm(f => ({ ...f, highlights: h }))}
                    />
                    {fieldErrors['highlights'] && (
                      <p className="ulp-field-error">{fieldErrors['highlights']}</p>
                    )}
                  </div>

                  {/* Benefits */}
                  <div className="col-12">
                    <label className="ulp-label">Benefits</label>
                    <p className="ulp-hint">Perks and benefits offered with this role.</p>
                    <StringListBuilder
                      label="Benefits"
                      items={form.benefits}
                      placeholder="e.g. Extended health & dental"
                      onChange={b => setForm(f => ({ ...f, benefits: b }))}
                    />
                    {fieldErrors['benefits'] && (
                      <p className="ulp-field-error">{fieldErrors['benefits']}</p>
                    )}
                  </div>

                </div>
              </div>

              {/* ── Locations & slots ── */}
              <div className="ulp-section">
                <div className="ulp-section__header">
                  <i className="ti ti-map-pin"></i>
                  <h2>Locations &amp; shifts</h2>
                </div>
                <p className="ulp-hint mb-3">
                  Each location has its own pay, vacancy, and shift schedule.
                </p>
                <SlotsBuilder
                  slots={form.slots}
                  onChange={slots => setForm(f => ({ ...f, slots }))}
                />
              </div>

              {/* ── Site windows ── */}
              <div className="ulp-section">
                <div className="ulp-section__header">
                  <i className="ti ti-calendar-time"></i>
                  <h2>Select Sites To publish Listing</h2>
                </div>
                <p className="ulp-hint mb-3">
                  <strong>Required:</strong> Please select at least one site. The listing will go live immediately after submission and stay active for <strong>6 months</strong>.
                </p>
                <SiteWindowsBuilder
                  windows={form.siteWindows}
                  onChange={siteWindows => setForm(f => ({ ...f, siteWindows }))}
                  isUpdate={isUpdate}
                />
              </div>

            </div>

            {/* ── Submit footer ── */}
            <div className="col-12">
              <div className="ulp-form-footer">
                <button
                  type="button"
                  className="ulp-btn ulp-btn--secondary ulp-footer-cancel"
                  onClick={() => setMode('list')}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="ulp-btn ulp-btn--primary ulp-btn--lg ulp-footer-submit"
                  disabled={submitting}
                >
                  {submitting
                    ? <><span className="ulp-spinner ulp-spinner--sm me-2"></span>Submitting…</>
                    : isUpdate
                      ? <><i className="ti ti-send me-2"></i>Update Job</>
                      : <><i className="ti ti-send me-2"></i>Submit for review</>
                  }
                </button>
              </div>
            </div>

          </div>
        </form>

        {/* <form onSubmit={handleSubmit} className="ulp-form">
          <div className="row g-4">
            <div className="col-12">
              <div className="ulp-section">
                <div className="ulp-section__header">
                  <i className="ti ti-file-description"></i>
                  <h2>Listing information</h2>
                </div>
                <div className="row g-3">
                  <div className="col-12 col-md-6">
                    <div className="col-12 col-md-6">
                      <label className="ulp-label">Job Bank Id</label>
                      <input type="text" className="form-control ulp-input"
                        placeholder="e.g.1234"
                        value={form.jobBankId}
                        onChange={e => setForm(f => ({ ...f, jobBankId: e.target.value }))} />
                    </div> 
                    <label className="ulp-label">Title <span className="ulp-label__req">*</span></label>
                    <input type="text" required className="form-control ulp-input"
                      placeholder="e.g. Senior Software Engineer at TechCorp"
                      value={form.title}
                      onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
                  </div>
                  <div className="col-12 col-md-6">
                    <div className="col-12 col-md-6">
                      <label className="ulp-label">Job Bank Id</label>
                      <input type="text" className="form-control ulp-input"
                        placeholder="e.g.1234"
                        value={form.jobBankId}
                        onChange={e => setForm(f => ({ ...f, jobBankId: e.target.value }))} />
                    </div>
                    <label className="ulp-label">Company Name <span className="ulp-label__req">*</span></label>
                    <input type="text" required className="form-control ulp-input"
                      placeholder="Enter the Company Name ."
                      value={form.companyName}
                      onChange={e => setForm(f => ({ ...f, companyName: e.target.value }))} />
                  </div>
                  <div className="col-12">
                    <label className="ulp-label">Categories</label>
                    <p className="ulp-hint">Select the service categories this listing belongs to.</p>
                    {categories.length === 0 ? (
                      <p className="ulp-hint">No published categories available.</p>
                    ) : (
                      <div style={{
                        display: 'flex', flexWrap: 'wrap', gap: '.5rem',
                        padding: '.75rem', background: '#f8fafd',
                        border: '1.5px solid var(--ulp-border)', borderRadius: 9,
                      }}>
                        {categories.map(cat => {
                          const selected = form.categories.includes(cat.value);
                          return (
                            <button
                              key={cat.value}
                              type="button"
                              onClick={() => setForm(f => ({
                                ...f,
                                categories: selected
                                  ? f.categories.filter(c => c !== cat.value)
                                  : [...f.categories, cat.value],
                              }))}
                              style={{
                                padding: '.25rem .75rem', borderRadius: 20, fontSize: '.78rem',
                                fontWeight: 600, cursor: 'pointer', border: '1.5px solid',
                                borderColor: selected ? 'var(--ulp-accent)' : 'var(--ulp-border)',
                                background: selected ? 'var(--ulp-accent)' : '#fff',
                                color: selected ? '#fff' : 'var(--ulp-muted)',
                                transition: 'all .15s',
                              }}
                            >
                              {selected && <i className="ti ti-check me-1" style={{ fontSize: 11 }} />}
                              {cat.label}
                            </button>
                          );
                        })}
                      </div>
                    )}
                    {form.categories.length > 0 && (
                      <p className="ulp-hint mt-1">
                        Selected: {form.categories.join(', ')}
                        <button type="button" className="ulp-btn ulp-btn--ghost ms-2"
                          style={{ fontSize: '.75rem', color: 'var(--ulp-danger)', padding: '0 .3rem' }}
                          onClick={() => setForm(f => ({ ...f, categories: [] }))}>
                          Clear all
                        </button>
                      </p>
                    )}
                  </div> 
                  <div className="col-12 col-md-6">
                    <label className="ulp-label">Job mode <span className="ulp-label__req">*</span></label>
                    <select required className="form-select ulp-input"
                      value={form.jobMode}
                      onChange={e => setForm(f => ({ ...f, jobMode: e.target.value }))}>
                      <option value="">Select mode…</option>
                      {JOB_MODE_OPTIONS.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  <div className="col-12 col-md-6">
                    <label className="ulp-label">Job type</label>
                    <select className="form-select ulp-input"
                      value={form.jobType}
                      onChange={e => setForm(f => ({ ...f, jobType: e.target.value }))}>
                      <option value="">Select type…</option>
                      {JOB_TYPE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="col-12">
                    <label className="ulp-label">Overview <span className="ulp-label__req">*</span></label>
                    <Editor
                      apiKey={process.env.NEXT_PUBLIC_TINYMCE_API_KEY}
                      onInit={(_evt, editor) => (editorRef.current = editor)}
                      onEditorChange={setEditorContent}
                      initialValue={editorContent}
                      init={{
                        height: 400,
                        menubar: false,
                        plugins: [
                          'advlist', 'autolink', 'lists', 'link', 'image', 'charmap',
                          'preview', 'anchor', 'searchreplace', 'visualblocks', 'code',
                          'fullscreen', 'insertdatetime', 'media', 'table', 'help', 'wordcount'
                        ],
                        toolbar:
                          'undo redo | blocks | bold italic underline strikethrough forecolor backcolor | ' +
                          'alignleft aligncenter alignright alignjustify | ' +
                          'bullist numlist outdent indent | link image media table | ' +
                          'code fullscreen preview | removeformat help',
                        content_style:
                          'body { font-family: system-ui,-apple-system,sans-serif; font-size:14px; color:#212529; }',
                      }}

                    />
                  </div>
                  <div className="col-6">
                    <label className="ulp-label">Description <span className="ulp-label__req">*</span></label>
                    <input type="text" required className="form-control ulp-input"
                      placeholder="enter a short discription"
                      value={form.description}
                      onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                  </div>
                  <div className="col-6">
                    <label className="ulp-label">Apply Email <span className="ulp-label__req">*</span></label>
                    <input type="text" required className="form-control ulp-input"
                      placeholder="enter the email to which the candedate will apply"
                      value={form.applyEmail}
                      onChange={e => setForm(f => ({ ...f, applyEmail: e.target.value }))} />
                  </div>
                  <div className="col-12">
                    <label className="ulp-label">Key highlights</label>
                    <p className="ulp-hint">Bullet-point selling points shown on the listing card.</p>
                    <StringListBuilder
                      label="Highlights"
                      items={form.highlights}
                      placeholder="e.g. Competitive salary package"
                      onChange={h => setForm(f => ({ ...f, highlights: h }))}
                    />
                  </div>
                  <div className="col-12">
                    <label className="ulp-label">Benefits</label>
                    <p className="ulp-hint">Perks and benefits offered with this role.</p>
                    <StringListBuilder
                      label="Benefits"
                      items={form.benefits}
                      placeholder="e.g. Extended health & dental"
                      onChange={b => setForm(f => ({ ...f, benefits: b }))}
                    />
                  </div>
                </div>
              </div>
              <div className="ulp-section">
                <div className="ulp-section__header">
                  <i className="ti ti-map-pin"></i>
                  <h2>Locations &amp; shifts</h2>
                </div>
                <p className="ulp-hint mb-3">
                  Each location has its own pay, vacancy, and shift schedule.
                </p>
                <SlotsBuilder
                  slots={form.slots}
                  onChange={slots => setForm(f => ({ ...f, slots }))}
                />
              </div>
              <div className="ulp-section">
                <div className="ulp-section__header">
                  <i className="ti ti-calendar-time"></i>
                  <h2>Publish schedule</h2>
                </div>
                <p className="ulp-hint mb-3">
                  Control when and where this listing appears. Listings without windows stay
                  <strong> pending</strong> until an admin sets a schedule.
                </p>
                <div className="row g-3 mb-3">
                  <div className="col-12 col-md-6">
                    <label className="ulp-label">Campaign label</label>
                    <input type="text" className="form-control ulp-input"
                      placeholder="e.g. Summer Hiring Drive 2025"
                      value={form.campaignLabel}
                      onChange={e => setForm(f => ({ ...f, campaignLabel: e.target.value }))} />
                  </div>
                </div>
                <SiteWindowsBuilder
                  windows={form.siteWindows}
                  onChange={siteWindows => setForm(f => ({ ...f, siteWindows }))}
                />
              </div>
            </div>
            <div className="col-12">
              <div className="ulp-form-footer">
                <button type="button" className="ulp-btn ulp-btn--secondary"
                  onClick={() => setMode('list')} disabled={submitting}>
                  Cancel
                </button>
                <button type="submit" className="ulp-btn ulp-btn--primary ulp-btn--lg" disabled={submitting}>
                  {submitting
                    ? <><span className="ulp-spinner ulp-spinner--sm me-2"></span>Submitting…</>
                    : isUpdate
                      ? <><i className="ti ti-send me-2"></i>Update Job</>
                      : <><i className="ti ti-send me-2"></i>Submit for review</>
                  }
                </button>
              </div>
            </div>
          </div>
        </form> */}
      </div>
    </section>
  );
}


const FORM_RESPONSIVE_STYLES = `
*, *::before, *::after { box-sizing: border-box; }
 
/* ── Category Picker ── */
.cp-wrap {
  border: 1.5px solid var(--ulp-border, #e2e8f0);
  border-radius: 10px;
  background: #f8fafd;
  overflow: hidden;
}
 
/* Search bar */
.cp-search {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-bottom: 1px solid var(--ulp-border, #e2e8f0);
  background: #fff;
}
.cp-search-icon {
  color: #94a3b8;
  font-size: 14px;
  flex-shrink: 0;
}
.cp-search-input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 13px;
  color: #0f172a;
  background: transparent;
  min-width: 0;
}
.cp-search-input::placeholder { color: #94a3b8; }
.cp-search-clear {
  background: none;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  padding: 0;
  font-size: 13px;
  display: flex;
  align-items: center;
  flex-shrink: 0;
}
.cp-search-clear:hover { color: #475569; }
 
/* Pills grid */
.cp-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 10px 12px;
  min-height: 44px;
}
 
.cp-pill {
  display: inline-flex;
  align-items: center;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 400;
  cursor: pointer;
  border: 1.5px solid var(--ulp-border, #e2e8f0);
  background: #fff;
  color: #64748b;
  transition: all .15s;
  white-space: nowrap;
  /* Tap-friendly on mobile */
  min-height: 32px;
  -webkit-tap-highlight-color: transparent;
}
.cp-pill:hover {
  border-color: var(--ulp-accent, #4f46e5);
  color: var(--ulp-accent, #4f46e5);
}
.cp-pill--active {
  background: var(--ulp-accent, #4f46e5);
  border-color: var(--ulp-accent, #4f46e5);
  color: #fff;
}
.cp-pill--active:hover {
  background: #4338ca;
  border-color: #4338ca;
  color: #fff;
}
 
/* Show more toggle */
.cp-toggle {
  display: flex;
  align-items: center;
  width: 100%;
  padding: 8px 12px;
  border: none;
  border-top: 1px solid var(--ulp-border, #e2e8f0);
  background: #f1f5f9;
  color: var(--ulp-accent, #4f46e5);
  font-size: 12px;
  font-weight: 400;
  cursor: pointer;
  transition: background .15s;
  gap: 4px;
}
.cp-toggle:hover { background: #e8edf4; }
 
/* Selected summary bar */
.cp-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 7px 12px;
  border-top: 1px solid var(--ulp-border, #e2e8f0);
  background: #eff6ff;
  flex-wrap: wrap;
}
.cp-summary-text {
  font-size: 11px;
  color: #475569;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.cp-clear-btn {
  background: none;
  border: none;
  color: #dc2626;
  font-size: 11px;
  font-weight: 400;
  cursor: pointer;
  padding: 0;
  white-space: nowrap;
  flex-shrink: 0;
}
.cp-clear-btn:hover { text-decoration: underline; }
 
/* ── Editor wrapper — prevent overflow on mobile ── */
.ulp-editor-wrap {
  width: 100%;
  overflow: hidden;
  border-radius: 9px;
}
/* TinyMCE itself sets its own border; clamp its min-width */
.ulp-editor-wrap .tox-tinymce {
  min-width: 0 !important;
  border-radius: 9px !important;
}
 
/* ── StringListBuilder — input row wraps on mobile ── */
.ulp-tagbuilder__input-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.ulp-tagbuilder__input-row .form-control {
  flex: 1;
  min-width: 0;
}
.ulp-tagbuilder__input-row .ulp-btn--add {
  flex-shrink: 0;
}
 
/* ── Slots builder — tighter on mobile ── */
.ulp-slot-card {
  padding: 14px;
}
@media (max-width: 480px) {
  .ulp-slot-card {
    padding: 12px 10px;
  }
}
 
/* ── Shift days — wrap naturally ── */
.ulp-shift-days {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.ulp-day-btn {
  min-height: 32px;
  min-width: 40px;
  font-size: 11px;
}
 
/* ── Form footer — stack on mobile ── */
.ulp-form-footer {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
  background: var(--ulp-surface, #fff);
  border-radius: var(--ulp-radius, 12px);
  border: 1.5px solid var(--ulp-border, #e2e8f0);
  flex-wrap: wrap;
}
/* On mobile: buttons go full-width, submit first (reversed order) */
@media (max-width: 480px) {
  .ulp-form-footer {
    flex-direction: column-reverse;
    gap: 8px;
    padding: 12px;
  }
  .ulp-footer-cancel,
  .ulp-footer-submit {
    width: 100%;
    justify-content: center;
  }
  .ulp-footer-submit {
    font-size: 14px;
    padding: 12px 16px;
  }
  .ulp-footer-cancel {
    font-size: 13px;
  }
}
 
/* ── Section padding — tighter on mobile ── */
@media (max-width: 480px) {
  .ulp-section {
    padding: 14px 12px;
    margin-bottom: 14px;
  }
  .ulp-section__header {
    margin-bottom: 14px;
    padding-bottom: 10px;
  }
  .ulp-section__header h2 {
    font-size: 14px;
  }
  .ulp-label {
    font-size: 12px;
  }
  .ulp-hint {
    font-size: 11px;
  }
  .form-control,
  .form-select {
    font-size: 14px !important;
    /* Prevent iOS zoom on focus — needs at least 16px or use this */
    font-size: max(16px, 14px) !important;
  }
}
 
/* ── Toggle — ensure touch area ── */
.ulp-toggle {
  cursor: pointer;
  min-height: 36px;
}
.ulp-toggle__label {
  font-size: 13px;
}
 
/* ── ulp-btn-add inside tag builder full-width on very small ── */
@media (max-width: 360px) {
  .ulp-tagbuilder__input-row {
    flex-direction: column;
  }
  .ulp-btn--add {
    width: 100%;
    justify-content: center;
  }
}
 
/* ── Site schedule banner — stack on mobile ── */
.ulp-site-schedule-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
`;

const ACTIVE_TOGGLE_STYLES = `
/* ── Active Toggle Switch ── */
.lc-active-toggle {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border: none;
  background: transparent;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 8px;
  transition: background 0.2s ease;
  -webkit-tap-highlight-color: transparent;
  outline: none;
}
.lc-active-toggle:hover {
  background: rgba(0, 0, 0, 0.04);
}
.lc-active-toggle:focus-visible {
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.4);
}
.lc-active-toggle__track {
  position: relative;
  width: 38px;
  height: 22px;
  border-radius: 999px;
  background: #e2e8f0;
  transition: background 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.08);
  flex-shrink: 0;
}
.lc-active-toggle--on .lc-active-toggle__track {
  background: #10b981;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.05), 0 0 12px rgba(16, 185, 129, 0.3);
}
.lc-active-toggle__thumb {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #ffffff;
  transition: transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.2s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25), 0 1px 2px rgba(0, 0, 0, 0.15);
}
.lc-active-toggle--on .lc-active-toggle__thumb {
  transform: translateX(16px);
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(16, 185, 129, 0.15);
}
.lc-active-toggle__label {
  font-size: 11px;
  font-weight: 700;
  color: #64748b;
  user-select: none;
  transition: color 0.2s ease;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}
.lc-active-toggle--on .lc-active-toggle__label {
  color: #059669;
}
`;

// ─── Shared filter helpers ────────────────────────────────────
function FilterInput({ icon, placeholder, value, onChange, width }: {
  icon: string; placeholder: string; value: string;
  onChange: (v: string) => void; width: number;
}) {
  return (
    <div className="d-flex align-items-center rounded-2 px-2 gap-1"
      style={{ height: 32, background: '#f3f3f1', border: '0.5px solid transparent', transition: 'border-color 0.15s' }}
      onFocusCapture={e => e.currentTarget.style.borderColor = '#534AB7'}
      onBlurCapture={e => e.currentTarget.style.borderColor = 'transparent'}
    >
      <i className={`ti ${icon} text-secondary`} style={{ fontSize: 13 }}></i>
      <input type="text" className="border-0 bg-transparent p-0 shadow-none"
        style={{ width, fontSize: 12, outline: 'none' }}
        placeholder={placeholder} value={value}
        onChange={e => onChange(e.target.value)} />
    </div>
  );
}

// function FilterSelect({ icon, value, onChange, width, children }: {
//   icon: string; value: string; onChange: (v: string) => void;
//   width: number; children: React.ReactNode;
// }) {
//   return (
//     <div className="d-flex align-items-center rounded-2 px-2 gap-1"
//       style={{ height: 32, background: '#f3f3f1', border: '0.5px solid transparent', transition: 'border-color 0.15s' }}
//       onFocusCapture={e => e.currentTarget.style.borderColor = '#534AB7'}
//       onBlurCapture={e => e.currentTarget.style.borderColor = 'transparent'}
//     >
//       <i className={`ti ${icon} text-secondary`} style={{ fontSize: 13 }}></i>
//       <select className="border-0 bg-transparent p-0 shadow-none"
//         style={{ fontSize: 12, outline: 'none', width, height: '100%', cursor: 'pointer' }}
//         value={value} onChange={e => onChange(e.target.value)}>
//         {children}
//       </select>
//     </div>
//   );
// }

function MobileFilterInput({ icon, placeholder, value, onChange }: {
  icon: string; placeholder: string; value: string; onChange: (v: string) => void;
}) {
  return (
    <div className="d-flex align-items-center rounded-2 px-2 gap-2 w-100"
      style={{ height: 38, background: '#f3f3f1', border: '0.5px solid transparent' }}
      onFocusCapture={e => e.currentTarget.style.borderColor = '#534AB7'}
      onBlurCapture={e => e.currentTarget.style.borderColor = 'transparent'}
    >
      <i className={`ti ${icon} text-secondary`} style={{ fontSize: 13 }}></i>
      <input type="text" className="border-0 bg-transparent p-0 shadow-none flex-fill"
        style={{ fontSize: 13, outline: 'none' }}
        placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)} />
    </div>
  );
}

function MobileFilterSelect({ icon, value, onChange, children }: {
  icon: string; value: string; onChange: (v: string) => void; children: React.ReactNode;
}) {
  return (
    <div className="d-flex align-items-center rounded-2 px-2 gap-2"
      style={{ height: 38, background: '#f3f3f1', border: '0.5px solid transparent' }}
      onFocusCapture={e => e.currentTarget.style.borderColor = '#534AB7'}
      onBlurCapture={e => e.currentTarget.style.borderColor = 'transparent'}
    >
      <i className={`ti ${icon} text-secondary`} style={{ fontSize: 13 }}></i>
      <select className="border-0 bg-transparent p-0 shadow-none flex-fill"
        style={{ fontSize: 13, outline: 'none', height: '100%', cursor: 'pointer' }}
        value={value} onChange={e => onChange(e.target.value)}>
        {children}
      </select>
    </div>
  );
}