package com.vebops.exception;
import java.math.BigDecimal;
public class InsufficientStockException extends RuntimeException {
    public InsufficientStockException(String itemCode, BigDecimal required, BigDecimal onHand) {
        super("Insufficient stock for item " + itemCode + ": required=" + required + ", onHand=" + onHand);
    }
}
