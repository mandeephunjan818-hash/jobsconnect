// /api/blogs.ts

import { StaticImageData } from "next/image";

// Import all images
import blogImg1 from "../public/images/blog/da-img01.jpg";
import blogImg2 from "../public/images/blog/da-img02.jpg";
import blogImg3 from "../public/images/blog/da-img03.jpg";
import blogImg4 from "../public/images/blog/da-img04.jpg";
import blogImg5 from "../public/images/blog/da-img05.jpg";
import blogImg6 from "../public/images/blog/da-img06.jpg";
import blogImg7 from "../public/images/blog/img01.jpg";
import blogImg8 from "../public/images/blog/img02.jpg";
import blogImg9 from "../public/images/blog/img03.jpg";
import blogImg10 from "../public/images/blog/cd-img01.jpg";
import blogImg11 from "../public/images/blog/cd-img02.jpg";
import blogImg12 from "../public/images/blog/cd-img03.jpg";
import blogImg13 from "../public/images/blog/img04.jpg";
import blogImg14 from "../public/images/blog/img05.jpg";
import blogImg15 from "../public/images/blog/img06.jpg";
import blogImg16 from "../public/images/blog/img07.jpg";

// Base blog interface without read time
export interface BlogBase {
  id: string;
  title: string;
  slug: string;
  screens: StaticImageData;
  description?: string;
  author?: string;
  authorTitle?: string;
  create_at?: string;
  comment?: string;
  thumb?: string;
  blClass?: string;
}

export interface ReadableBlog extends BlogBase {
  read: string;  
}

export type Blog = BlogBase | ReadableBlog;

export const blogs: Blog[] = [
  {
    id: '1',
    title: 'AI in Neuroimaging: IXICO’s Cloud Transformation',
    slug: 'AI-in-Neuroimaging-IXICOs-Cloud-Transformation',
    screens: blogImg1,
    description: 'Embark on an enlightening journey through the realm.',
    author: 'farugia',
    authorTitle: 'Sineor Consultant',
    create_at: 'October 4, 2022',
    comment: '35',
    thumb: 'Technology',
    blClass: 'format-standard-image',
  },
  {
    id: '2',
    title: 'Cutting Clinical Trial Costs with AI Biomarkers',
    slug: 'Cutting-Clinical-Trial-Costs-with-AI-Biomarkers',
    screens: blogImg2,
    description: 'To perform a comprehensive SEO audit, check...',
    author: 'Andrew',
    authorTitle: 'Creative Director',
    create_at: 'October 4, 2023',
    comment: '80',
    thumb: 'Branding',
    blClass: 'format-standard-image',
  },
  {
    id: '3',
    title: 'Scaling Medical Imaging with Microsoft Cloud',
    slug: 'Scaling-Medical-Imaging-with-Microsoft-Cloud',
    screens: blogImg3,
    description: 'SEO audits are crucial for maintaining your websites.',
    author: 'Kurtz',
    authorTitle: 'Art Director',
    create_at: 'October 4, 2024',
    comment: '95',
    thumb: 'SEO',
    blClass: 'format-video',
  },
  {
    id: '4',
    title: 'Faster Neuro Trials with AI-Powered Imaging',
    slug: 'Faster-Neuro-Trials-with-AI-Powered-Imaging',
    screens: blogImg4,
    description: 'Digital transformation with IT solutions is about using.',
    author: 'Alex',
    authorTitle: 'Art Director',
    create_at: 'October 5, 2023',
    comment: '95',
    thumb: 'Branding',
  },
  {
    id: '5',
    title: 'Transforming Clinical Trials Through AI and Cloud',
    slug: 'Transforming-Clinical-Trials-Through-AI-and-Cloud',
    screens: blogImg5,
    description: 'The future of cybersecurity relies on innovative IT.',
    author: 'Aliza',
    authorTitle: 'Art Director',
    create_at: 'October 6, 2022',
    comment: '95',
    thumb: 'Consulting',
  },
  {
    id: '6',
    title: 'IXICO’s AI Biomarkers: Smarter, Faster Trials',
    slug: 'IXICOs-AI-Biomarkers-Smarter-Faster-Trials',
    screens: blogImg6,
    description: 'Digital transformation with IT solutions is about..',
    author: 'Tika',
    authorTitle: 'Art Director',
    create_at: 'October 9, 2024',
    comment: '95',
    thumb: 'Embarking',
  },
  {
    id: '7',
    title: 'How to Prevent Ransomware Attacks, Tips for Businesses..',
    slug: 'How-to-Prevent-Ransomware-Attacks-Tips-for-Businesses..',
    screens: blogImg7,
    description: 'Student visa consulting agencies are equipped with professionals who specialize in the intricacies of visa applications.',
    author: 'Johnson',
    authorTitle: 'Art Director',
    create_at: '11/12/2024',
    comment: '95',
    thumb: 'Consulting',
  },
  {
    id: '8',
    title: 'Top Cybersecurity Threats Facing Businesses in the year..',
    slug: 'Top-Cybersecurity-Threats-Facing-Businesses-in-the-year..',
    screens: blogImg8,
    description: 'The realm of visa applications is a and ever-changing landscape...',
    author: 'Anderson',
    authorTitle: 'Art Director',
    create_at: '18/12/2024',
    comment: '95',
    thumb: 'Consulting',
  },
  {
    id: '9',
    title: 'Common cyber threats and how to prevent them..',
    slug: 'Common-cyber-threats-and-how-to-prevent-them..',
    screens: blogImg9,
    description: 'Embarking on a journey to study abroad is an aspiration many students..',
    author: 'Martinez',
    authorTitle: 'Art Director',
    create_at: '27/12/2024',
    comment: '95',
    thumb: 'Consulting',
  },
  {
    id: '10',
    title: 'DevOps for Both Discontinuous and Continuous Improvements',
    slug: 'DevOps-for-Both-Discontinuous-and-Continuous-Improvements',
    screens: blogImg10,
    description: 'Student visa consulting agencies are equipped with professionals who specialize in the intricacies of visa applications.',
    author: 'Alex Olebar',
    authorTitle: 'Art Director',
    create_at: '11/12/2024',
    comment: '95',
    thumb: 'Consulting',
  },
  {
    id: '11',
    title: 'Five Great DevOps Job Opportunities',
    slug: 'Five-Great-DevOps-Job-Opportunities',
    screens: blogImg11,
    description: 'The realm of visa applications is a and ever-changing landscape...',
    author: 'Rakim Yakun',
    authorTitle: 'Art Director',
    create_at: '18/12/2024',
    comment: '95',
    thumb: 'Consulting',
  },
  {
    id: '12',
    title: 'Anthropic AI Model Automates Developer Mouse Movements',
    slug: 'Anthropic-AI-Model-Automates-Developer-Mouse-Movements',
    screens: blogImg12,
    description: 'Embarking on a journey to study abroad is an aspiration many students..',
    author: 'Kim Jung',
    authorTitle: 'Art Director',
    create_at: '27/12/2024',
    comment: '95',
    thumb: 'Consulting',
  },
  {
    id: '13',
    title: 'Innomax Launches AI-Support..',
    slug: 'Innomax-Launches-AI-Support',
    screens: blogImg13,
    read: '3 min read',
  },
  {
    id: '14',
    title: 'New Features Boost Innomax Support Solutions..',
    slug: 'New-Features-Boost-Innomax-Support-Solutions',
    screens: blogImg14,
    read: '4 min read',
  },
  {
    id: '15',
    title: 'Innomax Enhances Support with AI Automation..',
    slug: 'Innomax-Enhances-Support-with-AI-Automation..',
    screens: blogImg15,
    read: '8 min read',
  },
  {
    id: '16',
    title: 'Innomax AI Deflects 15% of Support Tickets..',
    slug: 'Innomax-AI-Deflects-15%-of-Support-Tickets..',
    screens: blogImg16,
    read: '9 min read',
  },
];

export async function getBlogs() {
  return blogs;
}
