"use client";

import { useState, type ComponentProps } from "react";

import { Eye, EyeOff } from "@/components/icons";

import { TextField } from "./TextField";

// Password input with the show/hide toggle of Masuk (docs/design/07-copy-deck.md: "Tampilkan kata sandi" / "Sembunyikan
// kata sandi"). The button flips its own label, so it carries no aria-pressed; it is 44×44, inside the input's right edge.
type Props = Omit<ComponentProps<typeof TextField>, "type" | "trailing">;

export function PasswordField(props: Props) {
  const [visible, setVisible] = useState(false);
  return (
    <TextField
      {...props}
      type={visible ? "text" : "password"}
      trailing={
        <button
          type="button"
          aria-label={visible ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
          aria-controls={props.id}
          onClick={() => setVisible((current) => !current)}
          className="absolute top-0 right-0 inline-flex size-11 cursor-pointer items-center justify-center rounded-lg text-text-secondary transition-[color] duration-150 ease-out hover:text-text-primary"
        >
          {visible ? <EyeOff size={20} /> : <Eye size={20} />}
        </button>
      }
    />
  );
}
