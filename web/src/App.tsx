import { Suspense, lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { QueryProvider } from "./components/layouts/QueryProvider";
import LoadingSpinner from "./components/common/LoadingSpinner";

// Layouts
const DashboardLayout = lazy(() => import("./components/layouts/DashboardLayout"));
const LandingLayout = lazy(() => import("./components/layouts/LandingLayout"));
const OrgLayout = lazy(() => import("./components/layouts/OrgLayout"));

// Pages
const Dashboard = lazy(() => import("./pages/Dashboard"));
const PermissionCheckTool = lazy(() => import("./pages/PermissionCheckTool"));
const LandingPage = lazy(() => import("./pages/LandingPage"));
const MemberManagement = lazy(() => import("./pages/organizations/MemberManagement"));
const OrganizationDetail = lazy(() => import("./pages/organizations/OrganizationDetail"));
const OrganizationHistory = lazy(() => import("./pages/organizations/OrganizationHistory"));
const OrganizationSettings = lazy(() => import("./pages/organizations/OrganizationSettings"));
const RoleManagement = lazy(() => import("./pages/organizations/RoleManagement"));
const VaultDemo = lazy(() => import("./pages/organizations/VaultDemo"));

function App() {
	return (
		<QueryProvider>
			<Suspense fallback={<LoadingSpinner />}>
				<Routes>
					<Route element={<LandingLayout />}>
						<Route path="/" element={<LandingPage />} />
					</Route>

					<Route element={<DashboardLayout />}>
						<Route path="/dashboard" element={<Dashboard />} />
						<Route path="/organizations" element={<Navigate to="/dashboard" replace />} />
						<Route path="/admin" element={<Navigate to="/dashboard" replace />} />

						<Route path="/org/:id" element={<OrgLayout />}>
							<Route index element={<OrganizationDetail />} />
							<Route path="history" element={<OrganizationHistory />} />
							<Route path="roles" element={<RoleManagement />} />
							<Route path="members" element={<MemberManagement />} />
							<Route path="vaults" element={<VaultDemo />} />
							<Route path="settings" element={<OrganizationSettings />} />
						</Route>

						<Route path="/check" element={<PermissionCheckTool />} />
					</Route>

					{/* Catch-all route to redirect back if not found to avoid blank pages during dev */}
					<Route path="*" element={<Navigate to="/dashboard" replace />} />
				</Routes>
			</Suspense>
		</QueryProvider>
	);
}

export default App;
