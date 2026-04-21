'use client';

import React, { useRef } from 'react';
import { motion, useInView, Variants } from 'framer-motion';

type InViewMargin = `${number}px` | `${number}px ${number}px` | `${number}px ${number}px ${number}px` | `${number}px ${number}px ${number}px ${number}px`;

interface BlurTextProps {
  text: string;
  animateBy?: 'words' | 'letters';
  direction?: 'top' | 'bottom';
  delay?: number; // in milliseconds
  containerDelay?: number; // in milliseconds
  stepDuration?: number; // in seconds
  threshold?: number;
  rootMargin?: InViewMargin;
  className?: string;
  onAnimationComplete?: () => void;
}

export const BlurText: React.FC<BlurTextProps> = ({
  text,
  animateBy = 'words',
  direction = 'top',
  delay = 200,
  containerDelay = 0,
  stepDuration = 0.35,
  threshold = 0.1,
  rootMargin = '0px',
  className = '',
  onAnimationComplete,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, {
    once: true,
    amount: threshold,
    margin: rootMargin,
  });

  const elements = animateBy === 'words' ? text.split(' ') : text.split('');
  const yOffset = direction === 'top' ? -20 : 20;

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        delayChildren: containerDelay / 1000,
        staggerChildren: delay / 1000,
      },
    },
  };

  const itemVariants: Variants = {
    hidden: {
      opacity: 0,
      y: yOffset,
      filter: 'blur(10px)',
    },
    visible: {
      opacity: 1,
      y: 0,
      filter: 'blur(0px)',
      transition: {
        duration: stepDuration,
        ease: 'easeOut',
      },
    },
  };

  return (
    <motion.div
      ref={ref}
      className={`inline-flex flex-wrap ${className}`}
      variants={containerVariants}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      onAnimationComplete={onAnimationComplete}
    >
      {elements.map((element, index) => (
        <motion.span
          key={index}
          variants={itemVariants}
          style={{ display: 'inline-block', whiteSpace: 'pre' }}
        >
          {element}
          {animateBy === 'words' && index < elements.length - 1 && ' '}
        </motion.span>
      ))}
    </motion.div>
  );
};

export default BlurText;