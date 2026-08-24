package com.sovereign.wealth.service;

import com.sovereign.wealth.dto.RebalanceDelta;
import dev.langchain4j.agent.tool.Tool;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.Locale;

@Component
@RequiredArgsConstructor
public class PortfolioOrchestratorTools {

    public static final double TARGET_CRYPTO = 0.10;
    public static final double TARGET_EQUITY = 0.60;
    public static final double TARGET_CASH = 0.30;

    private static final double SIGMA_CRYPTO = 0.85;
    private static final double SIGMA_EQUITY = 0.22;
    private static final double SIGMA_CASH = 0.015;

    private final AgentTraceSink traces;

    @Tool("Calculates the isolation risk coefficient from current crypto, equity, and cash notional allocations. Returns a decimal risk index.")
    public double calculateSystemicVolatilityIndex(double crypto, double equity, double cash) {
        traces.step("TOOL", "calculateSystemicVolatilityIndex invoked crypto=%.6f equity=%.6f cash=%.6f"
                .formatted(crypto, equity, cash));

        double[] weights = normalize(crypto, equity, cash);
        double wc = weights[0];
        double we = weights[1];
        double wk = weights[2];

        double herfindahl = (wc * wc) + (we * we) + (wk * wk);
        double varianceProxy =
                (wc * wc * SIGMA_CRYPTO * SIGMA_CRYPTO)
                        + (we * we * SIGMA_EQUITY * SIGMA_EQUITY)
                        + (wk * wk * SIGMA_CASH * SIGMA_CASH);
        double systemicVol = Math.sqrt(varianceProxy);

        double cashDeficit = Math.max(0.0, TARGET_CASH - wk);
        double cryptoExcess = Math.max(0.0, wc - TARGET_CRYPTO);
        double isolationPenalty = 1.0 + (2.4 * cashDeficit) + (1.8 * cryptoExcess);

        double coefficient = herfindahl * systemicVol * isolationPenalty;
        traces.step("CALC", String.format(Locale.US,
                "HHI=%.6f vol=%.6f penalty=%.6f isolationRiskCoefficient=%.8f",
                herfindahl, systemicVol, isolationPenalty, coefficient));
        return coefficient;
    }

    @Tool("Calculates exact buy/sell notional deltas to reach the corporate target mix of 10% crypto, 60% equity, and 30% cash. Positive delta means buy; negative means sell.")
    public String executeAssetRebalanceMatrix(double crypto, double equity, double cash) {
        traces.step("TOOL", "executeAssetRebalanceMatrix invoked crypto=%.6f equity=%.6f cash=%.6f"
                .formatted(crypto, equity, cash));

        double nav = crypto + equity + cash;
        if (nav <= 0.0) {
            throw new IllegalArgumentException("Portfolio notional must be strictly positive.");
        }

        RebalanceDelta delta = new RebalanceDelta(
                (TARGET_CRYPTO * nav) - crypto,
                (TARGET_EQUITY * nav) - equity,
                (TARGET_CASH * nav) - cash,
                TARGET_CRYPTO,
                TARGET_EQUITY,
                TARGET_CASH
        );

        String matrix = String.format(Locale.US,
                "nav=%.6f | cryptoDelta=%+.6f (%s) | equityDelta=%+.6f (%s) | cashDelta=%+.6f (%s) | targets=crypto:10%% equity:60%% cash:30%%",
                nav,
                delta.cryptoBuySellDelta(), side(delta.cryptoBuySellDelta()),
                delta.equityBuySellDelta(), side(delta.equityBuySellDelta()),
                delta.cashBuySellDelta(), side(delta.cashBuySellDelta())
        );
        traces.step("MATRIX", matrix);
        return matrix;
    }

    private static String side(double delta) {
        if (delta > 1e-9) {
            return "BUY";
        }
        if (delta < -1e-9) {
            return "SELL";
        }
        return "HOLD";
    }

    private static double[] normalize(double crypto, double equity, double cash) {
        double nav = crypto + equity + cash;
        if (nav <= 0.0) {
            throw new IllegalArgumentException("Portfolio notional must be strictly positive.");
        }
        return new double[]{crypto / nav, equity / nav, cash / nav};
    }
}
