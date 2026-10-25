/** Display names for VoiceDesk's agents; unknown ids fall back to the id itself. */
export const AGENT_LABEL: Record<string, string> = {
  dental: 'Dental front desk',
  receptionist: 'Storage receptionist',
  recovery: 'Revenue recovery',
};

export const agentLabel = (id: string): string => AGENT_LABEL[id] ?? id;
