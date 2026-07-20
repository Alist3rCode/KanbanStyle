import { api } from "@/lib/api";

export interface JiraConfig {
  domain: string | null;
  configured: boolean;
}

export interface JiraIssue {
  key: string;
  summary: string;
  status: string | null;
  issueType: string | null;
  url: string;
}

export const jiraApi = {
  getConfig: () => api.get<JiraConfig>("/integrations/jira"),
  setConfig: (domain: string, token: string) =>
    api.put<void>("/integrations/jira", { domain, token }),
  clearConfig: () => api.delete<void>("/integrations/jira"),
  getIssue: (issueKey: string) =>
    api.get<JiraIssue>(`/jira/issues/${encodeURIComponent(issueKey)}`),
};
