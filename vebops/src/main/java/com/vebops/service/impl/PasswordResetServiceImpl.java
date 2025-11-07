package com.vebops.service.impl;

import java.time.Instant;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.vebops.domain.PasswordResetToken;
import com.vebops.domain.User;
import com.vebops.exception.BusinessException;
import com.vebops.repository.PasswordResetTokenRepository;
import com.vebops.repository.UserRepository;
import com.vebops.service.PasswordResetService;

/**
 * Implementation of {@link PasswordResetService}. Generates one-time tokens
 * for password resets, sends reset emails via {@link JavaMailSender} and
 * validates and consumes tokens during reset.
 */
@Service
@Transactional(noRollbackFor = Exception.class)
public class PasswordResetServiceImpl implements PasswordResetService {

    private static final Logger log = LoggerFactory.getLogger(PasswordResetServiceImpl.class);

    private final UserRepository userRepo;
    private final PasswordResetTokenRepository tokenRepo;
    private final PasswordEncoder encoder;
    private final JavaMailSender mailSender;

    // token validity period: 1 hour (in seconds)
    private static final long EXPIRY_SECONDS = 60 * 60;

    public PasswordResetServiceImpl(UserRepository userRepo, PasswordResetTokenRepository tokenRepo,
                                    PasswordEncoder encoder, JavaMailSender mailSender) {
        this.userRepo = userRepo;
        this.tokenRepo = tokenRepo;
        this.encoder = encoder;
        this.mailSender = mailSender;
    }

    @Override
    public void requestPasswordReset(String email) {
        User user = userRepo.findByEmail(email).orElse(null);
        if (user == null) {
            // Always return successfully to avoid revealing which emails are registered
            log.info("Password reset requested for non-existent email: {}", email);
            return;
        }
        // Remove any existing reset tokens for this user
        tokenRepo.deleteByUser_Id(user.getId());
        // Generate a new token
        String token = UUID.randomUUID().toString().replaceAll("-", "");
        PasswordResetToken prt = new PasswordResetToken();
        prt.setUser(user);
        prt.setToken(token);
        prt.setExpiry(Instant.now().plusSeconds(EXPIRY_SECONDS));
        prt.setUsed(false);
        tokenRepo.save(prt);
        // Compose and send email
        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(user.getEmail());
        message.setSubject("Password Reset Request");
        String resetUrl = "https://example.com/reset-password?token=" + token;
        message.setText("Dear " + user.getDisplayName() + ",\n\n" +
                        "We received a request to reset your password. " +
                        "Please use the following token to reset your password: " + token + "\n\n" +
                        "Alternatively, click the link below:\n" + resetUrl + "\n\n" +
                        "If you did not request a password reset, please ignore this email.\n\n" +
                        "-- Vebops Support");
        try {
            mailSender.send(message);
            log.info("Sent password reset email to {}", user.getEmail());
        } catch (Exception ex) {
            log.warn("Failed to send password reset email to {}: {}", user.getEmail(), ex.getMessage());
        }
    }

    @Override
    public void resetPassword(String token, String newPassword) {
        PasswordResetToken prt = tokenRepo.findByToken(token).orElseThrow(() ->
            new BusinessException("Invalid or expired password reset token"));
        if (prt.isUsed()) {
            throw new BusinessException("This reset token has already been used");
        }
        if (prt.getExpiry().isBefore(Instant.now())) {
            throw new BusinessException( "This reset token has expired");
        }
        User user = prt.getUser();
        // Set new password
        user.setPasswordHash(encoder.encode(newPassword));
        userRepo.save(user);
        // Mark token as used
        prt.setUsed(true);
        tokenRepo.save(prt);
    }
}