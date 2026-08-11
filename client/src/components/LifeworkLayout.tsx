import { PHNav } from "@/components/PHNav";

interface LifeworkLayoutProps {
  children: React.ReactNode;
}

/**
 * Wrapper for all Lifework app pages.
 * Adds the Pennington Hennessy top navigation so users can always
 * navigate back to the main site, above the page's own sticky header.
 */
export function LifeworkLayout({ children }: LifeworkLayoutProps) {
  const isStandaloneDomain = isStandaloneLifeworkDomain();

  return (
    <div className="min-h-screen flex flex-col">
      {!isStandaloneDomain && <PHNav />}
      <div className="flex-1">{children}</div>
    </div>
  );
}
import { isStandaloneLifeworkDomain } from "@/lib/lifeworkDomain";
