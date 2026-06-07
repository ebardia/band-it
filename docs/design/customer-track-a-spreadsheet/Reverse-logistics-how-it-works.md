# Reverse logistics — how to read the spreadsheet

**Primary file:** [Reverse-logistics-private-warehouses.csv](./Reverse-logistics-private-warehouses.csv)  
**Reference (public auctions — not for customer):** [Reverse-logistics-home-goods.csv](./Reverse-logistics-home-goods.csv)

## What your friend means

```
Customer returns item online
        ↓
Return center / 3PL (sort & grade A/B/C)
        ↓
Premium stock → B2B buyer (truckload)     Low grade → salvage / destroy
        ↓
Sometimes visible on B-Stock / Liquidation.com / Direct Liquidation
```

That is **reverse logistics**, not store GOOB (PFP) and not random liquidation ads.

## What your friend wants vs what to skip

| Skip (public / brand liquidator) | Pursue (private warehouse tier) |
|----------------------------------|----------------------------------|
| B-Stock (Wayfair, Walmart, Target, etc.) | ReturnPro **enterprise** warehouses |
| Liquidation.com | DHL reverse logistics (ex-Inmar processing) |
| Direct Liquidation, BULQ, Liquiditys | FB Liquidation, Quicklotz own warehouses |
| Retailer “GOOB” event companies (PFP) | NXTPoint, regional 3PL return centers |
| | RLA networking + approved liquidator contracts |

Premium graded returns are often sold to **contracted buyers** before they ever appear on B-Stock. That private tier is what the new CSV targets.

## Before the meeting

1. Open **tier 1** rows for retailers he cares about — register with **reseller certificate**.
2. Ask which **tier 2** accounts he already has (Direct Liquidation, Liquidation.com).
3. Ignore rows marked **no public truckload** (IKEA, RH, Williams-Sonoma) unless he has private relationships.
4. Fill `customer_verdict` / `customer_why` — that becomes Agent Factory training data.

## Not in this sheet

- Physical store GOOB → see [Business-closings-GOOB.csv](./Business-closings-GOOB.csv)
- Generic broker comps only → [For-customer-review.csv](./For-customer-review.csv)
