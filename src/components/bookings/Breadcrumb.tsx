import Link from "next/link";
import { ChevronRight } from "lucide-react";

type BreadcrumbItem = {
  label: string;
  href?: string;
};

export default function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.38em] text-white/35">
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 && <ChevronRight className="h-3 w-3 text-white/20" />}
          {item.href ? (
            <Link href={item.href} className="transition hover:text-white/65">
              {item.label}
            </Link>
          ) : (
            <span className="text-white/55">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
