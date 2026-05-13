"use client";

import { Trash2 } from "lucide-react";
import { useFormStatus } from "react-dom";

export function DeleteNewsButton() {
  const { pending } = useFormStatus();
  
  return (
    <button 
      type="submit" 
      disabled={pending}
      className="p-2 text-zinc-400 hover:text-red-500 bg-white/5 hover:bg-red-500/10 rounded transition-colors disabled:opacity-50"
      onClick={(e) => {
        if (!window.confirm("Are you sure you want to delete this news?")) {
          e.preventDefault();
        }
      }}
    >
      <Trash2 size={16} />
    </button>
  );
}
