import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Notes - AI先生付き手書きノートアプリ",
  description: "手書きノートにAI先生がアドバイスしてくれるアプリ",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className="bg-gray-50 text-gray-900 min-h-screen">{children}</body>
    </html>
  );
}
