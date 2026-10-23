"use client";

import { useState } from "react";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  "https://v24jdob9c0.execute-api.ap-south-1.amazonaws.com";

const WHATSAPP_URL = "https://wa.me/918123422932";

const EXAMPLE_TEXT =
  "Quotation for Sharma Ji, 80 sq ft wardrobe at 1600 per sq ft";

interface LineItem {
  item_name: string;
  quantity: number;
  rate: number;
  unit: string;
  amount: number;
}

interface QuotationResult {
  client_name: string | null;
  items: LineItem[];
  total_before_gst: number;
  gst_amount: number;
  grand_total: number;
  pdf_base64: string;
}

export default function Home() {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<QuotationResult | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch(`${API_URL}/api/web/quotation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong. Please try again.");
        return;
      }

      setResult(data);
    } catch {
      setError("Couldn't reach the server. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function downloadPdf() {
    if (!result) return;
    const byteChars = atob(result.pdf_base64);
    const byteNumbers = new Array(byteChars.length);
    for (let i = 0; i < byteChars.length; i++) {
      byteNumbers[i] = byteChars.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "billbolo-quotation.pdf";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-cyan-50 flex flex-col">
      {/* Nav */}
      <nav className="border-b border-sky-100 bg-white/80 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <a
            href="https://billbolo.in"
            className="text-xl font-extrabold bg-gradient-to-r from-sky-600 to-blue-700 bg-clip-text text-transparent"
          >
            BillBolo
          </a>
          <a
            href="https://billbolo.in"
            className="text-sm font-medium text-slate-500 hover:text-sky-600 transition-colors"
          >
            ← Back to site
          </a>
        </div>
      </nav>

      <div className="flex-1 max-w-3xl w-full mx-auto px-6 py-14">
        <div className="text-center mb-10">
          <p className="text-xs font-bold tracking-widest text-sky-700 uppercase mb-3">
            Try It Free — No Signup
          </p>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mb-3 text-balance">
            Generate a Quotation in Seconds
          </h1>
          <p className="text-slate-600 text-lg">
            Describe the job like you&apos;d say it out loud. We&apos;ll do
            the rest.
          </p>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl border border-sky-100 shadow-lg shadow-sky-100/50 p-6 sm:p-8"
        >
          <label
            htmlFor="description"
            className="block text-sm font-semibold text-slate-700 mb-2"
          >
            Describe your quotation
          </label>
          <textarea
            id="description"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={EXAMPLE_TEXT}
            maxLength={1000}
            rows={4}
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent resize-none"
          />
          <div className="flex items-center justify-between mt-2 mb-5">
            <button
              type="button"
              onClick={() => setText(EXAMPLE_TEXT)}
              className="text-xs font-medium text-sky-600 hover:text-sky-700"
            >
              Use example
            </button>
            <span className="text-xs text-slate-400">
              {text.length}/1000
            </span>
          </div>

          <button
            type="submit"
            disabled={loading || !text.trim()}
            className="w-full rounded-xl bg-gradient-to-r from-sky-600 to-blue-700 text-white font-bold py-3.5 shadow-lg shadow-sky-600/20 hover:shadow-xl hover:shadow-sky-600/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Generating…" : "Generate Quotation"}
          </button>

          {error && (
            <p className="mt-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-3">
              {error}
            </p>
          )}
        </form>

        {/* Result */}
        {result && (
          <div className="mt-8 bg-white rounded-2xl border border-sky-100 shadow-lg shadow-sky-100/50 p-6 sm:p-8">
            <div className="flex items-center gap-2 mb-5">
              <span className="text-2xl">✅</span>
              <h2 className="text-xl font-bold text-slate-900">
                Quotation Ready
              </h2>
            </div>

            <div className="space-y-1 mb-5">
              <p className="text-sm text-slate-500">
                To: <span className="text-slate-900 font-medium">{result.client_name || "Client"}</span>
              </p>
            </div>

            <div className="border border-slate-100 rounded-xl overflow-hidden mb-5">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left px-4 py-2.5 font-semibold text-slate-600">
                      Item
                    </th>
                    <th className="text-right px-4 py-2.5 font-semibold text-slate-600">
                      Qty
                    </th>
                    <th className="text-right px-4 py-2.5 font-semibold text-slate-600">
                      Rate
                    </th>
                    <th className="text-right px-4 py-2.5 font-semibold text-slate-600">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {result.items.map((item, i) => (
                    <tr key={i} className="border-t border-slate-100">
                      <td className="px-4 py-2.5 text-slate-900">
                        {item.item_name}
                      </td>
                      <td className="px-4 py-2.5 text-right text-slate-600">
                        {item.quantity} {item.unit}
                      </td>
                      <td className="px-4 py-2.5 text-right text-slate-600">
                        ₹{item.rate.toLocaleString("en-IN")}
                      </td>
                      <td className="px-4 py-2.5 text-right text-slate-900 font-medium">
                        ₹{item.amount.toLocaleString("en-IN")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="space-y-1.5 text-sm mb-6">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span>
                <span>₹{result.total_before_gst.toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>GST</span>
                <span>₹{result.gst_amount.toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between text-base font-bold text-slate-900 pt-1.5 border-t border-slate-100">
                <span>Grand Total</span>
                <span>₹{result.grand_total.toLocaleString("en-IN")}</span>
              </div>
            </div>

            <button
              onClick={downloadPdf}
              className="w-full rounded-xl border-2 border-sky-600 text-sky-700 font-bold py-3 mb-4 hover:bg-sky-50 transition-colors"
            >
              Download PDF
            </button>

            <div className="bg-gradient-to-br from-sky-600 to-blue-700 rounded-xl p-5 text-center">
              <p className="text-white font-semibold mb-3">
                Loved it? Get unlimited quotations on WhatsApp.
              </p>
              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block bg-white text-sky-700 font-bold px-6 py-2.5 rounded-lg hover:shadow-lg transition-shadow"
              >
                Message BillBolo on WhatsApp →
              </a>
            </div>
          </div>
        )}
      </div>

      <footer className="text-center text-xs text-slate-400 pb-8">
        BillBolo — Virtual Munshi inside WhatsApp
      </footer>
    </main>
  );
}
