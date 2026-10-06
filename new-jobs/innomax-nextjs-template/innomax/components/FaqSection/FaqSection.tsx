'use client';

import React, { useState } from 'react';
import hicon from '../../public/images/icon/magic.svg';
import { Fade } from 'react-awesome-reveal';
import {
  Accordion,
  AccordionBody,
  AccordionHeader,
  AccordionItem,
} from 'reactstrap';
import Image from 'next/image';

const FaqSection: React.FC = () => {
  const [open, setOpen] = useState<string>('1');

  const toggle = (id: string) => {
    if (open === id) {
      setOpen('');
    } else {
      setOpen(id);
    }
  };

  return (
    <section className="faq pb-140">
      <div className="container">
        <div className="sec-title--two text-center mb-60">
          <Fade direction="down" triggerOnce={false} duration={1000} delay={9}>
            <div className="sub-title wow fadeInDown" data-wow-duration="600ms">
              <Image src={hicon} alt="Magic Icon" /> FAQ’s
            </div>
          </Fade>
          <Fade direction="up" triggerOnce={false} duration={1200} delay={9}>
            <h2
              className="title wow fadeInDown"
              data-wow-delay="150ms"
              data-wow-duration="600ms"
            >
              Have a question? Look here
            </h2>
          </Fade>
        </div>

        <div className="row">
          <div className="col-lg-12">
            <div className="xb-faq wow fadeInUp" data-wow-delay="200ms" data-wow-duration="600ms">
              <Accordion open={open} toggle={toggle} className="accordion_box clearfix list-unstyled">
                {faqList.map(({ id, question, content }) => (
                  <AccordionItem className="block" key={id}>
                    <AccordionHeader targetId={id} className="acc-btn">
                      <span className="number">{id}</span> _ {question}
                      <span className="arrow"></span>
                    </AccordionHeader>
                    <AccordionBody accordionId={id} className="acc_body">
                      <div className="content">
                        <p>{content.text}</p>
                        <ul className="list-unstyled">
                          {content.points.map((point, idx) => (
                            <li key={idx}>
                              <i className="far fa-check"></i>
                              {point}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </AccordionBody>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FaqSection;

interface FaqContent {
  text: string;
  points: string[];
}

interface FaqItem {
  id: string;
  question: string;
  content: FaqContent;
}

const faqList: FaqItem[] = [
  {
    id: '1',
    question: 'How long does it take to get results from SEO?',
    content: {
      text: "On average, our clients start to see initial results from SEO in 4–6 months. For competitive niches, it may take up to 1–2 years. The timeline depends on factors like:",
      points: [
        'The age and authority of your site.',
        'Your on-page and off-page optimization.',
        'Any penalties pulling your ranking down.'
      ]
    }
  },
  {
    id: '2',
    question: 'What SEO strategies do you implement for optimal results?',
    content: {
      text: "We implement a holistic SEO strategy tailored to your goals. Factors affecting the timeline include:",
      points: [
        'The age and authority of your site.',
        'Your on-page and off-page optimization.',
        'Any penalties pulling your ranking down.'
      ]
    }
  },
  {
    id: '3',
    question: 'What part of the SEO process do you outsource?',
    content: {
      text: "We focus on keeping critical SEO activities in-house, but may outsource specialized tasks if it adds value. Timeline depends on:",
      points: [
        'The age and authority of your site.',
        'Your on-page and off-page optimization.',
        'Any penalties pulling your ranking down.'
      ]
    }
  },
  {
    id: '4',
    question: 'Can you handle SEO for an enterprise-size company?',
    content: {
      text: "Absolutely! We’ve worked with enterprise clients across various sectors. However, timelines depend on:",
      points: [
        'The age and authority of your site.',
        'Your on-page and off-page optimization.',
        'Any penalties pulling your ranking down.'
      ]
    }
  },
  {
    id: '5',
    question: 'Do you offer professional link-building services?',
    content: {
      text: "Yes, we provide white-hat link-building services aligned with your niche and goals. Results depend on:",
      points: [
        'The age and authority of your site.',
        'Your on-page and off-page optimization.',
        'Any penalties pulling your ranking down.'
      ]
    }
  }
];
