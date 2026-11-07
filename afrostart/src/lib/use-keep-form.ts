"use client";
import { startTransition } from "react";

/**
 * React 19 resets a <form action={...}> after every submission, which would wipe what the user typed
 * when validation fails. Submitting through onSubmit keeps the fields; successful forms reset explicitly.
 */
export function keepValuesOnSubmit(formAction: (fd: FormData) => void) {
  return (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(() => formAction(fd));
  };
}
