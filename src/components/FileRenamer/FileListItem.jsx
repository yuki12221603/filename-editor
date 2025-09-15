import {
  RefreshCw,
  CheckCircle,
  AlertCircle,
  RotateCcw,
  X,
} from "lucide-react";

export function FileListItem({ file, isActive, compactMode, handlers }) {
  const { updateCustomName, handleKeyDown, resetToSuggested, removeFile } =
    handlers;

  // ファイル拡張子を取得
  const getFileExtension = (fileName) => {
    return fileName.split(".").pop().toLowerCase();
  };

  const fileExtension = getFileExtension(file.originalName);

  return (
    <div
      className={`group relative flex items-center gap-2 px-2 py-2 rounded transition-all duration-200 ${
        compactMode ? "h-9" : "h-11"
      } ${
        isActive
          ? "bg-blue-50 border border-blue-200 shadow-sm"
          : "hover:bg-gray-50 border border-transparent"
      }`}
    >
      {isActive && (
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 rounded-l" />
      )}
      <div className="flex-shrink-0 w-4 ml-1">
        {file.status === "analyzing" ? (
          <RefreshCw
            className={`h-3 w-3 animate-spin ${isActive ? "text-blue-600" : "text-yellow-500"}`}
          />
        ) : file.status === "completed" ? (
          <CheckCircle
            className={`h-3 w-3 ${isActive ? "text-blue-600" : "text-green-500"}`}
          />
        ) : file.status === "error" ? (
          <AlertCircle
            className={`h-3 w-3 ${isActive ? "text-blue-600" : "text-red-500"}`}
          />
        ) : (
          <div
            className={`h-3 w-3 rounded-full ${isActive ? "bg-blue-400" : "bg-gray-300"}`}
          />
        )}
      </div>
      <div
        className={`flex-shrink-0 px-1 py-0.5 rounded text-white text-xs font-medium ${
          isActive
            ? "bg-blue-600"
            : file.file.type === "application/pdf"
              ? "bg-red-500"
              : "bg-blue-500"
        }`}
      >
        {fileExtension.toUpperCase()}
      </div>
      <div className="flex-1 flex items-center gap-1">
        <input
          data-file-id={file.id}
          type="text"
          value={file.customName}
          onChange={(e) => updateCustomName(file.id, e.target.value)}
          onKeyDown={(e) => handleKeyDown(e, file.id)}
          placeholder={file.status === "analyzing" ? "解析中..." : ""}
          disabled={file.status !== "completed"}
          className={`flex-1 px-2 py-1 border rounded bg-white transition-all duration-200 disabled:bg-gray-50 disabled:text-gray-500 ${
            compactMode ? "text-xs" : "text-sm"
          } truncate ${
            isActive
              ? "border-blue-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-blue-900"
              : "border-gray-200 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
          }`}
          title={`${file.customName}.${fileExtension}`}
        />
        <span
          className={`flex-shrink-0 px-1 text-gray-500 select-none ${
            compactMode ? "text-xs" : "text-sm"
          }`}
        >
          .{fileExtension}
        </span>
      </div>
      {file.status === "completed" && file.suggestedName && (
        <button
          onClick={() => resetToSuggested(file.id)}
          tabIndex="-1"
          className={`flex-shrink-0 p-1 transition-all duration-200 ${
            isActive
              ? "text-blue-500 hover:text-blue-700 opacity-100"
              : "text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100"
          }`}
          title="候補名に戻す"
        >
          <RotateCcw className="h-3 w-3" />
        </button>
      )}
      <button
        onClick={() => removeFile(file.id)}
        tabIndex="-1"
        className={`flex-shrink-0 p-1 transition-all duration-200 ${
          isActive
            ? "text-blue-500 hover:text-red-600 opacity-100"
            : "text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100"
        }`}
        title="削除"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}
