"use client";

type Opt = { id: string; name: string };

type CorretorSelectProps = {
  id?: string;
  name?: string;
  options: Opt[];
  defaultValue?: string | null;
  /** Modo controlado (preserva valor após erro de server action). */
  value?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
};

export function CorretorSelect({
  id = "corretorId",
  name = "corretorId",
  options,
  defaultValue,
  value,
  onValueChange,
  disabled,
}: CorretorSelectProps) {
  const controlled = value !== undefined;
  return (
    <select
      id={id}
      name={name}
      disabled={disabled}
      value={controlled ? value : undefined}
      defaultValue={!controlled ? (defaultValue ?? "") : undefined}
      onChange={
        controlled && onValueChange
          ? (e) => onValueChange(e.target.value)
          : undefined
      }
      className="flex h-8 w-full rounded-lg border border-input bg-transparent ps-2.5 pe-10 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50"
    >
      <option value="">Nenhum</option>
      {options.map((o) => (
        <option key={o.id} value={o.id}>
          {o.name}
        </option>
      ))}
    </select>
  );
}
