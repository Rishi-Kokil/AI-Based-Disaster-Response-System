import React, { useCallback, useContext, lazy, Suspense, useMemo } from 'react'
import { navLinks } from '@/constants/navlinks'
import { cn } from '@/lib/utils'
import Button from '@/components/Button'
import { useNavigate } from 'react-router'
import { SnackbarContext } from '@/context'

const LazyWorldMap = lazy(() => import('@/components/ui/world-map'))

const DOTS_DATA = [
  { start: { lat: 37.7749, lng: -122.4194 }, end: { lat: -15.7939, lng: -47.8828 } },
  { start: { lat: -15.7939, lng: -47.8828 }, end: { lat: 48.8566, lng: 2.3522 } },
  { start: { lat: 48.8566, lng: 2.3522 }, end: { lat: -1.2921, lng: 36.8219 } },
  { start: { lat: -1.2921, lng: 36.8219 }, end: { lat: 25.2048, lng: 55.2708 } },
  { start: { lat: 25.2048, lng: 55.2708 }, end: { lat: 28.6139, lng: 77.2090 } },
  { start: { lat: 28.6139, lng: 77.2090 }, end: { lat: 35.6895, lng: 139.6917 } },
  { start: { lat: 35.6895, lng: 139.6917 }, end: { lat: 1.3521, lng: 103.8198 } },
  { start: { lat: 1.3521, lng: 103.8198 }, end: { lat: -33.8688, lng: 151.2093 } },
  { start: { lat: -33.8688, lng: 151.2093 }, end: { lat: 37.7749, lng: -122.4194 } },
  { start: { lat: 37.7749, lng: -122.4194 }, end: { lat: 51.5074, lng: -0.1278 } },
  { start: { lat: 40.7128, lng: -74.0060 }, end: { lat: 55.7558, lng: 37.6173 } },
  { start: { lat: 28.6139, lng: 77.2090 }, end: { lat: 39.9042, lng: 116.4074 } },
  { start: { lat: -15.7939, lng: -47.8828 }, end: { lat: -34.6037, lng: -58.3816 } },
  { start: { lat: -34.6037, lng: -58.3816 }, end: { lat: 40.4168, lng: -3.7038 } },
  { start: { lat: 25.2048, lng: 55.2708 }, end: { lat: 41.0082, lng: 28.9784 } },
  { start: { lat: 35.6895, lng: 139.6917 }, end: { lat: 37.5665, lng: 126.9780 } },
]

function Landing() {
  const navigate = useNavigate()
  const { showSnackbar } = useContext(SnackbarContext)
  const dots = useMemo(() => DOTS_DATA, [])

  const handleLogin = useCallback(() => navigate('/auth/login'), [])
  const handleSignup = useCallback(() => navigate('/auth/signup'), [])
  const handleLearnMore = useCallback(() => navigate('#'), [])
  const handleGitRepo = useCallback(
    () => window.open(
      'https://github.com/Rishi-Kokil/AI-Based-Disaster-Response-System',
      '_blank'
    ),
    []
  )

  return (
    <div className="h-screen bg-light-primary dark:bg-dark-primary overflow-auto no-scrollbar">
      <nav className="relative z-20 w-full flex items-center justify-between px-8 py-4">
        <div className="text-xl font-bold text-light-text-primary dark:text-dark-text-primary">
          EmergeSense
        </div>
        <div className="flex space-x-6">
          {navLinks.map(link => (
            <a
              key={link.name}
              href={link.href}
              className="text-lg font-semibold text-light-text-primary dark:text-dark-text-primary hover:text-light-text-tertiary hover:dark:text-dark-text-tertiary"
            >
              {link.name}
            </a>
          ))}
        </div>
        <div className="flex space-x-4">
          <Button variant="normal" text="Log In" handleOnClick={handleLogin} />
          <Button variant="accent" text="Sign Up" handleOnClick={handleSignup} />
        </div>
      </nav>

      <main className="flex flex-col flex-1 items-center justify-center relative">
        <div
          className={cn(
            'absolute inset-0',
            '[background-size:40px_40px]',
            '[background-image:linear-gradient(to_right,#e4e4e7_1px,transparent_1px),linear-gradient(to_bottom,#e4e4e7_1px,transparent_1px)]',
            'dark:[background-image:linear-gradient(to_right,#262626_1px,transparent_1px),linear-gradient(to_bottom,#262626_1px,transparent_1px)]'
          )}
        />
        <div className="pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)] bg-light-primary dark:bg-dark-primary" />

        <div className="relative flex-1 w-full overflow-hidden">
          <Suspense
            fallback={
              <div className="absolute inset-0 flex items-center justify-center bg-black">
                <span className="text-white">Loading map…</span>
              </div>
            }
          >
            <LazyWorldMap className="absolute inset-0 w-full h-full opacity-80" dots={dots} lineColor="#0ea5e9" />
          </Suspense>

          <div className="absolute z-10 top-1/2 left-0 transform -translate-y-1/2 px-8 py-6 bg-white/20 dark:bg-black/40 backdrop-blur-md rounded-2xl max-w-3xl">
            <div className="relative">
              <h1 className="text-6xl md:text-5xl font-bold text-light-text-primary dark:text-dark-text-primary text-shadow-lg">
                AI-Powered Disaster Response System
              </h1>
              <div className="absolute -inset-4 bg-gradient-to-r from-light-primary/20 dark:from-dark-primary/30 to-transparent rounded-lg blur-md -z-10" />
              <p className="mt-4 text-lg text-light-text-secondary dark:text-dark-text-secondary text-shadow-sm">
                Leveraging AI, satellite data, and real-time social insights to detect and respond to disasters efficiently.
              </p>
              <div className="mt-6 flex space-x-4">
                <Button variant="accent" text="Learn More" handleOnClick={handleLearnMore} />
                <Button variant="normal" text="Git Repo →" handleOnClick={handleGitRepo} />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default React.memo(Landing)
