'use client';

import { MotionConfig } from 'motion/react';
import { SPRINGS } from '@/lib/motion';

// reducedMotion="user": when the OS "reduce motion" setting is on, Motion
// skips transform/layout animations (elements jump to their end state) and
// keeps only opacity fades.
const MotionProvider = ({ children }: { children: React.ReactNode }) => (
    <MotionConfig reducedMotion="user" transition={SPRINGS.hover}>
        {children}
    </MotionConfig>
);

export default MotionProvider;
