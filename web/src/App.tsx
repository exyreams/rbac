import { Navigate, Route, Routes } from "react-router-dom";
import DashboardLayout from "./components/layouts/DashboardLayout";
import LandingLayout from "./components/layouts/LandingLayout";
import OrgLayout from "./components/layouts/OrgLayout";
import Dashboard from "./pages/Dashboard";
import PermissionCheckTool from "./pages/PermissionCheckTool";
import LandingPage from "./pages/LandingPage";
import MemberManagement from "./pages/organizations/MemberManagement";
import OrganizationDetail from "./pages/organizations/OrganizationDetail";
import OrganizationHistory from "./pages/organizations/OrganizationHistory";
import OrganizationSettings from "./pages/organizations/OrganizationSettings";
import RoleManagement from "./pages/organizations/RoleManagement";
import VaultDemo from "./pages/organizations/VaultDemo";

function App() {
	return (
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
	);
}

export default App;
