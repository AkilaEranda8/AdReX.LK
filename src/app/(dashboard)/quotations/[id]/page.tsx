import { Suspense } from "react";
import { PageLoader } from "@/components/ui/loading";
import ViewQuotationContent from "./view-quotation-content";

export default function ViewQuotationPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <ViewQuotationContent />
    </Suspense>
  );
}
