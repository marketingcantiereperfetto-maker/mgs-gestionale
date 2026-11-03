"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { isActiveSection, type NavSection } from "@/lib/navigation";
import { signOut } from "@/server/auth/actions";

export type TopBarUser = { name: string; initials: string; roleLabel: string };

const focusRing = "outline-none focus-visible:ring-2 focus-visible:ring-action";
const itemClass = `block w-full rounded-md px-3 py-1.5 text-left text-[14px] text-ink hover:bg-action hover:text-white focus:bg-action focus:text-white ${focusRing}`;

function triggers(from: HTMLElement): HTMLElement[] {
  const bar = from.closest("[data-menubar]");
  return bar ? Array.from(bar.querySelectorAll<HTMLElement>("[data-menubar-trigger]")) : [];
}

function panelItems(panel: HTMLElement | null): HTMLElement[] {
  return panel ? Array.from(panel.querySelectorAll<HTMLElement>("a[href], button")) : [];
}

type DropdownProps = {
  id: string;
  label: ReactNode;
  ariaLabel?: string;
  active?: boolean;
  align?: "left" | "right";
  openId: string | null;
  setOpenId: (id: string | null) => void;
  children: ReactNode;
};

// Tendina della barra: si apre con clic o frecce, si chiude con Esc o fuori; le frecce
// sinistra/destra passano alla voce accanto, come nella barra dei menu Apple.
function Dropdown({
  id,
  label,
  ariaLabel,
  active,
  align,
  openId,
  setOpenId,
  children,
}: DropdownProps) {
  const panelId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const isOpen = openId === id;

  function focusItem(index: "first" | "last") {
    requestAnimationFrame(() => {
      const items = panelItems(panelRef.current);
      items[index === "first" ? 0 : items.length - 1]?.focus();
    });
  }

  function moveToSibling(step: number) {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const all = triggers(trigger);
    const next = all[(all.indexOf(trigger) + step + all.length) % all.length];
    next?.focus();
    if (isOpen) setOpenId(next?.dataset.menubarTrigger ?? null);
  }

  function onTriggerKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setOpenId(id);
      focusItem(event.key === "ArrowDown" ? "first" : "last");
    } else if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
      event.preventDefault();
      moveToSibling(event.key === "ArrowRight" ? 1 : -1);
    } else if (event.key === "Escape") {
      setOpenId(null);
    }
  }

  function onPanelKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const items = panelItems(panelRef.current);
    const index = items.indexOf(document.activeElement as HTMLElement);
    const go = (target: number) => {
      event.preventDefault();
      items[(target + items.length) % items.length]?.focus();
    };
    if (event.key === "ArrowDown") go(index + 1);
    else if (event.key === "ArrowUp") go(index - 1);
    else if (event.key === "Home") go(0);
    else if (event.key === "End") go(items.length - 1);
    else if (event.key === "Escape") {
      event.preventDefault();
      setOpenId(null);
      triggerRef.current?.focus();
    } else if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
      event.preventDefault();
      moveToSibling(event.key === "ArrowRight" ? 1 : -1);
    } else if (event.key === "Tab") {
      setOpenId(null);
    }
  }

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        data-menubar-trigger={id}
        aria-expanded={isOpen}
        aria-controls={panelId}
        aria-label={ariaLabel}
        onClick={() => setOpenId(isOpen ? null : id)}
        onMouseEnter={() => openId !== null && openId !== id && setOpenId(id)}
        onKeyDown={onTriggerKeyDown}
        className={`flex h-[30px] items-center gap-1 rounded-md px-2.5 text-[14px] text-ink transition-colors hover:bg-hover ${
          active ? "font-semibold" : ""
        } ${isOpen ? "bg-hover" : ""} ${focusRing}`}
      >
        {label}
      </button>
      <div
        ref={panelRef}
        id={panelId}
        hidden={!isOpen}
        onKeyDown={onPanelKeyDown}
        className={`absolute top-full mt-1 min-w-[250px] rounded-xl border border-line/60 bg-card p-1 shadow-[0_8px_30px_rgba(0,0,0,.12)] ${
          align === "right" ? "right-0" : "left-0"
        }`}
      >
        {children}
      </div>
    </div>
  );
}

function SectionLinks({
  section,
  pathname,
  onNavigate,
}: {
  section: NavSection;
  pathname: string;
  onNavigate: () => void;
}) {
  return (section.groups ?? []).map((group, index) => (
    <ul key={index} className={index > 0 ? "mt-1 border-t border-line/70 pt-1" : ""}>
      {group.map((page) => (
        <li key={page.href}>
          <Link
            href={page.href}
            aria-current={pathname === page.href ? "page" : undefined}
            onClick={onNavigate}
            className={`${itemClass} ${pathname === page.href ? "font-semibold" : ""}`}
          >
            {page.label}
          </Link>
        </li>
      ))}
    </ul>
  ));
}

function SearchForm({ className }: { className: string }) {
  return (
    <form action="/cerca" method="get" role="search" className={className}>
      <input
        type="search"
        name="q"
        aria-label="Cerca"
        placeholder="Cerca"
        className={`h-[30px] w-full rounded-full border border-line bg-card px-3 text-[13px] text-ink placeholder:text-ink-muted ${focusRing}`}
      />
    </form>
  );
}

export function TopBar({ sections, user }: { sections: NavSection[]; user: TopBarUser }) {
  const pathname = usePathname();
  const [openId, setOpenId] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const barRef = useRef<HTMLElement>(null);
  const close = () => {
    setOpenId(null);
    setMobileOpen(false);
  };

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (!barRef.current?.contains(event.target as Node)) {
        setOpenId(null);
        setMobileOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  return (
    <header
      ref={barRef}
      className="fixed inset-x-0 top-0 z-40 border-b border-bar-line bg-bar backdrop-blur"
    >
      <nav aria-label="Menu principale" className="flex h-[46px] items-center gap-1 px-4">
        <Link
          href="/"
          onClick={close}
          className={`mr-3 rounded-md text-[15px] font-semibold ${focusRing}`}
        >
          MGS Group
        </Link>

        <div data-menubar className="hidden items-center gap-0.5 lg:flex">
          {sections.map((section) => {
            const active = isActiveSection(section, pathname);
            if (section.page) {
              return (
                <Link
                  key={section.base}
                  href={section.page.href}
                  data-menubar-trigger={section.base}
                  aria-current={pathname === section.page.href ? "page" : undefined}
                  onClick={close}
                  onKeyDown={(event) => {
                    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
                    event.preventDefault();
                    const all = triggers(event.currentTarget);
                    const step = event.key === "ArrowRight" ? 1 : -1;
                    all[
                      (all.indexOf(event.currentTarget) + step + all.length) % all.length
                    ]?.focus();
                  }}
                  className={`flex h-[30px] items-center rounded-md px-2.5 text-[14px] text-ink transition-colors hover:bg-hover ${
                    active ? "font-semibold" : ""
                  } ${focusRing}`}
                >
                  {section.label}
                </Link>
              );
            }
            return (
              <Dropdown
                key={section.base}
                id={section.base}
                label={section.label}
                active={active}
                openId={openId}
                setOpenId={setOpenId}
              >
                <SectionLinks section={section} pathname={pathname} onNavigate={close} />
              </Dropdown>
            );
          })}
        </div>

        <div className="ml-auto flex items-center gap-3">
          <SearchForm className="hidden w-[240px] md:block" />
          <div data-menubar>
            <Dropdown
              id="utente"
              label={
                <span className="flex size-[26px] items-center justify-center rounded-full bg-ink-muted text-[12px] font-semibold text-white">
                  {user.initials}
                </span>
              }
              ariaLabel={`Menu utente: ${user.name}`}
              align="right"
              openId={openId}
              setOpenId={setOpenId}
            >
              <div className="px-3 py-1.5">
                <p className="font-medium text-ink">{user.name}</p>
                <p className="text-[13px] text-ink-muted">{user.roleLabel}</p>
              </div>
              <div className="mt-1 border-t border-line/70 pt-1">
                <Link
                  href="/profilo"
                  onClick={close}
                  aria-current={pathname === "/profilo" ? "page" : undefined}
                  className={itemClass}
                >
                  Il mio profilo
                </Link>
              </div>
              <form action={signOut} className="mt-1 border-t border-line/70 pt-1">
                <button type="submit" className={itemClass}>
                  Esci
                </button>
              </form>
            </Dropdown>
          </div>
          <button
            type="button"
            aria-expanded={mobileOpen}
            aria-controls="menu-compatto"
            onClick={() => setMobileOpen(!mobileOpen)}
            onKeyDown={(event) => event.key === "Escape" && setMobileOpen(false)}
            className={`rounded-md px-2.5 py-1 text-[14px] font-medium text-ink hover:bg-hover lg:hidden ${focusRing}`}
          >
            Menu
          </button>
        </div>
      </nav>

      <div
        id="menu-compatto"
        hidden={!mobileOpen}
        onKeyDown={(event) => event.key === "Escape" && setMobileOpen(false)}
        className="max-h-[calc(100vh-46px)] overflow-y-auto border-t border-bar-line bg-card px-4 pb-4 lg:hidden"
      >
        <SearchForm className="mt-3 md:hidden" />
        {sections.map((section) =>
          section.page ? (
            <Link
              key={section.base}
              href={section.page.href}
              onClick={close}
              className={`${itemClass} mt-2 font-semibold`}
            >
              {section.label}
            </Link>
          ) : (
            <div key={section.base} className="mt-3">
              <p className="px-3 text-[13px] font-semibold text-ink-muted">{section.label}</p>
              <SectionLinks section={section} pathname={pathname} onNavigate={close} />
            </div>
          ),
        )}
      </div>
    </header>
  );
}
