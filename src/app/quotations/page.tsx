import type { Metadata } from "next";
import QuotationsClient from "./QuotationsClient";

export const metadata: Metadata = {
  title: "Quotations — BillBolo",
};

export default function Page() {
  return <QuotationsClient />;
}
