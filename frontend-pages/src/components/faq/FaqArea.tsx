"use client";
import Image from 'next/image';
import { useEffect, useState } from 'react';
import type { FaqSection } from '@/app/actions/faqAction'; // import the type
// import faq_data from '@/data/faq-data'; 

// images
import mynus_img from "@/assets/images/faq/mynus.svg";
import plas_img from "@/assets/images/faq/plas.svg";

interface Props {
  sections?: FaqSection[];
}

export default function FaqArea({ sections }: Props) {
  // Use DB data if provided, otherwise fall back to the static file

  const value = sections;
  const data: FaqSection[] = (value && value.length > 0) ? value : [];
  // … rest of your component is 100% unchanged, just replace `faq_data` with `data` …
  const [activeQuestions, setActiveQuestions] = useState<Record<string, number | null>>(() => {
    const initialState: Record<string, number | null> = {};
    data.forEach(section => {
      initialState[section.id] = section.questions[0]?.id || null;
    });
    return initialState;
  });

  const toggleQuestion = (sectionId: string, questionId: number) => {
    setActiveQuestions(prev => ({
      ...prev,
      [sectionId]: prev[sectionId] === questionId ? null : questionId
    }));
  };

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 100;
      const sections = document.querySelectorAll<HTMLElement>('section[id]');
      const links = document.querySelectorAll<HTMLAnchorElement>('#scroll-btn a.luminix-default-btn.faq-btn');

      sections.forEach(section => {
        const id = section.id;
        const offset = section.offsetTop;
        const height = section.offsetHeight;

        if (scrollPosition >= offset && scrollPosition < offset + height) {
          links.forEach(link => {
            link.classList.remove('active');
            if (link.dataset.scroll === id) {
              link.classList.add('active');
            }
          });
        }
      });
    };

    const handleLinkClick = (e: MouseEvent) => {
      e.preventDefault();
      const target = e.currentTarget as HTMLAnchorElement;
      const targetId = target.getAttribute('href');

      if (targetId) {
        const targetSection = document.querySelector<HTMLElement>(targetId);
        if (targetSection) {
          window.scrollTo({
            top: targetSection.offsetTop - 80,
            behavior: 'smooth'
          });

          document.querySelectorAll('#scroll-btn a.luminix-default-btn.faq-btn').forEach(link => {
            link.classList.remove('active');
          });
          target.classList.add('active');
        }
      }
    };

    const links = document.querySelectorAll<HTMLAnchorElement>('#scroll-btn a.luminix-default-btn.faq-btn');
    links.forEach(link => {
      link.addEventListener('click', handleLinkClick);
    });

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => {
      links.forEach(link => {
        link.removeEventListener('click', handleLinkClick);
      });
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return (
    <section className="luminix-padding-section">
      <div className="container">
        <div className="row">
          <div className="col-lg-5">
            <div className="luminix-section-title text-start max-width-700 me-md-5 me-0 text-md-start text-center">
              <h6 className='text-md-start text-center text-gradient'>FAQ</h6>
              <h2 className='title pb-0 ml-20 capitalize' >Answers to the most popular questions</h2>
              <Image
                width={636}
                height={339}
                src={"/assets/images/service/s1.png"}
                alt={'/faq Image'}
                style={{
                  maxHeight: '600px',
                  marginTop: "2rem",
                  borderRadius: "2rem",
                  objectFit: 'cover' // Adds the image cover property
                }}
              />

            </div>
          </div>
          <div className="col-lg-7 mx-auto d-flex flex-column justify-content-center">
            {data.map((section) => (
              <section id={section.id} key={section.id} className="section" aria-labelledby={`${section.id}-heading`}>
                <div className="luminix-faq-wrap1" data-aos="fade-up" data-aos-duration="700">
                  {section.questions.map((item) => {
                    const isActive = activeQuestions[section.id] === item.id;
                    return (
                      <div
                        key={item.id}
                        className={`luminix-faq-item ${isActive ? 'open' : ''}`}
                        aria-expanded={isActive}
                        style={{ background: "#fff", zIndex: 1, marginBottom: "10px", padding: "2rem", borderRadius: "8px", boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)" }}
                      >
                        <div
                          className="luminix-faq-header"
                          onClick={() => toggleQuestion(section.id, item.id)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => e.key === 'Enter' && toggleQuestion(section.id, item.id)}
                          aria-controls={`faq-${section.id}-${item.id}`}
                        >
                          <h5 className='d-flex justify-content-start align-items-start' > <span dangerouslySetInnerHTML={{ __html: item.id }} ></span>{'. '}<span dangerouslySetInnerHTML={{ __html: item.question }} ></span></h5>

                          <div className="luminix-active-icon">
                            <Image width={24} height={24} className="plasicon" src={mynus_img} alt="here is theme image" />
                            <Image width={24} height={24} className="mynusicon" src={plas_img} alt="here is theme image" />
                          </div>
                        </div>
                        <div
                          id={`faq-${section.id}-${item.id}`}
                          className="luminix-faq-body"
                          style={{ display: isActive ? 'block' : 'none' }}
                        >
                          <p dangerouslySetInnerHTML={{ __html: item.answer }} ></p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}