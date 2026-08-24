import { Trans, useTranslation } from "react-i18next";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

type TablePaginationProps = {
  currentPage: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  /** Optional: 1-based start index for "Showing X–Y of Z" (default: (currentPage-1)*pageSize + 1) */
  startIndex?: number;
};

export default function TablePagination({
  currentPage,
  totalPages,
  total,
  pageSize,
  onPageChange,
  startIndex,
}: TablePaginationProps) {
  const { t } = useTranslation();
  const start = startIndex ?? (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, total);

  if (totalPages <= 0 && total <= 0) return null;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-2 py-3 px-4 border-t bg-muted/20">
      <p className="text-sm text-muted-foreground">
        {total === 0 ? (
          t("tablePagination.noItems")
        ) : (
          <Trans
            i18nKey="tablePagination.showing"
            values={{ start, end, total }}
            components={{ b: <span className="font-medium" /> }}
          />
        )}
      </p>
      {totalPages > 1 && (
        <Pagination className="justify-end w-auto mx-0">
          <PaginationContent className="gap-1">
            <PaginationItem>
              <PaginationPrevious
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  if (currentPage > 1) onPageChange(currentPage - 1);
                }}
                className={
                  currentPage === 1
                    ? "pointer-events-none opacity-50"
                    : "cursor-pointer hover:bg-muted/50 rounded-md"
                }
              />
            </PaginationItem>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <PaginationItem key={page}>
                <PaginationLink
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    onPageChange(page);
                  }}
                  isActive={currentPage === page}
                  className="cursor-pointer rounded-md"
                >
                  {page}
                </PaginationLink>
              </PaginationItem>
            ))}
            <PaginationItem>
              <PaginationNext
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  if (currentPage < totalPages) onPageChange(currentPage + 1);
                }}
                className={
                  currentPage === totalPages
                    ? "pointer-events-none opacity-50"
                    : "cursor-pointer hover:bg-muted/50 rounded-md"
                }
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
}
