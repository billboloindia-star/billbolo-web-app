import type { Metadata } from "next";
import ProfileClient from "./ProfileClient";

export const metadata: Metadata = {
  title: "Profile — BillBolo",
};

export default function Page() {
  return <ProfileClient />;
}
