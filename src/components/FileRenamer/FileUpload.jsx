import { Upload } from "lucide-react";
import { MAX_FILES } from "@/utils/constants";

export function FileUpload({
  dragActive,
  handleDrop,
  handleDragOver,
  handleDragLeave,
  handleFileSelect,
  fileInputRef,
}) {
  return (
    <div className="h-full flex items-center justify-center">
      <div
        className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors bg-white ${
          dragActive
            ? "border-blue-400 bg-blue-50"
            : "border-gray-300 hover:border-gray-400"
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-700 mb-2">
          ファイルをドロップまたはクリックして選択
        </h3>
        <p className="text-gray-500">
          PDF、JPG、PNGファイルに対応（最大{MAX_FILES}件）
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          onChange={handleFileSelect}
          multiple
          className="hidden"
        />
      </div>
    </div>
  );
}
