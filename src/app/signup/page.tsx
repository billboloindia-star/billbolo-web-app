import type { Metadata } from "next";
import SignupClient from "./SignupClient";

export const metadata: Metadata = {
  title: "Sign up — BillBolo",
};

export default function Page() {
  return <SignupClient />;
}
