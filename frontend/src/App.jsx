import React, { Suspense } from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { ErrorBoundary } from "react-error-boundary";
import routes from "@/routes";

const router = createBrowserRouter(routes);


function ErrorFallback({ error, resetErrorBoundary }) {
  return (
    <div className="h-screen flex flex-col items-center justify-center min-h-screen bg-gray-50 p-8 text-center">
      {/* Replace this placeholder with your custom error illustration/image */}
      <div className="mb-6">
        <div className="w-16 h-16 bg-gray-300 rounded" />
      </div>

      <h1 className="text-2xl font-semibold text-gray-800 mb-2">
        Oops, that’s our bad
      </h1>
      <p className="text-gray-600 max-w-md mb-6">
        We’re not exactly sure what happened, but something went wrong.
        If you need immediate help, please let us know.
      </p>

      <button
        onClick={resetErrorBoundary}
        className="px-4 py-2 text-white bg-blue-600 rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 mb-4"
      >
        Try again
      </button>

     
      {error && (
        <pre className="bg-gray-200 text-red-500 p-4 rounded max-w-lg mx-auto whitespace-pre-wrap">
          {error.message}
        </pre>
      )}
    </div>
  );
}

function App() {
  const [shouldThrow, setShouldThrow] = React.useState(false);

  if (shouldThrow) {
    throw new Error("Test error boundary");
  }

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <button
        onClick={() => setShouldThrow(true)}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        Click to trigger render error
      </button>
    </ErrorBoundary>
  );
}


export default React.memo(App);