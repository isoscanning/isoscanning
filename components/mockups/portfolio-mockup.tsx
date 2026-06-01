import { Camera, Plus, Upload, ImageIcon, VideoIcon, Layers } from "lucide-react";

export function PortfolioMockup() {
  return (
    <div className="w-full h-full bg-[#050a15] text-white p-4 font-sans overflow-hidden rounded-b-xl flex flex-col relative">
      {/* Background decoration */}
      <div className="absolute top-10 left-10 w-2 h-2 bg-blue-500 rounded-full blur-[2px] opacity-50" />
      <div className="absolute top-40 right-20 w-1 h-1 bg-purple-500 rounded-full blur-[1px] opacity-50" />
      
      {/* Header */}
      <div className="mb-4 z-10 shrink-0">
        <button className="flex items-center gap-2 bg-blue-900/30 text-blue-400 border border-blue-800/50 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider mb-2">
          <Camera className="w-3 h-3" /> Gerenciar Portfólio
        </button>
        <h1 className="text-2xl sm:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400 mb-2">
          Meu Portfólio
        </h1>
        <p className="text-slate-400 text-sm max-w-xl">
          Adicione suas melhores fotos e vídeos. Seu portfólio permite até 150 arquivos no total.
        </p>
      </div>

      {/* Main Content */}
      <div className="flex flex-col md:flex-row gap-4 flex-1 min-h-0 z-10">
        {/* Left Column: Form */}
        <div className="w-full md:w-1/3 bg-[#0a1020] border border-[#1e293b] rounded-2xl p-4 flex flex-col h-full">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
              <Plus className="w-4 h-4 text-blue-400" />
            </div>
            <h2 className="font-bold text-base">Adicionar Novo Item</h2>
          </div>
          <p className="text-slate-400 text-xs mb-3">Você pode adicionar até 150 arquivos no total.</p>
          
          <div className="space-y-3 flex-1">
            <div>
              <label className="block text-xs font-semibold mb-1.5 text-slate-300">Título do Trabalho</label>
              <input 
                type="text" 
                placeholder="Ex: Ensaio de Casamento" 
                className="w-full bg-[#0f172a] border border-[#1e293b] rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>
            
            <div className="flex-1 flex flex-col">
              <label className="block text-xs font-semibold mb-1.5 text-slate-300">Arquivo (Imagem ou Vídeo)</label>
              <div className="flex-1 border-2 border-dashed border-[#1e293b] rounded-xl flex flex-col items-center justify-center p-4 min-h-[120px] bg-[#0a1020]/50 hover:bg-[#0f172a] transition-colors cursor-pointer">
                <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center mb-3">
                  <Upload className="w-5 h-5 text-blue-400" />
                </div>
                <span className="font-bold text-sm mb-1">Clique ou arraste para enviar</span>
                <span className="text-slate-500 text-[10px] text-center max-w-[150px]">
                  JPG/PNG (max 15MB) ou MP4 (max 150MB, 90s)
                </span>
              </div>
            </div>
          </div>
          
          <button className="w-full bg-blue-600/80 hover:bg-blue-600 text-white font-medium py-2.5 rounded-lg mt-4 text-sm transition-colors border border-blue-500/50">
            Adicionar ao Portfólio
          </button>
        </div>

        {/* Right Column: Gallery */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex justify-between items-center mb-3 shrink-0">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-slate-300" />
              <h2 className="font-bold text-base">Galeria</h2>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-xs text-slate-400 bg-[#1e293b] px-2 py-0.5 rounded mb-1">98 de 150 arquivos</span>
              <div className="w-24 h-1.5 bg-[#1e293b] rounded-full overflow-hidden">
                <div className="w-[65%] h-full bg-blue-500 rounded-full"></div>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3 overflow-y-auto custom-scrollbar pr-1">
            {[
              { title: "Rio de Janeiro - Pão de Açucar", type: "IMAGEM", bg: "bg-slate-800", img: "https://images.unsplash.com/photo-1483729558449-99ef09a8c325?q=80&w=600&auto=format&fit=crop" },
              { title: "Ultra Music Festival", type: "IMAGEM", bg: "bg-[#0a1020]" },
              { title: "Rio de Janeiro", type: "IMAGEM", bg: "bg-[#0a1020]" },
              { title: "Formatura - Anelisa", type: "VÍDEO", bg: "bg-[#0a1020]" },
            ].map((item, i) => (
              <div key={i} className={`relative rounded-xl overflow-hidden ${item.bg} border border-[#1e293b] aspect-video group cursor-pointer`}>
                {item.img && (
                  <img src={item.img} alt={item.title} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-3">
                  <div className="mb-1">
                    <span className="bg-blue-600 text-white text-[9px] font-bold px-2 py-0.5 rounded uppercase flex items-center gap-1 w-max">
                      {item.type === "IMAGEM" ? <ImageIcon className="w-3 h-3" /> : <VideoIcon className="w-3 h-3" />}
                      {item.type}
                    </span>
                  </div>
                  <h3 className="font-bold text-sm text-white drop-shadow-md truncate">{item.title}</h3>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #334155; }
      `}} />
    </div>
  );
}
