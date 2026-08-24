import { useTranslation } from "react-i18next";
import { CardHeader, CardTitle } from "@/components/ui/card";
import { Hammer } from "lucide-react";

export default function JobOrdersTableHeader() {
  const { t } = useTranslation("jobOrders");
  return (
    <CardHeader className="pb-3 px-6 pt-6">
      <CardTitle className="text-lg font-bold flex items-center gap-2">
        <Hammer className="h-5 w-5 text-primary" />
        {t("activeOrders")}
      </CardTitle>
    </CardHeader>
  );
}
