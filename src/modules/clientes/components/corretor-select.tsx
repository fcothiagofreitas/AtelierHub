"use client";

type Opt = { id: string; name: string };

type CorretorSelectProps = {
  id?: string;
  name?: string;
  options: Opt[];
  defaultValue?: string | null;
  disabled?: boolean;
};

export function CorretorSelect({
  id = "corretorId",
  name = "corretorId",
  options,
  defaultValue,
  disabled,
}: CorretorSelectProps) {
  return (
    <select
      id={id}
      name={name}
      disabled={disabled}
      defaultValue={defaultValue ?? ""}
      className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50"
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
