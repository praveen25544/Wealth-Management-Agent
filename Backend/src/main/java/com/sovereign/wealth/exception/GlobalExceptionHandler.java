package com.sovereign.wealth.exception;

import com.sovereign.wealth.dto.AgentExecutionResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.List;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<AgentExecutionResponse> validation(MethodArgumentNotValidException ex) {
        String message = ex.getBindingResult().getFieldErrors().stream()
                .map(err -> err.getField() + ": " + err.getDefaultMessage())
                .reduce((a, b) -> a + "; " + b)
                .orElse("Invalid request");
        return ResponseEntity.badRequest().body(
                new AgentExecutionResponse(message, List.of("[VALIDATION] " + message))
        );
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<AgentExecutionResponse> illegal(IllegalArgumentException ex) {
        return ResponseEntity.badRequest().body(
                new AgentExecutionResponse(ex.getMessage(), List.of("[DOMAIN] " + ex.getMessage()))
        );
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<AgentExecutionResponse> fallback(Exception ex) {
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(
                new AgentExecutionResponse(
                        "Orchestration failed: " + ex.getMessage(),
                        List.of("[FATAL] " + ex.getClass().getSimpleName() + ": " + ex.getMessage())
                )
        );
    }
}
