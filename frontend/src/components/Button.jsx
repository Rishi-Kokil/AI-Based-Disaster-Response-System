import React from "react";

// Define styles outside so they aren't recreated on every render
const buttonStyles = {
  accent:
    "px-4 py-2 bg-light-accent dark:bg-dark-accent text-light-text-inverted dark:text-dark-text-inverted rounded hover:bg-light-secondary hover:dark:text-light-text-tertiary  dark:hover:bg-dark-secondary",
  normal:
    "px-4 py-2 bg-light-tertiary dark:bg-dark-tertiary text-light-text-primary dark:text-dark-text-primary rounded hover:bg-light-accent dark:hover:bg-dark-accent hover:dark:text-light-text-primary",
};

const Button = React.memo(({ variant = "normal", text, handleOnClick }) => {
  return (
    <button className={buttonStyles[variant]} onClick={handleOnClick}>
      {text}
    </button>
  );
});

export default Button;
