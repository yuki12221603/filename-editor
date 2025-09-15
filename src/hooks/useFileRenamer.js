import { useState, useCallback, useRef, useEffect } from "react";
import { toast } from "sonner";
import { generateSuggestedName } from "@/utils/textExtraction";
import {
  extractTextFromPDF,
  extractTextFromImage,
} from "@/utils/fileProcessor";
import { MAX_FILES, MAX_CONCURRENT_PROCESSING } from "@/utils/constants";

export function useFileRenamer() {
  const [files, setFiles] = useState([]);
  const [selectedFileId, setSelectedFileId] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [processingQueue, setProcessingQueue] = useState([]);
  const [activeProcessing, setActiveProcessing] = useState(new Set());
  const [isDownloading, setIsDownloading] = useState(false);
  const [compactMode, setCompactMode] = useState(false);
  const [undoStack, setUndoStack] = useState([]);
  const fileInputRef = useRef(null);
  const debounceTimerRef = useRef(null);
  const rightColumnRef = useRef(null);

  const addLog = useCallback((fileId, message) => {
    console.log(`[${fileId}] ${new Date().toLocaleTimeString()}: ${message}`);
  }, []);

  const processFile = useCallback(
    async (fileData) => {
      const { id, file } = fileData;
      try {
        setFiles((prev) =>
          prev.map((f) => (f.id === id ? { ...f, status: "analyzing" } : f)),
        );
        addLog(id, `ファイル処理開始: ${file.name}`);
        let text = "";
        if (file.type === "application/pdf") {
          text = await extractTextFromPDF(file, id, addLog);
        } else if (file.type.startsWith("image/")) {
          text = await extractTextFromImage(file, id, addLog);
        } else {
          throw new Error("サポートされていないファイル形式です");
        }
        const suggested = generateSuggestedName(text, file.name);
        setFiles((prev) =>
          prev.map((f) =>
            f.id === id
              ? {
                  ...f,
                  extractedText: text,
                  suggestedName: suggested,
                  customName: suggested,
                  status: "completed",
                }
              : f,
          ),
        );
        addLog(id, "ファイル名候補を生成しました");
      } catch (error) {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === id ? { ...f, status: "error", error: error.message } : f,
          ),
        );
        addLog(id, `エラー: ${error.message}`);
      }
    },
    [addLog],
  );

  const processQueue = useCallback(async () => {
    if (
      activeProcessing.size >= MAX_CONCURRENT_PROCESSING ||
      processingQueue.length === 0
    )
      return;

    const nextFileId = processingQueue[0];
    const fileData = files.find((f) => f.id === nextFileId);

    if (!fileData || fileData.status !== "uploading") {
      setProcessingQueue((prev) => prev.slice(1));
      return;
    }

    setActiveProcessing((prev) => new Set(prev).add(nextFileId));
    setProcessingQueue((prev) => prev.slice(1));

    await processFile(fileData);

    setActiveProcessing((prev) => {
      const newSet = new Set(prev);
      newSet.delete(nextFileId);
      return newSet;
    });
  }, [activeProcessing, processingQueue, files, processFile]);

  useEffect(() => {
    processQueue();
  }, [processQueue]);

  const generateId = useCallback(
    () => Date.now().toString(36) + Math.random().toString(36).substr(2),
    [],
  );

  const addFiles = useCallback(
    (newFiles) => {
      const validFiles = Array.from(newFiles).filter(
        (file) =>
          file.type === "application/pdf" || file.type.startsWith("image/"),
      );
      if (files.length + validFiles.length > MAX_FILES) {
        toast.error(`ファイル数上限（${MAX_FILES}件）を超えています`);
        return;
      }
      if (validFiles.length !== newFiles.length) {
        toast.warning("PDF、JPG、PNGファイルのみサポートしています");
      }
      const fileObjects = validFiles.map((file) => ({
        id: generateId(),
        file,
        fileUrl: URL.createObjectURL(file),
        originalName: file.name,
        suggestedName: "",
        customName: "",
        extractedText: "",
        status: "uploading",
        error: null,
      }));
      setFiles((prev) => [...prev, ...fileObjects]);
      setProcessingQueue((prev) => [...prev, ...fileObjects.map((f) => f.id)]);
      if (fileObjects.length > 0 && !selectedFileId) {
        setSelectedFileId(fileObjects[0].id);
      }
    },
    [files.length, generateId, selectedFileId],
  );

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      setDragActive(false);
      addFiles(e.dataTransfer.files);
    },
    [addFiles],
  );

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setDragActive(false);
  }, []);

  const handleFileSelect = useCallback(
    (e) => {
      addFiles(e.target.files);
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    [addFiles],
  );

  const removeFile = useCallback(
    (fileId) => {
      setFiles((prev) => {
        const updated = prev.filter((f) => f.id !== fileId);
        const removedFile = prev.find((f) => f.id === fileId);
        if (removedFile?.fileUrl) URL.revokeObjectURL(removedFile.fileUrl);
        return updated;
      });
      if (selectedFileId === fileId) {
        const remainingFiles = files.filter((f) => f.id !== fileId);
        setSelectedFileId(
          remainingFiles.length > 0 ? remainingFiles[0].id : null,
        );
      }
      setProcessingQueue((prev) => prev.filter((id) => id !== fileId));
    },
    [files, selectedFileId],
  );

  const updateCustomName = useCallback((fileId, newName) => {
    setFiles((prev) =>
      prev.map((f) => {
        if (f.id === fileId) {
          // ユーザーが拡張子を入力した場合は除去する
          const extension = f.originalName.split(".").pop().toLowerCase();
          const extensionPattern = new RegExp(`\\.${extension}$`, "i");
          const cleanName = newName.replace(extensionPattern, "");
          return { ...f, customName: cleanName };
        }
        return f;
      }),
    );
  }, []);

  const resetToSuggested = useCallback(
    (fileId) => {
      const file = files.find((f) => f.id === fileId);
      if (file?.suggestedName) updateCustomName(fileId, file.suggestedName);
    },
    [files, updateCustomName],
  );

  const generateUniqueFileName = useCallback((baseName, usedNames) => {
    if (!usedNames.has(baseName)) return baseName;
    const nameParts = baseName.split(".");
    const extension = nameParts.pop();
    const nameWithoutExt = nameParts.join(".");
    let counter = 1;
    let uniqueName;
    do {
      uniqueName = `${nameWithoutExt}_${counter}.${extension}`;
      counter++;
    } while (usedNames.has(uniqueName));
    return uniqueName;
  }, []);

  const handleBulkDownload = useCallback(async () => {
    const completedFiles = files.filter(
      (f) => f.status === "completed" && f.customName.trim(),
    );
    if (completedFiles.length === 0) {
      toast.error("ダウンロード可能なファイルがありません");
      return;
    }
    toast.info(
      "複数ファイルのダウンロードを許可してください。ブラウザの許可ダイアログが表示される場合があります。",
    );
    setIsDownloading(true);
    const usedNames = new Set();
    let successCount = 0,
      skipCount = 0,
      errorCount = 0;

    for (const fileData of completedFiles) {
      try {
        // 元ファイルの拡張子を取得
        const extension = fileData.originalName.split(".").pop().toLowerCase();
        // ファイル名本体に拡張子を付加
        const fullName = `${fileData.customName.trim()}.${extension}`;
        const finalName = generateUniqueFileName(fullName, usedNames);
        usedNames.add(finalName);
        const blob = new Blob([fileData.file], { type: fileData.file.type });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = finalName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        successCount++;
        if (fileData !== completedFiles[completedFiles.length - 1]) {
          await new Promise((resolve) => setTimeout(resolve, 300));
        }
      } catch (error) {
        console.error(`Download failed for ${fileData.originalName}:`, error);
        errorCount++;
      }
    }
    setIsDownloading(false);
    skipCount = files.length - completedFiles.length;
    const summaryParts = [];
    if (successCount > 0) summaryParts.push(`成功: ${successCount}件`);
    if (skipCount > 0) summaryParts.push(`スキップ: ${skipCount}件`);
    if (errorCount > 0) summaryParts.push(`失敗: ${errorCount}件`);
    toast.success(`ダウンロード完了 - ${summaryParts.join(" / ")}`);
  }, [files, generateUniqueFileName]);

  const clearAllFiles = useCallback(() => {
    files.forEach((file) => {
      if (file.fileUrl) URL.revokeObjectURL(file.fileUrl);
    });
    setFiles([]);
    setSelectedFileId(null);
    setProcessingQueue([]);
    setActiveProcessing(new Set());
  }, [files]);

  const setActivePreview = useCallback(
    (fileId) => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(() => {
        if (fileId && fileId !== selectedFileId) {
          const targetFile = files.find((f) => f.id === fileId);
          if (targetFile) {
            setSelectedFileId(fileId);
            if (targetFile.status === "error") {
              toast.warning("プレビュー不可（解析失敗）", { duration: 2000 });
            }
          }
        }
      }, 75);
    },
    [selectedFileId, files],
  );

  const handleFileListFocus = useCallback(
    (e) => {
      if (e.target.tagName === "INPUT" && e.target.dataset.fileId) {
        setActivePreview(e.target.dataset.fileId);
      }
    },
    [setActivePreview],
  );

  const handleFileListClick = useCallback(
    (e) => {
      if (e.target.tagName === "INPUT" && e.target.dataset.fileId) {
        setActivePreview(e.target.dataset.fileId);
      }
    },
    [setActivePreview],
  );

  const handleKeyDown = useCallback(
    (e, fileId) => {
      if (e.key === "ArrowUp" || e.key === "ArrowDown") {
        e.preventDefault();
        const currentIndex = files.findIndex((f) => f.id === fileId);
        const nextIndex =
          e.key === "ArrowUp"
            ? Math.max(0, currentIndex - 1)
            : Math.min(files.length - 1, currentIndex + 1);
        if (nextIndex !== currentIndex) {
          const nextFileId = files[nextIndex].id;
          const nextInput = document.querySelector(
            `input[data-file-id="${nextFileId}"]`,
          );
          if (nextInput) nextInput.focus();
        }
      }
    },
    [files],
  );

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const checkDensity = () => {
      if (!rightColumnRef.current || files.length === 0) return;
      const availableHeight = window.innerHeight - 120 - 32 - 64 - 32;
      const rowHeight = compactMode ? 36 : 44;
      const requiredHeight = (rowHeight + 3) * files.length - 3;
      if (requiredHeight > availableHeight && !compactMode) {
        setCompactMode(true);
      } else if (
        requiredHeight <= availableHeight &&
        compactMode &&
        files.length < 8
      ) {
        setCompactMode(false);
      }
    };
    checkDensity();
    window.addEventListener("resize", checkDensity);
    return () => window.removeEventListener("resize", checkDensity);
  }, [files.length, compactMode]);

  const selectedFile = files.find((f) => f.id === selectedFileId);
  const completedCount = files.filter((f) => f.status === "completed").length;

  const applyBulkEdit = useCallback(
    (updates, operation) => {
      // 現在の状態をUndoスタックに保存
      const currentState = files.map((f) => ({
        id: f.id,
        customName: f.customName,
      }));
      setUndoStack((prev) => [currentState, ...prev.slice(0, 4)]); // 最大5段階保持

      // 一括編集を適用（拡張子を除去）
      setFiles((prev) =>
        prev.map((file) => {
          const update = updates.find((u) => u.id === file.id);
          if (update) {
            // 更新時も拡張子を除去
            const extension = file.originalName.split(".").pop().toLowerCase();
            const extensionPattern = new RegExp(`\\.${extension}$`, "i");
            const cleanName = update.newName.replace(extensionPattern, "");
            return { ...file, customName: cleanName };
          }
          return file;
        }),
      );
    },
    [files],
  );

  const undoBulkEdit = useCallback(() => {
    if (undoStack.length === 0) return;

    const lastState = undoStack[0];
    setFiles((prev) =>
      prev.map((file) => {
        const savedFile = lastState.find((s) => s.id === file.id);
        return savedFile ? { ...file, customName: savedFile.customName } : file;
      }),
    );
    setUndoStack((prev) => prev.slice(1));
    toast.success("元に戻しました");
  }, [undoStack]);

  const handlers = {
    addFiles,
    handleDrop,
    handleDragOver,
    handleDragLeave,
    handleFileSelect,
    removeFile,
    updateCustomName,
    resetToSuggested,
    clearAllFiles,
    handleBulkDownload,
    handleFileListFocus,
    handleFileListClick,
    handleKeyDown,
    applyBulkEdit,
    undoBulkEdit,
  };

  return {
    files,
    selectedFile,
    dragActive,
    isDownloading,
    compactMode,
    completedCount,
    fileInputRef,
    rightColumnRef,
    hasUndo: undoStack.length > 0,
    handlers,
  };
}
