"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/lib/cart";
import { formatMoney, formatMiles } from "@/lib/format";
import { DELIVERY_WINDOWS, type DeliveryWindow, type FulfillmentKind } from "@/lib/types";
import { DELIVERY_MIN_SUBTOTAL_CENTS } from "@/lib/delivery";

interface Quote {
  available: boolean;
  miles: number | null;
  feeCents: number;
  reason?: string;
}

export default function CheckoutPage() {
  const router = useRouter();
  const lines = useCart((s) => s.lines);
  const subtotal = useCart((s) => s.subtotalCents());

  const [fulfillment, setFulfillment] = useState<FulfillmentKind>("delivery");
  const [address1, setAddress1] = useState("");
  const [address2, setAddress2] = useState("");
  const [city, setCity] = useState("");
  const [stateCode, setStateCode] = useState("TX");
  const [postal, setPostal] = useState("");
  const [windowChoice, setWindowChoice] = useState<DeliveryWindow>(DELIVERY_WINDOWS[0]);
  const [note, setNote] = useState("");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteBusy, setQuoteBusy] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const fullAddress = useMemo(() => {
    const parts = [address1, address2, city, stateCode, postal].map((s) => s.trim()).filter(Boolean);
    return parts.join(", ");
  }, [address1, address2, city, stateCode, postal]);

  // Debounce delivery quote when address changes
  useEffect(() => {
    if (fulfillment !== "delivery") {
      setQuote(null);
      setQuoteError(null);
      return;
    }
    if (!address1 || !city || !postal) {
      setQuote(null);
      setQuoteError(null);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setQuoteBusy(true);
      setQuoteError(null);
      try {
        const res = await fetch("/api/checkout/delivery-quote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ address: fullAddress }),
          signal: ctrl.signal
        });
        const json = (await res.json()) as Quote;
        setQuote(json);
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setQuoteError("Could not get a delivery quote. Try again.");
      } finally {
        setQuoteBusy(false);
      }
    }, 500);
    return () => {
      ctrl.abort();
      clearTimeout(t);
    };
  }, [fulfillment, address1, city, postal, fullAddress]);

  if (lines.length === 0) {
    return (
      <div>
        <h1 className="text-2xl font-semibold mb-4">Checkout</h1>
        <div className="card p-6 text-sm text-ink-600">Your cart is empty.</div>
      </div>
    );
  }

  const isDelivery = fulfillment === "delivery";
  const feeCents = isDelivery && quote?.available ? quote.feeCents : 0;
  const total = subtotal + feeCents;

  const belowMin = isDelivery && subtotal < DELIVERY_MIN_SUBTOTAL_CENTS;
  const deliveryReady =
    !isDelivery ||
    (!!quote && quote.available && !belowMin && !!address1 && !!city && !!postal && !!windowChoice);

  async function placeOrder() {
    setSubmitError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/checkout/create-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lines,
          fulfillment,
          delivery: isDelivery
            ? {
                address_line1: address1,
                address_line2: address2 || null,
                city,
                state: stateCode,
                postal_code: postal,
                window: windowChoice
              }
            : null,
          customer_note: note || null
        })
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? `Request failed (${res.status})`);
      }
      const json = (await res.json()) as { url?: string; orderId?: string };
      if (json.url) {
        window.location.href = json.url;
        return;
      }
      if (json.orderId) {
        router.replace(`/order/${json.orderId}`);
        return;
      }
      throw new Error("Unexpected server response.");
    } catch (err) {
      setSubmitError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Checkout</h1>

      <section className="card p-4">
        <h2 className="font-medium mb-3">Fulfillment</h2>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setFulfillment("delivery")}
            className={isDelivery ? "btn-primary" : "btn-secondary"}
          >
            Delivery
          </button>
          <button
            type="button"
            onClick={() => setFulfillment("pickup")}
            className={!isDelivery ? "btn-primary" : "btn-secondary"}
          >
            Local pickup
          </button>
        </div>

        {isDelivery && (
          <div className="mt-4 space-y-3">
            <div>
              <label className="label" htmlFor="a1">Address</label>
              <input id="a1" className="input" value={address1} onChange={(e) => setAddress1(e.target.value)} required />
            </div>
            <div>
              <label className="label" htmlFor="a2">Apt / Unit (optional)</label>
              <input id="a2" className="input" value={address2} onChange={(e) => setAddress2(e.target.value)} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="label" htmlFor="city">City</label>
                <input id="city" className="input" value={city} onChange={(e) => setCity(e.target.value)} required />
              </div>
              <div>
                <label className="label" htmlFor="state">State</label>
                <input id="state" className="input" value={stateCode} onChange={(e) => setStateCode(e.target.value)} required />
              </div>
            </div>
            <div>
              <label className="label" htmlFor="zip">ZIP</label>
              <input id="zip" className="input" value={postal} onChange={(e) => setPostal(e.target.value)} required />
            </div>
            <div>
              <label className="label" htmlFor="win">Delivery window</label>
              <select id="win" className="input" value={windowChoice} onChange={(e) => setWindowChoice(e.target.value as DeliveryWindow)}>
                {DELIVERY_WINDOWS.map((w) => <option key={w}>{w}</option>)}
              </select>
            </div>

            <div className="rounded-md bg-ink-100 p-3 text-sm">
              {quoteBusy && <span className="text-ink-600">Calculating distance…</span>}
              {!quoteBusy && quoteError && <span className="text-red-600">{quoteError}</span>}
              {!quoteBusy && !quoteError && quote && quote.available && (
                <div className="flex items-center justify-between">
                  <span className="text-ink-700">Distance: {formatMiles(quote.miles)}</span>
                  <span className="font-medium tabular-nums">Delivery fee: {formatMoney(quote.feeCents)}</span>
                </div>
              )}
              {!quoteBusy && !quoteError && quote && !quote.available && (
                <span className="text-red-600">{quote.reason ?? "Delivery unavailable to this address."}</span>
              )}
              {!quoteBusy && !quoteError && !quote && (
                <span className="text-ink-500">Enter your address to see the delivery fee.</span>
              )}
            </div>

            {belowMin && (
              <p className="text-sm text-red-600">
                Delivery has a {formatMoney(DELIVERY_MIN_SUBTOTAL_CENTS)} minimum. Add{" "}
                {formatMoney(DELIVERY_MIN_SUBTOTAL_CENTS - subtotal)} more, or switch to local pickup.
              </p>
            )}
          </div>
        )}

        {!isDelivery && (
          <p className="mt-4 text-sm text-ink-600">
            Local pickup is free with no order minimum. Pickup details will be sent after your order is confirmed.
          </p>
        )}
      </section>

      <section className="card p-4">
        <h2 className="font-medium mb-3">Order note (optional)</h2>
        <textarea
          className="input min-h-[80px]"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Anything we should know?"
        />
      </section>

      <section className="card p-4">
        <h2 className="font-medium mb-3">Order summary</h2>
        <ul className="text-sm space-y-1">
          {lines.map((l) => (
            <li key={`${l.product_id}-${l.size}`} className="flex justify-between">
              <span>{l.product_name} · {l.size} × {l.quantity}</span>
              <span className="tabular-nums">{formatMoney(l.unit_price_cents * l.quantity)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-3 border-t border-ink-200 pt-3 space-y-1 text-sm">
          <div className="flex justify-between"><span>Subtotal</span><span className="tabular-nums">{formatMoney(subtotal)}</span></div>
          <div className="flex justify-between"><span>{isDelivery ? "Delivery" : "Pickup"}</span><span className="tabular-nums">{formatMoney(feeCents)}</span></div>
          <div className="flex justify-between text-base font-semibold pt-1"><span>Total</span><span className="tabular-nums">{formatMoney(total)}</span></div>
        </div>
        <p className="mt-3 text-xs text-ink-500">
          Card billed as {process.env.NEXT_PUBLIC_BILLING_DESCRIPTOR ?? "LDC"}. Plain packaging on every shipment.
        </p>
      </section>

      {submitError && <p className="text-sm text-red-600">{submitError}</p>}

      <div className="flex justify-end">
        <button onClick={placeOrder} className="btn-primary" disabled={!deliveryReady || submitting}>
          {submitting ? "Redirecting…" : "Pay with card"}
        </button>
      </div>
    </div>
  );
}
