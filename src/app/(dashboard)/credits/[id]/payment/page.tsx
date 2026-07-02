import { Suspense } from "react";
import { PageLoader } from "@/components/ui/loading";
import RecordPaymentContent from "./record-payment-content";

export default function RecordPaymentPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <RecordPaymentContent />
    </Suspense>
  );
}
