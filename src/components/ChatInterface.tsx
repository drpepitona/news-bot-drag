import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Sparkles, Plus, MessageSquare, Trash2, ArrowDown } from "lucide-react";
import { NewsItem } from "./NewsCard";
import { supabase } from "@/integrations/supabase/client";
import { analyzeNews } from "@/services/chatbotApi";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Message {
  id: string;
  type: "user" | "ai" | "news";
  content: string;
  news?: NewsItem;
}

interface Chat {
  id: string;
  name: string;
  messages: Message[];
  createdAt: Date;
}

interface ChatInterfaceProps {
  onDrop: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  droppedNews: NewsItem[];
  onAuthRequired: () => void;
}

export const ChatInterface = ({ onDrop, onDragOver, droppedNews, onAuthRequired }: ChatInterfaceProps) => {
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [showChatList, setShowChatList] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const { toast } = useToast();
  const processedNewsCount = useRef(0);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const currentMessages = chats.find((chat) => chat.id === activeChat)?.messages || [];

  // Verificar autenticación
  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setIsAuthenticated(!!user);
    };

    checkAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setIsAuthenticated(!!session?.user);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Cargar chats desde la base de datos
  useEffect(() => {
    if (isAuthenticated) {
      loadChats();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated]);

  // Procesar noticias arrastradas
  useEffect(() => {
    if (droppedNews.length > processedNewsCount.current && activeChat) {
      const latestNews = droppedNews[droppedNews.length - 1];
      handleNewsMessage(latestNews);
      processedNewsCount.current = droppedNews.length;
    }
  }, [droppedNews, activeChat]);

  // Detectar scroll para mostrar/ocultar botón
  useEffect(() => {
    const scrollContainer = scrollAreaRef.current;
    if (!scrollContainer) return;

    const handleScroll = () => {
      const isNearBottom = scrollContainer.scrollHeight - scrollContainer.scrollTop - scrollContainer.clientHeight < 100;
      setShowScrollButton(!isNearBottom && currentMessages.length > 3);
    };

    scrollContainer.addEventListener('scroll', handleScroll);
    return () => scrollContainer.removeEventListener('scroll', handleScroll);
  }, [currentMessages]);

  const scrollToBottom = () => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  };

  const loadChats = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: chatsData, error: chatsError } = await supabase
        .from("chats")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (chatsError) throw chatsError;

      if (chatsData && chatsData.length > 0) {
        // Cargar mensajes para cada chat
        const chatsWithMessages = await Promise.all(
          chatsData.map(async (chat) => {
            const { data: messagesData } = await supabase
              .from("messages")
              .select("*")
              .eq("chat_id", chat.id)
              .order("created_at", { ascending: true });

            return {
              id: chat.id,
              name: chat.name,
              createdAt: new Date(chat.created_at),
              messages:
                messagesData?.map((msg) => ({
                  id: msg.id,
                  type: msg.type as "user" | "ai" | "news",
                  content: msg.content,
                  news: msg.news_data ? (msg.news_data as unknown as NewsItem) : undefined,
                })) || [],
            };
          }),
        );

        setChats(chatsWithMessages);
        setActiveChat(chatsWithMessages[0].id);
      } else {
        // Crear primer chat si no existe ninguno
        await createNewChat();
      }
    } catch (error) {
      console.error("Error loading chats:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las conversaciones",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createNewChat = async () => {
    if (!isAuthenticated) {
      setShowAuthDialog(true);
      return;
    }

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const newChatName = `Conversación ${chats.length + 1}`;

      const { data: newChatData, error: chatError } = await supabase
        .from("chats")
        .insert([
          {
            user_id: user.id,
            name: newChatName,
          },
        ])
        .select()
        .single();

      if (chatError) throw chatError;

      // Crear mensaje de bienvenida
      const { data: welcomeMessage, error: messageError } = await supabase
        .from("messages")
        .insert([
          {
            chat_id: newChatData.id,
            type: "ai",
            content: "¡Hola! Soy tu asistente de análisis de mercado. ¿En qué puedo ayudarte?",
          },
        ])
        .select()
        .single();

      if (messageError) throw messageError;

      const newChat: Chat = {
        id: newChatData.id,
        name: newChatData.name,
        createdAt: new Date(newChatData.created_at),
        messages: [
          {
            id: welcomeMessage.id,
            type: "ai",
            content: welcomeMessage.content,
          },
        ],
      };

      setChats([newChat, ...chats]);
      setActiveChat(newChat.id);
      setShowChatList(false);

      toast({
        title: "Nueva conversación",
        description: "Se creó una nueva conversación",
      });
    } catch (error) {
      console.error("Error creating chat:", error);
      toast({
        title: "Error",
        description: "No se pudo crear la conversación",
        variant: "destructive",
      });
    }
  };

  const deleteChat = async (chatId: string) => {
    if (chats.length === 1) {
      toast({
        title: "Información",
        description: "Debes tener al menos una conversación",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase.from("chats").delete().eq("id", chatId);

      if (error) throw error;

      const updatedChats = chats.filter((chat) => chat.id !== chatId);
      setChats(updatedChats);

      if (activeChat === chatId) {
        setActiveChat(updatedChats[0].id);
      }

      toast({
        title: "Conversación eliminada",
        description: "La conversación se eliminó correctamente",
      });
    } catch (error) {
      console.error("Error deleting chat:", error);
      toast({
        title: "Error",
        description: "No se pudo eliminar la conversación",
        variant: "destructive",
      });
    }
  };

  const handleNewsMessage = async (news: NewsItem) => {
    if (!activeChat) return;

    try {
      const newsContent = `📰 ${news.title}\n\n🏷️ Categoría: ${news.category}\n📅 ${news.time}\n📍 Fuente: ${news.source}${news.url ? `\n🔗 ${news.url}` : ""}`;

      const { data: newsMessageData, error: newsError } = await supabase
        .from("messages")
        .insert([
          {
            chat_id: activeChat,
            type: "user",
            content: newsContent,
            news_data: news as any,
          },
        ])
        .select()
        .single();

      if (newsError) throw newsError;

      const newsMessage: Message = {
        id: newsMessageData.id,
        type: "user",
        content: newsContent,
        news: news,
      };

      setChats((chats) =>
        chats.map((chat) => (chat.id === activeChat ? { ...chat, messages: [...chat.messages, newsMessage] } : chat)),
      );

      // Obtener respuesta de la API
      const chatHistory = chats.find((c) => c.id === activeChat)?.messages || [];
      const response = await fetch(`${import.meta.env.VITE_CHATBOT_API_URL}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: newsContent,
          history: chatHistory.map((msg) => ({
            role: msg.type === "user" ? "user" : "assistant",
            content: msg.content,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error("Error al obtener respuesta del chatbot");
      }

      const data = await response.json();
      const aiContent = data.response || "No se pudo procesar la respuesta";

      const { data: aiMessageData, error: aiError } = await supabase
        .from("messages")
        .insert([
          {
            chat_id: activeChat,
            type: "ai",
            content: aiContent,
          },
        ])
        .select()
        .single();

      if (aiError) {
        console.error("Error saving AI message:", aiError);
        return;
      }

      const aiMessage: Message = {
        id: aiMessageData.id,
        type: "ai",
        content: aiContent,
      };

      setChats((chats) =>
        chats.map((chat) => (chat.id === activeChat ? { ...chat, messages: [...chat.messages, aiMessage] } : chat)),
      );
    } catch (error) {
      console.error("Error sending news message:", error);
      toast({
        title: "Error",
        description: "No se pudo enviar la noticia",
        variant: "destructive",
      });
    }
  };

  const handleSend = async () => {
  if (!isAuthenticated) {
    setShowAuthDialog(true);
    return;
  }
  
  if (!input.trim() || !activeChat) return;
  
  try {
    // Guardar mensaje del usuario
    const { data: userMessageData, error: userError } = await supabase
      .from('messages')
      .insert([{
        chat_id: activeChat,
        type: 'user',
        content: input
      }])
      .select()
      .single();

    if (userError) throw userError;

    const userMessage: Message = {
      id: userMessageData.id,
      type: "user",
      content: input,
    };
    
    setChats(chats.map(chat => 
      chat.id === activeChat 
        ? { ...chat, messages: [...chat.messages, userMessage] }
        : chat
    ));
    
    const userQuestion = input;
    setInput("");
    
    // Analizar pregunta con el bot real
    toast({
      title: "Analizando...",
      description: "El bot está procesando tu pregunta"
    });

    try {
      // Llamar al backend de Python
      const analysisResult = await analyzeNews({
        pregunta: userQuestion,
        vix: 20
      });
      
      // Formatear respuesta
      const aiContent = analysisResult.relevante 
        ? `📊 **Análisis de Impacto Financiero**\n\n${analysisResult.analisis}\n\n---\n\n📌 **Categoría:** ${analysisResult.categoria}\n⭐ **Token:** ${analysisResult.token.toFixed(1)}/10\n📈 **Eventos históricos:** ${analysisResult.num_eventos.toLocaleString()}${analysisResult.alpha && analysisResult.beta ? `\n🔬 **Parámetros Landau:** α=${analysisResult.alpha.toFixed(3)}, β=${analysisResult.beta.toFixed(3)}` : ''}`
        : analysisResult.analisis;
      
      const { data: aiMessageData, error: aiError } = await supabase
        .from('messages')
        .insert([{
          chat_id: activeChat,
          type: 'ai',
          content: aiContent
        }])
        .select()
        .single();

      if (aiError) {
        console.error('Error saving AI message:', aiError);
        return;
      }

      const aiMessage: Message = {
        id: aiMessageData.id,
        type: "ai",
        content: aiContent,
      };
      
      setChats(chats => chats.map(chat => 
        chat.id === activeChat 
          ? { ...chat, messages: [...chat.messages, aiMessage] }
          : chat
      ));

      toast({
        title: "Análisis completado",
        description: "El bot ha procesado tu pregunta"
      });
    } catch (error) {
      console.error('Error analyzing question:', error);
      
      const aiContent = `⚠️ Error al analizar. Intenta de nuevo.`;
      
      const { data: aiMessageData } = await supabase
        .from('messages')
        .insert([{
          chat_id: activeChat,
          type: 'ai',
          content: aiContent
        }])
        .select()
        .single();

      if (aiMessageData) {
        setChats(chats => chats.map(chat => 
          chat.id === activeChat 
            ? { ...chat, messages: [...chat.messages, {
                id: aiMessageData.id,
                type: "ai",
                content: aiContent
              }] }
            : chat
        ));
      }

      toast({
        title: "Error",
        description: "No se pudo procesar el análisis",
        variant: "destructive"
      });
    }
  } catch (error) {
    console.error('Error sending message:', error);
    toast({
      title: "Error",
      description: "No se pudo enviar el mensaje",
      variant: "destructive"
    });
  }
};

  if (loading) {
    return (
      <Card className="flex-1 flex items-center justify-center">
        <p className="text-muted-foreground">Cargando...</p>
      </Card>
    );
  }

  return (
    <>
      <Card
        className="flex-1 flex flex-col h-full max-h-screen"
        onDrop={onDrop}
        onDragOver={onDragOver}
      >
        <div className="flex items-center justify-between p-4 border-b flex-shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">Asistente de Análisis</h2>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowChatList(!showChatList)}
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              Conversaciones
            </Button>
            <Button variant="outline" size="sm" onClick={createNewChat}>
              <Plus className="w-4 h-4 mr-2" />
              Nueva
            </Button>
          </div>
        </div>

        {showChatList && (
          <div className="p-4 border-b bg-muted/50">
            <div className="h-32 overflow-y-auto scrollbar-thin scrollbar-thumb-muted-foreground/30 scrollbar-track-transparent">
              <div className="space-y-2">
                {chats.map((chat) => (
                  <div
                    key={chat.id}
                    className={`flex items-center justify-between p-2 rounded-lg cursor-pointer hover:bg-accent ${activeChat === chat.id ? "bg-accent" : ""}`}
                    onClick={() => {
                      setActiveChat(chat.id);
                      setShowChatList(false);
                    }}
                  >
                    <span className="text-sm">{chat.name}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteChat(chat.id);
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="flex-1 min-h-0 relative">
          <div 
            ref={scrollAreaRef}
            className="absolute inset-0 overflow-y-auto p-4 scroll-smooth scrollbar-thin scrollbar-thumb-muted-foreground/30 scrollbar-track-transparent hover:scrollbar-thumb-muted-foreground/50"
          >
            <div className="space-y-4 pb-4">
              {currentMessages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.type === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg p-3 ${
                      message.type === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </div>
          
          {showScrollButton && (
            <Button
              onClick={scrollToBottom}
              size="icon"
              className="absolute bottom-4 right-8 rounded-full shadow-lg z-10 animate-in fade-in slide-in-from-bottom-2"
              variant="default"
            >
              <ArrowDown className="w-4 h-4" />
            </Button>
          )}
        </div>

        <div className="p-4 border-t flex-shrink-0">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSend()}
              placeholder="Escribe tu mensaje o arrastra una noticia..."
              className="flex-1"
            />
            <Button onClick={handleSend} disabled={!input.trim()}>
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card>

      <AlertDialog open={showAuthDialog} onOpenChange={setShowAuthDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Autenticación requerida</AlertDialogTitle>
            <AlertDialogDescription>
              Debes iniciar sesión para usar el chat. ¿Deseas ir a la página de inicio de sesión?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="outline" onClick={() => setShowAuthDialog(false)}>
              Cancelar
            </Button>
            <AlertDialogAction onClick={onAuthRequired}>
              Iniciar sesión
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
