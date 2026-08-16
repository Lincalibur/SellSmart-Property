import { PROCESS_STAGES } from '../data/seed'
import { CheckIcon } from './icons'

export default function ProcessTracker({ stageIndex, compact = false }) {
  return (
    <div className={compact ? '' : 'overflow-x-auto pb-2'}>
      <div className={`flex items-start ${compact ? 'gap-1' : 'gap-0 min-w-[720px]'}`}>
        {PROCESS_STAGES.map((stage, i) => {
          const done = i < stageIndex
          const current = i === stageIndex
          return (
            <div key={stage} className="flex-1 flex flex-col items-center relative">
              {i > 0 && (
                <div
                  className={`absolute top-3.5 right-1/2 w-full h-0.5 -z-0 ${
                    i <= stageIndex ? 'bg-brand-green-600' : 'bg-navy-100'
                  }`}
                />
              )}
              <div
                className={`z-10 flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold border-2 ${
                  done
                    ? 'bg-brand-green-600 border-brand-green-600 text-white'
                    : current
                      ? 'bg-white border-brand-green-600 text-brand-green-600'
                      : 'bg-white border-navy-200 text-navy-300'
                }`}
              >
                {done ? <CheckIcon className="w-4 h-4" /> : i + 1}
              </div>
              {!compact && (
                <span
                  className={`mt-2 text-[11px] text-center leading-tight max-w-[90px] ${
                    done || current ? 'text-navy-900 font-medium' : 'text-navy-400'
                  }`}
                >
                  {stage}
                </span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
