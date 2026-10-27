/**
 * Busca todas as páginas de uma consulta PostgREST/Supabase (que por padrão limita a 1.000 linhas).
 * Quando a consulta tem menos de 1.000 registros, executa apenas 1 requisição sem overhead adicional.
 */
export async function fetchAllPages<T>(
  buildQuery: (
    from: number,
    to: number
  ) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
  pageSize = 1000
): Promise<{ data: T[]; error: { message: string } | null }> {
  const allRows: T[] = [];
  let offset = 0;

  while (true) {
    const { data, error } = await buildQuery(offset, offset + pageSize - 1);
    if (error) {
      return { data: allRows, error };
    }
    const batch = data || [];
    allRows.push(...batch);
    if (batch.length < pageSize) {
      break;
    }
    offset += pageSize;
  }

  return { data: allRows, error: null };
}

