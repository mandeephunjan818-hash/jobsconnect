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
        "jobs-connect": "Jobs Connect",
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

// ── Small inline icons (no extra icon-lib dependency) ─────────
const HomeIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
            d="M3 10.5 12 3l9 7.5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <path
            d="M5.5 9v9.5A1.5 1.5 0 0 0 7 20h10a1.5 1.5 0 0 0 1.5-1.5V9"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </svg>
);

const ChevronIcon = () => (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
            d="M5.5 3.5 10 8l-4.5 4.5"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </svg>
);

// ── Component Props ───────────────────────────────────────────
type BreadcrumbProps = {
    title?: string;    // Falls back to dynamic URL title if omitted
    subtitle?: string; // Small eyebrow label shown above the title
    bg_img?: string;   // Optional extra class for page-specific accent tweaks
};

const Breadcrumb = ({ title, subtitle, bg_img = "/bread-crumb.png" }: BreadcrumbProps) => {
    const pathname = usePathname();
    const segments = pathname && pathname.split("/").filter(Boolean);
    const lastSegment = segments && segments[segments.length - 1];

    // ── Generate Dynamic Breadcrumb Array ─────────────────────
    const crumbs = [{ label: "Home", href: "/", active: segments?.length === 0 }];
    let pathAcc = "";

    segments && segments.forEach((seg, idx) => {
        pathAcc += `/${seg}`;
        crumbs.push({
            label: humanize(seg),
            href: pathAcc,
            active: idx === segments.length - 1,
        });
    });

    const displayTitle = title || humanize(lastSegment || "Home");

    return (
        <section className={`pg-crumb `}>
            <div className="container">
                <div className="pg-crumb__inner">
                    {subtitle && <span className="pg-crumb__eyebrow">{subtitle}</span>}

                    <h1 className="pg-crumb__title text-white">{displayTitle}</h1>

                    <nav className="pg-crumb__trail" aria-label="Breadcrumb">
                        <ol className="pg-crumb__list">
                            {crumbs.map((crumb, idx) => (
                                <Fragment key={crumb.href}>
                                    {idx > 0 && (
                                        <li className="pg-crumb__sep" aria-hidden="true">
                                            <ChevronIcon />
                                        </li>
                                    )}

                                    <li
                                        className={`pg-crumb__item ${crumb.active ? "pg-crumb__item--active" : ""}`}
                                        aria-current={crumb.active ? "page" : undefined}
                                    >
                                        {crumb.active ? (
                                            <span>
                                                {idx === 0 && <HomeIcon />}
                                                {crumb.label}
                                            </span>
                                        ) : (
                                            <Link href={crumb.href}>
                                                {idx === 0 && <HomeIcon />}
                                                {crumb.label}
                                            </Link>
                                        )}
                                    </li>
                                </Fragment>
                            ))}
                        </ol>
                    </nav>
                </div>
            </div>
        </section>
    );
};

export default Breadcrumb;