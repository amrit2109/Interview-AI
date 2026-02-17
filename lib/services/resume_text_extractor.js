/**
 * Resume text extraction from PDF, DOC, DOCX, and TXT.
 * Uses dynamic imports to avoid webpack bundling issues with pdf-parse/mammoth.
 */

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_MIMES = new Set([
  "application/pdf",
  "text/plain",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);
const ALLOWED_EXTENSIONS = new Set([".pdf", ".txt", ".doc", ".docx"]);

/**
 * @param {string} filename
 * @returns {boolean}
 */
function hasAllowedExtension(filename) {
  if (!filename || typeof filename !== "string") return false;
  const lower = filename.toLowerCase();
  return [...ALLOWED_EXTENSIONS].some((ext) => lower.endsWith(ext));
}

/**
 * @param {string} mimeType
 * @returns {boolean}
 */
function isAllowedMime(mimeType) {
  return mimeType && ALLOWED_MIMES.has(mimeType);
}

/**
 * @param {Buffer} buffer
 * @param {string} mimeType
 * @param {string} [filename]
 * @returns {Promise<{ text: string; error: string | null }>}
 */
export async function extractTextFromResume(buffer, mimeType, filename = "") {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    return { text: "", error: "Invalid or empty file buffer." };
  }
  if (buffer.length > MAX_FILE_SIZE_BYTES) {
    return { text: "", error: "File exceeds maximum size (10 MB)." };
  }
  if (!mimeType || !isAllowedMime(mimeType)) {
    if (!hasAllowedExtension(filename)) {
      return { text: "", error: "Unsupported file type. Use PDF, TXT, or Word (DOC/DOCX)." };
    }
  }

  try {
    const lower = (mimeType || "").toLowerCase();
    const ext = filename ? filename.toLowerCase().slice(-5) : "";

    if (lower === "application/pdf" || ext.endsWith(".pdf")) {
      const { PDFParse } = await import("pdf-parse");
      const parser = new PDFParse({ data: buffer });
      const result = await parser.getText();
      await parser.destroy();
      const text = (result?.text ?? "").trim();
      return { text: text || "", error: text ? null : "Could not extract text from PDF." };
    }

    if (
      lower === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      lower === "application/msword" ||
      ext.endsWith(".docx") ||
      ext.endsWith(".doc")
    ) {
      const mammoth = (await import("mammoth")).default;
      const result = await mammoth.extractRawText({ buffer });
      const text = (result?.value ?? "").trim();
      return { text: text || "", error: text ? null : "Could not extract text from Word document." };
    }

    if (lower === "text/plain" || ext.endsWith(".txt")) {
      const text = buffer.toString("utf8").trim();
      return { text: text || "", error: text ? null : "File appears empty." };
    }

    return { text: "", error: "Unsupported file type. Use PDF, TXT, or Word (DOC/DOCX)." };
  } catch (err) {
    console.error("resume_text_extractor:", err);
    return {
      text: "",
      error: err?.message ?? "Failed to extract text from resume.",
    };
  }
}
