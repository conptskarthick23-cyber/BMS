'use client';

import { motion } from 'framer-motion';

// Add a standard flutter-like slide right-to-left animation for modern app feel
const pageVariants = {
    hidden: { opacity: 0, x: 15, scale: 0.98 },
    enter: { opacity: 1, x: 0, scale: 1 },
    exit: { opacity: 0, x: -15, scale: 0.98 },
};

export default function Template({ children }: { children: React.ReactNode }) {
    return (
        <motion.div
            variants={pageVariants}
            initial="hidden"
            animate="enter"
            exit="exit"
            transition={{ type: 'spring', stiffness: 350, damping: 25, duration: 0.3 }}
            className="h-full w-full relative"
        >
            {children}
        </motion.div>
    );
}
