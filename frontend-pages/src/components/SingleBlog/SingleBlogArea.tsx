// src/components/SingleBlog/SingleBlogArea.tsx
'use client';

import socialLinksBlog from "@/data/socialLinksBlog";
import RightArrawWhitIcon from "@/svg/RightArrawWhitIcon";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect, useCallback } from "react";

import icon1_img from "@/assets/images/blog/icon1.svg";
import date_img from "@/assets/images/blog/date.svg";
// import line1_img from "@/assets/images/blog/line1.svg";
// import line2_img from "@/assets/images/blog/line2.svg";
import line3_img from "@/assets/images/blog/line3.svg";

import type { BlogPostItem, CommentItem } from '@/app/actions/blogActions';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC', // <--- ADD THIS LINE
  });
}

// ── Avatar initials placeholder ───────────────────────────────
// function Avatar({ name }: { name: string }) {
//   const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
//   return (
//     <div style={{
//       width: 50, height: 50, borderRadius: '50%',
//       background: '#f97316', color: '#fff',
//       display: 'flex', alignItems: 'center', justifyContent: 'center',
//       fontWeight: 600, fontSize: 16, flexShrink: 0,
//     }}>
//       {initials}
//     </div>
//   );
// }

interface Props {
  post: BlogPostItem;
  latestPosts: BlogPostItem[];
  categories: { name: string; count: number }[];
  // allTags: string[];
  // no longer strictly needed – we'll fetch from API
  initialComments?: CommentItem[];
}

interface FormState {
  name: string;
  email: string;
  phone: string;
  message: string;
}

// const EMPTY_FORM: FormState = { name: '', email: '', phone: '', message: '' };

export default function SingleBlogArea({
  post,
  latestPosts,
  categories,
  // allTags,
  initialComments = [],
}: Props) {
  const router = useRouter();

  // ── Sidebar search ────────────────────────────────────────────
  // const [searchInput, setSearchInput] = useState('');

  // ── Comments state ────────────────────────────────────────────
  const [comments, setComments] = useState<CommentItem[]>(initialComments);
  // const [commentsLoading, setCommentsLoading] = useState(false);
  // const [form, setForm] = useState<FormState>(EMPTY_FORM);
  // const [replyingTo, setReplyingTo] = useState<string | null>(null);
  // const [submitting, setSubmitting] = useState(false);
  // const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  // const [submitError, setSubmitError] = useState('');

  // ── Fetch comments from API ──────────────────────────────────
  const fetchComments = useCallback(async () => {
    // setCommentsLoading(true);
    try {
      const res = await fetch(`/api/blog-comments?slug=${encodeURIComponent(post.slug)}&perPage=50`);
      if (res.ok) {
        const json = await res.json();
        setComments(json.data ?? []);
      }
    } catch (err) {
      console.error('Failed to fetch comments', err);
    } finally {
      // setCommentsLoading(false);
    }
  }, [post.slug]);

  // Load comments on mount (overwrites initialComments prop with live data)
  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  // ── Handlers ─────────────────────────────────────────────────
  // const handleSearch = (e: React.FormEvent) => {
  //   e.preventDefault();
  //   if (searchInput.trim()) {
  //     router.push(`/blog?q=${encodeURIComponent(searchInput.trim())}`);
  //   }
  // };

  const handleCategory = (name: string) => {
    router.push(`/blog?category=${encodeURIComponent(name)}`);
  };

  // const handleTag = (tag: string) => {
  //   router.push(`/blog?tag=${encodeURIComponent(tag)}`);
  // };

  // const handleFormChange = (
  //   e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  // ) => {
  //   setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  // };

  // const handleSubmit = async (e: React.FormEvent) => {
  //   e.preventDefault();
  //   setSubmitting(true);
  //   setSubmitStatus('idle');
  //   setSubmitError('');

  //   try {
  //     const res = await fetch('/api/blog-comments', {
  //       method: 'POST',
  //       headers: { 'Content-Type': 'application/json' },
  //       body: JSON.stringify({
  //         blogSlug: post.slug,
  //         name: form.name.trim(),
  //         email: form.email.trim(),
  //         phone: form.phone.trim() || undefined,
  //         message: form.message.trim(),
  //         parentId: replyingTo ?? null,
  //       }),
  //     });

  //     if (!res.ok) {
  //       const json = await res.json();
  //       throw new Error(json.error ?? 'Failed to submit comment');
  //     }

  //     setSubmitStatus('success');
  //     setForm(EMPTY_FORM);
  //     setReplyingTo(null);

  //     // 🔄 Re‑fetch comments so the new one appears instantly
  //     await fetchComments();
  //   } catch (err: any) {
  //     setSubmitStatus('error');
  //     setSubmitError(err.message ?? 'Something went wrong');
  //   } finally {
  //     setSubmitting(false);
  //   }
  // };

  // // ── Group comments: top-level + replies ───────────────────────
  // const topLevel = comments.filter(c => !c.parentId);
  const repliesMap: Record<string, CommentItem[]> = {};
  comments.forEach(c => {
    if (c.parentId) {
      if (!repliesMap[c.parentId]) repliesMap[c.parentId] = [];
      repliesMap[c.parentId].push(c);
    }
  });

  // ── Ensure every <li> inside a <ul> has a visible bullet, and that
  // TinyMCE's habit of wrapping list-item text in <p>...</p> doesn't push
  // the text away from its own bullet (browser default paragraph margins).
  // Both bullet + spacing are baked into the HTML itself via inline styles,
  // so this no longer depends on any external/global CSS to render correctly.
  function addManualBulletsToLists(html: string): string {
    if (!html) return html;

    return html.replace(/<ul([^>]*)>([\s\S]*?)<\/ul>/gi, (_match, ulAttrs, inner) => {
      // 1. Zero out top/bottom margin on any <p> wrapping list-item text.
      //    This is what was actually causing the gap between the bullet
      //    and its text — the <li>'s bullet marker sits fine, but the
      //    inner <p> still carries the browser's default ~1em margin.
      let processed = inner.replace(/<p([^>]*)>/gi, (_m: string, pAttrs: string) => {
        const styleMatch = pAttrs.match(/style\s*=\s*"([^"]*)"/i);
        if (styleMatch) {
          const cleaned = styleMatch[1].replace(/margin[^;]*;?/gi, '').trim();
          const newStyle = `${cleaned}${cleaned ? '; ' : ''}margin:0`;
          return `<p${pAttrs.replace(/style\s*=\s*"([^"]*)"/i, `style="${newStyle}"`)}>`;
        }
        return `<p${pAttrs} style="margin:0">`;
      });

      // 2. Add the bullet character, plus inline spacing + alignment so
      //    the marker and text sit on the same line rather than stacking.
      processed = processed.replace(
        /<li([^>]*)>(?!\s*&bull;)/gi,
        (_m: string, liAttrs: string) => {
          const styleMatch = liAttrs.match(/style\s*=\s*"([^"]*)"/i);
          const spacingStyle = 'margin-bottom:10px; display:flex; align-items:flex-start; gap:6px';
          const newLiAttrs = styleMatch
            ? liAttrs.replace(
              /style\s*=\s*"([^"]*)"/i,
              `style="${styleMatch[1].replace(/;$/, '')}; ${spacingStyle}"`
            )
            : `${liAttrs} style="${spacingStyle}"`;
          return `<li${newLiAttrs}><span style="flex-shrink:0">&bull;</span><span>`;
        }
      );

      // Close the extra <span> we opened before each </li>
      processed = processed.replace(/<\/li>/gi, '</span></li>');

      return `<ul${ulAttrs}>${processed}</ul>`;
    });
  }

  return (
    <div className="luminix-padding-section light-bg1 ">
      <div className="container">
        <div className="row">

          {/* ── Main content ───────────────────────────────────── */}
          <div className="col-lg-8">
            <div className="mr-30">

              {/* Hero image */}
              <div className="luminix-blog-d-thumb" data-aos="fade-up" data-aos-duration="700">
                <Image
                  width={826} height={500}
                  src={post.imageUrl}
                  alt={post.title}
                  style={{ width: '100%', height: 'auto', objectFit: 'cover', maxHeight: '25rem' }}
                />
              </div>

              {/* Meta */}
              <div className="luminix-blog-meta meta2">
                <Link href="/blog">
                  <Image width={15} height={18} src={icon1_img} alt="/blog-icon1" aria-hidden="true" />
                  by admin
                </Link>
                <Link href="/blog">
                  <Image width={15} height={16} src={date_img} alt="/blog-date-time-image-icon" aria-hidden="true" />
                  {formatDate(post.date)}
                </Link>
                <button
                  onClick={() => handleCategory(post.category)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: 13, color: '#f97316' }}
                >
                  {post.category}
                </button>
              </div>

              {/* Content */}
              <div className="luminix-blog-d-content">
                <h2 style={{ marginBottom: 16 }}>{post.title}</h2>
                <div
                  className="lmx-rich-content"
                  dangerouslySetInnerHTML={{ __html: addManualBulletsToLists(post.excerpt) }}
                />
              </div>

              {/* Tags + Share */}
              <div className="luminix-blog-d-tag-wrap">
                {/* {post.tags && post.tags.length > 0 && (
                  <div className="luminix-blog-tags tags2">
                    <h5>Tags:</h5>
                    <ul>
                      {post.tags.map(tag => (
                        <li key={tag}>
                          <button
                            onClick={() => handleTag(tag)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                          >
                            {tag}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )} */}
                <div className="luminix-blog-d-social">
                  <h5>Share:</h5>
                  <div className="luminix-social-wrap blog-social">
                    <ul>
                      {socialLinksBlog.map((link, index) => (
                        <li key={index}>
                          <Link href={link.href} target="_blank" dangerouslySetInnerHTML={{ __html: link.svg }} />
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              {/* ── Comments list ─────────────────────────────── */}
              {/* {commentsLoading && topLevel.length === 0 && (
                <p style={{ textAlign: 'center', color: '#666' }}>Loading comments…</p>
              )} */}

              {/* {topLevel.length > 0 && (
                <div className="luminix-blog-d-comment-box">
                  <h5>Comments: ({comments.length})</h5>

                  {topLevel.map(comment => (
                    <div key={comment.id}>
                      <div className="luminix-blog-d-comment-wrap1">
                        <div className="luminix-blog-d-comment-thumb">
                          <Avatar name={comment.name} />
                        </div>
                        <div className="luminix-blog-d-comment-data1">
                          <h6>{comment.name}</h6>
                          <span>{formatDate(comment.createdAt)}</span>
                          <p>{comment.message}</p>
                        </div>
                        <div className="reply-btn mx-3">
                          <button
                            onClick={() => setReplyingTo(
                              replyingTo === comment.id ? null : comment.id
                            )}
                            style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                          >
                            {replyingTo === comment.id ? 'Cancel' : 'Reply'}
                          </button>
                        </div>
                      </div>
                      {repliesMap[comment.id]?.map(reply => (
                        <div key={reply.id} className="luminix-blog-d-comment-wrap pl-101">
                          <div className="luminix-blog-d-comment-thumb">
                            <Avatar name={reply.name} />
                          </div>
                          <div className="luminix-blog-d-comment-data">
                            <h6>{reply.name}</h6>
                            <span>{formatDate(reply.createdAt)}</span>
                            <p>{reply.message}</p>
                          </div>
                        </div>
                      ))}
                      {replyingTo === comment.id && (
                        <div style={{
                          marginLeft: 60, marginTop: 12, marginBottom: 16,
                          padding: 16, background: '#f9f9f9', borderRadius: 8,
                          border: '1px solid #eee',
                        }}>
                          <p style={{ fontSize: 13, color: '#666', marginBottom: 10 }}>
                            Replying to <strong>{comment.name}</strong>
                          </p>
                          <CommentForm
                            form={form}
                            submitting={submitting}
                            submitStatus={submitStatus}
                            submitError={submitError}
                            onChange={handleFormChange}
                            onSubmit={handleSubmit}
                            compact
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )} */}

              {/* ── Comment form (main) ───────────────────────── */}
              {/* {!replyingTo && (
                <div className="luminix-blog-d-comment-box2">
                  <h5>Leave a comment:</h5>
                  <div className="luminix-contact-box pl-51">
                    <CommentForm
                      form={form}
                      submitting={submitting}
                      submitStatus={submitStatus}
                      submitError={submitError}
                      onChange={handleFormChange}
                      onSubmit={handleSubmit}
                    />
                  </div>
                </div>
              )} */}

            </div>
          </div>

          {/* ── Sidebar ────────────────────────────────────────── */}
          <div className="col-lg-4" style={{ position: "sticky", top: "12%", height: "80vh", overflowY: "auto", overflowX: "hidden" }} >
            <div className="luminix-blog-sidebar">

              {/* Search */}
              {/* <div className="luminix-blog-widgets">
                <form onSubmit={handleSearch}>
                  <div className="luminix-search-box">
                    <input
                      type="search"
                      placeholder="Type to search..."
                      value={searchInput}
                      onChange={e => setSearchInput(e.target.value)}
                    />
                    <button type="submit" id="luminix-search-btn">
                      <i className="ri-search-line"></i>
                    </button>
                  </div>
                </form>
              </div> */}

              {/* Categories */}
              {/* <div className="luminix-blog-widgets">
                <h5>Blog Categories</h5>
                <Image width={191} height={2} className="line" src={line1_img} alt="" aria-hidden="true" />
                <div className="luminix-blog-categorie">
                  <ul>
                    {categories.map(cat => (
                      <li key={cat.name}>
                        <button
                          onClick={() => handleCategory(cat.name)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                        >
                          {cat.name} ({cat.count})
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              </div> */}

              {/* Recent Posts */}
              <div className="luminix-blog-widgets bg-white">
                <h5>Recent Posts</h5>
                <Image width={155} height={2} className="line" src={line3_img} alt="" aria-hidden="true" />
                {latestPosts.map((p, idx) => (
                  <Link
                    key={p.id}
                    className={` d-flex  luminix-recent-post-item flex-nowrap ${idx === 0 ? ' pt-15' : ''}`}
                    href={`/blog/${p.slug}`}
                  >
                    <div className="luminix-recent-post-thumb">
                      <Image width={150} height={100} src={p.imageUrl} alt={p.title} />
                    </div>
                    <div className="luminix-recent-post-data">
                      <span className="mx-auto" >
                        <Image width={15} height={16} className='blue-shift' src={date_img} alt="" aria-hidden="true" />
                        {formatDate(p.date)}
                      </span>
                      <div className="blog mx-auto "><h6>{p.title}</h6></div>
                    </div>
                  </Link>
                ))}
              </div>

              {/* Tags */}
              {/* {allTags.length > 0 && (
                <div className="luminix-blog-widgets">
                  <h5>Tags</h5>
                  <Image width={56} height={2} className="line" src={line2_img} alt="" aria-hidden="true" />
                  <div className="luminix-blog-tags">
                    <ul>
                      {allTags.map(tag => (
                        <li key={tag}>
                          <button
                            onClick={() => handleTag(tag)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                          >
                            {tag}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )} */}

            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

// ── Reusable comment form (unchanged) ────────────────────────
interface CommentFormProps {
  form: FormState;
  submitting: boolean;
  submitStatus: 'idle' | 'success' | 'error';
  submitError: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onSubmit: (e: React.FormEvent) => void;
  compact?: boolean;
}

function CommentForm({
  form, submitting, submitStatus, submitError, onChange, onSubmit, compact,
}: CommentFormProps) {
  return (
    <form onSubmit={onSubmit}>
      {!compact && (
        <div className="luminix-main-field">
          <input
            type="text"
            name="name"
            placeholder="Name *"
            value={form.name}
            onChange={onChange}
            required
          />
        </div>
      )}

      {compact && (
        <div className="luminix-main-field">
          <input
            type="text"
            name="name"
            placeholder="Name *"
            value={form.name}
            onChange={onChange}
            required
          />
        </div>
      )}

      <div className="row">
        <div className="col-lg-6">
          <div className="luminix-main-field">
            <input
              type="email"
              name="email"
              placeholder="Email *"
              value={form.email}
              onChange={onChange}
              required
            />
          </div>
        </div>
        <div className="col-lg-6">
          <div className="luminix-main-field">
            <input
              type="text"
              name="phone"
              placeholder="Phone Number"
              value={form.phone}
              onChange={onChange}
            />
          </div>
        </div>
      </div>

      <div className="luminix-main-field-textarea">
        <textarea
          name="message"
          placeholder="Write Your Message Here... *"
          value={form.message}
          onChange={onChange}
          required
        />
      </div>

      {/* Status messages */}
      {submitStatus === 'success' && (
        <div style={{
          padding: '10px 16px', marginBottom: 12,
          background: '#f0fdf4', border: '1px solid #86efac',
          borderRadius: 6, color: '#166534', fontSize: 14,
        }}>
          ✓ Comment submitted! It will appear after approval.
        </div>
      )}
      {submitStatus === 'error' && (
        <div style={{
          padding: '10px 16px', marginBottom: 12,
          background: '#fef2f2', border: '1px solid #fca5a5',
          borderRadius: 6, color: '#991b1b', fontSize: 14,
        }}>
          ✗ {submitError}
        </div>
      )}

      <button
        className="luminix-default-btn extra-btn4 pill"
        type="submit"
        disabled={submitting}
        style={{ opacity: submitting ? 0.7 : 1 }}
      >
        {submitting ? 'Sending...' : 'Send message'} <RightArrawWhitIcon />
      </button>
    </form>
  );
}