"use client";

import React, { useState } from "react";
import Link from "next/link";
import Drawer from "@mui/material/Drawer";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import Collapse from "@mui/material/Collapse";
import IconButton from "@mui/material/IconButton";
import Box from "@mui/material/Box";

// ── Interfaces ──
interface SubMenuItem {
  title: string;
  link: string;
  has_inner_dropdown?: boolean;
  sub_menus?: SubMenuItem[];
}

interface MenuItem {
  title: string;
  link: string;
  has_dropdown?: boolean;
  sub_menus?: SubMenuItem[];
}

interface Props {
  menuData: MenuItem[];
  open: boolean;
  onClose: () => void;
  logoUrl?: string;
  logoAlt?: string;
}

export default function MobileMenu({
  menuData = [],
  open,
  onClose,
  logoUrl,
  logoAlt,
}: Props) {
  const [expandedMenus, setExpandedMenus] = useState<Record<number, boolean>>({});
  const [expandedInner, setExpandedInner] = useState<Record<string, boolean>>({});

  const toggleMenu = (index: number) => {
    setExpandedMenus((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  const toggleInner = (key: string) => {
    setExpandedInner((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // ── Recursive submenu renderer ──
  const renderSubMenu = (
    items: SubMenuItem[],
    parentKey: string,
    level: number = 1
  ) => (
    <List component="div" disablePadding>
      {items.map((item, idx) => {
        const hasChildren =
          "has_inner_dropdown" in item && item.has_inner_dropdown;
        const key = `${parentKey}-${idx}`;
        return (
          <React.Fragment key={key}>
            <ListItemButton
              sx={{ pl: level * 2 }}
              onClick={hasChildren ? () => toggleInner(key) : undefined}
              component={hasChildren ? "div" : Link}
              href={hasChildren ? undefined : item.link}
              onClickCapture={onClose} // close drawer on any link click
            >
              {/* Title */}
              <Box component="span" sx={{ flexGrow: 1 }}>
                {item.title}
              </Box>
              {/* Expand/collapse arrow */}
              {hasChildren && (
                <Box component="span" sx={{ ml: 1, fontSize: "0.9rem", lineHeight: 1 }}>
                  {expandedInner[key] ? "▲" : "▼"}
                </Box>
              )}
            </ListItemButton>
            {hasChildren && item.sub_menus && (
              <Collapse in={expandedInner[key]} timeout="auto" unmountOnExit>
                {renderSubMenu(item.sub_menus, key, level + 1)}
              </Collapse>
            )}
          </React.Fragment>
        );
      })}
    </List>
  );

  // ── Drawer ──
  return (
    <Drawer anchor="right" open={open} onClose={onClose}>
      <Box sx={{ width: 300 }} role="presentation">
        {/* Header */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            px: 2,
            py: 1,
            borderBottom: "1px solid #eee",
          }}
        >
          {logoUrl ? (
            <img src={logoUrl} alt={logoAlt || "Logo"} style={{ height: 40 }} />
          ) : (
            <span
              style={{
                fontSize: "16px",
                fontWeight: "bold",
                color: "#333",
              }}
            >
              No logo provided
            </span>
          )}
          <IconButton onClick={onClose}>
            <span style={{ fontSize: "1.4rem", lineHeight: 1 }}>✕</span>
          </IconButton>
        </Box>

        {/* Main menu list */}
        <List>
          {menuData.map((menu, i) => (
            <React.Fragment key={i}>
              <ListItemButton
                onClick={menu.has_dropdown ? () => toggleMenu(i) : undefined}
                component={menu.has_dropdown ? "div" : Link}
                href={menu.has_dropdown ? undefined : menu.link}
                onClickCapture={!menu.has_dropdown ? onClose : undefined}
              >
                <Box component="span" sx={{ flexGrow: 1 }}>
                  {menu.title}
                </Box>
                {menu.has_dropdown && (
                  <Box component="span" sx={{ ml: 1, fontSize: "0.9rem", lineHeight: 1 }}>
                    {expandedMenus[i] ? "▲" : "▼"}
                  </Box>
                )}
              </ListItemButton>
              {menu.has_dropdown && menu.sub_menus && (
                <Collapse in={expandedMenus[i]} timeout="auto" unmountOnExit>
                  {renderSubMenu(menu.sub_menus, `top-${i}`)}
                </Collapse>
              )}
            </React.Fragment>
          ))}
        </List>
      </Box>
    </Drawer>
  );
}