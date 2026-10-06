
import Breadcrumb from '@/common/Breadcrumb'
import HeaderOne from '@/layouts/headers/HeaderOne'
import Wrapper from '@/layouts/Wrapper'
import CtaHomeTwo from '../homes/home-2/CtaHomeTwo'
import CareerArea from './CareerArea'
import JobListArea from './JobListArea'
import FooterOne from '@/layouts/footers/FooterOne'
 

export default function Career() {
  return (
    <Wrapper>
      <HeaderOne />
      <Breadcrumb title="Career" subtitle="Career" bg_img="career-breadcrumb-bg" />
      <CareerArea />
      <JobListArea site="jobs-connect.vercel.app" />
      <CtaHomeTwo />
      <FooterOne />
    </Wrapper>
  )
}
