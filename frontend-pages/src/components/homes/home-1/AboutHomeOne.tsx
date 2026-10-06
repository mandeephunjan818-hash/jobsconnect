import Image from 'next/image';
import Link from 'next/link';
import { unstable_cache } from 'next/cache';

import { getAboutByPageIdentifier } from '../../../app/actions/aboutAction';
import RightArrawWhitIcon from '@/svg/RightArrawWhitIcon';

// import icon1_img from '@/assets/images/about-us/icon1.svg';

// ─── ISR: cache this data fetch, revalidate every 60 seconds ────────────────
// The "about" tag lets /api/revalidate purge this on-demand too.
const getCachedAbout = unstable_cache(
  (pageIdentifier: string) => getAboutByPageIdentifier(pageIdentifier),
  ['about-section'],
  {revalidate: 1, tags: ['about'] }
);

// ─── Fallback shown when no DB data exists ────────────────────────────────────
const FALLBACK = {
  imageUrl: '/assets/images/about-us/about-01.png',
  subtitle: 'About Us',
  title: 'We source unique talent pools',
  paragraphs: [
    'Tailored recruitment turns your vision into reality with innovative staffing. We focus on understanding your unique culture to provide customized hiring advice that sets you apart.',
  ],
  listItems: [
    'Improve employer brand value',
    'Leverage digital talent search',
    'Expand expert workforce skill range',
  ],
  buttonText: 'Know More',
  buttonLink: '/about-us',
};

interface Props {
  /** Must match the pageIdentifier stored in MongoDB, e.g. "home-one" */
  pageIdentifier: string;
}

/**
 * AboutHomeOne — pure server component.
 *
 * Data is fetched at build time and statically cached.
 * Next.js will revalidate it every 60 s (ISR) OR immediately when
 * POST /api/revalidate is called with the "about" tag.
 *
 * No client JS is shipped for this component.
 */
export default async function AboutHomeOne({ pageIdentifier }: Props) {

  console.log('Fetching About data from DB for pageIdentifier:', pageIdentifier);

  const data = await getCachedAbout(pageIdentifier);

  console.log('Fetched About data:', data);

  // Gracefully fall back to hardcoded defaults when DB returns nothing.
  const {
    imageUrl,
    subtitle,
    title,
    paragraphs,
    listItems,
    buttonText,
    buttonLink,
  } = data ?? FALLBACK;

  return (
    <div className="luminix-padding-section light-bg1">
      <div className="container">
        <div className="row align-items-center">

          {/* ── Left: image ─────────────────────────────────────────────── */}
          <div className="col-lg-6">
            <div
              className="luminix-about-thumb d-flex justify-content-center position-relative"
              data-aos="fade-up"
              data-aos-duration="700"
            >
              <Image
                width={500}
                height={520}
                src={imageUrl}
                alt={title}
                priority
              />
              {/* <div className="luminix-about-card">
                <h2>12+</h2>
                <h5>Years of experience</h5>
              </div> */}
            </div>
          </div>

          {/* ── Right: content ───────────────────────────────────────────── */}
          <div className="col-lg-6">
            <div className="luminix-default-content text-md-start text-center">

              <h6 className='text-md-start text-center text-gradient ' >{subtitle}</h6>
              <h2 className="title capitalize text-md-start text-center">{title}</h2>

              {paragraphs.map((text, i) => (
                <p key={i} className="text" dangerouslySetInnerHTML={{ __html: text }} />
              ))}

              <div className="luminix-list-icon-content d-flex flex-column align-items-md-start align-items-center">
                <ul>
                  {listItems.map((item, i) => (
                    <li key={i} className="d-flex align-items-center gap-3 capitalize text-md-start text-center">
                      <svg
                        width="25"
                        height="24"
                        viewBox="0 0 25 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        aria-hidden="true"
                      >
                        {/* 1. Define the gradient locally within the SVG */}
                        <defs>
                          <linearGradient id={`svg-accent-gradient-${i}`} x1="0%" y1="0%" x2="100%" y2="100%">
                            {/* This maps directly to your gradient's underlying behavior, or uses the CSS variable color context */}
                            <stop offset="0%" stopColor="var(--purple-500)" />
                            <stop offset="100%" stopColor="var(--purple-100)" />
                          </linearGradient>
                        </defs>

                        {/* 2. Reference the gradient ID in the fill */}
                        <circle cx="12.5" cy="12" r="12" fill={`url(#svg-accent-gradient-${i})`} />
                        <path
                          d="M7.5 12.5l3 3 7-7"
                          stroke="white"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-50">
                <Link prefetch={false} href={buttonLink} className="luminix-default-btn pill button-custom">
                  {/* {buttonText} */}
                  {"Know More"}
                  <RightArrawWhitIcon />
                </Link>
              </div>

            </div>
          </div>

        </div>
      </div>
    </div>
  );
}