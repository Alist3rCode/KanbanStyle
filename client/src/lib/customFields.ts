import { api } from "@/lib/api";

export type FieldType = "text" | "date" | "link" | "checklist" | "attachment" | "jira_link";

export type ShowOnCard = "always" | "if_not_empty" | "never";

export const SHOW_ON_CARD_LABELS: Record<ShowOnCard, string> = {
  always: "Toujours",
  if_not_empty: "Si rempli",
  never: "Jamais",
};

const SHOW_ON_CARD_CYCLE: ShowOnCard[] = ["never", "if_not_empty", "always"];

export function nextShowOnCard(current: ShowOnCard): ShowOnCard {
  const index = SHOW_ON_CARD_CYCLE.indexOf(current);
  return SHOW_ON_CARD_CYCLE[(index + 1) % SHOW_ON_CARD_CYCLE.length];
}

export interface CustomField {
  id: number;
  board_id: number;
  name: string;
  field_type: FieldType;
  position: number;
  link_prefix: string | null;
  default_value: string;
  show_on_card: ShowOnCard;
}

export const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  text: "Texte",
  date: "Date",
  link: "Lien",
  checklist: "Checklist",
  attachment: "Pièce jointe",
  jira_link: "Lien Jira",
};

export interface CardFieldValue {
  custom_field_id: number;
  name: string;
  field_type: FieldType;
  link_prefix: string | null;
  show_on_card: ShowOnCard;
  value: string;
}

export interface BoardFieldValue {
  card_id: number;
  name: string;
  field_type: FieldType;
  show_on_card: ShowOnCard;
  value: string;
}

export const customFieldsApi = {
  list: (boardId: number) => api.get<CustomField[]>(`/boards/${boardId}/custom-fields`),
  create: (
    boardId: number,
    name: string,
    field_type: FieldType,
    link_prefix?: string,
    default_value?: string,
    show_on_card?: ShowOnCard,
  ) =>
    api.post<CustomField>(`/boards/${boardId}/custom-fields`, {
      name,
      field_type,
      link_prefix,
      default_value,
      show_on_card,
    }),
  reorder: (id: number, position: number) =>
    api.patch<void>(`/custom-fields/${id}`, { position }),
  rename: (id: number, name: string) => api.patch<void>(`/custom-fields/${id}`, { name }),
  setLinkPrefix: (id: number, link_prefix: string) =>
    api.patch<void>(`/custom-fields/${id}`, { link_prefix }),
  setDefaultValue: (id: number, default_value: string) =>
    api.patch<void>(`/custom-fields/${id}`, { default_value }),
  setShowOnCard: (id: number, show_on_card: ShowOnCard) =>
    api.patch<void>(`/custom-fields/${id}`, { show_on_card }),
  remove: (id: number) => api.delete<void>(`/custom-fields/${id}`),
  fieldValuesForBoard: (boardId: number) =>
    api.get<BoardFieldValue[]>(`/boards/${boardId}/field-values`),
  valuesForCard: (cardId: number) => api.get<CardFieldValue[]>(`/cards/${cardId}/field-values`),
  setValueForCard: (cardId: number, customFieldId: number, value: string) =>
    api.put<void>(`/cards/${cardId}/field-values/${customFieldId}`, { value }),
  /** Creates a field scoped to this card only — never appears on other cards. */
  createForCard: (
    cardId: number,
    name: string,
    field_type: FieldType,
    link_prefix?: string,
    value?: string,
  ) =>
    api.post<CardFieldValue>(`/cards/${cardId}/custom-fields`, {
      name,
      field_type,
      link_prefix,
      value,
    }),
};
