"use client";

import Link from "next/link";
import { useJarallax } from "@/hooks/useJarallax";

interface BreadcrumbProps {
  title?: string;
  pageLink?: string;
  image?: string;
}

export default function Breadcrumb({ title, pageLink, image }: BreadcrumbProps) {
  const jarallaxRef = useJarallax(0.6);

  return (
    <div
      className="breadcrumb-section bg-img jarallax d-flex align-items-center justify-content-center breadcrumb "
      ref={jarallaxRef}
      style={{ backgroundImage: `url('/${image}')`}}
    > 
      <div className="container mx-auto">
        {/* Breadcrumb Content */}
        <div className="breadcrumb-content pt-5 text-center mx-auto ">
          <h1 className="text-center text-white" >{title}</h1>
          <ul className="list-unstyled">
            <li><Link href="/">Home</Link></li>
            <li>{pageLink}</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
