'use client';

import {motion,useScroll,useSpring} from 'motion/react';

export default function Rc81Experience(){
  const {scrollYProgress}=useScroll();
  const scaleX=useSpring(scrollYProgress,{stiffness:220,damping:34,mass:.28});
  return <motion.div className="rc81-scroll-progress" style={{scaleX}} aria-hidden="true"/>;
}
