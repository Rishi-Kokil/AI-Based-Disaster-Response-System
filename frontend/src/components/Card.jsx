import React from "react";

function Card({ title, children }) {
  return (
    <div className="bg-light-secondary dark:bg-dark-secondary text-light-text-primary dark:text-dark-text-primary rounded-md p-4 shadow-lg">
      {title && <h2 className="text-xl font-semibold mb-2">{title}</h2>}
      {children}
    </div>
  );
}

// Memoize to prevent re-renders unless props change
export default React.memo(Card);
