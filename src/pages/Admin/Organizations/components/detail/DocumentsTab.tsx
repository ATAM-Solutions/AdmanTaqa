import { useTranslation } from "react-i18next";
import { ExternalLink, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/patterns";
import { formatDate } from "@/lib/i18n/formatters";
import type { AdminOrganizationDetail } from "@/types/adminOrganization";

interface DocumentsTabProps {
  organization: AdminOrganizationDetail;
}

export function DocumentsTab({ organization }: DocumentsTabProps) {
  const { t, i18n } = useTranslation("adminOrganizations");
  const documents = organization.OrganizationDocuments ?? [];

  const openDocument = (fileUrl: string) => {
    window.open(fileUrl, "_blank", "noopener");
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">{t("detail.documents.title")}</CardTitle>
        <CardDescription>{t("detail.documents.description")}</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {documents.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={<FileText className="h-6 w-6" />}
              title={t("detail.documents.emptyTitle")}
              description={t("detail.documents.emptyDescription")}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table className="min-w-[560px]">
              <TableHeader className="bg-muted/40">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="font-bold text-foreground">{t("detail.documents.type")}</TableHead>
                  <TableHead className="font-bold text-foreground">{t("detail.documents.file")}</TableHead>
                  <TableHead className="font-bold text-foreground">{t("detail.documents.status")}</TableHead>
                  <TableHead className="font-bold text-foreground">{t("detail.documents.uploadedAt")}</TableHead>
                  <TableHead className="text-end font-bold text-foreground">{t("detail.documents.open")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell className="font-medium">
                      {t(`detail.documents.docTypes.${doc.documentType}`, { defaultValue: doc.documentType })}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      <span className="inline-flex items-center gap-2 min-w-0">
                        <FileText className="h-4 w-4 shrink-0" />
                        <span className="truncate max-w-[260px]" dir="ltr">
                          {doc.fileName ?? (doc.fileUrl ? doc.fileUrl.split("/").pop() : "—")}
                        </span>
                      </span>
                    </TableCell>
                    <TableCell>
                      {doc.status ? (
                        <Badge variant="outline" className="font-medium">
                          {t(`status.${doc.status}`, { defaultValue: doc.status })}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatDate(doc.createdAt, i18n.language, { dateStyle: "medium" })}
                    </TableCell>
                    <TableCell className="text-end">
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5"
                        disabled={!doc.fileUrl}
                        onClick={() => doc.fileUrl && openDocument(doc.fileUrl)}
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        {t("detail.documents.open")}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
