import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Image as ImageIcon, Video, Upload, Download, Share2, Send, ChevronDown, X, ArrowLeft, CreditCard, User, Bot, Plus, MessageSquare, Trash2, Menu, PanelLeftClose, PanelLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import NeonBackground from "@/components/NeonBackground";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
// Image models
const IMAGE_MODELS = [{
  value: "flux-schnell",
  label: "Flux Schnell",
  desc: "Fast & High Quality"
}, {
  value: "flux-dev",
  label: "Flux Dev",
  desc: "Slower, Higher Quality"
}, {
  value: "flux-pro",
  label: "Flux Pro",
  desc: "Best Quality"
}];

// Video models
const VIDEO_MODELS = [{
  value: "veo-3-fast",
  label: "Veo 3.1 Fast",
  desc: "Google - Fast & High Quality"
}, {
  value: "pixverse-v4.5",
  label: "Pixverse V4.5",
  desc: "High Quality Video"
}, {
  value: "sora-2",
  label: "Sora 2",
  desc: "OpenAI - Coming Soon"
}, {
  value: "sora-2-pro",
  label: "Sora 2 Pro",
  desc: "OpenAI - Coming Soon"
}];

const ASPECT_RATIOS = [{
  value: "1:1",
  label: "1:1"
}, {
  value: "16:9",
  label: "16:9"
}, {
  value: "9:16",
  label: "9:16"
}];

const VIDEO_COST = 10;
const IMAGE_COST = 5;

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  type?: "text" | "image" | "video";
  imageUrl?: string;
  status?: "pending" | "processing" | "completed" | "failed";
  errorMessage?: string;
  jobId?: string;
  aspectRatio?: string;
  generationId?: string;
  timestamp: Date;
}

interface Conversation {
  id: string;
  title: string;
  updated_at: string;
}

const getAspectRatioClass = (ratio: string | undefined) => {
  switch (ratio) {
    case "1:1": return "aspect-square";
    case "9:16": return "aspect-[9/16]";
    case "16:9":
    default: return "aspect-video";
  }
};

const Generate = () => {
  const [searchParams] = useSearchParams();
  const initialMode = searchParams.get("mode");
  const [user, setUser] = useState<any>(null);
  const [credits, setCredits] = useState(0);
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [mode, setMode] = useState<"image" | "video">(initialMode === "video" ? "video" : "image");
  const [model, setModel] = useState("flux-schnell");
  const [aspectRatio, setAspectRatio] = useState("16:9");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollingRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
    return () => {
      pollingRef.current.forEach(interval => clearInterval(interval));
    };
  }, []);

  // Force layout recalculation on orientation change
  useEffect(() => {
    const handleOrientationChange = () => {
      // Force a repaint by temporarily modifying the DOM
      document.body.style.overflow = 'hidden';
      requestAnimationFrame(() => {
        document.body.style.overflow = '';
      });
    };

    window.addEventListener('orientationchange', handleOrientationChange);
    window.addEventListener('resize', handleOrientationChange);

    return () => {
      window.removeEventListener('orientationchange', handleOrientationChange);
      window.removeEventListener('resize', handleOrientationChange);
    };
  }, []);

  useEffect(() => {
    if (mode === "image") {
      setModel("flux-schnell");
    } else {
      setModel("veo-3-fast");
    }
  }, [mode]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (user) {
      fetchConversations();
    }
  }, [user]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }
    setUser(session.user);
    fetchCredits(session.user.id);
  };

  const fetchCredits = async (userId: string) => {
    const { data } = await supabase.from("credits").select("balance").eq("user_id", userId).single();
    if (data) setCredits(data.balance);
  };

  const fetchConversations = async () => {
    const { data } = await supabase
      .from("conversations")
      .select("id, title, updated_at")
      .order("updated_at", { ascending: false })
      .limit(50);
    if (data) setConversations(data);
  };

  const loadConversation = async (conversationId: string) => {
    setCurrentConversationId(conversationId);
    setSidebarOpen(false);

    const { data: messagesData } = await supabase
      .from("conversation_messages")
      .select("*, generations(result_url, id)")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (messagesData) {
      const loadedMessages: ChatMessage[] = [];
      const messagesToReconcile: { messageId: string; jobId?: string; generationId?: string }[] = [];

      for (const msg of messagesData) {
        const chatMessage: ChatMessage = {
          id: msg.id,
          role: msg.role as "user" | "assistant",
          content: msg.content,
          type: msg.message_type as ChatMessage["type"],
          imageUrl: msg.generations?.result_url || undefined,
          status: msg.status as ChatMessage["status"],
          errorMessage: msg.error_message || undefined,
          aspectRatio: msg.aspect_ratio || undefined,
          generationId: msg.generation_id || undefined,
          jobId: msg.job_id || undefined,
          timestamp: new Date(msg.created_at)
        };

        // If message has completed generation but status is stale, fix it immediately
        if ((msg.status === "pending" || msg.status === "processing") && msg.generations?.result_url) {
          chatMessage.status = "completed";
          chatMessage.imageUrl = msg.generations.result_url;
          messagesToReconcile.push({ messageId: msg.id, generationId: msg.generations.id });
        }
        // If status is pending/processing, we need to check actual job status
        else if ((msg.status === "pending" || msg.status === "processing")) {
          // Use job_id directly (primary) or fall back to generation_id
          messagesToReconcile.push({ 
            messageId: msg.id, 
            jobId: msg.job_id || undefined,
            generationId: msg.generation_id || undefined 
          });
        }

        loadedMessages.push(chatMessage);
      }

      setMessages(loadedMessages);

      // Reconcile stale messages by checking actual job status
      for (const { messageId, jobId, generationId } of messagesToReconcile) {
        // If we already found a result_url above, just update DB
        const currentMsg = loadedMessages.find(m => m.id === messageId);
        if (currentMsg?.status === "completed" && currentMsg.imageUrl) {
          await updateMessageInDb(messageId, { status: "completed" }, generationId);
          continue;
        }

        // Try to find job status - prefer direct job_id lookup
        let jobData: { status: string; result_url: string | null; error_message: string | null } | null = null;
        let finalGenerationId = generationId;

        if (jobId) {
          // Direct job lookup (most reliable)
          const { data: job } = await supabase
            .from("jobs")
            .select("status, result_url, error_message")
            .eq("id", jobId)
            .maybeSingle();
          jobData = job;

          // Also get generation_id if job completed
          if (job?.status === "completed") {
            const { data: gen } = await supabase
              .from("generations")
              .select("id, result_url")
              .eq("job_id", jobId)
              .maybeSingle();
            if (gen) {
              finalGenerationId = gen.id;
              if (gen.result_url) jobData = { ...job, result_url: gen.result_url };
            }
          }
        } else if (generationId) {
          // Fallback: lookup via generation
          const { data: generation } = await supabase
            .from("generations")
            .select("result_url, job_id")
            .eq("id", generationId)
            .maybeSingle();

          if (generation?.result_url) {
            jobData = { status: "completed", result_url: generation.result_url, error_message: null };
          } else if (generation?.job_id) {
            const { data: job } = await supabase
              .from("jobs")
              .select("status, result_url, error_message")
              .eq("id", generation.job_id)
              .maybeSingle();
            jobData = job;
          }
        }

        // Now apply the reconciled status
        if (jobData?.status === "completed" && jobData.result_url) {
          setMessages(prev => prev.map(m => m.id === messageId ? {
            ...m,
            status: "completed" as const,
            imageUrl: jobData!.result_url!,
            generationId: finalGenerationId
          } : m));
          await updateMessageInDb(messageId, { status: "completed" }, finalGenerationId, jobId);
        } else if (jobData?.status === "failed") {
          setMessages(prev => prev.map(m => m.id === messageId ? {
            ...m,
            status: "failed" as const,
            errorMessage: jobData!.error_message || "Generation failed"
          } : m));
          await updateMessageInDb(messageId, { status: "failed", errorMessage: jobData?.error_message || "Generation failed" });
        } else if (jobData?.status === "pending" || jobData?.status === "processing") {
          // Job is still running - resume polling
          if (jobId) {
            pollJobStatus(jobId, messageId, conversationId);
            setIsGenerating(true);
          }
        } else if (!jobData) {
          // No job found at all - mark as failed (orphaned message)
          setMessages(prev => prev.map(m => m.id === messageId ? {
            ...m,
            status: "failed" as const,
            errorMessage: "Generation job not found"
          } : m));
          await updateMessageInDb(messageId, { status: "failed", errorMessage: "Generation job not found" });
        }
      }
    }
  };

  const createNewConversation = async (): Promise<string> => {
    const { data, error } = await supabase
      .from("conversations")
      .insert({ user_id: user.id, title: "New Chat" })
      .select()
      .single();

    if (error) throw error;
    setConversations(prev => [data, ...prev]);
    return data.id;
  };

  const updateConversationTitle = async (conversationId: string, firstMessage: string) => {
    const title = firstMessage.slice(0, 50) + (firstMessage.length > 50 ? "..." : "");
    await supabase
      .from("conversations")
      .update({ title })
      .eq("id", conversationId);
    setConversations(prev => prev.map(c => c.id === conversationId ? { ...c, title } : c));
  };

  const saveMessageToDb = async (
    conversationId: string,
    message: ChatMessage,
    generationId?: string,
    jobId?: string
  ) => {
    await supabase.from("conversation_messages").insert({
      conversation_id: conversationId,
      role: message.role,
      content: message.content,
      message_type: message.type || "text",
      generation_id: generationId || null,
      job_id: jobId || null,
      status: message.status || "completed",
      error_message: message.errorMessage || null,
      aspect_ratio: message.aspectRatio || null
    });
  };

  const updateMessageInDb = async (messageId: string, updates: Partial<ChatMessage>, generationId?: string, jobId?: string) => {
    const updatePayload: any = {
      status: updates.status,
      error_message: updates.errorMessage,
    };
    if (generationId) updatePayload.generation_id = generationId;
    if (jobId) updatePayload.job_id = jobId;
    await supabase.from("conversation_messages").update(updatePayload).eq("id", messageId);
  };

  const startNewChat = () => {
    setCurrentConversationId(null);
    setMessages([]);
    setSidebarOpen(false);
  };

  const deleteConversation = async (conversationId: string) => {
    await supabase.from("conversations").delete().eq("id", conversationId);
    setConversations(prev => prev.filter(c => c.id !== conversationId));
    if (currentConversationId === conversationId) {
      startNewChat();
    }
    toast.success("Conversation deleted");
  };

  const pollJobStatus = (jobId: string, messageId: string, conversationId: string) => {
    const interval = setInterval(async () => {
      const { data: job, error } = await supabase
        .from("jobs")
        .select("status, result_url, error_message")
        .eq("id", jobId)
        .single();

      if (error) {
        console.error("[Generate] Error polling job:", error);
        return;
      }

      // Get generation_id if completed
      let generationId: string | undefined;
      if (job.status === "completed") {
        const { data: generation } = await supabase
          .from("generations")
          .select("id")
          .eq("job_id", jobId)
          .maybeSingle();
        generationId = generation?.id;
      }

      setMessages(prev => prev.map(msg => msg.id === messageId ? {
        ...msg,
        status: job.status as ChatMessage["status"],
        imageUrl: job.result_url || undefined,
        errorMessage: job.error_message || undefined,
        generationId
      } : msg));

      if (job.status === "completed" || job.status === "failed") {
        clearInterval(interval);
        pollingRef.current.delete(messageId);
        setIsGenerating(false);
        fetchCredits(user.id);

        // Update message in database
        await updateMessageInDb(messageId, {
          status: job.status as ChatMessage["status"],
          errorMessage: job.error_message || undefined
        }, generationId);

        if (job.status === "completed") {
          toast.success("Generation complete!");
        } else {
          toast.error(job.error_message || "Generation failed");
        }
      }
    }, 2000);
    pollingRef.current.set(messageId, interval);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        toast.error("Please upload an image file");
        return;
      }
      setUploadedFile(file);
      toast.success("Image uploaded");
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error("Please enter a prompt");
      return;
    }
    if (credits < getCreditCost()) {
      toast.error("Insufficient credits");
      return;
    }

    // Get or create conversation
    let conversationId = currentConversationId;
    const isNewConversation = !conversationId;

    if (!conversationId) {
      try {
        conversationId = await createNewConversation();
        setCurrentConversationId(conversationId);
      } catch (error) {
        toast.error("Failed to create conversation");
        return;
      }
    }

    // Add user message
    const userMessageId = crypto.randomUUID();
    const userMessage: ChatMessage = {
      id: userMessageId,
      role: "user",
      content: prompt,
      type: "text",
      timestamp: new Date()
    };

    // Add assistant message (pending)
    const assistantMessageId = crypto.randomUUID();
    const assistantMessage: ChatMessage = {
      id: assistantMessageId,
      role: "assistant",
      content: `Generating ${mode}...`,
      type: mode,
      status: "pending",
      aspectRatio: aspectRatio,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage, assistantMessage]);
    setPrompt("");
    setIsGenerating(true);

    // Save user message to database
    await saveMessageToDb(conversationId, userMessage);

    // Update title if first message
    if (isNewConversation) {
      await updateConversationTitle(conversationId, prompt);
    }

    try {
      let inputImageUrl = null;
      if (uploadedFile && user) {
        const fileName = `${user.id}/${Date.now()}_${uploadedFile.name}`;
        const { error: uploadError } = await supabase.storage
          .from("user-uploads")
          .upload(fileName, uploadedFile);
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage
          .from("user-uploads")
          .getPublicUrl(fileName);
        inputImageUrl = publicUrl;
      }

      const jobType = uploadedFile
        ? mode === "video" ? "image_to_video" : "image_to_image"
        : mode === "video" ? "text_to_video" : "text_to_image";

      const { data: job, error: jobError } = await supabase.from("jobs").insert({
        user_id: user.id,
        job_type: jobType,
        prompt: userMessage.content,
        input_image_url: inputImageUrl,
        provider: "replicate",
        cost_credits: getCreditCost(),
        status: "pending",
        metadata: {
          model,
          aspect_ratio: aspectRatio,
          duration: mode === "video" ? 8 : null
        }
      }).select().single();

      if (jobError) throw jobError;

      // Save assistant message to database with pending status AND job_id
      await saveMessageToDb(conversationId, {
        ...assistantMessage,
        id: assistantMessageId
      }, undefined, job.id);

      // Update assistant message with job ID in local state
      setMessages(prev => prev.map(msg => msg.id === assistantMessageId ? {
        ...msg,
        jobId: job.id
      } : msg));

      pollJobStatus(job.id, assistantMessageId, conversationId);

      // Call edge function
      const functionName = mode === "video" ? "generate-video" : "generate-image";
      supabase.functions.invoke(functionName, {
        body: { jobId: job.id }
      }).then(({ error }) => {
        if (error) {
          console.error('Processing error:', error);
          toast.error(`Failed to start ${mode} generation`);
        }
      });

      setUploadedFile(null);
    } catch (error: any) {
      toast.error(error.message || "Failed to start generation");
      setIsGenerating(false);
      setMessages(prev => prev.filter(msg => msg.id !== assistantMessageId));
    }
  };

  const handleDownload = async (url: string, type: "image" | "video") => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = `generation-${Date.now()}.${type === "video" ? "mp4" : "png"}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(downloadUrl);
      toast.success("Download started!");
    } catch {
      toast.error("Failed to download");
    }
  };

  const handleShare = async (jobId: string) => {
    try {
      const { data: generation, error: fetchError } = await supabase
        .from("generations")
        .select("id")
        .eq("job_id", jobId)
        .single();

      if (fetchError || !generation) {
        toast.error("Could not find generation to share");
        return;
      }

      const { error } = await supabase
        .from("generations")
        .update({ is_shared: true, shared_at: new Date().toISOString() })
        .eq("id", generation.id);

      if (error) {
        toast.error("Failed to share");
        return;
      }
      toast.success("Shared to community gallery!");
    } catch {
      toast.error("Failed to share");
    }
  };

  // Auto-resize textarea
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPrompt(e.target.value);
    // Reset height to auto to properly calculate scroll height
    e.target.style.height = 'auto';
    // Set height to scroll height, capped at max
    const maxHeight = 200;
    e.target.style.height = Math.min(e.target.scrollHeight, maxHeight) + 'px';
  };

  const getCreditCost = () => {
    return mode === "video" ? VIDEO_COST : IMAGE_COST;
  };

  const currentModels = mode === "video" ? VIDEO_MODELS : IMAGE_MODELS;
  const selectedModel = currentModels.find(m => m.value === model) || currentModels[0];

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border/40">
        <Button
          onClick={startNewChat}
          className="w-full justify-start gap-2"
          variant="outline"
        >
          <Plus className="h-4 w-4" />
          New Chat
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {conversations.map(conv => (
            <div
              key={conv.id}
              className={`group flex items-center gap-2 p-3 rounded-lg cursor-pointer transition-colors min-w-0 ${
                currentConversationId === conv.id
                  ? "bg-primary/10 text-primary"
                  : "hover:bg-muted/50"
              }`}
              onClick={() => loadConversation(conv.id)}
            >
              <MessageSquare className="h-4 w-4 flex-shrink-0" />
              <span className="flex-1 text-sm truncate min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">
                {conv.title}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteConversation(conv.id);
                }}
              >
                <Trash2 className="h-3 w-3 text-destructive" />
              </Button>
            </div>
          ))}

          {conversations.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              No conversations yet
            </p>
          )}
        </div>
      </ScrollArea>
    </div>
  );

  if (!user) return null;

  return (
    <div className="relative min-h-dvh min-h-[100dvh] flex flex-col bg-background" style={{ minHeight: '-webkit-fill-available' }}>
      <NeonBackground />

      {/* Desktop Layout with Resizable Sidebar */}
      <div className="hidden md:flex w-full h-dvh" style={{ height: '100dvh' }}>
        <ResizablePanelGroup direction="horizontal">
          {sidebarVisible && (
            <>
              <ResizablePanel defaultSize={25} minSize={18} maxSize={40} className="z-10">
                <aside className="flex flex-col h-full border-r border-border/40 bg-background/80 backdrop-blur-xl">
                  <SidebarContent />
                </aside>
              </ResizablePanel>
              <ResizableHandle withHandle className="bg-border/40 hover:bg-primary/50 transition-colors" />
            </>
          )}

          <ResizablePanel defaultSize={sidebarVisible ? 75 : 100}>
            {/* Main Content */}
            <div className="flex-1 flex flex-col h-full overflow-hidden">
              {/* Hidden file input */}
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />

              {/* Header */}
              <header className="sticky top-0 z-20 bg-transparent px-4 md:px-6 py-3">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setSidebarVisible(!sidebarVisible)}
                      className="text-foreground/70 hover:text-foreground transition-colors"
                      title={sidebarVisible ? "Hide sidebar" : "Show sidebar"}
                    >
                      {sidebarVisible ? <PanelLeftClose size={20} /> : <PanelLeft size={20} />}
                    </button>
                    <button
                      onClick={() => navigate("/")}
                      className="text-foreground/70 hover:text-foreground flex items-center gap-2 transition-colors"
                    >
                      <ArrowLeft size={20} />
                    </button>
                    <h1 className="text-lg font-semibold">AI Studio</h1>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50 border border-border/40">
                      <CreditCard className="h-3.5 w-3.5 text-primary" />
                      <span className="text-sm font-medium">{credits}</span>
                    </div>
                  </div>
                </div>
              </header>

              {/* Chat Messages */}
              <ScrollArea className="flex-1 px-4 py-6">
                <div className="max-w-4xl mx-auto space-y-6">
                  {messages.length === 0 && (
                    <div className="text-center py-20 space-y-4">
                      <h2 className="text-2xl font-bold">What would you like to create?</h2>
                      <p className="text-muted-foreground max-w-md mx-auto">
                        Type a description and I'll generate {mode === "video" ? "a video" : "an image"} for you.
                        Be descriptive for best results!
                      </p>
                      <div className="flex flex-wrap gap-2 justify-center pt-4">
                        {["Cyberpunk city at night", "Underwater palace with fish", "Dragon flying over mountains"].map(suggestion => (
                          <button
                            key={suggestion}
                            onClick={() => setPrompt(suggestion)}
                            className="px-4 py-2 rounded-full bg-muted/50 border border-border/40 text-sm hover:bg-muted transition-colors"
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {messages.map(message => (
                    <div key={message.id} className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                      {message.role === "assistant" && (
                        <div className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center flex-shrink-0 mt-1">
                          <Bot className="h-4 w-4 text-white" />
                        </div>
                      )}

                      {message.role === "user" ? (
                        <div className="flex items-start gap-3">
                          <div className="bg-primary text-primary-foreground rounded-2xl rounded-tr-sm px-4 py-3 max-w-2xl">
                            <p className="text-sm">{message.content}</p>
                          </div>
                          <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0 mt-1">
                            <User className="h-4 w-4 text-secondary-foreground" />
                          </div>
                        </div>
                      ) : (
                        <div className="max-w-2xl w-full">
                          <div className="bg-muted/50 border border-border/40 rounded-2xl rounded-tl-sm overflow-hidden">
                            {/* Loading state */}
                            {(message.status === "pending" || message.status === "processing") && (
                              <div className="p-4">
                                <div 
                                  className={`${getAspectRatioClass(message.aspectRatio)} w-full max-w-md bg-background/50 rounded-xl flex items-center justify-center relative overflow-hidden`}
                                >
                                  <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-secondary/10 to-primary/10 animate-pulse" />
                                  <div className="relative z-10 flex flex-col items-center gap-3">
                                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                    <p className="text-sm text-muted-foreground">
                                      {message.type === "video" ? "Creating video..." : "Creating image..."}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Success state */}
                            {message.status === "completed" && message.imageUrl && (
                              <div className="space-y-3 animate-fade-in">
                                <div className={`${getAspectRatioClass(message.aspectRatio)} bg-background/50 flex items-center justify-center overflow-hidden`}>
                                  {message.type === "video" ? (
                                    <video src={message.imageUrl} controls autoPlay className="w-full h-full object-contain animate-scale-in" />
                                  ) : (
                                    <img src={message.imageUrl} alt="Generated content" className="w-full h-full object-contain animate-scale-in" />
                                  )}
                                </div>
                                <div className="px-4 pb-4 flex gap-2 flex-wrap animate-fade-in" style={{ animationDelay: '150ms' }}>
                                  <Button size="sm" variant="ghost" onClick={() => handleDownload(message.imageUrl!, message.type as "image" | "video")} className="text-xs">
                                    <Download className="h-3.5 w-3.5 mr-1.5" />
                                    Download
                                  </Button>
                                  {message.jobId && (
                                    <Button size="sm" variant="ghost" onClick={() => handleShare(message.jobId!)} className="text-xs">
                                      <Share2 className="h-3.5 w-3.5 mr-1.5" />
                                      Share
                                    </Button>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Error state */}
                            {message.status === "failed" && (
                              <div className="p-6">
                                <div className="aspect-video bg-destructive/10 rounded-xl flex items-center justify-center">
                                  <div className="text-center space-y-2">
                                    <X className="h-8 w-8 text-destructive mx-auto" />
                                    <p className="text-sm text-destructive">
                                      {message.errorMessage || "Generation failed"}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Input Area */}
              <div className="sticky bottom-4 z-20 px-4">
                <div className="max-w-4xl mx-auto backdrop-blur-2xl border border-white/10 rounded-2xl p-4 shadow-2xl shadow-black/20 bg-inherit">
                  {/* Settings Row */}
                  <div className="flex items-center gap-2 mb-3 flex-wrap rounded-lg">
                    {/* Mode Toggle */}
                    <div className="flex bg-muted/50 border-border/40 p-1 rounded-sm border-0">
                      <button
                        onClick={() => setMode("image")}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${mode === "image" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                      >
                        <ImageIcon className="h-3 w-3 inline mr-1" />
                        Image
                      </button>
                      <button
                        onClick={() => setMode("video")}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${mode === "video" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                      >
                        <Video className="h-3 w-3 inline mr-1" />
                        Video
                      </button>
                    </div>

                    {/* Model Selector */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 text-xs bg-muted/50 border border-border/40">
                          {selectedModel.label}
                          <ChevronDown className="h-3 w-3 ml-1" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="bg-popover border-border/50">
                        <DropdownMenuLabel className="text-xs text-muted-foreground">
                          {mode === "video" ? "Video Models" : "Image Models"}
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {currentModels.map(m => (
                          <DropdownMenuItem key={m.value} onClick={() => setModel(m.value)} className="text-sm">
                            <div>
                              <p className="font-medium">{m.label}</p>
                              <p className="text-xs text-muted-foreground">{m.desc}</p>
                            </div>
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Aspect Ratio */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 text-xs bg-muted/50 border border-border/40">
                          {aspectRatio}
                          <ChevronDown className="h-3 w-3 ml-1" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="bg-popover border-border/50">
                        {ASPECT_RATIOS.map(ar => (
                          <DropdownMenuItem key={ar.value} onClick={() => setAspectRatio(ar.value)} className="text-sm">
                            {ar.label}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Upload Image */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      className={`h-8 text-xs ${uploadedFile ? "bg-primary/20 text-primary" : "bg-muted/50 border border-border/40"}`}
                    >
                      <Upload className="h-3 w-3 mr-1" />
                      {uploadedFile ? "Image Added" : "Add Image"}
                      {uploadedFile && (
                        <X
                          className="h-3 w-3 ml-1 hover:text-destructive"
                          onClick={e => {
                            e.stopPropagation();
                            setUploadedFile(null);
                          }}
                        />
                      )}
                    </Button>

                    <span className="text-xs text-muted-foreground ml-auto">
                      {getCreditCost()} credits
                    </span>
                  </div>

                  {/* Input */}
                  <div className="gap-3 rounded-none flex-row flex items-end justify-start">
                  <Textarea
                      ref={textareaRef}
                      value={prompt}
                      onChange={handleTextareaChange}
                      placeholder={`Describe the ${mode} you want to create...`}
                      disabled={isGenerating}
                      className="flex-1 min-h-[44px] max-h-[200px] resize-none bg-muted/50 border-border/40 rounded-2xl py-3 overflow-y-auto"
                      rows={1}
                    />
                    <Button
                      onClick={handleGenerate}
                      disabled={isGenerating || !prompt.trim()}
                      className="h-[44px] w-[44px] bg-primary hover:bg-primary/90 rounded-2xl shrink-0"
                    >
                      {isGenerating ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      {/* Mobile Layout */}
      <div className="flex md:hidden flex-1 flex-col min-h-dvh" style={{ minHeight: '100dvh' }}>
        {/* Hidden file input */}
        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />

        {/* Header */}
        <header className="sticky top-0 z-20 bg-transparent px-4 py-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-72 p-0">
                  <SidebarContent />
                </SheetContent>
              </Sheet>

              <button
                onClick={() => navigate("/")}
                className="text-foreground/70 hover:text-foreground flex items-center gap-2 transition-colors"
              >
                <ArrowLeft size={20} />
              </button>
              <h1 className="text-lg font-semibold">AI Studio</h1>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50 border border-border/40">
                <CreditCard className="h-3.5 w-3.5 text-primary" />
                <span className="text-sm font-medium">{credits}</span>
              </div>
            </div>
          </div>
        </header>

        {/* Chat Messages */}
        <ScrollArea className="flex-1 px-4 py-6">
          <div className="max-w-4xl mx-auto space-y-6">
            {messages.length === 0 && (
              <div className="text-center py-20 space-y-4">
                <h2 className="text-2xl font-bold">What would you like to create?</h2>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Type a description and I'll generate {mode === "video" ? "a video" : "an image"} for you.
                  Be descriptive for best results!
                </p>
                <div className="flex flex-wrap gap-2 justify-center pt-4">
                  {["Cyberpunk city at night", "Underwater palace with fish", "Dragon flying over mountains"].map(suggestion => (
                    <button
                      key={suggestion}
                      onClick={() => setPrompt(suggestion)}
                      className="px-4 py-2 rounded-full bg-muted/50 border border-border/40 text-sm hover:bg-muted transition-colors"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map(message => (
              <div key={message.id} className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                {message.role === "assistant" && (
                  <div className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center flex-shrink-0 mt-1">
                    <Bot className="h-4 w-4 text-white" />
                  </div>
                )}

                {message.role === "user" ? (
                  <div className="flex items-start gap-3">
                    <div className="bg-primary text-primary-foreground rounded-2xl rounded-tr-sm px-4 py-3 max-w-2xl">
                      <p className="text-sm">{message.content}</p>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0 mt-1">
                      <User className="h-4 w-4 text-secondary-foreground" />
                    </div>
                  </div>
                ) : (
                  <div className="max-w-2xl">
                    <div className="bg-muted/50 border border-border/40 rounded-2xl rounded-tl-sm overflow-hidden">
                      {(message.status === "pending" || message.status === "processing") && (
                        <div className="p-4">
                          <div className={`${getAspectRatioClass(message.aspectRatio)} w-full max-w-md bg-background/50 rounded-xl flex items-center justify-center relative overflow-hidden`}>
                            <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-secondary/10 to-primary/10 animate-pulse" />
                            <div className="relative z-10 flex flex-col items-center gap-3">
                              <Loader2 className="h-8 w-8 animate-spin text-primary" />
                              <p className="text-sm text-muted-foreground">
                                {message.type === "video" ? "Creating video..." : "Creating image..."}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                      {message.status === "completed" && message.imageUrl && (
                        <div className="space-y-3 animate-fade-in">
                          <div className={`${getAspectRatioClass(message.aspectRatio)} bg-background/50 flex items-center justify-center overflow-hidden`}>
                            {message.type === "video" ? (
                              <video src={message.imageUrl} controls autoPlay className="w-full h-full object-contain animate-scale-in" />
                            ) : (
                              <img src={message.imageUrl} alt="Generated content" className="w-full h-full object-contain animate-scale-in" />
                            )}
                          </div>
                          <div className="px-4 pb-4 flex gap-2 flex-wrap animate-fade-in" style={{ animationDelay: '150ms' }}>
                            <Button size="sm" variant="ghost" onClick={() => handleDownload(message.imageUrl!, message.type as "image" | "video")} className="text-xs">
                              <Download className="h-3.5 w-3.5 mr-1.5" />
                              Download
                            </Button>
                            {message.jobId && (
                              <Button size="sm" variant="ghost" onClick={() => handleShare(message.jobId!)} className="text-xs">
                                <Share2 className="h-3.5 w-3.5 mr-1.5" />
                                Share
                              </Button>
                            )}
                          </div>
                        </div>
                      )}
                      {message.status === "failed" && (
                        <div className="p-6">
                          <div className="aspect-video bg-destructive/10 rounded-xl flex items-center justify-center">
                            <div className="text-center space-y-2">
                              <X className="h-8 w-8 text-destructive mx-auto" />
                              <p className="text-sm text-destructive">
                                {message.errorMessage || "Generation failed"}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Input Area */}
        <div className="sticky bottom-4 z-20 px-4">
          <div className="max-w-4xl mx-auto backdrop-blur-2xl border border-white/10 rounded-2xl p-4 shadow-2xl shadow-black/20 bg-inherit">
            <div className="flex items-center gap-2 mb-3 flex-wrap rounded-lg">
              <div className="flex bg-muted/50 border-border/40 p-1 rounded-sm border-0">
                <button
                  onClick={() => setMode("image")}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${mode === "image" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                >
                  <ImageIcon className="h-3 w-3 inline mr-1" />
                  Image
                </button>
                <button
                  onClick={() => setMode("video")}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${mode === "video" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                >
                  <Video className="h-3 w-3 inline mr-1" />
                  Video
                </button>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 text-xs bg-muted/50 border border-border/40">
                    {selectedModel.label}
                    <ChevronDown className="h-3 w-3 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="bg-popover border-border/50">
                  <DropdownMenuLabel className="text-xs text-muted-foreground">
                    {mode === "video" ? "Video Models" : "Image Models"}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {currentModels.map(m => (
                    <DropdownMenuItem key={m.value} onClick={() => setModel(m.value)} className="text-sm">
                      <div>
                        <p className="font-medium">{m.label}</p>
                        <p className="text-xs text-muted-foreground">{m.desc}</p>
                      </div>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 text-xs bg-muted/50 border border-border/40">
                    {aspectRatio}
                    <ChevronDown className="h-3 w-3 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="bg-popover border-border/50">
                  {ASPECT_RATIOS.map(ar => (
                    <DropdownMenuItem key={ar.value} onClick={() => setAspectRatio(ar.value)} className="text-sm">
                      {ar.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className={`h-8 text-xs ${uploadedFile ? "bg-primary/20 text-primary" : "bg-muted/50 border border-border/40"}`}
              >
                <Upload className="h-3 w-3 mr-1" />
                {uploadedFile ? "Image Added" : "Add Image"}
                {uploadedFile && (
                  <X
                    className="h-3 w-3 ml-1 hover:text-destructive"
                    onClick={e => {
                      e.stopPropagation();
                      setUploadedFile(null);
                    }}
                  />
                )}
              </Button>

              <span className="text-xs text-muted-foreground ml-auto">
                {getCreditCost()} credits
              </span>
            </div>

            <div className="gap-3 rounded-none flex-row flex items-end justify-start">
              <Textarea
                ref={textareaRef}
                value={prompt}
                onChange={handleTextareaChange}
                placeholder={`Describe the ${mode} you want to create...`}
                disabled={isGenerating}
                className="flex-1 min-h-[44px] max-h-[200px] resize-none bg-muted/50 border-border/40 rounded-2xl py-3 overflow-y-auto"
                rows={1}
              />
              <Button
                onClick={handleGenerate}
                disabled={isGenerating || !prompt.trim()}
                className="h-[44px] w-[44px] bg-primary hover:bg-primary/90 rounded-2xl shrink-0"
              >
                {isGenerating ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Generate;
