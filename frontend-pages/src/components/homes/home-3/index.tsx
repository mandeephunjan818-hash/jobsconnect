import HeaderThree from "@/layouts/headers/HeaderThree";
import Wrapper from "@/layouts/Wrapper";
import HeroHomeThree from "./HeroHomeThree";
import AboutHomeThree from "./AboutHomeThree";
import ServiceHomeThree from "./ServiceHomeThree";
import BrandHomeThree from "./BrandHomeThree";
import StandardHomeThree from "./StandardHomeThree";
import VideoHomeThree from "./VideoHomeThree";
import PricingHomeThree from "./PricingHomeThree";
import BlogHomeThree from "./BlogHomeThree";
import FooterThree from "@/layouts/footers/FooterThree";

const HomeThree = () => {
	return (
		<Wrapper>
			<HeaderThree />
			<HeroHomeThree />
			<AboutHomeThree />
			<ServiceHomeThree />
			<VideoHomeThree />
			<BrandHomeThree site="jobs-connect.vercel.app" />
			<StandardHomeThree />
			<PricingHomeThree />
			<BlogHomeThree />
			<FooterThree />
		</Wrapper>
	);
};

export default HomeThree;
