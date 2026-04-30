import type { CSSProperties } from "react";
import type { ToolChoiceDefinition } from "@watcher/shared";
import { getToolChoiceIconAsset, getToolChoiceIconToken } from "../content/toolChoiceIcons";

export interface SceneChoiceModalState {
  accent: string;
  confirmDisabled: boolean;
  description: string;
  emptyMessage: string | null;
  options: readonly ToolChoiceDefinition[];
  selectedChoiceId: string | null;
  title: string;
  onCancel: () => void;
  onConfirm: () => void;
  onSelectChoice: (choiceId: string) => void;
}

export function SceneChoiceModal({ modal }: { modal: SceneChoiceModalState | null }) {
  if (!modal) {
    return null;
  }

  return (
    <div className="scene-choice-modal-overlay">
      <div className="scene-choice-modal" style={{ "--choice-accent": modal.accent } as CSSProperties}>
        <div className="scene-choice-modal__header">
          <div>
            <p className="scene-choice-modal__eyebrow">选择工具选项</p>
            <h3>{modal.title}</h3>
          </div>
          <button
            type="button"
            className="scene-choice-modal__close"
            onClick={modal.onCancel}
          >
            取消
          </button>
        </div>
        <p className="scene-choice-modal__description">{modal.description}</p>
        {modal.options.length ? (
          <div className="scene-choice-modal__grid">
            {modal.options.map((option) => {
              const iconAsset = getToolChoiceIconAsset(option.iconId);
              const isSelected = modal.selectedChoiceId === option.id;

              return (
                <button
                  key={option.id}
                  type="button"
                  className={["scene-choice-card", isSelected ? "selected" : ""].filter(Boolean).join(" ")}
                  data-testid={`scene-choice-option-${option.id}`}
                  onClick={() => modal.onSelectChoice(option.id)}
                >
                  <span className="scene-choice-card__icon">
                    {iconAsset ? (
                      <img src={iconAsset.src} alt="" />
                    ) : (
                      <span className="scene-choice-card__token">
                        {getToolChoiceIconToken(option.iconId, option.label)}
                      </span>
                    )}
                  </span>
                  <span className="scene-choice-card__copy">
                    <strong>{option.label}</strong>
                    <span>{option.description}</span>
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="scene-choice-modal__empty">{modal.emptyMessage ?? "当前没有可用选项。"}</div>
        )}
        <div className="scene-choice-modal__actions">
          <button
            type="button"
            className="scene-choice-modal__ghost-action"
            onClick={modal.onCancel}
          >
            取消
          </button>
          <button
            type="button"
            className="scene-choice-modal__confirm-action"
            data-testid="scene-choice-confirm"
            disabled={modal.confirmDisabled}
            onClick={modal.onConfirm}
          >
            确认
          </button>
        </div>
      </div>
    </div>
  );
}
