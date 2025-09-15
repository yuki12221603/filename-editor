import { RefreshCw, AlertCircle } from "lucide-react";

export function FilePreview({ selectedFile }) {
  if (!selectedFile) {
    return (
      <div className="h-full flex items-center justify-center text-gray-400">
        <p>ファイルを選択してください</p>
      </div>
    );
  }

  if (selectedFile.status === "analyzing") {
    return (
      <div className="h-full flex items-center justify-center text-white">
        <div className="text-center">
          <RefreshCw className="h-12 w-12 animate-spin mx-auto mb-4 text-yellow-400" />
          <p className="text-lg">解析中...</p>
          <p className="text-sm text-gray-300">完了までお待ちください</p>
        </div>
      </div>
    );
  }

  if (selectedFile.status === "error") {
    return (
      <div className="h-full flex items-center justify-center text-white">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 text-red-400" />
          <p className="text-lg">プレビューできません</p>
          <p className="text-sm text-gray-300">解析に失敗しました</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      {selectedFile.file.type === "application/pdf" ? (
        <iframe
          src={selectedFile.fileUrl}
          className="w-full h-full border-0"
          title="PDF Preview"
        />
      ) : (
        <div className="h-full flex items-start justify-center p-4">
          <img
            src={selectedFile.fileUrl}
            alt="Preview"
            className="max-w-full h-auto object-contain"
          />
        </div>
      )}
    </div>
  );
}
