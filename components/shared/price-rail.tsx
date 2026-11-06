import { cn } from "@/lib/utils";
import { exampleSetup as setup, formatPrice } from "@/lib/example-setup";

// Rail spans revisedEntry-50 … originalEntry+50 in 4 evenly spaced labels.
const pos = (price: number) =>
  `${((price - (setup.revisedEntry - 50)) / (setup.originalEntry - setup.revisedEntry + 100)) * 100}%`;

export function PriceRail({
  updated,
  explicitUnits = false,
}: {
  updated: boolean;
  explicitUnits?: boolean;
}) {
  const creatorEntry = updated ? setup.revisedEntry : setup.originalEntry;
  return (
    <div
      className="relative mx-2 h-52 tabular-nums select-none"
      role="img"
      aria-label={`Illustration: creator entry ${creatorEntry} dollars. Follower example limit order stays at ${setup.followerPrice} USDC per WETH. Not a live price chart or currency conversion.`}
    >
      {/* axis + ticks */}
      <div className="absolute top-[44%] h-px w-full bg-gradient-to-r from-transparent via-foreground/30 to-transparent" />
      <div className="absolute top-[44%] flex w-full justify-between">
        {Array.from({ length: 41 }, (_, i) => (
          <span
            key={i}
            className={cn("w-px", i % 5 === 0 ? "h-3 bg-foreground/30" : "h-1.5 bg-foreground/10")}
          />
        ))}
      </div>
      <div className="absolute top-[calc(44%+20px)] flex w-full justify-between font-mono text-[10px] text-muted-foreground">
        {[setup.revisedEntry - 50, setup.revisedEntry, setup.originalEntry, setup.originalEntry + 50].map(
          (price) => (
            <span key={price}>${formatPrice(price)}</span>
          ),
        )}
      </div>

      {/* previous creator entry, ghosted */}
      <div
        aria-hidden="true"
        className={cn(
          "absolute top-9 flex h-[calc(44%-36px)] w-px flex-col items-center text-[10px] text-muted-foreground transition-opacity duration-300",
          updated ? "opacity-60" : "opacity-0",
        )}
        style={{ left: pos(setup.originalEntry) }}
      >
        <span className="line-through">${formatPrice(setup.originalEntry)}</span>
        <i className="mt-1.5 flex-1 border-l border-dashed border-muted-foreground" />
      </div>

      {/* creator marker */}
      <div
        className="absolute top-2 z-10 flex h-[calc(44%-8px)] w-px flex-col items-center transition-[left] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]"
        style={{ left: pos(creatorEntry) }}
      >
        <div className="text-center whitespace-nowrap">
          <span className="block text-[10px] text-violet">
            Creator’s entry{explicitUnits && " (USD)"}
          </span>
          <strong className="text-xl font-semibold tracking-tight">
            ${formatPrice(creatorEntry)}
          </strong>
        </div>
        <span className="mt-1.5 w-px flex-1 bg-gradient-to-b from-violet/0 to-violet" />
        <span className="-mb-1 size-2 rounded-full bg-violet" />
      </div>

      {/* follower marker */}
      <div
        className="absolute top-[calc(44%-4px)] z-20 flex w-px flex-col items-center"
        style={{ left: pos(setup.followerPrice) }}
      >
        <span className="size-2 rounded-full bg-primary" />
        <span className="h-9 w-px bg-gradient-to-b from-primary to-primary/0" />
        <div className="mt-1 text-center whitespace-nowrap text-primary">
          <span className="flex items-center justify-center gap-1.5 text-[10px]">
            {explicitUnits ? "Your example order" : "Your signed order"}
            <b className="rounded border border-primary/40 px-1 py-px text-[9px] font-medium">
              {setup.status}
            </b>
          </span>
          <strong className="text-xl font-semibold tracking-tight">
            {formatPrice(setup.followerPrice)}{" "}
            <small className="text-[10px] font-normal text-primary/70">
              {setup.quoteAsset} / {setup.orderAsset}
            </small>
          </strong>
        </div>
      </div>
    </div>
  );
}
