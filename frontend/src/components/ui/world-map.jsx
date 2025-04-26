import React, { useRef, useMemo, useEffect } from "react";
import { motion, useAnimation } from "motion/react";  // or from "framer-motion"
import DottedMap from "dotted-map";

const projectPoint = (lat, lng) => {
  const x = (lng + 180) * (800 / 360);
  const y = (90 - lat) * (400 / 180);
  return { x, y };
};

const createCurvedPath = (start, end) => {
  const midX = (start.x + end.x) / 2;
  const midY = Math.min(start.y, end.y) - 50;
  return `M ${start.x} ${start.y} Q ${midX} ${midY} ${end.x} ${end.y}`;
};

const WorldMap = React.memo(({ dots = [], lineColor = "#0ea5e9" }) => {
  const svgRef = useRef(null);
  const controls = useAnimation();

  // 1) build the map once
  const map = useMemo(() => new DottedMap({ height: 100, grid: "diagonal" }), []);
  const svgMap = useMemo(() => 
    map.getSVG({
      radius: 0.22,
      color: "#FFFFFF40",
      shape: "circle",
      backgroundColor: "transparent",
    }),
  [map]);

  // 2) pre‐project points
  const projected = useMemo(
    () => dots.map(({ start, end }) => ({
        start: projectPoint(start.lat, start.lng),
        end:   projectPoint(end.lat,   end.lng),
    })),
    [dots]
  );

  // 3) define two variants: draw (with stagger delays) and erase
  const variants = {
    draw: i => ({
      pathLength: 1,
      transition: { duration: 1, delay: i * 0.5, ease: "easeOut" }
    }),
    erase: {
      pathLength: 0,
      transition: { duration: 1, ease: "easeIn" }
    }
  };

  // 4) orchestrate: draw all → erase all → repeat
  useEffect(() => {
    async function loop() {
      while (true) {
        await controls.start("draw");
        await controls.start("erase");
      }
    }
    loop();
  }, [controls]);

  return (
    <div className="w-full aspect-[2.5/1] rounded-lg relative overflow-hidden font-sans">
      <img
        src={`data:image/svg+xml;utf8,${encodeURIComponent(svgMap)}`}
        className="absolute inset-0 w-full h-full pointer-events-none select-none"
        alt="world map"
        draggable={false}
      />

      <svg
        ref={svgRef}
        viewBox="0 0 800 400"
        className="absolute inset-0 w-full h-full pointer-events-none select-none"
      >
        <defs>
          <linearGradient id="path-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"   stopColor="white"    stopOpacity={0} />
            <stop offset="5%"   stopColor={lineColor} stopOpacity={1} />
            <stop offset="95%"  stopColor={lineColor} stopOpacity={1} />
            <stop offset="100%" stopColor="white"    stopOpacity={0} />
          </linearGradient>
        </defs>

        {projected.map(({ start, end }, i) => (
          <motion.path
            key={"path-" + i}
            d={createCurvedPath(start, end)}
            fill="none"
            stroke="url(#path-gradient)"
            strokeWidth={1}
            variants={variants}
            custom={i}
            initial={{ pathLength: 0 }}
            animate={controls}
          />
        ))}

        {projected.map(({ start, end }, i) => (
          <g key={"points-" + i}>
            {[start, end].map((pt, j) => (
              <React.Fragment key={j}>
                <circle cx={pt.x} cy={pt.y} r={2} fill={lineColor} />
                <circle cx={pt.x} cy={pt.y} r={2} fill={lineColor} opacity={0.5}>
                  <animate attributeName="r" from={2} to={8} dur="1.5s" repeatCount="indefinite" />
                  <animate attributeName="opacity" from={0.5} to={0} dur="1.5s" repeatCount="indefinite" />
                </circle>
              </React.Fragment>
            ))}
          </g>
        ))}
      </svg>
    </div>
  );
});

export default WorldMap;
