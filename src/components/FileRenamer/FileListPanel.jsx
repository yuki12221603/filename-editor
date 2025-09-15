import { useCallback } from "react";
import { RefreshCw } from "lucide-react";
import { BulkEditPanel } from "@/components/FileRenamer/BulkEditPanel";
import { FileList } from "@/components/FileRenamer/FileList";
import { DownloadButton } from "@/components/FileRenamer/DownloadButton";

export function FileListPanel({
  files,
  selectedFileId,
  completedCount,
  isDownloading,
  compactMode,
  rightColumnRef,
  hasUndo,
  handlers,
}) {
  const hasFiles = files.length > 0;

  const handleRightColumnKeyDown = useCallback((e) => {
    if (e.key === "Tab") {
      const inputElements = Array.from(
        document.querySelectorAll("input[data-file-id]"),
      ).filter((input) => !input.disabled);

      const downloadButton = document.querySelector("#bulk-download-button");
      const allFocusableElements = [...inputElements];
      if (downloadButton && !downloadButton.disabled) {
        allFocusableElements.push(downloadButton);
      }

      const currentIndex = allFocusableElements.indexOf(document.activeElement);

      if (currentIndex === -1) return;

      let nextIndex;
      if (e.shiftKey) {
        nextIndex = currentIndex - 1;
        if (nextIndex < 0) return;
      } else {
        nextIndex = currentIndex + 1;
        if (nextIndex >= allFocusableElements.length) return;
      }

      e.preventDefault();
      allFocusableElements[nextIndex].focus();
    }
  }, []);

  return (
    <div
      ref={rightColumnRef}
      className="w-1/4 min-w-[540px] bg-white border border-gray-200 flex flex-col"
      onKeyDown={handleRightColumnKeyDown}
    >
      {/* 一括編集パネル */}
      {hasFiles && (
        <BulkEditPanel
          files={files}
          handlers={handlers}
          hasUndo={hasUndo}
          onUndo={handlers.undoBulkEdit}
        />
      )}

      <div className="border-b border-gray-100 px-4 py-2 h-8">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-800">
            ファイル名生成 {hasFiles && `(${completedCount}/${files.length})`}
          </span>
          {hasFiles && (
            <button
              onClick={handlers.clearAllFiles}
              tabIndex="-1"
              className="text-xs text-gray-500 hover:text-gray-700 p-1"
              title="全削除"
            >
              <RefreshCw className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      <FileList
        files={files}
        selectedFileId={selectedFileId}
        compactMode={compactMode}
        handlers={handlers}
      />

      {hasFiles && (
        <DownloadButton
          completedCount={completedCount}
          isDownloading={isDownloading}
          handleBulkDownload={handlers.handleBulkDownload}
        />
      )}
    </div>
  );
}
