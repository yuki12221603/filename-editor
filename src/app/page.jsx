"use client";

import { Toaster } from "sonner";
import { useFileRenamer } from "@/hooks/useFileRenamer";
import { Header } from "@/components/FileRenamer/Header";
import { FileUpload } from "@/components/FileRenamer/FileUpload";
import { FilePreview } from "@/components/FileRenamer/FilePreview";
import { FileListPanel } from "@/components/FileRenamer/FileListPanel";
import { MAX_FILES } from "@/utils/constants";

export default function FileRenamerApp() {
  const {
    files,
    selectedFile,
    dragActive,
    isDownloading,
    compactMode,
    completedCount,
    fileInputRef,
    rightColumnRef,
    hasUndo,
    handlers,
  } = useFileRenamer();

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-right" richColors />
      <Header />
      <div className="flex gap-3 h-[calc(100vh-120px)]">
        <div className="w-3/4 bg-[#2b2b2b] border border-gray-300 overflow-hidden flex flex-col">
          {files.length === 0 ? (
            <FileUpload
              dragActive={dragActive}
              handleDrop={handlers.handleDrop}
              handleDragOver={handlers.handleDragOver}
              handleDragLeave={handlers.handleDragLeave}
              handleFileSelect={handlers.handleFileSelect}
              fileInputRef={fileInputRef}
            />
          ) : (
            <FilePreview selectedFile={selectedFile} />
          )}
        </div>
        <FileListPanel
          files={files}
          selectedFileId={selectedFile?.id}
          completedCount={completedCount}
          isDownloading={isDownloading}
          compactMode={compactMode}
          rightColumnRef={rightColumnRef}
          hasUndo={hasUndo}
          handlers={handlers}
        />
      </div>
    </div>
  );
}
