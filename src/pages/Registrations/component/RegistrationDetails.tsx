import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { reportError } from '@/lib/errorReporting';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { FileText, Download, ExternalLink, Check, X, Building2, User, Mail, Phone, MapPin } from 'lucide-react';
import { fetchRegistrationById, approveRegistration, rejectRegistration, type Registration } from '@/api/api';

interface RegistrationDetailsProps {
    id: string;
}

export default function RegistrationDetails({ id }: RegistrationDetailsProps) {
    const { t } = useTranslation("registrations");
    const [registration, setRegistration] = useState<Registration | null>(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const loadData = async () => {
            try {
                setLoading(true);
                const data = await fetchRegistrationById(id);
                setRegistration(data);
            } catch (error) {
                reportError("Error loading registration details:", error);
                toast.error(t("toasts.detailsLoadFailed"));
                navigate('/registrations');
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [id, navigate, t]);

    const handleApprove = async () => {
        try {
            await approveRegistration(id);
            toast.success(t("toasts.approveSuccess"));
            navigate('/registrations');
        } catch (error) {
            reportError("Error approving registration:", error);
            toast.error(t("toasts.approveFailed"));
        }
    };

    const handleReject = async () => {
        try {
            await rejectRegistration(id);
            toast.success(t("toasts.rejectSuccess"));
            navigate('/registrations');
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

    if (loading) {
        return (
            <div className="grid gap-6 md:grid-cols-2">
                <Skeleton className="h-[400px] w-full" />
                <Skeleton className="h-[400px] w-full" />
            </div>
        );
    }

    if (!registration) return null;

    return (
        <div className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
                {/* Section A — Company Info */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Building2 className="h-5 w-5 text-primary" />
                            {t("details.companyInfo.title")}
                        </CardTitle>
                        <CardDescription>{t("details.companyInfo.description")}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-[25px_1fr] items-start gap-3">
                            <Building2 className="h-4 w-4 mt-1 text-muted-foreground" />
                            <div>
                                <p className="text-sm font-medium leading-none">{t("details.companyInfo.companyName")}</p>
                                <p className="text-sm text-muted-foreground mt-1">{registration.companyName}</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-[25px_1fr] items-start gap-3">
                            <MapPin className="h-4 w-4 mt-1 text-muted-foreground" />
                            <div>
                                <p className="text-sm font-medium leading-none">{t("details.companyInfo.address")}</p>
                                <p className="text-sm text-muted-foreground mt-1">{registration.address || t("details.companyInfo.notAvailable")}</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-[25px_1fr] items-start gap-3">
                            <Mail className="h-4 w-4 mt-1 text-muted-foreground" />
                            <div>
                                <p className="text-sm font-medium leading-none">{t("details.companyInfo.email")}</p>
                                <p className="text-sm text-muted-foreground mt-1" dir="ltr">{registration.email}</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-[25px_1fr] items-start gap-3">
                            <Phone className="h-4 w-4 mt-1 text-muted-foreground" />
                            <div>
                                <p className="text-sm font-medium leading-none">{t("details.companyInfo.phone")}</p>
                                <p className="text-sm text-muted-foreground mt-1" dir="ltr">{registration.phone}</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-[25px_1fr] items-start gap-3">
                            <User className="h-4 w-4 mt-1 text-muted-foreground" />
                            <div>
                                <p className="text-sm font-medium leading-none">{t("details.companyInfo.contactPerson")}</p>
                                <p className="text-sm text-muted-foreground mt-1">{registration.contactPerson}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Section B — Uploaded Documents */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FileText className="h-5 w-5 text-primary" />
                            {t("details.documents.title")}
                        </CardTitle>
                        <CardDescription>{t("details.documents.description")}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {registration.documents.length === 0 ? (
                            <p className="text-sm text-muted-foreground italic">{t("details.documents.empty")}</p>
                        ) : (
                            <ul className="space-y-3">
                                {registration.documents.map((doc: { url: string; name: string }, idx: number) => (
                                    <li key={idx} className="flex items-center justify-between p-3 border rounded-md bg-muted/50">
                                        <div className="flex items-center gap-2 overflow-hidden">
                                            <FileText className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                                            <span className="text-sm font-medium truncate">{doc.name}</span>
                                        </div>
                                        <div className="flex gap-2 ms-4">
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                onClick={() => handleDownloadPDF(doc.url, doc.name)}
                                                title={t("details.documents.viewDownload")}
                                            >
                                                <ExternalLink className="h-4 w-4" />
                                            </Button>
                                            <Button variant="outline" size="icon" asChild>
                                                <a href={doc.url} download={doc.name} title={t("details.documents.download")}>
                                                    <Download className="h-4 w-4" />
                                                </a>
                                            </Button>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-end gap-4 p-6 bg-card border rounded-lg shadow-sm">
                <Button
                    variant="outline"
                    className="min-w-[120px]"
                    onClick={() => navigate('/registrations')}
                >
                    {t("details.actions.cancel")}
                </Button>
                <Button
                    variant="destructive"
                    className="min-w-[120px]"
                    onClick={handleReject}
                >
                    <X className="h-4 w-4 me-2" />
                    {t("details.actions.reject")}
                </Button>
                <Button
                    variant="default"
                    className="min-w-[120px] bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600"
                    onClick={handleApprove}
                >
                    <Check className="h-4 w-4 me-2" />
                    {t("details.actions.approve")}
                </Button>
            </div>
        </div>
    );
}
