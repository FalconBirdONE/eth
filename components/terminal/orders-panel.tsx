import { formatPrice } from "@/lib/example-setup";
import type { DemoOrder } from "@/lib/demo-orders";
export function OrdersPanel({
  orders,
  onFeed,
}: {
  orders: readonly DemoOrder[];
  onFeed: () => void;
}) {
  return (
    <section className="orders-panel" aria-labelledby="orders-heading">
      <div className="orders-heading">
        <div>
          <span className="t-eyebrow">Your terms, kept intact</span>
          <h1 id="orders-heading">
            My Orders <span>{orders.length}</span>
          </h1>
          <p>
            Local simulations. Creator updates never change these saved terms.
          </p>
        </div>
        <button className="button t-secondary" type="button" onClick={onFeed}>
          Back to feed
        </button>
      </div>
      <div className="orders-table-wrap">
        <table className="orders-table">
          <caption className="sr-only">
            Simulated orders saved in this browser
          </caption>
          <thead>
            <tr>
              <th scope="col">Order</th>
              <th scope="col">Price / output</th>
              <th scope="col">Size</th>
              <th scope="col">Order source</th>
              <th scope="col">Status</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id}>
                <td>
                  <strong>
                    {order.type === "limit" ? "Buy WETH" : "USDC → WETH"}
                  </strong>
                  <small>
                    {order.origin === "bundled"
                      ? "Bundled example"
                      : "Your simulation"}{" "}
                    · {order.network}
                  </small>
                </td>
                <td>
                  <strong>
                    {order.type === "limit"
                      ? formatPrice(order.limitUSDCPerWETH!)
                      : formatPrice(order.expectedWETH!, 10)}
                  </strong>
                  <small>
                    {order.type === "limit"
                      ? "USDC per WETH"
                      : "WETH · illustrative output"}
                  </small>
                </td>
                <td>{formatPrice(order.sizeUSDC)} USDC</td>
                <td>
                  <strong>Setup {order.setupVersion}</strong>
                  <small>
                    Creator entry: ${formatPrice(order.creatorEntryUSD)} USD
                  </small>
                </td>
                <td>
                  <span className="t-badge badge-blue">{order.status}</span>
                  <small>Simulated</small>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="orders-note">
        The bundled 25 USDC order belongs to Setup v1. Reset demo removes your
        simulations and keeps this reference example.
      </p>
    </section>
  );
}
