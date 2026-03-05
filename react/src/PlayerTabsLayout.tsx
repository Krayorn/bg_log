import { useEffect, useMemo, useRef } from 'react';
import { Outlet, useMatches } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import Layout from './Layout';

type Direction = 'up' | 'left' | 'right';

type TabHandle = {
  tabKey: string;
  tabIndex: number;
  direction: Direction;
};

const offsets: Record<Direction, { x: string; y: string }> = {
  up:    { x: '0%',   y: '-30%' },
  left:  { x: '-40%', y: '0%' },
  right: { x: '40%',  y: '0%' },
};

const variants = {
  enter: (dir: Direction) => ({
    ...offsets[dir],
    opacity: 0,
    scale: 0.96,
    filter: 'blur(6px)',
  }),
  center: {
    x: '0%',
    y: '0%',
    opacity: 1,
    scale: 1,
    filter: 'blur(0px)',
  },
  exit: (dir: Direction) => ({
    x: dir === 'left' ? '20%' : dir === 'right' ? '-20%' : '0%',
    y: dir === 'up' ? '20%' : '0%',
    opacity: 0,
    scale: 0.97,
    filter: 'blur(4px)',
  }),
};

// Survives remounts — only true on the very first app load
let isFirstAppLoad = true;

export default function PlayerTabsLayout() {
  const matches = useMatches();
  const reduceMotion = useReducedMotion();
  const prevKeyRef = useRef<string | null>(null);
  const skipAnimation = isFirstAppLoad;

  useEffect(() => {
    isFirstAppLoad = false;
  }, []);

  const currentTab = useMemo(() => {
    const match = [...matches]
      .reverse()
      .find((m) => m.handle && typeof (m.handle as TabHandle).tabIndex === 'number');
    return (match?.handle as TabHandle | undefined) ?? null;
  }, [matches]);

  const direction = currentTab?.direction ?? 'up';

  useEffect(() => {
    if (currentTab) prevKeyRef.current = currentTab.tabKey;
  }, [currentTab]);

  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    scrollRef.current?.closest('.overflow-y-auto')?.scrollTo(0, 0);
  }, [currentTab?.tabKey]);

  return (
    <Layout>
      <AnimatePresence initial={!skipAnimation} mode="popLayout" custom={direction}>
        <motion.div
          key={currentTab?.tabKey ?? 'tab'}
          custom={direction}
          variants={reduceMotion ? {} : variants}
          initial={reduceMotion ? false : 'enter'}
          animate="center"
          exit={reduceMotion ? undefined : 'exit'}
          transition={{
            duration: 0.22,
            ease: [0.16, 1, 0.3, 1],
          }}
          ref={scrollRef}
        >
          <Outlet />
        </motion.div>
      </AnimatePresence>
    </Layout>
  );
}
