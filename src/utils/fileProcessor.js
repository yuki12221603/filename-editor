export const extractTextFromPDF = async (file, fileId, addLog) => {
  try {
    addLog(fileId, "PDF.jsライブラリを読み込み中...");

    if (!window.pdfjsLib) {
      const script = document.createElement("script");
      script.src =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
      document.head.appendChild(script);

      await new Promise((resolve, reject) => {
        script.onload = resolve;
        script.onerror = reject;
      });

      window.pdfjsLib.GlobalWorkerOptions.workerSrc =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
    }

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer })
      .promise;

    let fullText = "";
    const numPages = pdf.numPages;
    addLog(fileId, `PDFページ数: ${numPages}`);

    for (let i = 1; i <= numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item) => item.str).join(" ");
      fullText += pageText + "\n";
    }

    if (fullText.trim().length === 0) {
      addLog(
        fileId,
        "テキスト層が見つかりません。スキャンPDFの可能性があります。",
      );
      return "日付・主体・相手の検出が難しい可能性があります。手動で編集してください。";
    }

    addLog(fileId, "PDFからテキストを抽出しました");
    return fullText;
  } catch (error) {
    addLog(fileId, `PDF処理エラー: ${error.message}`);
    throw error;
  }
};

export const extractTextFromImage = async (file, fileId, addLog) => {
  try {
    addLog(fileId, "OCR処理を開始しています...");

    if (!window.Tesseract) {
      const script = document.createElement("script");
      script.src = "https://unpkg.com/tesseract.js@4/dist/tesseract.min.js";
      document.head.appendChild(script);

      await new Promise((resolve, reject) => {
        script.onload = resolve;
        script.onerror = reject;
      });
    }

    const {
      data: { text },
    } = await window.Tesseract.recognize(file, "jpn+eng", {
      logger: (m) => {
        if (m.status === "recognizing text") {
          addLog(fileId, `OCR進行中: ${Math.round(m.progress * 100)}%`);
        }
      },
    });

    addLog(fileId, "OCR処理が完了しました");
    return text;
  } catch (error) {
    addLog(fileId, `OCR処理エラー: ${error.message}`);
    throw error;
  }
};
