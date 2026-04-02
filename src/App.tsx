import { useState, useRef } from "react";
import { 
  FileText, 
  Upload, 
  Users, 
  Clock, 
  ChevronRight, 
  MessageSquare, 
  X,
  Send,
  Loader2,
  Calendar,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { format, addMinutes } from "date-fns";
import ReactMarkdown from "react-markdown";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

import { generateAgendaFromDoc, MeetingAgenda, chatAboutAgenda } from "@/src/lib/gemini";

export default function App() {
  const [agenda, setAgenda] = useState<MeetingAgenda | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<{ role: "user" | "model"; text: string }[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isChatting, setIsChatting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsGenerating(true);
    setError(null);
    setAgenda(null);

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = (event.target?.result as string).split(",")[1];
        try {
          const result = await generateAgendaFromDoc(base64, file.type);
          setAgenda(result);
          setChatMessages([
            { role: "model", text: `I've analyzed the document and generated an agenda for "${result.title}". How can I help you refine it?` }
          ]);
        } catch (err) {
          console.error(err);
          setError("Failed to generate agenda. Please try again with a different file.");
        } finally {
          setIsGenerating(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error(err);
      setError("Error reading file.");
      setIsGenerating(false);
    }
  };

  const sendMessage = async () => {
    if (!inputValue.trim() || isChatting || !agenda) return;

    const userMessage = inputValue.trim();
    setChatMessages(prev => [...prev, { role: "user", text: userMessage }]);
    setInputValue("");
    setIsChatting(true);

    try {
      const response = await chatAboutAgenda(agenda, chatMessages, userMessage);
      setChatMessages(prev => [...prev, { role: "model", text: response || "I'm sorry, I couldn't process that." }]);
    } catch (err) {
      console.error(err);
      setChatMessages(prev => [...prev, { role: "model", text: "Sorry, I encountered an error. Please try again." }]);
    } finally {
      setIsChatting(false);
    }
  };

  const startTime = new Date();
  startTime.setHours(9, 0, 0, 0);

  return (
    <div className="flex h-screen w-full bg-slate-50 font-sans text-slate-900 overflow-hidden">
      {/* Sidebar - File Upload & Context */}
      <aside className="w-80 border-r border-slate-200 bg-white flex flex-col">
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">AgendaCraft</h1>
          </div>

          <div 
            onClick={() => fileInputRef.current?.click()}
            className="group relative flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50 hover:bg-slate-100 hover:border-indigo-400 transition-all cursor-pointer overflow-hidden"
          >
            <input 
              type="file" 
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden" 
              accept=".pdf,.txt,.docx,.doc"
            />
            <div className="flex flex-col items-center gap-2 text-slate-500 group-hover:text-indigo-600 transition-colors">
              <Upload className="w-8 h-8" />
              <span className="text-sm font-medium">Upload Document</span>
              <span className="text-xs text-slate-400">PDF, TXT, DOCX</span>
            </div>
          </div>
        </div>

        <ScrollArea className="flex-1 p-6">
          <div className="space-y-6">
            {isGenerating && (
              <div className="flex flex-col items-center justify-center py-10 gap-3 text-slate-500">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                <p className="text-sm animate-pulse">Analyzing document...</p>
              </div>
            )}

            {error && (
              <div className="p-4 bg-red-50 border border-red-100 rounded-lg flex gap-3 text-red-700">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <p className="text-xs leading-relaxed">{error}</p>
              </div>
            )}

            {agenda && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div>
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Stakeholders</h3>
                  <div className="flex flex-wrap gap-2">
                    {agenda.stakeholders.map((person, i) => (
                      <Badge key={i} variant="secondary" className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-none">
                        {person}
                      </Badge>
                    ))}
                  </div>
                </div>

                <Separator className="bg-slate-100" />

                <div>
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Meeting Summary</h3>
                  <p className="text-sm text-slate-600 leading-relaxed italic">
                    "{agenda.summary}"
                  </p>
                </div>
              </motion.div>
            )}

            {!agenda && !isGenerating && !error && (
              <div className="flex flex-col items-center justify-center py-10 text-center gap-2 text-slate-400">
                <FileText className="w-12 h-12 opacity-20" />
                <p className="text-sm">Upload a project brief, transcript, or notes to get started.</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </aside>

      {/* Main Content - Timeline & Agenda */}
      <main className="flex-1 flex flex-col min-w-0 bg-slate-50">
        <header className="h-16 border-b border-slate-200 bg-white px-8 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <h2 className="font-semibold text-slate-800 truncate max-w-md">
              {agenda ? agenda.title : "Meeting Agenda Builder"}
            </h2>
            {agenda && <Badge className="bg-green-100 text-green-700 border-none">Ready</Badge>}
          </div>
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" className="text-slate-600">
              Export PDF
            </Button>
            <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700">
              Share Agenda
            </Button>
          </div>
        </header>

        <div className="flex-1 overflow-hidden flex">
          {/* Timeline View */}
          <ScrollArea className="flex-1 p-8">
            <div className="max-w-3xl mx-auto">
              {agenda ? (
                <div className="relative space-y-8">
                  {/* Vertical Line */}
                  <div className="absolute left-[19px] top-4 bottom-4 w-0.5 bg-slate-200" />

                  {agenda.items.map((item, index) => {
                    // Calculate start time for this item
                    const itemStartTime = agenda.items.slice(0, index).reduce((acc, curr) => addMinutes(acc, curr.duration), startTime);
                    const itemEndTime = addMinutes(itemStartTime, item.duration);

                    return (
                      <motion.div 
                        key={index}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="relative flex gap-6 group"
                      >
                        {/* Timeline Dot */}
                        <div className="relative z-10 w-10 h-10 rounded-full bg-white border-2 border-indigo-600 flex items-center justify-center shrink-0 shadow-sm group-hover:scale-110 transition-transform">
                          <div className="w-2 h-2 rounded-full bg-indigo-600" />
                        </div>

                        <Card className="flex-1 border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                          <CardHeader className="pb-2">
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-2 text-xs font-medium text-indigo-600">
                                <Clock className="w-3 h-3" />
                                {format(itemStartTime, "h:mm a")} - {format(itemEndTime, "h:mm a")}
                                <span className="text-slate-400">({item.duration}m)</span>
                              </div>
                              <div className="flex -space-x-2">
                                {item.stakeholders.slice(0, 3).map((s, i) => (
                                  <Avatar key={i} className="w-6 h-6 border-2 border-white">
                                    <AvatarFallback className="text-[10px] bg-slate-100 text-slate-600">
                                      {s.charAt(0)}
                                    </AvatarFallback>
                                  </Avatar>
                                ))}
                                {item.stakeholders.length > 3 && (
                                  <div className="w-6 h-6 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-[10px] text-slate-500 font-medium">
                                    +{item.stakeholders.length - 3}
                                  </div>
                                )}
                              </div>
                            </div>
                            <CardTitle className="text-lg">{item.title}</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <p className="text-sm text-slate-600 leading-relaxed">
                              {item.description}
                            </p>
                            <div className="mt-4 flex flex-wrap gap-1.5">
                              {item.stakeholders.map((s, i) => (
                                <span key={i} className="text-[10px] bg-slate-50 text-slate-500 px-2 py-0.5 rounded border border-slate-100">
                                  {s}
                                </span>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })}

                  <div className="relative flex gap-6">
                    <div className="relative z-10 w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center shrink-0 shadow-lg">
                      <CheckCircle2 className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex items-center">
                      <span className="text-sm font-semibold text-slate-800">Meeting Adjourned</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center py-20">
                  <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-6">
                    <Calendar className="w-10 h-10 text-slate-300" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-800 mb-2">No Agenda Generated</h3>
                  <p className="text-slate-500 max-w-sm">
                    Upload a document in the sidebar to automatically generate a structured meeting agenda with topics, stakeholders, and timing.
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Chat Panel */}
          <div className="w-96 border-l border-slate-200 bg-white flex flex-col shrink-0">
            <div className="p-4 border-b border-slate-100 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-indigo-600" />
              <h3 className="font-semibold text-sm">Agenda Assistant</h3>
            </div>
            
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {chatMessages.map((msg, i) => (
                  <div 
                    key={i} 
                    className={cn(
                      "flex flex-col gap-1 max-w-[85%]",
                      msg.role === "user" ? "ml-auto items-end" : "items-start"
                    )}
                  >
                    <div 
                      className={cn(
                        "p-3 rounded-2xl text-sm",
                        msg.role === "user" 
                          ? "bg-indigo-600 text-white rounded-tr-none" 
                          : "bg-slate-100 text-slate-800 rounded-tl-none"
                      )}
                    >
                      <div className="markdown-body prose prose-sm prose-slate dark:prose-invert max-w-none">
                        <ReactMarkdown>
                          {msg.text}
                        </ReactMarkdown>
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-400 px-1">
                      {msg.role === "user" ? "You" : "Gemini"}
                    </span>
                  </div>
                ))}
                {isChatting && (
                  <div className="flex items-center gap-2 text-slate-400 text-xs italic">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Gemini is thinking...
                  </div>
                )}
              </div>
            </ScrollArea>

            <div className="p-4 border-t border-slate-100">
              <div className="relative">
                <Input 
                  placeholder="Ask about the agenda..." 
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                  className="pr-10 bg-slate-50 border-slate-200 focus:ring-indigo-500"
                />
                <Button 
                  size="icon" 
                  variant="ghost" 
                  onClick={sendMessage}
                  disabled={!inputValue.trim() || isChatting}
                  className="absolute right-1 top-1 h-8 w-8 text-indigo-600 hover:text-indigo-700 hover:bg-transparent"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-[10px] text-slate-400 mt-2 text-center">
                Refine timing, add topics, or identify missing stakeholders.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
