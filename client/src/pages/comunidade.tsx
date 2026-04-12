import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  Heart, MessageCircle, Send, Image, Trash2, Award, ChevronLeft,
  Plus, Loader2, Users
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

interface Post {
  id: number;
  userId: number;
  content: string;
  imageUrls: string[];
  postType: string;
  likesCount: number;
  commentsCount: number;
  createdAt: string;
  authorName: string;
  authorInitial: string;
  liked: boolean;
}

interface Comment {
  id: number;
  userId: number;
  content: string;
  likesCount: number;
  createdAt: string;
  authorName: string;
  authorInitial: string;
  liked: boolean;
}

const POST_TYPES = [
  { value: "general", label: "Geral" },
  { value: "case_study", label: "Caso Clínico" },
  { value: "before_after", label: "Antes/Depois" },
];

const POST_TYPE_BADGES: Record<string, { label: string; className: string }> = {
  case_study: { label: "Caso Clínico", className: "bg-gold/15 text-gold border-gold/30" },
  before_after: { label: "Antes/Depois", className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
};

function PostComments({ postId }: { postId: number }) {
  const { user } = useAuth();
  const [comment, setComment] = useState("");

  const { data, isLoading } = useQuery<{ comments: Comment[] }>({
    queryKey: [`/api/community/posts/${postId}/comments`],
  });

  const addComment = useMutation({
    mutationFn: async (content: string) => {
      await apiRequest("POST", `/api/community/posts/${postId}/comments`, { content });
    },
    onSuccess: () => {
      setComment("");
      queryClient.invalidateQueries({ queryKey: [`/api/community/posts/${postId}/comments`] });
      queryClient.invalidateQueries({ queryKey: ["/api/community/posts"] });
    },
  });

  const toggleLike = useMutation({
    mutationFn: async (commentId: number) => {
      await apiRequest("POST", `/api/community/comments/${commentId}/like`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/community/posts/${postId}/comments`] });
    },
  });

  const deleteComment = useMutation({
    mutationFn: async (commentId: number) => {
      await apiRequest("DELETE", `/api/community/comments/${commentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/community/posts/${postId}/comments`] });
      queryClient.invalidateQueries({ queryKey: ["/api/community/posts"] });
    },
  });

  const comments = data?.comments || [];

  return (
    <div className="border-t border-border/30 pt-4 mt-4 space-y-3">
      {isLoading ? (
        <div className="flex justify-center py-4">
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        </div>
      ) : comments.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-2">Nenhum comentário ainda. Seja o primeiro!</p>
      ) : (
        comments.map((c) => (
          <div key={c.id} className="flex gap-3 group">
            <div className="w-7 h-7 rounded-full bg-gold/15 border border-gold/30 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-[10px] font-semibold text-gold">{c.authorInitial}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-foreground">{c.authorName}</span>
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
        ))
      )}

      <div className="flex gap-2 items-start pt-2">
        <Textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Escreva um comentário..."
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
        <Award className="w-3 h-3" /> Comentários geram R$ 50 em créditos
      </p>
    </div>
  );
}

export default function ComunidadePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showCreate, setShowCreate] = useState(false);
  const [content, setContent] = useState("");
  const [postType, setPostType] = useState("general");
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [imageInput, setImageInput] = useState("");
  const [expandedComments, setExpandedComments] = useState<Set<number>>(new Set());
  const [offset, setOffset] = useState(0);
  const LIMIT = 20;

  const { data, isLoading } = useQuery<{ posts: Post[] }>({
    queryKey: ["/api/community/posts", `?limit=${LIMIT}&offset=${offset}`],
  });

  const posts = data?.posts || [];

  const createPost = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/community/posts", {
        content: content.trim(),
        imageUrls,
        postType,
      });
    },
    onSuccess: () => {
      setContent("");
      setPostType("general");
      setImageUrls([]);
      setImageInput("");
      setShowCreate(false);
      setOffset(0);
      queryClient.invalidateQueries({ queryKey: ["/api/community/posts"] });
      toast({ title: "Publicado!", description: "Seu post foi publicado. Créditos serão analisados em breve." });
    },
    onError: (err: any) => {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    },
  });

  const toggleLike = useMutation({
    mutationFn: async (postId: number) => {
      await apiRequest("POST", `/api/community/posts/${postId}/like`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/community/posts"] });
    },
  });

  const deletePost = useMutation({
    mutationFn: async (postId: number) => {
      await apiRequest("DELETE", `/api/community/posts/${postId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/community/posts"] });
      toast({ title: "Post removido" });
    },
  });

  function toggleComments(postId: number) {
    setExpandedComments((prev) => {
      const next = new Set(prev);
      if (next.has(postId)) next.delete(postId);
      else next.add(postId);
      return next;
    });
  }

  function addImageUrl() {
    const url = imageInput.trim();
    if (!url) return;
    setImageUrls((prev) => [...prev, url]);
    setImageInput("");
  }

  function removeImage(index: number) {
    setImageUrls((prev) => prev.filter((_, i) => i !== index));
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border/40">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/">
              <button className="w-9 h-9 rounded-full border border-border/40 flex items-center justify-center hover:bg-card transition-colors">
                <ChevronLeft className="w-4 h-4 text-muted-foreground" />
              </button>
            </Link>
            <div>
              <h1 className="text-lg font-serif font-semibold text-foreground flex items-center gap-2">
                <Users className="w-5 h-5 text-gold" />
                Comunidade Ampla
              </h1>
              <p className="text-xs text-muted-foreground">Compartilhe cases, troque experiências com outros alunos</p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => setShowCreate(!showCreate)}
            className="bg-gold hover:bg-gold/90 text-primary-foreground font-semibold"
          >
            <Plus className="w-4 h-4 mr-1" /> Novo Post
          </Button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Create Post Section */}
        {showCreate && (
          <div className="rounded-2xl border border-gold/30 bg-card/80 p-5 space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Nova publicação</h3>

            {/* Post type pills */}
            <div className="flex gap-2">
              {POST_TYPES.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setPostType(t.value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
                    postType === t.value
                      ? "bg-gold/15 text-gold border-gold/40"
                      : "bg-card border-border/40 text-muted-foreground hover:border-gold/30"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Compartilhe um caso clínico, resultado ou experiência..."
              className="min-h-[100px] bg-background/50 border-border/40 resize-none"
              rows={4}
            />

            {/* Image URLs */}
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  value={imageInput}
                  onChange={(e) => setImageInput(e.target.value)}
                  placeholder="URL da imagem"
                  className="bg-background/50 border-border/40 text-sm"
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addImageUrl(); }}}
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={addImageUrl}
                  className="border-border/40 text-muted-foreground hover:text-gold shrink-0"
                >
                  <Image className="w-4 h-4 mr-1" /> Adicionar
                </Button>
              </div>
              {imageUrls.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {imageUrls.map((url, i) => (
                    <div key={i} className="relative group rounded-lg overflow-hidden border border-border/30 aspect-square">
                      <img src={url} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = ""; }} />
                      <button
                        onClick={() => removeImage(i)}
                        className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-3 h-3 text-white" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between">
              <p className="text-[10px] text-muted-foreground/60 flex items-center gap-1">
                <Award className="w-3 h-3" /> Publicações geram R$ 50 em créditos (sujeito a aprovação)
              </p>
              <Button
                size="sm"
                disabled={!content.trim() || createPost.isPending}
                onClick={() => createPost.mutate()}
                className="bg-gold hover:bg-gold/90 text-primary-foreground font-semibold"
              >
                {createPost.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                Publicar
              </Button>
            </div>
          </div>
        )}

        {/* Feed */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-gold" />
            <p className="text-sm text-muted-foreground">Carregando comunidade...</p>
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-20 space-y-3">
            <Users className="w-12 h-12 text-muted-foreground/30 mx-auto" />
            <p className="text-muted-foreground">Nenhuma publicação ainda. Seja o primeiro a postar!</p>
          </div>
        ) : (
          <>
            {posts.map((post) => (
              <div key={post.id} className="rounded-2xl border border-border/40 bg-card/60 p-5 space-y-3">
                {/* Author header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gold/15 border border-gold/30 flex items-center justify-center">
                      <span className="text-xs font-semibold text-gold">{post.authorInitial}</span>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-foreground">{post.authorName}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-muted-foreground">{timeAgo(post.createdAt)}</span>
                        {POST_TYPE_BADGES[post.postType] && (
                          <Badge variant="outline" className={`text-[10px] py-0 px-1.5 ${POST_TYPE_BADGES[post.postType].className}`}>
                            {POST_TYPE_BADGES[post.postType].label}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  {post.userId === user?.id && (
                    <button
                      onClick={() => deletePost.mutate(post.id)}
                      className="text-muted-foreground hover:text-destructive transition-colors p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Content */}
                <p className="text-sm text-foreground/90 whitespace-pre-wrap break-words leading-relaxed">{post.content}</p>

                {/* Images */}
                {post.imageUrls && post.imageUrls.length > 0 && (
                  <div className={`grid gap-2 ${post.imageUrls.length === 1 ? "grid-cols-1" : post.imageUrls.length === 2 ? "grid-cols-2" : "grid-cols-3"}`}>
                    {post.imageUrls.map((url, i) => (
                      <div key={i} className="rounded-lg overflow-hidden border border-border/30 aspect-video">
                        <img src={url} alt="" className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => toggleLike.mutate(post.id)}
                    className={`flex items-center gap-1.5 text-sm transition-colors ${
                      post.liked ? "text-rose-400" : "text-muted-foreground hover:text-rose-400"
                    }`}
                  >
                    <Heart className={`w-4 h-4 ${post.liked ? "fill-rose-400" : ""}`} />
                    <span className="text-xs">{post.likesCount || ""}</span>
                  </button>
                  <button
                    onClick={() => toggleComments(post.id)}
                    className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-gold transition-colors"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span className="text-xs">{post.commentsCount || ""}</span>
                  </button>
                </div>

                {/* Comments section */}
                {expandedComments.has(post.id) && <PostComments postId={post.id} />}
              </div>
            ))}

            {/* Pagination */}
            {posts.length >= LIMIT && (
              <div className="flex justify-center pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setOffset((prev) => prev + LIMIT)}
                  className="border-border/40 text-muted-foreground hover:text-gold"
                >
                  Carregar mais
                </Button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
