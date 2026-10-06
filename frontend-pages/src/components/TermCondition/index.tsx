
import Breadcrumb from '@/common/Breadcrumb'
import HeaderOne from '@/layouts/headers/HeaderOne'
import Wrapper from '@/layouts/Wrapper'
import TermConditionArea from './TermConditionArea'
import CtaHomeTwo from '../homes/home-2/CtaHomeTwo'
import FooterOne from '@/layouts/footers/FooterOne'


export default function TermCondition() {
  return (
    <Wrapper>
      <HeaderOne />
      <Breadcrumb title="Term & Condition" subtitle="Term & Condition" bg_img="termcondition-breadcrumb-bg" />
      <TermConditionArea />
      <CtaHomeTwo />
      <FooterOne />
    </Wrapper>
  )
}
