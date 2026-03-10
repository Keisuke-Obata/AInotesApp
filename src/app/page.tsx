import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-8 p-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-2">AI Notes</h1>
        <p className="text-gray-500 text-lg">AI先生付き手書きノートアプリ</p>
      </div>

      <div className="flex gap-4">
        <Link
          href="/notes"
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
        >
          ノート一覧
        </Link>
        <Link
          href="/knowledge"
          className="px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition font-medium"
        >
          ナレッジ管理
        </Link>
      </div>

      <div className="mt-8 max-w-md text-center text-gray-500 text-sm space-y-2">
        <p>
          手書きでノートを取り、投げなわツールで囲んだ箇所について
          AI先生に質問できます。
        </p>
        <p>
          ナレッジにPDFを登録すると、AI先生がより的確なアドバイスを提供します。
        </p>
      </div>
    </div>
  );
}
