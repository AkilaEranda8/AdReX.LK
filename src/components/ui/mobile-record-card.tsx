import { cn } from "@/lib/utils";

interface MobileRecordCardProps {
  children: React.ReactNode;
  className?: string;
  selected?: boolean;
}

export function MobileRecordCard({ children, className, selected }: MobileRecordCardProps) {
  return (
    <div
      data-selected={selected ? "true" : undefined}
      className={cn(
        "rounded-xl border border-border bg-card p-4 shadow-sm transition-colors",
        selected && "border-primary/30 bg-primary/5",
        className
      )}
    >
      {children}
    </div>
  );
}

interface MobileRecordRowProps {
  label: string;
  children: React.ReactNode;
  className?: string;
}

export function MobileRecordRow({ label, children, className }: MobileRecordRowProps) {
  return (
    <div className={cn("flex items-start justify-between gap-3 text-sm", className)}>
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <div className="min-w-0 text-right font-medium text-foreground">{children}</div>
    </div>
  );
}

interface MobileRecordActionsProps {
  children: React.ReactNode;
  className?: string;
}

export function MobileRecordActions({ children, className }: MobileRecordActionsProps) {
  return (
    <div className={cn("flex flex-wrap items-center justify-end gap-2 border-t border-border pt-3", className)}>
      {children}
    </div>
  );
}
