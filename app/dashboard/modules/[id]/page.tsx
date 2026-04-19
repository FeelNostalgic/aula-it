import { redirect } from "next/navigation";

interface ModulePageProps {
    params: Promise<{ id: string }>;
}

export default async function ModulePage({ params }: ModulePageProps) {
    const { id } = await params;
    redirect(`/dashboard/modules/${id}/dashboard`);
}
