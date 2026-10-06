"use client"; // Required because we are using usePathname

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment } from "react";

// ── Helper: Converts URL slugs into readable text ─────────────
function humanize(segment: string) {
  if (!segment) return "";

  // 1. Map explicit terms
  const COMPOUNDS: Record<string, string> = {
    "ci-cd": "CI / CD",
    "cloud-devops": "Cloud DevOps",
    "devops": "DevOps",
    "jobs-connect": "Jobs Connect", // Added your specific site name just in case
  };

  if (COMPOUNDS[segment.toLowerCase()]) return COMPOUNDS[segment.toLowerCase()];

  const ACRONYMS = new Set([
    "Qa", "Api", "Ui", "Ux", "It", "Crm", "Erp", "Seo", "Hr", 
    "Ci", "Cd", "Ai", "Ml", "SaaS", "PaaS", "IaaS", "Paas", "Iaas", "Saas"
  ]);

  // 2. Split by standard single hyphens cleanly
  let words = segment.split("-");

  // 3. Capitalize words and intercept standalone "a"
  let humanized = words
    .map((word) => {
      if (!word) return "";
      if (word.toLowerCase() === "a") return "-";

      const capitalized = word.charAt(0).toUpperCase() + word.slice(1);
      return ACRONYMS.has(capitalized) ? capitalized.toUpperCase() : capitalized;
    })
    .join(" ");

  // 4. Global string cleanup
  humanized = humanized
    .replace(/\bAnd\b/g, "&")
    .replace(/\s+-\s+/g, " - ")
    .replace(/\s+/g, " ")
    .trim();

  return humanized;
}

// ── Component Props ───────────────────────────────────────────
type BreadcrumbProps = {
  title?: string;   // Made optional: falls back to dynamic URL title
  subtitle?: string; // Kept for backwards compatibility, but no longer used
  bg_img?: string;
};

const Breadcrumb = ({ title, bg_img }: BreadcrumbProps) => {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);
  const lastSegment = segments[segments.length - 1];

  // ── Generate Dynamic Breadcrumb Array ─────────────────────
  const crumbs = [{ label: "Home", href: "/", active: segments.length === 0 }];
  let pathAcc = "";

  segments.forEach((seg, idx) => {
    pathAcc += `/${seg}`;
    crumbs.push({
      label: humanize(seg),
      href: pathAcc,
      active: idx === segments.length - 1,
    });
  });

  // Use the passed `title` prop if provided, otherwise derive it from the URL
  const displayTitle = title || humanize(lastSegment || "Home");

  return (
    <>
      {/* Added inline style or class for the left-to-right gradient overlay */}
      <div className={`breadcrumb-wrapper ${bg_img || ""}`}>
        <div className="container" style={{ position: "relative", zIndex: 2 }}>
          <div className="breadcrumb-content">
            
            {/* REMOVED textTransform: "capitalize" so humanize() casing isn't overwritten by CSS */}
            <h1 className="breadcrumb-title">
              {displayTitle}
            </h1>

            <div className="breadcrumb-menu-wrapper">
              <div className="mt-3">
                <div className="breadcrumb-menu">
                  <ul>
                    {/* Map through the dynamic crumbs while keeping your exact HTML structure */}
                    {crumbs.map((crumb, idx) => (
                      <Fragment key={crumb.href}>
                        {/* Render the SVG separator for every item after the first one */}
                        {idx > 0 && (
                          <li>
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-chevron-right" viewBox="0 0 16 16">
                              <path fillRule="evenodd" d="M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708" />
                            </svg>
                          </li>
                        )}
                        
                        {/* Render the actual link or the active text */}
                        <li aria-current={crumb.active ? "page" : undefined}>
                          {crumb.active ? (
                            crumb.label
                          ) : (
                            <Link href={crumb.href}>{crumb.label}</Link>
                          )}
                        </li>
                      </Fragment>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Breadcrumb;