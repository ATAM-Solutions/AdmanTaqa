import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import useGetBranches from "@/hooks/Branches/useGetBranches";
import { getBranchDisplayName } from "@/lib/company";

type BranchSelectProps = {
  value: string;
  onValueChange: (value: string) => void;
  id?: string;
  placeholder?: string;
  disabled?: boolean;
  /** Offer an explicit "no branch" entry (value ""), for optional branch fields. */
  allowEmpty?: boolean;
  emptyLabel?: string;
};

/**
 * Station picker backed by the server-scoped GET /branches lookup, with the four states a
 * dependent form needs: loading, load failure (retryable — never silently shown as "empty"),
 * genuinely empty, and ready. A failed request used to render as an empty dropdown that looked
 * identical to "you have no stations".
 */
export default function BranchSelect({
  value,
  onValueChange,
  id,
  placeholder,
  disabled,
  allowEmpty,
  emptyLabel,
}: BranchSelectProps) {
  const { t, i18n } = useTranslation("common");
  const { data: branches = [], isLoading, isError, refetch, isFetching } = useGetBranches();

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">{t("branchSelect.loading")}</p>;
  }
  if (isError) {
    return (
      <div className="flex items-center gap-3 text-sm text-destructive" role="alert">
        <span>{t("branchSelect.loadFailed")}</span>
        <Button type="button" variant="outline" size="sm" disabled={isFetching} onClick={() => refetch()}>
          {t("branchSelect.retry")}
        </Button>
      </div>
    );
  }
  if (branches.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("branchSelect.empty")}</p>;
  }

  return (
    <Select value={value} onValueChange={(v) => onValueChange(v === "__none__" ? "" : v)} disabled={disabled}>
      <SelectTrigger id={id}>
        <SelectValue placeholder={placeholder ?? t("branchSelect.placeholder")} />
      </SelectTrigger>
      <SelectContent>
        {allowEmpty && <SelectItem value="__none__">{emptyLabel ?? t("branchSelect.none")}</SelectItem>}
        {branches.map((b) => (
          <SelectItem key={b.id} value={String(b.id)}>
            {getBranchDisplayName(b, i18n.language) || `#${b.id}`}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
