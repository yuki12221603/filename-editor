// 日付抽出とフォーマット
const extractDateFromContext = (text) => {
  // テキスト正規化（全角→半角、余分な空白除去）
  const normalizedText = text
    .replace(/[０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xfee0))
    .replace(/[／－]/g, (s) => (s === "／" ? "/" : "-"))
    .replace(/\s+/g, " ")
    .trim();

  // 和暦対応
  const eraPatterns = [
    { era: "令和", startYear: 2019 },
    { era: "平成", startYear: 1989 },
    { era: "昭和", startYear: 1926 },
  ];

  // 和暦パターン（より柔軟に）
  for (const { era, startYear } of eraPatterns) {
    const eraPattern = new RegExp(
      `${era}\\s*(\\d{1,2})\\s*[年\\-\\/]\\s*(\\d{1,2})\\s*[月\\-\\/]\\s*(\\d{1,2})\\s*[日\\s]?`,
      "g",
    );
    const matches = [...normalizedText.matchAll(eraPattern)];
    if (matches.length > 0) {
      const match = matches[0];
      const eraYear = parseInt(match[1]);
      const month = parseInt(match[2]);
      const day = parseInt(match[3]);
      const westernYear = startYear + eraYear - 1;

      if (
        westernYear >= 1900 &&
        westernYear <= 2100 &&
        month >= 1 &&
        month <= 12 &&
        day >= 1 &&
        day <= 31
      ) {
        const yearStr = westernYear.toString().slice(-2);
        const monthStr = month.toString().padStart(2, "0");
        const dayStr = day.toString().padStart(2, "0");
        return `${yearStr}${monthStr}${dayStr}`;
      }
    }
  }

  // 西暦パターン（並列表記対応強化）
  const patterns = [
    // YYYY年M月D日（曜日）パターン
    {
      regex:
        /(\d{4})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日\s*(?:\([月火水木金土日]\))?/g,
      format: "yyyy-mm-dd",
    },
    // YYYY/MM/DD（曜日）パターン
    {
      regex:
        /(\d{4})[\/\-\.]\s*(\d{1,2})[\/\-\.]\s*(\d{1,2})\s*(?:\([月火水木金土日]\))?/g,
      format: "yyyy-mm-dd",
    },
    // MM/DD/YYYYパターン（米国式）
    { regex: /(\d{1,2})\/(\d{1,2})\/(\d{4})/g, format: "mm-dd-yyyy" },
    // YY/MM/DDパターン
    {
      regex: /(\d{2})[\/\-\.]\s*(\d{1,2})[\/\-\.]\s*(\d{1,2})/g,
      format: "yy-mm-dd",
    },
    // DD/MM/YYYYパターン（欧州式）
    { regex: /(\d{1,2})\/(\d{1,2})\/(\d{2,4})/g, format: "dd-mm-yyyy" },
  ];

  for (const { regex, format } of patterns) {
    const matches = [...normalizedText.matchAll(regex)];
    if (matches.length > 0) {
      const match = matches[0];
      let year, month, day;

      switch (format) {
        case "yyyy-mm-dd":
          year = parseInt(match[1]);
          month = parseInt(match[2]);
          day = parseInt(match[3]);
          break;
        case "mm-dd-yyyy":
          month = parseInt(match[1]);
          day = parseInt(match[2]);
          year = parseInt(match[3]);
          break;
        case "yy-mm-dd":
          year = parseInt(match[1]);
          month = parseInt(match[2]);
          day = parseInt(match[3]);
          // 2桁年の場合は20xxに補完
          year += year > 50 ? 1900 : 2000;
          break;
        case "dd-mm-yyyy":
          day = parseInt(match[1]);
          month = parseInt(match[2]);
          year = parseInt(match[3]);
          if (year < 100) {
            year += year > 50 ? 1900 : 2000;
          }
          break;
        default:
          continue;
      }

      // 妥当性チェック
      if (
        year >= 1900 &&
        year <= 2100 &&
        month >= 1 &&
        month <= 12 &&
        day >= 1 &&
        day <= 31
      ) {
        const yearStr = year.toString().slice(-2);
        const monthStr = month.toString().padStart(2, "0");
        const dayStr = day.toString().padStart(2, "0");
        return `${yearStr}${monthStr}${dayStr}`;
      }
    }
  }

  return null;
};

// 日付の妥当性チェック
const validateDateRange = (dateStr) => {
  if (!dateStr || dateStr.length !== 6) return null;

  const year = parseInt("20" + dateStr.slice(0, 2));
  const month = parseInt(dateStr.slice(2, 4));
  const day = parseInt(dateStr.slice(4, 6));

  const date = new Date(year, month - 1, day);
  const today = new Date();

  // 未来90日超チェック
  const future90Days = new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000);
  if (date > future90Days) return null;

  // 過去20年超チェック
  const past20Years = new Date(
    today.getFullYear() - 20,
    today.getMonth(),
    today.getDate(),
  );
  if (date < past20Years) return null;

  // 月日の妥当性チェック
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  return dateStr;
};

export const extractDateFromText = (text) => {
  // 優先度付きキーワード（仕様通り）
  const dateKeywords = [
    {
      keyword: "発行日",
      priority: 5,
      patterns: ["発行日", "発行\\s*日", "Issue\\s*Date"],
    },
    {
      keyword: "請求日",
      priority: 4,
      patterns: ["請求日", "請求\\s*日", "Billing\\s*Date"],
    },
    {
      keyword: "作成日",
      priority: 3,
      patterns: ["作成日", "作成\\s*日", "Created\\s*Date"],
    },
    {
      keyword: "申請日",
      priority: 2,
      patterns: ["申請日", "申請\\s*日", "Applied\\s*Date"],
    },
    {
      keyword: "Date:",
      priority: 1,
      patterns: ["\\bDate\\b", "\\bDATE\\b", "日付"],
    },
  ];

  let bestDate = null;
  let bestScore = -1;

  // キーワード近傍の日付を優先検索（±50文字）
  for (const { keyword, priority, patterns } of dateKeywords) {
    for (const pattern of patterns) {
      const keywordRegex = new RegExp(pattern, "gi");
      const keywordMatches = [...text.matchAll(keywordRegex)];

      for (const keywordMatch of keywordMatches) {
        const keywordIndex = keywordMatch.index;
        // 前後50文字の範囲でテキスト抽出
        const startIndex = Math.max(0, keywordIndex - 50);
        const endIndex = Math.min(
          text.length,
          keywordIndex + keyword.length + 50,
        );
        const nearbyText = text.slice(startIndex, endIndex);

        const dateMatch = extractDateFromContext(nearbyText);
        if (dateMatch && priority > bestScore) {
          const validatedDate = validateDateRange(dateMatch);
          if (validatedDate) {
            bestDate = validatedDate;
            bestScore = priority;
          }
        }
      }
    }
  }

  // キーワード近傍で見つからない場合、文書全体から検索
  if (!bestDate) {
    const generalMatch = extractDateFromContext(text);
    if (generalMatch) {
      bestDate = validateDateRange(generalMatch);
    }
  }

  // それでも見つからない場合は本日日付を使用
  if (!bestDate) {
    const today = new Date();
    const year = today.getFullYear().toString().slice(-2);
    const month = (today.getMonth() + 1).toString().padStart(2, "0");
    const day = today.getDate().toString().padStart(2, "0");
    return `${year}${month}${day}`;
  }

  return bestDate;
};

const extractCandidateEntities = (text) => {
  const candidates = [];
  const corporatePattern =
    /([\w\s\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]+?)(株式会社|合同会社|有限会社|LLC|Inc\.?|Corp\.?|Ltd\.?)/gi;
  let match;
  while ((match = corporatePattern.exec(text)) !== null) {
    candidates.push({ name: match[1].trim() + match[2], type: "corporate" });
  }

  const namePattern = /([^\s\n\t]{2,20})(様|さん|殿)/g;
  while ((match = namePattern.exec(text)) !== null) {
    candidates.push({ name: match[1] + match[2], type: "individual" });
  }

  const generalPattern = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]{2,10}/g;
  while ((match = generalPattern.exec(text)) !== null) {
    if (match[0].length >= 2 && match[0].length <= 10) {
      candidates.push({ name: match[0], type: "general" });
    }
  }

  return candidates;
};

export const extractEntityFromText = (text, isSubject = true) => {
  const subjectKeywords = [
    "発行者",
    "発行元",
    "請求元",
    "発注者",
    "From",
    "貴社名",
    "会社名",
  ];
  const targetKeywords = ["宛先", "請求先", "御中", "To", "ご担当者"];
  const keywords = isSubject ? subjectKeywords : targetKeywords;
  const candidates = [];

  for (const keyword of keywords) {
    const keywordIndex = text.indexOf(keyword);
    if (keywordIndex !== -1) {
      const afterKeyword = text.slice(
        keywordIndex + keyword.length,
        keywordIndex + keyword.length + 200,
      );
      const entities = extractCandidateEntities(afterKeyword);
      candidates.push(...entities.map((e) => ({ ...e, keywordScore: 2 })));
    }
  }

  const generalEntities = extractCandidateEntities(text);
  candidates.push(...generalEntities.map((e) => ({ ...e, keywordScore: 1 })));

  if (candidates.length === 0) return "不明";

  const scoredCandidates = candidates.map((candidate) => {
    let score = candidate.keywordScore;
    if (
      /(株式会社|合同会社|有限会社|Inc\.?|Co\.?|Ltd\.?)/i.test(candidate.name)
    ) {
      score += 2;
    }
    if (/(都|道|府|県|市|区|丁目|番地|\d{3}-\d{4})/i.test(candidate.name)) {
      score -= 1;
    }
    if (/@|http/i.test(candidate.name)) {
      score = 0;
    }
    return { ...candidate, score };
  });

  const bestCandidate = scoredCandidates
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score)[0];

  if (!bestCandidate) return "不明";

  let cleanName = bestCandidate.name
    .replace(/(株式会社|合同会社|有限会社|Inc\.?|Co\.?|Ltd\.?)/gi, "")
    .replace(/(様|御中)/g, "")
    .trim();

  if (/^[A-Z\s]+$/i.test(cleanName)) {
    cleanName = cleanName
      .toLowerCase()
      .replace(/\b\w/g, (l) => l.toUpperCase());
  }
  return cleanName || "不明";
};

export const extractDocumentType = (text) => {
  const firstHalf = text.slice(0, 2000);

  const documentTypes = {
    請求書: "請求書",
    領収書: "領収書",
    見積書: "見積書",
    納品書: "納品書",
    発注書: "発注書",
    契約書: "契約書",
    覚書: "覚書",
    議事録: "議事録",
    振込明細: "振込明細",
    明細書: "明細書",
    請書: "請書",
    invoice: "請求書",
    receipt: "領収書",
    estimate: "見積書",
    quote: "見積書",
    contract: "契約書",
    statement: "明細書",
  };

  const modifiers = ["委任", "弁護士報酬", "業務委託", "秘密保持"];
  let foundModifier = "";

  for (const modifier of modifiers) {
    if (firstHalf.includes(modifier)) {
      foundModifier = modifier;
      break;
    }
  }

  for (const [key, value] of Object.entries(documentTypes)) {
    if (firstHalf.toLowerCase().includes(key.toLowerCase())) {
      return foundModifier ? `${foundModifier}${value}` : value;
    }
  }

  return "文書";
};

const extractAmountCandidates = (text) => {
  const patterns = [
    /¥\s?([0-9,]+(?:\.[0-9]{2})?)/g,
    /([0-9,]+)\s?円/g,
    /([0-9,]+(?:\.[0-9]{2})?)/g,
  ];
  const candidates = [];
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const numStr = match[1].replace(/,/g, "");
      const value = parseInt(numStr);
      if (value > 0) {
        let score = 1;
        if (
          text
            .slice(Math.max(0, match.index - 20), match.index + 20)
            .includes("税込")
        ) {
          score += 2;
        }
        if (value < 100000) {
          score -= 0.5;
        }
        candidates.push({ value, score });
      }
    }
  }
  return candidates;
};

export const extractAmount = (text) => {
  const amountKeywords = ["合計", "請求金額", "総計", "お支払金額", "支払額"];
  let bestAmount = null;
  let bestScore = 0;

  for (const keyword of amountKeywords) {
    const keywordIndex = text.indexOf(keyword);
    if (keywordIndex !== -1) {
      const nearbyText = text.slice(keywordIndex, keywordIndex + 200);
      const amounts = extractAmountCandidates(nearbyText);
      for (const amount of amounts) {
        if (amount.score > bestScore) {
          bestAmount = amount.value;
          bestScore = amount.score;
        }
      }
    }
  }

  if (!bestAmount) {
    const generalAmounts = extractAmountCandidates(text);
    if (generalAmounts.length > 0) {
      bestAmount = Math.max(...generalAmounts.map((a) => a.value));
    }
  }

  if (!bestAmount || bestAmount < 100) return null;
  return bestAmount.toLocaleString();
};

export const detectSeal = (text) => {
  const sealKeywords = ["印", "署名", "サイン", "seal", "印鑑", "押印"];
  for (const keyword of sealKeywords) {
    if (text.toLowerCase().includes(keyword.toLowerCase())) {
      return true;
    }
  }
  return false;
};

export const generateSuggestedName = (text, originalFileName) => {
  // 文書から日付を抽出（yymmdd形式で返される）
  const extractedDate = extractDateFromText(text);

  // 拡張子は含めず、ファイル名本体のみ返す
  const fileName = `${extractedDate}_`;

  return fileName;
};
