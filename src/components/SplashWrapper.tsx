'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import BlurText from './BlurText';

export default function SplashWrapper({ children }: { children: React.ReactNode }) {
  const [showSplash, setShowSplash] = useState(true);
  const [splashFinished, setSplashFinished] = useState(false);

  // You can also add a safety timeout in case the animation is somehow skipped
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2500); // adjust time based on the blur text duration + delay
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <AnimatePresence>
        {showSplash && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#080808]"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            onAnimationComplete={() => setSplashFinished(true)}
          >
            <div className="flex select-none">
              <BlurText 
                text="Premium" 
                delay={80} 
                animateBy="letters" 
                direction="top" 
                className="text-5xl md:text-7xl lg:text-8xl font-black text-white" 
              />
              <BlurText 
                text="Gyms" 
                delay={80} 
                containerDelay={80 * 7}
                animateBy="letters" 
                direction="top" 
                className="text-5xl md:text-7xl lg:text-8xl font-black text-[#FF3030]" 
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Either show children immediately but hide them, or mount them conditionally */}
      <div className={showSplash && !splashFinished ? 'hidden' : 'block'}>
        {children}
      </div>
    </>
  );
}
