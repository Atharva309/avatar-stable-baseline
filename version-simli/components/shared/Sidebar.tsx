/**
 * Sidebar.tsx
 * Professor portal shell — fixed sidebar navigation and layout wrapper.
 */

"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type MaterialIconProps = {
  name: string;
  className?: string;
  filled?: boolean;
  style?: React.CSSProperties;
};

/**
 * Material Symbols Outlined icon wrapper.
 */
export function MaterialIcon({
  name,
  className = "",
  filled = false,
  style,
}: MaterialIconProps): React.ReactElement {
  return (
    <span
      className={`material-symbols-outlined ${className}`}
      style={{
        ...(filled
          ? { fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24" }
          : { fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24" }),
        ...style,
      }}
      aria-hidden
    >
      {name}
    </span>
  );
}

type NavItem = {
  href: string;
  label: string;
  icon: string;
  match: (path: string) => boolean;
};

const NAV_ITEMS: NavItem[] = [
  {
    href: "/teacher/dashboard",
    label: "Dashboard",
    icon: "dashboard",
    match: (path) => path === "/teacher/dashboard",
  },
  {
    href: "/teacher/dashboard",
    label: "My Classes",
    icon: "school",
    match: (path) => path.startsWith("/teacher/classes"),
  },
  {
    href: "/teacher/dashboard",
    label: "Library",
    icon: "book_5",
    match: () => false,
  },
  {
    href: "/teacher/dashboard",
    label: "Analytics",
    icon: "analytics",
    match: () => false,
  },
];

type ProfessorSidebarProps = {
  userName: string;
};

/**
 * Fixed 256px professor sidebar with navigation links.
 */
export function ProfessorSidebar({ userName }: ProfessorSidebarProps): React.ReactElement {
  const pathname = usePathname();
  const initials = userName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <aside className="hidden md:flex flex-col fixed left-0 top-0 h-full w-64 bg-surface-container-low border-r border-outline-variant p-4 gap-2 z-40">
      <div className="mb-6 px-2">
        <Link href="/teacher/dashboard" className="font-headline-lg text-headline-lg font-bold text-stitch-primary">
          PitchLab
        </Link>
        <p className="font-label-sm text-label-sm text-on-surface-variant mt-1">Professor Portal</p>
      </div>

      <nav className="flex flex-col gap-1 flex-1">
        {NAV_ITEMS.map((item) => {
          const active = item.match(pathname);
          return (
            <Link
              key={item.label}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all font-label-sm text-label-sm ${
                active
                  ? "bg-primary-container text-on-primary-container font-bold"
                  : "text-on-surface-variant hover:bg-surface-container-highest"
              }`}
            >
              <MaterialIcon name={item.icon} className="text-[20px]" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto pt-4 border-t border-outline-variant flex flex-col gap-1">
        <Link
          href="/teacher/dashboard"
          className="flex items-center gap-3 px-3 py-2 text-on-surface-variant hover:bg-surface-container-highest rounded-lg transition-all font-label-sm text-label-sm"
        >
          <MaterialIcon name="settings" className="text-[20px]" />
          Settings
        </Link>
        <Link
          href="/teacher/dashboard"
          className="flex items-center gap-3 px-3 py-2 text-on-surface-variant hover:bg-surface-container-highest rounded-lg transition-all font-label-sm text-label-sm"
        >
          <MaterialIcon name="help" className="text-[20px]" />
          Support
        </Link>
        <div className="flex items-center gap-3 px-3 py-4 mt-2">
          <div className="w-8 h-8 rounded-full bg-secondary-container flex items-center justify-center text-white font-bold text-xs">
            {initials || "P"}
          </div>
          <div className="overflow-hidden">
            <p className="font-label-md text-label-md truncate text-on-surface">{userName.trim() || "Professor"}</p>
            <p className="font-label-sm text-label-sm text-on-surface-variant truncate">Professor</p>
          </div>
        </div>
      </div>
    </aside>
  );
}

type ProfessorShellProps = {
  userName: string;
  children: React.ReactNode;
};

const FORM_PAGE_PATTERN = /^\/teacher\/simulation\/(new|[^/]+\/edit)$/;

/**
 * Layout wrapper — sidebar for dashboard pages; full-width for simulation forms.
 */
export function ProfessorShell({ userName, children }: ProfessorShellProps): React.ReactElement {
  const pathname = usePathname();
  const isFormPage = FORM_PAGE_PATTERN.test(pathname);

  if (isFormPage) {
    return <div className="min-h-screen bg-surface text-on-surface font-sans">{children}</div>;
  }

  return (
    <div className="min-h-screen bg-background text-on-surface font-sans">
      <ProfessorSidebar userName={userName} />
      <div className="flex flex-col min-h-screen md:ml-64">{children}</div>
    </div>
  );
}

type ProfessorTopBarProps = {
  userName: string;
  title?: string;
};

/**
 * Dashboard top header with logout.
 */
export function ProfessorTopBar({ userName, title }: ProfessorTopBarProps): React.ReactElement {
  const router = useRouter();

  const handleLogout = async (): Promise<void> => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <header className="bg-surface border-b border-outline-variant sticky top-0 z-30">
      <div className="flex justify-between items-center w-full px-margin-desktop py-4 max-w-container-max mx-auto">
        <div className="flex items-center gap-8 md:hidden">
          <span className="font-headline-lg text-headline-lg font-bold text-stitch-primary">PitchLab</span>
        </div>
        {title && (
          <h2 className="hidden md:block font-headline-md text-headline-md text-stitch-primary">{title}</h2>
        )}
        <div className="flex items-center gap-4 ml-auto">
          <div className="hidden sm:flex items-center gap-3 pr-4 border-r border-outline-variant">
            <div className="text-right">
              <p className="font-label-md text-label-md font-bold text-stitch-primary">{userName.trim() || "Professor"}</p>
              <p className="text-[10px] text-on-surface-variant uppercase tracking-wider">Professor</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-secondary-container flex items-center justify-center text-white font-bold text-sm border border-outline-variant">
              {userName.slice(0, 1).toUpperCase() || "P"}
            </div>
          </div>
          <button
            type="button"
            onClick={() => void handleLogout()}
            className="px-4 py-2 border border-outline text-stitch-primary font-label-md text-label-md rounded-lg hover:bg-surface-container-high transition-colors flex items-center gap-2 active:scale-95"
          >
            <MaterialIcon name="logout" className="text-[18px]" />
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}
