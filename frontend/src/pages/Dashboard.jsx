import React, { Suspense, lazy, useState } from "react";
import { Menu, X } from 'lucide-react';

const MapContainer = lazy(() => import("@/components/map_components/MapContainer"));
const SocialMediaReports = lazy(() => import("@/components/social_data_service_components/SocialMediaReports"));
const ResponseAgentManagement = lazy(() => import("@/components/response_agent_components/ResponseAgentManagement"));

function Dashboard() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [rescueMarkers, setRescueMarkers] = useState([]);

  return (
    <div className="h-screen w-screen relative overflow-hidden">
      {/* Map Container */}
      <div className="absolute inset-0">
        <Suspense fallback={
          <div className="h-full w-full flex items-center justify-center bg-light-tertiary text-light-text-primary">
            Loading Map...
          </div>
        }>
          <MapContainer
            rescueMarkers={rescueMarkers}
            setRescueMarkers={setRescueMarkers}
          />
        </Suspense>
      </div>

      {/* Menu Button */}
      <button
        className={`absolute top-4 right-4 z-30 bg-dark-secondary text-light-text-inverted 
                    p-2 rounded-full shadow hover:bg-dark-secondary/20 transition 
                    ${isSidebarOpen ? 'hidden' : 'block'}`}
        onClick={() => setIsSidebarOpen(true)}
      >
        <Menu className="h-7 w-7 z-10" />
      </button>


      <div
        className={`absolute top-0 right-0 h-full max-w-6xl bg-black/30 backdrop-blur-lg 
              z-20 transform transition-transform duration-500 ease-in-out
              ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="h-14 bg-light-secondary dark:bg-dark-secondary flex items-center px-4 relative">
          <p className="text-light-text-primary dark:text-dark-text-primary font-medium mx-auto">
            Sidebar
          </p>
          <button
            className="absolute right-4 text-light-text-primary dark:text-dark-text-primary 
                 p-2 rounded-full hover:bg-light-secondary/40 dark:hover:bg-dark-secondary/40"
            onClick={() => setIsSidebarOpen(false)}
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Scrollable content area */}
        <div className="h-[calc(100%_-_3.5rem)] custom-scrollbar overflow-y-auto p-4">
          <div className="mb-4">
            <Suspense fallback={
              <div className="p-4 bg-light-tertiary text-light-text-primary rounded-lg">
                Loading Reports...
              </div>
            }>
              <SocialMediaReports />
            </Suspense>
          </div>
          <div className="mb-4">
            <Suspense fallback={
              <div className="p-4 bg-light-tertiary text-light-text-primary rounded-lg">
                Loading Agents...
              </div>
            }>
              <ResponseAgentManagement
                rescueMarkers={rescueMarkers}
              />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;