
import { StaticImageData } from "next/image";
// importing images for blog posts
import blog_img_1 from "@/assets/images/blog/blog1.png"
import blog_img_2 from "@/assets/images/blog/blog2.png"
import blog_img_3 from "@/assets/images/blog/blog3.png"


interface BlogDataType {
    id: number;
    category: string;
    image: StaticImageData;
    title: string;
    author: string;
    date: string;
    aosDelay: string;
}[]




export const blog_data:BlogDataType[] = [
  {
    id: 1,
    category: "Business",
    image: blog_img_1,
    title: "A profitable business makes you happy and grow",
    author: "admin",
    date: "July 5, 2024",
    aosDelay: "500"
  },
  {
    id: 2,
    category: "Marketing",
    image: blog_img_2,
    title: "Business consulting drives results and success",
    author: "admin",
    date: "July 3, 2024",
    aosDelay: "700"
  },
  {
    id: 3,
    category: "Finance",
    image: blog_img_3,
    title: "Greater financial flexibility for strategic planning",
    author: "admin",
    date: "June 27, 2024",
    aosDelay: "900"
  }
];

export default blog_data; 