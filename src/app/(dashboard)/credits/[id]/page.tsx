import { Suspense } from "react";
import { PageLoader } from "@/components/ui/loading";
import ViewCreditContent from "./view-credit-content";

export default function ViewCreditPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <ViewCreditContent />
    </Suspense>
  );
}
