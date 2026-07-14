/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from "react";
import { Send, Sparkles, BookOpen, MapPin, Compass, AlertCircle } from "lucide-react";
import { TaggedAnimal, ChatMessage } from "../types";

interface IntelligenceAssistantProps {
  selectedAnimal: TaggedAnimal | null;
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  isLoading: boolean;
}

// Simple client-side formatting for Markdown bold/italics/lists/paragraphs to keep app robust
function formatMessageContent(content: string) {
  const lines = content.split("\n");
  return lines.map((line, lineIdx) => {
    let cleanLine = line.trim();

    // Headers (###)
    if (cleanLine.startsWith("###")) {
      return (
        <h4 key={lineIdx} className="text-sm font-bold text-brand-sage mt-4 mb-2 first:mt-0 font-sans tracking-wide">
          {cleanLine.replace("###", "").trim()}
        </h4>
      );
    }
    if (cleanLine.startsWith("##")) {
      return (
        <h3 key={lineIdx} className="text-base font-bold text-brand-sand mt-4 mb-2 first:mt-0 font-sans tracking-wide">
          {cleanLine.replace("##", "").trim()}
        </h3>
      );
    }

    // Bullet points
    if (cleanLine.startsWith("-") || cleanLine.startsWith("*")) {
      const bulletContent = cleanLine.substring(1).trim();
      return (
        <li key={lineIdx} className="ml-4 list-disc text-xs text-gray-300 mb-1 font-sans">
          {parseInlineMarkdown(bulletContent)}
        </li>
      );
    }

    // Paragraph
    if (cleanLine === "") {
      return <div key={lineIdx} className="h-2" />;
    }

    return (
      <p key={lineIdx} className="text-xs text-gray-300 leading-relaxed font-sans mb-2 last:mb-0">
        {parseInlineMarkdown(cleanLine)}
      </p>
    );
  });
}

// Replaces **text** with <strong> and _text_ with <em>
function parseInlineMarkdown(text: string) {
  const parts: React.ReactNode[] = [];
  let currentText = text;
  let idx = 0;

  while (currentText.length > 0) {
    const boldMatch = currentText.match(/\*\*(.*?)\*\*/);
    const italicMatch = currentText.match(/_(.*?)_/);

    let firstMatch = null;
    let isBold = false;

    if (boldMatch && (!italicMatch || boldMatch.index! < italicMatch.index!)) {
      firstMatch = boldMatch;
      isBold = true;
    } else if (italicMatch) {
      firstMatch = italicMatch;
    }

    if (!firstMatch) {
      parts.push(<span key={idx++}>{currentText}</span>);
      break;
    }

    const matchIndex = firstMatch.index!;
    if (matchIndex > 0) {
      parts.push(<span key={idx++}>{currentText.substring(0, matchIndex)}</span>);
    }

    const innerText = firstMatch[1];
    if (isBold) {
      parts.push(<strong key={idx++} className="font-bold text-brand-sand">{innerText}</strong>);
    } else {
      parts.push(<em key={idx++} className="italic text-gray-200">{innerText}</em>);
    }

    currentText = currentText.substring(matchIndex + firstMatch[0].length);
  }

  return parts;
}

export default function IntelligenceAssistant({
  selectedAnimal,
  messages,
  onSendMessage,
  isLoading
}: IntelligenceAssistantProps) {
  const [inputText, setInputText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Suggested questions based on selected animal
  const suggestions = selectedAnimal
    ? [
        `Where is ${selectedAnimal.name} migrating right now?`,
        `What are the major conservation threats to ${selectedAnimal.species}?`,
        `Describe the typical habitat of ${selectedAnimal.species}.`,
      ]
    : [
        "Explain how scientists track wild animals using Movebank.",
        "What are some famous bird migration flyways on Earth?",
        "Where can I find wolf-packs in North America?",
      ];

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isLoading) return;
    onSendMessage(inputText);
    setInputText("");
  };

  const handleSuggestionClick = (text: string) => {
    if (isLoading) return;
    onSendMessage(text);
  };

  return (
    <div className="flex flex-col h-full bg-brand-panel border border-brand-moss rounded-2xl overflow-hidden shadow-2xl relative">
      {/* Top Banner */}
      <div className="px-4 py-3 bg-brand-bg border-b border-brand-moss flex items-center justify-between select-none">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-brand-sage animate-pulse" />
          <h3 className="text-xs font-bold uppercase tracking-widest text-brand-sage font-sans">
            Gemini Wildlife Intelligence
          </h3>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-brand-panel text-[9px] font-bold text-brand-sage border border-brand-moss uppercase">
          Maps Grounded
        </div>
      </div>

      {/* Selected Subject Context Header */}
      <div className="px-4 py-2.5 bg-brand-panel-light/40 border-b border-brand-moss flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs">
          <BookOpen className="w-3.5 h-3.5 text-gray-400" />
          <span className="text-gray-400 font-sans">Query Target:</span>
          {selectedAnimal ? (
            <span className="text-brand-sand font-bold font-sans flex items-center gap-1">
              {selectedAnimal.name} <span className="text-[10px] text-brand-sage font-normal italic">({selectedAnimal.species})</span>
            </span>
          ) : (
            <span className="text-gray-500 font-sans italic">Global Wildlife Tracking</span>
          )}
        </div>
      </div>

      {/* Chat Messages Body */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4 select-none">
            <div className="w-12 h-12 rounded-full bg-brand-moss/50 flex items-center justify-center text-brand-sage border border-brand-fern/30">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-brand-sand font-sans">Intelligence Engine Online</p>
              <p className="text-xs text-gray-500 max-w-xs mt-1 font-sans">
                Ask Gemini questions about species habitats, migration flyways, threats, and geographical landmarks grounded on live map data.
              </p>
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col max-w-[85%] ${
                msg.role === "user" ? "ml-auto items-end" : "mr-auto items-start"
              }`}
            >
              {/* Message bubble */}
              <div
                className={`p-3 rounded-2xl text-xs leading-relaxed ${
                  msg.role === "user"
                    ? "bg-brand-fern text-white rounded-br-none border border-brand-fern"
                    : "bg-brand-panel-light text-gray-300 rounded-bl-none border border-brand-moss"
                }`}
              >
                {msg.role === "assistant" ? (
                  <div className="space-y-1">{formatMessageContent(msg.content)}</div>
                ) : (
                  <p className="font-sans whitespace-pre-wrap">{msg.content}</p>
                )}
              </div>

              {/* Citations Grounding block */}
              {msg.role === "assistant" && msg.citations && msg.citations.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1 px-1">
                  <span className="text-[9px] text-gray-500 font-semibold uppercase flex items-center gap-0.5">
                    <MapPin className="w-2.5 h-2.5" /> Maps Grounding:
                  </span>
                  {msg.citations.map((citation, cIdx) => (
                    <a
                      key={cIdx}
                      href={citation.uri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-brand-sage font-medium hover:underline flex items-center gap-0.5 bg-brand-moss/40 px-1.5 py-0.5 rounded border border-brand-fern/20 transition cursor-pointer"
                    >
                      {citation.title || "Google Maps Location"}
                    </a>
                  ))}
                </div>
              )}
            </div>
          ))
        )}

        {/* Loading Bubble */}
        {isLoading && (
          <div className="flex flex-col max-w-[80%] mr-auto items-start">
            <div className="bg-brand-panel-light border border-brand-moss p-3.5 rounded-2xl rounded-bl-none flex items-center gap-2 text-xs text-brand-sage select-none font-sans font-medium">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-sage opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-sage"></span>
              </span>
              Gemini is researching geographic wildlife records...
            </div>
          </div>
        )}
      </div>

      {/* Suggested Questions Slider */}
      <div className="px-4 py-2 bg-brand-bg/60 border-t border-brand-moss flex flex-col gap-1 select-none">
        <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider font-sans">
          Suggested Queries:
        </span>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
          {suggestions.map((sug, sIdx) => (
            <button
              key={sIdx}
              onClick={() => handleSuggestionClick(sug)}
              disabled={isLoading}
              className="text-[10px] text-brand-sage hover:text-white bg-brand-moss border border-brand-fern/30 px-2.5 py-1 rounded-full whitespace-nowrap hover:bg-brand-fern transition disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
            >
              {sug}
            </button>
          ))}
        </div>
      </div>

      {/* Input Form Footer */}
      <form onSubmit={handleSubmit} className="p-3 bg-brand-bg border-t border-brand-moss flex gap-2">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          disabled={isLoading}
          placeholder={
            selectedAnimal
              ? `Ask about ${selectedAnimal.name}...`
              : "Ask about species, migrations, habitats..."
          }
          className="flex-1 bg-brand-panel-light text-xs text-[#e2ebd9] border border-brand-moss focus:border-brand-fern focus:ring-1 focus:ring-brand-fern rounded-xl px-3 py-2 outline-none placeholder:text-gray-500 disabled:opacity-40"
        />
        <button
          type="submit"
          disabled={!inputText.trim() || isLoading}
          className="bg-brand-fern hover:bg-brand-sage hover:text-brand-bg text-[#e2ebd9] p-2 rounded-xl transition disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center cursor-pointer shadow-md"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
