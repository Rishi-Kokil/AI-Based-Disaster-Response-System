import React, { Suspense, lazy } from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { ErrorBoundary } from "react-error-boundary";
import routes from "@/routes";

const ErrorFallBack = lazy(() => import("@/components/ErrorFallBack"));

const router = createBrowserRouter(routes);

function App() {

  return (
    <RouterProvider router={router} />
  );
}

export default React.memo(App);