import { exampleSetup as setup, formatPrice } from "@/lib/example-setup";

export function PriceRail({
  updated,
  explicitUnits = false,
}: {
  updated: boolean;
  explicitUnits?: boolean;
}) {
  return (
    <div
      className={`price-rail ${updated ? "is-updated" : ""}`}
      role="img"
      aria-label={`Illustration: creator entry ${updated ? setup.revisedEntry : setup.originalEntry} dollars. Follower example limit order stays at ${setup.followerPrice} USDC per WETH. Not a live price chart or currency conversion.`}
    >
      <div className="rail-axis" />
      <div className="rail-ticks">
        {Array.from({ length: 41 }, (_, i) => (
          <span key={i} className={i % 5 === 0 ? "major-tick" : ""} />
        ))}
      </div>
      <div className="rail-values">
        {[
          setup.revisedEntry - 50,
          setup.revisedEntry,
          setup.originalEntry,
          setup.originalEntry + 50,
        ].map((price) => (
          <span key={price}>${formatPrice(price)}</span>
        ))}
      </div>
      <div className="creator-marker">
        <div className="marker-label">
          <span>Creator’s entry{explicitUnits && " (USD)"}</span>
          <strong>
            ${formatPrice(updated ? setup.revisedEntry : setup.originalEntry)}
          </strong>
        </div>
        <span className="marker-stem" />
        <span className="marker-node" />
      </div>
      <div
        className={`old-marker ${updated ? "visible" : ""}`}
        aria-hidden="true"
      >
        <span>${formatPrice(setup.originalEntry)}</span>
        <i />
      </div>
      <div className="follower-marker">
        <span className="marker-node" />
        <span className="marker-stem" />
        <div className="marker-label">
          <span>
            {explicitUnits ? "Your example order" : "Your signed order"}{" "}
            <b>{setup.status}</b>
          </span>
          <strong>
            {formatPrice(setup.followerPrice)}{" "}
            <small>
              {setup.quoteAsset} / {setup.orderAsset}
            </small>
          </strong>
        </div>
      </div>
    </div>
  );
}
