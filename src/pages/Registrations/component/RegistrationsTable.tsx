import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trans, useTranslation } from 'react-i18next';
import { reportError } from '@/lib/errorReporting';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { toast } from 'sonner';
import { Eye, Check, X, FileText, Building2, User, Mail, Phone } from 'lucide-react';
import { fetchRegistrations, approveRegistration, rejectRegistration, type Registration } from '@/api/api';

export default function RegistrationsTable() {
  const { t } = useTranslation("registrations");
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const pageSize = 3;
  const navigate = useNavigate();

  const loadData = async (page: number) => {
    try {
      setLoading(true);
      const response = await fetchRegistrations('approved', page, pageSize, 'SERVICE_PROVIDER');
      const list = response.data ?? [];
      const hasTypeField = list.some((r) => (r.organizationType ?? r.type) != null && (r.organizationType ?? r.type) !== '');
      const filtered = hasTypeField
        ? list.filter((r) => (r.organizationType ?? r.type ?? '').toUpperCase() === 'SERVICE_PROVIDER')
        : list;
      setRegistrations(filtered);
      setTotalPages(response.totalPages);
      setTotalItems(response.total);
      setCurrentPage(response.page);
    } catch (error) {
      reportError("Error loading registrations:", error);
      toast.error(t("toasts.loadFailed"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(currentPage);
  }, [currentPage]);

  const handleApprove = async (id: string) => {
    try {
      await approveRegistration(id);
      toast.success(t("toasts.approveSuccess"));
      loadData(currentPage);
    } catch (error) {
      reportError("Error approving registration:", error);
      toast.error(t("toasts.approveFailed"));
    }
  };

  const handleReject = async (id: string) => {
    try {
      await rejectRegistration(id);
      toast.success(t("toasts.rejectSuccess"));
      loadData(currentPage);
    } catch (error) {
      reportError("Error rejecting registration:", error);
      toast.error(t("toasts.rejectFailed"));
    }
  };

  const handleDownloadPDF = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      toast.success(t("toasts.downloadSuccess"));
    } catch (error) {
      reportError('Error downloading PDF:', error);
      toast.error(t("toasts.downloadFailed"));
    }
  };

  if (loading && registrations.length === 0) {
    return (
      <Card className="border-none shadow-xl bg-card/60 backdrop-blur-md overflow-hidden">
        <CardContent className="p-6">
          <div className="space-y-4">
            <Skeleton className="h-12 w-full rounded-lg" />
            <Skeleton className="h-16 w-full rounded-lg" />
            <Skeleton className="h-16 w-full rounded-lg" />
            <Skeleton className="h-16 w-full rounded-lg" />
            <Skeleton className="h-16 w-full rounded-lg" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!loading && registrations.length === 0 && currentPage === 1) {
    return (
      <Card className="border-none shadow-xl bg-card/60 backdrop-blur-md overflow-hidden">
        <CardContent className="flex flex-col items-center justify-center py-20">
          <div className="rounded-2xl bg-primary/10 p-6 mb-6">
            <FileText className="h-14 w-14 text-primary/70" />
          </div>
          <h3 className="text-xl font-bold text-foreground mb-2">{t("table.emptyTitle")}</h3>
          <p className="text-muted-foreground text-sm">{t("table.emptyDescription")}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-none shadow-xl bg-card/60 backdrop-blur-md overflow-hidden">
        <CardContent className="p-0 relative">
          {loading && (
            <div className="absolute inset-0 bg-background/60 backdrop-blur-sm flex items-center justify-center z-10 rounded-lg">
              <div className="flex flex-col items-center gap-3">
                <div className="h-9 w-9 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <span className="text-sm font-medium text-muted-foreground">{t("table.loading")}</span>
              </div>
            </div>
          )}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow className="hover:bg-transparent border-b border-muted/20">
                  <TableHead className="font-bold text-foreground">{t("table.company")}</TableHead>
                  <TableHead className="font-bold text-foreground">{t("table.contact")}</TableHead>
                  <TableHead className="font-bold text-foreground">{t("table.emailPhone")}</TableHead>
                  <TableHead className="font-bold text-foreground">{t("table.documents")}</TableHead>
                  <TableHead className="text-end font-bold text-foreground px-6">{t("table.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {registrations.map((registration) => (
                  <TableRow
                    key={registration.id}
                    className="hover:bg-muted/20 transition-colors border-b border-muted/20 last:border-0"
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                          <Building2 className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="font-semibold text-sm text-foreground truncate">
                            {registration.companyName}
                          </span>
                          <span className="text-xs text-muted-foreground font-mono" dir="ltr">{registration.id}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <span className="flex items-center gap-1.5 text-sm font-medium">
                          <User className="h-3.5 w-3.5 text-muted-foreground" />
                          {registration.contactPerson}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <span className="flex items-center gap-1.5 text-sm text-foreground" dir="ltr">
                          <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                          {registration.email}
                        </span>
                        <span className="flex items-center gap-1.5 text-xs text-muted-foreground" dir="ltr">
                          <Phone className="h-3 w-3" />
                          {registration.phone}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1.5">
                        {registration.documents?.map((doc: { url: string; name: string }, idx: number) => (
                          <Button
                            key={idx}
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs gap-1.5 text-primary hover:text-primary hover:bg-primary/10"
                            onClick={() => handleDownloadPDF(doc.url, doc.name)}
                          >
                            <FileText className="h-3 w-3" />
                            {doc.name?.replace(/\.[^/.]+$/, '') || t("table.docFallback", { index: idx + 1 })}
                          </Button>
                        ))}
                        {(!registration.documents || registration.documents.length === 0) && (
                          <span className="text-xs text-muted-foreground italic">{t("table.noDocuments")}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-end px-6">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 gap-1.5 hover:bg-primary/5 hover:text-primary hover:border-primary/30"
                          onClick={() => navigate(`/registrations/${registration.id}`)}
                        >
                          <Eye className="h-3.5 w-3.5" />
                          {t("table.view")}
                        </Button>
                        <Button
                          size="sm"
                          className="h-8 gap-1.5 bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white"
                          onClick={() => handleApprove(registration.id)}
                        >
                          <Check className="h-3.5 w-3.5" />
                          {t("table.approve")}
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          className="h-8 gap-1.5"
                          onClick={() => handleReject(registration.id)}
                        >
                          <X className="h-3.5 w-3.5" />
                          {t("table.reject")}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          <Trans
            i18nKey="table.showing"
            ns="registrations"
            values={{ count: registrations.length, total: totalItems }}
            components={{ strong: <span className="font-semibold text-foreground" /> }}
          />
        </p>
        <Pagination className="justify-end w-auto mx-0">
          <PaginationContent className="gap-1">
            <PaginationItem>
              <PaginationPrevious
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  if (currentPage > 1) setCurrentPage(currentPage - 1);
                }}
                className={
                  currentPage === 1
                    ? 'pointer-events-none opacity-50'
                    : 'cursor-pointer hover:bg-muted/50 rounded-md'
                }
              />
            </PaginationItem>
            {[...Array(totalPages)].map((_, i) => (
              <PaginationItem key={i}>
                <PaginationLink
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setCurrentPage(i + 1);
                  }}
                  isActive={currentPage === i + 1}
                  className="cursor-pointer rounded-md"
                >
                  {i + 1}
                </PaginationLink>
              </PaginationItem>
            ))}
            <PaginationItem>
              <PaginationNext
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  if (currentPage < totalPages) setCurrentPage(currentPage + 1);
                }}
                className={
                  currentPage === totalPages
                    ? 'pointer-events-none opacity-50'
                    : 'cursor-pointer hover:bg-muted/50 rounded-md'
                }
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    </div>
  );
}
