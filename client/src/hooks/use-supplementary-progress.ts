import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import type { StudentInitData } from "@/hooks/use-student-init";
import type { SupplementaryProgress } from "@shared/schema";

type ItemType = "podcast" | "material";

/**
 * Hook para marcar/desmarcar podcast ou material como concluído.
 * Faz atualização otimista no cache do init e invalida ao final.
 * Lê a lista do cache do init quando disponível; senão, busca dedicado.
 */
export function useSupplementaryProgress() {
  const { user } = useAuth();

  // Busca dedicada quando o init não estiver populado (ex: página de materiais).
  // É reaproveitada via cache no init via setQueryData no use-student-init.
  const { data: list = [] } = useQuery<SupplementaryProgress[]>({
    queryKey: ["/api/supplementary-progress", user?.id],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/supplementary-progress/${user?.id}`);
      return res.json();
    },
    enabled: !!user?.id,
    staleTime: 60 * 1000,
  });

  const completedSet = new Set(list.filter((p) => p.completed).map((p) => `${p.itemType}:${p.itemId}`));

  const isComplete = (itemType: ItemType, itemId: number): boolean => {
    return list.some((p) => p.itemType === itemType && p.itemId === itemId && p.completed);
  };

  const mutation = useMutation({
    mutationFn: async ({ itemType, itemId, complete }: { itemType: ItemType; itemId: number; complete: boolean }) => {
      const action = complete ? "complete" : "incomplete";
      await apiRequest("POST", `/api/supplementary-progress/${user?.id}/${itemType}/${itemId}/${action}`);
    },
    onMutate: async ({ itemType, itemId, complete }) => {
      const initKey = ["/api/student/init", user?.id];
      const supKey = ["/api/supplementary-progress", user?.id];
      await queryClient.cancelQueries({ queryKey: initKey });
      const previousInit = queryClient.getQueryData<StudentInitData>(initKey);
      const previousSup = queryClient.getQueryData<SupplementaryProgress[]>(supKey);

      const updateList = (list: SupplementaryProgress[] | undefined): SupplementaryProgress[] => {
        const arr = list ? [...list] : [];
        const idx = arr.findIndex((p) => p.itemType === itemType && p.itemId === itemId);
        const completedAt = complete ? new Date().toISOString() : null;
        if (idx >= 0) {
          arr[idx] = { ...arr[idx], completed: complete, completedAt: completedAt as any };
        } else if (complete) {
          arr.push({
            id: -Date.now(),
            userId: user?.id ?? 0,
            itemType,
            itemId,
            completed: true,
            completedAt: completedAt as any,
          } as SupplementaryProgress);
        }
        return arr;
      };

      if (previousInit) {
        queryClient.setQueryData<StudentInitData>(initKey, {
          ...previousInit,
          supplementaryProgress: updateList(previousInit.supplementaryProgress),
        });
      }
      queryClient.setQueryData<SupplementaryProgress[]>(supKey, updateList(previousSup));

      return { previousInit, previousSup };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.previousInit) queryClient.setQueryData(["/api/student/init", user?.id], ctx.previousInit);
      if (ctx?.previousSup) queryClient.setQueryData(["/api/supplementary-progress", user?.id], ctx.previousSup);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/student/init", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/supplementary-progress", user?.id] });
    },
  });

  const toggle = (itemType: ItemType, itemId: number) => {
    const current = isComplete(itemType, itemId);
    mutation.mutate({ itemType, itemId, complete: !current });
  };

  return { isComplete, toggle, completedSet, isPending: mutation.isPending };
}
