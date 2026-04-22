import { useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import type { Module, Lesson, LessonProgress, Plan } from "@shared/schema";

export interface StudentInitData {
  modules: Module[];
  lessons: Lesson[];
  plans: Plan[];
  progress: LessonProgress[];
  myModules: { accessAll: boolean; moduleIds: number[] };
  lessonAccess: { accessType: string; allowedLessonIds: number[] };
}

/**
 * Single-request hook that fetches all data the student dashboard needs.
 * Replaces 6 separate useQuery calls with one combined payload,
 * eliminating the request waterfall on page load.
 *
 * Also seeds individual React Query cache keys so components that
 * still reference them (e.g. module-page) get cache hits.
 */
export function useStudentInit() {
  const { user } = useAuth();

  return useQuery<StudentInitData>({
    queryKey: ["/api/student/init", user?.id],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/student/init");
      const data: StudentInitData = await res.json();

      // Seed individual cache keys so other pages/components get cache hits
      queryClient.setQueryData(["/api/modules"], data.modules);
      queryClient.setQueryData(["/api/lessons"], data.lessons);
      queryClient.setQueryData(["/api/plans"], data.plans);
      queryClient.setQueryData(["/api/progress", user?.id], data.progress);
      queryClient.setQueryData(["/api/my-modules"], data.myModules);
      queryClient.setQueryData(["/api/lessons/access"], data.lessonAccess);

      return data;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes — modules/plans rarely change
  });
}
