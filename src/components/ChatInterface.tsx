import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Sparkles } from "lucide-react";
import { NewsItem } from "./NewsCard";

interface Message {
  id: string;
  type: "user" | "ai" | "news";
  content: string;
  news?: NewsItem;
}

interface ChatInterfaceProps {
  onDrop: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  droppedNews: NewsItem[];
}

export const ChatInterface = ({ onDrop, onDragOver, droppedNews }: ChatInterfaceProps) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      type: "ai",
      content: "¡Hola! Soy tu asistente de análisis de mercado. Arrastra noticias aquí para que las analice.",
    },
  ]);
  const [input, setInput] = useState("");

  const handleSend = () => {
    if (!input.trim()) return;
    
    const userMessage: Message = {
      id: Date.now().toString(),
      type: "user",
      content: input,
    };
    
    setMessages([...messages, userMessage]);
    setInput("");
    
    // Simulate AI response
    setTimeout(() => {
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: "ai",
        content: "Entendido. ¿Qué aspecto de esta información te gustaría que analice?",
      };
      setMessages((prev) => [...prev, aiMessage]);
    }, 1000);
  };

  return (
    <Card
      onDrop={onDrop}
      onDragOver={onDragOver}
      className="h-full flex flex-col bg-card border-border relative overflow-hidden"
    >
      {/* Gradient glow effect */}
      <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-gold-radial pointer-events-none" />
      
      {/* Header */}
      <div className="p-6 border-b border-border relative z-10">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-gradient-gold flex items-center justify-center shadow-gold-glow">
            <Sparkles className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">AI Analyst</h2>
            <p className="text-xs text-muted-foreground">Análisis en tiempo real</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-6 relative z-10">
        <div className="space-y-4">
          {messages.map((message) => (
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
  );
};
