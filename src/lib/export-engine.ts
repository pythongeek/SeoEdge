/**
 * Report Export Engine
 * Generates DOCX and CSV exports
 */

import { Document, Paragraph, HeadingLevel, Packer, Table, TableRow, TableCell, BorderStyle } from "docx";
import { Parser } from "json2csv";

interface ReportData {
  title: string;
  summary?: string;
  actions?: any[];
  ctrGaps?: any[];
  cannibalization?: any[];
  pageHealth?: any[];
  opportunities?: any[];
  contentPlan?: any[];
  healthScore?: number;
  createdAt?: Date;
  type?: string;
}

export async function generateExport(
  report: ReportData,
  format: "docx" | "csv"
): Promise<{ url: string; blob: Blob }> {
  switch (format) {
    case "docx":
      return generateDocx(report);
    case "csv":
      return generateCsv(report);
    default:
      throw new Error(`Unsupported format: ${format}`);
  }
}

async function generateDocx(report: ReportData): Promise<{ url: string; blob: Blob }> {
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            text: report.title,
            heading: HeadingLevel.HEADING_1,
          }),
          new Paragraph({
            text: `Generated: ${report.createdAt?.toLocaleDateString() || new Date().toLocaleDateString()}`,
          }),
          new Paragraph({ text: "" }),
          new Paragraph({
            text: "Executive Summary",
            heading: HeadingLevel.HEADING_2,
          }),
          new Paragraph({ text: report.summary || "No summary available" }),
          new Paragraph({ text: "" }),

          ...(report.healthScore
            ? [
                new Paragraph({
                  text: `Overall Health Score: ${report.healthScore}/100`,
                  heading: HeadingLevel.HEADING_3,
                }),
                new Paragraph({ text: "" }),
              ]
            : []),

          ...(report.opportunities?.length
            ? [
                new Paragraph({
                  text: "Prioritized Opportunities",
                  heading: HeadingLevel.HEADING_2,
                }),
                ...report.opportunities.flatMap((opp: any, i: number) => [
                  new Paragraph({
                    text: `${i + 1}. ${opp.title || "Opportunity"}`,
                    heading: HeadingLevel.HEADING_3,
                  }),
                  new Paragraph({ text: opp.description || "" }),
                  new Paragraph({
                    text: `Impact: ${opp.impact || "unknown"} | Effort: ${opp.effort || "unknown"} | Priority: ${opp.priority || 0}`,
                  }),
                  new Paragraph({ text: "" }),
                ]),
              ]
            : []),

          ...(report.ctrGaps?.length
            ? [
                new Paragraph({
                  text: "CTR Gaps",
                  heading: HeadingLevel.HEADING_2,
                }),
                ...report.ctrGaps.flatMap((gap: any, i: number) => [
                  new Paragraph({
                    text: `${i + 1}. ${gap.query || "Query"}`,
                  }),
                  new Paragraph({
                    text: `Current: ${gap.currentCtr || 0} | Benchmark: ${gap.benchmarkCtr || 0} | Gap: ${gap.gap || 0}`,
                  }),
                  new Paragraph({ text: gap.recommendation || "" }),
                  new Paragraph({ text: "" }),
                ]),
              ]
            : []),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  return { url, blob };
}

async function generateCsv(report: ReportData): Promise<{ url: string; blob: Blob }> {
  const fields = [
    { label: "Type", value: "type" },
    { label: "Title", value: "title" },
    { label: "Description", value: "description" },
    { label: "Priority", value: "priority" },
    { label: "Impact", value: "impact" },
    { label: "Effort", value: "effort" },
  ];

  const parser = new Parser({ fields });
  const rows = report.opportunities?.map((opp: any) => ({
    type: opp.category || "opportunity",
    title: opp.title || "",
    description: opp.description || "",
    priority: String(opp.priority || ""),
    impact: opp.impact || "",
    effort: opp.effort || "",
  })) || [];

  const csv = parser.parse(rows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  return { url, blob };
}
