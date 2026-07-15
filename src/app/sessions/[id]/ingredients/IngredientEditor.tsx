"use client";

import { useState, useTransition } from "react";
import { addIngredient, updateIngredient, deleteIngredient } from "@/lib/fridge/actions";

type Ingredient = { id: string; name: string; quantity_text: string | null };

export function IngredientEditor({
  sessionId,
  initialIngredients,
}: {
  sessionId: string;
  initialIngredients: Ingredient[];
}) {
  const [ingredients, setIngredients] = useState(initialIngredients);
  const [newName, setNewName] = useState("");
  const [newQty, setNewQty] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleAdd() {
    if (!newName.trim()) return;
    const name = newName.trim();
    const quantityText = newQty.trim();
    setNewName("");
    setNewQty("");
    startTransition(async () => {
      await addIngredient(sessionId, { name, quantityText });
      setIngredients((prev) => [...prev, { id: crypto.randomUUID(), name, quantity_text: quantityText || null }]);
    });
  }

  function handleDelete(id: string) {
    setIngredients((prev) => prev.filter((ing) => ing.id !== id));
    startTransition(async () => {
      await deleteIngredient(id, sessionId);
    });
  }

  function handleBlurSave(ing: Ingredient) {
    startTransition(async () => {
      await updateIngredient(ing.id, sessionId, {
        name: ing.name,
        quantityText: ing.quantity_text ?? undefined,
      });
    });
  }

  return (
    <div style={{ marginTop: 16 }}>
      {ingredients.map((ing) => (
        <div key={ing.id} style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 6 }}>
          <input
            value={ing.name}
            onChange={(e) =>
              setIngredients((prev) =>
                prev.map((i) => (i.id === ing.id ? { ...i, name: e.target.value } : i))
              )
            }
            onBlur={() => handleBlurSave(ing)}
            style={{ padding: 6, flex: 2 }}
          />
          <input
            value={ing.quantity_text ?? ""}
            placeholder="수량"
            onChange={(e) =>
              setIngredients((prev) =>
                prev.map((i) => (i.id === ing.id ? { ...i, quantity_text: e.target.value } : i))
              )
            }
            onBlur={() => handleBlurSave(ing)}
            style={{ padding: 6, flex: 1 }}
          />
          <button type="button" onClick={() => handleDelete(ing.id)} aria-label={`${ing.name} 삭제`} style={{ cursor: "pointer" }}>
            ×
          </button>
        </div>
      ))}

      <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="재료 이름"
          style={{ padding: 6, flex: 2 }}
        />
        <input
          value={newQty}
          onChange={(e) => setNewQty(e.target.value)}
          placeholder="수량 (선택)"
          style={{ padding: 6, flex: 1 }}
        />
        <button type="button" onClick={handleAdd} disabled={isPending} style={{ cursor: "pointer" }}>
          추가
        </button>
      </div>
    </div>
  );
}
