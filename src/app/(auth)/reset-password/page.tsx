import { Suspense } from "react";
import { PageLoader } from "@/components/ui/loading";
import ResetPasswordPage from "./reset-password-content";

export default function Page() {
  return (
    <Suspense fallback={<PageLoader />}>
      <ResetPasswordPage />
    </Suspense>
  );
}
