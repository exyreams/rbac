import { Navigate, Route, Routes } from "react-router-dom";
import DashboardLayout from "./layouts/DashboardLayout";
import LandingLayout from "./layouts/LandingLayout";
import OrgLayout from "./layouts/OrgLayout";
import AdminDashboard from "./pages/AdminDashboard";
import PermissionCheckTool from "./pages/PermissionCheckTool";
import LandingPage from "./pages/LandingPage";
import MemberManagement from "./pages/organizations/MemberManagement";
import OrganizationDetail from "./pages/organizations/OrganizationDetail";
import OrganizationSettings from "./pages/organizations/OrganizationSettings";
import OrganizationsDashboard from "./pages/organizations/OrganizationsDashboard";
import RoleManagement from "./pages/organizations/RoleManagement";
import VaultDemo from "./pages/organizations/VaultDemo";
import UserProfile from "./pages/UserProfile";

function App() {
	return (
		<Routes>
			<Route element={<LandingLayout />}>
				<Route path="/" element={<LandingPage />} />
			</Route>

			<Route element={<DashboardLayout />}>
				<Route path="/organizations" element={<OrganizationsDashboard />} />

				<Route path="/org/:id" element={<OrgLayout />}>
					<Route index element={<OrganizationDetail />} />
					<Route path="roles" element={<RoleManagement />} />
					<Route path="members" element={<MemberManagement />} />
					<Route path="vaults" element={<VaultDemo />} />
					<Route path="settings" element={<OrganizationSettings />} />
				</Route>

				<Route path="/profile" element={<UserProfile />} />
				<Route path="/check" element={<PermissionCheckTool />} />
				<Route path="/admin" element={<AdminDashboard />} />
			</Route>

			{/* Catch-all route to redirect back if not found to avoid blank pages during dev */}
			<Route path="*" element={<Navigate to="/" replace />} />
		</Routes>
	);
}

export default App;
