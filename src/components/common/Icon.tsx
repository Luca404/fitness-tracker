import type { ReactNode, SVGProps } from 'react'

export type IconName = 'leaf' | 'heart' | 'fitness' | 'kitchen' | 'meals' | 'weight' | 'history' | 'settings' | 'plus' | 'chevron-right' | 'chevron-left' | 'close' | 'vegetable' | 'fruit' | 'legumes' | 'fish' | 'fiber' | 'sugar' | 'alcohol' | 'salt'

const paths: Record<IconName, ReactNode> = {
  leaf: <><path d="M20 3C10 3 4 7 4 13a6 6 0 0 0 6 6c6 0 10-6 10-16Z" /><path d="M3 22 15 10" /></>,
  heart: <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z" />,
  fitness: <><path d="M7 5v14M17 5v14M7 12h10M3 9v6M21 9v6" /><rect x="3" y="7" width="4" height="10" rx="1" /><rect x="17" y="7" width="4" height="10" rx="1" /></>,
  kitchen: <><path d="M4 9h16v9a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3ZM2 12h2m16 0h2M3 6h18M9 3h6" /></>,
  meals: <><path d="M4 3v5a3 3 0 0 0 6 0V3M7 3v18M17 14h3V3c-3 0-5 4-5 7 0 2 1 4 2 4Zm0 0v7" /></>,
  weight: <><rect x="3" y="3" width="18" height="18" rx="4" /><path d="M8 8a5 5 0 0 1 8 0M12 7v4" /></>,
  history: <path d="M5 20v-7M12 20V4M19 20V9" />,
  settings: <><path d="m9.2 3-.6 2-2 .9-2-.5-2.2 3.8L4 10.7v2.6l-1.6 1.5 2.2 3.8 2-.5 2 .9.6 2h4l.6-2 2-.9 2 .5 2.2-3.8-1.6-1.5v-2.6L20 9.2l-2.2-3.8-2 .5-2-.9-.6-2Z" /><circle cx="11.2" cy="12" r="3" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  'chevron-right': <path d="m9 5 7 7-7 7" />,
  'chevron-left': <path d="m15 5-7 7 7 7" />,
  close: <path d="m6 6 12 12M6 18 18 6" />,
  vegetable: <><path d="M12 21C4 18 2 11 4 5c5 0 9 3 10 7M12 21c8-3 10-10 8-16-5 0-9 3-10 7M12 21v-9" /></>,
  fruit: <><path d="M12 7c-7-5-12 2-7 10 2 4 4 4 7 2 3 2 5 2 7-2 5-8 0-15-7-10ZM12 7c-1-3 1-5 4-5M12 6c-3 0-4-1-4-3" /></>,
  legumes: <><path d="M19 4c5 6 1 16-8 17-5 1-9-2-8-6 1-3 4-3 7-3 5 0 5-11 9-8Z" /><path d="M8 17h.01M14 14h.01M18 9h.01" strokeWidth="3" /></>,
  fish: <><path d="M3 12c6-8 12-8 16 0-4 8-10 8-16 0ZM19 12l3-4v8l-3-4Z" /><circle cx="7.5" cy="11" r=".7" fill="currentColor" /><path d="m11 5 4-2 1 5m-5 11 4 2 1-5" /></>,
  fiber: <><path d="M12 22V4M12 8C6 8 5 5 5 2c5 0 7 2 7 6ZM12 14c-6 0-7-3-7-6 5 0 7 2 7 6ZM12 20c-6 0-7-3-7-6 5 0 7 2 7 6ZM12 11c6 0 7-3 7-6-5 0-7 2-7 6ZM12 17c6 0 7-3 7-6-5 0-7 2-7 6Z" /></>,
  sugar: <><path d="m12 4 8 4v9l-8 4-8-4V8l8-4ZM4 8l8 4 8-4M12 12v9M8 6l8 4" /></>,
  alcohol: <><path d="M7 3h10l1 6a6 6 0 0 1-12 0l1-6ZM12 15v6M8 21h8M6 8h12" /></>,
  salt: <><path d="M8 7h8l3 14H5L8 7ZM8 7V3h8v4M9 11h.01M15 13h.01M11 16h.01" /></>,
}

export default function Icon({ name, ...props }: SVGProps<SVGSVGElement> & { name: IconName }) {
  return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{paths[name]}</svg>
}
