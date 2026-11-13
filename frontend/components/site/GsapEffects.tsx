'use client';

import { useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export default function GsapEffects() {
  useEffect(() => {
    const ctx = gsap.context(() => {
      // Hero staggered entrance
      gsap.fromTo(
        '.gsap-hero-item',
        { y: 22, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.65,
          stagger: 0.08,
          ease: 'power3.out',
          clearProps: 'transform',
        },
      );

      // Interactive demo card entrance
      gsap.fromTo(
        '.gsap-hero-demo',
        { y: 28, opacity: 0, scale: 0.98 },
        {
          y: 0,
          opacity: 1,
          scale: 1,
          duration: 0.75,
          delay: 0.18,
          ease: 'power3.out',
          clearProps: 'transform',
        },
      );

      // Scroll-triggered section reveals
      gsap.utils.toArray<HTMLElement>('.gsap-reveal').forEach((el) => {
        gsap.fromTo(
          el,
          { y: 28, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.65,
            ease: 'power2.out',
            clearProps: 'transform',
            scrollTrigger: {
              trigger: el,
              start: 'top 86%',
              once: true,
            },
          },
        );
      });

      // Staggered card grids
      gsap.utils.toArray<HTMLElement>('.gsap-stagger').forEach((group) => {
        const items = group.children;
        if (!items.length) return;
        gsap.fromTo(
          items,
          { y: 20, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.55,
            stagger: 0.09,
            ease: 'power2.out',
            clearProps: 'transform',
            scrollTrigger: {
              trigger: group,
              start: 'top 85%',
              once: true,
            },
          },
        );
      });
    });

    return () => ctx.revert();
  }, []);

  return null;
}

