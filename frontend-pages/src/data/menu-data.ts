

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
	// {
	// 	title: "Pages",
	// 	has_dropdown: true,
	// 	link: "#",
	// 	sub_menus: [
	// 		{ title: "About Us", link: "/about-us", has_inner_dropdown: false },
	// 		{ title: "Pricing", link: "/pricing", has_inner_dropdown: false },
	// 		{ title: "Testimonial", link: "/testimonial", has_inner_dropdown: false },
	// 		{
	// 			title: "Team",
	// 			has_inner_dropdown: true,
	// 			link: "#",
	// 			sub_menus: [
	// 				{ title: "Team", link: "/team" }, 
	// 				{ title: "Team Details", link: "/single-team" },
	// 			],
	// 		},
	// 		{
	// 			title: "Service",
	// 			has_inner_dropdown: true,
	// 			link: "#",
	// 			sub_menus: [
	// 				{ title: "Service", link: "/service" }, 
	// 				{ title: "Service Details", link: "/single-service" },
	// 			],
	// 		},
	// 		{
	// 			title: "Career",
	// 			has_inner_dropdown: true,
	// 			link: "#",
	// 			sub_menus: [
	// 				{ title: "Career", link: "/career" }, 
	// 				{ title: "Career Details", link: "/single-career" },
	// 			],
	// 		}, 
	// 		{
	// 			title: "Utility",
	// 			has_inner_dropdown: true,
	// 			link: "#",
	// 			sub_menus: [
	// 				{ title: "FAQ", link: "/faq" },
	// 				{ title: "Error 404", link: "/errors-404" },
	// 				{ title: "Cooming Soon", link: "/cooming-soon" },
	// 				{ title: "Term & Condition", link: "/term-condition" },
	// 			],
	// 		},
	// 	],
	// },
	// {
	// 	title: "Portfolio",
	// 	has_dropdown: true,
	// 	link: "#",
	// 	sub_menus: [
	// 		{ title: "Portfolio", link: "/portfolio" },
	// 		{ title: "Portfolio Details", link: "/single-portfolio" },
	// 	],
	// },
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
