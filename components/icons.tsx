// Line icons, 24×24, stroke 1.5 (2 for small icons in badges), round caps and joins, currentColor.
// Only the icons that are actually used are here; the design package's reference set lives outside the
// repo (docs/design/README.md). Decorative by default: always aria-hidden, label the button instead.
import type { ReactNode } from "react";

type IconProps = { size?: number; strokeWidth?: number; className?: string };

const icon = (paths: ReactNode) =>
  function Icon({ size = 24, strokeWidth = 1.5, className }: IconProps) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className={className}
      >
        {paths}
      </svg>
    );
  };

export const Check = icon(<path d="M20 6 9 17l-5-5" />);
export const Plus = icon(<path d="M12 5v14M5 12h14" />);
export const Minus = icon(<path d="M5 12h14" />);
export const Menu = icon(<path d="M4 6h16M4 12h16M4 18h16" />);
export const X = icon(<path d="M18 6 6 18M6 6l12 12" />);
export const ChevronDown = icon(<path d="m6 9 6 6 6-6" />);
export const ChevronRight = icon(<path d="m9 6 6 6-6 6" />);
export const ArrowRight = icon(<path d="M5 12h14M13 6l6 6-6 6" />);

// Forms (components/ui/{TextField,Button,Alert}.tsx and the interest form). Small ones are drawn at stroke 2.
export const Alert = icon(
  <>
    <circle cx="12" cy="12" r="10" />
    <path d="M12 8v4M12 16h.01" />
  </>,
);
export const CheckCircle = icon(
  <>
    <circle cx="12" cy="12" r="10" />
    <path d="m8.5 12 2.5 2.5 4.5-5" />
  </>,
);
// Three quarters of a circle; the caller rotates it (animate-spin) while a button is loading.
export const Spinner = icon(<path d="M12 3a9 9 0 1 0 9 9" />);

export const Lock = icon(
  <>
    <rect x="4" y="11" width="16" height="10" rx="2" />
    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
  </>,
);
export const Home = icon(
  <>
    <path d="M3 10.5 12 3l9 7.5" />
    <path d="M5 9.5V21h14V9.5" />
    <path d="M10 21v-6h4v6" />
  </>,
);
export const Door = icon(
  <>
    <path d="M3 21h18" />
    <path d="M6 21V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v17" />
    <path d="M6 4l7 2v15" />
    <path d="M10.5 12.5h.01" />
  </>,
);
export const Users = icon(
  <>
    <circle cx="9" cy="8" r="4" />
    <path d="M2 21v-1a7 7 0 0 1 14 0v1" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75M22 21v-1a7 7 0 0 0-4-6.3" />
  </>,
);
export const Card = icon(
  <>
    <rect x="2" y="5" width="20" height="14" rx="2" />
    <path d="M2 10h20M6 15h4" />
  </>,
);
export const Toolbox = icon(
  <>
    <rect x="3" y="8" width="18" height="13" rx="2" />
    <path d="M8 8V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 13h18M10 13v2h4v-2" />
  </>,
);
export const Gear = icon(
  <>
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
    <circle cx="12" cy="12" r="3" />
  </>,
);
export const FileText = icon(
  <>
    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
    <path d="M14 3v5h5M9 13h6M9 17h4" />
  </>,
);
export const CalendarX = icon(
  <>
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <path d="M16 2v4M8 2v4M3 10h18" />
    <path d="m14 14-4 4M10 14l4 4" />
  </>,
);
export const Wrench = icon(
  <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94z" />,
);
export const Bell = icon(
  <>
    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
    <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
  </>,
);
export const Mail = icon(
  <>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="m3 7 9 6 9-6" />
  </>,
);
export const Layout = icon(
  <>
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <path d="M3 9h18M9 21V9" />
  </>,
);
export const Receipt = icon(
  <>
    <path d="M5 3h14v18l-3-2-2 2-2-2-2 2-2-2-3 2z" />
    <path d="M9 8h6M9 12h6" />
  </>,
);
export const Swap = icon(<path d="M7 4 3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7" />);
export const Folders = icon(
  <>
    <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <path d="M7 12h10" />
  </>,
);
export const Building = icon(
  <>
    <path d="M4 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16" />
    <path d="M16 9h2a2 2 0 0 1 2 2v10" />
    <path d="M3 21h18M8 7h4M8 11h4M8 15h4" />
  </>,
);

// Theme switcher (components/theme/ThemeSwitcher.tsx)
export const Sun = icon(
  <>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
  </>,
);
export const Moon = icon(<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z" />);
export const Monitor = icon(
  <>
    <rect x="2" y="3" width="20" height="14" rx="2" />
    <path d="M8 21h8M12 17v4" />
  </>,
);
