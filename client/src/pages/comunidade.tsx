import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Heart, MessageCircle, Send, Image, Trash2, Award, ChevronLeft,
  Plus, Loader2, Users, Settings, Camera, X
} from "lucide-react";

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "agora";
  if (minutes < 60) return `${minutes}m atras`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h atras`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d atras`;
  const months = Math.floor(days / 30);
  return `${months}mo atras`;
}

// ─── Avatar component ──────────────────────────────────────────────────────
function UserAvatar({ name, avatarUrl, size = "md", className = "" }: {
  name: string;
  avatarUrl?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const sizeMap = { sm: "w-7 h-7 text-[10px]", md: "w-10 h-10 text-xs", lg: "w-20 h-20 text-2xl" };
  const initial = name?.[0]?.toUpperCase() || "?";

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        className={`${sizeMap[size].split(" ").slice(0, 2).join(" ")} rounded-full object-cover border-2 border-gold/30 ${className}`}
        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; (e.target as HTMLImageElement).nextElementSibling?.classList.remove("hidden"); }}
      />
    );
  }

  return (
    <div className={`${sizeMap[size]} rounded-full bg-gradient-to-br from-gold/80 to-gold border-2 border-gold/30 flex items-center justify-center shrink-0 ${className}`}>
      <span className="font-semibold text-[#0A1628]">{initial}</span>
    </div>
  );
}

// ─── Interfaces ────────────────────────────────────────────────────────────
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
  authorAvatar?: string | null;
  authorUsername?: string | null;
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
  authorAvatar?: string | null;
  authorUsername?: string | null;
  liked: boolean;
}

const POST_TYPES = [
  { value: "general", label: "Geral" },
  { value: "case_study", label: "Caso Clinico" },
  { value: "before_after", label: "Antes/Depois" },
];

const POST_TYPE_BADGES: Record<string, { label: string; className: string }> = {
  case_study: { label: "Caso Clinico", className: "bg-gold/15 text-gold border-gold/30" },
  before_after: { label: "Antes/Depois", className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
};

// ─── Post Comments ─────────────────────────────────────────────────────────
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
    <div className="border-t border-white/5 pt-4 mt-4 space-y-3">
      {isLoading ? (
        <div className="flex justify-center py-4">
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        </div>
      ) : comments.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-2">Nenhum comentario ainda. Seja o primeiro!</p>
      ) : (
        comments.map((c) => (
          <div key={c.id} className="flex gap-3 group">
            <UserAvatar name={c.authorName} avatarUrl={c.authorAvatar} size="sm" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-foreground">{c.authorName}</span>
                {c.authorUsername && <span className="text-[10px] text-muted-foreground/60">@{c.authorUsername}</span>}
                <span className="text-[10px] text-muted-foreground">{timeAgo(c.createdAt)}</span>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5 break-words">{c.content}</p>
              <div className="flex items-center gap-3 mt-1.5">
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

      {/* Add comment */}
      <div className="flex gap-3 items-start pt-2">
        <UserAvatar name={user?.name || ""} avatarUrl={(user as any)?.avatarUrl} size="sm" />
        <div className="flex-1 flex gap-2">
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Escreva um comentario..."
            className="min-h-[36px] h-9 resize-none text-sm bg-[#0A1628]/60 border-white/5 focus:border-gold/30"
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
      </div>
      <p className="text-[10px] text-muted-foreground/50 flex items-center gap-1 pl-10">
        <Award className="w-3 h-3" /> Comentarios geram R$ 50 em creditos
      </p>
    </div>
  );
}

// ─── Profile Editor ────────────────────────────────────────────────────────
function ProfileEditor({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [avatarUrl, setAvatarUrl] = useState((user as any)?.avatarUrl || "");
  const [username, setUsername] = useState((user as any)?.username || "");
  const [name, setName] = useState(user?.name || "");
  const [avatarUploading, setAvatarUploading] = useState(false);
  const avatarFileRef = useRef<HTMLInputElement>(null);

  const handleAvatarUpload = async (file: File) => {
    setAvatarUploading(true);
    try {
      const token = localStorage.getItem("ampla_token");
      const fd = new FormData();
      fd.append("avatar", file);
      const resp = await fetch("/api/upload/avatar", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      if (!resp.ok) throw new Error("Erro ao enviar imagem");
      const data = await resp.json();
      setAvatarUrl(data.avatarUrl);
      toast({ title: "Foto enviada!" });
    } catch {
      toast({ title: "Erro ao enviar foto", variant: "destructive" });
    } finally {
      setAvatarUploading(false);
    }
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("PUT", "/api/profile", {
        name: name.trim(),
        username: username.trim(),
        avatarUrl: avatarUrl.trim(),
      });
    },
    onSuccess: () => {
      toast({ title: "Perfil salvo!" });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      onClose();
    },
    onError: (err: any) => {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    },
  });

  const isValidUsername = !username || /^[a-zA-Z0-9_]{0,30}$/.test(username);

  return (
    <div className="rounded-2xl bg-[#0F1A2E] border border-white/5 p-5 space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Camera className="w-4 h-4 text-gold" />
          Perfil da Comunidade
        </h3>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex items-center gap-5">
        <div className="relative cursor-pointer group" onClick={() => avatarFileRef.current?.click()}>
          <UserAvatar name={name || user?.name || ""} avatarUrl={avatarUrl || null} size="lg" />
          <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            {avatarUploading ? <Loader2 className="w-5 h-5 text-white animate-spin" /> : <Camera className="w-5 h-5 text-white" />}
          </div>
        </div>
        <input
          ref={avatarFileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleAvatarUpload(file);
            e.target.value = "";
          }}
        />
        <div className="flex-1 space-y-3">
          <div className="space-y-1.5">
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Foto de perfil</Label>
            <button
              type="button"
              onClick={() => avatarFileRef.current?.click()}
              disabled={avatarUploading}
              className="w-full flex items-center justify-center gap-2 rounded-lg border border-dashed border-gold/30 bg-gold/5 px-3 py-2 text-xs font-medium transition-colors hover:bg-gold/10 disabled:opacity-50"
              style={{ color: '#D4A843' }}
            >
              {avatarUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
              {avatarUploading ? "Enviando..." : "Enviar foto"}
            </button>
          </div>
          <div className="space-y-1.5">
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Nome de usuario</Label>
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, "").slice(0, 30))}
              placeholder="@seu_usuario"
              className={`bg-[#0A1628]/60 border-white/5 text-sm h-9 focus:border-gold/30 ${!isValidUsername ? "border-destructive" : ""}`}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Nome</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-[#0A1628]/60 border-white/5 text-sm h-9 focus:border-gold/30"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button
          size="sm"
          disabled={saveMutation.isPending || !isValidUsername}
          onClick={() => saveMutation.mutate()}
          className="bg-gold hover:bg-gold/90 text-[#0A1628] font-semibold"
        >
          {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
          Salvar perfil
        </Button>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────
export default function ComunidadePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showCreate, setShowCreate] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
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
      toast({ title: "Publicado!", description: "Creditos serao analisados em breve." });
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

  const userName = user?.name || "";
  const userAvatar = (user as any)?.avatarUrl || null;
  const userUsername = (user as any)?.username || null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/">
              <button className="w-9 h-9 rounded-full border border-white/10 flex items-center justify-center hover:bg-white/5 transition-colors">
                <ChevronLeft className="w-4 h-4 text-muted-foreground" />
              </button>
            </Link>
            <div>
              <h1 className="text-lg font-serif font-semibold text-foreground">
                Comunidade Ampla Facial&reg;
              </h1>
              <p className="text-[11px] text-muted-foreground">Compartilhe experiencias, cases clinicos e aprenda com outros profissionais</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowProfile(!showProfile)}
              className="w-9 h-9 rounded-full border border-white/10 flex items-center justify-center hover:bg-white/5 transition-colors"
              title="Editar perfil"
            >
              <Settings className="w-4 h-4 text-muted-foreground" />
            </button>
            <UserAvatar name={userName} avatarUrl={userAvatar} size="md" className="cursor-pointer" />
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        {/* Profile Editor */}
        {showProfile && <ProfileEditor onClose={() => setShowProfile(false)} />}

        {/* Create Post Area */}
        {!showCreate ? (
          <div
            onClick={() => setShowCreate(true)}
            className="rounded-2xl bg-[#0F1A2E] border border-white/5 p-4 flex items-center gap-3 cursor-pointer hover:border-gold/20 transition-colors"
          >
            <UserAvatar name={userName} avatarUrl={userAvatar} size="md" />
            <span className="text-sm text-muted-foreground flex-1">No que voce esta pensando?</span>
            <Button size="sm" className="bg-gold hover:bg-gold/90 text-[#0A1628] font-semibold">
              <Plus className="w-4 h-4 mr-1" /> Publicar
            </Button>
          </div>
        ) : (
          <div className="rounded-2xl bg-[#0F1A2E] border border-gold/20 p-5 space-y-4">
            <div className="flex gap-3">
              <UserAvatar name={userName} avatarUrl={userAvatar} size="md" className="mt-1" />
              <div className="flex-1 space-y-3">
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Compartilhe um caso clinico, resultado ou experiencia..."
                  className="min-h-[100px] bg-[#0A1628]/60 border-white/5 resize-none focus:border-gold/30"
                  rows={4}
                  autoFocus
                />

                {/* Post type pills */}
                <div className="flex gap-2">
                  {POST_TYPES.map((t) => (
                    <button
                      key={t.value}
                      onClick={() => setPostType(t.value)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                        postType === t.value
                          ? "bg-gold/15 text-gold border-gold/40 shadow-[0_0_8px_rgba(212,168,67,0.1)]"
                          : "bg-transparent border-white/10 text-muted-foreground hover:border-gold/20"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                {/* Image URLs */}
                <div className="flex gap-2">
                  <Input
                    value={imageInput}
                    onChange={(e) => setImageInput(e.target.value)}
                    placeholder="URL da imagem"
                    className="bg-[#0A1628]/60 border-white/5 text-sm h-9 focus:border-gold/30"
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addImageUrl(); }}}
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={addImageUrl}
                    className="text-muted-foreground hover:text-gold h-9 px-3"
                  >
                    <Image className="w-4 h-4" />
                  </Button>
                </div>
                {imageUrls.length > 0 && (
                  <div className="grid grid-cols-4 gap-2">
                    {imageUrls.map((url, i) => (
                      <div key={i} className="relative group rounded-lg overflow-hidden border border-white/10 aspect-square">
                        <img src={url} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = ""; }} />
                        <button
                          onClick={() => removeImage(i)}
                          className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3 text-white" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between pl-[52px]">
              <p className="text-[10px] text-muted-foreground/50 flex items-center gap-1">
                <Award className="w-3 h-3" /> Gera R$ 50 em creditos
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => { setShowCreate(false); setContent(""); setImageUrls([]); }}
                  className="text-muted-foreground h-8"
                >
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  disabled={!content.trim() || createPost.isPending}
                  onClick={() => createPost.mutate()}
                  className="bg-gold hover:bg-gold/90 text-[#0A1628] font-semibold h-8"
                >
                  {createPost.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                  Publicar
                </Button>
              </div>
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
            <div className="w-16 h-16 rounded-full bg-[#0F1A2E] flex items-center justify-center mx-auto">
              <Users className="w-8 h-8 text-muted-foreground/30" />
            </div>
            <p className="text-muted-foreground">Nenhuma publicacao ainda. Seja o primeiro a postar!</p>
          </div>
        ) : (
          <>
            {posts.map((post) => (
              <div key={post.id} className="rounded-2xl bg-[#0F1A2E] border border-white/5 overflow-hidden">
                {/* Author header */}
                <div className="p-5 pb-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <UserAvatar name={post.authorName} avatarUrl={post.authorAvatar} size="md" />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-foreground">{post.authorName}</span>
                          {POST_TYPE_BADGES[post.postType] && (
                            <Badge variant="outline" className={`text-[10px] py-0 px-1.5 ${POST_TYPE_BADGES[post.postType].className}`}>
                              {POST_TYPE_BADGES[post.postType].label}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5">
                          {post.authorUsername && <span className="text-[11px] text-muted-foreground/60">@{post.authorUsername}</span>}
                          <span className="text-[11px] text-muted-foreground/40">{post.authorUsername ? " · " : ""}{timeAgo(post.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                    {post.userId === user?.id && (
                      <button
                        onClick={() => deletePost.mutate(post.id)}
                        className="text-muted-foreground/40 hover:text-destructive transition-colors p-2 -mr-2"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Content */}
                <div className="px-5 py-3">
                  <p className="text-sm text-foreground/90 whitespace-pre-wrap break-words leading-relaxed">{post.content}</p>
                </div>

                {/* Images */}
                {post.imageUrls && post.imageUrls.length > 0 && (
                  <div className={`px-5 pb-3 grid gap-1.5 ${post.imageUrls.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
                    {post.imageUrls.map((url, i) => (
                      <div key={i} className={`rounded-xl overflow-hidden border border-white/5 ${post.imageUrls.length === 1 ? "aspect-video" : "aspect-square"}`}>
                        <img src={url} alt="" className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                )}

                {/* Actions */}
                <div className="px-5 py-3 border-t border-white/5 flex items-center gap-5">
                  <button
                    onClick={() => toggleLike.mutate(post.id)}
                    className={`flex items-center gap-1.5 transition-all ${
                      post.liked ? "text-gold" : "text-muted-foreground/60 hover:text-gold"
                    }`}
                  >
                    <Heart className={`w-[18px] h-[18px] transition-all ${post.liked ? "fill-gold scale-110" : ""}`} />
                    <span className="text-xs font-medium">{post.likesCount || ""}</span>
                  </button>
                  <button
                    onClick={() => toggleComments(post.id)}
                    className="flex items-center gap-1.5 text-muted-foreground/60 hover:text-gold transition-colors"
                  >
                    <MessageCircle className="w-[18px] h-[18px]" />
                    <span className="text-xs font-medium">{post.commentsCount || ""}</span>
                  </button>
                  <div className="flex items-center gap-1 text-muted-foreground/30 ml-auto" title="Gera R$ 50 em creditos">
                    <Award className="w-3.5 h-3.5" />
                    <span className="text-[10px]">R$50</span>
                  </div>
                </div>

                {/* Comments section */}
                {expandedComments.has(post.id) && (
                  <div className="px-5 pb-5">
                    <PostComments postId={post.id} />
                  </div>
                )}
              </div>
            ))}

            {/* Pagination */}
            {posts.length >= LIMIT && (
              <div className="flex justify-center pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setOffset((prev) => prev + LIMIT)}
                  className="border-white/10 text-muted-foreground hover:text-gold hover:border-gold/30"
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
