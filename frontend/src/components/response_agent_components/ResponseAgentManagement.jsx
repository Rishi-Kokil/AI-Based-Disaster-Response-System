import React from "react";
import Card from "@/components/Card";
import Button from "@/components/Button";


/**
 * A memoized component to manage response agents.
 */
function ResponseAgentManagement() {
  // Sample agent data
  const agents = [
    { name: "Agent 1: John Smith" },
    { name: "Agent 2: Jane Doe" },
    { name: "Agent 3: Mark Lee" },
  ];

  // Example function for "Assign Task"
  const handleAssignTask = (agentName) => {
    alert(`Assigning task to ${agentName}`);
  };

  return (
    <Card title="Response Agent Management">
      <table className="w-full text-left">
        <thead>
          <tr>
            <th className="py-2">Agent List</th>
            <th className="py-2">Performance Metrics</th>
            <th className="py-2"></th>
          </tr>
        </thead>
        <tbody>
          {agents.map((agent, idx) => (
            <tr key={idx}>
              <td className="py-2">{agent.name}</td>
              <td className="py-2">[Graph/Stats Placeholder]</td>
              <td className="py-2">
                <Button
                  variant="accent"
                  handleOnClick={() => handleAssignTask(agent.name)}
                  text="Assign Task"
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

export default React.memo(ResponseAgentManagement);
