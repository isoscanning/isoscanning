import { Calculator, Plus, Package, MonitorSmartphone, Server, TrendingDown, DollarSign, FileText, ChevronDown } from "lucide-react";

export function CalculadoraMockup() {
  return (
    <div className="w-full h-full bg-[#0a0f1c] text-white p-4 font-sans overflow-hidden rounded-b-xl flex flex-col">
      {/* Header Banner */}
      <div className="bg-[#121827] border border-[#1e293b] rounded-xl p-3 flex items-center justify-between mb-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-orange-500/10 rounded-lg flex items-center justify-center border border-orange-500/20 shrink-0">
            <Calculator className="w-4 h-4 text-orange-500" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-orange-500 mb-0.5">Calculadora de Orçamento</h1>
            <p className="text-slate-400 text-[10px] sm:text-xs">Descubra o custo real de cada trabalho com base na depreciação.</p>
          </div>
        </div>
        <button className="bg-orange-500 hover:bg-orange-600 text-white font-medium px-3.5 py-1.5 rounded-lg text-xs flex items-center gap-1.5 transition-colors">
          <FileText className="w-3.5 h-3.5" />
          Criar Orçamento
        </button>
      </div>

      {/* 5 Cards Row */}
      <div className="grid grid-cols-5 gap-2.5 mb-3 shrink-0">
        {[
          { title: "Equipamentos", value: "9", sub: "itens cadastrados", icon: Package, iconColor: "text-orange-500" },
          { title: "Custo / Trabalho", value: "R$ 158,49", sub: "depreciação de equipamentos", icon: TrendingDown, iconColor: "text-orange-500", valueColor: "text-orange-500" },
          { title: "Softwares / Mês", value: "R$ 294,00", sub: "recorrente por mês", icon: MonitorSmartphone, iconColor: "text-purple-500", valueColor: "text-purple-500" },
          { title: "Infraestrutura / Mês", value: "R$ 345,00", sub: "recorrente por mês", icon: Server, iconColor: "text-pink-500", valueColor: "text-pink-500" },
          { title: "Investimento Total", value: "R$ 56.150,00", sub: "em equipamentos", icon: DollarSign, iconColor: "text-green-500" },
        ].map((card, i) => (
          <div key={i} className="bg-[#121827] border border-[#1e293b] rounded-lg p-2 flex flex-col justify-between h-20">
            <div className="flex justify-between items-start">
              <span className="text-[10px] xl:text-xs font-semibold text-white/90 truncate mr-1">{card.title}</span>
              <card.icon className={`w-3.5 h-3.5 shrink-0 ${card.iconColor}`} />
            </div>
            <div>
              <div className={`text-sm xl:text-base font-bold mb-0.5 ${card.valueColor || 'text-white'}`}>{card.value}</div>
              <div className="text-[9px] xl:text-[10px] text-slate-400 truncate">{card.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Accordions */}
      <div className="space-y-2 mb-3 shrink-0">
        {[
          { title: "Equipamentos", sub: "9 itens cadastrados", rightLabel: "Custo/trabalho", rightValue: "R$ 158,49", icon: Package, color: "text-orange-500", bg: "bg-orange-500/10" },
          { title: "Softwares", sub: "3 itens cadastrados", rightLabel: "Total/mês", rightValue: "R$ 294,00", icon: MonitorSmartphone, color: "text-purple-500", bg: "bg-purple-500/10" },
          { title: "Infraestrutura", sub: "3 itens cadastrados", rightLabel: "Total/mês", rightValue: "R$ 345,00", icon: Server, color: "text-pink-500", bg: "bg-pink-500/10" },
        ].map((row, i) => (
          <div key={i} className="bg-[#121827] border border-[#1e293b] rounded-lg p-2 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className={`w-7 h-7 rounded-md flex items-center justify-center ${row.bg}`}>
                <row.icon className={`w-3.5 h-3.5 ${row.color}`} />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-xs">{row.title}</span>
                  <ChevronDown className="w-3 h-3 text-slate-500" />
                </div>
                <span className="text-[9px] text-slate-400">{row.sub}</span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <span className="text-[10px] text-slate-400 mr-1.5">{row.rightLabel}</span>
                <span className={`font-bold text-xs ${row.color}`}>{row.rightValue}</span>
              </div>
              <button className="bg-[#1e293b] hover:bg-[#273549] border border-[#334155] text-white px-2 py-1 rounded-md text-xs flex items-center gap-1 transition-colors">
                <Plus className="w-3 h-3" /> Adicionar
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Orçamentos Gerados */}
      <div className="flex items-center justify-between mb-2 shrink-0">
        <div className="flex items-center gap-2">
          <FileText className="w-3.5 h-3.5 text-orange-500" />
          <h2 className="font-bold text-sm">Orçamentos Gerados</h2>
          <span className="bg-orange-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">1</span>
        </div>
        <button className="bg-orange-500 hover:bg-orange-600 text-white font-medium px-3 py-1 rounded-md text-xs flex items-center gap-1 transition-colors">
          <Plus className="w-3 h-3" /> Novo Orçamento
        </button>
      </div>

      <div className="w-72 bg-[#121827] border border-[#1e293b] rounded-lg p-2.5 shrink-0">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-5.5 h-5.5 rounded bg-orange-500/10 flex items-center justify-center shrink-0">
            <FileText className="w-3.5 h-3.5 text-orange-500" />
          </div>
          <span className="font-bold text-xs truncate">Agência de Marketing XPTO</span>
        </div>
        <div className="border-t border-[#1e293b] pt-2 flex items-center justify-between">
          <span className="text-[10px] text-slate-400">Total estimado</span>
          <span className="font-bold text-xs text-orange-500">R$ 2.057,92</span>
        </div>
      </div>
    </div>
  );
}
