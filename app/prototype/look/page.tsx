/* PROTOTYPE — throwaway. Wayfinder ticket 06.
 *
 * Three structurally different takes on Reso, switchable with ?variant= and
 * ?screen= from the floating bar. Fixture data only; this route touches no
 * database and no server action. The winner gets rewritten properly into
 * app/g/[secret]; the losers go to a throwaway branch.
 */

import { SCREENS, VARIANTS, type Screen, type Variant } from "./fixtures";
import { PrototypeSwitcher } from "./switcher";
import { VariantA } from "./variant-a";
import { VariantB } from "./variant-b";
import { VariantC } from "./variant-c";

export default async function LookPrototype({
  searchParams,
}: {
  searchParams: Promise<{ variant?: string; screen?: string }>;
}) {
  const sp = await searchParams;
  const variant = (VARIANTS as readonly string[]).includes(sp.variant ?? "")
    ? (sp.variant as Variant)
    : "A";
  const screen = (SCREENS as readonly string[]).includes(sp.screen ?? "")
    ? (sp.screen as Screen)
    : "announced";

  return (
    <>
      {variant === "A" && <VariantA screen={screen} />}
      {variant === "B" && <VariantB screen={screen} />}
      {variant === "C" && <VariantC screen={screen} />}
      <PrototypeSwitcher variant={variant} screen={screen} />
    </>
  );
}
