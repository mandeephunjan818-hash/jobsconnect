import Breadcrumb from "@/common/Breadcrumb";
import HeaderOne from "@/layouts/headers/HeaderOne";
import Wrapper from "@/layouts/Wrapper";
import SingleTeamArea from "./SingleTeamArea";
import CtaHomeTwo from "../homes/home-2/CtaHomeTwo";
import FooterOne from "@/layouts/footers/FooterOne";


const SingleTeam = () => {
  return (
    <Wrapper>
      <HeaderOne />
      <Breadcrumb title="Team Details" subtitle="Team Details" bg_img="singleteam-breadcrumb-bg" />
      <SingleTeamArea />
      <CtaHomeTwo />
      <FooterOne />           
    </Wrapper>
  );
};

export default SingleTeam;