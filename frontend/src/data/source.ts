// Carga estática: el demo funciona sin backend ni red. BASE_URL respeta el subpath del hosting.
export const loadStatic = async <T,>(file: string): Promise<T> => {
  const res = await fetch(`${import.meta.env.BASE_URL}data/${file}`);
  if (!res.ok) throw new Error(`${file}: HTTP ${res.status}`);
  return (await res.json()) as T;
};

