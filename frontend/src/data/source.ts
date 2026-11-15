// Static loading: the site works without a backend or network. BASE_URL respects the hosting sub-path.
export const loadStatic = async <T,>(file: string): Promise<T> => {
  const res = await fetch(`${import.meta.env.BASE_URL}data/${file}`);
  if (!res.ok) throw new Error(`${file}: HTTP ${res.status}`);
  return (await res.json()) as T;
};

