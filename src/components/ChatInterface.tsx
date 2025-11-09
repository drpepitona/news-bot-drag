import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Sparkles, Plus, MessageSquare, Trash2 } from "lucide-react";
import { NewsItem } from "./NewsCard";
import { supabase } from "@/integrations/supabase/client";
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
  const { toast } = useToast();
  const processedNewsCount = useRef(0);

  const currentMessages = chats.find((chat) => chat.id === activeChat)?.messages || [];

  // Verificar autenticación
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setIsAuthenticated(!!user);
    };
    
    checkAuth();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
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

  const loadChats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: chatsData, error: chatsError } = await supabase
        .from('chats')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (chatsError) throw chatsError;

      if (chatsData && chatsData.length > 0) {
        // Cargar mensajes para cada chat
        const chatsWithMessages = await Promise.all(
          chatsData.map(async (chat) => {
            const { data: messagesData } = await supabase
              .from('messages')
              .select('*')
              .eq('chat_id', chat.id)
              .order('created_at', { ascending: true });

            return {
              id: chat.id,
              name: chat.name,
              createdAt: new Date(chat.created_at),
              messages: messagesData?.map(msg => ({
                id: msg.id,
                type: msg.type as "user" | "ai" | "news",
                content: msg.content,
                news: msg.news_data ? msg.news_data as unknown as NewsItem : undefined
              })) || []
            };
          })
        );

        setChats(chatsWithMessages);
        setActiveChat(chatsWithMessages[0].id);
      } else {
        // Crear primer chat si no existe ninguno
        await createNewChat();
      }
    } catch (error) {
      console.error('Error loading chats:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las conversaciones",
        variant: "destructive"
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const newChatName = `Conversación ${chats.length + 1}`;
      
      const { data: newChatData, error: chatError } = await supabase
        .from('chats')
        .insert([{
          user_id: user.id,
          name: newChatName
        }])
        .select()
        .single();

      if (chatError) throw chatError;

      // Crear mensaje de bienvenida
      const { data: welcomeMessage, error: messageError } = await supabase
        .from('messages')
        .insert([{
          chat_id: newChatData.id,
          type: 'ai',
          content: '¡Hola! Soy tu asistente de análisis de mercado. ¿En qué puedo ayudarte?'
        }])
        .select()
        .single();

      if (messageError) throw messageError;

      const newChat: Chat = {
        id: newChatData.id,
        name: newChatData.name,
        createdAt: new Date(newChatData.created_at),
        messages: [{
          id: welcomeMessage.id,
          type: 'ai',
          content: welcomeMessage.content
        }]
      };

      setChats([newChat, ...chats]);
      setActiveChat(newChat.id);
      setShowChatList(false);

      toast({
        title: "Nueva conversación",
        description: "Se creó una nueva conversación"
      });
    } catch (error) {
      console.error('Error creating chat:', error);
      toast({
        title: "Error",
        description: "No se pudo crear la conversación",
        variant: "destructive"
      });
    }
  };

  const deleteChat = async (chatId: string) => {
    if (chats.length === 1) {
      toast({
        title: "Información",
        description: "Debes tener al menos una conversación",
        variant: "destructive"
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('chats')
        .delete()
        .eq('id', chatId);

      if (error) throw error;

      const updatedChats = chats.filter((chat) => chat.id !== chatId);
      setChats(updatedChats);
      
      if (activeChat === chatId) {
        setActiveChat(updatedChats[0].id);
      }

      toast({
        title: "Conversación eliminada",
        description: "La conversación se eliminó correctamente"
      });
    } catch (error) {
      console.error('Error deleting chat:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar la conversación",
        variant: "destructive"
      });
    }
  };

  const handleNewsMessage = async (news: NewsItem) => {
    if (!activeChat) return;

    try {
      const newsContent = `📰 ${news.title}\n\n🏷️ Categoría: ${news.category}\n📅 ${news.time}\n📍 Fuente: ${news.source}${news.url ? `\n🔗 ${news.url}` : ''}`;

      const { data: newsMessageData, error: newsError } = await supabase
        .from('messages')
        .insert([{
          chat_id: activeChat,
          type: 'user',
          content: newsContent,
          news_data: news as any
        }])
        .select()
        .single();

      if (newsError) throw newsError;

      const newsMessage: Message = {
        id: newsMessageData.id,
        type: "user",
        content: newsContent,
        news: news
      };

      setChats(chats => chats.map(chat => 
        chat.id === activeChat 
          ? { ...chat, messages: [...chat.messages, newsMessage] }
          : chat
      ));

      // Simular respuesta de AI
      setTimeout(async () => {
        const aiContent = `He recibido la noticia: "${news.title}". ¿Qué te gustaría saber sobre esta información?`;
        
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
      }, 1000);
    } catch (error) {
      console.error('Error sending news message:', error);
      toast({
        title: "Error",
        description: "No se pudo enviar la noticia",
        variant: "destructive"
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
      setInput("");
      
      // Simular respuesta de AI y guardarla
      setTimeout(async () => {
        const aiContent = "Entendido. ¿Qué aspecto de esta información te gustaría que analice?";
        
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
      }, 1000);
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
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <Sparkles className="h-8 w-8 text-gold-light animate-pulse mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Cargando conversaciones...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex">
      {/* Lista de chats lateral */}
      {showChatList && (
        <div className="w-64 border-r border-border bg-black-surface flex flex-col animate-slide-in-left">
          <div className="p-4 border-b border-border">
            <Button
              onClick={createNewChat}
              className="w-full bg-gradient-gold hover:opacity-90 text-primary-foreground"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Chat
            </Button>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {chats.map((chat) => (
                <div
                  key={chat.id}
                  className={`group flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                    activeChat === chat.id
                      ? "bg-gold-dark/20 border border-gold-medium/30"
                      : "hover:bg-black-elevated"
                  }`}
                  onClick={() => {
                    setActiveChat(chat.id);
                    setShowChatList(false);
                  }}
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <MessageSquare className="h-4 w-4 text-gold-light flex-shrink-0" />
                    <span className="text-sm truncate">{chat.name}</span>
                  </div>
                  {chats.length > 1 && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteChat(chat.id);
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Chat principal */}
      <Card
        onDrop={onDrop}
        onDragOver={onDragOver}
        className="flex-1 flex flex-col bg-card border-border relative overflow-hidden"
      >
        {/* Gradient glow effect */}
        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-gold-radial pointer-events-none" />
        
        {/* Header */}
        <div className="p-6 border-b border-border relative z-10">
          <div className="flex items-center gap-3">
            <Button
              size="icon"
              variant="ghost"
              onClick={() => {
                if (!isAuthenticated) {
                  setShowAuthDialog(true);
                  return;
                }
                setShowChatList(!showChatList);
              }}
              className="h-10 w-10"
            >
              <MessageSquare className="h-5 w-5" />
            </Button>
            <div className="h-10 w-10 rounded-lg bg-gradient-gold flex items-center justify-center shadow-gold-glow">
              <Sparkles className="h-5 w-5 text-primary-foreground" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-foreground">
                {chats.find(c => c.id === activeChat)?.name || "AI Analyst"}
              </h2>
              <p className="text-xs text-muted-foreground">Análisis en tiempo real</p>
            </div>
          </div>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 p-6 relative z-10">
          <div className="space-y-4">
            {currentMessages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.type === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    message.type === "user"
                      ? "bg-gradient-gold text-primary-foreground shadow-gold-glow"
                      : "bg-black-elevated text-foreground border border-border"
                  }`}
                >
                  <div 
                    className="text-sm whitespace-pre-wrap break-words"
                    dangerouslySetInnerHTML={{
                      __html: message.content.replace(
                        /(https?:\/\/[^\s]+)/g,
                        '<a href="$1" target="_blank" rel="noopener noreferrer" class="underline hover:opacity-80">$1</a>'
                      )
                    }}
                  />
                  {message.news && (
                    <div className="mt-2 p-2 bg-background/50 rounded-lg">
                      <p className="text-xs font-medium">{message.news.title}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Input */}
        <div className="p-6 border-t border-border relative z-10">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSend()}
              placeholder="Escribe un mensaje o arrastra una noticia..."
              className="flex-1 bg-black-elevated border-border focus:border-gold-light focus:shadow-gold-glow"
            />
            <Button
              onClick={handleSend}
              size="icon"
              className="bg-gradient-gold hover:opacity-90 shadow-gold-glow"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Alert Dialog para solicitar autenticación */}
      <AlertDialog open={showAuthDialog} onOpenChange={setShowAuthDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Inicia sesión para continuar</AlertDialogTitle>
            <AlertDialogDescription>
              Necesitas iniciar sesión para poder usar el chat, ver el historial de conversaciones y enviar mensajes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={onAuthRequired}>
              Ir a Iniciar Sesión
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
