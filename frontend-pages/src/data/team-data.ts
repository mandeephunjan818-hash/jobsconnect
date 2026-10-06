

import { StaticImageData } from "next/image";
// importing images for team members
import team_img_1 from "@/assets/images/team/team1.png";
import team_img_2 from "@/assets/images/team/team2.png";
import team_img_3 from "@/assets/images/team/team3.png";
import team_img_4 from "@/assets/images/team/team4.png";
import team_img_5 from "@/assets/images/team/team5.png";
import team_img_6 from "@/assets/images/team/team6.png";
import team_img_7 from "@/assets/images/team/team8.png";
import team_img_8 from "@/assets/images/team/team9.png";
import team_img_9 from "@/assets/images/team/team10.png";
import team_img_10 from "@/assets/images/team/team11.png";
import team_img_11 from "@/assets/images/team/team12.png";
import team_img_12 from "@/assets/images/team/team13.png";

interface TeamMemberType {
  id: number;
  name: string;
  position: string;
  image: StaticImageData;
  socialLinks: {
    facebook: string;
    twitter: string;
    instagram: string;
    linkedin: string;
  };
}

const team_data: TeamMemberType[] = [
  {
    id: 1,
    name: "James Bennett",
    position: "Founder & CEO",
    image: team_img_1,
    socialLinks: {
      facebook: "https://www.facebook.com",
      twitter: "https://www.twitter.com",
      instagram: "https://www.instagram.com",
      linkedin: "https://www.bd.linkedin.com"
    }
  },
  {
    id: 2,
    name: "Henry Collins",
    position: "Senior Consultant",
    image: team_img_2,
    socialLinks: {
      facebook: "https://www.facebook.com",
      twitter: "https://www.twitter.com",
      instagram: "https://www.instagram.com",
      linkedin: "https://www.bd.linkedin.com"
    }
  },
  {
    id: 3,
    name: "Oliver Wilson",
    position: "Finance Consultant",
    image: team_img_3,
    socialLinks: {
      facebook: "https://www.facebook.com",
      twitter: "https://www.twitter.com",
      instagram: "https://www.instagram.com",
      linkedin: "https://www.bd.linkedin.com"
    }
  },
  {
    id: 4,
    name: "Thomas Graham",
    position: "Management Officer",
    image: team_img_4,
    socialLinks: {
      facebook: "https://www.facebook.com",
      twitter: "https://www.twitter.com",
      instagram: "https://www.instagram.com",
      linkedin: "https://www.bd.linkedin.com"
    }
  },
  {
    id: 5,
    name: "Robin Jackson",
    position: "Marketing Expert",
    image: team_img_5,
    socialLinks: {
      facebook: "https://www.facebook.com",
      twitter: "https://www.twitter.com",
      instagram: "https://www.instagram.com",
      linkedin: "https://www.bd.linkedin.com"
    }
  },
  {
    id: 6,
    name: "Adam Smith",
    position: "SEO Expert",
    image: team_img_6,
    socialLinks: {
      facebook: "https://www.facebook.com",
      twitter: "https://www.twitter.com",
      instagram: "https://www.instagram.com",
      linkedin: "https://www.bd.linkedin.com"
    }
  },
  {
    id: 7,
    name: "Roberson",
    position: "Software Developer",
    image: team_img_7,
    socialLinks: {
      facebook: "https://www.facebook.com",
      twitter: "https://www.twitter.com",
      instagram: "https://www.instagram.com",
      linkedin: "https://www.bd.linkedin.com"
    }
  },
  {
    id: 8,
    name: "Jonny keth",
    position: "HR Manager",
    image: team_img_8,
    socialLinks: {
      facebook: "https://www.facebook.com",
      twitter: "https://www.twitter.com",
      instagram: "https://www.instagram.com",
      linkedin: "https://www.bd.linkedin.com"
    }
  },
  {
    id: 9,
    name: "Salmon Max",
    position: "Senior Consultant",
    image: team_img_9,
    socialLinks: {
      facebook: "https://www.facebook.com",
      twitter: "https://www.twitter.com",
      instagram: "https://www.instagram.com",
      linkedin: "https://www.bd.linkedin.com"
    }
  },
  {
    id: 10,
    name: "Rikon Trudo",
    position: "Digital Marketing Expert",
    image: team_img_10,
    socialLinks: {
      facebook: "https://www.facebook.com",
      twitter: "https://www.twitter.com",
      instagram: "https://www.instagram.com",
      linkedin: "https://www.bd.linkedin.com"
    }
  },
  {
    id: 11,
    name: "Ismailly Joe",
    position: "Senior Advisor",
    image: team_img_11,
    socialLinks: {
      facebook: "https://www.facebook.com",
      twitter: "https://www.twitter.com",
      instagram: "https://www.instagram.com",
      linkedin: "https://www.bd.linkedin.com"
    }
  },
  {
    id: 12,
    name: "Mark Zukarbar",
    position: "Project Manager",
    image: team_img_12,
    socialLinks: {
      facebook: "https://www.facebook.com",
      twitter: "https://www.twitter.com",
      instagram: "https://www.instagram.com",
      linkedin: "https://www.bd.linkedin.com"
    }
  }
];

export default team_data;