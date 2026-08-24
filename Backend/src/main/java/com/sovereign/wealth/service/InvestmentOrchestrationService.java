package com.sovereign.wealth.service;

import com.sovereign.wealth.dto.AgentExecutionResponse;
import com.sovereign.wealth.dto.UserPortfolioRequest;
import dev.langchain4j.model.chat.ChatLanguageModel;
import dev.langchain4j.service.AiServices;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class InvestmentOrchestrationService {

    private final ChatLanguageModel chatLanguageModel;
    private final PortfolioOrchestratorTools portfolioOrchestratorTools;
    private final AgentTraceSink traces;

    public AgentExecutionResponse optimize(UserPortfolioRequest request) {
        traces.step("ROUTER", "POST /api/wealth/optimize accepted");
        traces.step("CONTEXT", "clientProfileContext length=" + request.clientProfileContext().length());
        traces.step("ALLOC", "crypto=%.6f equity=%.6f cash=%.6f".formatted(
                request.currentCryptoAllocation(),
                request.currentEquityAllocation(),
                request.currentCashAllocation()
        ));
        traces.step("MODEL", "ChatLanguageModel bound to gemini-1.5-flash via GoogleAiGeminiChatModel builder");
        traces.step("TOOLS", "Injecting native financial tools: calculateSystemicVolatilityIndex, executeAssetRebalanceMatrix");

        WealthOptimizationAgent agent = AiServices.builder(WealthOptimizationAgent.class)
                .chatLanguageModel(chatLanguageModel)
                .tools(portfolioOrchestratorTools)
                .build();

        String userMandate = """
                Client profile:
                %s

                Current allocations (notional):
                - Crypto: %s
                - Equity: %s
                - Cash: %s

                Corporate target mix is 10%% crypto / 60%% equity / 30%% cash.
                Invoke the registered tools, then issue the structured recommendation.
                """.formatted(
                request.clientProfileContext(),
                request.currentCryptoAllocation(),
                request.currentEquityAllocation(),
                request.currentCashAllocation()
        );

        traces.step("PROMPT", "System and User contexts assembled; invoking agent loop");
        String recommendation = agent.optimize(userMandate);
        traces.step("COMPLETE", "Agent loop finished; packaging AgentExecutionResponse");

        return new AgentExecutionResponse(recommendation, traces.snapshot());
    }
}
