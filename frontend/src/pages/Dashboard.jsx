import React, { Suspense, lazy } from "react";

// Lazy imports for code splitting
const MapContainer = lazy(() => import("@/components/map_components/MapContainer"));
const SocialMediaReports = lazy(() =>
  import("@/components/social_data_service_components/SocialMediaReports")
);
const ResponseAgentManagement = lazy(() =>
  import("@/components/response_agent_components/ResponseAgentManagement")
);
const PerformanceMetrics = lazy(() => import("@/components/PerformanceMetrics"));

function Dashboard() {
  return (
    <div className="bg-light-primary dark:bg-dark-primary h-screen">
     
      <div className="max-w-screen-2xl mx-auto h-full flex flex-col p-4 text-light-text-primary dark:text-dark-text-primary">
        <Suspense fallback={<div>Loading...</div>}>
          
          
          <div className="flex-1 flex gap-4 mb-4">
            {/* Map Container: flex-1 so it expands fully */}
            <div className="flex-1 bg-light-secondary dark:bg-dark-secondary p-4 rounded-md flex">
              <MapContainer />
            </div>

            {/* Social Media Reports: fixed width proportion (1/3) */}
            <div className="w-1/3 flex flex-col space-y-4">
              <SocialMediaReports />
            </div>
          </div>

          <div className="flex-none flex gap-4">
            <div className="w-2/3">
              <ResponseAgentManagement />
            </div>
            <div className="w-1/3">
              <PerformanceMetrics />
            </div>
          </div>
        </Suspense>
      </div>
    </div>
  );
}

export default Dashboard;
