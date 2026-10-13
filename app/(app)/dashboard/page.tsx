import type { Metadata } from "next";

import { LogoutButton } from "./logout-button";

export const metadata: Metadata = { title: "Dashboard" };

// Temporary page of task 1.1a (docs/TASKS.md 1.1a, item 4): the heading and the Keluar button, without the sidebar shell
// and without any new copy. Task 1.14 replaces it with the real dashboard.
export default function DashboardPage() {
  return (
    <>
      <h1 className="text-h1">Dashboard</h1>
      <LogoutButton />
    </>
  );
}
