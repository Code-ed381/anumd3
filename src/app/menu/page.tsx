import { MenuSchedule } from "@/components/menu-schedule";
import { getBusinessName } from "@/lib/config";
import { getSerializedSchedule } from "@/lib/schedule";

export const dynamic = "force-dynamic";

export default async function MenuPage() {
  let schedule: Awaited<ReturnType<typeof getSerializedSchedule>>["schedule"] =
    [];

  if (
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    try {
      const payload = await getSerializedSchedule(undefined, 14);
      schedule = payload.schedule;
    } catch {
      schedule = [];
    }
  }

  return (
    <MenuSchedule businessName={getBusinessName()} schedule={schedule} />
  );
}
