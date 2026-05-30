import { DashboardTopbar } from "@/components/dashboard/topbar";
import { MarketplaceList } from "@/components/dashboard/marketplace-list";

export default function MarketplacePage() {
  return (
    <div className="space-y-6">
      <DashboardTopbar
        title="Marketplace"
        description="Discover private-by-default services that agents can evaluate and purchase through confidential settlement flows."
      />
      <MarketplaceList />
    </div>
  );
}
