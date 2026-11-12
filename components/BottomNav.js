'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Lightbulb, Rocket } from 'lucide-react';
import { cx } from './ui';

const ITEMS = [
  { href: '/ideas', label: 'Ideas', icon: Lightbulb, match: (p) => p.startsWith('/ideas') },
  { href: '/execution', label: 'Execution', icon: Rocket, match: (p) => p.startsWith('/execution') },
];

export default function BottomNav() {
  const pathname = usePathname();
  const renderItem = ({ href, label, icon: Icon, match }) => {
    const active = match(pathname);
    return (
      <li key={href}>
        <Link href={href} aria-current={active ? 'page' : undefined} className="flex flex-col items-center gap-0.5 pb-2 pt-2.5">
          <span className={cx('grid h-8 w-14 place-items-center rounded-full transition-all duration-300', active ? 'bg-brand-100 text-brand-700 dark:bg-brand-500/20 dark:text-brand-300' : 'text-ink-mute')}>
            <Icon className={cx('h-[22px] w-[22px] transition-transform', active && 'scale-110')} strokeWidth={active ? 2.4 : 2} />
          </span>
          <span className={cx('text-[11px] font-semibold', active ? 'text-brand-700 dark:text-brand-300' : 'text-ink-mute')}>{label}</span>
        </Link>
      </li>
    );
  };
  return (
    <>
      <nav
        className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-md rounded-t-[28px] border-t border-neutral-100 bg-white/90 px-2 pb-safe shadow-nav backdrop-blur-xl dark:border-white/5 dark:bg-[#0f1a14]/90"
        aria-label="Main"
      >
        <ul className="grid grid-cols-2 items-center">
          {renderItem(ITEMS[0])}
          {renderItem(ITEMS[1])}
        </ul>
      </nav>
    </>
  );
}
