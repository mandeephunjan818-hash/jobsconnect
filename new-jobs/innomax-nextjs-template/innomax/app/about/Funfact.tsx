import React from 'react';
import CountUp from 'react-countup';

interface FunFact {
  value: number;
  suffix?: string;
  text: string;
  delay: string;
  isMiddle?: boolean;
  isLast?: boolean;
}

const funFacts: FunFact[] = [
  {
    value: 120,
    suffix: '+',
    text: 'success stories',
    delay: '0ms',
  },
  {
    value: 1.2,
    suffix: 'k',
    text: 'companies trust us',
    delay: '200ms',
    isMiddle: true,
  },
  {
    value: 100,
    suffix: '%',
    text: 'results guaranteed',
    delay: '300ms',
    isLast: true,
  },
];

const FunfactSection: React.FC = () => {
  return (
    <section className="fanfact pt-85 pb-125">
      <div className="container">
        <div className="row mt-none-30">
          {funFacts.map((fact, index) => {
            let itemClass = 'ap-fanfact-item wow fadeInUp';
            if (fact.isMiddle) itemClass += ' ap-fanfact-item--middle';
            if (fact.isLast) itemClass += ' ap-fanfact-item--last';

            return (
              <div className="col-lg-4 col-md-4 mt-30" key={index}>
                <div
                  className={itemClass}
                  data-wow-delay={fact.delay}
                  data-wow-duration="600ms"
                >
                  <h2 className="xb-item--number">
                    <CountUp end={fact.value} enableScrollSpy />
                    {fact.suffix}
                  </h2>
                  <span className="xb-item--text">{fact.text}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <span id="counter" className="d-none" />
    </section>
  );
};

export default FunfactSection;
