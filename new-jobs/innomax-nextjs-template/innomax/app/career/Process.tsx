'use client';

import React, { useState } from 'react';
import hicon from '../../public/images/icon/magic.svg';
import rImg from '../../public/images/process/cp-img.png';
import { Fade } from "react-awesome-reveal";
import {
  Accordion,
  AccordionBody,
  AccordionHeader,
  AccordionItem,
} from 'reactstrap';
import Image from 'next/image';

const Process: React.FC = () => {
  const [open, setOpen] = useState<string>('1');

  const toggle = (id: string) => {
    if (open === id) {
      setOpen('');
    } else {
      setOpen(id);
    }
  };

  return (
    <section className="process process-bg pt-115 pb-130">
      <div className="container">
        <div className="row align-items-center mt-none-30">
          <div className="col-lg-6 mt-30">
            <div className="faq">
              <div className="container">
                <div className="sec-title--two mb-50">
                  <Fade direction="down" triggerOnce={false} duration={1000} delay={9}>
                    <div className="sub-title wow fadeInDown" data-wow-duration="600ms">
                      <Image src={hicon} alt="" /> Hiring process
                    </div>
                  </Fade>
                  <Fade direction="up" triggerOnce={false} duration={1200} delay={9}>
                    <h2 className="title wow fadeInDown" data-wow-delay="150ms" data-wow-duration="600ms">
                      Have a Our hiring process
                    </h2>
                  </Fade>
                </div>

                <div className="row">
                  <div className="col-lg-12">
                    <div className="xb-faq cp-faq wow fadeInUp" data-wow-delay="200ms" data-wow-duration="600ms">
                      <Accordion open={open} toggle={toggle} className="accordion_box clearfix list-unstyled">
                        {[
                          { id: '1', title: 'Send your CV', text: 'Apply for a position by sending us your CV or providing a link to your LinkedIn profile, and take the first step toward joining our team.' },
                          { id: '2', title: 'Initial screening results?', text: 'Our recruiter will get back to you if your resume meets our requirements in order to introduce you to the role.' },
                          { id: '3', title: 'Job interview', text: 'You will meet a few of your potential colleagues to talk about your skills, background, and expectations in detail.' },
                          { id: '4', title: 'Test task', text: 'If needed, we’ll arrange a small test task. Depending on the project and role, this may be followed by a client interview.' },
                          { id: '5', title: 'You’re hired!', text: 'By deciding we are a good match for each other, we’ll agree the terms of you starting your career at innomax..' }
                        ].map(({ id, title, text }) => (
                          <AccordionItem key={id} className="block">
                            <AccordionHeader targetId={id} className="acc-btn">
                              <span className="number">{id.padStart(2, '0')}</span> _{title}
                              <span className="arrow"></span>
                            </AccordionHeader>
                            <AccordionBody accordionId={id} className="acc_body">
                              <div className="content">
                                <p>{text}</p>
                              </div>
                            </AccordionBody>
                          </AccordionItem>
                        ))}
                      </Accordion>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>

          <div className="col-lg-6 mt-30">
            <div className="cp-process-right">
              <div className="xb-img">
                <Image src={rImg} alt="Hiring process visual" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Process;
