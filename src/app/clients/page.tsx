import type { Metadata } from "next";
import ClientsClient from "./ClientsClient";

export const metadata: Metadata = {
  title: "Clients — BillBolo",
};

export default function Page() {
  return <ClientsClient />;
}
