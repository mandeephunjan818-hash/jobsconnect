"use client"
import React from 'react';
import Link from 'next/link';

const ErrorPage: React.FC = () => {
  return (
    <div className="body_wrap sco_agency">
      <div className="error-page error-page--dark">
        <div className="error-page__bg-grid" />
        <div className="error-page__glow" />

        <div className="container not-found-content">
          <div className="row justify-content-center">
            <div className="col-lg-12">
              <div className="contant-wrapper text-center">
                {/* <div className="error-page__icon">
                  <i className="fal fa-satellite-dish" aria-hidden="true" />
                </div> */}

                <div className="error-page__text">
                  <h2>404</h2>
                </div>

                <div className="error-page__content mb-50">
                  <h2>Hi, Sorry We Can’t Find That Page!</h2>
                  <p>
                    Oops! The page you are looking for does not exist. It might have been moved or deleted.
                  </p>

                  <div className="error-page-button">
                    <Link href="/" className="thm-btn thm-btn--aso thm-btn--aso_yellow">
                      <span className="btn_label" data-text="Go Back Home">
                        Go Back Home
                      </span>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .error-page--dark {
          position: relative;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          background: var(--bg-dark, #05070d);
          padding: 60px 20px;
        }

        .error-page__bg-grid {
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(255, 255, 255, 0.035) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.035) 1px, transparent 1px);
          background-size: 42px 42px;
          mask-image: radial-gradient(ellipse 60% 55% at 50% 40%, #000 40%, transparent 100%);
          -webkit-mask-image: radial-gradient(ellipse 60% 55% at 50% 40%, #000 40%, transparent 100%);
          pointer-events: none;
        }

        .error-page__glow {
          position: absolute;
          top: 8%;
          left: 50%;
          transform: translateX(-50%);
          width: 640px;
          height: 640px;
          max-width: 90vw;
          background: radial-gradient(
            circle,
            rgba(255, 176, 32, 0.16) 0%,
            rgba(255, 176, 32, 0.06) 35%,
            transparent 70%
          );
          filter: blur(10px);
          pointer-events: none;
        }

        .not-found-content {
          position: relative;
          z-index: 2;
        }

        .error-page__icon {
          font-size: 34px;
          color: var(--accent-yellow, #ffb020);
          opacity: 0.85;
          margin-bottom: 18px;
        }

        .error-page__text h2 {
          font-family: var(--font-heading, inherit);
          font-size: clamp(90px, 16vw, 200px);
          font-weight: 700;
          line-height: 1;
          margin: 0;
          background: linear-gradient(180deg, #ffffff 0%, #8a8f9c 100%);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          letter-spacing: -1px;
        }

        .error-page__content h2 {
          font-family: var(--font-heading, inherit);
          font-size: clamp(22px, 3vw, 32px);
          font-weight: 400;
          color: #f4f5f7;
          margin: 10px 0 14px;
        }

        .error-page__content p {
          font-family: var(--font-body, inherit);
          font-size: 15.5px;
          line-height: 1.7;
          color: #8f93a1;
          max-width: 460px;
          margin: 0 auto 34px;
        }

        .error-page-button :global(.thm-btn--aso_yellow) {
          box-shadow: 0 8px 30px rgba(255, 176, 32, 0.25);
        }

        @media (max-width: 480px) {
          .error-page__glow {
            width: 420px;
            height: 420px;
          }
        }
      `}</style>
    </div>
  );
};

export default ErrorPage;