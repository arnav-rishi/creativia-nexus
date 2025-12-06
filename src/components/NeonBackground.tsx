import { useEffect, useState } from "react";

const NeonBackground = () => {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({
        x: (e.clientX / window.innerWidth) * 100,
        y: (e.clientY / window.innerHeight) * 100,
      });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {/* Animated Neon Blobs */}
      <div
        className="neon-blob blob-violet w-[600px] h-[600px]"
        style={{
          top: "-150px",
          left: "-100px",
          transform: `translate(${mousePosition.x * 0.02}px, ${mousePosition.y * 0.02}px)`,
        }}
      />
      <div
        className="neon-blob blob-pink w-[500px] h-[500px]"
        style={{
          bottom: "-100px",
          right: "-50px",
          transform: `translate(${-mousePosition.x * 0.015}px, ${-mousePosition.y * 0.015}px)`,
        }}
      />
      <div
        className="neon-blob blob-blue w-[400px] h-[400px]"
        style={{
          top: "35%",
          left: "50%",
          marginLeft: "-200px",
          transform: `translate(${mousePosition.x * 0.03}px, ${mousePosition.y * 0.03}px)`,
        }}
      />
      <div
        className="neon-blob blob-cyan w-[350px] h-[350px] opacity-40"
        style={{
          top: "60%",
          left: "20%",
          transform: `translate(${-mousePosition.x * 0.025}px, ${mousePosition.y * 0.02}px)`,
        }}
      />
      
      {/* Subtle overlay for depth */}
      <div className="absolute inset-0 bg-background/20 backdrop-blur-[1px]" />
    </div>
  );
};

export default NeonBackground;
