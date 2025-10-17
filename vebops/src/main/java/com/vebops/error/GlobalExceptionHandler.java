package com.vebops.error;

import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import org.springframework.validation.FieldError;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.bind.MethodArgumentNotValidException;

import jakarta.validation.ConstraintViolationException;

import java.util.*;

import com.vebops.exception.*;
import org.springframework.transaction.UnexpectedRollbackException;

@RestControllerAdvice
public class GlobalExceptionHandler {

    record Err(String error, String message, Map<String,String> fields) {}

    private static Map<String,String> fields(MethodArgumentNotValidException ex){
        Map<String,String> map=new LinkedHashMap<>();
        for(FieldError fe: ex.getBindingResult().getFieldErrors()){
            map.put(fe.getField(), fe.getDefaultMessage());
        }
        return map;
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Err> invalid(MethodArgumentNotValidException ex){
        return ResponseEntity.badRequest().body(new Err("VALIDATION_ERROR","Invalid request", fields(ex)));
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<Err> constraint(ConstraintViolationException ex){
        Map<String,String> m=new LinkedHashMap<>();
        ex.getConstraintViolations().forEach(v-> m.put(v.getPropertyPath().toString(), v.getMessage()));
        return ResponseEntity.badRequest().body(new Err("CONSTRAINT_VIOLATION","Invalid parameter", m));
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<Err> mismatch(MethodArgumentTypeMismatchException ex){
        return ResponseEntity.badRequest().body(new Err("TYPE_MISMATCH", ex.getName()+" has invalid value", null));
    }

    @ExceptionHandler(NotFoundException.class)
    public ResponseEntity<Err> notFound(NotFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(new Err("NOT_FOUND", ex.getMessage(), null));
    }

    @ExceptionHandler(InsufficientStockException.class)
    public ResponseEntity<Err> stock(InsufficientStockException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(new Err("INSUFFICIENT_STOCK", ex.getMessage(), null));
    }

    @ExceptionHandler(SubscriptionLockedException.class)
    public ResponseEntity<Err> subscription(SubscriptionLockedException ex) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(new Err("SUBSCRIPTION_LOCKED", ex.getMessage(), null));
    }

    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<Err> business(BusinessException ex) {
        return ResponseEntity.badRequest().body(new Err("BUSINESS_RULE", ex.getMessage(), null));
    }

    /**
     * Handle cases where a transaction has been marked rollback-only but no
     * exception was propagated to the caller.  This typically surfaces as
     * an {@link UnexpectedRollbackException} and indicates that an inner
     * operation triggered a rollback but the outer code continued as if
     * everything succeeded.  Returning a 409 Conflict informs the client
     * that the requested operation could not complete due to an underlying
     * consistency problem.
     */
    @ExceptionHandler(UnexpectedRollbackException.class)
    public ResponseEntity<Err> rollback(UnexpectedRollbackException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
            .body(new Err("UNEXPECTED_ROLLBACK", ex.getMessage(), null));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Err> generic(Exception ex) {
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(new Err("INTERNAL_ERROR", ex.getMessage(), null));
    }
}
