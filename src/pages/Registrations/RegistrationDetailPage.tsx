import RegistrationDetails from '@/pages/Registrations/component/RegistrationDetails';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';

export default function RegistrationDetailPage() {
    const { t } = useTranslation("registrations");
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    return (
        <div className="p-4 md:p-8 space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="sm" onClick={() => navigate('/registrations')}>
                    <ChevronLeft className="h-4 w-4 me-1 rtl:rotate-180" />
                    {t("detailPage.back")}
                </Button>
                <h1 className="text-3xl font-bold tracking-tight">{t("detailPage.title")}</h1>
            </div>
            {id && <RegistrationDetails id={id} />}
        </div>
    );
}
