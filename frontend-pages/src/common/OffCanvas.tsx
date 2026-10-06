"use client";
import menu_data from "@/data/menu-data";
import Link from "next/link";
import Image from "next/image";
import { useState } from "react";

interface OffCanvasProps {
  setOpenMenu: (value: boolean) => void;
  openMenu: boolean;
  logoUrl?: string;
  logoAlt?: string;
}

const OffCanvas = ({ setOpenMenu, openMenu, logoUrl, logoAlt }: OffCanvasProps) => {
  const [navTitle, setNavTitle] = useState("");
  const [navTitle2, setNavTitle2] = useState("");

  const openMobileMenu = (menu: string) => {
    setNavTitle(prev => (prev === menu ? "" : menu));
  };

  const openMobileMenu2 = (menu: string) => {
    setNavTitle2(prev => (prev === menu ? "" : menu));
  };

  return (
    <div className={`luminix-menu-wrapper ${openMenu ? "luminix-body-visible" : ""}`}>
      <div className="luminix-menu-area text-center">
        <div className="luminix-menu-mobile-top">
          <div className="mobile-logo">
            <Link prefetch={false} href="/">
              {logoUrl ? (
                <Image
                  src={logoUrl}
                  alt={logoAlt || "Logo"}
                  width={200}
                  height={70}
                  style={{ objectFit: "contain" }}
                  unoptimized={logoUrl.startsWith("http")}
                />
              ) : (
                <div className="d-flex align-items-center justify-content-center me-auto" style={{ width: "fit-content" }}>
                  <div className="px-3 py-2 my-2 rounded text-white h3 fs-bold bg-primary">JC</div>
                  <p className="text-dark ms-3 h5">
                    Jobs<span className="text-primary"> Connect </span>
                  </p>
                </div>
              )}
            </Link>
          </div>
          <button className="luminix-menu-toggle mobile" onClick={() => setOpenMenu(false)}>
            <i className="ri-close-line"></i>
          </button>
        </div>
        <div className="luminix-mobile-menu">
          <ul>
            {menu_data.map((item, i) => (
              <li key={i} className={`menu-item-has-children luminix-item-has-children ${navTitle === item.title ? "luminix-active" : ""}`}>
                <Link prefetch={false} href={item.link}>
                  {item.title}
                  {item.has_dropdown && (
                    <span className="luminix-mean-expand" onClick={() => openMobileMenu(item.title)}></span>
                  )}
                </Link>
                {item.has_dropdown && (
                  <ul className={`sub-menu luminix-submenu ${navTitle === item.title ? "luminix-open" : ""}`} style={{ display: navTitle === item.title ? "block" : "none" }}>
                    {item.sub_menus?.map((submenu, i) => (
                      <li key={i} className={`menu-item-has-children luminix-item-has-children ${navTitle2 === submenu.title ? "luminix-active" : ""}`}>
                        <Link prefetch={false} className="no-border" href={submenu.link}>
                          {submenu.title}
                          {('has_inner_dropdown' in submenu) && submenu.has_inner_dropdown && (
                            <span className="luminix-mean-expand" onClick={() => openMobileMenu2(submenu.title)}></span>
                          )}
                        </Link>
                        {('has_inner_dropdown' in submenu) && submenu.has_inner_dropdown && (
                          <ul className={`sub-menu luminix-submenu ${navTitle2 === submenu.title ? "luminix-open" : ""}`} style={{ display: navTitle2 === submenu.title ? "block" : "none" }}>
                            {submenu.sub_menus?.map((subsubmenu, sub_i) => (
                              <li key={sub_i}>
                                <Link prefetch={false} href={subsubmenu.link}>{subsubmenu.title}</Link>
                              </li>
                            ))}
                          </ul>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </div>
        <div className="luminix-mobile-menu-btn">
          <a className="luminix-default-btn pill button-custom" href="/dashboard" data-text="Get Started">
            <span className="btn-wraper">Post Job</span>
          </a>
        </div>
      </div>
    </div>
  );
};

export default OffCanvas;