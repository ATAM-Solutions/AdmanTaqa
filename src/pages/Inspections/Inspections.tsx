import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Building2, User } from "lucide-react";
import InspectionsTableHeader from "./Component/InspectionsTableHeader";
import TableInspections from "./Component/TableInspections";
import { PageHeader } from "@/components/patterns/PageHeader";

const MOCK_INSPECTION_KEYS = [
  {
    id: "INS-2024-501",
    targetKey: "alAmal",
    branchKey: "northRiyadh",
    type: "FUEL_STATION",
    inspectorKey: "mohammedKhalid",
    status: "COMPLETED",
    findingsKey: "safetyEquipment",
    date: "2024-02-05",
  },
  {
    id: "INS-2024-502",
    targetKey: "ecoEnergy",
    branchKey: "mainHub",
    type: "SERVICE_PROVIDER",
    inspectorKey: "sarahAlGhamdi",
    status: "IN_PROGRESS",
    findingsKey: "maintenanceWorkspace",
    date: "2024-02-10",
  },
  {
    id: "INS-2024-503",
    targetKey: "redSea",
    branchKey: "highway10",
    type: "FUEL_STATION",
    inspectorKey: "mohammedKhalid",
    status: "SCHEDULED",
    findingsKey: "annualCompliance",
    date: "2024-02-15",
  },
  {
    id: "INS-2024-504",
    targetKey: "mastersMaintenance",
    branchKey: "eastZone",
    type: "SERVICE_PROVIDER",
    inspectorKey: "ahmedMansour",
    status: "CANCELLED",
    findingsKey: "rescheduled",
    date: "2024-01-30",
  },
] as const;

const MOCK_INSPECTOR_KEYS = [
  { id: "INS-001", key: "mohammedKhalid" },
  { id: "INS-002", key: "sarahAlGhamdi" },
  { id: "INS-003", key: "ahmedMansour" },
  { id: "INS-004", key: "fatimaHassan" },
] as const;

const MOCK_TARGET_KEYS = [
  { id: "TRG-001", key: "alAmal", type: "FUEL_STATION" },
  { id: "TRG-002", key: "ecoEnergy", type: "SERVICE_PROVIDER" },
  { id: "TRG-003", key: "redSea", type: "FUEL_STATION" },
  { id: "TRG-004", key: "mastersMaintenance", type: "SERVICE_PROVIDER" },
] as const;

export default function Inspections() {
  const { t } = useTranslation("inspections");
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const MOCK_INSPECTIONS = MOCK_INSPECTION_KEYS.map((ins) => ({
    id: ins.id,
    target: t(`mock.targets.${ins.targetKey}`),
    branch: t(`mock.branches.${ins.branchKey}`),
    type: ins.type,
    inspector: t(`mock.inspectors.${ins.inspectorKey}`),
    status: ins.status,
    findings: t(`mock.findings.${ins.findingsKey}`),
    date: ins.date,
  }));
  const MOCK_INSPECTORS = MOCK_INSPECTOR_KEYS.map((i) => ({ id: i.id, name: t(`mock.inspectors.${i.key}`) }));
  const MOCK_TARGETS = MOCK_TARGET_KEYS.map((tg) => ({ id: tg.id, name: t(`mock.targets.${tg.key}`), type: tg.type }));

  const handleCreateInspection = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success(t("toasts.created"));
    setIsCreateModalOpen(false);
  };

  const filteredInspections = MOCK_INSPECTIONS.filter(
    (ins) =>
      ins.target.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ins.inspector.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ins.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-4 md:p-8 space-y-6 animate-in slide-in-from-bottom duration-500">
      <PageHeader
        title={t("page.title")}
        description={t("page.subtitle")}
        action={
          <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 shadow-md bg-rose-600 hover:bg-rose-500 text-white">
                <Plus className="h-4 w-4" />
                {t("page.newPlan")}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>{t("createDialog.title")}</DialogTitle>
                <DialogDescription>{t("createDialog.description")}</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateInspection} className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="target">{t("createDialog.targetOrganization")}</Label>
                    <Select defaultValue={MOCK_TARGETS[0].id}>
                      <SelectTrigger id="target">
                        <SelectValue placeholder={t("createDialog.selectTarget")} />
                      </SelectTrigger>
                      <SelectContent>
                        {MOCK_TARGETS.map((target) => (
                          <SelectItem key={target.id} value={target.id}>
                            <div className="flex items-center gap-2">
                              <Building2 className="h-3 w-3" />
                              {target.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="inspector">{t("createDialog.assignedInspector")}</Label>
                    <Select defaultValue={MOCK_INSPECTORS[0].id}>
                      <SelectTrigger id="inspector">
                        <SelectValue placeholder={t("createDialog.selectInspector")} />
                      </SelectTrigger>
                      <SelectContent>
                        {MOCK_INSPECTORS.map((inspector) => (
                          <SelectItem key={inspector.id} value={inspector.id}>
                            <div className="flex items-center gap-2">
                              <User className="h-3 w-3" />
                              {inspector.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="inspectionType">{t("createDialog.inspectionType")}</Label>
                    <Select defaultValue="ROUTINE">
                      <SelectTrigger id="inspectionType">
                        <SelectValue placeholder={t("createDialog.selectType")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ROUTINE">{t("createDialog.types.routine")}</SelectItem>
                        <SelectItem value="SAFETY">{t("createDialog.types.safety")}</SelectItem>
                        <SelectItem value="COMPLIANCE">{t("createDialog.types.compliance")}</SelectItem>
                        <SelectItem value="FOLLOW_UP">{t("createDialog.types.followUp")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="scheduledDate">{t("createDialog.scheduledDate")}</Label>
                    <Input id="scheduledDate" type="date" required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="scope">{t("createDialog.scope")}</Label>
                  <Textarea
                    id="scope"
                    placeholder={t("createDialog.scopePlaceholder")}
                    className="min-h-[80px]"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">{t("createDialog.notes")}</Label>
                  <Input id="notes" placeholder={t("createDialog.notesPlaceholder")} />
                </div>
                <DialogFooter className="pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsCreateModalOpen(false)}>
                    {t("createDialog.cancel")}
                  </Button>
                  <Button type="submit" className="bg-rose-600 hover:bg-rose-500">{t("createDialog.submit")}</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <Card className="border-none shadow-xl bg-card/60 backdrop-blur-md overflow-hidden">
        <InspectionsTableHeader
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          recordCount={filteredInspections.length}
        />
        <TableInspections inspections={filteredInspections} searchQuery={searchQuery} />
      </Card>
    </div>
  );
}
