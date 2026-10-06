
import Breadcrumb from '@/common/Breadcrumb'
import HeaderOne from '@/layouts/headers/HeaderOne'
import Wrapper from '@/layouts/Wrapper'
import TestimonialArea from './TestimonialArea'
import CtaHomeTwo from '../homes/home-2/CtaHomeTwo'
import FooterOne from '@/layouts/footers/FooterOne'


export default function Testimonial() {
  return (
    <Wrapper>
      <HeaderOne />
      <Breadcrumb title="Testimonial" subtitle="Testimonial" bg_img="testimonial-breadcrumb-bg" />
      <TestimonialArea />
      <CtaHomeTwo />
      <FooterOne />
    </Wrapper>
  )
}
