import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Sparkles, Plus, MessageSquare, Trash2 } from "lucide-react";
import { NewsItem } from "./NewsCard";

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
}

export const ChatInterface = ({ onDrop, onDragOver, droppedNews }: ChatInterfaceProps) => {
  const [chats, setChats] = useState<Chat[]>([
    {
      id: "1",
      name: "Conversación 1",
      createdAt: new Date(),
      messages: [
        {
          id: "1",
          type: "ai",
          content: "¡Hola! Soy tu asistente de análisis de mercado. Arrastra noticias aquí para que las analice.",
        },
      ],
    },
  ]);
  const [activeChat, setActiveChat] = useState<string>("1");
  const [input, setInput] = useState("");
  const [showChatList, setShowChatList] = useState(false);

  const currentMessages = chats.find((chat) => chat.id === activeChat)?.messages || [];

  const createNewChat = () => {
    const newChat: Chat = {
      id: Date.now().toString(),
      name: `Conversación ${chats.length + 1}`,
      createdAt: new Date(),
      messages: [
        {
          id: Date.now().toString(),
          type: "ai",
          content: "¡Hola! Soy tu asistente de análisis de mercado. ¿En qué puedo ayudarte?",
        },
      ],
    };
    setChats([...chats, newChat]);
    setActiveChat(newChat.id);
    setShowChatList(false);
  };

  const deleteChat = (chatId: string) => {
    if (chats.length === 1) return; // No borrar el último chat
    const updatedChats = chats.filter((chat) => chat.id !== chatId);
    setChats(updatedChats);
    if (activeChat === chatId) {
      setActiveChat(updatedChats[0].id);
    }
  };

  const handleSend = () => {
    if (!input.trim()) return;
    
    const userMessage: Message = {
      id: Date.now().toString(),
      type: "user",
      content: input,
    };
    
    setChats(chats.map(chat => 
      chat.id === activeChat 
        ? { ...chat, messages: [...chat.messages, userMessage] }
        : chat
    ));
    setInput("");
    
    // Simulate AI response
    setTimeout(() => {
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: "ai",
        content: "Entendido. ¿Qué aspecto de esta información te gustaría que analice?",
      };
      setChats(chats => chats.map(chat => 
        chat.id === activeChat 
          ? { ...chat, messages: [...chat.messages, aiMessage] }
          : chat
      ));
    }, 1000);
  };

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
              onClick={() => setShowChatList(!showChatList)}
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
                  <p className="text-sm">{message.content}</p>
                  {message.news && (
                    <div className="mt-2 p-2 bg-background/50 rounded-lg">
                      <p className="text-xs font-medium">{message.news.title}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {droppedNews.map((news) => (
              <div key={news.id} className="flex justify-start">
                <div className="max-w-[80%] rounded-2xl px-4 py-3 bg-gold-dark/10 border-2 border-gold-medium text-foreground">
                  <p className="text-xs text-gold-light font-semibold mb-1">📰 Noticia añadida</p>
                  <p className="text-sm">{news.title}</p>
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
    </div>
  );
};
