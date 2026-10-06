import Breadcrumb from "@/common/Breadcrumb";
import HeaderOne from "@/layouts/headers/HeaderOne";
import Wrapper from "@/layouts/Wrapper";
import CtaHomeTwo from "../homes/home-2/CtaHomeTwo";
import FaqArea from "./FaqArea";
import FooterOne from "@/layouts/footers/FooterOne";
import { getFaqs } from '@/app/actions/faqAction';

export default async function Faq() {
	const sections = await getFaqs(process.env.NEXT_PUBLIC_SITE_ID);

	console.log("the faq data", sections);

	return (
		<Wrapper>
			<HeaderOne />
			<Breadcrumb title="FAQs" subtitle="FAQs" bg_img="faq-breadcrumb-bg" />
			<FaqArea sections={sections} />
			<CtaHomeTwo />
			<FooterOne />
		</Wrapper>
	);
}