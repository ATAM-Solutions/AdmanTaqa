import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import type { OnboardingItem } from "@/types/onboarding";
import {
  useGetOnboarding,
  useCreateOnboarding,
  useCreateOnboardingWithImage,
  useUpdateOnboarding,
  useUpdateOnboardingWithImage,
  useDeleteOnboarding,
} from "@/hooks/Onboarding";
import { ACCEPTED_IMAGE_TYPES, MAX_IMAGE_SIZE } from "./constants";
import { defaultOnboardingFormValues, type OnboardingFormValues } from "./schema";
import { DEFAULT_PAGE_SIZE } from "@/types/pagination";
import TablePagination from "@/components/TablePagination";
import OnboardingPageHeader from "./component/OnboardingPageHeader";
import OnboardingTable from "./component/OnboardingTable";
import CreateOnboardingDialog from "./component/CreateOnboardingDialog";
import EditOnboardingDialog from "./component/EditOnboardingDialog";
import DeleteOnboardingDialog from "./component/DeleteOnboardingDialog";

export default function OnboardingPage() {
  const { t } = useTranslation("onboarding");
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(DEFAULT_PAGE_SIZE);

  const { data: paginatedResponse, isLoading: loading } = useGetOnboarding(currentPage, pageSize, true);
  const items = paginatedResponse?.data ?? [];
  const totalFromApi = paginatedResponse?.total ?? 0;
  const totalPagesFromApi = paginatedResponse?.totalPages ?? 1;

  const createMutation = useCreateOnboarding();
  const createWithImageMutation = useCreateOnboardingWithImage();
  const updateMutation = useUpdateOnboarding();
  const updateWithImageMutation = useUpdateOnboardingWithImage();
  const deleteMutation = useDeleteOnboarding();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<OnboardingItem | null>(null);
  const [deletingItem, setDeletingItem] = useState<OnboardingItem | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [editIsDragging, setEditIsDragging] = useState(false);
  const createFileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  const submitting =
    createMutation.isPending ||
    createWithImageMutation.isPending ||
    updateMutation.isPending ||
    updateWithImageMutation.isPending ||
    deleteMutation.isPending;

  const filtered = (Array.isArray(items) ? items : []).filter(
    (item) =>
      item.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.description ?? "").toLowerCase().includes(searchQuery.toLowerCase())
  );
  const totalFiltered = filtered.length;
  const displayPage = currentPage;
  const paginatedItems = searchQuery.trim() ? filtered : items;

  const validateImageFile = (file: File): boolean => {
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      toast.error(t("toasts.invalidFileType"));
      return false;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      toast.error(t("toasts.imageTooLarge"));
      return false;
    }
    return true;
  };

  const openEdit = (item: OnboardingItem) => {
    setEditingItem(item);
    setIsEditOpen(true);
  };

  const closeEdit = () => {
    setIsEditOpen(false);
    setEditingItem(null);
  };

  const getEditInitialValues = (item: OnboardingItem | null): OnboardingFormValues =>
    item
      ? {
          title: item.title ?? "",
          description: item.description ?? "",
          content: item.content ?? "",
          order: item.order ?? 0,
          isActive: item.isActive ?? true,
          imageUrl: item.imageUrl ?? "",
        }
      : defaultOnboardingFormValues;

  const openDelete = (item: OnboardingItem) => {
    setDeletingItem(item);
    setIsDeleteOpen(true);
  };

  const closeDelete = () => {
    setIsDeleteOpen(false);
    setDeletingItem(null);
  };

  const handleCreate = async (data: OnboardingFormValues, imageFile: File | null) => {
    try {
      if (imageFile) {
        const fd = new FormData();
        fd.append("title", data.title);
        if (data.description) fd.append("description", data.description);
        if (data.content) fd.append("content", data.content);
        fd.append("order", String(data.order ?? 0));
        fd.append("isActive", String(data.isActive ?? true));
        fd.append("image", imageFile);
        await createWithImageMutation.mutateAsync(fd);
      } else {
        await createMutation.mutateAsync({
          title: data.title,
          description: data.description || undefined,
          content: data.content || undefined,
          order: data.order ?? 0,
          isActive: data.isActive ?? true,
          imageUrl: data.imageUrl || undefined,
        });
      }
      setIsCreateOpen(false);
    } catch {
      // toast handled in hook
    }
  };

  const handleUpdate = async (data: OnboardingFormValues, imageFile: File | null) => {
    if (!editingItem) return;
    try {
      if (imageFile) {
        const fd = new FormData();
        fd.append("title", data.title);
        if (data.description) fd.append("description", data.description);
        if (data.content) fd.append("content", data.content);
        fd.append("order", String(data.order ?? 0));
        fd.append("isActive", String(data.isActive ?? true));
        fd.append("image", imageFile);
        await updateWithImageMutation.mutateAsync({ id: editingItem.id, formData: fd });
      } else {
        await updateMutation.mutateAsync({
          id: editingItem.id,
          body: {
            title: data.title,
            description: data.description || undefined,
            content: data.content || undefined,
            order: data.order ?? 0,
            isActive: data.isActive ?? true,
            imageUrl: data.imageUrl || undefined,
          },
        });
      }
      closeEdit();
    } catch {
      // toast handled in hook
    }
  };

  const handleDelete = async () => {
    if (!deletingItem) {
      toast.error(t("toasts.noItemSelected"));
      return;
    }
    try {
      await deleteMutation.mutateAsync(deletingItem.id);
      closeDelete();
    } catch {
      // toast handled in hook
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-6 animate-in fade-in duration-500">
      
      <OnboardingPageHeader>
        <CreateOnboardingDialog
          open={isCreateOpen}
          onOpenChange={setIsCreateOpen}
          isDragging={isDragging}
          setIsDragging={setIsDragging}
          validateImageFile={validateImageFile}
          onSubmit={handleCreate}
          onCancel={() => setIsCreateOpen(false)}
          submitting={submitting}
          fileInputRef={createFileInputRef}
          trigger={
            <Button className="gap-2 shadow-sm">
              <Plus className="h-4 w-4" />
              {t("page.addItem")}
            </Button>
          }
        />
      </OnboardingPageHeader>

      <OnboardingTable
        items={paginatedItems}
        loading={loading}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onView={(item) => navigate(`/onboarding/${item.id}`)}
        onEdit={openEdit}
        onDelete={openDelete}
        pagination={
          <TablePagination
            currentPage={displayPage}
            totalPages={searchQuery.trim() ? Math.ceil(totalFiltered / pageSize) || 1 : totalPagesFromApi}
            total={searchQuery.trim() ? totalFiltered : totalFromApi}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
          />
        }
      />

      <EditOnboardingDialog
        open={isEditOpen}
        onOpenChange={(o) => !o && closeEdit()}
        initialValues={getEditInitialValues(editingItem)}
        editingItem={editingItem}
        isDragging={editIsDragging}
        setIsDragging={setEditIsDragging}
        validateImageFile={validateImageFile}
        onSubmit={handleUpdate}
        onCancel={closeEdit}
        submitting={submitting}
        fileInputRef={editFileInputRef}
      />

      <DeleteOnboardingDialog
        open={isDeleteOpen}
        onOpenChange={(o) => !o && closeDelete()}
        item={deletingItem}
        onConfirm={handleDelete}
        onCancel={closeDelete}
        submitting={submitting}
      />

    </div>
  );
}
