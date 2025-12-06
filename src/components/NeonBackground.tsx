const NeonBackground = () => {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {/* Gradient overlay for depth */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/50 to-background" />
      
      {/* Subtle neon blobs - reduced opacity and smoother */}
      <div
        className="neon-blob blob-violet w-[600px] h-[600px]"
        style={{ top: "-200px", left: "-150px" }}
      />
      <div
        className="neon-blob blob-pink w-[450px] h-[450px]"
        style={{ bottom: "-100px", right: "-100px" }}
      />
      <div
        className="neon-blob blob-blue w-[350px] h-[350px]"
        style={{ top: "40%", left: "30%" }}
      />
      
      {/* Subtle grain texture */}
      <div 
        className="absolute inset-0 opacity-[0.012]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />
    </div>
  );
};

export default NeonBackground;
