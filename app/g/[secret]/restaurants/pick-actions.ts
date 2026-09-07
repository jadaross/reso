"use server";

import { inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { getDb } from "@/lib/db";
import { picks, type PriceTier } from "@/lib/db/schema";
import { currentMember } from "@/lib/identity/guard";
import { isFetchableUrl } from "@/lib/maps/parse";
import { resolvePlaceLink } from "@/lib/maps/resolve";

const TIERS: PriceTier[] = ["low", "medium", "high"];

export type AddResult = { ok: true; note?: string } | { ok: false; error: string };

/**
 * Add a Pick.
 *
 * Two people adding the same restaurant make two Picks and are never merged: that
 * is the whole voting mechanism. Two tickets in the Draw is what "we both want to
 * go here" means.
 *
 * A link is a bonus, never a requirement. Whatever the parse yields is stored
 * alongside the typed name, and a link that cannot be read is kept verbatim so it
 * can be retried later rather than thrown away.
 */
export async function addPick(formData: FormData): Promise<AddResult> {
  const member = await currentMember();
  if (!member) return { ok: false, error: "Pick your name first." };

  const secret = String(formData.get("secret") ?? "");
  const typed = String(formData.get("name") ?? "").trim();
  const link = String(formData.get("link") ?? "").trim();
  const tier = String(formData.get("tier") ?? "");

  if (!TIERS.includes(tier as PriceTier)) {
    return { ok: false, error: "Pick cheap, middling or expensive." };
  }
  if (!typed && !link) {
    return { ok: false, error: "Give it a name, or paste a link." };
  }

  const parsed = link && isFetchableUrl(link) ? await resolvePlaceLink(link) : null;

  const name = typed || parsed?.name;
  if (!name) {
    return {
      ok: false,
      error: "That link gave us nothing to go on. Type the name as well.",
    };
  }

  await getDb()
    .insert(picks)
    .values({
      memberId: member.id,
      name,
      tier: tier as PriceTier,
      rawLink: link || null,
      linkSource: parsed?.source ?? "unknown",
      linkStatus: !link ? "none" : parsed ? "resolved" : "unresolved",
      resolvedName: parsed?.name ?? null,
      address: parsed?.address ?? null,
      lat: parsed?.lat ?? null,
      lng: parsed?.lng ?? null,
      externalPlaceId: parsed?.externalPlaceId ?? null,
    });

  revalidatePath(`/g/${secret}/restaurants`);

  if (link && !parsed) {
    return { ok: true, note: "We couldn't read that link, so we kept your name." };
  }
  if (parsed && !parsed.address) {
    return { ok: true, note: "Google links don't carry an address. You can add one." };
  }
  return { ok: true };
}

/**
 * Anyone can correct anyone's tier: one person's guess should not be permanent.
 *
 * Takes every Pick for the restaurant, not one, because the list shows a place once
 * however many people added it, and moving only half of them to another tier would
 * split the same restaurant across two sections.
 */
export async function setTier(
  secret: string,
  pickIds: string[],
  tier: PriceTier,
): Promise<void> {
  const member = await currentMember();
  if (!member || !TIERS.includes(tier) || pickIds.length === 0) return;

  await getDb().update(picks).set({ tier }).where(inArray(picks.id, pickIds));
  revalidatePath(`/g/${secret}/restaurants`);
}

/** Fill in an address a Google link never carried. Also anyone's to do. */
export async function setAddress(
  secret: string,
  pickIds: string[],
  address: string,
): Promise<void> {
  const member = await currentMember();
  if (!member || pickIds.length === 0) return;

  const trimmed = address.trim();
  await getDb()
    .update(picks)
    .set({ address: trimmed || null })
    .where(inArray(picks.id, pickIds));
  revalidatePath(`/g/${secret}/restaurants`);
}
