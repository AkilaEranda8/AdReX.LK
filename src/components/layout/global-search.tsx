"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import api from "@/lib/api";

interface SearchResults {
  clients: { id: string; clientId: string; name: string }[];
  invoices: { id: string; invoiceNumber: string; client: { name: string } }[];
  quotations: { id: string; quotationNumber: string; client: { name: string } }[];
}

export function GlobalSearch() {
  const pathname = usePathname();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (query.length < 2) {
      setResults(null);
      return;
    }
    const t = setTimeout(() => {
      api.get(`/search?q=${encodeURIComponent(query)}`).then((res) => {
        setResults(res.data);
        setOpen(true);
      });
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    setOpen(false);
    setQuery("");
    setResults(null);
  }, [pathname]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        ref.current?.querySelector("input")?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const hasResults =
    results &&
    (results.clients.length > 0 || results.invoices.length > 0 || results.quotations.length > 0);

  return (
    <div ref={ref} className="relative mx-auto w-full max-w-3xl">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground sm:left-4" />
      <Input
        placeholder="Search clients, invoices, quotations..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => query.length >= 2 && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 200)}
        className="h-10 w-full rounded-xl border-border bg-muted/60 pl-9 pr-3 text-sm text-foreground shadow-inner transition-all placeholder:text-muted-foreground focus-visible:bg-card focus-visible:ring-ring/30 sm:h-11 sm:rounded-2xl sm:pl-11 sm:pr-20"
      />
      <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 items-center gap-0.5 rounded-lg border border-border bg-card px-2 py-1 text-[10px] font-medium text-muted-foreground shadow-sm lg:inline-flex">
        ⌘ K
      </kbd>

      {open && hasResults && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-80 overflow-y-auto rounded-xl border border-border bg-card p-2 text-foreground shadow-lg">
          {results!.clients.length > 0 && (
            <div className="mb-2">
              <p className="px-2 py-1 text-xs font-semibold text-muted-foreground">Clients</p>
              {results!.clients.map((c) => (
                <Link
                  key={c.id}
                  href={`/clients/${c.id}/edit`}
                  prefetch={false}
                  className="block rounded-lg px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
                >
                  {c.name} <span className="text-muted-foreground">({c.clientId})</span>
                </Link>
              ))}
            </div>
          )}
          {results!.invoices.length > 0 && (
            <div className="mb-2">
              <p className="px-2 py-1 text-xs font-semibold text-muted-foreground">Invoices</p>
              {results!.invoices.map((i) => (
                <Link
                  key={i.id}
                  href={`/invoices/${i.id}`}
                  prefetch={false}
                  className="block rounded-lg px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
                >
                  {i.invoiceNumber} · {i.client.name}
                </Link>
              ))}
            </div>
          )}
          {results!.quotations.length > 0 && (
            <div>
              <p className="px-2 py-1 text-xs font-semibold text-muted-foreground">Quotations</p>
              {results!.quotations.map((q) => (
                <Link
                  key={q.id}
                  href={`/quotations/${q.id}`}
                  prefetch={false}
                  className="block rounded-lg px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
                >
                  {q.quotationNumber} · {q.client.name}
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
