package com.vebops.web;

import com.vebops.dto.LoginRequest;
import com.vebops.dto.LoginResponse;
import com.vebops.dto.ForgotPasswordRequest;
import com.vebops.dto.ResetPasswordRequest;
import com.vebops.service.PasswordResetService;
import com.vebops.security.JwtUtil;
import com.vebops.service.AuthService;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/auth")
public class AuthController {

    private final AuthService auth;
    private final JwtUtil jwt;
    private final PasswordResetService passwordReset;

    public AuthController(AuthService auth, JwtUtil jwt, PasswordResetService passwordReset) {
        this.auth = auth;
        this.jwt = jwt;
        this.passwordReset = passwordReset;
    }

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@Validated @RequestBody LoginRequest req) {
        // delegate auth, then mint the token (your original logic)
        LoginResponse res = auth.login(req);
        String token = jwt.generate(Map.of(
                "uid", res.userId,
                "tid", res.tenantId,
                "role", res.role
        ));
        res.jwt = token;
        return ResponseEntity.ok(res);
    }

    /**
     * Initiates a password reset by generating a one-time token and emailing it to
     * the user. Always returns 200 even if the email does not correspond to
     * any account, to avoid leaking user existence information.
     */
    @PostMapping("/forgot-password")
    public ResponseEntity<Void> forgotPassword(@Validated @RequestBody ForgotPasswordRequest req) {
        passwordReset.requestPasswordReset(req.email);
        return ResponseEntity.ok().build();
    }

    /**
     * Resets a user's password using a token previously sent via email. Throws
     * an error if the token is invalid, expired or already used. On success
     * returns HTTP 204 (No Content).
     */
    @PostMapping("/reset-password")
    public ResponseEntity<Void> resetPassword(@Validated @RequestBody ResetPasswordRequest req) {
        passwordReset.resetPassword(req.token, req.newPassword);
        return ResponseEntity.noContent().build();
    }
}
