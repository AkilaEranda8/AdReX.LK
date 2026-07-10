import { cn } from "@/lib/utils";

interface TableScrollProps {
  children: React.ReactNode;
  className?: string;
}

/** Horizontal scroll wrapper for wide data tables on small screens. */
export function TableScroll({ children, className }: TableScrollProps) {
  return (
    <div className={cn("table-scroll-shadow overflow-x-touch", className)}>
      {children}
    </div>
  );
}
