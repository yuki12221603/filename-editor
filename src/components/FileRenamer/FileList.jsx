import { useRef } from "react";
import { Upload } from "lucide-react";
import { FileListItem } from "@/components/FileRenamer/FileListItem";

export function FileList({
  files,
  selectedFileId,
  compactMode,
  handlers,
}) {
  const fileListRef = useRef(null);
  const { handleFileListFocus, handleFileListClick } = handlers;

  if (files.length === 0) {
    return (
      <div className="flex-1 overflow-y-auto px-2 py-2">
        <div className="h-full flex items-center justify-center text-gray-500 text-sm">
          <div className="text-center">
            <Upload className="mx-auto h-8 w-8 mb-2 opacity-50" />
            <p>ファイルをアップロード</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex-1 overflow-y-auto px-2 py-2"
      onFocusCapture={handleFileListFocus}
      onClick={handleFileListClick}
      ref={fileListRef}
    >
      <div className="space-y-1">
        {files.map((file) => (
          <FileListItem
            key={file.id}
            file={file}
            isActive={file.id === selectedFileId}
            compactMode={compactMode}
            handlers={handlers}
          />
        ))}
      </div>
    </div>
  );
}
