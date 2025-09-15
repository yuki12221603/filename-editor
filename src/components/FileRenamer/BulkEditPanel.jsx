import { useState, useCallback } from "react";
import { Search, Plus, ArrowLeft, RotateCcw, Settings } from "lucide-react";
import { toast } from "sonner";

export function BulkEditPanel({ files, handlers, hasUndo, onUndo }) {
  const [replaceSearch, setReplaceSearch] = useState("");
  const [replaceWith, setReplaceWith] = useState("");
  const [prefixText, setPrefixText] = useState("");
  const [suffixText, setSuffixText] = useState("");
  const [regexMode, setRegexMode] = useState(false);
  const [caseSensitive, setCaseSensitive] = useState(false);

  const applyReplace = useCallback(() => {
    if (!replaceSearch.trim()) {
      toast.error("検索文字列が空です");
      return;
    }

    let matchCount = 0;
    let errorCount = 0;

    try {
      const updates = files
        .map((file) => {
          if (file.status !== "completed") return null;

          // ファイル名本体のみを処理（拡張子は除く）
          const baseName = file.customName;
          let newBaseName;

          if (regexMode) {
            try {
              const flags = caseSensitive ? "g" : "gi";
              const regex = new RegExp(replaceSearch, flags);
              newBaseName = baseName.replace(regex, replaceWith);
              if (newBaseName !== baseName) matchCount++;
            } catch (e) {
              errorCount++;
              toast.error("正規表現エラー: " + e.message);
              return null;
            }
          } else {
            const searchRegex = new RegExp(
              replaceSearch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
              caseSensitive ? "g" : "gi",
            );
            newBaseName = baseName.replace(searchRegex, replaceWith);
            if (newBaseName !== baseName) matchCount++;
          }

          return {
            id: file.id,
            newName: newBaseName,
          };
        })
        .filter(Boolean);

      if (errorCount === 0) {
        handlers.applyBulkEdit(updates, "replace");
        toast.success(
          `置換を適用: 一致 ${matchCount} / 未一致 ${files.length - matchCount - errorCount}`,
        );
        setReplaceSearch("");
        setReplaceWith("");
      }
    } catch (error) {
      toast.error("置換処理でエラーが発生しました");
    }
  }, [files, replaceSearch, replaceWith, regexMode, caseSensitive, handlers]);

  const applyPrefix = useCallback(() => {
    if (!prefixText.trim()) {
      toast.error("先頭に追加する文字列が空です");
      return;
    }

    const updates = files
      .map((file) => {
        if (file.status !== "completed") return null;

        // ファイル名本体のみを処理（拡張子は除く）
        const baseName = file.customName;
        const newBaseName = prefixText + baseName;

        return {
          id: file.id,
          newName: newBaseName,
        };
      })
      .filter(Boolean);

    handlers.applyBulkEdit(updates, "prefix");
    toast.success(`${updates.length}件に先頭追加を適用`);
    setPrefixText("");
  }, [files, prefixText, handlers]);

  const applySuffix = useCallback(() => {
    if (!suffixText.trim()) {
      toast.error("末尾に追加する文字列が空です");
      return;
    }

    const updates = files
      .map((file) => {
        if (file.status !== "completed") return null;

        // ファイル名本体のみを処理（拡張子は除く）
        const baseName = file.customName;
        const newBaseName = baseName + suffixText;

        return {
          id: file.id,
          newName: newBaseName,
        };
      })
      .filter(Boolean);

    handlers.applyBulkEdit(updates, "suffix");
    toast.success(`${updates.length}件に末尾追加を適用`);
    setSuffixText("");
  }, [files, suffixText, handlers]);

  const handleKeyDown = useCallback(
    (action) => (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        action();
      }
    },
    [],
  );

  const completedCount = files.filter((f) => f.status === "completed").length;

  return (
    <div className="bg-gray-50 border-b border-gray-200 px-3 py-2">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-medium text-gray-800">一括編集</h3>
        {hasUndo && (
          <button
            onClick={onUndo}
            className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
            title="元に戻す"
          >
            <RotateCcw className="h-3 w-3" />
            元に戻す
          </button>
        )}
      </div>

      <div className="space-y-1 text-xs">
        {/* 置換 - 2行レイアウト */}
        <div className="space-y-1">
          {/* 1段目：検索→置換 */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-700 w-12 shrink-0">
              置換
            </span>
            <input
              type="text"
              value={replaceSearch}
              onChange={(e) => setReplaceSearch(e.target.value)}
              onKeyDown={handleKeyDown(applyReplace)}
              placeholder="検索文字列"
              className="flex-1 px-2 py-1 h-7 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
            <span className="text-gray-500 shrink-0">→</span>
            <input
              type="text"
              value={replaceWith}
              onChange={(e) => setReplaceWith(e.target.value)}
              onKeyDown={handleKeyDown(applyReplace)}
              placeholder="置換後"
              className="flex-1 px-2 py-1 h-7 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          {/* 2段目：オプション + ボタン */}
          <div className="flex items-center justify-between pl-14">
            <div className="flex items-center gap-3 text-xs">
              <label className="flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={regexMode}
                  onChange={(e) => setRegexMode(e.target.checked)}
                  className="h-3 w-3"
                />
                正規表現
              </label>
              <label className="flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={caseSensitive}
                  onChange={(e) => setCaseSensitive(e.target.checked)}
                  className="h-3 w-3"
                />
                大小区別
              </label>
            </div>
            <button
              onClick={applyReplace}
              disabled={!replaceSearch.trim() || completedCount === 0}
              className="px-2 py-1 h-7 text-xs bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded transition-colors"
            >
              適用
            </button>
          </div>
        </div>

        {/* 先頭に追加 - 1行 */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-gray-700 w-20 shrink-0">
            先頭に追加
          </span>
          <input
            type="text"
            value={prefixText}
            onChange={(e) => setPrefixText(e.target.value)}
            onKeyDown={handleKeyDown(applyPrefix)}
            placeholder="文字列"
            className="flex-1 px-2 py-1 h-7 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          />
          <button
            onClick={applyPrefix}
            disabled={!prefixText.trim() || completedCount === 0}
            className="px-2 py-1 h-7 text-xs bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white rounded transition-colors shrink-0"
          >
            適用
          </button>
        </div>

        {/* 末尾に追加 - 1行 */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-gray-700 w-20 shrink-0">
            末尾に追加
          </span>
          <input
            type="text"
            value={suffixText}
            onChange={(e) => setSuffixText(e.target.value)}
            onKeyDown={handleKeyDown(applySuffix)}
            placeholder="文字列（拡張子の直前）"
            className="flex-1 px-2 py-1 h-7 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          />
          <button
            onClick={applySuffix}
            disabled={!suffixText.trim() || completedCount === 0}
            className="px-2 py-1 h-7 text-xs bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 text-white rounded transition-colors shrink-0"
          >
            適用
          </button>
        </div>
      </div>
    </div>
  );
}
