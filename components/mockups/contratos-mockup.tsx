import { FileSignature, Plus, Search, MoreHorizontal, FileText, CheckCircle2, Clock } from "lucide-react";

export function ContratosMockup() {
  return (
    <div className="w-full h-full bg-[#0a0f1c] text-white p-5 font-sans overflow-hidden rounded-b-xl flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#1e1b4b] border border-indigo-500/20 flex items-center justify-center shrink-0">
            <FileSignature className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">Gestão de Contratos</h1>
            <p className="text-slate-400 text-sm">Crie, envie e acompanhe contratos digitais com assinatura eletrônica.</p>
          </div>
        </div>
        <button className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-4 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors whitespace-nowrap">
          <Plus className="w-4 h-4" /> Novo Contrato
        </button>
      </div>

      {/* 4 Cards */}
      <div className="grid grid-cols-4 gap-3 mb-4 shrink-0">
        {[
          { title: "Total", value: "2", color: "text-white" },
          { title: "Rascunhos", value: "0", color: "text-slate-500" },
          { title: "Aguardando", value: "1", color: "text-blue-500" },
          { title: "Assinados", value: "1", color: "text-emerald-500" },
        ].map((card, i) => (
          <div key={i} className="bg-[#0f1524] border border-[#1e293b] rounded-xl p-4 flex flex-col justify-between">
            <div className={`text-2xl font-bold mb-1 ${card.color}`}>{card.value}</div>
            <div className="text-sm font-medium text-slate-400">{card.title}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-4 shrink-0">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input 
            type="text" 
            placeholder="Buscar por título, cliente ou e-mail..." 
            className="w-full bg-[#0a0f1c] border border-[#1e293b] rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>
        <select className="bg-[#0a0f1c] border border-[#1e293b] rounded-lg px-4 py-2 text-sm text-white outline-none w-48 focus:border-indigo-500">
          <option>Todos os status</option>
          <option>Aguardando</option>
          <option>Assinados</option>
        </select>
      </div>

      {/* Contracts List (Replacing Empty State) */}
      <div className="flex-1 bg-[#0f1524] border border-[#1e293b] rounded-xl overflow-hidden flex flex-col min-h-0">
        <div className="grid grid-cols-12 gap-4 px-6 py-2.5 border-b border-[#1e293b] text-xs font-semibold text-slate-400 uppercase bg-[#0a0f1c]/50 shrink-0">
          <div className="col-span-5">Título / Cliente</div>
          <div className="col-span-2">Valor</div>
          <div className="col-span-3">Status</div>
          <div className="col-span-2 text-right">Ações</div>
        </div>
        
        <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
          {/* Contract 1 */}
          <div className="grid grid-cols-12 gap-4 px-6 py-3 border-b border-[#1e293b] hover:bg-[#151b2b] transition-colors items-center group">
            <div className="col-span-5 flex items-start gap-3">
              <div className="w-8 h-8 rounded bg-indigo-500/10 flex items-center justify-center shrink-0 text-indigo-400 mt-0.5">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <div className="font-bold text-sm text-white mb-0.5">Cobertura Fotográfica - Casamento</div>
                <div className="text-xs text-slate-400">marcos.silva@exemplo.com</div>
              </div>
            </div>
            <div className="col-span-2 font-medium text-sm">
              R$ 4.500,00
            </div>
            <div className="col-span-3">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <CheckCircle2 className="w-3 h-3" /> Assinado
              </span>
            </div>
            <div className="col-span-2 flex justify-end">
              <button className="text-slate-400 hover:text-white p-1 rounded hover:bg-white/10 transition-colors">
                <MoreHorizontal className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Contract 2 */}
          <div className="grid grid-cols-12 gap-4 px-6 py-3 border-b border-[#1e293b] hover:bg-[#151b2b] transition-colors items-center group">
            <div className="col-span-5 flex items-start gap-3">
              <div className="w-8 h-8 rounded bg-indigo-500/10 flex items-center justify-center shrink-0 text-indigo-400 mt-0.5">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <div className="font-bold text-sm text-white mb-0.5">Vídeo Institucional - Agência XPTO</div>
                <div className="text-xs text-slate-400">contato@agenciaxpto.com.br</div>
              </div>
            </div>
            <div className="col-span-2 font-medium text-sm">
              R$ 8.200,00
            </div>
            <div className="col-span-3">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <Clock className="w-3 h-3" /> Aguardando
              </span>
            </div>
            <div className="col-span-2 flex justify-end">
              <button className="text-slate-400 hover:text-white p-1 rounded hover:bg-white/10 transition-colors">
                <MoreHorizontal className="w-5 h-5" />
              </button>
            </div>
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
