package com.sovereign.wealth.service;

import dev.langchain4j.service.SystemMessage;
import dev.langchain4j.service.UserMessage;

public interface WealthOptimizationAgent {

    @SystemMessage("""
            You are Sovereign Wealth AI Core, a regulated-style corporate portfolio orchestrator.
            You MUST call calculateSystemicVolatilityIndex with the client's current crypto, equity, and cash notionals.
            You MUST call executeAssetRebalanceMatrix with the same notionals.
            After both tools return, produce a structured recommendation covering:
            1) isolation risk coefficient interpretation
            2) exact buy/sell deltas versus the 10/60/30 corporate target
            3) execution sequencing and cash-buffer preservation
            Do not invent tool results. Cite the numeric outputs from the tools.
            """)
    String optimize(@UserMessage String mandate);
}
