"use client";

import { useState } from "react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, MonitorPlay, Image as ImageIcon, Sparkles, Lock } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function GeradorParticulasPage() {
  const [status, setStatus] = useState("Selecione uma opção abaixo para gerar.");
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

      // Base scaling based on Full HD
      const scale = width / 1920; 

      if (!transparent) {
        // Reproduce the exact Home page dark background #020817
        ctx.fillStyle = "#020817";
        ctx.fillRect(0, 0, width, height);

        // Add subtle radial glowing orbs like the Home page (blue and purple)
        const grad1 = ctx.createRadialGradient(width * 0.25, height * 0.25, 0, width * 0.25, height * 0.25, width * 0.4);
        grad1.addColorStop(0, 'rgba(59, 130, 246, 0.15)'); // Blue 500
        grad1.addColorStop(1, 'rgba(59, 130, 246, 0)');
        ctx.fillStyle = grad1;
        ctx.fillRect(0, 0, width, height);

        const grad2 = ctx.createRadialGradient(width * 0.75, height * 0.75, 0, width * 0.75, height * 0.75, width * 0.4);
        grad2.addColorStop(0, 'rgba(168, 85, 247, 0.15)'); // Purple 500
        grad2.addColorStop(1, 'rgba(168, 85, 247, 0)');
        ctx.fillStyle = grad2;
        ctx.fillRect(0, 0, width, height);
      } else {
        ctx.clearRect(0, 0, width, height);
      }

      // Generate particles
      const particles: any[] = [];
      // Higher density for high-res screens
      const particleCount = Math.floor((width * height) / (1920 * 1080) * 120); 
      const colors = ["#60a5fa", "#818cf8", "#a78bfa", "#f472b6"]; // Exact same colors from the original effect

      for (let i = 0; i < particleCount; i++) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          size: (Math.random() * 2.5 + 1.5) * scale, // Slightly thicker so they stand out in social media
          color: colors[Math.floor(Math.random() * colors.length)]
        });
      }

      // Draw particle dots
      particles.forEach((p) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = 0.8; 
        ctx.fill();
      });

      // Draw connecting lines
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

      // Export file
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
            Como um Assistente de I.A., eu não consigo enviar arquivos diretos no nosso chat do painel. Mas não se preocupe! Desenvolvi esta ferramenta exclusiva, direto no seu próprio sistema, para você gerar os cenários exatos do ISOSCANNING em 4K.
          </p>
        </div>

        <Card className="w-full max-w-4xl border-primary/20 shadow-xl bg-card">
          <CardHeader className="text-center pb-2 border-b border-border/10 mb-6">
            <CardTitle className="text-2xl">Opções de Exportação em PNG</CardTitle>
            <CardDescription className="text-base text-purple-400 font-medium">{status}</CardDescription>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-8 p-6">
            
            {/* Transparent */}
            <div className="space-y-4 flex flex-col items-center p-6 rounded-xl border border-dashed border-muted-foreground/30 bg-muted/10">
              <ImageIcon className="w-12 h-12 text-muted-foreground mb-2" />
              <h3 className="font-semibold text-xl">Fundo Transparente</h3>
              <p className="text-sm text-center text-muted-foreground mb-4">
                Apenas os pontos e as linhas de conexão. Ideal para colocar no Photoshop ou no Canva por cima de outras fotos da plataforma.
              </p>
              <div className="flex flex-col gap-3 w-full mt-auto">
                <Button variant="outline" className="w-full h-12" onClick={() => generateImage(1080, 1080, true)}>
                  <Download className="w-4 h-4 mr-2" /> Posts Instagram (1080x1080)
                </Button>
                <Button variant="outline" className="w-full h-12" onClick={() => generateImage(1080, 1920, true)}>
                  <Download className="w-4 h-4 mr-2" /> Reel / Stories (1080x1920)
                </Button>
                <Button variant="outline" className="w-full h-12 font-bold border-primary/50 text-primary hover:bg-primary/10" onClick={() => generateImage(3840, 2160, true)}>
                  <Download className="w-4 h-4 mr-2" /> Arte PC / 4K (3840x2160)
                </Button>
              </div>
            </div>

            {/* Blue Background */}
            <div className="space-y-4 flex flex-col items-center p-6 rounded-xl border border-primary/30 bg-primary/5">
              <MonitorPlay className="w-12 h-12 text-primary mb-2" />
              <h3 className="font-semibold text-xl text-primary">Fundo Azul Original</h3>
              <p className="text-sm text-center text-muted-foreground mb-4">
                O design completo com o gradiente azul escuro mágico ao fundo, reproduzindo exatamente o que está na Home do ISOSCANNING.
              </p>
              <div className="flex flex-col gap-3 w-full mt-auto">
                <Button className="w-full h-12 bg-blue-600 hover:bg-blue-700 font-medium" onClick={() => generateImage(1080, 1080, false)}>
                  <Download className="w-4 h-4 mr-2" /> Posts Instagram (1080x1080)
                </Button>
                <Button className="w-full h-12 bg-blue-600 hover:bg-blue-700 font-medium" onClick={() => generateImage(1080, 1920, false)}>
                  <Download className="w-4 h-4 mr-2" /> Reel / Stories (1080x1920)
                </Button>
                <Button className="w-full h-12 font-bold bg-primary hover:bg-primary/90 text-white" onClick={() => generateImage(3840, 2160, false)}>
                  <Download className="w-4 h-4 mr-2" /> Arte PC / 4K (3840x2160)
                </Button>
              </div>
            </div>

          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
