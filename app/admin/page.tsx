import { redirect } from "next/navigation";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Administración",
};

export default function AdminPage() {
  redirect("/admin/teachers");
}
