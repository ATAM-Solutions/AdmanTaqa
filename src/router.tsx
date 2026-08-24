import { createHashRouter } from "react-router-dom";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import RouteAccessGuard from "./components/RouteAccessGuard";
import RouteErrorBoundary from "./components/RouteErrorBoundary";
import NotFound from "./pages/NotFound/NotFound";
import Login from "./pages/Auth/Login";
import Register from "./pages/Auth/Register";
import Profile from "./pages/Profile/Profile";

// ---------- Authority   ----------

import OrganizationDetails from "./pages/Authority/Organizations/OrganizationDetails";
import Organizations from "./pages/Authority/Organizations/Organizations";
import OrganizationsRejected from "./pages/Authority/Organizations/OrganizationsRejected";
import FuelStations from "./pages/Authority/FuelStations/FuelStations";
import FuelStationsPending from "./pages/Authority/FuelStations/FuelStationsPending";
import FuelStationsRejected from "./pages/Authority/FuelStations/FuelStationsRejected";
import RegistrationsPage from "./pages/Registrations/RegistrationsPage";
import RegistrationDetailPage from "./pages/Registrations/RegistrationDetailPage";
import OnboardingPage from "./pages/Onboarding/OnboardingPage";
import OnboardingDetails from "./pages/Onboarding/OnboardingDetails";
// import JobOrders from "./pages/JobOrders/JobOrders";
// import JobOrderDetails from "./pages/JobOrders/JobOrderDetails";
import AuthorityExternalJobOrders from "./pages/Authority/ExternalJobOrders/AuthorityExternalJobOrders";
import AuthorityExternalJobOrderDetail from "./pages/Authority/ExternalJobOrders/AuthorityExternalJobOrderDetail";
// import Inspections from "./pages/Inspections/Inspections";
import AuditLog from "./pages/AuditLog/AuditLog";

// ---------- Service Provider   ----------
import Users from "./pages/Users/Users";
import UserDetails from "./pages/Users/UserDetails";
import UpdateUser from "./pages/Users/UpdateUser";
import Roles from "./pages/Roles/Roles";
import CreateCustomRole from "./pages/Roles/CreateCustomRole";
import RoleDetails from "./pages/Roles/RoleDetails";
import EditRole from "./pages/Roles/EditRole";
import ServiceCategories from "./pages/ServiceCategories/ServiceCategories";
import ProviderRfqs from "./pages/Provider/ProviderRfqs";
import ProviderRfqDetail from "./pages/Provider/ProviderRfqDetail";
import ProviderJobOrders from "./pages/Provider/ProviderJobOrders";
import ProviderJobOrderDetail from "./pages/Provider/ProviderJobOrderDetail";
import Locations from "./pages/Locations/Locations";
import LinkedProviders from "./pages/Station/LinkedProviders";

// ---------- Fuel Station (محطة الوقود) ----------
import Branches from "./pages/Branches/Branches";
import CreateBranch from "./pages/Branches/CreateBranch";
import BranchDetails from "./pages/Branches/BranchDetails";
import EditBranch from "./pages/Branches/EditBranch";
import BranchRequests from "./pages/BranchRequests/BranchRequests";
import CreateBranchRequest from "./pages/BranchRequests/CreateBranchRequest";
import BranchRequestDetails from "./pages/BranchRequests/BranchRequestDetails";
import InternalWorkOrders from "./pages/Station/InternalWorkOrders";
import InternalWorkOrdersReviewQueue from "./pages/Station/InternalWorkOrdersReviewQueue";
import InternalWorkOrderDetail from "./pages/Station/InternalWorkOrderDetail";
import StationRequests from "./pages/Station/StationRequests";
import CreateMaintenanceRequest from "./pages/Station/CreateMaintenanceRequest";
import StationRequestDetail from "./pages/Station/StationRequestDetail";
import StationJobOrders from "./pages/Station/StationJobOrders";
import StationJobOrderDetail from "./pages/Station/StationJobOrderDetail";

// ---------- Shared (مشترك: Authority + Service Provider) ----------
import Quotations from "./pages/Quotations/Quotations";
import QuotationDetail from "./pages/Quotations/QuotationDetail";

export const router = createHashRouter([
  {
    path: "/login",
    element: <Login />,
  },
  {
    path: "/register",
    element: <Register />,
  },
  {
    path: "/",
    element: (
      <ProtectedRoute>
        <Layout />
      </ProtectedRoute>
    ),
    errorElement: <RouteErrorBoundary />,
    children: [
      // ---------- Common (للجميع) ----------
      {
        index: true,
        element: <Profile />,
      },
      {
        path: "profile",
        element: <Profile />,
      },

      // ---------- Authority (هيئة) ----------
      {
        path: "organizations",
        element: (
          <RouteAccessGuard pathKey="organizations">
            <Organizations />
          </RouteAccessGuard>
        ),
      },
      {
        path: "organizations/rejected",
        element: (
          <RouteAccessGuard pathKey="organizations/rejected">
            <OrganizationsRejected />
          </RouteAccessGuard>
        ),
      },
      {
        path: "organizations/:id",
        element: (
          <RouteAccessGuard pathKey="organizations/:id">
            <OrganizationDetails />
          </RouteAccessGuard>
        ),
      },
      {
        path: "fuel-stations",
        element: (
          <RouteAccessGuard pathKey="fuel-stations">
            <FuelStations />
          </RouteAccessGuard>
        ),
      },
      {
        path: "fuel-stations/pending",
        element: (
          <RouteAccessGuard pathKey="fuel-stations/pending">
            <FuelStationsPending />
          </RouteAccessGuard>
        ),
      },
      {
        path: "fuel-stations/rejected",
        element: (
          <RouteAccessGuard pathKey="fuel-stations/rejected">
            <FuelStationsRejected />
          </RouteAccessGuard>
        ),
      },
      {
        path: "fuel-stations/:id",
        element: (
          <RouteAccessGuard pathKey="fuel-stations/:id">
            <OrganizationDetails />
          </RouteAccessGuard>
        ),
      },
      {
        path: "registrations",
        element: (
          <RouteAccessGuard pathKey="registrations">
            <RegistrationsPage />
          </RouteAccessGuard>
        ),
      },
      {
        path: "registrations/:id",
        element: (
          <RouteAccessGuard pathKey="registrations/:id">
            <RegistrationDetailPage />
          </RouteAccessGuard>
        ),
      },
      {
        path: "onboarding",
        element: (
          <RouteAccessGuard pathKey="onboarding">
            <OnboardingPage />
          </RouteAccessGuard>
        ),
      },
      {
        path: "onboarding/:id",
        element: (
          <RouteAccessGuard pathKey="onboarding/:id">
            <OnboardingDetails />
          </RouteAccessGuard>
        ),
      },
      // {
      //   path: "job-orders",
      //   element: (
      //     <RouteAccessGuard pathKey="job-orders">
      //       <JobOrders />
      //     </RouteAccessGuard>
      //   ),
      // },
      // {
      //   path: "job-orders/:id",
      //   element: (
      //     <RouteAccessGuard pathKey="job-orders/:id">
      //       <JobOrderDetails />
      //     </RouteAccessGuard>
      //   ),
      // },
      {
        path: "external-job-orders",
        element: (
          <RouteAccessGuard pathKey="external-job-orders">
            <AuthorityExternalJobOrders />
          </RouteAccessGuard>
        ),
      },
      {
        path: "external-job-orders/:id",
        element: (
          <RouteAccessGuard pathKey="external-job-orders/:id">
            <AuthorityExternalJobOrderDetail />
          </RouteAccessGuard>
        ),
      },
      // {
      //   path: "inspections",
      //   element: (
      //     <RouteAccessGuard pathKey="inspections">
      //       <Inspections />
      //     </RouteAccessGuard>
      //   ),
      // },
      {
        path: "audit-log",
        element: (
          <RouteAccessGuard pathKey="audit-log">
            <AuditLog />
          </RouteAccessGuard>
        ),
      },

      // ---------- Service Provider (مزود الخدمة) ----------
      {
        path: "users",
        element: (
          <RouteAccessGuard pathKey="users">
            <Users />
          </RouteAccessGuard>
        ),
      },
      {
        path: "users/:id",
        element: (
          <RouteAccessGuard pathKey="users/:id">
            <UserDetails />
          </RouteAccessGuard>
        ),
      },
      {
        path: "users/:id/edit",
        element: (
          <RouteAccessGuard pathKey="users/:id/edit">
            <UpdateUser />
          </RouteAccessGuard>
        ),
      },
      {
        path: "roles",
        element: (
          <RouteAccessGuard pathKey="roles">
            <Roles />
          </RouteAccessGuard>
        ),
      },
      {
        path: "roles/create",
        element: (
          <RouteAccessGuard pathKey="roles/create">
            <CreateCustomRole />
          </RouteAccessGuard>
        ),
      },
      {
        path: "roles/:id",
        element: (
          <RouteAccessGuard pathKey="roles/:id">
            <RoleDetails />
          </RouteAccessGuard>
        ),
      },
      {
        path: "roles/:id/edit",
        element: (
          <RouteAccessGuard pathKey="roles/:id/edit">
            <EditRole />
          </RouteAccessGuard>
        ),
      },
      {
        path: "service-categories",
        element: (
          <RouteAccessGuard pathKey="service-categories">
            <ServiceCategories />
          </RouteAccessGuard>
        ),
      },
      {
        path: "provider-rfqs",
        element: (
          <RouteAccessGuard pathKey="provider-rfqs">
            <ProviderRfqs />
          </RouteAccessGuard>
        ),
      },
      {
        path: "provider-rfqs/:id",
        element: (
          <RouteAccessGuard pathKey="provider-rfqs/:id">
            <ProviderRfqDetail />
          </RouteAccessGuard>
        ),
      },
      {
        path: "provider-job-orders",
        element: (
          <RouteAccessGuard pathKey="provider-job-orders">
            <ProviderJobOrders />
          </RouteAccessGuard>
        ),
      },
      {
        path: "provider-job-orders/:id",
        element: (
          <RouteAccessGuard pathKey="provider-job-orders/:id">
            <ProviderJobOrderDetail />
          </RouteAccessGuard>
        ),
      },
      {
        path: "locations",
        element: (
          <RouteAccessGuard pathKey="locations">
            <Locations />
          </RouteAccessGuard>
        ),
      },
      {
        path: "linked-providers",
        element: (
          <RouteAccessGuard pathKey="linked-providers">
            <LinkedProviders />
          </RouteAccessGuard>
        ),
      },

      // ---------- Fuel Station (محطة الوقود) ----------
      {
        path: "branches",
        element: (
          <RouteAccessGuard pathKey="branches">
            <Branches />
          </RouteAccessGuard>
        ),
      },
      {
        path: "branches/create",
        element: (
          <RouteAccessGuard pathKey="branches/create">
            <CreateBranch />
          </RouteAccessGuard>
        ),
      },
      {
        path: "branches/:id",
        element: (
          <RouteAccessGuard pathKey="branches/:id">
            <BranchDetails />
          </RouteAccessGuard>
        ),
      },
      {
        path: "branches/:id/edit",
        element: (
          <RouteAccessGuard pathKey="branches/:id/edit">
            <EditBranch />
          </RouteAccessGuard>
        ),
      },
      {
        path: "branch-requests",
        element: (
          <RouteAccessGuard pathKey="branch-requests">
            <BranchRequests />
          </RouteAccessGuard>
        ),
      },
      {
        path: "branch-requests/create",
        element: (
          <RouteAccessGuard pathKey="branch-requests/create">
            <CreateBranchRequest />
          </RouteAccessGuard>
        ),
      },
      {
        path: "branch-requests/:id",
        element: (
          <RouteAccessGuard pathKey="branch-requests/:id">
            <BranchRequestDetails />
          </RouteAccessGuard>
        ),
      },
      {
        path: "internal-work-orders",
        element: (
          <RouteAccessGuard pathKey="internal-work-orders">
            <InternalWorkOrders />
          </RouteAccessGuard>
        ),
      },
      {
        path: "internal-work-orders/review-queue",
        element: (
          <RouteAccessGuard pathKey="internal-work-orders/review-queue">
            <InternalWorkOrdersReviewQueue />
          </RouteAccessGuard>
        ),
      },
      {
        path: "internal-work-orders/:id",
        element: (
          <RouteAccessGuard pathKey="internal-work-orders/:id">
            <InternalWorkOrderDetail />
          </RouteAccessGuard>
        ),
      },
      {
        path: "station-requests",
        element: (
          <RouteAccessGuard pathKey="station-requests">
            <StationRequests />
          </RouteAccessGuard>
        ),
      },
      {
        path: "station-requests/create",
        element: (
          <RouteAccessGuard pathKey="station-requests/create">
            <CreateMaintenanceRequest />
          </RouteAccessGuard>
        ),
      },
      {
        path: "station-requests/:id",
        element: (
          <RouteAccessGuard pathKey="station-requests/:id">
            <StationRequestDetail />
          </RouteAccessGuard>
        ),
      },
      {
        path: "station-job-orders",
        element: (
          <RouteAccessGuard pathKey="station-job-orders">
            <StationJobOrders />
          </RouteAccessGuard>
        ),
      },
      {
        path: "station-job-orders/:id",
        element: (
          <RouteAccessGuard pathKey="station-job-orders/:id">
            <StationJobOrderDetail />
          </RouteAccessGuard>
        ),
      },

      // ---------- Shared (مشترك: Authority + Service Provider + Fuel Station) ----------
      {
        path: "quotations",
        element: (
          <RouteAccessGuard pathKey="quotations">
            <Quotations />
          </RouteAccessGuard>
        ),
      },
      {
        path: "quotations/:id",
        element: (
          <RouteAccessGuard pathKey="quotations/:id">
            <QuotationDetail />
          </RouteAccessGuard>
        ),
      },

      // ---------- Catch-all ----------
      {
        path: "*",
        element: <NotFound />,
      },
    ],
  },
]);
