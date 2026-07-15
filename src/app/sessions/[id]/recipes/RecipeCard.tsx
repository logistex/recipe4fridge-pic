"use client";

import { useState, useTransition } from "react";
import { setRecipeFeedback, setRecipeComment, toggleSaveRecipe } from "@/lib/fridge/actions";

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
  initialComment,
  initialSaved,
}: {
  recipe: Recipe;
  initialReaction?: "like" | "dislike";
  initialComment: string;
  initialSaved: boolean;
}) {
  const [reaction, setReaction] = useState(initialReaction);
  const [saved, setSaved] = useState(initialSaved);
  const [comment, setComment] = useState(initialComment);
  const [commentSaved, setCommentSaved] = useState(false);
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

  function saveComment() {
    setCommentSaved(true);
    startTransition(async () => {
      await setRecipeComment(recipe.id, comment);
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

      <div style={{ marginTop: 10 }}>
        <textarea
          value={comment}
          onChange={(e) => {
            setComment(e.target.value);
            setCommentSaved(false);
          }}
          placeholder={reaction ? "이 레시피에 대한 평가를 남겨주세요" : "먼저 좋아요/싫어요를 선택해주세요"}
          disabled={!reaction}
          rows={2}
          style={{
            width: "100%",
            padding: 8,
            fontSize: 13,
            borderRadius: 8,
            border: "1px solid var(--app-line)",
            background: reaction ? "var(--app-surface)" : "var(--app-bg)",
            color: "var(--app-text)",
            resize: "vertical",
          }}
        />
        <button
          type="button"
          onClick={saveComment}
          disabled={!reaction}
          style={{
            marginTop: 6,
            fontSize: 12,
            padding: "5px 10px",
            borderRadius: 999,
            border: "1px solid var(--app-line)",
            background: "transparent",
            color: "var(--app-accent-strong)",
            cursor: reaction ? "pointer" : "not-allowed",
          }}
        >
          {commentSaved ? "코멘트 저장됨" : "코멘트 저장"}
        </button>
      </div>
    </article>
  );
}
