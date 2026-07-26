import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminDashboard } from "@/components/AdminDashboard";
import { getCurrentSessionUser } from "@/lib/auth-server";

export const metadata: Metadata = {
  title: "관리자",
  robots: { index: false, follow: false }
};

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await getCurrentSessionUser();
  if (!user) redirect("/login?next=%2Fadmin");
  if (user.role !== "admin") redirect("/");

  return <AdminDashboard user={user} />;
}
