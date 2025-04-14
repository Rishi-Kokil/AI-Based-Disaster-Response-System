import React from "react";
import { Twitter, Facebook } from 'lucide-react';
import Card from "@/components/Card";

const SocialMediaReports = () => {
  const reports = [
    { 
      platform: "Twitter", 
      icon: <Twitter className="text-light-accent dark:text-dark-accent" />,
      text: "Potential hazards related to health topics",
      stats: "+23% engagement"
    },
    { 
      platform: "Facebook", 
      icon: <Facebook className="text-[#1877F2] dark:text-[#1877F2]" />,
      text: "Increased traction for health-awareness posts",
      stats: "15K shares"
    },
  ];

  return (
    <Card 
      title="Social Media Reports" 
      className="bg-light-tertiary dark:bg-dark-primary border border-light-secondary dark:border-dark-secondary"
      titleClassName="text-light-text-primary dark:text-dark-text-primary"
    >
      <div className="divide-y divide-light-secondary dark:divide-dark-secondary">
        {reports.map((report, idx) => (
          <div key={idx} className="flex items-start p-3 hover:bg-light-secondary/30 dark:hover:bg-dark-secondary/30 transition-colors">
            <div className="mr-4 mt-1">
              {report.icon}
            </div>
            <div className="flex-1">
              <div className="font-medium text-light-text-secondary dark:text-dark-text-secondary">
                {report.platform}
              </div>
              <div className="text-sm text-light-text-tertiary dark:text-dark-text-tertiary mb-1">
                {report.text}
              </div>
              <div className="text-xs text-light-accent dark:text-dark-accent font-medium">
                {report.stats}
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};

export default React.memo(SocialMediaReports);