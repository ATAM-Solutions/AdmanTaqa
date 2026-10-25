import { describe, expect, it } from "vitest";
import { checkReportFile, REPORT_MAX_FILE_BYTES, REPORT_MAX_FILES } from "./reportAttachments";

describe("checkReportFile", () => {
  it("accepts the supported image types and PDF", () => {
    for (const type of ["image/jpeg", "image/png", "image/gif", "image/webp", "application/pdf"]) expect(checkReportFile({ type, size: 10 }, 0)).toBeNull();
  });
  it("refuses unsupported types", () => {
    expect(checkReportFile({ type: "application/x-msdownload", size: 10 }, 0)).toBe("type");
    expect(checkReportFile({ type: "text/html", size: 10 }, 0)).toBe("type");
  });
  it("refuses a file over 5 MB but accepts exactly 5 MB", () => {
    expect(checkReportFile({ type: "image/png", size: REPORT_MAX_FILE_BYTES + 1 }, 0)).toBe("size");
    expect(checkReportFile({ type: "image/png", size: REPORT_MAX_FILE_BYTES }, 0)).toBeNull();
  });
  it("refuses the sixth file", () => {
    expect(checkReportFile({ type: "image/png", size: 1 }, REPORT_MAX_FILES - 1)).toBeNull();
    expect(checkReportFile({ type: "image/png", size: 1 }, REPORT_MAX_FILES)).toBe("limit");
  });
});
