'use client';

import React, { FormEvent } from 'react';
import Link from 'next/link';

const SubmitHandler = (e: FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  // You can add form submission logic here
};

const Footer: React.FC = () => {
  return (
    <footer className="footer footer-style-five pt-150 pb-150 pos-rel bg-white">
      <div className="container">
        <div className="xb-footer">
          {/* Newsletter Section */}
          <div>
            <div className="row justify-content-center">
              <div className="col-lg-12">
                <div
                  className="cd-newslatter text-center"
                  style={{
                    background: '#1438bc',
                    borderRadius: '20px',
                    padding: '64px 48px',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  {/* signature warm accent — sits behind the card content */}
                  <div
                    aria-hidden="true"
                    style={{
                      position: 'absolute',
                      top: '-90px',
                      right: '-90px',
                      width: '220px',
                      height: '220px',
                      borderRadius: '50%',
                      background: 'radial-gradient(circle, rgba(242,169,59,0.18) 0%, transparent 70%)',
                    }}
                  />
                  <div
                    aria-hidden="true"
                    style={{
                      position: 'absolute',
                      bottom: '-100px',
                      left: '-70px',
                      width: '220px',
                      height: '220px',
                      borderRadius: '50%',
                      background: 'radial-gradient(circle, rgba(79,143,232,0.16) 0%, transparent 70%)',
                    }}
                  />
                  <h2
                    className="title text-white"
                    style={{ color: 'var(--text-on-dark)', position: 'relative', marginBottom: '10px' }}
                  >
                    Subscribe to get Mail <br /> for latest blogs and jobs
                  </h2>
                  <p
                    className="xb-item--content"
                    style={{ color: 'var(--text-on-dark-secondary)', position: 'relative', marginBottom: '32px' }}
                  >
                  </p>

                  <form
                    className="xb-item--input_field"
                    onSubmit={SubmitHandler}
                    style={{
                      position: 'relative',
                      display: 'flex',
                      gap: '12px',
                      maxWidth: '680px',
                      margin: '0 auto',
                      flexWrap: 'wrap',
                      justifyContent: 'center',
                    }}
                  >
                    <input
                      type="email"
                      name="email"
                      id="email"
                      placeholder="you@example.com"
                      required
                      style={{
                        flex: '1 1 240px',
                        minWidth: '0',
                        background: 'rgba(255,255,255,0.06)',
                        border: '1px solid rgba(255,255,255,0.18)',
                        borderRadius: '10px',
                        padding: '14px 18px',
                        color: 'var(--text-on-dark)',
                        fontFamily: 'var(--font-body)',
                        fontSize: '15px',
                        outline: 'none',
                      }}
                    />

                    <div
                      className="xb-btn wow fadeInUp"
                      data-wow-delay="300ms"
                      data-wow-duration="600ms"
                    >
                      <button
                        type="submit"
                        className="thm-btn thm-btn--fill_icon thm-btn--data"
                      >
                        <div className="xb-item--hidden">
                          <span className="xb-item--hidden-text">
                            Subscribe
                          </span>
                        </div>
                        <div className="xb-item--holder">
                          <span className="xb-item--text xb-item--text1">
                            Subscribe
                          </span>
                          <div className="xb-item--icon">
                            <i className="fal fa-plus"></i>
                          </div>
                          <span className="xb-item--text xb-item--text2">
                            Subscribe
                          </span>
                        </div>
                      </button>
                    </div>

                  </form>

                  <div className="xb-item--privacy" style={{ position: 'relative', marginTop: '20px' }}>
                    <div className="form-check" style={{ justifyContent: 'center', display: 'flex', gap: '8px' }}>
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id="agree"
                        required
                      />
                      <label
                        className="form-check-label"
                        htmlFor="agree"
                        style={{ color: 'var(--text-on-dark-secondary)', fontSize: '13px' }}
                      >
                        I agree to the{' '}
                        <Link href="/privacy-policy" style={{ color: 'var(--color-sky)' }}>
                          Privacy Policy
                        </Link>{' '}
                        and{' '}
                        <Link href="/terms-conditions" style={{ color: 'var(--color-sky)' }}>
                          Terms
                        </Link>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;