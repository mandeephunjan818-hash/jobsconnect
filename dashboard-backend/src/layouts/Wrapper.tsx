import AnimationProvider from "@/common/AnimationProvider";
import ScrollToTop from "@/common/ScrollToTop";
import Iconsvg from "@/svg/Iconsvg";
import SvgIconTwo from "@/svg/SvgIconTwo";
import { ReactNode } from "react";

interface WrapperProps {
  children: ReactNode;
}

const Wrapper = ({ children }: WrapperProps) => {
  return (
    <>
      {children}
      <AnimationProvider />
      <ScrollToTop />
      <Iconsvg />
      <SvgIconTwo />
    </>
  );
};

export default Wrapper;
