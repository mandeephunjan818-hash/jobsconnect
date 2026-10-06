interface InnerSubMenu {
  title: string;
  link: string;
}

interface SubMenu {
  title: string;
  link: string;
  has_inner_dropdown: boolean;
  submenu?: InnerSubMenu[];
}

interface MenuDataType {
  title: string;
  link: string;
  has_dropdown: boolean;
  submenu?: SubMenu[];
}

const menu_data: MenuDataType[] = [
  // {
  //   title: "Dashboard",
  //   link: "/dashboard",
  //   has_dropdown: false,
  // },
  {
    title: "Listings",
    link: "/dashboard/listings",
    has_dropdown: false,
  },
  {
    title: "Request A Job Listing",
    link: "/dashboard/job-bank",
    has_dropdown: false,
  },
  {
    title: "Wallet & Payments",
    link: "/dashboard/wallet-payments/wallet",
    has_dropdown: false,
  },
  // {
  //   title: "Credits",
  //   link: "/dashboard/credits",
  //   has_dropdown: false,
  // },
  // {
  //   title: "Wallet",
  //   link: "/dashboard/wallet",
  //   has_dropdown: false,
  // },
  // {
  //   title: "Activity History",
  //   link: "/dashboard/activity",
  //   has_dropdown: false,
  // },
  // {
  //   title: "Plans",
  //   link: "/dashboard/plan",
  //   has_dropdown: false,
  // },
  // {
  //   title: "New In Canada",
  //   link: "/",
  //   has_dropdown: false,
  // },
  // {
  //   title: "Jobs Refugee",
  //   link: "/",
  //   has_dropdown: false,
  // },
  // {
  //   title: "Vulnerable Youths",
  //   link: "/",
  //   has_dropdown: false,
  // },
  // {
  //   title: "Access Careers",
  //   link: "/",
  //   has_dropdown: false,
  // },
  // {
  //   title: "Indigenous Peoples",
  //   link: "/",
  //   has_dropdown: false,
  // },
];

export default menu_data; 