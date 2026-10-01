'use client';

import {motion,useScroll,useSpring} from 'motion/react';

export default function AppExperience(){
  const {scrollYProgress}=useScroll();
  const scaleX=useSpring(scrollYProgress,{stiffness:220,damping:34,mass:.28});
  return <motion.div className="loc-scroll-progress" style={{scaleX}} aria-hidden="true"/>;
}
