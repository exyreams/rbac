import { Outlet } from "react-router-dom";
import Footer from "./Footer";
import Header from "./Header";

export default function LandingLayout() {
	return (
		<div className="min-h-screen flex flex-col antialiased selection:bg-royalBlue selection:text-white">
			<Header />
			<main className="flex-grow">
				<Outlet />
			</main>
			<Footer />
		</div>
	);
}
