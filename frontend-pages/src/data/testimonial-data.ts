 

import { StaticImageData } from "next/image";
// importing images for testimonials
import testimonial_rating_img from "@/assets/images/v1/rating.svg";
import testimonial_quote_img from "@/assets/images/v1/quote1.svg";
// importing avatar images for testimonials
import testimonial_avatar_img_2 from "@/assets/images/v1/test2.png";
import testimonial_avatar_img_1 from "@/assets/images/v1/test1.png";
import testimonial_avatar_img_3 from "@/assets/images/v1/test3.png";
import testimonial_avatar_img_6 from "@/assets/images/v1/test6.png";
import testimonial_avatar_img_4 from "@/assets/images/v1/test4.png";
import testimonial_avatar_img_7 from "@/assets/images/v1/test7.png";
import testimonial_avatar_img_8 from "@/assets/images/v1/test8.png";
import testimonial_avatar_img_9 from "@/assets/images/v1/test9.png";
import testimonial_avatar_img_5 from "@/assets/images/v1/test5.png";

interface TestimonialType {
    id: number;
    quote: string;
    ratingImage: StaticImageData;
    quoteImage: StaticImageData;
    author: {
        name: string;
        position: string;
        avatar:  StaticImageData;
    };
    animationDuration: string;
}[]
 

const testimonial_data:TestimonialType[] = [
  {
    id: 1,
    quote: "“Working with luminix was a game-changer for our company. Extremely recommended for businesses looking for transformative solutions.”",
    ratingImage: testimonial_rating_img,  
    quoteImage: testimonial_quote_img,  
    author: {
      name: "Bonsey Johnson",
      position: "Businessman",
      avatar: testimonial_avatar_img_2  
    },
    animationDuration: "500"
  },
  {
    id: 2,
    quote: "“Our experience was characterized by a results-driven approach that really made a difference. They are a reliable partner for driving success.”",
    ratingImage: testimonial_rating_img,
    quoteImage: testimonial_quote_img,
    author: {
      name: "Daniel Turner",
      position: "Founder@ XYZ Company",
      avatar: testimonial_avatar_img_1
    },
    animationDuration: "700"
  },
  {
    id: 3,
    quote: "“Working with luminix was a game-changer for our company. Extremely recommended for businesses looking for transformative solutions.”",
    ratingImage: testimonial_rating_img,
    quoteImage: testimonial_quote_img,
    author: {
      name: "Michael Ramirez",
      position: "Director Of ZuBaz",
      avatar: testimonial_avatar_img_3
    },
    animationDuration: "900"
  },
  {
    id: 4,
    quote: "“As CEO of Business Industries, I must appreciate the outstanding service. Our company grew as a result of their strategic direction.”",
    ratingImage: testimonial_rating_img,
    quoteImage: testimonial_quote_img,
    author: {
      name: "Khairul Bsar",
      position: "CEO @Company",
      avatar: testimonial_avatar_img_6
    },
    animationDuration: "500"
  },
  {
    id: 5,
    quote: "“What impressed us the most about was their commitment to transparent communication. A trusted navigating complex business landscapes.”",
    ratingImage: testimonial_rating_img,
    quoteImage: testimonial_quote_img,
    author: {
      name: "Rick Ferrari",
      position: "Manager",
      avatar: testimonial_avatar_img_4
    },
    animationDuration: "700"
  },
  {
    id: 6,
    quote: "“Working with Luminix was a game-changer for our company. Extremely recommended for businesses looking for transformative solutions.”",
    ratingImage: testimonial_rating_img,
    quoteImage: testimonial_quote_img,
    author: {
      name: "Harry McKendy",
      position: "Businessman",
      avatar: testimonial_avatar_img_7
    },
    animationDuration: "900"
  },
  {
    id: 7,
    quote: "“Their team went beyond identifying issues; they provided actionable insights and worked collaboratively with our internal teams.”",
    ratingImage: testimonial_rating_img,
    quoteImage: testimonial_quote_img,
    author: {
      name: "Jacob Jones",
      position: "Engineer",
      avatar: testimonial_avatar_img_8
    },
    animationDuration: "500"
  },
  {
    id: 8,
    quote: "Working with them was an absolute game-changer for our business. Their understanding, support & dedication exceeded expectations.",
    ratingImage: testimonial_rating_img,
    quoteImage: testimonial_quote_img,
    author: {
      name: "David Thompson",
      position: "CEO@ SD Company",
      avatar: testimonial_avatar_img_9
    },
    animationDuration: "700"
  },
  {
    id: 9,
    quote: "“Our experience was characterized by a results-driven approach that really made a difference. They are a reliable partner for driving success.”",
    ratingImage: testimonial_rating_img,
    quoteImage: testimonial_quote_img,
    author: {
      name: "Tom Smith",
      position: "Director Of IT Farm",
      avatar: testimonial_avatar_img_5
    },
    animationDuration: "900"
  }
];

export default testimonial_data;