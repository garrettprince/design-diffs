import type { ReactNode } from 'react'
import { AddPropertyRow } from '../../ui/components/AddPropertyRow'

export function InspectorPropertySection({ label, present, onAdd, actions, children }: { label: string; present: boolean; onAdd: () => void; actions?: ReactNode; children: ReactNode }) {
  return (
    <section className="border-b border-[#e2e2e2]">
      {present ? (
        <div className="flex h-[42px] items-center justify-between px-3 pt-2.5 pb-3">
          <h2 className="text-[12px] leading-[18px] font-medium text-black/80">{label}</h2>
          {actions}
        </div>
      ) : <AddPropertyRow label={label} onAdd={onAdd} />}
      {present && <div className="px-3 pb-3">{children}</div>}
    </section>
  )
}
