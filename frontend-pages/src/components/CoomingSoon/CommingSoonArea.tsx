"use client";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

type TimeLeft = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
};


// images import  
import logo_dark from "@/assets/images/logo/logo-dark.svg";

export default function CommingSoonArea() {

  const calculateTimeLeft = (): TimeLeft => {
    const deadline = new Date(`December 31, ${new Date().getFullYear()} 23:59:59`).getTime();

    const now = new Date().getTime();
    const distance = deadline - now;

    const days = Math.floor(distance / (1000 * 60 * 60 * 24));
    const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((distance % (1000 * 60)) / 1000);

    return {
      days: days >= 0 ? days : 0,
      hours: hours >= 0 ? hours : 0,
      minutes: minutes >= 0 ? minutes : 0,
      seconds: seconds >= 0 ? seconds : 0,
    };
  };

  const [timeLeft, setTimeLeft] = useState<TimeLeft>(calculateTimeLeft());

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer); // cleanup
  }, []);





  return (
    <>
      <div className="luminix-padding-section">
        <div className="container">
          <div className="luminix-logo">
            <Link href="/"><Image width={139} height={36} src={logo_dark} alt="here is theme image" /></Link>
          </div>
          <div className="luminix-coomig-soon-content">
            <h2 className="title pt-0">We're coming up with some exciting stuff soon!</h2>
            <p className="text">Get notified when we launch something new for you! Enter your email address here and stay tuned with us.</p>
          </div>
          <div className="luminix-countdown-wrap mt-50" data-aos="fade-up" data-aos-duration="700">
            <div className="luminix-countdown-item wow fadeInUpX" data-wow-delay="0.1s">
              <div className="countdown-days">
                <div className="number">{timeLeft.days}</div>
              </div>
              <h5>Days</h5>
            </div>
            <div className="luminix-countdown-item wow fadeInUpX" data-wow-delay="0.2s">
              <div className="countdown-hours">
                <div className="number">{timeLeft.hours}</div>
              </div>
              <h5>Hours</h5>
            </div>
            <div className="luminix-countdown-item wow fadeInUpX" data-wow-delay="0.3s">
              <div className="countdown-minutes">
                <div className="number">{timeLeft.minutes}</div>
              </div>
              <h5>Minutes</h5>
            </div>
            <div className="luminix-countdown-item wow fadeInUpX" data-wow-delay="0.4s">
              <div className="countdown-seconds">
                <div className="number">{timeLeft.seconds}</div>
              </div>
              <h5>Seconds</h5>
            </div>
          </div>
          <div className="luminix-subscription-field2 mt-50 extra-mt">
            <input type="email" placeholder="Enter your email" />
            <button className="luminix-default-btn sub-btn pill" type="submit">Get Notified</button>
            <p className="text">We do not share your information with any third party & no spam*</p>
          </div>
        </div>
      </div>
    </>
  )
}
