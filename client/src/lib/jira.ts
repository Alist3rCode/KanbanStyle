import { api } from "@/lib/api";

export type JiraAuthType = "cloud" | "server";

export interface JiraConfig {
  domain: string | null;
  email: string | null;
  authType: JiraAuthType;
  configured: boolean;
}

export interface JiraIssue {
  key: string;
  summary: string;
  status: string | null;
  issueType: string | null;
  url: string;
}

export interface JiraTestResult {
  displayName: string;
  emailAddress: string | null;
}

export const jiraApi = {
  getConfig: () => api.get<JiraConfig>("/integrations/jira"),
  setConfig: (domain: string, authType: JiraAuthType, email: string, token: string) =>
    api.put<void>("/integrations/jira", { domain, authType, email, token }),
  clearConfig: () => api.delete<void>("/integrations/jira"),
  testConnection: () => api.get<JiraTestResult>("/integrations/jira/test"),
  getIssue: (issueKey: string) =>
    api.get<JiraIssue>(`/jira/issues/${encodeURIComponent(issueKey)}`),
};
