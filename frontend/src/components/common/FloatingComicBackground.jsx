import { useEffect, useRef } from 'react';
import comic1 from '../../assets/backgrounds/comic1.jpg';
import comic2 from '../../assets/backgrounds/comic2.jpg';
import comic3 from '../../assets/backgrounds/comic3.jpg';

const COMIC_IMAGES = [comic1, comic2, comic3];

export default function FloatingComicBackground() {
  const canvasRef = useRef(null);
  const particlesRef = useRef([]);
  const animationFrameRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Create particles with Brownian motion
    const createParticles = () => {
      const particles = [];
      const numParticles = 9; // Number of floating comic images (INCREASED from 6)

      for (let i = 0; i < numParticles; i++) {
        const img = new Image();
        img.src = COMIC_IMAGES[i % COMIC_IMAGES.length];

        particles.push({
          img,
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.5, // Random velocity X
          vy: (Math.random() - 0.5) * 0.5, // Random velocity Y
          rotation: Math.random() * 360,
          rotationSpeed: (Math.random() - 0.5) * 0.3,
          scale: 0.25 + Math.random() * 0.2, // Size between 25-45% of original (INCREASED)
          opacity: 0.15 + Math.random() * 0.1, // More visible (15-25%)
          loaded: false
        });

        img.onload = () => {
          particles[i].loaded = true;
        };
      }

      return particles;
    };

    particlesRef.current = createParticles();

    // Animation loop with Brownian motion
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particlesRef.current.forEach((particle) => {
        if (!particle.loaded) return;

        // Brownian motion: add random acceleration
        particle.vx += (Math.random() - 0.5) * 0.05;
        particle.vy += (Math.random() - 0.5) * 0.05;

        // Limit max velocity for smooth motion
        const maxSpeed = 0.8;
        particle.vx = Math.max(-maxSpeed, Math.min(maxSpeed, particle.vx));
        particle.vy = Math.max(-maxSpeed, Math.min(maxSpeed, particle.vy));

        // Update position
        particle.x += particle.vx;
        particle.y += particle.vy;

        // Update rotation
        particle.rotation += particle.rotationSpeed;

        // Wrap around edges
        if (particle.x < -200) particle.x = canvas.width + 200;
        if (particle.x > canvas.width + 200) particle.x = -200;
        if (particle.y < -200) particle.y = canvas.height + 200;
        if (particle.y > canvas.height + 200) particle.y = -200;

        // Draw the image
        ctx.save();
        ctx.globalAlpha = particle.opacity;
        ctx.translate(particle.x, particle.y);
        ctx.rotate((particle.rotation * Math.PI) / 180);

        const width = particle.img.width * particle.scale;
        const height = particle.img.height * particle.scale;

        ctx.drawImage(
          particle.img,
          -width / 2,
          -height / 2,
          width,
          height
        );
        ctx.restore();
      });

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{
        zIndex: 0,
        filter: 'blur(1px)', // Less blur for more visibility
      }}
    />
  );
}
