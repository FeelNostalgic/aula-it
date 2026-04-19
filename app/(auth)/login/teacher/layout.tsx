import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Acceso docente",
};

export default function TeacherLoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
