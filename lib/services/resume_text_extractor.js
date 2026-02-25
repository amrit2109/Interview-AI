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
 * @returns {string} Extension including dot, e.g. ".pdf", or ""
 */
function getExtension(filename) {
  if (!filename || typeof filename !== "string") return "";
  const m = filename.toLowerCase().match(/\.(pdf|txt|docx?)$/);
  return m ? `.${m[1]}` : "";
}

/**
 * @param {string} filename
 * @returns {boolean}
 */
function hasAllowedExtension(filename) {
  const ext = getExtension(filename);
  return ext ? ALLOWED_EXTENSIONS.has(ext) : false;
}

/**
 * @param {string} mimeType
 * @returns {boolean}
 */
function isAllowedMime(mimeType) {
  return mimeType && ALLOWED_MIMES.has(mimeType);
}

/**
 * Extract text from PDF buffer. Supports both PDFParse class API (mehmet-kozan fork)
 * and default-function API (tradle original).
 * @param {Buffer} buffer
 * @returns {Promise<string>}
 */
async function extractPdfText(buffer) {
  const pdfModule = await import("pdf-parse");
  if (pdfModule.PDFParse) {
    const parser = new pdfModule.PDFParse({ data: buffer });
    const result = await parser.getText();
    if (typeof parser.destroy === "function") parser.destroy();
    return (result?.text ?? "").trim();
  }
  const pdfParse = pdfModule.default;
  if (typeof pdfParse === "function") {
    const data = await pdfParse(buffer);
    return (data?.text ?? "").trim();
  }
  return "";
}

/**
 * @param {Buffer|Uint8Array|ArrayBuffer} buffer
 * @param {string} mimeType
 * @param {string} [filename]
 * @returns {Promise<{ text: string; error: string | null }>}
 */
export async function extractTextFromResume(buffer, mimeType, filename = "") {
  const buf = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
  if (!Buffer.isBuffer(buf) || buf.length === 0) {
    return { text: "", error: "Invalid or empty file buffer." };
  }
  if (buf.length > MAX_FILE_SIZE_BYTES) {
    return { text: "", error: "File exceeds maximum size (10 MB)." };
  }
  if (!mimeType || !isAllowedMime(mimeType)) {
    if (!hasAllowedExtension(filename)) {
      return { text: "", error: "Unsupported file type. Use PDF, TXT, or Word (DOC/DOCX)." };
    }
  }

  try {
    const lower = (mimeType || "").toLowerCase();
    const ext = getExtension(filename);

    if (lower === "application/pdf" || ext === ".pdf") {
      const pdfHeader = buf.slice(0, 4).toString("utf8");
      if (!pdfHeader.startsWith("%PDF")) {
        return { text: "", error: "File does not appear to be a valid PDF." };
      }
      const text = await extractPdfText(buf);
      return { text: text || "", error: text ? null : "Could not extract text from PDF." };
    }

    if (
      lower === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      lower === "application/msword" ||
      ext === ".docx" ||
      ext === ".doc"
    ) {
      const hasZipHeader = buf.length >= 4 && buf[0] === 0x50 && buf[1] === 0x4b;
      const hasOleHeader = buf.length >= 8 && buf[0] === 0xd0 && buf[1] === 0xcf && buf[2] === 0x11 && buf[3] === 0xe0;
      if (!hasZipHeader && !hasOleHeader) {
        return { text: "", error: "File does not appear to be a valid Word document." };
      }
      const mammoth = (await import("mammoth")).default;
      const result = await mammoth.extractRawText({ buffer: buf });
      const text = (result?.value ?? "").trim();
      return { text: text || "", error: text ? null : "Could not extract text from Word document." };
    }

    if (lower === "text/plain" || ext === ".txt") {
      const text = buf.toString("utf8").trim();
      return { text: text || "", error: text ? null : "File appears empty." };
    }

    return { text: "", error: "Unsupported file type. Use PDF, TXT, or Word (DOC/DOCX)." };
  } catch (err) {
    console.error("resume_text_extractor:", err);
    const msg = err?.message;
    const safeError =
      typeof msg === "string" && msg.length <= 200 ? msg : "Failed to extract text from resume.";
    return { text: "", error: safeError };
  }
}
