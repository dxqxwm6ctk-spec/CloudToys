import { eq, asc } from "drizzle-orm";
import { db, shippingZonesTable } from "@workspace/db";

/**
 * Server-side shipping fee lookup for a governorate. Shared by the public
 * /shipping/lookup endpoint and order creation — order creation must never
 * trust a client-supplied shipping fee, so it calls this directly instead.
 */
export async function lookupShippingFee(
  governorate: string,
): Promise<{ price: number; zoneName: string } | null> {
  const normalized = governorate.toLowerCase().trim();

  const zones = await db
    .select()
    .from(shippingZonesTable)
    .orderBy(asc(shippingZonesTable.id));

  const match = zones.find((z) =>
    z.governorates
      .split(",")
      .map((g) => g.trim().toLowerCase())
      .filter(Boolean)
      .includes(normalized),
  );
  if (match) return { price: Number(match.price), zoneName: match.name };

  const defaultZone = zones.find((z) => z.isDefault);
  if (defaultZone) return { price: Number(defaultZone.price), zoneName: defaultZone.name };

  return null;
}
