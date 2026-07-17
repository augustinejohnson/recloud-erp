import React, { useState, useRef, useEffect } from 'react';
import { Bot, User, Send, Sparkles, FileText, BarChart3, Mail, MessageSquare } from 'lucide-react';

export default function AiAssistantModule({ currentUser }) {
  const [messages, setMessages] = useState([
    { id: 1, role: 'ai', text: `Hi ${currentUser?.name || 'there'}! I'm your Recloud AI Assistant. How can I help you today? I can summarize your sales data, draft emails, or analyze your inventory.` }
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSend = (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const userMsg = { id: Date.now(), role: 'user', text: inputText };
    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsTyping(true);

    // Mock AI Response
    setTimeout(() => {
      const lowerText = userMsg.text.toLowerCase();
      let responseText = "I'm still learning! Right now I can help you with sales summaries, drafting emails, or analyzing inventory. Try asking me to 'Draft an email to a customer' or 'Summarize my sales'.";
      
      if (lowerText.includes('email') || lowerText.includes('draft')) {
        responseText = "Sure, here is a draft email:\n\nSubject: Following up on your recent order\n\nHi [Customer Name],\n\nI hope this email finds you well. I'm reaching out to confirm if you received your recent order and if everything is to your satisfaction. Please let us know if you have any questions.\n\nBest regards,\nRecloud Team";
      } else if (lowerText.includes('sale') || lowerText.includes('summarize')) {
        responseText = "Based on your recent data, your sales are up 15% this month. Your top performing product category is Electronics, generating $12,500 in revenue. Would you like a detailed breakdown?";
      } else if (lowerText.includes('inventory') || lowerText.includes('stock')) {
        responseText = "I've analyzed your inventory. You currently have 3 items running low on stock (below minimum threshold). I recommend creating a Purchase Order for 'Wireless Keyboards' and 'USB-C Cables'.";
      }

      setMessages(prev => [...prev, { id: Date.now() + 1, role: 'ai', text: responseText }]);
      setIsTyping(false);
    }, 1500);
  };

  const suggestions = [
    { icon: <Mail className="w-4 h-4" />, text: "Draft an email to a client" },
    { icon: <BarChart3 className="w-4 h-4" />, text: "Summarize my sales this month" },
    { icon: <FileText className="w-4 h-4" />, text: "Analyze my inventory levels" }
  ];

  return (
    <div className="flex flex-col w-full h-[70vh] md:h-full md:min-h-[500px] rounded-3xl overflow-hidden relative border border-white/50 bg-gradient-to-br from-indigo-50/50 via-white to-purple-50/50 shadow-xl shadow-indigo-900/10 backdrop-blur-xl">
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-purple-400/20 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-indigo-400/20 rounded-full blur-[120px] pointer-events-none"></div>
      
      {/* Sidebar Suggestions - hidden on mobile */}
      <div className="hidden md:flex w-72 bg-white/40 backdrop-blur-md border-r border-white/50 p-8 flex-col z-10">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md">
            <Sparkles className="w-4 h-4" />
          </div>
          <h2 className="font-black text-slate-800 text-lg">Recloud AI</h2>
        </div>
        
        <div className="flex-1">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Suggested Prompts</h3>
          <div className="space-y-3">
            {suggestions.map((s, i) => (
              <button 
                key={i} 
                onClick={() => setInputText(s.text)}
                className="w-full text-left p-4 rounded-2xl bg-white/60 backdrop-blur-sm border border-white hover:border-purple-300 hover:shadow-lg hover:shadow-purple-900/5 transition-all text-sm text-slate-600 group"
              >
                <div className="text-purple-500 mb-2 group-hover:scale-110 transition-transform origin-left bg-white/80 w-8 h-8 rounded-full flex items-center justify-center shadow-sm">{s.icon}</div>
                <div className="font-medium">{s.text}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-white/30 backdrop-blur-sm z-10">
        {/* Mobile header */}
        <div className="md:hidden flex items-center gap-2 p-3 border-b border-white/50 bg-white/40 backdrop-blur-md">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-sm">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <h2 className="font-black text-slate-800 text-base">Recloud AI</h2>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-4 md:space-y-6">
          {/* Mobile suggestions - shown inline at top */}
          {messages.length <= 1 && (
            <div className="md:hidden flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
              {suggestions.map((s, i) => (
                <button 
                  key={i} 
                  onClick={() => setInputText(s.text)}
                  className="shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl bg-white/60 backdrop-blur-sm border border-white hover:border-purple-300 transition-all text-xs text-slate-600 font-medium"
                >
                  <span className="text-purple-500">{s.icon}</span>
                  <span className="whitespace-nowrap">{s.text}</span>
                </button>
              ))}
            </div>
          )}

          {messages.map(msg => (
            <div key={msg.id} className={`flex gap-3 md:gap-4 max-w-[90%] md:max-w-[80%] ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''} animate-in slide-in-from-bottom-2`}>
              <div className={`w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm ${msg.role === 'ai' ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                {msg.role === 'ai' ? <Bot className="w-3.5 h-3.5 md:w-4 md:h-4" /> : <User className="w-3.5 h-3.5 md:w-4 md:h-4" />}
              </div>
              <div className={`px-4 md:px-5 py-3 md:py-4 rounded-2xl text-sm whitespace-pre-wrap leading-relaxed shadow-md ${
                msg.role === 'user' 
                  ? 'bg-gradient-to-br from-slate-800 to-slate-900 text-white rounded-tr-sm shadow-slate-900/20' 
                  : 'bg-white/80 backdrop-blur-md text-slate-700 rounded-tl-sm border border-white'
              }`}>
                {msg.text}
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="flex gap-3 md:gap-4 max-w-[80%]">
              <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                <Bot className="w-3.5 h-3.5 md:w-4 md:h-4" />
              </div>
              <div className="px-4 py-4 rounded-2xl bg-white border border-slate-100 rounded-tl-sm flex items-center gap-1.5 shadow-sm">
                <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-3 md:p-8 bg-white/40 backdrop-blur-md border-t border-white/50">
          <form onSubmit={handleSend} className="max-w-4xl mx-auto relative group">
            <input
              type="text"
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              placeholder="Ask Recloud AI anything..."
              className="w-full pl-4 md:pl-6 pr-14 py-3 md:py-4 bg-white/80 backdrop-blur-md border border-white rounded-2xl text-sm focus:outline-none focus:border-purple-400 focus:ring-4 focus:ring-purple-500/20 transition-all shadow-lg shadow-indigo-900/5 placeholder-slate-400 font-medium text-slate-800"
            />
            <button 
              type="submit"
              disabled={!inputText.trim() || isTyping}
              className="absolute right-2 top-2 bottom-2 aspect-square flex items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 disabled:opacity-50 disabled:from-slate-400 disabled:to-slate-500 text-white rounded-xl transition-all shadow-md shadow-purple-500/30 transform hover:-translate-y-0.5"
            >
              <Send className="w-4 h-4 md:w-5 md:h-5" />
            </button>
          </form>
          <div className="text-center mt-2 md:mt-3">
            <span className="text-[10px] text-slate-400 font-medium">AI Assistant can make mistakes. Consider verifying important information.</span>
          </div>
        </div>
      </div>
    </div>
  );
}

