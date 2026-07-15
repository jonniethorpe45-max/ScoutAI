'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/app/athlete/dashboard', label: 'Dashboard' },
  { href: '/app/athlete/onboarding', label: 'Onboarding' },
  { href: '/app/athlete/passport', label: 'Passport' },
  { href: '/app/athlete/passport/preview', label: 'Preview' },
  { href: '/app/athlete/games', label: 'Games' },
  { href: '/app/athlete/stats', label: 'Stats' },
  { href: '/app/athlete/performance', label: 'Performance' },
  { href: '/app/athlete/settings', label: 'Settings' },
];

export function AthleteNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Athlete">
      <ul className="athleteNav">
        {LINKS.map((link) => {
          const current =
            pathname === link.href ||
            (link.href !== '/app/athlete/passport' && pathname?.startsWith(link.href));
          const passportExact =
            link.href === '/app/athlete/passport' &&
            (pathname === '/app/athlete/passport' || pathname === '/app/athlete/passport/');

          return (
            <li key={link.href}>
              <Link href={link.href} aria-current={current || passportExact ? 'page' : undefined}>
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
