import React from "react";
import Card from "@/components/Card";



function SocialMediaReports() {
    // Sample data
    const reports = [
        { platform: "Twitter", text: "Potential hazards related to health topics" },
        { platform: "Facebook", text: "Increased traction for health-awareness posts" },
    ];

    return (
        <Card title="Social Media Reports">
            <ul className="space-y-2">
                {reports.map((r, idx) => (
                    <li key={idx}>
                        <strong>{r.platform}:</strong> {r.text}
                    </li>
                ))}
            </ul>
        </Card>
    );
}

export default React.memo(SocialMediaReports);
