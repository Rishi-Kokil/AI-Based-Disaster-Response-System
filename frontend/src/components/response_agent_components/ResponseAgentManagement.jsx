import React, { useState } from "react";
import Card from "@/components/Card";
import { Eye } from "lucide-react";

const AgentDetails = ({ agent, isVisible }) => {
  return (
    <div
      className={`overflow-hidden transition-all duration-300 ease-in-out ${isVisible ? "max-h-60" : "max-h-0"
        }`}
    >
      <div className="p-5 bg-light-tertiary dark:bg-dark-primary border border-light-secondary dark:border-dark-secondary rounded-lg shadow-md mt-3">
        <div className="flex space-x-6">
          <div className="flex-shrink-0">
            <img
              src="https://i.pinimg.com/736x/8b/16/7a/8b167af653c2399dd93b952a48740620.jpg"
              alt="Agent"
              className="w-20 h-20 object-cover rounded-full border-2 border-light-accent dark:border-dark-accent"
            />
          </div>
          <div className="flex-1 space-y-3">
            <div className="text-lg font-semibold text-light-text-primary dark:text-dark-text-primary">
              {agent.name}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <div className="text-xs text-light-text-tertiary dark:text-dark-text-tertiary uppercase">
                  Coordinates
                </div>
                <div className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                  {agent.coordinates.join(", ")}
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-xs text-light-text-tertiary dark:text-dark-text-tertiary uppercase">
                  Contact
                </div>
                <div className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                  {agent.contact}
                </div>
              </div>
              <div className="space-y-1 col-span-2">
                <div className="text-xs text-light-text-tertiary dark:text-dark-text-tertiary uppercase">
                  Email
                </div>
                <div className="text-sm text-light-text-secondary dark:text-dark-text-secondary break-all">
                  {agent.email}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

function ResponseAgentManagement({ rescueMarkers }) {
  const [expandedAgent, setExpandedAgent] = useState(null);

  const agents = [
    {
      id: 1,
      name: "Agent 1: John Smith",
      coordinates: [40.7128, -74.006], // New York coordinates
      contact: "+1 555 111 2222",
      email: "john.smith@response.com",
    },
    {
      id: 2,
      name: "Agent 2: Jane Doe",
      coordinates: [34.0522, -118.2437], // Los Angeles coordinates
      contact: "+1 555 333 4444",
      email: "jane.doe@response.com",
    },
    {
      id: 3,
      name: "Agent 3: Mark Lee",
      coordinates: [37.7749, -122.4194], // San Francisco coordinates
      contact: "+1 555 555 6666",
      email: "mark.lee@response.com",
    },
  ];

  const handleAssign = () => {
    console.log("Assigning coordinates to agents...", rescueMarkers);
  };

  return (
    <Card
      title="Response Agent Management"
      className="bg-light-tertiary dark:bg-dark-primary border border-light-secondary dark:border-dark-secondary"
      titleClassName="text-light-text-primary dark:text-dark-text-primary"
    >
      <div className="mb-4">
        <button
          disabled={rescueMarkers.length === 0}
          onClick={handleAssign}
          className={`w-full md:w-auto px-4 py-2 rounded transition duration-150 ${rescueMarkers.length === 0
              ? "bg-gray-300 text-gray-500 cursor-not-allowed"
              : "bg-light-accent dark:bg-dark-accent text-light-text-inverted dark:text-dark-text-inverted hover:bg-light-secondary"
            }`}
        >
          Assign Coordinates
        </button>
      </div>

      <div className="divide-y divide-light-secondary dark:divide-dark-secondary">
        {agents.map((agent) => (
          <div key={agent.id}>
            <div
              className="flex items-center justify-between p-3 cursor-pointer hover:bg-light-secondary/20 dark:hover:bg-dark-secondary/20 transition-colors"
              onClick={() =>
                setExpandedAgent(expandedAgent === agent.id ? null : agent.id)
              }
            >
              <div className="text-light-text-primary dark:text-dark-text-primary">
                {agent.name}
              </div>
              <button
                className="p-2 rounded-full bg-light-secondary dark:bg-dark-secondary hover:bg-light-accent/20 dark:hover:bg-dark-accent/20 transition"
              >
                <Eye className="text-light-accent dark:text-dark-accent" />
              </button>
            </div>
            <AgentDetails agent={agent} isVisible={expandedAgent === agent.id} />
          </div>
        ))}
      </div>
    </Card>
  );
}

export default React.memo(ResponseAgentManagement);
