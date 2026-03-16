import React from "react";
import { Activity } from "lucide-react";

const LoadingSpinner: React.FC = () => {
	return (
		<div className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-deepIndigo/80 backdrop-blur-md">
			<div className="relative flex items-center justify-center">
				{/* Outer spinning ring */}
				<div className="w-16 h-16 rounded-full border-t-2 border-r-2 border-royalBlue animate-spin opacity-40"></div>
				
				{/* Inner counter-spinning ring */}
				<div className="absolute w-12 h-12 rounded-full border-b-2 border-l-2 border-magentaViolet animate-spin-reverse opacity-40"></div>
				
				{/* Center icon with pulse */}
				<div className="absolute flex items-center justify-center">
					<Activity className="w-6 h-6 text-royalBlue animate-pulse" />
				</div>
			</div>
			
			<div className="mt-8 text-center space-y-2">
				<p className="font-mono text-[9px] text-royalBlue/60 uppercase tracking-[0.4em] animate-pulse">
					Initializing_Secure_Nexus
				</p>
				<div className="w-32 h-0.5 bg-white/5 mx-auto rounded-full overflow-hidden">
					<div className="h-full bg-royalBlue w-1/3 animate-loading-bar rounded-full"></div>
				</div>
			</div>
		</div>
	);
};

export default LoadingSpinner;
