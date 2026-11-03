import type { SVGProps } from "react";

const paths: Record<string, string> = {
  home: "M3 10.5 12 3l9 7.5M5.5 9v11h13V9M9 20v-6h6v6",
  building: "M4 21V5l8-3 8 3v16M8 7h1m3-1h1m3 1h1M8 11h1m3 0h1m3 0h1M8 15h1m3 0h1m3 0h1M10 21v-3h4v3",
  apartment: "M4 21V4h16v17M8 8h2m4 0h2M8 12h2m4 0h2M8 16h2m4 0h2M10 21v-3h4v3",
  invoice: "M6 3h12v18l-3-2-3 2-3-2-3 2V3ZM9 8h6m-6 4h6m-6 4h3",
  wrench: "m14.7 6.3 3 3M4 20l8.5-8.5m3.2-6.2a5 5 0 0 0 6 6l-4 4-6-6 4-4a5 5 0 0 0-6 6L4 20l-2-2 8.5-8.5",
  bell: "M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9m-8 12a2 2 0 0 0 4 0",
  people: "M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2m6-10a4 4 0 1 0 0-8 4 4 0 0 0 0 8m6-7a4 4 0 0 1 0 8m2 3h2a4 4 0 0 1 4 4v2",
  menu: "M4 6h16M4 12h16M4 18h16",
  logout: "M10 17l5-5-5-5m5 5H3m10-8h7a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-7",
  arrow: "M5 12h14m-6-6 6 6-6 6",
  check: "m5 12 4 4L19 6",
  plus: "M12 5v14m-7-7h14",
  close: "m6 6 12 12M18 6 6 18",
};

export function Icon({ name, ...props }: SVGProps<SVGSVGElement> & { name: keyof typeof paths }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}><path d={paths[name]} /></svg>;
}
