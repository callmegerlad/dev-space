import type { IconMap, SocialLink, Site } from '@/types'

export const SITE: Site = {
  title: 'Gerald\'s Dev Space',
  description:
    'My personal development space where I share my projects, notes and learnings.',
  href: 'https://dev.geraldkjk.com',
  author: 'geraldkjk',
  locale: 'en-SG',
  featuredPostCount: 1,
  postsPerPage: 3,
}

export const NAV_LINKS: SocialLink[] = [
  {
    href: '/notes',
    label: 'notes',
  },
  {
    href: '/projects',
    label: 'projects',
  },
  {
    href: '/about',
    label: 'about',
  },
]

export const SOCIAL_LINKS: SocialLink[] = [
  {
    href: 'https://github.com/callmegerlad',
    label: 'GitHub',
  },
  {
    href: 'mailto:geraldkjk@gmail.com',
    label: 'Email',
  },
  {
    href: '/rss.xml',
    label: 'RSS',
  },
]

export const ICON_MAP: IconMap = {
  Website: 'lucide:globe',
  GitHub: 'lucide:github',
  LinkedIn: 'lucide:linkedin',
  Twitter: 'lucide:twitter',
  Email: 'lucide:mail',
  RSS: 'lucide:rss',
}
