import React, { useCallback, useContext } from "react";
import { navLinks } from "@/constants/navlinks";
import Button from "../components/Button";
import { useNavigate } from "react-router";
import { SnackbarContext } from "@/context";


function Landing() {

  const navigate = useNavigate();
  const { showSnackbar } = useContext(SnackbarContext);

  const handleLogin = useCallback(() => navigate("/auth/login"), []);
  const handleSingup = useCallback(() => navigate("/auth/signup"), []);
  const handleLearnMore = useCallback(() => navigate("#"), []);
  const handleGitRepo = useCallback(() => window.open("https://github.com/Rishi-Kokil/AI-Based-Disaster-Response-System", "_blank"), []);

  return (
    <div className="min-h-screen bg-light-primary dark:bg-dark-primary flex flex-col">
      <nav className="w-full flex items-center justify-between px-8 py-4 bg-transparent">

        <div className="text-xl font-bold text-light-text-primary dark:text-dark-text-primary">
          EmergeSense
        </div>

        <div className="flex space-x-6">
          {navLinks.map((link) => (
            <a
              key={link.name}
              href={link.href}
              className="hover:text-light-text-teriary text-lg font-semibold text-light-text-primary dark:text-dark-text-primary hover:dark:text-dark-text-tertiary"
            >
              {link.name}
            </a>
          ))}
        </div>

        <div className="flex space-x-4">

          <Button
            variant="normal"
            text="Log In"
            handleOnClick={handleLogin}
          />

          <Button
            variant="accent"
            text="Sign Up"
            handleOnClick={handleSingup}
          />

        </div>

      </nav>
      <main className="flex flex-col flex-1 items-center justify-center px-6">
        <h1 className="text-4xl md:text-5xl font-bold text-center text-light-text-primary dark:text-dark-text-primary">
          AI-Powered Disaster Response System
        </h1>
        <p className="mt-4 text-lg text-center max-w-2xl text-light-text-secondary dark:text-dark-text-secondary">
          Leveraging AI, satellite data, and real-time social insights to detect and respond to disasters efficiently.
        </p>

        <div className="mt-6 flex space-x-4">

          <Button
            variant="accent"
            text="Learn More"
            handleOnClick={handleLearnMore}
          />

          <Button
            variant="normal"
            text="Git Repo →"
            handleOnClick={handleGitRepo}
          />
        </div>
      </main>
    </div>
  );
}



export default Landing;
