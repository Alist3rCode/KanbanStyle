import { api } from "@/lib/api";

export type LabelColor =
  | "green"
  | "yellow"
  | "orange"
  | "red"
  | "purple"
  | "blue"
  | "sky"
  | "lime"
  | "pink"
  | "gray";

export const LABEL_COLORS: LabelColor[] = [
  "green",
  "yellow",
  "orange",
  "red",
  "purple",
  "blue",
  "sky",
  "lime",
  "pink",
  "gray",
];

export const LABEL_COLOR_CLASSES: Record<LabelColor, string> = {
  green: "bg-emerald-500",
  yellow: "bg-yellow-400",
  orange: "bg-orange-500",
  red: "bg-red-500",
  purple: "bg-purple-500",
  blue: "bg-blue-500",
  sky: "bg-sky-400",
  lime: "bg-lime-500",
  pink: "bg-pink-500",
  gray: "bg-gray-500",
};

/**
 * Text color that keeps good contrast against each LABEL_COLOR_CLASSES background
 * (WCAG-ish YIQ brightness split — yellow/sky/lime are light enough to need dark
 * text, the rest read fine in white). Used wherever a color tints a whole surface
 * (column headers, the card status badge), not just small label pills.
 */
export const LABEL_TEXT_CLASSES: Record<LabelColor, string> = {
  green: "text-white",
  yellow: "text-slate-900",
  orange: "text-white",
  red: "text-white",
  purple: "text-white",
  blue: "text-white",
  sky: "text-slate-900",
  lime: "text-slate-900",
  pink: "text-white",
  gray: "text-white",
};

export interface Label {
  id: number;
  board_id: number;
  name: string;
  color: LabelColor;
  position: number;
}

export interface CardLabel {
  id: number;
  name: string;
  color: LabelColor;
}

export interface BoardCardLabel {
  card_id: number;
  label_id: number;
  name: string;
  color: LabelColor;
}

export interface CardLabelOption {
  id: number;
  name: string;
  color: LabelColor;
  attached: boolean;
}

export const labelsApi = {
  list: (boardId: number) => api.get<Label[]>(`/boards/${boardId}/labels`),
  create: (boardId: number, name: string, color: LabelColor) =>
    api.post<Label>(`/boards/${boardId}/labels`, { name, color }),
  rename: (id: number, name: string) => api.patch<void>(`/labels/${id}`, { name }),
  setColor: (id: number, color: LabelColor) => api.patch<void>(`/labels/${id}`, { color }),
  remove: (id: number) => api.delete<void>(`/labels/${id}`),
  forCard: (cardId: number) => api.get<CardLabel[]>(`/cards/${cardId}/labels`),
  optionsForCard: (cardId: number) =>
    api.get<CardLabelOption[]>(`/cards/${cardId}/board-labels`),
  attach: (cardId: number, labelId: number) =>
    api.post<void>(`/cards/${cardId}/labels/${labelId}`),
  detach: (cardId: number, labelId: number) =>
    api.delete<void>(`/cards/${cardId}/labels/${labelId}`),
  forBoard: (boardId: number) => api.get<BoardCardLabel[]>(`/boards/${boardId}/card-labels`),
};
