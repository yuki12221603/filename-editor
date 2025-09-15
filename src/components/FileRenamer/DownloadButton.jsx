import { Download, RefreshCw } from "lucide-react";
import { useCallback } from "react";

export function DownloadButton({
  completedCount,
  isDownloading,
  handleBulkDownload,
}) {
    
  const handleDownloadButtonKeyDown = useCallback((e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleBulkDownload();
      }
    }, [handleBulkDownload]);

  return (
    <div className="border-t border-gray-100 p-4">
      <button
        id="bulk-download-button"
        onClick={handleBulkDownload}
        onKeyDown={handleDownloadButtonKeyDown}
        disabled={completedCount === 0 || isDownloading}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
      >
        {isDownloading ? (
          <>
            <RefreshCw className="h-5 w-5 animate-spin" />
            ダウンロード中...
          </>
        ) : (
          <>
            <Download className="h-5 w-5" />
            一括出力 ({completedCount}件)
          </>
        )}
      </button>
    </div>
  );
}
