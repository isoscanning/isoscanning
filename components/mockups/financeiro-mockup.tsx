import { FileText, Plus, DollarSign, Calendar, AlertCircle, Edit2, Trash2 } from "lucide-react";

export function FinanceiroMockup() {
  return (
    <div className="w-full h-full bg-[#0a0f1c] text-white p-4 font-sans overflow-hidden rounded-b-xl flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 shrink-0">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-emerald-500 mb-0.5">Gestão Financeira</h1>
          <p className="text-slate-400 text-[10px] sm:text-xs">Acompanhe seu fluxo de caixa e obrigações fiscais.</p>
        </div>
        <div className="flex items-center gap-2.5">
          <button className="bg-transparent border border-slate-700 hover:bg-slate-800 text-white font-medium px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 transition-colors">
            <FileText className="w-3.5 h-3.5" /> Relatório PDF
          </button>
          <button className="bg-emerald-500 hover:bg-emerald-600 text-white font-medium px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 transition-colors">
            <Plus className="w-3.5 h-3.5" /> Novo Lançamento
          </button>
        </div>
      </div>

      {/* Regime */}
      <div className="flex items-center gap-3 mb-3 shrink-0">
        <span className="text-xs text-slate-400">Regime Tributário:</span>
        <div className="flex bg-[#121827] rounded-full p-0.5 border border-[#1e293b]">
          <button className="bg-emerald-500 text-white text-xs font-bold px-3 py-1 rounded-full">MEI</button>
          <button className="text-slate-400 hover:text-white text-xs font-medium px-3 py-1 rounded-full transition-colors">Simples Nacional</button>
        </div>
      </div>

      {/* MEI Limit Card */}
      <div className="bg-[#041d1a] border border-emerald-900/50 rounded-xl p-3 mb-3 grid grid-cols-2 gap-3 shrink-0">
        <div>
          <div className="text-emerald-500 text-xs font-semibold mb-0.5">Faturamento Total Bruto (2026)</div>
          <div className="text-xl sm:text-2xl font-bold text-emerald-400 mb-1">R$ 42.160,00</div>
          <div className="text-[10px] text-slate-400">Soma absoluta de todos os valores registrados no ano.</div>
        </div>
        <div>
          <div className="flex justify-between items-center mb-0.5">
            <span className="text-emerald-500 text-xs font-semibold">Saldo Restante Teto MEI</span>
            <span className="text-slate-400 text-[10px]">Limite Anual</span>
          </div>
          <div className="flex justify-between items-end mb-1">
            <span className="text-xl sm:text-2xl font-bold text-white font-mono">R$ 38.840,00</span>
            <span className="text-emerald-500 border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.2 rounded text-[9px] font-bold">R$ 81.000,00</span>
          </div>
          {/* Progress bar */}
          <div className="h-1.5 w-full bg-[#122b28] rounded-full overflow-hidden mb-1">
            <div className="h-full bg-emerald-500 w-[52%] rounded-full"></div>
          </div>
          <div className="flex justify-between text-[10px]">
            <span className="text-emerald-500">R$ 42.160,00 contabilizado</span>
            <span className="text-slate-400">52.0% atingido</span>
          </div>
        </div>
      </div>

      {/* 4 Cards */}
      <div className="grid grid-cols-4 gap-2.5 mb-3 shrink-0">
        {[
          { title: "Receita no Mês", value: "R$ 0,00", icon: DollarSign, color: "text-emerald-500" },
          { title: "A Receber", value: "R$ 12.350,00", icon: Calendar, color: "text-orange-500" },
          { title: "Faturamento Total", value: "R$ 12.350,00", icon: Calendar, color: "text-blue-500" },
          { title: "NFs Pendentes", value: "2", icon: AlertCircle, color: "text-red-500" },
        ].map((card, i) => (
          <div key={i} className="bg-[#121827] border border-[#1e293b] rounded-xl p-2.5">
            <div className="flex justify-between items-start mb-1">
              <span className="text-[10px] xl:text-xs font-semibold text-white/90 truncate mr-1">{card.title}</span>
              <card.icon className={`w-3.5 h-3.5 shrink-0 ${card.color}`} />
            </div>
            <div className={`text-sm sm:text-base font-bold ${card.color}`}>{card.value}</div>
          </div>
        ))}
      </div>

      {/* Table Section */}
      <div className="bg-[#121827] border border-[#1e293b] rounded-xl overflow-hidden flex flex-col min-h-0">
        <div className="p-3 sm:p-4 flex justify-between items-center border-b border-[#1e293b] shrink-0">
          <div>
            <h2 className="font-bold">Lançamentos</h2>
            <p className="text-xs text-slate-400">Listagem completa de faturamentos e notas fiscais para o período.</p>
          </div>
          <div className="flex gap-2">
            <select className="bg-[#0a0f1c] border border-slate-700 rounded px-3 py-1.5 text-sm text-white outline-none">
              <option>Junho</option>
            </select>
            <select className="bg-[#0a0f1c] border border-slate-700 rounded px-3 py-1.5 text-sm text-white outline-none">
              <option>2026</option>
            </select>
          </div>
        </div>
        
        <div className="w-full flex-1 overflow-y-auto custom-scrollbar pr-1">
          <table className="w-full text-xs sm:text-sm text-left">
            <thead className="text-[10px] sm:text-xs text-slate-400 uppercase bg-[#0a0f1c]/50">
              <tr>
                <th className="px-3 sm:px-4 py-2 font-semibold">Data</th>
                <th className="px-3 sm:px-4 py-2 font-semibold">Descrição</th>
                <th className="px-3 sm:px-4 py-2 font-semibold">Origem</th>
                <th className="px-3 sm:px-4 py-2 font-semibold">Status</th>
                <th className="px-3 sm:px-4 py-2 font-semibold">NFE</th>
                <th className="px-3 sm:px-4 py-2 font-semibold text-right">Valor</th>
                <th className="px-3 sm:px-4 py-2 font-semibold text-center">Ações</th>
              </tr>
            </thead>
            <tbody>
              {[
                { date: "29/06/2026", desc: "Campanha Institucional", origem: "Externo", status: "Pendente", nfe: "Pendente", nfeColor: "text-red-500 bg-red-500/10", val: "R$ 2.000,00" },
                { date: "26/06/2026", desc: "Evento Corporativo", origem: "Externo", status: "Pendente", nfe: "Pendente", nfeColor: "text-red-500 bg-red-500/10", val: "R$ 7.350,00" },
                { date: "10/06/2026", desc: "Ensaio Fotográfico", origem: "Externo", status: "Pendente", nfe: "Não exige", nfeColor: "text-slate-400 bg-slate-800", val: "R$ 3.000,00" },
              ].map((row, i) => (
                <tr key={i} className="border-b border-[#1e293b] hover:bg-[#1a2333] transition-colors">
                  <td className="px-3 sm:px-4 py-2 sm:py-3 flex items-center gap-2 text-slate-300">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" /> {row.date}
                  </td>
                  <td className="px-3 sm:px-4 py-2 sm:py-3 font-medium text-white">{row.desc}</td>
                  <td className="px-3 sm:px-4 py-2 sm:py-3 text-slate-400">
                    <span className="px-1.5 py-0.5 bg-slate-800 rounded text-[10px]">{row.origem}</span>
                  </td>
                  <td className="px-3 sm:px-4 py-2 sm:py-3">
                    <span className="px-1.5 py-0.5 bg-orange-500/10 text-orange-500 border border-orange-500/20 rounded text-[10px] font-medium">{row.status}</span>
                  </td>
                  <td className="px-3 sm:px-4 py-2 sm:py-3">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${row.nfeColor}`}>{row.nfe}</span>
                  </td>
                  <td className="px-3 sm:px-4 py-2 sm:py-3 text-right font-bold">{row.val}</td>
                  <td className="px-3 sm:px-4 py-2 sm:py-3 flex items-center justify-center gap-2">
                    <Edit2 className="w-3.5 h-3.5 text-slate-500 hover:text-white cursor-pointer" />
                    <Trash2 className="w-3.5 h-3.5 text-slate-500 hover:text-red-500 cursor-pointer" />
                  </td>
                </tr>
              ))}
              <tr>
                <td colSpan={5} className="px-3 sm:px-4 py-2 sm:py-3 text-right font-bold">Total:</td>
                <td className="px-3 sm:px-4 py-2 sm:py-3 text-right font-bold text-emerald-500">R$ 12.350,00</td>
                <td></td>
              </tr>
            </tbody>
          </table>
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
