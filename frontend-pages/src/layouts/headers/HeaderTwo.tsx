"use client";
import OffCanvas from '@/common/OffCanvas';
import menu_data from '@/data/menu-data';
import useSticky from '@/hooks/use-sticky';
import Image from 'next/image';
import Link from 'next/link'
import { useState } from 'react';
 
// images import  
import logo_dark from "@/assets/images/logo/logo-dark.svg";
import call_icon from "@/assets/images/iconbox/call-icon.svg";



export default function HeaderTwo() {

  const { sticky } = useSticky();
  const [openMenu, setOpenMenu] = useState(false);


  return (
    <>
      <header className={`site-header luminix-header-section ${sticky ? 'sticky-menu' : ''}`} id="sticky-menu">
        <div className="luminix-header-bottom white-bg1">
          <div className="container">
            <div className="row gx-3 align-items-center justify-content-between">
              <div className="col-8 col-sm-auto ">
                <div className="header-logo1 ">
                  <Link href="/">
                    <Image width={100} height={36} src={logo_dark} alt="logo" />
                  </Link>
                </div>
              </div>
              <div className="col">
                <div className="luminix-main-menu-item">
                  <nav className="main-menu menu-style1 d-none d-xl-block menu-left">

                    <ul>
                      {menu_data.map((item, i) => (
                        <li key={i} className={`${item.has_dropdown ? 'menu-item-has-children' : ''}`}>
                          <Link href={item.link}>{item.title}</Link>
                          {item.has_dropdown && (
                            <ul className="sub-menu">
                              {item.sub_menus?.map((sub_item, sub_i) => {
                                if ('has_inner_dropdown' in sub_item) {
                                  return (
                                    <li key={sub_i} className={`${sub_item.has_inner_dropdown ? 'menu-item-has-children' : ''}`}>
                                      <Link href={sub_item.link || "#"} className={`${sub_item.has_inner_dropdown ? 'no-border' : ''}`}>{sub_item.title}</Link>
                                      {sub_item.has_inner_dropdown && (
                                        <ul className="sub-menu">
                                          {sub_item.sub_menus?.map((inner_sub_item, inner_sub_i) => (
                                            <li key={inner_sub_i}>
                                              <Link href={inner_sub_item.link || "#"}>{inner_sub_item.title}</Link>
                                            </li>
                                          ))}
                                        </ul>
                                      )}
                                    </li>
                                  );
                                } else {
                                  return (
                                    <li key={sub_i} >
                                      <Link href={sub_item.link || "#"}>{sub_item.title}</Link>
                                    </li>
                                  );
                                }
                              })}
                            </ul>
                          )}
                        </li>
                      ))}
                    </ul>

                  </nav>
                </div>
              </div>
              <div className="col-auto d-flex align-items-center">
                <div className="luminix-header-info-wraper2">
                  <div className="luminix-header-info-wrap2">
                    <div className="luminix-header-info-icon">
                      <Image width={40} height={40} src={call_icon} alt="here is theme image" />
                    </div>
                    <div className="luminix-header-info-content">
                      <ul>
                        <li>Call Any Time</li>
                        <li><a href="tel:088">+088-748-7888</a></li>
                      </ul>
                    </div>
                  </div>
                  <Link className="luminix-default-btn luminix-header-btn2" href="/conact-us">Get a Quote
                  </Link>
                </div>
                <div className="luminix-header-menu">
                  <nav className="navbar site-navbar justify-content-between">
                    <button className="luminix-menu-toggle d-inline-block d-xl-none" onClick={() => setOpenMenu(!openMenu)}>
                      <span></span>
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>
      <OffCanvas setOpenMenu={setOpenMenu} openMenu={openMenu} />

    </>
  )
}
