import type { Metadata } from "next";
import ExpensesClient from "./ExpensesClient";

export const metadata: Metadata = {
  title: "Expenses — BillBolo",
};

export default function Page() {
  return <ExpensesClient />;
}
