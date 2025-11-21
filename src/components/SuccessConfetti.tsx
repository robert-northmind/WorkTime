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

interface SuccessConfettiProps {
  trigger: boolean;
  buttonRef?: React.RefObject<HTMLButtonElement | null>;
  onComplete?: () => void;
}

export const SuccessConfetti: React.FC<SuccessConfettiProps> = ({ trigger, buttonRef, onComplete }) => {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    if (!trigger) return;

    // Get button position
    let startX = 50; // Default to center
    let startY = 50;
    
    if (buttonRef?.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      startX = ((rect.left + rect.width / 2) / window.innerWidth) * 100;
      startY = ((rect.top + rect.height / 2) / window.innerHeight) * 100;
    }

    // Create particles
    const colors = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ec4899'];
    const newParticles: Particle[] = Array.from({ length: 15 }, (_, i) => {
      // Create radial burst - particles go in all directions
      const angle = (i / 15) * Math.PI * 2; // Distribute evenly in a circle
      const speed = 60 + Math.random() * 40; // Random speed between 60-100
      
      return {
        id: i,
        x: startX,
        y: startY,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        velocityX: Math.cos(angle) * speed,
        velocityY: Math.sin(angle) * speed,
        size: Math.random() * 6 + 4,
      };
    });

    setParticles(newParticles);

    // Clear particles after animation
    const timer = setTimeout(() => {
      setParticles([]);
      onComplete?.();
    }, 1000);

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
            borderRadius: Math.random() > 0.5 ? '50%' : '2px',
            transform: `rotate(${particle.rotation}deg)`,
            animation: `confetti-fall 1s ease-out forwards`,
            '--velocity-x': `${particle.velocityX}px`,
            '--velocity-y': `${particle.velocityY}px`,
          } as React.CSSProperties & { '--velocity-x': string; '--velocity-y': string }}
        />
      ))}
    </div>
  );
};
