import type { Metadata } from "next";
import LoginClient from "./LoginClient";

export const metadata: Metadata = {
  title: "Log in — BillBolo",
};

export default function Page() {
  return <LoginClient />;
}
