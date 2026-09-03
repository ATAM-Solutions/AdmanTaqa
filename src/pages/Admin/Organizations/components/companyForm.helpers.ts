import type { AdminOrganizationDetail, CreateAdminOrganizationBody, UpdateAdminOrganizationBody } from "@/types/adminOrganization";
import type { CompanyFormValues } from "./CompanyForm";

const emptyToNull = (v: string): string | null => (v.trim() === "" ? null : v.trim());

export function toCreateBody(v: CompanyFormValues): CreateAdminOrganizationBody {
  return {
    name: v.name.trim(),
    nameAr: emptyToNull(v.nameAr),
    type: v.type,
    status: v.status,
    email: emptyToNull(v.email),
    phone: emptyToNull(v.phone),
    address: emptyToNull(v.address),
    cityId: v.cityId ?? null,
    registrationNumber: emptyToNull(v.registrationNumber),
  };
}

export function toUpdateBody(v: CompanyFormValues): UpdateAdminOrganizationBody {
  return {
    name: v.name.trim(),
    nameAr: emptyToNull(v.nameAr),
    status: v.status,
    email: emptyToNull(v.email),
    phone: emptyToNull(v.phone),
    address: emptyToNull(v.address),
    cityId: v.cityId ?? null,
    registrationNumber: emptyToNull(v.registrationNumber),
    rejectionReason: v.status === "REJECTED" ? emptyToNull(v.rejectionReason) : null,
  };
}

export function detailToFormValues(org: AdminOrganizationDetail): CompanyFormValues {
  return {
    name: org.name ?? "",
    nameAr: org.nameAr ?? "",
    type: org.type,
    status: org.status,
    registrationNumber: org.registrationNumber ?? "",
    email: org.email ?? "",
    phone: org.phone ?? "",
    address: org.address ?? "",
    cityId: org.cityId ?? null,
    rejectionReason: org.rejectionReason ?? "",
  };
}
