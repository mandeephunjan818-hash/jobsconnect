import Breadcrumb from "@/common/Breadcrumb";
import HeaderOne from "@/layouts/headers/HeaderOne";
import Wrapper from "@/layouts/Wrapper";
import CtaHomeTwo from "../homes/home-2/CtaHomeTwo";
import BlogArea from "./BlogArea";
import FooterOne from "@/layouts/footers/FooterOne";

 

export default function Blog() {
  return (
    <Wrapper>
      <HeaderOne />
      <Breadcrumb title="Blog" subtitle="Blog" bg_img="blog-breadcrumb-bg" />
      <BlogArea />
      <CtaHomeTwo />
      <FooterOne />
    </Wrapper>
  )
}
