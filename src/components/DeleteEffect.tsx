import React, { useEffect, useState } from 'react';

interface Particle {
  id: number;
  x: number;
  y: number;
  color: string;
  rotation: number;
  velocityX: number;
  velocityY: number;
  size: number;
}

interface DeleteEffectProps {
  trigger: boolean;
  buttonRef?: React.RefObject<HTMLButtonElement | null>;
  onComplete?: () => void;
}

export const DeleteEffect: React.FC<DeleteEffectProps> = ({ trigger, buttonRef, onComplete }) => {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    if (!trigger) return;

    // Get button position
    let startX = 50;
    let startY = 50;
    
    if (buttonRef?.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      startX = ((rect.left + rect.width / 2) / window.innerWidth) * 100;
      startY = ((rect.top + rect.height / 2) / window.innerHeight) * 100;
    }

    // Create particles - fewer, darker particles that dissolve
    const colors = ['#dc2626', '#991b1b', '#7f1d1d', '#ef4444']; // Red shades
    const newParticles: Particle[] = Array.from({ length: 10 }, (_, i) => {
      // Particles drift downward and outward slowly
      const angle = (Math.random() - 0.5) * Math.PI; // Spread mostly downward
      const speed = 20 + Math.random() * 30;
      
      return {
        id: i,
        x: startX,
        y: startY,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        velocityX: Math.cos(angle) * speed,
        velocityY: Math.abs(Math.sin(angle)) * speed + 30, // Mostly downward
        size: Math.random() * 4 + 3,
      };
    });

    setParticles(newParticles);

    // Clear particles after animation
    const timer = setTimeout(() => {
      setParticles([]);
      onComplete?.();
    }, 800);

    return () => clearTimeout(timer);
  }, [trigger, buttonRef, onComplete]);

  if (particles.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            width: `${particle.size}px`,
            height: `${particle.size}px`,
            backgroundColor: particle.color,
            borderRadius: '2px',
            transform: `rotate(${particle.rotation}deg)`,
            animation: `delete-dissolve 0.8s ease-out forwards`,
            '--velocity-x': `${particle.velocityX}px`,
            '--velocity-y': `${particle.velocityY}px`,
          } as React.CSSProperties & { '--velocity-x': string; '--velocity-y': string }}
        />
      ))}
    </div>
  );
};
