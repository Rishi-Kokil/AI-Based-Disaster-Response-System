import React from 'react';

const ErrorFallBack = React.memo(function ErrorFallBack({ error, resetErrorBoundary }) {
    return (
        <div className="h-screen flex flex-col items-center justify-center bg-gray-50 p-8 text-center">
            {/* Placeholder for custom error illustration/image */}
            <div className="mb-6">
                <div className="w-16 h-16 bg-gray-300 rounded" />
            </div>

            <h1 className="text-2xl font-semibold text-gray-800 mb-2">
                Oops, something went wrong
            </h1>
            <p className="text-gray-600 max-w-md mb-6">
                We’re not sure what happened, but something went wrong. If you need immediate help, please let us know.
            </p>

            <button
                onClick={resetErrorBoundary}
                className="px-4 py-2 text-white bg-blue-600 rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
                Try Again
            </button>

            {error?.message && (
                <pre className="bg-gray-200 text-red-500 p-4 rounded max-w-lg mx-auto mt-4 whitespace-pre-wrap">
                    {error.message}
                </pre>
            )}
        </div>
    );
});

export default ErrorFallBack;
