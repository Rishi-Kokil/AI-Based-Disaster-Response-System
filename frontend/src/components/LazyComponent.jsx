import React, { Suspense } from "react";

const LazyComponent = ({ component: Component }) => {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Component />
    </Suspense>
  );
};

export default LazyComponent;
