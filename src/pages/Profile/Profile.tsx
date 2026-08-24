import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import useGetOrganizationFull from "@/hooks/Organization/useGetOrganizationFull";
import useDeleteServiceProviderProfile from "@/hooks/Organization/useDeleteServiceProviderProfile";
import { useAuth } from "@/context/AuthContext";
import { MoreVertical, AlertCircle, Pencil, Trash2, UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import EditOrganizationModal from "./components/EditOrganizationModal";
import UnifiedProfileCard from "./components/UnifiedProfileCard";
import DeleteAccountDialog from "../Users/component/DeleteAccountDialog";

export default function Profile() {
    const { t } = useTranslation("profile");
    const { user: currentUser } = useAuth();
    const { data: organizationResponse, isLoading } = useGetOrganizationFull();
    const organization = organizationResponse?.data;
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [deleteAccountOpen, setDeleteAccountOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const deleteMutation = useDeleteServiceProviderProfile();

    const isPendingApproval = organization && organization.status !== "APPROVED";
    const isServiceProvider = organization?.type === "SERVICE_PROVIDER";
    const hasSPProfile = !!organization?.ServiceProviderProfile?.id;

    useEffect(() => {
        if (!menuOpen) return;
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setMenuOpen(false);
            }
        };
        document.addEventListener("click", handleClickOutside);
        return () => document.removeEventListener("click", handleClickOutside);
    }, [menuOpen]);

    const handleDeleteConfirm = () => {
        if (!organization?.id) return;
        deleteMutation.mutate(organization.id, {
            onSuccess: () => {
                setDeleteConfirmOpen(false);
                toast.success(t("toasts.spProfileDeleted"));
            },
        });
    };

    if (isLoading) {
        return (
            <div className="flex h-[400px] items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            </div>
        );
    }

    return (
        <div className="px-8 py-8 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">{t("page.title")}</h1>
                    <p className="text-muted-foreground">{t("page.subtitle")}</p>
                </div>
                <div className="relative flex items-center gap-1" ref={menuRef}>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setMenuOpen((o) => !o)}
                        className="h-10 w-10 rounded-full"
                    >
                        <MoreVertical className="h-5 w-5" />
                    </Button>
                    {menuOpen && (
                        <div className="absolute end-0 top-full z-50 mt-1 min-w-[160px] rounded-md border bg-popover py-1 text-popover-foreground shadow-md">
                            <button
                                type="button"
                                className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent"
                                onClick={() => {
                                    setMenuOpen(false);
                                    setIsEditModalOpen(true);
                                }}
                            >
                                <Pencil className="h-4 w-4" /> {t("menu.edit")}
                            </button>
                            {isServiceProvider && hasSPProfile && (
                                <button
                                    type="button"
                                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-accent"
                                    onClick={() => {
                                        setMenuOpen(false);
                                        setDeleteConfirmOpen(true);
                                    }}
                                >
                                    <Trash2 className="h-4 w-4" /> {t("menu.delete")}
                                </button>
                            )}
                            <button
                                type="button"
                                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-accent"
                                onClick={() => {
                                    setMenuOpen(false);
                                    setDeleteAccountOpen(true);
                                }}
                            >
                                <UserX className="h-4 w-4" /> {t("menu.deleteAccount")}
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {isPendingApproval && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 p-4 flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-500 shrink-0 mt-0.5" />
                    <div>
                        <p className="font-semibold text-amber-800 dark:text-amber-200">
                            {t("pendingBanner.title")}
                        </p>
                        <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                            {t("pendingBanner.description")}
                        </p>
                    </div>
                </div>
            )}

            <UnifiedProfileCard organization={organization} isLoading={isLoading} />

            <EditOrganizationModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                currentName={organization?.name || ""}
                organizationType={organization?.type}
                organizationId={organization?.id}
                initialServiceProviderProfile={organization?.ServiceProviderProfile ?? null}
            />

            <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t("deleteSpDialog.title")}</DialogTitle>
                        <DialogDescription>{t("deleteSpDialog.description")}</DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>
                            {t("deleteSpDialog.cancel")}
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleDeleteConfirm}
                            disabled={deleteMutation.isPending}
                        >
                            {deleteMutation.isPending ? t("deleteSpDialog.deleting") : t("deleteSpDialog.delete")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {currentUser && (
                <DeleteAccountDialog
                    open={deleteAccountOpen}
                    onOpenChange={setDeleteAccountOpen}
                    userId={currentUser.id}
                />
            )}
        </div>
    );
}
