import type { TFunction } from "i18next";
import { classifyAssetError, type AssetErrorKind } from "@/lib/assets";

/** Translated message for an API failure (by stable status/code). */
export function assetErrorMessage(t: TFunction, error: unknown): string {
  const { kind } = classifyAssetError(error);
  const key: Record<AssetErrorKind, string> = {
    warrantyDuplicate: "errors.warrantyDuplicate",
    warrantyProvider: "errors.warrantyProvider",
    warrantyDate: "errors.warrantyDate",
    warrantyRange: "errors.warrantyRange",
    conflict: "errors.conflict",
    validation: "errors.validation",
    unsafeUrl: "errors.unsafeUrl",
    branchDenied: "errors.branchDenied",
    forbidden: "errors.forbidden",
    unavailable: "errors.unavailable",
    notFound: "errors.notFound",
    network: "errors.network",
    server: "errors.server",
  };
  return t(key[kind]);
}
