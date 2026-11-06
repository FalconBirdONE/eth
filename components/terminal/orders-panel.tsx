import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatPrice } from "@/lib/example-setup";
import type { DemoOrder } from "@/lib/demo-orders";
import { Eyebrow, panel } from "./panel";

function Cell({ main, sub }: { main: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <>
      <strong className="block font-medium">{main}</strong>
      {sub && <small className="text-[11px] text-muted-foreground">{sub}</small>}
    </>
  );
}

export function OrdersPanel({ orders, onFeed }: { orders: readonly DemoOrder[]; onFeed: () => void }) {
  return (
    <section className="animate-in fade-in slide-in-from-bottom-2 duration-500" aria-labelledby="orders-heading">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <Eyebrow>Your terms, kept intact</Eyebrow>
          <h1 id="orders-heading" className="mt-1 font-sans text-3xl font-bold tracking-tight">
            My Orders <span className="font-mono text-base text-muted-foreground">{orders.length}</span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Local simulations. Creator updates never change these saved terms.
          </p>
        </div>
        <Button variant="outline" type="button" onClick={onFeed} className="rounded-sm text-[10px] tracking-[0.18em] uppercase">
          <ArrowLeft /> Back to feed
        </Button>
      </div>
      <div className={cn(panel, "overflow-hidden")}>
        <Table>
          <TableCaption className="sr-only">Simulated orders saved in this browser</TableCaption>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {["Order", "Price / output", "Size", "Order source", "Status"].map((h) => (
                <TableHead key={h} scope="col" className="h-11 px-5 text-[10px] tracking-[0.18em] text-muted-foreground uppercase">
                  {h}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => (
              <TableRow key={order.id} className="animate-in fade-in [&>td]:px-5 [&>td]:py-4">
                <TableCell>
                  <Cell
                    main={order.type === "limit" ? "Buy WETH" : "USDC → WETH"}
                    sub={`${order.origin === "bundled" ? "Bundled example" : "Your simulation"} · ${order.network}`}
                  />
                </TableCell>
                <TableCell className="tabular-nums">
                  <Cell
                    main={
                      order.type === "limit"
                        ? formatPrice(order.limitUSDCPerWETH!)
                        : formatPrice(order.expectedWETH!, 10)
                    }
                    sub={order.type === "limit" ? "USDC per WETH" : "WETH · illustrative output"}
                  />
                </TableCell>
                <TableCell className="tabular-nums">{formatPrice(order.sizeUSDC)} USDC</TableCell>
                <TableCell>
                  <Cell
                    main={`Setup ${order.setupVersion}`}
                    sub={`Creator entry: $${formatPrice(order.creatorEntryUSD)} USD`}
                  />
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="rounded-full border-success-line bg-success-soft text-success">{order.status}</Badge>
                  <small className="mt-1 block text-[11px] text-muted-foreground">Simulated</small>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <p className="mt-4 text-xs text-muted-foreground">
        The bundled 25 USDC order belongs to Setup v1. Reset demo removes your simulations and keeps this reference
        example.
      </p>
    </section>
  );
}
