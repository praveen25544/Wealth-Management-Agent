package com.sovereign.wealth.service;

import com.sovereign.wealth.dto.AgentExecutionResponse;
import com.sovereign.wealth.dto.AgentHealthResponse;
import com.sovereign.wealth.dto.UserPortfolioRequest;
import dev.langchain4j.model.chat.ChatLanguageModel;
import dev.langchain4j.service.AiServices;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Locale;
import java.util.concurrent.atomic.AtomicReference;

@Service
@RequiredArgsConstructor
public class InvestmentOrchestrationService {

    private final ObjectProvider<ChatLanguageModel> chatLanguageModelProvider;
    private final PortfolioOrchestratorTools portfolioOrchestratorTools;
    private final AgentTraceSink traces;
    private final AtomicReference<WealthOptimizationAgent> cachedAgent = new AtomicReference<>();

    @Value("${gemini.model}")
    private String modelName;

    public AgentHealthResponse health() {
        ChatLanguageModel chatLanguageModel = chatLanguageModelProvider.getIfAvailable();
        String mode = chatLanguageModel == null ? "local-quant" : "gemini-agent";
        String model = chatLanguageModel == null ? "deterministic-local-analyst" : modelName;
        return new AgentHealthResponse("ready", mode, model, Instant.now());
    }

    public AgentExecutionResponse optimize(UserPortfolioRequest request) {
        assertPositiveNav(request);

        traces.step("ROUTER", "POST /api/wealth/optimize accepted");
        traces.step("CONTEXT", "clientProfileContext length=" + request.clientProfileContext().length());
        traces.step("ALLOC", "crypto=%.6f equity=%.6f cash=%.6f".formatted(
                request.currentCryptoAllocation(),
                request.currentEquityAllocation(),
                request.currentCashAllocation()
        ));

        ChatLanguageModel chatLanguageModel = chatLanguageModelProvider.getIfAvailable();
        if (chatLanguageModel == null) {
            String recommendation = deterministicRecommendation(request, "GEMINI_API_KEY is not configured");
            traces.step("COMPLETE", "Local analyst path finished; packaging AgentExecutionResponse");
            return new AgentExecutionResponse(recommendation, traces.snapshot(), "local-quant");
        }

        traces.step("MODEL", "ChatLanguageModel bound to %s via GoogleAiGeminiChatModel builder".formatted(modelName));
        traces.step("TOOLS", "Injecting native financial tools: calculateSystemicVolatilityIndex, executeAssetRebalanceMatrix");

        WealthOptimizationAgent agent = agentFor(chatLanguageModel);

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
        String recommendation;
        try {
            recommendation = agent.optimize(userMandate);
            traces.step("COMPLETE", "Agent loop finished; packaging AgentExecutionResponse");
        } catch (RuntimeException ex) {
            recommendation = deterministicRecommendation(request,
                    "Gemini agent call failed: " + ex.getClass().getSimpleName());
            traces.step("COMPLETE", "Fallback analyst path finished after model failure");
            return new AgentExecutionResponse(recommendation, traces.snapshot(), "local-quant");
        }

        return new AgentExecutionResponse(recommendation, traces.snapshot());
    }

    private WealthOptimizationAgent agentFor(ChatLanguageModel chatLanguageModel) {
        WealthOptimizationAgent existing = cachedAgent.get();
        if (existing != null) {
            traces.step("CACHE", "Reusing warm WealthOptimizationAgent service proxy");
            return existing;
        }

        WealthOptimizationAgent created = AiServices.builder(WealthOptimizationAgent.class)
                .chatLanguageModel(chatLanguageModel)
                .tools(portfolioOrchestratorTools)
                .build();

        if (cachedAgent.compareAndSet(null, created)) {
            traces.step("CACHE", "Initialized WealthOptimizationAgent service proxy");
            return created;
        }

        traces.step("CACHE", "Reusing concurrently initialized WealthOptimizationAgent service proxy");
        return cachedAgent.get();
    }

    private String deterministicRecommendation(UserPortfolioRequest request, String reason) {
        traces.step("MODEL_FALLBACK", reason + "; executing deterministic local analyst");

        double crypto = request.currentCryptoAllocation();
        double equity = request.currentEquityAllocation();
        double cash = request.currentCashAllocation();
        double nav = crypto + equity + cash;

        double isolationRisk = portfolioOrchestratorTools.calculateSystemicVolatilityIndex(crypto, equity, cash);
        String rebalanceMatrix = portfolioOrchestratorTools.executeAssetRebalanceMatrix(crypto, equity, cash);

        double targetCrypto = PortfolioOrchestratorTools.TARGET_CRYPTO * nav;
        double targetEquity = PortfolioOrchestratorTools.TARGET_EQUITY * nav;
        double targetCash = PortfolioOrchestratorTools.TARGET_CASH * nav;

        double cryptoDelta = targetCrypto - crypto;
        double equityDelta = targetEquity - equity;
        double cashDelta = targetCash - cash;
        double drift = (Math.abs((crypto / nav) - PortfolioOrchestratorTools.TARGET_CRYPTO)
                + Math.abs((equity / nav) - PortfolioOrchestratorTools.TARGET_EQUITY)
                + Math.abs((cash / nav) - PortfolioOrchestratorTools.TARGET_CASH)) / 2.0;

        return """
                Sovereign allocation brief

                Operating mode: deterministic local analyst
                Fallback reason: %s
                Client profile: %s

                Portfolio snapshot
                - NAV: %s
                - Current mix: crypto %.1f%%, equity %.1f%%, cash %.1f%%
                - Target mix: crypto 10.0%%, equity 60.0%%, cash 30.0%%
                - Allocation drift: %.1f%%
                - Isolation risk coefficient: %.6f (%s)

                Rebalance orders
                - Crypto: %s
                - Equity: %s
                - Cash: %s

                Execution sequence
                1. Stage sells first where target deltas are negative, then release buys against confirmed liquidity.
                2. Preserve the 30%% cash sleeve before adding risk assets.
                3. Re-check covenant language and concentration caps before execution.

                Tool outputs
                - %s
                """.formatted(
                reason,
                request.clientProfileContext(),
                money(nav),
                (crypto / nav) * 100.0,
                (equity / nav) * 100.0,
                (cash / nav) * 100.0,
                drift * 100.0,
                isolationRisk,
                riskBand(isolationRisk),
                orderLine(cryptoDelta),
                orderLine(equityDelta),
                orderLine(cashDelta),
                rebalanceMatrix
        );
    }

    private static void assertPositiveNav(UserPortfolioRequest request) {
        assertFinite("currentCryptoAllocation", request.currentCryptoAllocation());
        assertFinite("currentEquityAllocation", request.currentEquityAllocation());
        assertFinite("currentCashAllocation", request.currentCashAllocation());

        double nav = request.currentCryptoAllocation()
                + request.currentEquityAllocation()
                + request.currentCashAllocation();
        if (nav <= 0.0) {
            throw new IllegalArgumentException("Portfolio notional must be strictly positive.");
        }
    }

    private static void assertFinite(String field, Double value) {
        if (value == null || !Double.isFinite(value)) {
            throw new IllegalArgumentException(field + " must be a finite number.");
        }
    }

    private static String orderLine(double delta) {
        if (Math.abs(delta) < 1e-9) {
            return "hold";
        }
        return "%s %s".formatted(delta > 0.0 ? "buy" : "sell", money(Math.abs(delta)));
    }

    private static String riskBand(double risk) {
        if (risk < 0.035) {
            return "low";
        }
        if (risk < 0.075) {
            return "moderate";
        }
        if (risk < 0.14) {
            return "elevated";
        }
        return "critical";
    }

    private static String money(double value) {
        return "$" + String.format(Locale.US, "%,.2f", value);
    }
}
