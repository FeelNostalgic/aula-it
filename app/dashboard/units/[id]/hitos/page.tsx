import { redirect } from "next/navigation";

export default async function HitosRedirectPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id: unitId } = await params;
    redirect(`/dashboard/units/${unitId}/objetivos`);
}
