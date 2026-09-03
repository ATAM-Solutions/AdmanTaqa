/** Landing route after login: dashboards for every org type that has one, profile otherwise. */
export function getHomePath(organizationType: string | undefined | null): string {
  switch (organizationType) {
    case "SUPER_ADMIN":
    case "FUEL_STATION":
    case "SERVICE_PROVIDER":
      return "/dashboard";
    default:
      return "/profile";
  }
}
