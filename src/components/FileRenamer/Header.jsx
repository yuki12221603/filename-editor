import { MAX_FILES } from "@/utils/constants";

export function Header() {
  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <h1 className="text-2xl font-semibold text-gray-800">
        ファイル名一括編集
      </h1>
      <p className="text-sm text-gray-500 mt-1">
        PDF・画像をアップロードして、日付プレフィル＋一括編集（置換／先頭追加／末尾追加）を行う（最大
        {MAX_FILES}件）
      </p>
    </header>
  );
}
