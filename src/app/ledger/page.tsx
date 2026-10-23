import type { Metadata } from "next";
import LedgerClient from "./LedgerClient";

export const metadata: Metadata = {
  title: "Ledger — BillBolo",
};

export default function Page() {
  return <LedgerClient />;
}
