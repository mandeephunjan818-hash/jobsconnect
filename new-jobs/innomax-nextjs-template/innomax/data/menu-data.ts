

const menu_data = [
	{
		title: "Home",
		has_dropdown: false,
		link: "/",
		sub_menus: [
			{ link: "/", title: "Home Page 01" },
			{ link: "/home-2", title: "Home Page 02" },
			{
				link: "/home-3",
				title: "Home Page 03",
				has_inner_dropdown: false,
				sub_menus: [
					{ title: "Team", link: "/team" },
					{ title: "Team Details", link: "/single-team" },
				],
			},
		],
	},
	{
		title: "About Us",
		link: "/about-us",
	},
	{
		title: "Jobs",
		link: "/jobs",
	},
	{
		title: "Blog",
		has_dropdown: false,
		link: "/blog",
		sub_menus: [
			{ title: "Blog", link: "/blog" },
			{ title: "Blog Details", link: "/single-blog" },
		],
	},
	{
		title: "Contact Us",
		has_dropdown: false,
		link: "/contact-us",
	},
];

export default menu_data;
