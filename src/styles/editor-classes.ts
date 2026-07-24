export const controlShadow =
  "shadow-[inset_0_1px_0_#ffffff88,inset_0_0_1px_1px_#ffffff88,0_.5px_1px_#0001,0_0_1px_#0002,0_0_4px_-1px_#0002]";

export const raisedControl = `rounded-[5px] bg-[#f9f9f9] ${controlShadow}`;

export const subtlePress =
  "active:bg-[#f5f5f5] active:shadow-[inset_0_0_0_1px_#00000008]";

export const iconAction =
  "grid size-6 shrink-0 place-items-center rounded-[5px] border-0 bg-transparent p-0 text-black/60 transition-colors duration-100 hover:bg-black/[0.055] hover:text-black focus-visible:bg-black/[0.055] focus-visible:text-black focus-visible:outline-none active:bg-black/[0.08] disabled:cursor-default disabled:opacity-35 disabled:hover:bg-transparent disabled:hover:text-black/60";

export const iconSlot = "grid size-6 shrink-0 place-items-center text-black/60";

export const inspectorField = `flex h-6 min-w-0 items-center gap-[5px] px-[7px] text-black/35 ${raisedControl}`;

export const propertySection = "border-b border-[#e2e2e2] px-3 pt-2.5 pb-3";

export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}
