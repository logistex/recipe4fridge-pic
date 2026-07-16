"use client";

import { useState, useTransition } from "react";
import { setRecipeFeedback, setRecipeComment, toggleSaveRecipe } from "@/lib/fridge/actions";
import { ThumbIcon, BookmarkIcon } from "@/components/Icons";

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

  // 좋아요/싫어요는 별도 저장 버튼 없이 클릭 즉시 반영된다. 같은 카드에서 좋아요 →
  // 싫어요로 다시 누르면 마지막으로 누른 쪽이 그대로 최종 상태로 저장된다
  // (setRecipeFeedback이 upsert라서 이전 값을 덮어쓴다).
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

  // 코멘트는 별도 저장 버튼 없이, 입력칸에서 포커스를 벗어날 때(다른 곳을 클릭하거나
  // 화면을 벗어날 때) 자동 저장된다.
  function handleCommentBlur() {
    if (!reaction) return;
    setCommentSaved(true);
    startTransition(async () => {
      await setRecipeComment(recipe.id, comment);
    });
  }

  return (
    <article className="recipe-card">
      <div className="recipe-card-head">
        <span className="recipe-card-title">{recipe.title}</span>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span className="recipe-card-meta">{recipe.est_time_minutes}분</span>
          <button
            type="button"
            onClick={toggleSave}
            aria-label={saved ? "저장 취소" : "레시피 저장"}
            aria-pressed={saved}
            title={saved ? "저장 취소" : "이 레시피를 '저장한 레시피'에 보관"}
            className={`save-btn ${saved ? "saved" : ""}`}
          >
            <BookmarkIcon filled={saved} />
          </button>
        </div>
      </div>
      <p className="recipe-card-ingredients">{recipe.ingredients_json.join(", ")}</p>
      <ol style={{ fontSize: 13, color: "var(--app-text)", paddingLeft: 18, marginBottom: 12 }}>
        {recipe.steps_json.map((step, i) => (
          <li key={i}>{step}</li>
        ))}
      </ol>
      <div className="recipe-card-actions">
        <div style={{ display: "flex", gap: 6 }}>
          <button
            type="button"
            className={`reaction-btn ${reaction === "like" ? "active" : ""}`}
            onClick={() => react("like")}
            aria-pressed={reaction === "like"}
          >
            <ThumbIcon direction="up" /> 좋아요
          </button>
          <button
            type="button"
            className={`reaction-btn ${reaction === "dislike" ? "active" : ""}`}
            onClick={() => react("dislike")}
            aria-pressed={reaction === "dislike"}
          >
            <ThumbIcon direction="down" /> 싫어요
          </button>
        </div>
      </div>

      <div style={{ marginTop: 10 }}>
        <textarea
          value={comment}
          onChange={(e) => {
            setComment(e.target.value);
            setCommentSaved(false);
          }}
          onBlur={handleCommentBlur}
          placeholder={reaction ? "이 레시피에 대한 평가를 남겨주세요 (자동 저장돼요)" : "먼저 좋아요/싫어요를 선택해주세요"}
          disabled={!reaction}
          rows={2}
          style={{
            width: "100%",
            fontSize: 13,
            background: reaction ? "var(--app-surface)" : "var(--app-bg)",
            resize: "vertical",
          }}
        />
        {commentSaved && (
          <p style={{ fontSize: 11, color: "var(--app-muted)", marginTop: 4 }}>저장됐어요.</p>
        )}
      </div>
    </article>
  );
}
