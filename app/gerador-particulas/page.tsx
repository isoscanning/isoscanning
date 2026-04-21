"use client";

import { useState } from "react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, MonitorPlay, Image as ImageIcon, Sparkles, Lock, Video } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function GeradorParticulasPage() {
  const [status, setStatus] = useState("Selecione uma opção abaixo para gerar sua mídia.");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === "RedesSociais2026") {
      setIsAuthenticated(true);
      setErrorMsg("");
    } else {
      setErrorMsg("Senha incorreta.");
    }
  };


  const generateImage = (width: number, height: number, transparent: boolean) => {
    try {
      setStatus(`Gerando imagem ${width}x${height} em alta resolução...`);
      
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      
      if (!ctx) {
        setStatus("Erro ao criar o canvas.");
        return;
      }

      const scale = width / 1920; 

      if (!transparent) {
        ctx.fillStyle = "#020817";
        ctx.fillRect(0, 0, width, height);

        const grad1 = ctx.createRadialGradient(width * 0.25, height * 0.25, 0, width * 0.25, height * 0.25, width * 0.4);
        grad1.addColorStop(0, 'rgba(59, 130, 246, 0.15)'); 
        grad1.addColorStop(1, 'rgba(59, 130, 246, 0)');
        ctx.fillStyle = grad1;
        ctx.fillRect(0, 0, width, height);

        const grad2 = ctx.createRadialGradient(width * 0.75, height * 0.75, 0, width * 0.75, height * 0.75, width * 0.4);
        grad2.addColorStop(0, 'rgba(168, 85, 247, 0.15)'); 
        grad2.addColorStop(1, 'rgba(168, 85, 247, 0)');
        ctx.fillStyle = grad2;
        ctx.fillRect(0, 0, width, height);
      } else {
        ctx.clearRect(0, 0, width, height);
      }

      const particles: any[] = [];
      const particleCount = Math.floor((width * height) / (1920 * 1080) * 120); 
      const colors = ["#60a5fa", "#818cf8", "#a78bfa", "#f472b6"]; 

      for (let i = 0; i < particleCount; i++) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          size: (Math.random() * 2.5 + 1.5) * scale, 
          color: colors[Math.floor(Math.random() * colors.length)]
        });
      }

      particles.forEach((p) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = 0.8; 
        ctx.fill();
      });

      const distThreshold = 150 * scale;

      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < distThreshold) {
            ctx.beginPath();
            const opacity = (1 - distance / distThreshold) * 0.6; 
            const color = `rgba(255, 255, 255, ${opacity})`;

            ctx.strokeStyle = color;
            ctx.lineWidth = 1.2 * scale;
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }

      const dataUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = dataUrl;
      const themeName = transparent ? "transparente" : "fundo-azul";
      link.download = `isoscanning-particulas-${themeName}-${width}x${height}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setStatus(`A imagem de ${width}x${height}px no formato ${transparent ? 'PNG Transparente' : 'Imagem com Fundo'} foi baixada com sucesso! ✨`);
      
    } catch (e) {
      console.error(e);
      setStatus("Ocorreu um erro ao gerar a imagem.");
    }
  };

  const generateVideo = async (width: number, height: number, transparent: boolean) => {
    try {
      setStatus(`Preparando gravação do vídeo animado de 10s (${width}x${height})...`);
      
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      
      if (!ctx) {
        setStatus("Erro ao criar o canvas para o vídeo.");
        return;
      }

      const scale = width / 1920; 
      const particles: any[] = [];
      const particleCount = Math.floor((width * height) / (1920 * 1080) * 120); 
      const colors = ["#60a5fa", "#818cf8", "#a78bfa", "#f472b6"]; 

      for (let i = 0; i < particleCount; i++) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 1.5 * scale, 
          vy: (Math.random() - 0.5) * 1.5 * scale, 
          size: (Math.random() * 2.5 + 1.5) * scale,
          color: colors[Math.floor(Math.random() * colors.length)]
        });
      }

      let animationFrameId: number;
      let isRecording = true;

      const draw = () => {
        if (!isRecording) return;
        
        if (!transparent) {
          ctx.fillStyle = "#020817";
          ctx.fillRect(0, 0, width, height);

          const grad1 = ctx.createRadialGradient(width * 0.25, height * 0.25, 0, width * 0.25, height * 0.25, width * 0.4);
          grad1.addColorStop(0, 'rgba(59, 130, 246, 0.15)'); 
          grad1.addColorStop(1, 'rgba(59, 130, 246, 0)');
          ctx.fillStyle = grad1;
          ctx.fillRect(0, 0, width, height);

          const grad2 = ctx.createRadialGradient(width * 0.75, height * 0.75, 0, width * 0.75, height * 0.75, width * 0.4);
          grad2.addColorStop(0, 'rgba(168, 85, 247, 0.15)'); 
          grad2.addColorStop(1, 'rgba(168, 85, 247, 0)');
          ctx.fillStyle = grad2;
          ctx.fillRect(0, 0, width, height);
        } else {
          ctx.clearRect(0, 0, width, height);
        }

        particles.forEach((p) => {
          p.x += p.vx;
          p.y += p.vy;

          if (p.x < 0) p.x = width;
          if (p.x > width) p.x = 0;
          if (p.y < 0) p.y = height;
          if (p.y > height) p.y = 0;

          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fillStyle = p.color;
          ctx.globalAlpha = 0.8; 
          ctx.fill();
        });

        const distThreshold = 150 * scale;

        for (let i = 0; i < particles.length; i++) {
          for (let j = i + 1; j < particles.length; j++) {
            const dx = particles[i].x - particles[j].x;
            const dy = particles[i].y - particles[j].y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < distThreshold) {
              ctx.beginPath();
              const opacity = (1 - distance / distThreshold) * 0.6; 
              const color = `rgba(255, 255, 255, ${opacity})`;

              ctx.strokeStyle = color;
              ctx.lineWidth = 1.2 * scale;
              ctx.moveTo(particles[i].x, particles[i].y);
              ctx.lineTo(particles[j].x, particles[j].y);
              ctx.stroke();
            }
          }
        }

        animationFrameId = requestAnimationFrame(draw);
      };

      draw();
      
      const stream = (canvas as any).captureStream(30); 
      let mimeType = 'video/webm;codecs=vp9'; 
      if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'video/webm'; 
      }
      
      const recorder = new MediaRecorder(stream, { mimeType });
      const chunks: BlobPart[] = [];
      
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      
      recorder.onstop = () => {
        isRecording = false;
        cancelAnimationFrame(animationFrameId);
        
        const blob = new Blob(chunks, { type: mimeType });
        const dataUrl = URL.createObjectURL(blob);
        
        const link = document.createElement("a");
        link.href = dataUrl;
        const themeName = transparent ? "transparente" : "fundo-azul";
        link.download = `isoscanning-video-${themeName}-${width}x${height}.webm`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(dataUrl);
        
        setStatus(`Vídeo animado de ${width}x${height}px baixado com sucesso! 🎥`);
      };

      setStatus(`Gravando vídeo... Deixe a aba aberta. As partículas estão animando por 10 segundos.`);
      recorder.start();

      let secondsLeft = 10;
      const interval = setInterval(() => {
        secondsLeft -= 1;
        if (secondsLeft > 0) {
          setStatus(`Gravando vídeo... Faltam ${secondsLeft} segundos.`);
        }
      }, 1000);

      setTimeout(() => {
        clearInterval(interval);
        setStatus(`Finalizando o vídeo e processando o download...`);
        recorder.stop();
      }, 10000); 

    } catch (e) {
      console.error(e);
      setStatus("Ocorreu um erro ao gerar o vídeo animado.");
    }
  };


  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 flex flex-col justify-center items-center p-6">
          <Card className="w-full max-w-md border-primary/20 shadow-xl bg-card animate-in fade-in zoom-in duration-300">
            <CardHeader className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-primary/20 flex items-center justify-center rounded-2xl">
                <Lock className="w-8 h-8 text-primary" />
              </div>
              <CardTitle className="text-2xl">Acesso Restrito</CardTitle>
              <CardDescription>Ferramenta exclusiva. Insira a senha de equipe para acessar.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Input 
                    type="password" 
                    placeholder="Senha" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-12 text-center text-lg tracking-widest"
                  />
                  {errorMsg && <p className="text-sm text-destructive font-medium text-center">{errorMsg}</p>}
                </div>
                <Button type="submit" className="w-full h-12 text-base font-bold">Acessar Gerador</Button>
              </form>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 flex flex-col justify-center items-center p-6 mt-12 mb-12">
        <div className="text-center space-y-4 max-w-2xl mb-10 mt-6">
          <div className="mx-auto w-16 h-16 bg-primary/20 flex items-center justify-center rounded-2xl mb-4">
            <Sparkles className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-500">
            Gerador de Background (Social Media)
          </h1>
          <p className="text-lg text-muted-foreground">
            Extraia artes completas para usar nas redes sociais!
          </p>
        </div>

        <Card className="w-full max-w-5xl border-primary/20 shadow-xl bg-card">
          <CardHeader className="text-center pb-2 border-b border-border/10 mb-6">
            <CardTitle className="text-2xl">Painel de Exportação</CardTitle>
            <CardDescription className="text-base text-purple-400 font-medium h-6">{status}</CardDescription>
          </CardHeader>
          <CardContent className="grid lg:grid-cols-2 gap-8 p-6">
            
            {/* Transparent Actions */}
            <div className="space-y-6 flex flex-col p-6 rounded-xl border border-dashed border-muted-foreground/30 bg-muted/10">
              <div className="flex flex-col items-center">
                <ImageIcon className="w-12 h-12 text-muted-foreground mb-2" />
                <h3 className="font-semibold text-xl">Fundo Transparente</h3>
                <p className="text-sm text-center text-muted-foreground mb-4">
                  Apenas as partículas (sem fundo azul). Serve como sobreposição brilhante em artes e edições.
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-bold uppercase text-muted-foreground">Imagens Estáticas (PNG)</p>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" className="w-full" onClick={() => generateImage(1080, 1080, true)}>
                    <Download className="w-4 h-4 mr-2" /> 1:1 (1080p)
                  </Button>
                  <Button variant="outline" className="w-full" onClick={() => generateImage(1080, 1350, true)}>
                    <Download className="w-4 h-4 mr-2" /> 4:5 (1350h)
                  </Button>
                  <Button variant="outline" className="w-full" onClick={() => generateImage(1080, 1920, true)}>
                    <Download className="w-4 h-4 mr-2" /> Reels (1920h)
                  </Button>
                  <Button variant="outline" className="w-full font-bold text-primary" onClick={() => generateImage(3840, 2160, true)}>
                    <Download className="w-4 h-4 mr-2" /> Banner 4K
                  </Button>
                </div>
              </div>

              <div className="space-y-2 mt-auto">
                <p className="text-xs font-bold uppercase text-purple-400">Vídeos Animados (WebM Transparente)</p>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" className="w-full hover:bg-purple-500/10 hover:text-purple-400 border-purple-500/20" onClick={() => generateVideo(1080, 1080, true)}>
                    <Video className="w-4 h-4 mr-2" /> 1:1 (1080p)
                  </Button>
                  <Button variant="outline" className="w-full hover:bg-purple-500/10 hover:text-purple-400 border-purple-500/20" onClick={() => generateVideo(1080, 1350, true)}>
                    <Video className="w-4 h-4 mr-2" /> 4:5 (1350h)
                  </Button>
                  <Button variant="outline" className="w-full hover:bg-purple-500/10 hover:text-purple-400 border-purple-500/20" onClick={() => generateVideo(1080, 1920, true)}>
                    <Video className="w-4 h-4 mr-2" /> Reels (1920h)
                  </Button>
                  <Button variant="outline" className="w-full font-bold text-purple-400 hover:bg-purple-500/10 border-purple-500/20" onClick={() => generateVideo(3840, 2160, true)}>
                    <Video className="w-4 h-4 mr-2" /> Banner 4K
                  </Button>
                </div>
              </div>
            </div>

            {/* Blue Background */}
            <div className="space-y-6 flex flex-col p-6 rounded-xl border border-primary/30 bg-primary/5 shadow-inner">
              <div className="flex flex-col items-center">
                <MonitorPlay className="w-12 h-12 text-primary mb-2" />
                <h3 className="font-semibold text-xl text-primary">Fundo Azul Original</h3>
                <p className="text-sm text-center text-muted-foreground mb-4">
                  Gradiente azul espacial com a neblina da Home + as partículas vibrantes. Perfeito para background.
                </p>
              </div>
              
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase text-muted-foreground">Imagens Estáticas (PNG)</p>
                <div className="grid grid-cols-2 gap-2">
                  <Button className="w-full bg-blue-600 hover:bg-blue-700" onClick={() => generateImage(1080, 1080, false)}>
                    <Download className="w-4 h-4 mr-2" /> 1:1 (1080p)
                  </Button>
                  <Button className="w-full bg-blue-600 hover:bg-blue-700" onClick={() => generateImage(1080, 1350, false)}>
                    <Download className="w-4 h-4 mr-2" /> 4:5 (1350h)
                  </Button>
                  <Button className="w-full bg-blue-600 hover:bg-blue-700" onClick={() => generateImage(1080, 1920, false)}>
                    <Download className="w-4 h-4 mr-2" /> Reels (1920h)
                  </Button>
                  <Button className="w-full bg-blue-600 font-bold hover:bg-blue-700" onClick={() => generateImage(3840, 2160, false)}>
                    <Download className="w-4 h-4 mr-2" /> Banner 4K
                  </Button>
                </div>
              </div>

              <div className="space-y-2 mt-auto">
                <p className="text-xs font-bold uppercase text-primary">Vídeos Animados (WebM Blue)</p>
                <div className="grid grid-cols-2 gap-2">
                  <Button className="w-full bg-primary hover:bg-primary/90" onClick={() => generateVideo(1080, 1080, false)}>
                    <Video className="w-4 h-4 mr-2" /> 1:1 (1080p)
                  </Button>
                  <Button className="w-full bg-primary hover:bg-primary/90" onClick={() => generateVideo(1080, 1350, false)}>
                    <Video className="w-4 h-4 mr-2" /> 4:5 (1350h)
                  </Button>
                  <Button className="w-full bg-primary hover:bg-primary/90" onClick={() => generateVideo(1080, 1920, false)}>
                    <Video className="w-4 h-4 mr-2" /> Reels (1920h)
                  </Button>
                  <Button className="w-full bg-primary font-bold hover:bg-primary/90" onClick={() => generateVideo(3840, 2160, false)}>
                    <Video className="w-4 h-4 mr-2" /> Banner 4K
                  </Button>
                </div>
              </div>

            </div>

          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
