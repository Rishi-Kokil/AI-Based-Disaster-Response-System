import React, { Suspense, lazy } from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import routes from "@/routes";

import { SnackbarProvider } from "@/context/snackBarContext";

const router = createBrowserRouter(routes);

function App() {

  return (
    <SnackbarProvider>
      <RouterProvider router={router} />
    </SnackbarProvider>
  );
}

export default React.memo(App);