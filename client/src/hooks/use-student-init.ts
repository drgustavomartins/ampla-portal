import { useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import type { Module, Lesson, LessonProgress, Plan, UserVideoProgress, SupplementaryProgress } from "@shared/schema";
import { mergeServerProgress } from "@/hooks/use-video-progress";

export interface SupplementaryItem {
  id: number;
  type: string;
  title: string;
  description: string | null;
  video_url: string | null;
  audio_url: string | null;
  thumbnail_url: string | null;
  category: string | null;
  duration: string | null;
  order: number;
  visible: boolean;
  created_at: string;
  updated_at: string | null;
}

export interface CertificateItem {
  id: number;
  user_id: number;
  module_id: number;
  issued_at: string;
  certificate_number: string;
  student_name: string;
  module_name: string;
  completed_lessons: number;
  total_lessons: number;
}

export interface StudentInitData {
  modules: Module[];
  lessons: Lesson[];
  plans: Plan[];
  progress: LessonProgress[];
  myModules: { accessAll: boolean; moduleIds: number[]; selectedTheme?: string; needsThemeSelection?: boolean; isTrial?: boolean; expired?: boolean };
  lessonAccess: { accessType: string; allowedLessonIds: number[] };
  podcasts: SupplementaryItem[];
  certificates: CertificateItem[];
  videoProgress: UserVideoProgress[];
  supplementaryProgress: SupplementaryProgress[];
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
      queryClient.setQueryData(["/api/supplementary-progress", user?.id], data.supplementaryProgress);
      queryClient.setQueryData(["/api/my-modules"], data.myModules);
      queryClient.setQueryData(["/api/lessons/access"], data.lessonAccess);

      // Merge server video progress into localStorage (server wins if newer)
      if (data.videoProgress) {
        mergeServerProgress(data.videoProgress);
      }

      return data;
    },
    enabled: !!user?.id,
    staleTime: 10 * 60 * 1000, // 10 minutes — modules/plans rarely change
  });
}
