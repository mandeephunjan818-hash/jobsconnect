"use client";
import { useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import ScrollSmoother from "gsap/ScrollSmoother";
import SplitText from "gsap/SplitText";

gsap.registerPlugin(ScrollTrigger, ScrollSmoother, SplitText);

export default function AnimationProvider() {
  // Optionally require bootstrap JS in client
  useEffect(() => {
    if (typeof window !== "undefined") {
      require("bootstrap/dist/js/bootstrap");
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    let smoother: ScrollSmoother;
    let ctx: gsap.Context;

    const initAnimations = () => {
      ctx = gsap.context(() => {
        // Initialize ScrollSmoother only if it doesn't exist

        const isTouch = ScrollTrigger.isTouch;

        if (!isTouch && !ScrollSmoother.get()) {
          smoother = ScrollSmoother.create({
            smooth: 1.75,
            effects: true,
            smoothTouch: false,
            normalizeScroll: false,
            ignoreMobileResize: true,
            wrapper: "#smooth-wrapper",
            content: "#smooth-content",
          });
        }

        // Wait for fonts to load and DOM to be ready
        if (document.fonts && document.fonts.ready) {
          document.fonts.ready.then(() => {
            setTimeout(createAnimations, 100);
          });
        } else {
          setTimeout(createAnimations, 500);
        }
      });
    };

    const createAnimations = () => {
      // === Heading Chars ===
      gsap.utils.toArray<HTMLElement>(".heading-chars").forEach((el) => {
        if (!el.querySelector(".gsap-split-char")) {
          const split = new SplitText(el, { type: "chars", smartWrap: true });
          gsap.fromTo(
            split.chars,
            { y: 20, autoAlpha: 0 },
            {
              y: 0,
              autoAlpha: 1,
              scrollTrigger: {
                trigger: el,
                start: "top 95%",
                toggleActions: "play none none none",
              },
              stagger: 0.05,
              duration: 0.5,
              ease: "power2.out",
            }
          );
        }
      });

      // === Heading Words ===
      gsap.utils.toArray<HTMLElement>(".heading-word").forEach((el) => {
        if (!el.querySelector(".gsap-split-word")) {
          const delay = parseFloat(el.dataset.delay || "0");
          const split = new SplitText(el, { type: "words" });

          gsap.fromTo(
            split.words,
            { y: 60, autoAlpha: 0 },
            {
              y: 0,
              autoAlpha: 1,
              scrollTrigger: {
                trigger: el,
                start: "top 95%",
                toggleActions: "play none none none",
              },
              stagger: 0.1,
              delay,
              duration: 0.6,
              ease: "power2.out",
            }
          );
        }
      });

      // === Heading Lines ===
      gsap.utils.toArray<HTMLElement>(".heading-line").forEach((el) => {
        if (!el.querySelector(".gsap-split-line")) {
          const delay = parseFloat(el.dataset.delay || "0");
          const split = new SplitText(el, { type: "lines" });

          gsap.fromTo(
            split.lines,
            { y: 80, autoAlpha: 0 },
            {
              y: 0,
              autoAlpha: 1,
              scrollTrigger: {
                trigger: el,
                start: "top 95%",
                toggleActions: "play none none none",
              },
              stagger: 0.15,
              delay,
              duration: 0.7,
              ease: "power2.out",
            }
          );
        }
      });

      // === Color Change ===
      gsap.utils.toArray<HTMLElement>(".color-change").forEach((el) => {
        if (!el.querySelector(".gsap-split-char")) {
          const split = new SplitText(el, { type: "chars", smartWrap: true });
          gsap.fromTo(
            split.chars,
            { color: "#161616" },
            {
              color: "#3147FF",
              stagger: 0.05,
              scrollTrigger: {
                trigger: el,
                start: "top 95%",
                scrub: true,
              },
            }
          );
        }
      });

      // === Fade In Up ===
      gsap.utils.toArray<HTMLElement>(".fadeInUp").forEach((el) => {
        const delay = parseFloat(el.dataset.delay || "0");
        gsap.fromTo(
          el,
          { y: 60, autoAlpha: 0 },
          {
            y: 0,
            autoAlpha: 1,
            scrollTrigger: {
              trigger: el,
              start: "top 95%",
              toggleActions: "play none none none",
            },
            duration: 0.8,
            delay,
            ease: "power2.out",
          }
        );
      });

      // === CTA Circles ===
      gsap.utils.toArray<HTMLElement>(".cta-circles span").forEach((circle) => {
        let scale = 1;
        ScrollTrigger.create({
          trigger: circle,
          start: "top bottom",
          end: "bottom top",
          onUpdate: (self) => {
            scale =
              self.direction === 1
                ? gsap.utils.clamp(1, 1.2, scale + 0.01)
                : gsap.utils.clamp(1, 1.2, scale - 0.01);
            gsap.to(circle, {
              scale,
              overwrite: "auto",
              duration: 0.2,
              ease: "power3.out",
            });
          },
        });
      });

      // === Image Anim Left ===
      gsap.utils.toArray<HTMLElement>(".img-anim-left").forEach((el) => {
        const delay = parseFloat(el.dataset.delay || "0");
        gsap.fromTo(
          el,
          { xPercent: -8, clipPath: "inset(0 100% 0 0)", opacity: 0 },
          {
            xPercent: 0,
            clipPath: "inset(0 0% 0 0)",
            opacity: 1,
            duration: 1.2,
            ease: "power2.out",
            delay,
            scrollTrigger: {
              trigger: el,
              start: "top 95%",
              toggleActions: "play none none none"
            },
          }
        );
      });

      // === Image Anim Right ===
      gsap.utils.toArray<HTMLElement>(".img-anim-right").forEach((el) => {
        const delay = parseFloat(el.dataset.delay || "0");
        gsap.fromTo(
          el,
          { xPercent: 8, clipPath: "inset(0 0 0 100%)", opacity: 0 },
          {
            xPercent: 0,
            clipPath: "inset(0 0 0 0%)",
            opacity: 1,
            duration: 1.2,
            ease: "power2.out",
            delay,
            scrollTrigger: {
              trigger: el,
              start: "top 95%",
              toggleActions: "play none none none"
            },
          }
        );
      });

      // Image Zoom In/Out
      gsap.utils.toArray<HTMLElement>(".imgZoomInOut").forEach((el) => {
        let initialWidth = el.offsetWidth;
        const maxScale = 1.5;
        let maxAllowedWidth = window.innerWidth * 0.95;

        const resizeHandler = () => {
          maxAllowedWidth = window.innerWidth * 0.95;
          initialWidth = el.offsetWidth;
        };
        window.addEventListener("resize", resizeHandler);

        ScrollTrigger.create({
          trigger: el,
          start: "top 95%",
          scrub: true,
          onUpdate: (self) => {
            const progress = self.progress;
            const adjustedProgress = Math.max(0, (progress - 0.3) / 0.7);
            let newWidth = initialWidth * (1 + (maxScale - 1) * adjustedProgress);
            if (newWidth < initialWidth) newWidth = initialWidth;
            newWidth = Math.min(newWidth, maxAllowedWidth);
            el.style.width = `${newWidth}px`;
          },
        });

        // Cleanup on unmount
        return () => window.removeEventListener("resize", resizeHandler);
      });
    };

    // Initialize on component mount
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", initAnimations);
    } else {
      initAnimations();
    }

    // Refresh ScrollTrigger on window resize
    const handleResize = () => {
      setTimeout(() => {
        ScrollTrigger.refresh();
      }, 500);
    };

    window.addEventListener("resize", handleResize);

    // Cleanup
    return () => {
      if (ctx) ctx.revert();
      window.removeEventListener("resize", handleResize);
      ScrollTrigger.getAll().forEach((st) => st.kill());
      if (smoother) smoother.kill();
    };
  }, []);

  return null;
}