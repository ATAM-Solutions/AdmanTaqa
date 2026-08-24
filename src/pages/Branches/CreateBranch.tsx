import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import AddBranchForm from "./Component/AddBranchForm";

export default function CreateBranch() {
  const { t } = useTranslation("branches");
  const navigate = useNavigate();

  return (
    <div className="p-4 md:p-8 space-y-6 animate-in slide-in-from-bottom duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("create.title")}</h1>
        <p className="text-muted-foreground">{t("create.subtitle")}</p>
      </div>
      <Card className="p-6 border-none shadow-xl bg-card/60 backdrop-blur-md">
        <AddBranchForm
          onSuccess={(_, branchId) => {
            if (branchId != null) {
              navigate(`/branches/${branchId}`, { replace: true });
            } else {
              navigate("/branches", { replace: true });
            }
          }}
          onCancel={() => navigate("/branches")}
          showCancel
        />
      </Card>
    </div>
  );
}
