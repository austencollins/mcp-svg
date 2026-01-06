import { useState, useCallback, type FormEvent } from "react";

interface AddTodoFormProps {
  /** Called when a new todo is submitted */
  onAdd: (text: string) => Promise<void>;
}

/**
 * AddTodoForm Component
 *
 * Form for adding new todo items.
 * Disables input while submitting to prevent double-adds.
 */
export const AddTodoForm = ({ onAdd }: AddTodoFormProps) => {
  const [text, setText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      if (!text.trim() || isSubmitting) return;

      setIsSubmitting(true);
      try {
        await onAdd(text.trim());
        setText("");
      } catch (error) {
        console.error("[AddTodoForm] Failed to add todo:", error);
      } finally {
        setIsSubmitting(false);
      }
    },
    [text, isSubmitting, onAdd]
  );

  return (
    <form className="add-form" onSubmit={handleSubmit}>
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Add a new todo..."
        autoComplete="off"
        disabled={isSubmitting}
      />
      <button type="submit" disabled={isSubmitting || !text.trim()}>
        Add
      </button>
    </form>
  );
};

