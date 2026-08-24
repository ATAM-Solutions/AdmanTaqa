import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Upload } from "lucide-react";
import useGetOrganizationDocuments from "@/hooks/Organization/useGetOrganizationDocuments";
import useUploadOrganizationDocument from "@/hooks/Organization/useUploadOrganizationDocument";
import type { OrganizationDocument, OrganizationDocumentType } from "@/types/organization";
import { toast } from "sonner";

const DOC_TYPES: OrganizationDocumentType[] = ["LICENSE", "REGISTRATION", "OTHER"];

interface ProfileDocumentsCardProps {
  organizationId: number;
  /** When true, render content only without Card wrapper (for use inside UnifiedProfileCard) */
  embedded?: boolean;
}

export default function ProfileDocumentsCard({ organizationId, embedded }: ProfileDocumentsCardProps) {
  const { t } = useTranslation("profile");
  const { data: documents = [], isLoading } = useGetOrganizationDocuments(organizationId);
  const uploadMutation = useUploadOrganizationDocument();
  const [documentType, setDocumentType] = useState<OrganizationDocumentType>("LICENSE");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    uploadMutation.mutate(
      { organizationId, file, documentType },
      {
        onSuccess: () => {
          toast.success(t("documentsCard.uploaded"));
          e.target.value = "";
        },
        onError: (err) => toast.error((err as Error)?.message ?? t("documentsCard.uploadFailed")),
      }
    );
  };

  const getDocUrl = (doc: OrganizationDocument) => doc.url ?? doc.fileUrl ?? "#";

  const content = (
    <>
        <div className="flex flex-wrap items-end gap-4">
          <div className="space-y-2">
            <Label>{t("documentsCard.documentType")}</Label>
            <Select value={documentType} onValueChange={(v) => setDocumentType(v as OrganizationDocumentType)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DOC_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {t(`documentTypes.${type}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
            onChange={handleUpload}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadMutation.isPending}
          >
            <Upload className="h-4 w-4 me-2" />
            {uploadMutation.isPending ? t("documentsCard.uploading") : t("documentsCard.upload")}
          </Button>
        </div>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">{t("documentsCard.loading")}</p>
        ) : documents.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">{t("documentsCard.empty")}</p>
        ) : (
          <ul className="space-y-2">
            {documents.map((doc) => (
              <li key={doc.id} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
                <span className="font-medium">{doc.fileName ?? doc.documentType ?? t("documentTypes.document")}</span>
                <a href={getDocUrl(doc)} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  {t("documentsCard.view")}
                </a>
              </li>
            ))}
          </ul>
        )}
    </>
  );

  if (embedded) {
    return (
      <div className="border-t pt-6 space-y-4">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {t("documentsCard.title")}
          </h3>
          <p className="text-sm text-muted-foreground">{t("documentsCard.description")}</p>
        </div>
        {content}
      </div>
    );
  }

  return (
    <Card className="border-none shadow-lg bg-gradient-to-br from-card to-muted/20">
      <CardHeader className="border-b bg-muted/30 pb-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <FileText className="h-5 w-5" />
          {t("documentsCard.title")}
        </CardTitle>
        <CardDescription>{t("documentsCard.description")}</CardDescription>
      </CardHeader>
      <CardContent className="pt-6 space-y-6">
        {content}
      </CardContent>
    </Card>
  );
}
