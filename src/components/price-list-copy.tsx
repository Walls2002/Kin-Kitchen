"use client";

import { Check, Share2 } from "@/components/icons";
import { useState } from "react";
import { useToast } from "./toast";
import { Button } from "./ui";

/** Copies the price list as plain text, ready to paste into Messenger or a post. */
export function CopyPriceList({ text }: { text: string }) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ message: "Price list copied. Paste it into a chat or post." });
    } catch {
      toast({ message: "Couldn't copy. Your browser blocked the clipboard.", tone: "error" });
    }
  };
  return (
    <Button onClick={copy}>
      {copied ? <Check aria-hidden /> : <Share2 aria-hidden />}
      {copied ? "Copied" : "Copy as text"}
    </Button>
  );
}
