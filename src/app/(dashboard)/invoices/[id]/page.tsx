import { Suspense } from "react";
import { PageLoader } from "@/components/ui/loading";
import ViewInvoiceContent from "./view-invoice-content";

export default function ViewInvoicePage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <ViewInvoiceContent />
    </Suspense>
  );
}
