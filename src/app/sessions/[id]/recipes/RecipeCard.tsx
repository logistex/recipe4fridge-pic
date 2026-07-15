"use client";

import { useState, useTransition } from "react";
import { setRecipeFeedback, toggleSaveRecipe } from "@/lib/fridge/actions";

type Recipe = {
  id: string;
  title: string;
  ingredients_json: string[];
  steps_json: string[];
  est_time_minutes: number | null;
};

export function RecipeCard({
  recipe,
  initialReaction,
  initialSaved,
}: {
  recipe: Recipe;
  initialReaction?: "like" | "dislike";
  initialSaved: boolean;
}) {
  const [reaction, setReaction] = useState(initialReaction);
  const [saved, setSaved] = useState(initialSaved);
  const [, startTransition] = useTransition();

  function react(next: "like" | "dislike") {
    setReaction(next);
    startTransition(async () => {
      await setRecipeFeedback(recipe.id, next);
    });
  }

  function toggleSave() {
    const next = !saved;
    setSaved(next);
    startTransition(async () => {
      await toggleSaveRecipe(recipe.id, next);
    });
  }

  return (
    <article className="recipe-card">
      <div className="recipe-card-head">
        <span className="recipe-card-title">{recipe.title}</span>
        <span className="recipe-card-meta">{recipe.est_time_minutes}분</span>
      </div>
      <p className="recipe-card-ingredients">{recipe.ingredients_json.join(", ")}</p>
      <ol style={{ fontSize: 13, color: "var(--app-text)", paddingLeft: 18, marginBottom: 12 }}>
        {recipe.steps_json.map((step, i) => (
          <li key={i}>{step}</li>
        ))}
      </ol>
      <div className="recipe-card-actions">
        <div>
          <button
            type="button"
            className={`reaction-btn ${reaction === "like" ? "active" : ""}`}
            onClick={() => react("like")}
          >
            좋아요
          </button>
          <button
            type="button"
            className={`reaction-btn ${reaction === "dislike" ? "active" : ""}`}
            onClick={() => react("dislike")}
          >
            싫어요
          </button>
        </div>
        <button type="button" className={`save-btn ${saved ? "saved" : ""}`} onClick={toggleSave}>
          {saved ? "저장됨" : "저장"}
        </button>
      </div>
    </article>
  );
}
