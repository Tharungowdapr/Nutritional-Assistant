"use client";

interface MacroRingProps {
  label: string;
  current: number;
  target: number;
  color: string;
  unit: string;
  size?: number;
}

export function MacroRing({ 
  label, 
  current, 
  target, 
  color, 
  unit,
  size = 80 
}: MacroRingProps) {
  const percentage = Math.min((current / target) * 100, 100);
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-2">
      <svg 
        width={size} 
        height={size} 
        style={{ transform: "rotate(-90deg)" }}
        className="drop-shadow-sm"
      >
        {/* Background circle */}
        <circle 
          cx={size / 2} 
          cy={size / 2} 
          r={radius} 
          fill="none" 
          stroke="hsl(var(--muted-foreground) / 0.1)"
          strokeWidth={6} 
        />
        {/* Progress circle */}
        <circle 
          cx={size / 2} 
          cy={size / 2} 
          r={radius} 
          fill="none" 
          stroke={color} 
          strokeWidth={6}
          strokeDasharray={circumference} 
          strokeDashoffset={offset}
          strokeLinecap="round" 
          style={{ 
            transition: "stroke-dashoffset 0.6s ease",
            filter: "drop-shadow(0 0 2px rgba(0,0,0,0.1))"
          }} 
        />
      </svg>
      
      {/* Center text */}
      <div style={{ marginTop: -size * 0.6 }} className="flex flex-col items-center">
        <p 
          className="text-xs font-bold"
          style={{ color }}
        >
          {Math.round(current)}
        </p>
        <p className="text-[10px] text-muted-foreground">
          /{target}{unit}
        </p>
      </div>
      
      {/* Label */}
      <p className="text-xs text-muted-foreground font-medium text-center">{label}</p>
    </div>
  );
}
