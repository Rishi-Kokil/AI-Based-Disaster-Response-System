import React, { useEffect } from 'react'

const SHIMMER_STYLE_ID = 'shimmer-keyframes'

function injectShimmerStyles() {
  if (document.getElementById(SHIMMER_STYLE_ID)) return
  const style = document.createElement('style')
  style.id = SHIMMER_STYLE_ID
  style.textContent = `
    @keyframes shimmer {
      0% { transform: translateX(-100%); }
      100% { transform: translateX(100%); }
    }
    .animate-shimmer {
      animation: shimmer 1.5s infinite;
    }
  `
  document.head.appendChild(style)
}

export const Skeleton = ({
  width = 'w-full',
  height = 'h-16',
  rounded = 'rounded-md',
  count = 1,
  className = '',
}) => {
  useEffect(() => {
    injectShimmerStyles()
  }, [])

  return (
    <div className="w-full">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={`${className} mb-4`}>
          <div
            className={`
              ${width} ${height} ${rounded}
              bg-light-secondary dark:bg-dark-secondary
              relative overflow-hidden
            `}
          >
            <div className="absolute inset-0">
              <div className="animate-pulse flex h-full w-full space-x-4">
                <div className="flex-1 space-y-4 py-1">
                  <div className="h-full w-full bg-light-tertiary dark:bg-dark-tertiary opacity-30 rounded" />
                </div>
              </div>
            </div>
            <div className="absolute inset-0">
              <div className="animate-shimmer bg-gradient-to-r from-transparent via-light-text-inverted dark:via-dark-text-inverted to-transparent opacity-20" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
