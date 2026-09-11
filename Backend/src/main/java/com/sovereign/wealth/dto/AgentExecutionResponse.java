package com.sovereign.wealth.dto;

import java.util.List;

public record AgentExecutionResponse(
        String structuredRecommendation,
        List<String> agentTraceLogs,
        String mode
) {
    public AgentExecutionResponse(String structuredRecommendation, List<String> agentTraceLogs) {
        this(structuredRecommendation, agentTraceLogs, "gemini-agent");
    }
}
