"use client";

import { useEffect, useState } from "react";
import { useSpring, animated } from "react-spring";

interface AnimatedNumberProps {
  value: number;
  className?: string;
  formatter?: (val: number) => string;
  delay?: number;
}

export default function AnimatedNumber({
  value,
  className,
  formatter = (val) => Math.floor(val).toString(),
  delay = 100,
}: AnimatedNumberProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const springs = useSpring({
    from: { number: 0 },
    to: { number: isClient ? value : 0 },
    delay: delay,
    config: {
      tension: 100, // smooth easeout count up
      friction: 18,
      precision: 0.1,
    },
  });

  if (!isClient) {
    return <span className={className}>{formatter(0)}</span>;
  }

  return (
    <animated.span className={className}>
      {springs.number.to((val) => formatter(val))}
    </animated.span>
  );
}
