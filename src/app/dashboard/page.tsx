import type { Metadata } from "next";
import DashboardClient from "./DashboardClient";

export const metadata: Metadata = {
  title: "Dashboard — BillBolo",
};

export default function Page() {
  return <DashboardClient />;
}
