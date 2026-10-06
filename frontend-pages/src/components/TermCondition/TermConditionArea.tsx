 

"use client";
import RightArrawIconFaq from '@/svg/RightArrawIconFaq';
import { useEffect } from 'react';

export default function TermConditionArea() {
  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 100; // Adjust for header
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
    handleScroll(); // Initial check

    return () => {
      links.forEach(link => {
        link.removeEventListener('click', handleLinkClick);
      });
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const sections = [
    {
      id: "home",
      title: "Terms & Conditions",
      content: [
        {
          title: "Services Provided:",
          text: "The Agency offers business consulting services, including but not limited to strategy development, market research, operational improvements, and organizational consulting, as specified in the agreement."
        },
        {
          title: "Payment & Fees:",
          text: "The Client agrees to pay the Agency for services rendered as outlined in the contract. Fees may be structured as hourly, project-based, must be paid according to the agreed payment schedule."
        },
        {
          title: "Confidentiality:",
          text: "Both parties agree to maintain confidentiality regarding sensitive information shared during the consulting process, unless required by law or with prior written consent."
        },
        {
          title: "Intellectual Property:",
          text: "Any intellectual property created during the engagement, including reports, strategies, or materials, remains the property of the Agency unless otherwise agreed upon."
        },
        {
          title: "Termination:",
          text: "Either party may terminate the agreement with written notice if the terms are not met. Upon termination, all outstanding payments for services rendered up to the date of termination are due."
        },
        {
          title: "Dispute Resolution:",
          text: "In the event of a dispute, both parties agree to attempt to resolve it through mediation or arbitration before pursuing legal action."
        },
        {
          title: "Governing Law:",
          text: "These Terms & Conditions are governed by the laws of [Your Country/State], and any legal action shall be taken within the jurisdiction of [City or State]."
        }
      ]
    },
    {
      id: "about",
      title: "Privacy Policy",
      content: [
        {
          title: "Information Collection:",
          text: "We collect personal information when you engage with our services, including name, contact details, and business information necessary for providing consulting services."
        },
        {
          title: "Use of Information:",
          text: "Collected information is used solely for the purpose of providing and improving our consulting services, communicating with clients, and processing transactions."
        },
        {
          title: "Data Protection:",
          text: "We implement appropriate security measures to protect against unauthorized access, alteration, or destruction of your personal information."
        },
        {
          title: "Third-Party Disclosure:",
          text: "We do not sell, trade, or transfer your personally identifiable information to outside parties unless required to provide the agreed services or compelled by law."
        },
        {
          title: "Cookies:",
          text: "Our website may use cookies to enhance user experience and track usage patterns. Users can control cookie preferences through their browser settings."
        },
        {
          title: "Policy Changes:",
          text: "We reserve the right to modify this privacy policy at any time. Changes will be posted on our website with an updated revision date."
        },
        {
          title: "Contact Information:",
          text: "These Terms & Conditions are governed by the laws of [Your Country/State], and any legal action shall be taken within the jurisdiction of [City or State]."
        }
      ]
    }
  ];

  return (
    <div className="luminix-padding-section">
      <div className="container">
        <div className="row">
          <div className="col-lg-3">
            <nav id="scroll-btn" className="scroll-btn" data-aos="fade-up" data-aos-duration="700">
              <ul className="nav-menu">
                {sections.map((section, index) => (
                  <li key={section.id}>
                    <a
                      data-scroll={section.id}
                      href={`#${section.id}`}
                      className={`luminix-default-btn pill faq-btn ${index === 0 ? 'active' : ''}`}
                      aria-label={`Jump to ${section.title} section`}
                    >
                      {section.title} 
                      <RightArrawIconFaq />
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
          <div className="col-lg-9">
            {sections.map((section) => (
              <section id={section.id} key={section.id} className="section">
                <div className="luminix-term-condition-content">
                  <p className="title-text">
                    {section.id === 'home' 
                      ? 'These Terms & Conditions govern the services provided by Luminix (the "Agency") to clients (the "Client"). By engaging in business with us, the Client agrees to these terms.'
                      : 'This Privacy Policy describes how Luminix ("we", "us", or "our") collects, uses, and shares your personal information when you use our services.'}
                  </p>
                  {section.content.map((item, i) => (
                    <div key={i} className="luminix-term-condition-content">
                      <h3>{item.title}</h3>
                      <p>{item.text}</p>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}