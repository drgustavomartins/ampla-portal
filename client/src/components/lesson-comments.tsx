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
  /**
   * "full"    – list + compose form (default)
   * "compose" – only the textarea/submit/limit message
   * "list"    – only the comments list (no compose form)
   */
  mode?: "full" | "compose" | "list";
}

export default function LessonComments({ lessonId, mode = "full" }: LessonCommentsProps) {
  const { user } = useAuth();
  const [comment, setComment] = useState("");
  const [limitError, setLimitError] = useState<string | null>(null);

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
      setLimitError(null);
      queryClient.invalidateQueries({ queryKey: [`/api/community/lessons/${lessonId}/comments`] });
      queryClient.invalidateQueries({ queryKey: [`/api/community/lessons/${lessonId}/comment-count`] });
      queryClient.invalidateQueries({ predicate: (q) => String(q.queryKey[0]).startsWith("/api/community/feed") });
    },
    onError: (err: Error) => {
      const msg = err.message || "";
      if (msg.startsWith("409")) {
        const friendly = msg.replace(/^409:\s*/, "").trim();
        try {
          const parsed = JSON.parse(friendly);
          setLimitError(parsed.message || "Você já comentou nesta aula.");
        } catch {
          setLimitError(friendly || "Você já comentou nesta aula.");
        }
        queryClient.invalidateQueries({ queryKey: [`/api/community/lessons/${lessonId}/comments`] });
      } else {
        setLimitError("Não foi possível enviar seu comentário. Tente novamente.");
      }
    },
  });

  const toggleLike = useMutation({
    mutationFn: async (commentId: number) => {
      await apiRequest("POST", `/api/community/comments/${commentId}/like`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/community/lessons/${lessonId}/comments`] });
      queryClient.invalidateQueries({ predicate: (q) => String(q.queryKey[0]).startsWith("/api/community/feed") });
    },
  });

  const deleteComment = useMutation({
    mutationFn: async (commentId: number) => {
      await apiRequest("DELETE", `/api/community/comments/${commentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/community/lessons/${lessonId}/comments`] });
      queryClient.invalidateQueries({ queryKey: [`/api/community/lessons/${lessonId}/comment-count`] });
      queryClient.invalidateQueries({ predicate: (q) => String(q.queryKey[0]).startsWith("/api/community/feed") });
    },
  });

  const comments = data?.comments || [];
  const userAlreadyCommented = !!user && comments.some((c) => c.userId === user.id);

  const composeBlock = (
    <>
      {userAlreadyCommented ? (
        <div>
          <p className="text-xs text-muted-foreground bg-muted/30 border border-border/40 rounded-md px-3 py-2">
            Você já enviou seu comentário nesta aula. Continue a conversa pela comunidade.
          </p>
        </div>
      ) : (
        <>
          <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-start">
            <Textarea
              id={`lesson-comment-textarea-${lessonId}`}
              data-testid="lesson-comment-textarea"
              value={comment}
              onChange={(e) => { setComment(e.target.value); if (limitError) setLimitError(null); }}
              placeholder="Escreva sua dúvida ou comentário sobre esta aula..."
              className="min-h-[88px] resize-none text-sm flex-1"
              style={{ background: "rgba(10,22,40,0.6)", borderColor: "rgba(212,168,67,0.3)" }}
              rows={4}
            />
            <Button
              size="sm"
              disabled={!comment.trim() || addComment.isPending}
              onClick={() => addComment.mutate(comment.trim())}
              className="sm:self-start h-10 px-4 font-semibold whitespace-nowrap"
              style={{ backgroundColor: "#D4A843", color: "#0A1628" }}
            >
              {addComment.isPending ? (
                <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Enviando</>
              ) : (
                <><Send className="w-4 h-4 mr-1.5" /> Enviar comentário</>
              )}
            </Button>
          </div>
          {limitError && (
            <p className="text-xs text-rose-400 mt-2">{limitError}</p>
          )}
          <p className="text-[11px] text-muted-foreground/70 flex items-center gap-1 mt-2">
            <Award className="w-3 h-3" /> Comentários em aulas geram R$ 50 em créditos. Limite de 1 comentário por aula.
          </p>
        </>
      )}
    </>
  );

  if (mode === "compose") {
    return <div className="space-y-2">{composeBlock}</div>;
  }

  const listBlock = (
    <>
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
    </>
  );

  if (mode === "list") {
    return <div className="space-y-4">{listBlock}</div>;
  }

  return (
    <div className="space-y-4">
      {listBlock}
      <div className="pt-3 border-t border-border/30">{composeBlock}</div>
    </div>
  );
}
