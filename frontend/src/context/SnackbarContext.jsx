// SnackbarContext.jsx
import React, {
    createContext,
    useState,
    useCallback,
    useMemo,
    useEffect,
    useState as useLocalState,
  } from 'react';
  import clsx from 'clsx';
  import { X } from 'lucide-react';
  
  export const SnackbarContext = createContext();
  
  // A simple counter for unique snack IDs.
  let idCounter = 0;
  
  export const SnackbarProvider = ({ children }) => {
    const [snacks, setSnacks] = useState([]);
  
    // Create a new snack (notification).
    const showSnackbar = useCallback((message, options = {}) => {
      const newSnack = {
        id: idCounter++,
        message,
        type: options.type || 'info',
        autoHideDuration: options.autoHideDuration ?? 5000,
        isExiting: false,
      };
      setSnacks(prev => [...prev, newSnack]);
    }, []);
  
    // Mark a snack as exiting then remove it after the exit animation.
    const closeSnackbar = useCallback((id) => {
      setSnacks(prev =>
        prev.map(snack => snack.id === id ? { ...snack, isExiting: true } : snack)
      );
      setTimeout(() => {
        setSnacks(prev => prev.filter(snack => snack.id !== id));
      }, 500);
    }, []);
  
    // Only expose the showSnackbar function via context.
    const contextValue = useMemo(() => ({ showSnackbar }), [showSnackbar]);
  
    return (
      <SnackbarContext.Provider value={contextValue}>
        {children}
        {/*
          We use a container that is fixed at the top center.
          Each snack is positioned absolutely so they all start at the same spot.
          The newest snack is rendered with a higher z-index.
        */}
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50"
             style={{ width: '100%', height: 0 }}>
          {snacks.map((snack, index) => (
            <Snackbar
              key={snack.id}
              {...snack}
              onClose={() => closeSnackbar(snack.id)}
              // Position each snack absolutely at the origin.
              style={{
                position: 'absolute',
                top: 0,
                left: '50%',
                transform: 'translateX(-50%)'
              }}
              // Newer notifications will have a higher z-index.
              zIndex={index + 1}
            />
          ))}
        </div>
      </SnackbarContext.Provider>
    );
  };
  
  const Snackbar = React.memo(({
    show = true,
    message,
    type,
    onClose,
    isExiting,
    autoHideDuration,
    style,
    zIndex,
  }) => {
    // Local state to control the entrance animation.
    const [animateIn, setAnimateIn] = useLocalState(false);
  
    // On mount, trigger the entrance animation.
    useEffect(() => {
      setAnimateIn(true);
    }, []);
  
    // Auto hide after the given duration if not already exiting.
    useEffect(() => {
      if (show && !isExiting) {
        const timer = setTimeout(onClose, autoHideDuration);
        return () => clearTimeout(timer);
      }
    }, [show, isExiting, autoHideDuration, onClose]);
  
    // We use a simple translate-y transition:
    // Initially, the snack is slightly above (e.g. -10 units).
    // When animateIn is true, it transitions to 0 (its final position).
    // On exit, we reverse the animation.
    const snackbarClasses = clsx(
      "max-w-md w-full p-4 rounded-lg shadow-lg transition-transform duration-500 ease-in-out",
      {
        "translate-y-0": animateIn && !isExiting,
        "-translate-y-10": !animateIn || isExiting,
        "bg-blue-400 text-white": type === 'info',
        "bg-green-400 text-white": type === 'success',
        "bg-red-400 text-white": type === 'error',
      }
    );
  
    return (
      <div className={snackbarClasses} style={{ ...style, zIndex }}>
        <div className="flex justify-between items-center">
          <span className="flex-1">{message}</span>
          <button
            className="ml-4 p-1 rounded-full hover:bg-black/10 transition-colors"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  });
