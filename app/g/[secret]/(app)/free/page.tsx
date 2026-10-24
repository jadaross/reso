import { redirect } from "next/navigation";

/** Folded into the Dates tab. Kept so an old bookmark still lands somewhere. */
export default async function Moved({
  params,
}: {
  params: Promise<{ secret: string }>;
}) {
  const { secret } = await params;
  redirect(`/g/${secret}/dates`);
}
