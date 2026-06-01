import { ArrowLeft, Calendar as CalendarIcon, Trash2, ChevronLeft, ChevronRight } from "lucide-react";

export function AgendaMockup() {
  const days = [
    { d: 31, type: "muted" },
    { d: 1, type: "selected" },
    { d: 2, type: "unavailable" },
    { d: 3, type: "unavailable" },
    { d: 4, type: "unavailable" },
    { d: 5, type: "available" },
    { d: 6, type: "available" },
    { d: 7, type: "unavailable" },
    { d: 8, type: "unavailable" },
    { d: 9, type: "unavailable" },
    { d: 10, type: "unavailable" },
    { d: 11, type: "unavailable" },
    { d: 12, type: "available" },
    { d: 13, type: "available" },
    { d: 14, type: "available" },
    { d: 15, type: "unavailable" },
    { d: 16, type: "unavailable" },
    { d: 17, type: "unavailable" },
    { d: 18, type: "unavailable" },
    { d: 19, type: "available" },
    { d: 20, type: "available" },
    { d: 21, type: "available" },
    { d: 22, type: "unavailable" },
    { d: 23, type: "unavailable" },
    { d: 24, type: "unavailable" },
    { d: 25, type: "unavailable" },
    { d: 26, type: "available" },
    { d: 27, type: "available" },
    { d: 28, type: "available" },
    { d: 29, type: "unavailable" },
    { d: 30, type: "unavailable" },
    { d: 1, type: "muted" },
    { d: 2, type: "muted" },
    { d: 3, type: "available" },
    { d: 4, type: "available" },
  ];

  return (
    <div className="w-full h-full bg-[#0a0f1c] text-white p-5 font-sans overflow-hidden rounded-b-xl flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-4 mb-4 shrink-0">
        <button className="w-8 h-8 rounded-full hover:bg-slate-800 flex items-center justify-center transition-colors">
          <ArrowLeft className="w-5 h-5 text-slate-300" />
        </button>
        <div>
          <h1 className="text-2xl font-bold mb-1">Minha Agenda</h1>
          <p className="text-slate-400 text-sm">Gerencie seus horários e datas disponíveis para contratação.</p>
        </div>
      </div>

      {/* Main Container */}
      <div className="bg-[#121827] border border-[#1e293b] rounded-2xl p-4 flex-1 flex flex-col min-h-0">
        <div className="mb-3 shrink-0">
          <h2 className="text-xl font-bold mb-1">Minha Disponibilidade</h2>
          <p className="text-slate-400 text-xs">Gerencie os dias e horários que você está disponível para serviços</p>
        </div>

        <div className="flex gap-6 flex-1 min-h-0">
          {/* Left: Calendar Widget */}
          <div className="w-[280px] shrink-0 flex flex-col gap-3">
            <div className="bg-[#0a0f1c] border border-[#1e293b] rounded-xl p-3 shrink-0">
              {/* Calendar Header */}
              <div className="flex justify-between items-center mb-3">
                <button className="text-slate-400 hover:text-white"><ChevronLeft className="w-4 h-4" /></button>
                <span className="font-bold text-sm">junho 2026</span>
                <button className="text-slate-400 hover:text-white"><ChevronRight className="w-4 h-4" /></button>
              </div>
              
              {/* Days of week */}
              <div className="grid grid-cols-7 text-center text-xs text-slate-400 mb-4">
                <span>dom</span><span>seg</span><span>ter</span><span>qua</span><span>qui</span><span>sex</span><span>sab</span>
              </div>
              
              {/* Days grid */}
              <div className="grid grid-cols-7 gap-y-2 gap-x-2 text-center text-xs font-medium">
                {days.map((day, i) => (
                  <div key={i} className="flex justify-center">
                    <div className={`
                      w-8 h-8 rounded-md flex items-center justify-center
                      ${day.type === 'muted' ? 'text-slate-600' : ''}
                      ${day.type === 'selected' ? 'bg-[#1e3a8a] text-blue-300 border border-blue-500/30' : ''}
                      ${day.type === 'unavailable' ? 'bg-[#450a0a] text-red-400 border border-red-900/30' : ''}
                      ${day.type === 'available' ? 'bg-[#064e3b] text-emerald-400 border border-emerald-900/30' : ''}
                    `}>
                      {day.d}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked readOnly className="w-4 h-4 rounded border-slate-600 bg-[#1e3a8a] text-blue-500 focus:ring-blue-500" />
              Dia Inteiro
            </label>
            
            <button className="w-full bg-[#1e3a8a] hover:bg-[#1e40af] text-blue-200 font-medium py-2.5 rounded-lg transition-colors border border-blue-800">
              Adicionar Disponibilidade
            </button>
          </div>

          {/* Right: List of dates */}
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex justify-between items-center mb-3 shrink-0">
              <h3 className="font-semibold text-base">Datas Disponíveis</h3>
              <button className="bg-[#1e293b] hover:bg-[#273549] border border-[#334155] text-white px-3 py-1.5 rounded-lg text-xs transition-colors">
                Selecionar Todos
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
              {[
                "05 de junho, 2026",
                "06 de junho, 2026",
                "12 de junho, 2026",
                "13 de junho, 2026",
                "14 de junho, 2026",
                "19 de junho, 2026",
                "20 de junho, 2026",
              ].map((date, i) => (
                <div key={i} className="bg-[#0a0f1c] border border-[#1e293b] rounded-xl p-3 flex justify-between items-center group hover:border-slate-700 transition-colors">
                  <div className="flex items-center gap-3">
                    <input type="checkbox" className="w-3.5 h-3.5 rounded border-slate-700 bg-transparent" />
                    <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center text-blue-500">
                      <CalendarIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-bold text-white mb-0.5">{date}</div>
                      <div className="text-xs text-slate-400">00:00:00 - 23:59:00</div>
                    </div>
                  </div>
                  <button className="w-8 h-8 flex items-center justify-center text-red-500/50 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      {/* Custom scrollbar styles since we are simulating it */}
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #0a0f1c; border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #475569; }
      `}} />
    </div>
  );
}
