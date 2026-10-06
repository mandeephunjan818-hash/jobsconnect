'use client';

import React from 'react';
import ContactSection from '../../components/It-Services-Components/ContactSection';
import Breadcrumb from '../Breadcrumb';

const ContactPage: React.FC = () => {
  return (
    <>
      <div className="body_wrap sco_agency">
        <Breadcrumb />
        <ContactSection />
      </div>
    </>
  );
};

export default ContactPage;
