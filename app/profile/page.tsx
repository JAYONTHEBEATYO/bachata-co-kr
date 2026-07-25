import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AppNavigation } from "@/components/AppNavigation";
import { ProfileEditor } from "@/components/ProfileEditor";
import { Sidebar } from "@/components/Sidebar";
import { getCurrentSessionUser } from "@/lib/auth-server";
import { getCommunities } from "@/lib/data";

export const metadata: Metadata = {
  title: "내 프로필",
  robots: { index: false, follow: true }
};

export default async function ProfilePage({
  searchParams
}: {
  searchParams: Promise<{ welcome?: string }>;
}) {
  const user = await getCurrentSessionUser();
  if (!user) redirect("/login?next=%2Fprofile");
  const params = await searchParams;
  const communities = await getCommunities();

  return (
    <main className="app-shell">
      <div className="app-grid">
        <AppNavigation communities={communities} />
        <ProfileEditor initialUser={user} welcome={params.welcome === "1"} />
        <Sidebar communities={communities} />
      </div>
    </main>
  );
}
