import React, { Suspense, lazy } from "react";

// Lazy imports for code splitting
const MapContainer = lazy(() => import("@/components/map_components/MapContainer"));
const SocialMediaReports = lazy(() =>
  import("@/components/social_data_service_components/SocialMediaReports")
);
const ResponseAgentManagement = lazy(() =>
  import("@/components/response_agent_components/ResponseAgentManagement")
);

function Dashboard() {
  return (
    <div className="bg-light-primary dark:bg-dark-primary h-screen">
      <div className="max-w-screen-2xl mx-auto h-full flex flex-col p-4 text-light-text-primary dark:text-dark-text-primary">
        <Suspense fallback={<div>Loading...</div>}>
          <div className="flex-1 flex gap-4 mb-4">
            {/* Map Container: flex-1 so it expands fully */}
            <div className="flex-1 bg-light-secondary dark:bg-dark-secondary p-4 rounded-md">
              <MapContainer />
            </div>

            {/* Right side container for Social Media Reports and Response Agent Management */}
            <div className="flex flex-col w-1/3 space-y-4">
              <SocialMediaReports />
              <ResponseAgentManagement />
            </div>
          </div>
        </Suspense>
      </div>
    </div>
  );
}

export default Dashboard;
