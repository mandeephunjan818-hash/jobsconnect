'use client';

import React from 'react';
import AnchorLink from 'react-anchor-link-smooth-scroll';

const Scrollbar: React.FC = () => {
  return (
    <ul className="smothscroll">
      <li>
        <AnchorLink href="#scrool" aria-label="Scroll to top">
          <i className="far fa-arrow-up"></i>
        </AnchorLink>
      </li>
    </ul>
  );
};

export default Scrollbar;