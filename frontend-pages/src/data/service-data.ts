
 
import { StaticImageData } from "next/image";

// importing images for services
import service_img_1 from "@/assets/images/service/icon3.svg";
import service_img_2 from "@/assets/images/service/icon4.svg";
import service_img_3 from "@/assets/images/service/icon5.svg";
import service_img_4 from "@/assets/images/service/icon6.svg";
import service_img_5 from "@/assets/images/service/icon1.svg";
import service_img_6 from "@/assets/images/service/icon2.svg";
import service_img_7 from "@/assets/images/service/icon7.svg";
import service_img_8 from "@/assets/images/service/icon8.svg";
import service_img_9 from "@/assets/images/service/icon9.svg";

export interface ServiceItem {
  id: number;
  title: string;
  description: string;
  icon: StaticImageData;
  width: number;
  height: number;
  delay: number;
}

export const service_data: ServiceItem[] = [
  {
    id: 1,
    title: "Data Security",
    description: "Practices that organizations and individuals employ to ensure the confidentiality.",
    icon: service_img_1,
    width: 60,
    height: 60,
    delay: 500,
  },
  {
    id: 2,
    title: "SEO & Optimization",
    description: "SEO like google use to complex to algorithms to the relevance & authorith.",
    icon: service_img_2,
    width: 56,
    height: 60,
    delay: 700,
  },
  {
    id: 3,
    title: "Analytics & Research",
    description: "Analytics to the process of data often through statistical and quantitative.",
    icon: service_img_3,
    width: 70,
    height: 60,
    delay: 900,
  },
  {
    id: 4,
    title: "Financial Services",
    description: "Financial services refer to a broad range of the economic services provided.",
    icon: service_img_4,
    width: 56,
    height: 60,
    delay: 500,
  },
  {
    id: 5,
    title: "Market Analysis",
    description: "Market analysis services provide a detailed assessment, introduction of your brand.",
    icon: service_img_5,
    width: 62,
    height: 60,
    delay: 700,
  },
  {
    id: 6,
    title: "Paid Advertising",
    description: "Related to their products services or to have their ads displayed prominently.",
    icon: service_img_6,
    width: 66,
    height: 60,
    delay: 900,
  },
  {
    id: 7,
    title: "Expert Consulting",
    description: "Expert consultants can work for individuals, businesses, or organizations.",
    icon: service_img_7,
    width: 64,
    height: 60,
    delay: 500,
  },
  {
    id: 8,
    title: "App Development",
    description: "App development is the process of making software for smartphones or tablets.",
    icon: service_img_8,
    width: 60,
    height: 60,
    delay: 700,
  },
  {
    id: 9,
    title: "Brand Design",
    description: "Brand's visual identity by creating a unified system of design elements.",
    icon: service_img_9,
    width: 60,
    height: 60,
    delay: 900,
  },
];

export default service_data;