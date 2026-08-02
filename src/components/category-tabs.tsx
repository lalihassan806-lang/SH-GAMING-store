import Link from "next/link";
import { cn } from "@/lib/utils";
import type { Category } from "@/lib/supabase/types";

export function CategoryTabs({
  categories,
  active
}: {
  categories: Category[];
  active?: string;
}) {
  const items = [{ slug: "all", name: "All" }, ...categories];
  return (
    <div className="flex flex-wrap items-center gap-2">
      {items.map((c) => {
        const isActive = (active ?? "all") === c.slug;
        const href = c.slug === "all" ? "/" : `/?category=${c.slug}`;
        return (
          <Link
            key={c.slug}
            href={href + "#store"}
            className={cn(
              "rounded-full border px-3 py-1 text-xs transition",
              isActive
                ? "border-primary bg-primary/15 text-primary"
                : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
            )}
          >
            {c.name}
          </Link>
        );
      })}
    </div>
  );
}
