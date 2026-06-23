import { useNavigate } from "react-router-dom";
import { LockedAssetCard } from "./LockedAssetCard";

const TESLA =
  "https://upload.wikimedia.org/wikipedia/commons/b/bd/Tesla_Motors.svg";
const SPACEX =
  "https://upload.wikimedia.org/wikipedia/commons/2/2e/SpaceX_logo_black.svg";

export function LockedAssetsGrid() {
  const navigate = useNavigate();
  const go = () => navigate("/upgrade");

  return (
    <div className="mb-8 flex flex-col gap-3">
      <LockedAssetCard
        logoUrl={TESLA}
        logoAlt="Tesla"
        title="Monthly Profits"
        description="Automated equity dividends distributed directly to your authenticated wallet monthly."
        badge="Yield Distribution"
        onClick={go}
      />
      <LockedAssetCard
        logoUrl={TESLA}
        logoAlt="Tesla T"
        title="Private Meeting"
        description="Personal 1-on-1 strategy session with Elon Musk to discuss mission alignment."
        badge="CEO Direct Access"
        onClick={go}
      />
      <LockedAssetCard
        logoUrl={TESLA}
        logoAlt="Tesla"
        title="Tesla AI Day"
        description="VIP front-row passes to upcoming AI and Robotaxi reveal events at Gigafactory Texas."
        badge="Priority Access"
        onClick={go}
      />
      <LockedAssetCard
        logoUrl={SPACEX}
        logoAlt="SpaceX"
        logoHeight={12}
        title="Starbase Entry"
        description="Full mission control clearance for the next Starship orbital flight test at Boca Chica."
        badge="Operational Clearance"
        onClick={go}
      />
    </div>
  );
}
