import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Heart, Send, Trash2, Award, Loader2, MessageCircle
} from "lucide-react";

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "agora";
  if (minutes < 60) return `${minutes}m atrás`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h atrás`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d atrás`;
  const months = Math.floor(days / 30);
  return `${months}mo atrás`;
}

interface Comment {
  id: number;
  userId: number;
  content: string;
  likesCount: number;
  createdAt: string;
  authorName: string;
  authorInitial: string;
  authorAvatar?: string | null;
  authorUsername?: string | null;
  liked: boolean;
}

interface LessonCommentsProps {
  lessonId: number;
}

export default function LessonComments({ lessonId }: LessonCommentsProps) {
  const { user } = useAuth();
  const [comment, setComment] = useState("");

  const { data, isLoading } = useQuery<{ comments: Comment[] }>({
    queryKey: [`/api/community/lessons/${lessonId}/comments`],
    enabled: !!user,
  });

  const addComment = useMutation({
    mutationFn: async (content: string) => {
      await apiRequest("POST", `/api/community/lessons/${lessonId}/comments`, { content });
    },
    onSuccess: () => {
      setComment("");
      queryClient.invalidateQueries({ queryKey: [`/api/community/lessons/${lessonId}/comments`] });
      queryClient.invalidateQueries({ queryKey: [`/api/community/lessons/${lessonId}/comment-count`] });
    },
  });

  const toggleLike = useMutation({
    mutationFn: async (commentId: number) => {
      await apiRequest("POST", `/api/community/comments/${commentId}/like`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/community/lessons/${lessonId}/comments`] });
    },
  });

  const deleteComment = useMutation({
    mutationFn: async (commentId: number) => {
      await apiRequest("DELETE", `/api/community/comments/${commentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/community/lessons/${lessonId}/comments`] });
      queryClient.invalidateQueries({ queryKey: [`/api/community/lessons/${lessonId}/comment-count`] });
    },
  });

  const comments = data?.comments || [];

  return (
    <div className="space-y-4">
      <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
        <MessageCircle className="w-4 h-4 text-gold" />
        {comments.length} {comments.length === 1 ? "comentário" : "comentários"}
      </h4>

      {isLoading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : comments.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-4">Nenhum comentário nesta aula. Seja o primeiro!</p>
      ) : (
        <div className="space-y-3">
          {comments.map((c) => (
            <div key={c.id} className="flex gap-3 group">
              {c.authorAvatar ? (
                <img src={c.authorAvatar} alt="" className="w-7 h-7 rounded-full object-cover border border-gold/30 flex-shrink-0 mt-0.5" />
              ) : (
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-gold/80 to-gold border border-gold/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-[10px] font-semibold text-[#0A1628]">{c.authorInitial}</span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-foreground">{c.authorName}</span>
                  {c.authorUsername && <span className="text-[10px] text-muted-foreground/60">@{c.authorUsername}</span>}
                  <span className="text-[10px] text-muted-foreground">{timeAgo(c.createdAt)}</span>
                </div>
                <p className="text-sm text-muted-foreground mt-0.5 break-words">{c.content}</p>
                <div className="flex items-center gap-3 mt-1">
                  <button
                    onClick={() => toggleLike.mutate(c.id)}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-rose-400 transition-colors"
                  >
                    <Heart className={`w-3 h-3 ${c.liked ? "fill-rose-400 text-rose-400" : ""}`} />
                    {c.likesCount > 0 && c.likesCount}
                  </button>
                  {c.userId === user?.id && (
                    <button
                      onClick={() => deleteComment.mutate(c.id)}
                      className="text-xs text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add comment */}
      <div className="flex gap-2 items-start pt-2 border-t border-border/30">
        <Textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Deixe um comentário sobre esta aula..."
          className="min-h-[36px] h-9 resize-none text-sm bg-background/50 border-border/40"
          rows={1}
        />
        <Button
          size="sm"
          variant="ghost"
          disabled={!comment.trim() || addComment.isPending}
          onClick={() => addComment.mutate(comment.trim())}
          className="text-gold hover:text-gold hover:bg-gold/10 h-9 px-3"
        >
          {addComment.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </div>
      <p className="text-[10px] text-muted-foreground/60 flex items-center gap-1">
        <Award className="w-3 h-3" /> Comentários em aulas geram R$ 50 em créditos
      </p>
    </div>
  );
}
