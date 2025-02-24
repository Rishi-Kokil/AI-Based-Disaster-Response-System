import React from "react";
import Card from "@/components/Card"; // Or wherever your Card component is located

/**
 * A memoized component to display performance metrics.
 */
function PerformanceMetrics() {
  return (
    <Card title="Performance Metrics">
      
      <div className="text-light-text-secondary dark:text-dark-text-secondary">
        Some placeholder metrics or charts.
      </div>
    </Card>
  );
}

export default React.memo(PerformanceMetrics);
